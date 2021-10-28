import { Guild, GuildMember } from "discord.js"
import {Collection} from "@discordjs/collection"
const https = require("https")
const fs = require("fs")

//@ts-ignore
function userMention(userid){
    return `<@!${userid}>`
}

//@ts-ignore
function channelMention(channelId){
    return `<#${channelId}>`
}

function formatp(text, formats){
    for(let format of formats){
        let [fmt, replace] = format
        text = text.replace(new RegExp(fmt, "g"), replace)
    }
    return text
}

function strftime(format, timezone, time){
    let newStr = format
    if(!time) time = new Date()
    time = new Date(time.toLocaleString("en-US", {timeZone: timezone}))
    if(!newStr.trim()) return time.toString()
    return newStr
        .replace(/(?<!%)%S/g, time.getSeconds())
        .replace(/(?<!%)%s/g, Date.now())
        .replace(/(?<!%)%H/g, time.getHours())
        .replace(/(?<!%)%M/g, time.getMinutes())
        .replace(/(?<!%)%m/g, time.getMonth() + 1)
        .replace(/(?<!%)%d/g, time.getDate())
        .replace(/(?<!%)%Y/g, time.getFullYear())
        .replace(/(?<!%)%MS/g, time.getMilliseconds())
        .replace(/(?<!%)%z/g, time.getTimezoneOffset())
        .replace(/%%/g, "%")
}

//@ts-ignore
function expandContent(text, msg: Message, customExpansions, basic){
    basic = basic ?? true
    for(let e in customExpansions){
        text = text.replaceAll(`{${e}}`, customExpansions[e])
    }
    if(basic){
        text = text
            .replaceAll('{mention}', userMention(msg.author.id))
            .replaceAll('{author}', msg.author.username)
            .replaceAll('{channel}', channelMention(msg.channel.id))
            .replaceAll(/(?<!\\)\\n/g, "\n")
            .replaceAll(/(?<!\\)\\t/g, "\t")
    }
    return text
}

export function userFinder(guild: Guild, text: string): Collection<string, GuildMember>{
    text = text.toLowerCase()
    let members = guild.members.cache.filter((val, idx, arr) => {
        return val.id == text.trim() || val.nickname?.toLowerCase().match(text) || val.user.username.toLowerCase().match(text) || userMention(val.id) == text.trim() || val.displayName?.toLowerCase() == text ? true : false
    })
    return members
}

export function randint(max: number, min: number){
    return Math.floor(Math.random() * (max - min)) + min
}

module.exports = {
    userMention: userMention,
    channelMention: channelMention,
    expandContent: expandContent,
    strftime: strftime,
    userFinder: userFinder,
    formatp: formatp,
    randint: randint
}