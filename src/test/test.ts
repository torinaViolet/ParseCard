/**
 * @file ParseCard v2.0 测试
 * @description 使用 SillyTavern 测试数据验证面向对象 API
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    // 核心类
    CharacterCard,
    WorldBook,
    WorldBookEntry,
    RegexScript,
    //枚举
    CharacterCardSpec,
    WorldBookEntryPosition,
    SelectiveLogic,
    EntryRole,
    RegexPlacement,
    SubstituteRegex,
    TriggerType,
    // 工具
    createTimestamp,
    isValidTimestamp,
    normalizeTimestamp,
    deepClone,
    asStringArray,
    // PNG
    createMinimalPNG,
    hasCharaInPNG,
} from '../index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '..', '..', 'SillyTavern数据');

function loadJSON(filename: string): unknown {
    const filepath = resolve(dataDir, filename);
    return JSON.parse(readFileSync(filepath, 'utf-8'));
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
    if (condition) {
        passed++;
        console.log(`  ✅ ${message}`);
    } else {
        failed++;
        console.error(`  ❌ ${message}`);
    }
}

function section(title: string): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${title}`);
    console.log('='.repeat(60));
}

// ============================================================
//测试1：解析纯角色卡
// ============================================================
section('测试1：解析纯角色卡（fromJSON）');

const rawCard = loadJSON('测试角色.json');
const card = CharacterCard.fromJSON(rawCard);

assert(card.spec === 'chara_card_v3', 'spec应为 chara_card_v3');
assert(card.specVersion === '3.0', 'specVersion 应为 3.0');
assert(card.name === '测试角色', 'name 正确');
assert(card.description === '这个是角色描述字段', 'description 正确');
assert(card.personality === '这个是角色设定摘要，是角色描述的简要', 'personality 正确');
assert(card.scenario === '交互的情景或者背景字段', 'scenario 正确');
assert(card.firstMes === '这个是第一条消息', 'firstMes 正确');
assert(card.mesExample.includes('<START>'), 'mesExample 包含 <START>');
assert(card.creatorNotes.includes('创作者的注释'), 'creatorNotes 正确');
assert(card.systemPrompt.includes('主要提示词'), 'systemPrompt 正确');
assert(card.postHistoryInstructions.includes('后续历史指令'), 'postHistoryInstructions 正确');
assert(Array.isArray(card.tags) && card.tags.length === 2, 'tags 有2个');
assert(card.creator === '这里创作者的名字（元数据）', 'creator 正确');
assert(card.characterVersion === '角色版本', 'characterVersion 正确');
assert(card.alternateGreetings.length === 1, 'alternateGreetings 有1个');
assert(card.talkativeness === '0.5', 'talkativeness 正确');
assert(card.fav === false, 'fav 正确');
assert(card.world === '', 'world 为空');
assert(card.depthPrompt.prompt.includes('角色备注'), 'depthPrompt.prompt 正确');
assert(card.depthPrompt.depth === 4, 'depthPrompt.depth 正确');
assert(card.depthPrompt.role === 'system', 'depthPrompt.role 正确');
assert(!card.hasWorldBook, '无内嵌世界书');
assert(!card.hasRegexScripts, '无正则脚本');

// ============================================================
//  测试2：解析含世界书的角色卡
// ============================================================
section('测试2：解析含世界书的角色卡');

const rawCardWithWB = loadJSON('测试角色 (含世界书) .json');
const cardWithWB = CharacterCard.fromJSON(rawCardWithWB);

assert(cardWithWB.world === '测试世界书', 'world 指向测试世界书');
assert(cardWithWB.hasWorldBook, '存在内嵌世界书');
assert(cardWithWB.characterBook!.name === '测试世界书', '世界书名称正确');
assert(cardWithWB.characterBook!.length === 10, '世界书有10个条目');

const wbEntry0 = cardWithWB.characterBook!.getEntry(0);
assert(wbEntry0 !== null, '找到 uid=0 的条目');
assert(wbEntry0!.keys.length === 1 && wbEntry0!.keys[0] === '主要关键词', 'keys 正确');
assert(wbEntry0!.position === WorldBookEntryPosition.BEFORE_CHAR, 'position 正确 (BEFORE_CHAR)');
assert(wbEntry0!.enabled === true, 'enabled 正确');

// 蓝灯条目（常驻）
const wbEntry1 = cardWithWB.characterBook!.getEntry(1);
assert(wbEntry1!.constant === true, '蓝灯条目 constant=true');
assert(wbEntry1!.position === WorldBookEntryPosition.AFTER_CHAR, '蓝灯条目 position=AFTER_CHAR');

// 深度插入条目
const wbEntry6 = cardWithWB.characterBook!.getEntry(6);
assert(wbEntry6!.position === WorldBookEntryPosition.AT_DEPTH, '深度插入条目 position=AT_DEPTH');
assert(wbEntry6!.depth === 0, '深度插入条目 depth=0');
assert(wbEntry6!.role === EntryRole.SYSTEM, '深度插入条目 role=SYSTEM');

const wbEntry7 = cardWithWB.characterBook!.getEntry(7);
assert(wbEntry7!.role === EntryRole.USER, '用户深度插入 role=USER');
assert(wbEntry7!.depth === 1, '用户深度插入 depth=1');

const wbEntry8 = cardWithWB.characterBook!.getEntry(8);
assert(wbEntry8!.role === EntryRole.ASSISTANT, 'AI深度插入 role=ASSISTANT');
assert(wbEntry8!.depth === 2, 'AI深度插入 depth=2');

const wbEntry9 = cardWithWB.characterBook!.getEntry(9);
assert(wbEntry9!.position === WorldBookEntryPosition.OUTLET, '锚点条目 position=OUTLET');

// ============================================================
//  测试3：解析独立世界书
// ============================================================
section('测试3：解析独立世界书（WorldBook.fromStandaloneJSON）');

const rawWB = loadJSON('测试世界书.json');
const worldBook = WorldBook.fromStandaloneJSON(rawWB);

assert(worldBook.length === 10, '独立世界书有10个条目');

const sEntry0 = worldBook.getEntry(0);
assert(sEntry0!.keys[0] === '主要关键词', 'key → keys转换正确');
assert(sEntry0!.enabled === true, 'disable=false → enabled=true 转换正确');
assert(sEntry0!.insertionOrder === 100, 'order → insertionOrder 转换正确');
assert(sEntry0!.selectiveLogic === SelectiveLogic.AND_ALL, 'selectiveLogic=3 是AND_ALL');
assert(sEntry0!.caseSensitive === true, 'caseSensitive=true');
assert(sEntry0!.matchWholeWords === true, 'matchWholeWords=true');
assert(sEntry0!.useGroupScoring === true, 'useGroupScoring=true');
assert(sEntry0!.triggers.length === 1 && sEntry0!.triggers[0] === 'continue', 'triggers=["continue"]');

const sEntry1 = worldBook.getEntry(1);
assert(sEntry1!.selectiveLogic === SelectiveLogic.AND_ANY, 'AND_ANY = 0');
assert(sEntry1!.caseSensitive === null, 'caseSensitive=null 使用全局');
assert(sEntry1!.triggers[0] === 'normal', 'triggers=["normal"]');

const sEntry2 = worldBook.getEntry(2);
assert(sEntry2!.selectiveLogic === SelectiveLogic.NOT_ALL, 'NOT_ALL = 1');
assert(sEntry2!.caseSensitive === false, 'caseSensitive=false');
assert(sEntry2!.vectorized === true, '向量化条目 vectorized=true');
assert(sEntry2!.triggers[0] === 'impersonate', 'triggers=["impersonate"]');

const sEntry3 = worldBook.getEntry(3);
assert(sEntry3!.selectiveLogic === SelectiveLogic.NOT_ANY, 'NOT_ANY = 2');
assert(sEntry3!.triggers[0] === 'swipe', 'triggers=["swipe"]');

const sEntry4 = worldBook.getEntry(4);
assert(sEntry4!.triggers[0] === 'regenerate', 'triggers=["regenerate"]');

const sEntry5 = worldBook.getEntry(5);
assert(sEntry5!.triggers[0] === 'quiet', 'triggers=["quiet"]');

const sEntry6 = worldBook.getEntry(6);
assert(sEntry6!.characterFilter !== null, 'uid=6 有characterFilter');
assert(sEntry6!.characterFilter!.isExclude === false, 'characterFilter.isExclude=false');

const sEntry7 = worldBook.getEntry(7);
assert(sEntry7!.characterFilter !== null, 'uid=7 有characterFilter');
assert(sEntry0!.characterFilter === null, 'uid=0 无characterFilter');

// ============================================================
//  测试4：自动检测世界书格式
// ============================================================
section('测试4：自动检测世界书格式（WorldBook.fromJSON）');

const autoWB1 = WorldBook.fromJSON(rawWB);
assert(autoWB1.length === 10, '自动检测独立世界书格式');

const rawCharBook = (rawCardWithWB as Record<string, any>).data.character_book;
const autoWB2 = WorldBook.fromJSON(rawCharBook);
assert(autoWB2.length === 10, '自动检测内嵌世界书格式');

// ============================================================
//  测试5：世界书格式互转
// ============================================================
section('测试5：世界书格式互转');

const embeddedWB = worldBook.toEmbeddedJSON();
const embeddedEntries = embeddedWB.entries as any[];
assert(Array.isArray(embeddedEntries), '导出内嵌格式：entries是数组');
assert(embeddedEntries.length === 10, '导出内嵌格式：10个条目');
assert(embeddedEntries[0].keys !== undefined, '导出内嵌格式：使用 keys 字段');
assert(typeof embeddedEntries[0].position === 'string', '导出内嵌格式：position 为字符串');
assert(embeddedEntries[0].extensions !== undefined, '导出内嵌格式：有extensions对象');

const standaloneWB = worldBook.toStandaloneJSON();
const standaloneEntries = standaloneWB.entries as Record<string, any>;
assert(!Array.isArray(standaloneEntries), '导出独立格式：entries 是对象');
assert(standaloneEntries['0'] !== undefined, '导出独立格式：键为字符串数字');
assert(standaloneEntries['0'].key !== undefined, '导出独立格式：使用 key 字段');
assert(standaloneEntries['0'].order === 100, '导出独立格式：使用 order 字段');
assert(standaloneEntries['0'].disable === false, '导出独立格式：使用 disable 字段');

// ============================================================
//  测试6：解析含正则的角色卡
// ============================================================
section('测试6：解析含正则的角色卡');

const rawCardWithRegex = loadJSON('测试角色 (含正则).json');
const cardWithRegex = CharacterCard.fromJSON(rawCardWithRegex);

assert(cardWithRegex.hasRegexScripts, '存在正则脚本');
assert(cardWithRegex.regexScripts.length === 1, '有1个正则脚本');

const embeddedScript = cardWithRegex.regexScripts[0];
assert(embeddedScript.scriptName === '测试正则', '脚本名称正确');
assert(embeddedScript.findRegex === '这里是查找正则表达式', 'findRegex 正确');
assert(embeddedScript.replaceString.includes('{{match}}'), 'replaceString 包含 {{match}}');
assert(embeddedScript.trimStrings.length === 4, 'trimStrings 有4项');
assert(embeddedScript.placement.length === 1 && embeddedScript.placement[0] === 1, 'placement=[1] 用户输入');
assert(embeddedScript.disabled === false, 'disabled=false');
assert(embeddedScript.markdownOnly === true, 'markdownOnly=true');
assert(embeddedScript.promptOnly === false, 'promptOnly=false');
assert(embeddedScript.runOnEdit === true, 'runOnEdit=true');
assert(embeddedScript.substituteRegex === SubstituteRegex.NONE, 'substituteRegex=NONE');
assert(embeddedScript.minDepth === null, 'minDepth=null');
assert(embeddedScript.maxDepth === null, 'maxDepth=null');

// ============================================================
//  测试7：解析独立正则脚本
// ============================================================
section('测试7：解析独立正则脚本（RegexScript.fromJSON）');

const rawRegex1 = loadJSON('regex-测试正则.json');
const script1 = RegexScript.fromJSON(rawRegex1);
assert(script1.scriptName === '测试正则', '脚本名称正确');
assert(script1.placement[0] === RegexPlacement.USER_INPUT, 'placement 用户输入');

const rawRegex2 = loadJSON('regex-测试正则-作用范围【ai输出】，正则表达式查找的宏：不替换.json');
const script2 = RegexScript.fromJSON(rawRegex2);
assert(script2.placement[0] === RegexPlacement.AI_OUTPUT, 'placement AI输出');
assert(script2.substituteRegex === SubstituteRegex.NONE, 'substituteRegex 不替换');

const rawRegex3 = loadJSON('regex-测试正则-作用范围【快捷命令】，正则表达式查找的宏：替换（原始）.json');
const script3 = RegexScript.fromJSON(rawRegex3);
assert(script3.placement[0] === RegexPlacement.SLASH_COMMAND, 'placement 快捷命令');
assert(script3.substituteRegex === SubstituteRegex.RAW, 'substituteRegex 替换原始');

const rawRegex4 = loadJSON('regex-测试正则-作用范围【世界信息】，正则表达式查找的宏：替换（转义）.json');
const script4 = RegexScript.fromJSON(rawRegex4);
assert(script4.placement[0] === RegexPlacement.WORLD_INFO, 'placement 世界信息');
assert(script4.substituteRegex === SubstituteRegex.ESCAPED, 'substituteRegex 替换转义');

const rawRegex5 = loadJSON('regex-测试正则-作用范围【推理】.json');
const script5 = RegexScript.fromJSON(rawRegex5);
assert(script5.placement[0] === RegexPlacement.REASONING, 'placement 推理');

// ============================================================
//  测试8：序列化角色卡（toJSON）
// ============================================================
section('测试8：序列化角色卡（toJSON）');

const serialized = card.toJSON() as Record<string, any>;
assert(serialized.name === '测试角色', '顶层name正确');
assert(serialized.creatorcomment === card.creatorNotes, 'creatorcomment 正确映射');
assert(serialized.spec === 'chara_card_v3', 'spec 正确');
assert(serialized.avatar === (rawCard as Record<string, any>).avatar, '保留原始 avatar');
assert(serialized.create_date === (rawCard as Record<string, any>).create_date, '保留原始 create_date');
assert(serialized.data.name === '测试角色', 'data.name 正确');
assert(isValidTimestamp(serialized.create_date), 'create_date 是合法时间戳');
assert(serialized.data.extensions.depth_prompt.role === 'system', 'depth_prompt.role 正确');
assert(!serialized.data.character_book, '无内嵌世界书不输出 character_book');
assert(!serialized.data.extensions.regex_scripts, '无正则脚本不输出 regex_scripts');

// 含世界书的序列化
const serializedWithWB = cardWithWB.toJSON() as Record<string, any>;
assert(serializedWithWB.data.character_book !== undefined, '含世界书时输出 character_book');
assert(Array.isArray(serializedWithWB.data.character_book.entries), 'character_book.entries 为数组');

// 含正则的序列化
const serializedWithRegex = cardWithRegex.toJSON() as Record<string, any>;
assert(serializedWithRegex.data.extensions.regex_scripts !== undefined, '含正则时输出 regex_scripts');
assert(serializedWithRegex.data.extensions.regex_scripts.length === 1, '正则脚本数量正确');

// ============================================================
//  测试9：绑定/解绑操作（面向对象风格）
// ============================================================
section('测试9：绑定/解绑操作（OOP 风格）');

// 世界书绑定
const testCard = CharacterCard.create({ name: '绑定测试' });
assert(!testCard.hasWorldBook, '新角色卡无世界书');

testCard.bindWorldBook(worldBook);
assert(testCard.hasWorldBook, '绑定世界书成功');
assert(testCard.characterBook!.length === 10, '绑定的世界书有10个条目');

const unboundWB = testCard.unbindWorldBook();
assert(unboundWB !== null, '解绑世界书返回对象');
assert(unboundWB!.length === 10, '解绑得到10个条目');
assert(!testCard.hasWorldBook, '解绑后角色卡无世界书');

// 正则脚本绑定
assert(!testCard.hasRegexScripts, '新角色卡无正则脚本');

testCard.addRegexScript(script1);
assert(testCard.regexScripts.length === 1, '添加1个正则脚本');

testCard.addRegexScript(script2);
assert(testCard.regexScripts.length === 2, '添加第2个正则脚本');

const removed = testCard.removeRegexScript(testCard.regexScripts[0].id);
assert(removed !== null, '移除正则脚本返回对象');
assert(removed!.scriptName === '测试正则', '移除的是正确的脚本');
assert(testCard.regexScripts.length === 1, '移除后剩1个');

const unboundScripts = testCard.unbindRegexScripts();
assert(unboundScripts.length === 1, '解绑得到1个正则脚本');
assert(!testCard.hasRegexScripts, '解绑后无正则脚本');

// 批量绑定
testCard.bindRegexScripts([script1, script2, script3]);
assert(testCard.regexScripts.length === 3, '批量绑定3个正则脚本');

// ============================================================
//  测试10：直接属性赋值
// ============================================================
section('测试10：直接属性赋值（getter/setter）');

const modCard = CharacterCard.create({ name: '原名' });

modCard.name = '新名';
assert(modCard.name === '新名', 'name setter 正确');

modCard.description = '新描述';
assert(modCard.description === '新描述', 'description setter 正确');

modCard.creatorNotes = '新注释';
assert(modCard.creatorNotes === '新注释', 'creatorNotes setter 正确');

modCard.tags = ['标签A', '标签B'];
assert(modCard.tags.length === 2, 'tags setter 正确');

modCard.fav = true;
assert(modCard.fav === true, 'fav setter 正确');

modCard.talkativeness = '0.8';
assert(modCard.talkativeness === '0.8', 'talkativeness setter 正确');

modCard.depthPrompt = { prompt: '新角色备注', depth: 2, role: 'user' };
assert(modCard.depthPrompt.prompt === '新角色备注', 'depthPrompt setter 正确');
assert(modCard.depthPrompt.depth === 2, 'depthPrompt.depth 正确');

// 序列化后检查顶层同步
const modSerialized = modCard.toJSON() as Record<string, any>;
assert(modSerialized.name === '新名', '序列化后顶层name同步');
assert(modSerialized.creatorcomment === '新注释', '序列化后顶层creatorcomment同步');
assert(modSerialized.tags.length === 2, '序列化后顶层tags同步');
assert(modSerialized.fav === true, '序列化后顶层fav同步');
assert(modSerialized.talkativeness === '0.8', '序列化后顶层talkativeness同步');

// ============================================================
//  测试11：WorldBook 查询与操作
// ============================================================
section('测试11：WorldBook 查询与操作');

// 触发类型
const constEntry = worldBook.getEntry(1)!;
assert(constEntry.triggerType === TriggerType.CONSTANT, '蓝灯条目触发类型=CONSTANT');

const vecEntry = worldBook.getEntry(2)!;
assert(vecEntry.triggerType === TriggerType.VECTORIZED, '向量条目触发类型=VECTORIZED');

const kwEntry = worldBook.getEntry(0)!;
assert(kwEntry.triggerType === TriggerType.KEYWORD, '关键词条目触发类型=KEYWORD');

// 按触发类型查询
const constants = worldBook.findConstant();
assert(constants.length >= 1, '找到常驻条目');

const vectorized = worldBook.findVectorized();
assert(vectorized.length >= 1, '找到向量条目');

const depthOnes = worldBook.findDepth();
assert(depthOnes.length >= 3, '找到至少3个深度插入条目');

// 按位置查询
const beforeCharEntries = worldBook.findByPosition(WorldBookEntryPosition.BEFORE_CHAR);
assert(beforeCharEntries.length >= 1, '找到角色定义之前的条目');

// 按条件查询
const found = worldBook.findEntries(e => e.constant);
assert(found.length === constants.length, 'findEntries 按条件查询正确');

// getEntry
assert(worldBook.getEntry(0) !== null, 'getEntry 找到 uid=0');
assert(worldBook.getEntry(999) === null, 'getEntry 找不到返回 null');

// addEntry / removeEntry
const testWB = worldBook.clone();
const origLen = testWB.length;
const newEntry = testWB.addEntry({ comment: '新条目', content: '测试内容' });
assert(testWB.length === origLen + 1, 'addEntry 增加了1个条目');
assert(newEntry.uid === 10, 'addEntry 自动分配 uid=10');
assert(newEntry.comment === '新条目', 'addEntry 使用覆盖值');

const removed2 = testWB.removeEntry(newEntry.uid);
assert(removed2 !== null, 'removeEntry 返回被移除的条目');
assert(testWB.length === origLen, 'removeEntry 移除后数量正确');
assert(testWB.removeEntry(999) === null, 'removeEntry 找不到返回 null');

// reindex
testWB.reindex();
assert(testWB.entries[0].uid === 0, 'reindex 后第一个uid=0');
assert(testWB.entries[testWB.length - 1].uid === testWB.length - 1, 'reindex 后最后uid正确');

// merge
const wb1 = WorldBook.create('A');
wb1.addEntry({ comment: 'A条目' });
const wb2 = WorldBook.create('B');
wb2.addEntry({ comment: 'B条目' });
const merged = wb1.merge(wb2, '合并');
assert(merged.name === '合并', '合并后名称正确');
assert(merged.length === 2, '合并后有2个条目');
assert(merged.entries[0].uid === 0 && merged.entries[1].uid === 1, '合并后uid重编');

// describe
const desc = kwEntry.describe();
assert(desc.includes('关键词'), 'describe 包含关键词信息');

const wbDesc = worldBook.describe();
assert(wbDesc.includes('条目数'), 'WorldBook.describe 包含条目数');

// setTriggerType
const testEntry2 = kwEntry.clone();
testEntry2.triggerType = TriggerType.CONSTANT;
assert(testEntry2.constant === true, 'triggerType setter 设置constant');
assert(testEntry2.vectorized === false, 'triggerType setter 清除vectorized');

// enable / disable
const testEntry3 = WorldBookEntry.create();
testEntry3.disable();
assert(!testEntry3.isEnabled, 'disable() 正确');
testEntry3.enable();
assert(testEntry3.isEnabled, 'enable() 正确');

// ============================================================
//  测试12：RegexScript 便捷方法
// ============================================================
section('测试12：RegexScript 便捷方法');

const testScript = RegexScript.create({ scriptName: '测试', findRegex: 'hello' });
assert(testScript.isEnabled, '默认已启用');

testScript.disable();
assert(!testScript.isEnabled, 'disable() 正确');
assert(testScript.disabled === true, 'disabled属性同步');

testScript.enable();
assert(testScript.isEnabled, 'enable() 正确');

const clonedScript = testScript.clone();
assert(clonedScript.scriptName === '测试', 'clone 保留数据');
assert(clonedScript.id !== testScript.id, 'clone 生成新ID');

// ============================================================
//  测试13：默认值创建
// ============================================================
section('测试13：默认值创建');

const defaultCard = CharacterCard.create();
assert(defaultCard.spec === 'chara_card_v3', '默认 spec');
assert(defaultCard.name === '', '默认 name 为空');
assert(defaultCard.depthPrompt.depth === 4, '默认 depth=4');

const defaultEntry = WorldBookEntry.create();
assert(defaultEntry.enabled === true, '默认 enabled=true');
assert(defaultEntry.position === WorldBookEntryPosition.BEFORE_CHAR, '默认 position=BEFORE_CHAR');
assert(defaultEntry.selectiveLogic === SelectiveLogic.AND_ANY, '默认 selectiveLogic=AND_ANY');
assert(defaultEntry.probability === 100, '默认 probability=100');

const defaultScript = RegexScript.create();
assert(typeof defaultScript.id === 'string' && defaultScript.id.length > 0, '默认 id为UUID');
assert(defaultScript.disabled === false, '默认 disabled=false');
assert(defaultScript.substituteRegex === SubstituteRegex.NONE, '默认 substituteRegex=NONE');

// ============================================================
//  测试14：鲁棒性测试
// ============================================================
section('测试14：鲁棒性测试');

assert(CharacterCard.fromJSON(null).name === '', '解析null角色卡不报错');
assert(CharacterCard.fromJSON(undefined).name === '', '解析undefined角色卡不报错');
assert(CharacterCard.fromJSON({}).name === '', '解析空对象角色卡不报错');

assert(WorldBook.fromJSON(null).length === 0, '解析null世界书不报错');
assert(WorldBook.fromJSON({}).length === 0, '解析空对象世界书不报错');

assert(RegexScript.fromJSON(null).findRegex === '', '解析null正则脚本不报错');
assert(RegexScript.fromJSON({}).findRegex === '', '解析空对象正则脚本不报错');

// 缺失字段
const partialCard = CharacterCard.fromJSON({ data: { name: '部分数据' } });
assert(partialCard.name === '部分数据', '部分数据：name 正确');
assert(partialCard.description === '', '部分数据：缺失字段使用默认值');
assert(partialCard.depthPrompt.depth === 4, '部分数据：嵌套默认值正确');

// 类型错误容错
const typeErrorCard = CharacterCard.fromJSON({
    data: {
        name: 123,
        tags: '不是数组',
        extensions: {
            talkativeness: 0.5,
            depth_prompt: null,
        },
    },
});
assert(typeErrorCard.name === '123', '数字name转字符串');
assert(Array.isArray(typeErrorCard.tags) && typeErrorCard.tags.length === 1 && typeErrorCard.tags[0] === '不是数组', '字符串tags自动转为数组');
assert(typeErrorCard.depthPrompt.depth === 4, 'null的depth_prompt使用默认值');

// ============================================================
//  测试15：逗号分割字符串标签
// ============================================================
section('测试15：逗号分割字符串标签');

assert(asStringArray('标签A,标签B').length === 2, '英文逗号分割');
assert(asStringArray('标签A，标签B').length === 2, '中文逗号分割');
assert(asStringArray('标签A, 标签B, 标签C').length === 3, '多标签+空格');
assert(asStringArray('').length === 0, '空字符串');
assert(asStringArray(null).length === 0, 'null');
assert(asStringArray(['a', 'b']).length === 2, '数组直接返回');
assert(asStringArray(123)[0] === '123', '数字转字符串数组');

// ============================================================
//  测试16：PNG 创建与读写
// ============================================================
section('测试16：PNG 创建与读写');

const minPNG = createMinimalPNG();
assert(minPNG instanceof Uint8Array, 'createMinimalPNG 返回 Uint8Array');
assert(minPNG[0] === 137 && minPNG[1] === 80, 'PNG 签名正确');
assert(!hasCharaInPNG(minPNG), '最小PNG无角色卡数据');

// 写入角色卡到PNG（通过 CharacterCard.toPNG）
const pngWithCard = card.toPNG(minPNG);
assert(hasCharaInPNG(pngWithCard), '写入后有角色卡数据');

// 从 PNG 读取角色卡
const readBack = CharacterCard.fromPNG(pngWithCard);
assert(readBack !== null, '读取到角色卡');
assert(readBack!.name === '测试角色', '读取的name正确');
assert(readBack!.description === '这个是角色描述字段', '读取的description正确');
assert(readBack!.spec === 'chara_card_v3', '读取的spec正确');

// 无底图写入（传null）
const pngFromNull = card.toPNG();
assert(hasCharaInPNG(pngFromNull), 'null底图写入成功');
const readFromNull = CharacterCard.fromPNG(pngFromNull);
assert(readFromNull!.name === '测试角色', 'null底图读回name正确');

// ============================================================
//  测试17：CharacterCard.clone()
// ============================================================
section('测试17：clone深拷贝');

const originalCard = CharacterCard.fromJSON(rawCardWithWB);
const clonedCard = originalCard.clone();

assert(clonedCard.name === originalCard.name, 'clone 名称一致');
assert(clonedCard.hasWorldBook === originalCard.hasWorldBook, 'clone 世界书状态一致');
assert(clonedCard.characterBook!.length === originalCard.characterBook!.length, 'clone 世界书条目数一致');
assert(
    (clonedCard.toJSON() as Record<string, any>).create_date ===
        (originalCard.toJSON() as Record<string, any>).create_date,
    'clone 保留 create_date',
);

// 修改clone 不影响原始
clonedCard.name = '克隆体';
assert(originalCard.name !== '克隆体', '修改clone不影响原始');

// ============================================================
//  测试18：链式调用
// ============================================================
section('测试18：链式调用');

const chainCard = CharacterCard.create({ name: '链式测试' });
chainCard
    .bindWorldBook(worldBook)
    .addRegexScript(script1)
    .addRegexScript(script2);

assert(chainCard.hasWorldBook, '链式调用：世界书绑定成功');
assert(chainCard.regexScripts.length === 2, '链式调用：正则脚本绑定成功');

// ============================================================
//  测试19：时间戳兼容与 round-trip
// ============================================================
section('测试19：时间戳兼容与 round-trip');

const timestampCases: Array<[unknown, string, string]> = [
    ['2026-06-11T00:00:00.000Z', '2026-06-11T00:00:00.000Z', 'ISO 8601'],
    ['2026-06-11 08:00:00+08:00', '2026-06-11T00:00:00.000Z', '可解析日期字符串'],
    [1781136000, '2026-06-11T00:00:00.000Z', '10 位 Unix 秒数字'],
    ['1781136000', '2026-06-11T00:00:00.000Z', '10 位 Unix 秒字符串'],
    ['1781136000Z', '2026-06-11T00:00:00.000Z', '旧版 Unix 秒 Z 格式'],
    [1781136000000, '2026-06-11T00:00:00.000Z', '13 位 Unix 毫秒数字'],
    ['1781136000000', '2026-06-11T00:00:00.000Z', '13 位 Unix 毫秒字符串'],
];

for (const [input, expected, label] of timestampCases) {
    assert(normalizeTimestamp(input) === expected, `${label} 规范化正确`);

    const timestampCard = CharacterCard.fromJSON({
        spec: 'chara_card_v3',
        spec_version: '3.0',
        create_date: input,
        data: { name: `timestamp-${label}` },
    });
    assert(
        (timestampCard.toJSON() as Record<string, any>).create_date === expected,
        `${label} CharacterCard round-trip 正确`,
    );
}

const timestampOverrideCard = CharacterCard.create({ name: 'timestamp-override' });
assert(
    (timestampOverrideCard.toJSON({ create_date: 1781136000 }) as Record<string, any>).create_date ===
        '2026-06-11T00:00:00.000Z',
    'SerializeOptions 支持 Unix 秒数字',
);

const invalidTimestampStart = Date.now();
const invalidTimestamp = normalizeTimestamp('not-a-timestamp');
const invalidTimestampEnd = Date.now();
const invalidTimestampValue = new Date(invalidTimestamp).getTime();
assert(
    invalidTimestampValue >= invalidTimestampStart && invalidTimestampValue <= invalidTimestampEnd,
    '无效时间戳保持回退到当前时间的兼容行为',
);

// ============================================================
//  测试结果汇总
// ============================================================
section('测试结果汇总');
console.log(`\n  总计: ${passed + failed}`);
console.log(`  通过: ${passed}✅`);
console.log(`  失败: ${failed} ❌`);
console.log();

if (failed > 0) {
    process.exit(1);
}
