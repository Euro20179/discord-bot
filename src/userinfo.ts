import { randint } from "./util";

const fs = require('fs');

export class UserInfo{
    money: number
    id: string
    lastTalked: number
    lastTaxed: number
    taxRate: number
    get json(){
        return {
            money: this.money, 
            id: this.id, 
            lastTalked: this.lastTalked,
            lastTaxed: this.lastTaxed,
            taxRate: this.taxRate
        }
    }
    setMoney(newMoney){
        this.money = newMoney
    }
    constructor({id, money}){
        this.money = money
        this.id = id
        this.lastTalked = 0
        this.lastTaxed = 0
        this.taxRate = 1.01
    }
    static fromJson({id, money, lastTalked, lastTaxed}) {
        let u = new UserInfo({id: id, money: money}) 
        u.lastTalked = lastTalked || 0
        u.lastTaxed = lastTaxed || 0
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
    timeSinceTax(){
        return this.lastTaxed ? (Date.now() - this.lastTaxed) / (60 * 60 * 1000) : 0
    }
    tax(){
        let newMoney = this.money / this.taxRate
        this.taxRate = 1.01
        let rv = this.money - newMoney
        this.money = newMoney
        return rv
    }
}