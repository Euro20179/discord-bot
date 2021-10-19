function userMention(userid){
    return `<@!${userid}>`
}

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

function expandContent(text, msg, customExpansions, basic){
    basic = basic ?? true
    for(let e in customExpansions){
        text = text.replaceAll(`{${e}}`, customExpansions[e])
    }
    if(basic){
        text = text
            .replaceAll('{mention}', userMention(msg.author.id))
            .replaceAll('{author}', msg.author.name)
            .replaceAll('{channel}', channelMention(msg.channel.id))
    }
    return text
}

function userFinder(guild, text){
    text = text.toLowerCase()
    let members = guild.members.cache.filter((val, idx, arr) => {
        return val.id == text || val.nickname?.toLowerCase().match(text) || val.user.username.toLowerCase().match(text) || userMention(val.id) == text || val.displayName?.toLowerCase() == text ? true : false
    })
    return members
}

module.exports = {
    userMention: userMention,
    channelMention: channelMention,
    expandContent: expandContent,
    strftime: strftime,
    userFinder: userFinder,
    formatp: formatp
}