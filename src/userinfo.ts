const fs = require('fs');

export class UserInfo{
    money: number
    id: string
    lastTalked: number
    get json(){
        return {money: this.money, id: this.id, lastTalked: this.lastTalked}
    }
    constructor({id, money}){
        this.money = money
        this.id = id
        this.lastTalked = 0
    }
    static fromJson({id, money, lastTalked}){
        let u = new UserInfo({id: id, money: money}) 
        u.lastTalked = lastTalked || 0
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
}