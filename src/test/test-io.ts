/**
 * @file ParseCard v2.0 I/O 测试
 * @description 测试 Node.js 文件读写功能
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, unlinkSync, mkdirSync } from 'node:fs';

import {
    loadCharacterCard,
    loadCharacterCardAsync,
    saveCharacterCard,
    saveCharacterCardAsync,
    loadWorldBook,
    loadWorldBookAsync,
    loadRegexScript,
    loadRegexScriptAsync,
    loadOpenAIPreset,
    loadOpenAIPresetAsync,
    saveOpenAIPreset,
    saveOpenAIPresetAsync,
} from '../io.js';
import { OpenAIPreset } from '../index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '..', '..', 'SillyTavern数据');
const tmpDir = resolve(__dirname, '..', '..', 'tmp-test');

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

// 确保临时目录存在
if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
}

// ============================================================
//  测试1：同步加载角色卡
// ============================================================
section('IO 测试1：同步加载角色卡');

const card1 = loadCharacterCard(resolve(dataDir, '测试角色.json'));
assert(card1.name === '测试角色','loadCharacterCard JSON 同步加载正确');

const card2 = loadCharacterCard(resolve(dataDir, '测试角色 (含世界书) .json'));
assert(card2.name === '测试角色', '含世界书角色卡加载正确');
assert(card2.hasWorldBook, '含世界书角色卡世界书存在');

const card3 = loadCharacterCard(resolve(dataDir, '测试角色 (含正则).json'));
assert(card3.hasRegexScripts, '含正则角色卡加载正确');

// ============================================================
//  测试2：同步保存角色卡
// ============================================================
section('IO 测试2：同步保存角色卡');

// 保存为JSON
const jsonPath = resolve(tmpDir, 'test-save.json');
saveCharacterCard(card1, jsonPath);
assert(existsSync(jsonPath), '保存JSON 文件成功');

// 读回验证
const reloaded1 = loadCharacterCard(jsonPath);
assert(reloaded1.name === '测试角色', 'JSON 保存后读回正确');

// 保存为 PNG
const pngPath = resolve(tmpDir, 'test-save.png');
saveCharacterCard(card2, pngPath);
assert(existsSync(pngPath), '保存PNG 文件成功');

// 读回验证
const reloaded2 = loadCharacterCard(pngPath);
assert(reloaded2.name === '测试角色', 'PNG 保存后读回正确');
assert(reloaded2.hasWorldBook, 'PNG 保存后世界书仍在');

// ============================================================
//  测试3：异步加载角色卡
// ============================================================
section('IO 测试3：异步加载角色卡');

const card4 = await loadCharacterCardAsync(resolve(dataDir, '测试角色.json'));
assert(card4.name === '测试角色', 'loadCharacterCardAsync 异步加载正确');

// ============================================================
//  测试4：异步保存角色卡
// ============================================================
section('IO 测试4：异步保存角色卡');

const asyncJsonPath = resolve(tmpDir, 'test-save-async.json');
await saveCharacterCardAsync(card1, asyncJsonPath);
assert(existsSync(asyncJsonPath), '异步保存JSON 成功');

const asyncPngPath = resolve(tmpDir, 'test-save-async.png');
await saveCharacterCardAsync(card2, asyncPngPath);
assert(existsSync(asyncPngPath), '异步保存PNG 成功');

const reloaded3 = await loadCharacterCardAsync(asyncPngPath);
assert(reloaded3.name === '测试角色', '异步保存PNG后读回正确');

// ============================================================
//  测试5：加载世界书
// ============================================================
section('IO 测试5：加载世界书');

const wb1 = loadWorldBook(resolve(dataDir, '测试世界书.json'));
assert(wb1.length === 10, '同步加载世界书正确');

const wb2 = await loadWorldBookAsync(resolve(dataDir, '测试世界书.json'));
assert(wb2.length === 10, '异步加载世界书正确');

// ============================================================
//  测试6：加载正则脚本
// ============================================================
section('IO 测试6：加载正则脚本');

const rs1 = loadRegexScript(resolve(dataDir, 'regex-测试正则.json'));
assert(rs1.scriptName === '测试正则', '同步加载正则脚本正确');

const rs2 = await loadRegexScriptAsync(resolve(dataDir, 'regex-测试正则.json'));
assert(rs2.scriptName === '测试正则', '异步加载正则脚本正确');

// ============================================================
//  测试7：OpenAI 预设读写
// ============================================================
section('IO 测试7：OpenAI 预设读写');

const preset = OpenAIPreset.fromJSON({
    temperature: 1,
    prompts: [
        { identifier: 'main', name: 'Main Prompt', content: 'main' },
    ],
    prompt_order: [
        { character_id: 100001, order: [{ identifier: 'main', enabled: true }] },
    ],
});
preset.addPrompt({ identifier: 'extra', name: '额外条目', content: 'extra' }, { enabled: false });

const presetPath = resolve(tmpDir, 'openai-preset.json');
saveOpenAIPreset(preset, presetPath);
assert(existsSync(presetPath), '保存 OpenAI 预设成功');

const reloadedPreset = loadOpenAIPreset(presetPath);
assert(reloadedPreset.getPrompt('extra')?.name === '额外条目', '同步加载 OpenAI 预设正确');
assert(reloadedPreset.isPromptEnabled('extra') === false, 'OpenAI 预设启用状态读回正确');

const asyncPresetPath = resolve(tmpDir, 'openai-preset-async.json');
await saveOpenAIPresetAsync(preset, asyncPresetPath);
const asyncReloadedPreset = await loadOpenAIPresetAsync(asyncPresetPath);
assert(asyncReloadedPreset.prompts.length === 2, '异步保存/加载 OpenAI 预设正确');

// ============================================================
//  测试8：完整流程（加载→修改→保存→读回）
// ============================================================
section('IO 测试8：完整流程（加载→修改→保存→读回）');

const fullCard = loadCharacterCard(resolve(dataDir, '测试角色.json'));
fullCard.name = '修改后的角色';
fullCard.description = '修改后的描述';
fullCard.tags = ['新标签1', '新标签2', '新标签3'];

// 绑定世界书和正则
const fullWB = loadWorldBook(resolve(dataDir, '测试世界书.json'));
fullCard.bindWorldBook(fullWB);

const fullRS = loadRegexScript(resolve(dataDir, 'regex-测试正则.json'));
fullCard.addRegexScript(fullRS);

// 保存为 PNG
const fullPngPath = resolve(tmpDir, 'full-test.png');
saveCharacterCard(fullCard, fullPngPath);

// 读回验证
const fullReloaded = loadCharacterCard(fullPngPath);
assert(fullReloaded.name === '修改后的角色', '完整流程：name 正确');
assert(fullReloaded.description === '修改后的描述', '完整流程：description 正确');
assert(fullReloaded.tags.length === 3, '完整流程：tags 正确');
assert(fullReloaded.hasWorldBook, '完整流程：世界书存在');
assert(fullReloaded.characterBook!.length === 10, '完整流程：世界书条目数正确');
assert(fullReloaded.hasRegexScripts, '完整流程：正则脚本存在');
assert(fullReloaded.regexScripts[0].scriptName === '测试正则', '完整流程：正则脚本内容正确');

// 保存为 JSON 再验证
const fullJsonPath = resolve(tmpDir, 'full-test.json');
saveCharacterCard(fullCard, fullJsonPath);
const fullJsonReloaded = loadCharacterCard(fullJsonPath);
assert(fullJsonReloaded.name === '修改后的角色', '完整流程JSON：name 正确');
assert(fullJsonReloaded.hasWorldBook, '完整流程JSON：世界书存在');
assert(fullJsonReloaded.hasRegexScripts, '完整流程JSON：正则脚本存在');

// ============================================================
//  清理临时文件
// ============================================================
const tmpFiles = [
    jsonPath, pngPath, asyncJsonPath, asyncPngPath,
    presetPath, asyncPresetPath, fullPngPath, fullJsonPath,
];
for (const f of tmpFiles) {
    if (existsSync(f)) unlinkSync(f);
}
if (existsSync(tmpDir)){
    try {
        const { rmdirSync } = await import('node:fs');
        rmdirSync(tmpDir);
    } catch { /* ignore */ }
}

// ============================================================
//  测试结果汇总
// ============================================================
section('IO 测试结果汇总');
console.log(`\n  总计: ${passed + failed}`);
console.log(`  通过: ${passed} ✅`);
console.log(`  失败: ${failed} ❌`);
console.log();

if (failed > 0) {
    process.exit(1);
}
