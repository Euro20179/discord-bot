const { Client, Intents, MessageActionRow, MessageEmbed, MessageButton, MessageSelectMenu } = require("discord.js")
const fs = require("fs")
const { performance } = require("perf_hooks")
const { exit } = require("process")
const { Command, Alias } = require("./src/command.js")
const https = require("https")
const {createButton} = require("./src/interactives.js")
const {expandContent, userMention, strftime, userFinder, formatp} = require("./src/util")
const client = new Client(
    {
        intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS, Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_MESSAGE_TYPING, Intents.FLAGS.GUILD_INTEGRATIONS],
        allowedMentions: {
            parse: ["users"]
        }
    }
)

const token = fs.readFileSync("token", "utf-8").trim()

const BOT_ADMINS = ["334538784043696130", "412365502112071681"]

const PREFIX = "]"

const VERSION = "1.0.3"

let LAST_DELETED_MESSAGE

let userVars = {global: {}}

let SPAM_STOP = false

Command.setPrefix(PREFIX)

const commands = {
echo: 
    new Command(function(msg, opts){
        if(!opts['D']) msg.delete().then().catch(reason => console.log("no delete perms"))
        if(opts["f"]){
            let ext = this.getAttr("ext") || 'txt'
            let fileName = this.getAttr("filename") || `${msg.author.id}-echo.${ext}`
            fs.writeFileSync(`./${msg.author.id}:echo.cmdresp`, this.content)
            return {
                files: [{
                    attachment: `./${msg.author.id}:echo.cmdresp`,
                    name: fileName
                }]
            }
        }
        return {
            content: expandContent(this.content, msg)
        }
    }, 
    'echo [-Df] [filename=\"name\"] [ext=\"ext\"] message\n-D: don\'t delete your message\n-f: write to file', 'Df').setCategory("fun").setMeta({version: "1.0.0"})
,

button: 
    new Command(function(msg, opts){
        if(!this.content) return {content: "no text given"}
        let style = this.getAttr('style') || "PRIMARY"
        let onclick = this.getAttr("onclick") || "Someone clicked the button :O"
        let timeAlive = Number(this.getAttr("timealive")) * 1000
        let initMsg = this.getAttr('initialmsg') || "here is your button :)))))"
        if(!timeAlive) timeAlive = 15000
        if(timeAlive > 300 * 1000){
            return {
                content: "don't you think that's a bit long?"
            }
        }
        const row = new MessageActionRow()
            .addComponents(createButton(`${msg.author.id}:button`, this.content, style.toUpperCase()))
        msg.channel.send({content: initMsg, components: [row]}).then(
            res => {
                msg.delete().then(
                    res2 => {
                        const collector = msg.channel.createMessageComponentCollector({time: timeAlive})
                        collector.on("collect", async i => {
                            if(i.customId === `${msg.author.id}:button`){
                                await i.update({
                                    content: expandContent(onclick, msg, {
                                        "clicker": i.user.username,
                                        "clickerm": userMention(i.user.id),
                                        "timeclicked": new Date().toString()
                                    }, false), 
                                    components: []
                                })
                            }
                        })
                    }
                )
            }
        ).catch(res => false)
        return false
    }, 
    "button [style=\"style\"] [onclick=\"reply\"] [timealive=\"seconds\"] message on button\nstyles:\n\tprimary\n\tsecondary\n\tsuccess\n\tdanger\n\tlink\nSpecial expansions: {clicker}, {clickerm} {timeclicked}", "D", true).setCategory("fun").setMeta({version: "1.0.0"})
,
help: 
    new Command(function(msg, opts){
        let embeds = {}
        for(let cmd in commands){
            let c = commands[cmd]
            if(c instanceof Alias) continue
            if(embeds[c.category]){
                embeds[c.category].addField(cmd, c.aliases.join(" ") || cmd, true)
            }
            else{
                embeds[c.category] = new MessageEmbed({title: c.category, description: "see [cmd -h for more info"})
            }
        }
        const row = new MessageActionRow()
        for(let c in embeds){
            row.addComponents(createButton(c, c, "PRIMARY"))
        }
        row.addComponents(createButton("help:button:quit", "stop", "DANGER"))
        let cat = "fun"
        if(this.content in embeds) cat = this.content
        msg.channel.send({embeds: [embeds[cat]], components: [row]}).then(
            res => {
                const collector = msg.channel.createMessageComponentCollector({filter: i => i.user.id == msg.author.id, time: 300 * 1000})
                collector.on("collect", async i => {
                    if(i.customId != "help:button:quit")
                        await i.update({embeds: [embeds[i.customId]], components: [row]})
                    else await i.update({embeds: [], components: [], content: "this *was* help"})
                })
            }
        ).catch(res => false)
        return false
    },
    "help [category]\ncategories:\n\tfun\n\tutil\n\tmeta", ""
    ).setCategory("meta").setMeta({version: "1.0.0"})
,
reactiontime: 
    new Command(function(msg, opts){
        if(opts["c"]){
            if(Math.random () > .5)
                return {content: "The button has been pressed automatically, have a nice day :)"}
            else{
                let start = Date.now()
                return {content: `JEEZ YOU HAVE A REACTION TIME OF ${Date.now() - start}.. UNBELIEVEABLE`}
            }
        }
        const row = new MessageActionRow()
            .addComponents(createButton(`${msg.author.id}:reactiontime`, "CLICK ME", "SUCCESS"))
        msg.reply({content: "click button", components: [row]}).then(
            res => {
                let filter
                if(opts["a"]) filter = (i) => true
                else filter = (i) => i.user.id == msg.author.id
                const collector = msg.channel.createMessageComponentCollector({filter: filter, time: 15000})
                let start = Date.now()
                collector.on("collect", async i => {
                    let final = Date.now() - start
                    if(i.customId === `${msg.author.id}:reactiontime`){
                        i.update({content: Math.random() > .99 ? 'https://tenor.com/view/dance-moves-dancing-singer-groovy-gif-17029825' : `${i.user.username}'s reaction time is: ${final / 1000}`, components: []}).then().catch(res => false)
                    }
                })
            }
        ).catch(res => false)
        return false
    }, "reactiontime [-ac]\n-a: anyone can press the button\n-c: the button is automatically pressed", "ac").setCategory("fun").setMeta({version: "1.0.0"})
,
timeguesser: 
    new Command(function(msg, opts){
        let secondsToGuess = this.getAttr("seconds") || 5
        secondsToGuess = Number(secondsToGuess)
        const row = new MessageActionRow().addComponents(createButton(`${msg.author.id}:timeguesser`, `click me after ${secondsToGuess} seconds`, "SUCCESS"))
        msg.reply({content: `click the button after ${secondsToGuess} seconds have passed`, components: [row]}).then(
            res => {
                const collector = msg.channel.createMessageComponentCollector({filter: i => i.user.id == msg.author.id, time: secondsToGuess * 1000})
                let start = Date.now() / 1000
                collector.on("collect", async i => {
                    let stop = Date.now() / 1000
                    i.update({content: `Real time: ${stop - start} seconds\nTime off: ${secondsToGuess - (stop - start)} seconds`}) 
                })
                collector.on("ended", i => {
                    i.update({content: `Your ${secondsToGuess} seconds is up`, components: []})
                })
            }
        )
        return false
    }).setCategory("fun").setMeta({version: "1.0.0"})
,
reverse:
    new Command(function(msg, opts){
        let newText = ""
        for(let i = this.content.length - 1; i > 0; i--){
            newText += this.content[i]
        }
        return {
            content: newText
        }
    }, "reverse text").setCategory('util').setMeta({version: "1.0.0"})
,
progressbar:
    new Command(function(msg, opts){
        let [min, pos, max] = this.content.split(" ")
        if(!min || !pos || !max) return {content: `Usage: [progressbar min at max`}
        min = Number(min)
        pos = Number(pos)
        max = Number(max)
        let divisor = max / 70
        min /= divisor
        pos /= divisor
        max /= divisor
        //escape to not trigger bot
        let bar = `\`\`\`\n${min}[`
        for(let i = min; i <= pos; i++){
            bar += "#"
        }
        for(let i = pos + 2; i <= max; i++){
            bar += " "
        }
        bar += `]${max}\n`
        return {content: bar + '```'}
    }, "progressbar min at max", "").setCategory("util").setMeta({version: "1.0.0"})
,
spam:
    new Command(async function(msg, opts){
        SPAM_STOP = false
        if(opts["d"]) await msg.delete()
        let _delay = this.getAttr('delay') || 1
        if(typeof _delay != "number" && _delay.indexOf(",") != -1){
            let [min, max] = _delay.split(",")
            max *= 1000
            min *= 1000
            delay = () => (Math.random() * (Number(max) - Number(min))) + Number(min)
        }
        else delay = () => Number(_delay) * 1000
        let count = Number(this.content.split(" ")[0])
        let message = this.content.split(" ").slice(1).join(" ")
        for(let i = 0; i < count; i++){
            if(SPAM_STOP) break
            await msg.channel.send({content: message})
            await new Promise(res => setTimeout(res, delay()))
        }
        return {content: Math.random() > .99 ? `${userMention(msg.author.id)}'s spam has completed, have a nice day :)` : "done"}
    }, "spam [-d] x message [delay=\"delay\" **OR** delay=\"min-delay,max-delay\"]", "d").setCategory("fun").setMeta({version: "1.0.0"})
,
stop: 
    new Command(function(msg, opts){
        SPAM_STOP = true;
        return {content: 'stopped'};
    }, "stops spam").setCategory("util").setMeta({version: "1.0.0"})
,
ping: 
    new Command(function(msg, opts){
        return {content: `🏓 ${Date.now() - msg.createdAt}ms`} 
    }, "get ping in ms").setCategory('util').setMeta({version: "1.0.0"})
,
length:
    new Command(function(msg, opts){
        return {content: String(this.content.length)}
    }).setCategory("util").setMeta({version: "1.0.0"})
,
tr:
    new Command(function(msg, opts){
        let [from, to] = this.content.split("-") 
        let send = to.slice(2)
        to = to.slice(0, 1)
        return{
            content: send.replaceAll(from.trim(), to.trim())
        }
    }, "tr letter1-letter2 text\ntranslates letter1 to letter2").setCategory("util").setMeta({version: "1.0.0"})
,
choose:
    new Command(function(msg, opts){
        let choices = this.content.split("|")
        return {
            content: choices[Math.floor(Math.random() * choices.length)]
        }
    }, "choose op1|op2|op3").setCategory("util").setMeta({version: "1.0.0"})
,
date:
    new Command(function(msg, opts){
        let timeZone = this.getAttr("tz")
        return {
            content: strftime(this.content, timeZone || "America/Los_Angeles")
        }
    }, `date [tz="timezone"] format\nformats:
    %S: seconds
    %s: seconds since jan 1 1970
    %H: hours
    %M: minutes
    %d: day
    %Y: year
    %MS: milliseconds
    %z: timezone`).setCategory("util").setMeta({version: "1.0.0"})
,
version:
    new Command(function(msg, opts){
        return {content: VERSION}
    }).setCategory("meta").setMeta({version: "1.0.0"})
,
var:
    new Command(function(msg, opts){
        let varName = this.content.split(" ")[0]
        let varText = this.content.split(" ").slice(1).join(" ")
        let scope = opts["g"] ? "global" : msg.author.id 
        try{
            userVars[scope][varName] = varText
        }
        catch(err){
            userVars[scope] = {}
            userVars[scope][varName] = varText
        }
        if(!opts["s"]){
            return {
                content: `${varName} set for ${userMention(msg.author.id)}\n${varName} = ${varText}`
            }
        } else return false
    }, "var [-g] varname var text\n-g: the variable is in the global scope (anyone can use it)\n-s: silent", "gs").setCategory("meta").setMeta({version: "1.0.0"})
,
unset:
    new Command(function(msg, opts){
        let scope = opts["g"] ? "global" : msg.author.id
        try{
            delete userVars[scope][this.content]
        }
        catch(err){
            console.log(err)
            return {content: `${this.content} does not exist in ${scope} scope`}
        }
        return {
            content: `unset ${this.content} in ${scope} scope`
        }
    }, "unset [-g] varname\n-g: unset var in global scope", "g").setCategory("meta").setMeta({version: "1.0.0"})
,
vars:
    new Command(function(msg, opts){
        let scope = this.content || msg.author.id
        let fmt = ""
        if(!userVars[scope]) return {content: `no vars in ${scope} scope`}
        for(let v in userVars[scope]){
            fmt += `${v}: ${userVars[scope][v]}\n`
        }
        if(fmt) return {content: fmt}
        else return {content: `no vars in ${scope} scope`}
    }, "vars [scope]").setCategory("meta").setMeta({version: "1.0.0"})
,
userid:
    new Command(function(msg, opts){
        if(!this.content) return {content: 'no user given'}
        let fmt = this.getAttr('fmt')
        if(!fmt) fmt = "%i"
        let members = userFinder(msg.guild, this.content)
        let text = ''
        for(let member of members){
            if(opts["v"]) text += `${member[1].user.username}: `
            text += `${formatp(fmt, [
                ["(?<!%)%i", member[1].id], 
                ["(?<!%)%m", userMention(member[0])],
                ["(?<!%)%n", member[1].nickname],
                ["(?<!%)%u", member[1].user.username],
                ["(?<!%)%j", member[1].jointedAt],
                ["(?<!%)%d", member[1].displayName],
                ["(?<!%)%c", member[1].displayHexColor],
            ])}\n`
        }
        return text ? {content: text} : {content: "found no one"}
    }, `userid [-v] [fmt=\"fmt\"] user\n-v: also say username
formats:
    %i: user id
    %m: mention
    %n: nickname
    %u: username
    %j: jointed at
    %d: display name
    %c: display hex color
    `, "v").setCategory("util").setMeta({version: "1.0.0"})
,
userinfo:
    new Command(function(msg, opts){
        let members
        members = userFinder(msg.guild, this.content)
        let embeds = {}
        let member
        let count = 0
        for(member of members){
            let [id, m] = member
            let embed = new MessageEmbed({title: `${m.user.username}`})
            embed.addField("id", id, true)
            embed.addField("joined", strftime("%m/%d/%Y, %H:%M:%S", "America/Los_Angeles", new Date(m.joinedTimestamp)), true)
            embed.addField("name", m.user.username, true)
            embed.addField("nickname", m.nickname ?? `**false**`, true)
            embed.addField("avatar url", `https://cdn.discordapp.com/avatars/${id}/${m.user.avatar}.png`, true)
            embed.setThumbnail(`https://cdn.discordapp.com/avatars/${id}/${m.user.avatar}.png`, true)
            embeds[m.user.username] = embed
            count++
            if(count > 25) return {content: "more than 25 users found"}
        }
        if(!member){return {content: "no users found"}}
        let rows = []
        if(count > 1){
            const row = new MessageActionRow()
            let menu = new MessageSelectMenu({customId: `${msg.author.id}:userInfo:${Date.now()}`})
            for(let e in embeds){
                menu.addOptions({label: e, value: e})
            }
            row.addComponents(menu)
            rows.push(row)
        }
        msg.channel.send({embeds: [embeds[member[1].user.username]], components: rows}).then(
            res => {
                const collector = msg.channel.createMessageComponentCollector({filter: i => i.user.id == msg.author.id, time: 300 * 1000})
                collector.on("collect", async i => {
                    await i.update({embeds: [embeds[i.values[0]]], components: rows})
                })
            }
        ).catch(res => console.log(res))
        return false
    }, "userinfo user\n-r: picks a random user").setCategory("util").setMeta({version: "1.0.0"})
,    
roll:
    new Command(function(msg, opts){
        let count = this.getAttr("count") ?? 1
        count = Number(count)
        let sep = this.getAttr("sep") ?? "\n"
        let [min, max] = this.content.split(" ")
        if(!min){
            min = 1
            max = 6
        }
        if(!max){
            max = min;
            min = 1
        }
        min = Number(min)
        max = Number(max)
        let results = []
        for(let i = 0; i < count; i ++){
            results.push(String(Math.floor(Math.random() * (max - min)) + min))
        }
        return {
            content: results.join(sep)
        }
    }, `roll [count="count"] [sep="sep"] min [max]`).setCategory("fun").setMeta({version: "1.0.0"})
,
changes:
    new Command(function(msg, opts){
        let changes = fs.readFileSync("./changes.md").toString()
        let rvChanges
        if(this.content){
            let versions = changes.split("---")
            for(let v of versions){
                let updV = v.split("\n").filter(val => val ? true : false)
                console.log(updV[0])
                if(updV[0]?.match(this.content)){
                    rvChanges = v
                    break
                }
            }
        }
        else if(!opts["a"]){
            rvChanges = changes.split("---")[0]
        }
        else rvChanges = changes
        if(opts["f"]){
            fs.writeFileSync(`./${msg.author.id}:changes.cmdresp`, rvChanges)
            return {
                files: [{attachment: `./${msg.author.id}:changes.cmdresp`, name: `${msg.author.id}-changes.md`}]
            }
        }
        return {content: `\`\`\`md\n${rvChanges}\`\`\``}
    }, "changes [-af] [version]\n-a: get all changes\n-f: put changes in file", "a").setCategory("meta").setMeta({version: "1.0.0"})
,
time:
    new Command(function(msg, opts){
        if(!this.content) return {content: "no command given"}
        msg.content = `[${this.content}`
        let start = performance.now()
        let resp = runCmd(Command.getCommand(`[${this.content}`), msg)
        if(!resp) return {content: "command not found"}
        resp["content"] = `time: ${performance.now() - start}\n${resp.content}`
        return resp
    }, "time cmd").setCategory("util").setMeta({version: "1.0.0"})
,
END:
    new Command(function(msg, opts){
        msg.channel.send("Exiting").then(
            res => exit()
        )
    }, "END").addToWhitelist(BOT_ADMINS).setCategory("admin").setMeta({version: "1.0.0"})
,
addooc:
    new Command(function(msg, opts){
        let ooc
        try{
            ooc = JSON.parse(fs.readFileSync('./storage/ooc.list').toString())
        }
        catch(err){
            ooc = []
        }
	let addOoc = this.content.replace("{file}", this.attachments[0].url).replace("{f}", this.attachments[0].url)
        ooc.push(addOoc)
        fs.writeFileSync('./storage/ooc.list', JSON.stringify(ooc))
        return {content: `"${addOoc}" added`}
    }, "\\[addooc ooc\n{f} is replaced with the link to file if a file is given").setMeta({version: "1.0.0"}).setCategory("fun")
,
rmooc:
    new Command(function(msg, opts){
        let ooc = JSON.parse(fs.readFileSync(`./storage/ooc.list`))
        ooc = ooc.filter(val => val != this.content)
        fs.writeFileSync('./storage/ooc.list', JSON.stringify(ooc))
        return {content: `removed: "${this.content}"`}
    }).setMeta({version: "1.0.0"}).setCategory("fun")
,
ooc:
    new Command(function(msg, opts){
        let count = this.getAttr("count") || 1
        let sep = this.getAttr("sep") || "\n"
        let ooc = JSON.parse(fs.readFileSync('./storage/ooc.list').toString())
        let oocs = []
        for(let i = 0; i < count; i++){
            oocs.push(ooc[Math.floor(Math.random() * ooc.length)])
        }
        return {content: oocs.join(sep)}
    }, "ooc [count=\"count\"] [sep=\"sep\"]").setMeta({version: "1.0.0"}).setCategory("fun")
,
oocfile:
    new Command(function(msg, opts){
	return {files: [{
	    attachment: `./storage/ooc.list`,
	    name: "ooc.json"
	}]}
    })
,
cmdmeta:
    new Command(function(msg, opts){
        let c = commands[this.content]
        if(!c) return {content: `${this.content} not found`}
        if(c instanceof Alias){
            c = c.cmd
        }
        let meta = ""
        for(let m in c.metaData){
            meta += `${m}: ${c.metaData[m]}\n`
        }
        return {content: meta}
    }).setCategory("meta").setMeta({version: "1.0.0", meta: 'yes'})
,
code:
    new Command(function(msg, opts){
        return {content: "https://github.com/Euro20179/discord-bot"}
    }).setCategory("meta").setMeta({version: "1.0.0", gay: "yes"})
,
snipe:
    new Command(function(msg, opts){
        if(opts["d"]){msg.delete().then(res => false).catch(res => false)}
        return {content: `${Command.escape(LAST_DELETED_MESSAGE.content)}\n-${userMention(LAST_DELETED_MESSAGE.author.id)}`}
    }, "snipe [-d]", "d").setCategory("fun").setMeta({"version": "1.0.0", evil: "yes"})
}

commands["code"].registerAlias(["src"], commands)
commands["echo"].registerAlias(["e"], commands)
commands["reverse"].registerAlias(["rev"], commands)
commands["spam"].registerAlias(["ss"], commands)
commands["reactiontime"].registerAlias(["rt"], commands)
commands["userinfo"].registerAlias(["ui", "uinfo"], commands)
commands["help"].registerAlias(["this-is-a-very-important-alias-because-its-for-the-help-command-and-people-often-use-the-longer-alias"], commands)
commands["cmdmeta"].registerAlias(["meta"], commands)

client.on("ready", () => {
    console.log("hello")
})

function* parseCommand(text){
    let doFirstCmd = [""]
    let doFirstCount = 0
    let inDoFirst = false
    let firstCharOfDoFirst = false
    let inParen = 0
    let escape = false
    for(let c of text){
        if(c == "(" && firstCharOfDoFirst && !inDoFirst){
            inDoFirst = true
            escape = false
            continue
        }
        else if(c == "\\"){
            escape = true
            continue
        }
        else if(c == "$" && !inDoFirst && !escape){
            escape = false
            firstCharOfDoFirst = true
            continue
        }
        else if(inDoFirst){
            escape = false
            firstCharOfDoFirst = false
            doFirstCmd[doFirstCount] += c
            if(c == "("){
                inParen++
            }
            else if( c == ")" && inParen == 0){
                yield doFirstCmd[doFirstCount].slice(0, doFirstCmd[doFirstCount].length - 1)
                doFirstCmd.push("")
                doFirstCount++
                inDoFirst = false
            }
            else if(c == ")"){
                inParen--
            }
        }
    }
}

function* parseVarsCommand(text){
    let varStart, escape = false
    let varName = ""
    for(let c of text){
        if(c == "\\") escape = true
        if(c == "$" && !escape){
            varStart = true;
            continue
        }
        if(varStart && c.match(/[a-z0-9_\-]/i)){
            escape = false
            varName += c
        }
        else if(varName){
            escape = false
            varStart = false
            yield varName
            varName = ""   
        }
        else{
            varStart = false
            escape = false
        }
    }
    if(varName){
        yield varName
    }
}

function replaceVars(msg){
    let text = msg.content
    for(let v of parseVarsCommand(msg.content)){
        let var_;
        try{
            var_ = userVars[msg.author.id][v]
        }
        catch(err){
            var_ = userVars["global"][v]
        }
        if(var_ != null && var_ != undefined) text = text.replaceAll(`$${v}`, var_)
    }
    return text
}

function handleInnerCmd(msg, tmpContent){
    for(let i of parseCommand(msg.content)){
        let innerCmd = Command.getCommand(`${PREFIX}${i}`)
        msg.content = i
        let resp = runCmd(innerCmd, msg)
        let content = resp?.content || ""
        tmpContent = tmpContent.replace(`$(${i})`, content)
    }
    return tmpContent
}

function runCmd(cmd, msg){
    msg.content = handleInnerCmd(msg, msg.content)
    msg.content = replaceVars(msg)
    return commands[cmd]?.run(msg)
}

client.on("messageCreate", async (msg) => {
    if(msg.content[0] == PREFIX){
        let cmd = Command.getCommand(msg.content)
        let resp = runCmd(cmd, msg)
        if(resp){
            if(resp.then){
                //some functions can be async
                resp = await resp
            }
            if(resp){
                try{
                    await msg.channel.send(resp)
                }
                catch(err){
                    console.log(err)
                    if(err.httpStatus){
                        let content = resp?.content || resp?.embed
                        fs.writeFile(`./${msg.author.id}.cmdresp`, content, async () => {
                            await msg.channel.send({files: [{
                                attachment: `./${msg.author.id}.cmdresp`,
                                name: `${msg.author.id}.txt`
                            }]})
                            fs.unlinkSync(`./${msg.author.id}.cmdresp`)
                        })
                    }
                }
                fs.unlink(`./${msg.author.id}:${cmd}.cmdresp`, (err) => true)
            }
        }
        else if(resp != false){
            msg.channel.send(`${cmd} does not exist`)
        }
    }
})

client.on("messageDelete", async(msg) => {
    if([429650019726000129, 535251826128453662].indexOf(msg.channel.id) < 0){
        LAST_DELETED_MESSAGE = msg
    }
})
client.login(token)

module.exports = {
    PREFIX: PREFIX
}
