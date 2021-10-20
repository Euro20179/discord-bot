import { Message, MessageAttachment, MessageOptions } from "discord.js"

//@ts-ignore
const { expandContent } = require("./util.js")

interface Opts{
    [val: string]: boolean
}

type Category = "fun" | "meta" | "util" | "admin"
type UserIdString = string

function parseOpts(text, optString): [Opts, string]{
    text = Command.stripPrefix(text)
    
    let optsString = ''
    let opts = {}
    for(let opt of optString){
        opts[opt] = false
    }

    let textIndex
    for(textIndex = 0; textIndex < text.length; textIndex++){
        //this will be true when the first char is not -
        let c = text[textIndex]
        if(c == " " || (textIndex == 0 && c != "-")) break;
        optsString += c
        opts[c] = true
    }
    return [ opts, optsString ]
}
class Command{
    //This will change each time the command is called in discord, it will refer to the message the user sent
    msg: Message
    //this will change each time the command is called in discord, it will refer to the opts given
    optsString: string
    opts: string
    //this will change each time the command is called in discord, it refers to everything but the opts and command name
    _content: string
    //changes each command, refers to MessageAttachment[]
    attachments: MessageAttachment[]
    
    //used when things like {mention} shouldn't be replaced
    noSubstitution: boolean

    metaData: {[val: string]: any} = {}
    aliases: Alias[]
    category: Category
    whiteList: UserIdString[] = []
    blackList: UserIdString[] = []
    
    help: string

    static PREFIX: string
    
    onCall: (msg: Message, opts: Opts) => MessageOptions | string | Promise<MessageOptions | string | false> | false
    static escape(text){
        if(text[0] == this.PREFIX){
            return `\\${text}`
        }
	return text
    }
    static setPrefix(PREFIX){
        this.PREFIX = PREFIX
    }
    static stripPrefix(text){
        return text.slice(1)
    }
    static getText(text){
        let index = text.indexOf(" ")
        return index == -1 ? "" : text.slice(index)
    }
    static getCommand(text){
        return Command.stripPrefix(text.slice(0, text.indexOf(" ") == -1 ? undefined : text.indexOf(" ")))
    }
    get content() {
        return this._content.trim()
    }
    constructor(onCall, help, opts, noSubstitution){
        //should return an object that can be directly put into msg.channel.send
        this.onCall = onCall;
        this.help = help;
        this.opts = "h" + (opts ?? "")
        this.aliases = []
        this.noSubstitution = noSubstitution ?? false
    }
    addToWhitelist(whiteList){
        for(let i of whiteList){
            this.whiteList.push(i)
        }
        return this
    }
    addToBlacklist(blackList){
        for(let i of blackList){
            this.blackList.push(i)
        }
        return this
    }
    registerAlias(names, commandDict){
        for(let n of names){
            commandDict[n] = new Alias(this)
            this.aliases.push(n)
        }
        return this
    }
    setCategory(category){
        this.category = category
        return this
    }
    getAttr(attribute){
        let m = this.content.match(new RegExp(`(?<!\\\\)${attribute}="(.*?)"`))
        if(m){
            this._content = this._content.replace(m[0], "")
            return m[1]
        }
        return null
    }
    HELP(){
        let str = `${this.help}\n\naliases: `
        for(let a of this.aliases){
            str += a + " "
        }
        return str + "\n"
    }
    setMeta(metaData){
        this.metaData = metaData
        return this
    }
    run(msg: Message){
        if(
            (this.whiteList.length > 0 && this.whiteList.indexOf(String(msg.author.id)) == -1)
            || (this.blackList.length > 0 && this.blackList.indexOf(String(msg.author.id)) >= 0)
        )
            return {content: "you are not allowed to use this"}
        this.msg = msg
        let [opts, optsString] = parseOpts(Command.getText(msg.content), this.opts)
        if(opts['h']){
            return {
                content: this.HELP()
            }
        }
        this.attachments = []
        for(let a of msg.attachments){
            this.attachments.push(a[1])
        }
        this.optsString = optsString
        this._content = Command.getText(this.msg.content).replace(this.optsString, "")
        if(!this.noSubstitution) this._content = expandContent(this.content, msg)
        return this.onCall(msg, opts)
    }
}

class Alias {
    isAlias: boolean;
    category: Category;
    cmd: Command
    constructor(cmd){
        this.isAlias = true
        this.category = cmd.category
        this.cmd = cmd
    }
    run(msg){
        return this.cmd.run(msg)
    }
}

module.exports = {
    Command: Command,
    Alias: Alias
}
