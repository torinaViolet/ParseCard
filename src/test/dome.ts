import {CharacterCard} from "../index.js"

import {read, readFileSync} from "node:fs";

const cardPng = readFileSync("D:\\角色卡\\角色卡游玩\\第二世界-SUPER1.png")
const card = CharacterCard.fromPNG(cardPng)

const characterBook = card?.characterBook

console.log(characterBook?.findConstant())

