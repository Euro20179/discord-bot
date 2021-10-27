import { Item } from "./items";
import {items} from "./items";
import { randint } from "./util";

const fs = require('fs');

export class UserInfo{
    money: number
    id: string
    lastTalked: number
    lastTaxed: number
    lastDonated: number
    taxRate: number
    vars: {}
    items: {}
    itemCounts: {}
    get json(){
        return {
            money: this.money, 
            id: this.id, 
            lastTalked: this.lastTalked,
            lastTaxed: this.lastTaxed,
            lastDonated: this.lastDonated,
            taxRate: this.taxRate,
            vars: this.vars,
            items: this.items,
            itemCounts: this.itemCounts
        }
    }
    setVar(varName, varValue){
        this.vars[varName] = varValue
    }
    setMoney(newMoney){
        this.money = newMoney
    }
    constructor({id, money}){
        this.money = money
        this.id = id
        this.lastTalked = 0
        this.lastTaxed = 0
        this.lastDonated = 0
        this.taxRate = .01
        this.vars = {}
        this.items = {}
        this.itemCounts = {}
    }
    static fromJson({id, money, lastTalked, lastTaxed, taxRate, lastDonated, vars, items, itemCounts}) {
        let u = new UserInfo({id: id, money: money}) 
        u.lastTalked = lastTalked || 0
        u.lastTaxed = lastTaxed || 0
        u.lastDonated = lastDonated || 0
        u.taxRate = taxRate || 0.01
        u.vars = vars || {}
        u.items = items || {}
        u.itemCounts = itemCounts || {}
        return u
    }
    save(path){
        fs.writeFile(path, JSON.stringify(this.json), (err) => true)
    }
    talk(){
        if(Date.now() - this.lastTalked > 60 * 1000){
            this.lastTalked = Date.now()
            if(!this.money) this.money = 100
            else this.money *= 1.01
        }
    }
    buy(item: string){
        this.items[item] = items[item]
        this.money -= this.items[item].cost
        if(!this.itemCounts[item]) this.itemCounts[item] = items[item].count ?? 1
        else this.itemCounts[item] += items[item].count ?? 1
    }
    useItem(item: string){
        if(this.itemCounts[item] == 1){
            delete this.items[item]
            delete this.itemCounts[item]
        } else this.itemCounts[item]--
    }
    timeSinceTax(){
        return (Date.now() - this.lastTaxed) / (60 * 60 * 1000)
    }
    timeSinceDonate(){
        return (Date.now() - this.lastDonated) / (60 * 60 * 1000)
    }
    tax(){
        let newMoney = this.money * (1-this.taxRate)
        this.taxRate = .01
        let rv = this.money - newMoney
        this.money = newMoney
        return rv
    }
}