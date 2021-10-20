const {MessageButton} = require("discord.js")
function createButton(id, label, style){
    style = style || "PRIMARY"
    return new MessageButton()
        .setCustomId(id)
        .setLabel(label)
        .setStyle(style)
}

module.exports = {
    createButton: createButton
}