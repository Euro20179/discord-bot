import { Client, Message, PartialMessage, MessageEmbed, GuildMember, MessageCollector } from "discord.js"

import {Collection} from "@discordjs/collection"

import {UserInfo} from "./src/userinfo"

import {Item, items, saveItems} from "./src/items"

const math = require("mathjs")

const mathParser = math.parser()

//
//@ts-ignore
const fs = require("fs")

let users: {[id: string]: UserInfo} = {}
fs.readdir('./storage', (err, files) => {
    if(err){ console.log(err); return}
    files.forEach(file => {
        if(file.match(/^[0-9]{18}\.json/)){
            let id = file.split(".")[0]
            if(users[id]) return
            let d = fs.readFileSync(`./storage/${file}`).toString()
            if(d) users[id] = UserInfo.fromJson(JSON.parse(d))
        }
    })
})

//@ts-ignore
const { Intents, MessageActionRow, MessageSelectMenu} = require("discord.js")
//@ts-ignore
const { performance } = require("perf_hooks")
//@ts-ignore
const { exit } = require("process")
//@ts-ignore
import {Command, Alias} from "./src/command"
//@ts-ignore
const {createButton} = require("./src/interactives.js")
import {userFinder} from "./src/util.js"
const {expandContent, userMention, strftime, formatp} = require("./src/util")
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

let PREFIX = "]"

const VERSION = "1.5.5"

let SPAMS = []

let LAST_DELETED_MESSAGE = {}

let SPAM_STOP = false

Command.setPrefix(PREFIX)

const commands = {
echo: 
    new Command(function(msg: Message, opts){
        let replyTo: string | null = this.getAttr("reply") || null
        let msgToReplyTo: Message | undefined
        if(replyTo){
            msgToReplyTo = msg.channel.messages.cache.find((val, key) => key == replyTo)
        }
        if(!opts['D']) msg.delete().then().catch(reason => console.log("no delete perms"))
        if(opts["f"]){
            let ext = this.getAttr("ext") || 'txt'
            let fileName = this.getAttr("filename") || `${msg.author.id}-echo.${ext}`
            fs.writeFileSync(`./${msg.author.id}:echo.cmdresp`, this.content)
            return {
                reply: msgToReplyTo,
                files: [{
                    attachment: `./${msg.author.id}:echo.cmdresp`,
                    name: fileName
                }]
            }
        }
        return {
            reply: msgToReplyTo,
            content: expandContent(this.content, msg.author)
        }
    }, 
    'echo [-Df] [reply=\"messageid\"] [filename=\"name\"] [ext=\"ext\"] message\n-D: don\'t delete your message\n-f: write to file', 'Df').setCategory("fun").setMeta({version: "1.0.0"})
,

unknown:
    new Command(function(msg, opts){
        return {content: "unknown", embeds: [new MessageEmbed({title: "unknown"})]}
    }).setMeta({version: "unknown", unknown: undefined})
,

listspam:
    new Command(function(msg, opts){
        let rv = ""
        for(let s in SPAMS){
            let so = SPAMS[s]
            rv += `${so.message} * ${so.count} - ${so.starter}\n`
        }
        return {content: rv.trim() || "no spams are running"}
    }).setCategory("util").setMeta({version: "1.2.2"})

,

embed:
    new Command(function(msg: Message, opts){
        if(opts["d"]) msg.delete().then(res => false).catch(res => console.log(res))
        const color = this.getAttr("color") || "black"
        let embed = new MessageEmbed({
            color: color,
            description: this.getAttr("description") || undefined,
        })
        try{
            embed = new MessageEmbed(JSON.parse(this.content))            
            return {embeds: [embed]}
        }
        catch(err){}
        embed.setThumbnail(this.getAttr("thumb"))
        embed.setImage(this.getAttr("img"))
        embed.setFooter(this.getAttr("footer") || "")
        embed.setAuthor(this.getAttr("author") || "")
        embed.title = this.content.split("\n")[0]
        for(let line of this.content.split("\n").slice(1)){
            let [name, value, inline] = line.split("|")
            if(!name) return {content: "field name cannot be empty"}
            if(!value) return {content: "value cannot be empty"}
            inline = inline?.trim()
            if(["false", "true", undefined].indexOf(inline) == -1) return {content: "inline must be true or false"}
            embed.addField(name, value, inline == "true" ? true : false)
        }
        if(opts["j"]){
            return {content: JSON.stringify(embed.toJSON())}
        }
        return {
            embeds: [embed]
        }
    }, "embed [-dj] [author=\"author\"] [color=\"color\"] [description=\"description\"] [footer=\"footer\"] [img=\"img\"] [thumb=\"thumb\"] title\nfieldname | fieldvalue\n...\n-d: delete message\n-j: return JSON of embed", "d").setCategory("fun")
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
                                    content: expandContent(onclick, msg.author, {
                                        "clicker": i.user.username,
                                        "clickerm": userMention(i.user.id),
                                        "timeclicked": new Date().toString()
                                    }, false), 
                                    components: []
                                })
                            }
                        })
                    }
                ).catch(res => console.log(res))
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
                embeds[c.category].addField(cmd, c.aliases.join(" ") || cmd, true)
            }
        }
        let row = new MessageActionRow()
        let rows = []
        let i = 0
        for(let c in embeds){
            if(i == 4) {
                i = 0
                rows.push(row)
                row = new MessageActionRow()
            }
            row.addComponents(createButton(c, c, "PRIMARY"))
            i++
        }
        if(i > 0) rows.push(row)
        //row.addComponents(createButton("help:button:quit", "stop", "DANGER"))
        let cat = "fun"
        if(this.content in embeds) cat = this.content
        msg.channel.send({embeds: [embeds[cat]], components: rows}).then(
            res => {
                const collector = msg.channel.createMessageComponentCollector({filter: i => i.user.id == msg.author.id, time: 300 * 1000})
                collector.on("collect", async i => {
                    if(i.customId != "help:button:quit")
                        await i.update({embeds: [embeds[i.customId]], components: rows})
                    else await i.update({embeds: [], components: [], content: "this *was* help"})
                })
            }
        ).catch(res => console.log(res))
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
                        i.update({content: Math.random() > .995 ? 'https://tenor.com/view/dance-moves-dancing-singer-groovy-gif-17029825' : `${i.user.username}'s reaction time is: ${final / 1000}`, components: []}).then().catch(res => false)
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
        if(Math.random() > .99){
            return {content: "progress has been made 😁"}
        }
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
    new Command(async function(msg: Message, opts){
        SPAM_STOP = false
        if(opts["d"]) await msg.delete().then().catch(res => console.log(res))
        let _delay = this.getAttr('delay') || 1
	let delay
        if(typeof _delay != "number" && _delay.indexOf(",") != -1){
            let [min, max] = _delay.split(",")
	    //@ts-ignore
            max *= 1000
	    //@ts-ignore
            min *= 1000
            delay = () => (Math.random() * (Number(max) - Number(min))) + Number(min)
        }
        else delay = () => Number(_delay) * 1000
        let count = Number(this.content.split(" ")[0])
        let message = this.content.split(" ").slice(1).join(" ")
        const SPAMID = Math.floor(Math.random() * 100000)
        SPAMS.push({
            starter: msg.author.username, 
            message: message,
            count: count,
            id: SPAMID
        })
        for(let i = 0; i < count; i++){
            if(SPAM_STOP) break
            await msg.channel.send({content: message})
            await new Promise(res => setTimeout(res, delay()))
        }
        SPAMS = SPAMS.filter((val, idx) => val.id != SPAMID)
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
        if(Math.random() > .995){
            return {content: `heres your ping now go away ${Date.now() - msg.createdAt}`}
        }
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
        users[msg.author.id].setVar(varName, varText)
        if(!opts["s"]){
            return {
                content: `${varName} set for ${userMention(msg.author.id)}\n${varName} = ${varText}`
            }
        } else return false
    }, "var varname var text\n-s: silent", "s").setCategory("meta").setMeta({version: "1.0.0"})
,
unset:
    new Command(function(msg, opts){
        try{
            delete users[msg.author.id].vars[this.content]
        }
        catch(err){
            return {content: `${this.content} does not exist in ${msg.author.id} scope`}
        }
        return {
            content: `unset ${this.content} in ${msg.author.id} scope`
        }
    }, "unset varname").setCategory("meta").setMeta({version: "1.0.0"})
,
vars:
    new Command(function(msg, opts){
        let scope = this.content || msg.author.id
        let fmt = ""
        if(!users[scope]?.vars) return {content: `no vars in ${scope} scope`}
        for(let v in users[scope].vars){
            fmt += `${v}: ${users[scope].vars[v]}\n`
        }
        if(fmt) return {content: fmt.trim()}
        else return {content: `no vars in ${scope} scope`}
    }, "vars [scope]").setCategory("meta").setMeta({version: "1.0.0"})
,
user:
    new Command(function(msg, opts){
        let members
        let text = ''
        let fmt = this.getAttr('fmt') || "%i"
        if(opts["r"]){
            let m = msg.guild.members.cache.random()
            members = [[String(m.id), m]]
        }
        else if(!this.content) return {content: 'no user given'}
        else{
            if(!fmt) fmt = "%i"
            members = userFinder(msg.guild, this.content)
        }
        for(let member of members){
            if(opts["v"]) text += `${member[1].user.username}: `
            text += `${formatp(fmt, [
                ["(?<!%)%i", member[1].id], 
                ["(?<!%)%m", userMention(member[0])],
                ["(?<!%)%n", member[1].nickname],
                ["(?<!%)%u", member[1].user.username],
                ["(?<!%)%j", member[1].joinedAt],
                ["(?<!%)%d", member[1].displayName],
                ["(?<!%)%c", member[1].displayHexColor],
                ["(?<!%)%a", `https://cdn.discordapp.com/avatars/${member[0]}/${member[1].user.avatar}.png`]
            ])}\n`
        }
        return text ? {content: text.trim()} : {content: "found no one"}
    }, `userid [-vr] [fmt=\"fmt\"] user\n-v: also say username
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
            embed.setThumbnail(`https://cdn.discordapp.com/avatars/${id}/${m.user.avatar}.png`)
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
            content: results.join(sep).trim()
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
        for(let user in users){
            users[user].save(`./storage/${user}.json`)
        }
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
        let addOoc = this.content
        if(this.attachments[0]) addOoc = this.content.replace("{file}", this.attachments[0].url).replace("{f}", this.attachments[0].url)
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
        return {content: oocs.join(sep).trim()}
    }, "ooc [count=\"count\"] [sep=\"sep\"]").setMeta({version: "1.0.0"}).setCategory("fun")
,
oocfile:
    new Command(function(msg, opts){
        return {files: [{
            attachment: `./storage/ooc.list`,
            name: "ooc.json"
        }]}
    }).setCategory("util").setMeta({version: "1.0.3"})
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
        return {content: meta.trim()}
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
        let m = LAST_DELETED_MESSAGE[msg.channel.id]
        if(!m) return {content: "no message deleted in this channel"}
        return {content: `${Command.escape(m.content)}\n-${userMention(m.author.id)}`}
    }, "snipe [-d]", "d").setCategory("fun").setMeta({"version": "1.0.0", evil: "yes"})
,
"add8ball":
    new Command(function(msg, opts){
        let resps
        try{
            resps = JSON.parse(fs.readFileSync('./storage/8ball.list').toString())
        }
        catch(err){
            resps = []
        }
        let addResp = this.content
        resps.push(addResp)
        fs.writeFileSync('./storage/8ball.list', JSON.stringify(resps))
        return {content: `added ${addResp}`}
    }).setCategory("fun").setMeta({"version": "1.2.0"})
,
"rm8ball":
    new Command(function(msg, opts){
        let resps = JSON.parse(fs.readFileSync(`./storage/8ball.list`))
        resps = resps.filter(val => val != this.content)
        fs.writeFileSync('./storage/8ball.list', JSON.stringify(resps))
        return {content: `removed: "${this.content}"`}
    }).setCategory("fun").setMeta({version: "1.2.0"})
,
"8ball":
    new Command(function(msg, opts){
        let resp = JSON.parse(fs.readFileSync('./storage/8ball.list').toString())
        return {content: expandContent(resp[Math.floor(Math.random() * resp.length)], msg.author, {content: this.content.trim() || "?"})}
    }).setCategory("fun").setMeta({version: "1.2.0"})
,
"8bfile": 
    new Command(function(msg, opts){
        return {files: [{
            attachment: `./storage/8ball.list`,
            name: `8ball.json`
        }]}
    }).setCategory("util").setMeta({version: "1.2.0"})
,
money:
    new Command(function(msg, opts){
        let user = msg.author.id
        if(this.content.trim()){
            let u = userFinder(msg.guild, this.content)
            for(user of u){
                if(!user[0]) break
                user = user[0]
                break
            }
        }
        return {content: `user:\n${(users[user]?.money)}`}
    }, "money user").setCategory("economy").setMeta({version: "1.3.0"})
,
profile:
    new Command(function(msg: Message, opts){
        let u = msg.author
        let fmt = this.getAttr("fmt") || "%i:\nmoney: %m\ntax rate: %t"
        if(this.content) {
            if(!(u = userFinder(msg.guild, this.content)?.first()?.user)) return {content: `${this.content} not found`}
        }
        if(opts["f"]){
            return {files: [{
                attachment: `./storage/${u.id}.json`,
                name: `${u.id}.json`
            }]}
        }
        if(!users[u.id])return {content: "this user has no profile"}
        fmt = expandContent(fmt, u)
        return {
            content: formatp(fmt, [
                ["(?<!%)%i", u.id],
                ["(?<!%)%m", String(users[u.id].money)],
                ["(?<!%)%lt", new Date(users[u.id].lastTalked)],
                ["(?<!%)%lx", new Date(users[u.id].lastTaxed)],
                ["(?<!%)%ld", new Date(users[u.id].lastDonated)],
                ["(?<!%)%t", String(users[u.id].taxRate)],
                ["(?<!%)%v", (() => {
                    let text = ""
                    for(let va in users[u.id].vars){
                        text += `${va}: ${users[u.id].vars[va]}\n`
                    }
                    return text || "NO VARS"
                })],
            ])
        }
    }, `profile [fmt=\"fmt\"] [user]
formats:
    %i: user id
    %m: user money
    %lt: last time user talked
    %lx: last time user taxed someone
    %ld: last time user donated
    %t: user's taxrate
    %v: user's variables`, "", true).setCategory("economy").setMeta({version: "1.3.0"})
,
leaderboard:
    new Command(function(msg: Message, opts){
        let moneys = []
        let max = Number(this.content) || 10
        for(let user in users){
            moneys.push([user, users[user]["money"]])
        }
        moneys = moneys.sort((a, b) => a[1] > b[1] ? -1 : 1)
        let embeds = [new MessageEmbed({title: "Leaderboard 1"})]
        let embed = 0
        for(let i = 0; i < max; i++){
            if(!moneys[i]) break
            if(i % 12 == 0 && i != 0){
                embed++
                embeds.push(new MessageEmbed({title: `Leaderboard ${embed + 1}`}))
            }
            embeds[embed].addField(`${i + 1}: ${msg.guild.members.cache.find((val, key) => key == moneys[i][0])?.user?.username || "unknown"}`, String(moneys[i][1]), true)
        }
        return {embeds: embeds}
    }).setCategory("economy").setMeta({version: "1.3.0"})
,
tax:
    new Command(function(msg, opts){
        if(users[msg.author.id].timeSinceTax() < 1){
            return {content: `You have already taxed someone within the past hour\nwait another ${(1 - users[msg.author.id].timeSinceTax()) * 60}minutes`}
        }
        let u = userFinder(msg.guild, this.content)
        let taxAmount
        let user
        for(user of u){
            if(!users[user[1].id]){
                return {content: `${user[1].user.username} does not have a profile`}
            }
            taxAmount = users[user[1].id].tax()
            if(taxAmount == 0){
                return {content: `${user[1].user.username} has been taxed today`}
            }
            users[msg.author.id].money += taxAmount
            break
        }
        if(!user) return {content: `invalid user: ${this.content}`}
        users[msg.author.id].lastTaxed = Date.now()
        for(let ui in users){
            if(ui == user[1].id) continue
            users[ui].taxRate += 0.01
            users[ui].save(`./storage/${ui}.json`)
        }
        return {content: `you have taxed ${user[1].user.username} for ${taxAmount}`}
    }, "tax user\nWhen you tax someone, the taxrate of all other users (except you) increases by 1%").setCategory("economy").setMeta({version: "1.3.0"})
,
donate:
    new Command(function(msg, opts){
        if(users[msg.author.id].timeSinceDonate() < 1){
            return {content: `You have already donated to someone within the past hour\nwait another ${(1 - users[msg.author.id].timeSinceDonate()) * 60}minutes`}
        }
        let amount = this.content.split(" ")[0]
        if(isNaN(Number(amount))) return {content: `${amount} is not a number`}
        let searchUser = this.content.split(" ").slice(1).join(" ")
        amount = Number(amount / 100)
        if(amount * 100 < .1){
            return {content: "The minimum you can donate is .1%"}
        }
        let u = userFinder(msg.guild, searchUser)
        let user: [string, GuildMember] ;
        for(user of u){
            if(user[1].user.bot) return {content: "bots cannot donate"}
            if(!users[user[1].id]){
                users[user[1].id] = new UserInfo({id: user[1].id, money: 100})
            }
            users[msg.author.id].taxRate -= amount + .007
            let donation = users[msg.author.id].money * amount 
            users[user[1].id].money += donation
            users[msg.author.id].money -= donation
            users[msg.author.id].lastDonated = Date.now()
            users[user[1].id].save(`./storage/${user[1].id}.json`)
            return {content: `donated ${donation} to ${user[1].user.username}`}
        }
        if(!user) return {content: `Invalid user: ${searchUser}`}
    }, "donate amount user\namount is in **percent** eg: [amount 1 <@898781634797654046>\nwould donate 1% of your money to <@898781634797654046>\nDonating reduces your tax rate by the amount you donated + .7%")
,
prefix:
    new Command(function(msg, opts){
        if(!this.content){return {content: "PREFIX MUST BE SET TO SOMETHING"}}
        PREFIX = this.content
        Command.setPrefix(PREFIX)
        return {content: `The new prefix is: ${PREFIX}`}
    }).setCategory("admin").setMeta({version: "1.3.9"})
,
SETTAXRATE:
    new Command(function(msg, opts){
        for(let u in users){
            users[u].taxRate = Number(this.content)
            users[u].save(`./storage/${u}.json`)
        }
        return {content: `tax rate for all users is ${this.content}`}
    }).addToWhitelist(["334538784043696130"]).setMeta({version: "1.3.2"}).setCategory("admin")
,
SETMONEY:
    new Command(function(msg, opts){
        let amount = this.content.split(" ")[0]
        let userSearch = this.content.split(" ").slice(1).join(" ")
        let u = userFinder(msg.guild, userSearch)
        let user
        for(user of u){
            if(!users[user[0]])return {content: `${user[0]} not found`}
            users[user[0]].money = Number(amount)
            return {content: `${userMention(user[1].id)} is at ${amount}`}
        }
    }).addToWhitelist(["334538784043696130"]).setMeta({version: "unknown"}).setCategory("admin")
,
calc:
    new Command(function(msg, opts){
        if(opts["s"]){
            try{
                return {content: String(mathParser.simplify(this.content.trim()))}
            } catch(err){
                return {content: "could not simplify expression"}
            }
        }
        try{
            return {content: String(mathParser.evaluate(this.content))}
        } catch(err){
            return {content: "could not evaluate expression"}
        }
    }, "calc [-s] expression\n-s: simplify expression (cannot be equation)", "s").setCategory("util").setMeta({version: "1.4.0", math: "M A  TH"})
,
allitems:
    new Command(function(msg, opts){
        if(opts["f"]){
            return {
                files: [
                    {
                        attachment: './items.json',
                        name: "items.json"
                    }
                ]
            }
        }
        if(opts["t"]){
            let text = ""
            for(let item in items){
                text += `${item}\n`
            }
            return text
        }
        let embeds = []
        let count = 0
        for(let i in items){
            count++
        }
        let i = 1
        for(let itemName in items){
            let item = items[itemName]
            let embed = new MessageEmbed({title: itemName})
            embed.addField("cost", String(item["cost"]))
            embed.setDescription(`page ${i}/${count}`)
            if(item["recipes"]){
                let i = 0
                for(let recipe of item["recipes"]){
                    i++
                    if(!recipe) continue
                    embed.addField(`recipe ${i}`, recipe.join(" + "))
                }
            }
            if(item["createdBy"]){
                embed.addField("created by", userFinder(msg.guild, item["createdBy"]).first().user.username || "unknown")
            }
            if(item["img"]){
                embed.setThumbnail(item["img"])
            }
            embeds.push(embed)
            i++
        }
        let pos = 1
        let backId = `${msg.author.id}${Math.random()}:allitems-back`
        let nextId = `${msg.author.id}${Math.random()}:allitems-next`
        let row = new MessageActionRow().addComponents(createButton(backId, "<<", "PRIMARY"), createButton(nextId, ">>", "PRIMARY"))
        msg.channel.send({embeds: [embeds[pos - 1]], components: [row]}).then(res => {
            const collector = new MessageCollector(msg.channel, {filter: m => !m.author.bot && m.content ? true : false, time: 60000})
            const buttonCollector = msg.channel.createMessageComponentCollector({time: 60000})
            buttonCollector.on("collect", async(i)=> {
                switch(i.customId){
                    case backId:
                        pos--
                        break;
                    case nextId:
                        pos++
                        break;
                    default: return
                }
                if(pos > embeds.length) pos = 1
                if(pos <= 0) pos = embeds.length
                try{i.update({embeds: [embeds[pos - 1]], components: [row]})}
                catch(err){console.log(err)}
                return
            })
            collector.on("collect", async(message) => {
                //@ts-ignore
                if(!message.content) return
                let sign = ""
                if(message.content.indexOf("+") > -1) sign = "+"
                else if(message.content.indexOf("-") > -1) sign = "-"
                let n = Number(message.content.replace(sign, ""))
                if(isNaN(n)){ return }
                switch(sign){
                    case "+":
                        pos += n
                        if(pos > embeds.length || pos < 0) return
                        break
                    case "-":
                        pos -= n
                        if(pos > embeds.length || pos < 0) return
                        break
                    default:
                        pos = n
                        if(pos > embeds.length || pos < 0) return
                        break
                }
                await msg.channel.send({embeds: [embeds[pos - 1]], components: [row]})
            })
            
        })
        return false
    }, "items [-fl]\n-f: give file\n-t: text only", "ft").setCategory("economy").setMeta({version: "1.5.0"})
,
item:
    new Command(function(msg, opts){
        let item = items[this.content.trim()]
        if(!item){
            item = users[msg.author.id].items[this.content.trim()]
            if(!item)return {content: `could not find item: ${this.content}`}
        }
        let embed = new MessageEmbed({title: `${this.content}`})
        embed.addField("cost", String(item["cost"]))
        if(item["recipes"]){
            let i = 0
            for(let recipe of item["recipes"]){
                i++
                if(!recipe) continue
                embed.addField(`recipe ${i}`, recipe.join(" + "))
            }
        }
        if(item["createdBy"]){
            embed.addField("created by", userFinder(msg.guild, item["createdBy"]).first().user.username || "unknown")
        }
        if(item["img"]){
            embed.setThumbnail(item["img"])
        }
        return {embeds: [embed]}
    }).setCategory("economy").setMeta({version: "1.5.0"})
,
buy:
    new Command(function(msg, opts){
        let requestItem = this.content.split(" ").slice(0)[0].trim()
        let materials = this.content.split(" ").slice(1).join(" ").split(",").map((val) => val.trim())
        if(!items[requestItem]){
            return {content: `${this.content} is not an item`}
        }
        let item: Item = items[requestItem]
        let info = users[msg.author.id]
        if(info.money < item["cost"]){
            return {content: `You are $${item["cost"] - info.money} short`}
        }
        let sortedMaterials = JSON.stringify(materials.sort())
        let matchedRecipe = false
        if(item["recipes"]){
            for(let recipe of item["recipes"]){
                if(!recipe && !materials[0]){
                    matchedRecipe = true
                    break
                }
                else if(!recipe) continue
                let sortedRecipe = recipe.sort()
                if(JSON.stringify(sortedRecipe) === sortedMaterials){
                    for(let item of sortedRecipe){
                        if(!users[msg.author.id].items[item]){ return {content: `You do not own ${item}`}}
                        users[msg.author.id].useItem(item)
                    }
                    matchedRecipe = true
                }
            }
        } else matchedRecipe = true
        if(!matchedRecipe){return {content: `You have not provided a valid recipe, see [item ${requestItem} to see a list of recipes`}}
        users[msg.author.id].buy(requestItem)
        return {content: items[requestItem]["onPurchaceSay"] || `bought ${requestItem}`}
    }, "buy item material1, material2...").setCategory("economy").setMeta({version: "1.5.0"})
,
items: 
    new Command(async function(msg, opts){
        let user: GuildMember = msg.author
        if(this.content) user = userFinder(msg.guild, this.content.trim()).first()
        if(!user){return {content: `user ${this.content} not found`}}
        if(!users[user.id]){
            return {content: `${user} does not have a profile`}
        }
        if(opts["l"]){
            let text = ""
            for(let item in users[user.id].items){
                text += `${item}: ${users[user.id].itemCounts[item]}\n`
            }
            return {content: text || `${user.user.username} has no items`}
        }
        let embeds = []
        let i = 0
        let total = Object.keys(users[user.id].items).length
        for(let item in users[user.id].items){
            let e = new MessageEmbed({title: item})
            e.setFooter(`Page: ${i + 1}/${total}`)
            e.addField("purchace price", String(users[user.id].items[item].cost))
            e.addField("count", String(users[user.id].itemCounts[item]))
            if(users[user.id].items[item].img) e.setThumbnail(users[user.id].items[item].img)
            embeds.push(e)
            i++
        }
        if(embeds.length == 0){
            return {content: `${user.user?.username} has no items`}
        }
        let pos = 1
        let backId = `${msg.author.id}${Math.random()}:items-back`
        let nextId = `${msg.author.id}${Math.random()}:items-next`
        let stopId = `${msg.author.id}${Math.random()}:stop`
        let row = new MessageActionRow().addComponents(createButton(backId, "<<", "PRIMARY"), createButton(nextId, ">>", "PRIMARY"), createButton(stopId, "X", "DANGER"))
        msg.channel.send({embeds: [embeds[pos - 1]], components: [row]}).then(res => {
            const collector = new MessageCollector(msg.channel, {filter: m => !m.author.bot && m.content ? true : false, time: 60000})
            const buttonCollector = msg.channel.createMessageComponentCollector({time: 60000})
            buttonCollector.on("collect", async(i)=> {
                switch(i.customId){
                    case backId:
                        pos--
                        break;
                    case nextId:
                        pos++
                        break;
                    case stopId:
                        buttonCollector.stop("user stop")
                        i.update({content: "stopped"})
                        return
                    default: return
                }
                if(pos > embeds.length) pos = 1
                if(pos <= 0) pos = embeds.length
                try{i.update({embeds: [embeds[pos - 1]], components: [row]})}
                catch(err){console.log(err)}
                return
            })
            collector.on("collect", async(message) => {
                //@ts-ignore
                if(!message.content) return
                if(message.content == "x") {
                    collector.stop()
                    //@ts-ignore
                    message.update({content: "stopped"})
                    return
                }
                let sign = ""
                if(message.content.indexOf("+") > -1) sign = "+"
                else if(message.content.indexOf("-") > -1) sign = "-"
                let n = Number(message.content.replace(sign, ""))
                if(isNaN(n)){ return }
                switch(sign){
                    case "+":
                        pos += n
                        if(pos > embeds.length || pos < 0) return
                        break
                    case "-":
                        pos -= n
                        if(pos > embeds.length || pos < 0) return
                        break
                    default:
                        pos = n
                        if(pos > embeds.length || pos < 0) return
                        break
                }
                await msg.channel.send({embeds: [embeds[pos - 1]], components: [row]})
            })
        })
        return false
    }, "items [-l] [user]\n-l: list items instead of embeds", "l").setCategory("economy").setMeta({version: '1.5.0'})
,
'additem':
    new Command(function(msg, opts){
        let cost = Number(this.getAttr("cost")) || 100
        if(isNaN(cost)) return {content: `${cost} is not a number`}
        if(cost < 0) return {content: "cost cannot be less than 0"}
        let count = Number(this.getAttr("count")) || 1
        if(isNaN(count))return {content: `${count} is not a number`}
        let recipe = this.getAttr("recipes") || ""
        let img = this.getAttr("img") || ""
        let recipes = null
        if(recipe){
            recipes = []
            for(let rec of recipe.split("|")){
                recipes.push(rec.split(","))
            }
        }
        let itemName = this.content.split(" ")[0]
        let saying = this.content.split(" ").slice(1).join(" ")
        if(itemName.match(/,/)){
            return {content: "item name cannot have , in the name"}
        }
        if(items[itemName]){
            return {content: `${itemName} already exists`}
        }
        items[itemName] = {
            onPurchaceSay: saying,
            createdBy: String(msg.author.id),
            cost: cost,
            recipes: recipes,
            count: count,
            img: img
        }
        saveItems(items)
        return {content: `created item ${itemName}:\n${JSON.stringify(items[itemName])}`}
    }, "additem [cost=\"amount\"] [count=\"count to get when bought\"] [recipes=\"recipe1|recipe2...\"] item-name thing that is said when item is bought\nrecipies are items seperated by ,. These items technically dont' have to exist, but if they don't you wont be able to buy the item").setCategory("economy").setMeta({version: "1.5.0"})
,
rmitem:
    new Command(function(msg, opts){
        let iName = this.content.trim()
        if(!items[iName]){
            return {content: "item doesn't exist"}
        }
        if(!items[iName]["createdBy"]) return {content: "item is a standard item"}
        let createdBy = userFinder(msg.guild, items[iName]["createdBy"]).first()
        if(createdBy.id != msg.author.id) return {content: "you did not create this item"}
        delete items[iName]
        saveItems(items)
        return {content: `${iName} deleted`}
    }).setCategory("economy").setMeta({version: "1.5.0"})
,
edititem:
    new Command(function(msg, opts){
        let cost = this.getAttr("cost")
        let recipe = this.getAttr("recipes")
        let onSay = this.getAttr("onbuy")
        let count = this.getAttr("count")
        let img = this.getAttr("img")
        let iName = this.content.trim()
        if(!items[iName]){
            return {content: "item doesn't exist"}
        }
        if(!items[iName]["createdBy"]) return {content: "item is a standard item"}
        let createdBy = userFinder(msg.guild, items[iName]["createdBy"]).first()
        if(createdBy.id != msg.author.id) return {content: "you did not create this item"}
        let item = items[iName]
        if(cost && !isNaN(Number(cost))) item["cost"] = Number(cost)
        if(count && !isNaN(Number(count))) item["count"] = Number(count)
        if(onSay) item["onPurcacheSay"] = onSay
        if(img) item["img"] = img
        if(recipe){
            let recipes = []
            for(let rec of recipe.split("|")){
                recipes.push(rec.split(","))
            }
            item["recipes"] = recipes
        }
        items[iName] = item
        saveItems(items)
        return {content: JSON.stringify(item)}
    })
}

commands["allitems"].registerAlias(["shop"], commands)
commands["calc"].registerAlias(["c", "eval", "evaluate"], commands)
commands["leaderboard"].registerAlias(["lb", "top"], commands)
commands["8bfile"].registerAlias(["8f", "8bf"], commands)
commands["8ball"].registerAlias(["8", "8b"], commands)
commands["add8ball"].registerAlias(["add8", "add8b", "a8", "a8b", "8bradd", "8br"], commands)
commands["rm8ball"].registerAlias(["rm8", "rm8b", "8brdel", "8bdel"], commands)
commands["timeguesser"].registerAlias(["tg"], commands)
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
    //if not in dev mode
    if(PREFIX == "]"){
        let gid = fs.readFileSync("guild").toString().trim()
        let guild = client.guilds.cache.find((val) => val.id == gid)
        for(let member of ["334538784043696130"]){
            let u = guild.members.cache.find((val) => val.id == member)
            u.send({content: `BOT V: ${VERSION} ONLINE`})
        }
    }
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
        let var_ = users[msg.author.id].vars[v]
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

async function doCmd(msg: Message | PartialMessage){
    let cmd = Command.getCommand(msg.content)
    let resp = runCmd(cmd, msg)
    if(resp){
        if(resp.then){
            //some functions can be async
            resp = await resp
        }
        if(resp){
            try{
                if(!resp.reply) await msg.channel.send(resp)
                else await resp.reply.reply(resp)
            }
            catch(err){
                console.log(err)
                if(err.httpStatus){
                    let content = resp?.content || resp?.embed
                    fs.writeFile(`./${msg.author.id}.cmdresp`, content, async () => {
                        if(!resp.reply) await msg.channel.send({files: [{
                                            attachment: `./${msg.author.id}.cmdresp`,
                                            name: `${msg.author.id}.txt`
                                        }]})
                        else await resp.reply.reply({files: [{
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

client.on("messageCreate", async (msg) => {
    if(!users[msg.author.id]){
        users[msg.author.id] = new UserInfo({id: msg.author.id, money: 0})
    }
    users[msg.author.id]?.talk()
    if(msg.content.slice(0, PREFIX.length) == PREFIX){
        for(let sLine of msg.content.split("\n;")){
            msg.content = sLine.trim()
            await doCmd(msg)
        }
    }
    users[msg.author.id]?.save(`./storage/${msg.author.id}.json`)
})

client.on("messageUpdate", async (oldMsg, msg) => {
    if(msg.content.slice(0, PREFIX.length) == PREFIX){
        await doCmd(msg)
    }
})

client.on("messageDelete", async(msg) => {
    if([429650019726000129, 535251826128453662].indexOf(Number(msg.channel.id)) < 0){
        LAST_DELETED_MESSAGE[msg.channel.id] = msg
    }
})
client.login(token)

module.exports = {
    PREFIX: PREFIX
}
