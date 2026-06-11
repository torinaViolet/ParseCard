/**
 * @file ParseCard主入口
 * @description SillyTavern 角色卡、世界书、正则脚本的解析与序列化工具库v2.0
 *
 * 核心导出（浏览器 / Node.js 通用，无 fs 依赖）：
 * - CharacterCard — 角色卡类
 * - WorldBook / WorldBookEntry — 世界书类
 * - RegexScript — 正则脚本类
 * - 枚举常量、类型定义、工具函数
 *
 * Node.js 文件 I/O 请使用：
 * ```ts
 * import { loadCharacterCard, saveCharacterCard } from 'parsecard/node';
 * ```
 *
 * @module parsecard
 */

// ============================================================
//  核心类
// ============================================================

export { CharacterCard } from './CharacterCard.js';
export { WorldBook, WorldBookEntry } from './WorldBook.js';
export { RegexScript } from './RegexScript.js';

// ============================================================
//  枚举常量
// ============================================================

export {
    CharacterCardSpec,
    CharacterCardSpecVersion,
    WorldBookEntryPosition,
    EmbeddedWorldBookPosition,
    SelectiveLogic,
    EntryRole,
    EntryTrigger,
    RegexPlacement,
    SubstituteRegex,
    DepthPromptRole,
    TriggerType,
} from './enums.js';

export type{
    CharacterCardSpecType,
    CharacterCardSpecVersionType,
    WorldBookEntryPositionType,
    EmbeddedWorldBookPositionType,
    SelectiveLogicType,
    EntryRoleType,
    EntryTriggerType,
    RegexPlacementType,
    SubstituteRegexType,
    DepthPromptRoleType,
    TriggerTypeValue,
} from './enums.js';

// ============================================================
//  类型定义
// ============================================================

export type {
    DepthPrompt,
    CharacterCardExtensions,
    CharacterCardData,
    CharacterCardRaw,
    CharacterFilter,
    WorldBookEntryData,
    WorldBookData,
    RegexScriptData,
    SerializeOptions,
    SaveOptions,
} from './types.js';

// ============================================================
//  默认值工厂（高级用法）
// ============================================================

export {
    createDefaultDepthPrompt,
    createDefaultCardExtensions,
    createDefaultCardData,
    createDefaultCharacterCardRaw,
    createDefaultCharacterFilter,
    createDefaultWorldBookEntryData,
    createDefaultWorldBookData,
    createDefaultRegexScriptData,
} from './defaults.js';

// ============================================================
//  错误类
// ============================================================

export {
    ParseCardError,
    InvalidFormatError,
    PNGError,
    FileIOError,
} from './errors.js';

// ============================================================
//  PNG 底层工具（高级用法）
// ============================================================

export {
    createMinimalPNG,
    readJsonFromPNG,
    writeJsonToPNG,
    removeCharaFromPNG,
    hasCharaInPNG,
} from './png.js';

// ============================================================
//  工具函数
// ============================================================

export {
    createTimestamp,
    isValidTimestamp,
    normalizeTimestamp,
    deepClone,
    generateUUID,
    asString,
    asStringArray,
} from './utils.js';