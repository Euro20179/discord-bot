# 1.5.5.1

## Fixes
* bots *really* can't donate

---

# 1.5.5

## Additions
* escape {author} etc, will be unescaped in future

---

# 1.5.4

## Fixes
* weird bug parsing arg=value

---

# 1.5.3

## Additions
* nicer [profile
* [shop as alias to [allitems

## Changes
* Improve var=value in commands (no longer needs quotes if there is no space)

---

# 1.5.2

## Fixes
* 2 [item commands by same user crashes bot
* 2 [allitems commands by same user crashes bot

---

# 1.5.0

## Additions
* items
* [items
* [additem
* [rmitem
* [buy
* [item
* [allitems 

---

# 1.4.1

## Additions
* -f to profile, sends your json file

## Changes
* leaderboard now just sends seperate embeds

---

# 1.4.0.1

## Fixes
* capital opts

---

# 1.4.0

## Additions
* do multiple commands like this:
```bluc
[cmd1
;
[cmd2
```

* [calc

## Changes
* var is persistent (doesn't reset when bot restarts)

## Removed
* global scope vars

---

# 1.3.11.1

## Fixes
* prefix cant be set to nothing
* donate

---

# 1.3.11

## Additions
* dm users who want to be dmd when online

---

# 1.3.10.2

## Fixes
* warning when donating NaN

# 1.3.10.1

## Changes
* donating decreases taxrate by amount donated + .7%

---

# 1.3.10

## Changes
* donateing reduces your tax rate by half the percent you donated instead of a flat 1%

---

# 1.3.9

## Additions
* [prefix
* [donate
* [leaderboard can now go past top 10
* [money now accepts a user as argument

## Fixes
* mentions and user ids not working for finding a user

---

# 1.3.8

## Fixes
* taxRate is saved

---

# 1.3.7

## Additions
* [snipe is different for each channel

## Fixes

* [profile doesn't break when given invalid user

---

# 1.3.6

## Fixes
* tax

---

# 1.3.4

## Fixes
* invalid user now properly says in [tax

---

# 1.3.3

## Technical
* save user data after a user is taxed

---

# 1.3.2

## Changes
* Better taxing algorithm

---

# 1.3.1

## Fixes
* tax rate increase

---

# 1.3.0_C

## Fixes
* tax for real

---

# 1.3.0_B

## Fixes
* tax

---

# 1.3.0

## Additions
* economy
    * [money
    * [profile
    * [leaderboard
    * [tax
    * you get 1% added to your total money each minute you talk
    * you can tax someone once per day (the tax rate is 1%)

---

# 1.2.2

## Additions
* unknown
* [listspam


# 1.2.1

## Additions
* {content}, {mention}, {author}, {channel} in a8

---

# 1.2.0

## Additions
* [embed -d
* [embed -j
* embed now accepts json
* commands work on edit

* 8ball
* 8br
* 8brdel
* 8bf

## Fixes
* help

---

# 1.1.0.2

## Fixes
* When message is too long bot won't crash

---

# 1.1.0.1

## Fixes
* [addooc

---

# 1.1.0

## Features
* [echo reply="msgid"
* [embed

## Changes
* commands that could end in a new line won't

---

# 1.0.4

## Features
* [userid -r

## Fixes
* [help

---

# 1.0.3

## Features
* [oocfile
* [echo now allows for {mention} etc...

## Fixes
* version
* [snipe won't repeat command if the deleted message was a command

## Technical
* convert to typescript

---

# 1.0.2

## Features
* [addooc now accepts files

## Fixes
* [changes

---

# 1.0.1

## Fixes
* [snipe doesn't say undefined when deleted message isn't a command

---

# 1.0.0

## Commands
* echo
* button
* help
* reactiontime
* timeguesser
* reverse
* progressbar
* spam
* stop
* ping
* length
* tr
* choose
* date
* version
* var
* unset
* vars
* userid
* userinfo
* roll
* changes
* ooc
* rmooc
* addooc
* time
* cmdmeta
* code
* snipe

## Syntax
* use [var varname varvalue to define a variable
* use $varname in a command to then use the variable
    * put a \\ before $ to disable this
* use \$(command) to do a command and replace \$() with the text
    * put a \\ before $() to disable this

---
