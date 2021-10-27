const fs = require("fs")

type ItemName = string

export interface Item{
    recipes: Array<ItemName[] | null> | null;
    cost: number;
    onPurchaceSay: string;
    img?: string;
    count?: number
    createdBy?: string
}

export let items = JSON.parse(fs.readFileSync("./items.json"))

export function saveItems(items){
    fs.writeFileSync("./items.json", JSON.stringify(items))
}