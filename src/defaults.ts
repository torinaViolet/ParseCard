/**
 * @file默认值工厂函数
 * @description 创建角色卡、世界书条目、正则脚本的默认数据结构
 */

import {
    CharacterCardSpec,
    CharacterCardSpecVersion,
    WorldBookEntryPosition,
    SelectiveLogic,
    SubstituteRegex,
} from './enums.js';
import type {DepthPrompt,
    CharacterCardExtensions,
    CharacterCardData,
    CharacterCardRaw,
    CharacterFilter,
    WorldBookEntryData,
    WorldBookData,
    RegexScriptData,
} from './types.js';
import { generateUUID } from './utils.js';

// ============================================================
//  角色卡默认值
// ============================================================

/** 创建默认的 depth_prompt 对象 */
export function createDefaultDepthPrompt(overrides: Partial<DepthPrompt> = {}): DepthPrompt {
    return {
        prompt: '',
        depth: 4,
        role: 'system',
        ...overrides,
    };
}

/** 创建默认的角色卡 extensions 对象 */
export function createDefaultCardExtensions(overrides: Partial<CharacterCardExtensions> = {}): CharacterCardExtensions {
    const { depth_prompt: depthPromptOverrides, ...rest } = overrides;
    return {
        talkativeness: '0.5',
        fav: false,
        world: '',
        depth_prompt: createDefaultDepthPrompt(depthPromptOverrides),
        ...rest,
    };
}

/** 创建默认的角色卡 data 对象 */
export function createDefaultCardData(overrides: Partial<CharacterCardData> = {}): CharacterCardData {
    const { extensions: extOverrides, ...rest } = overrides;
    return {
        name: '',
        description: '',
        personality: '',
        scenario: '',
        first_mes: '',
        mes_example: '',
        creator_notes: '',
        system_prompt: '',
        post_history_instructions: '',
        tags: [],
        creator: '',
        character_version: '',
        alternate_greetings: [],
        extensions: createDefaultCardExtensions(extOverrides),
        ...rest,
    };
}

/** 创建默认的完整角色卡原始数据 */
export function createDefaultCharacterCardRaw(overrides: Partial<CharacterCardRaw> = {}): CharacterCardRaw {
    const { data: dataOverrides, ...rest } = overrides;
    return {
        spec: CharacterCardSpec.V3,
        spec_version: CharacterCardSpecVersion.V3,
        data: createDefaultCardData(dataOverrides),
        ...rest,
    };
}

// ============================================================
//  世界书默认值
// ============================================================

/** 创建默认的角色过滤器 */
export function createDefaultCharacterFilter(overrides: Partial<CharacterFilter> = {}): CharacterFilter {
    return {
        isExclude: false,
        names: [],
        tags: [],
        ...overrides,
    };
}

/** 创建默认的世界书条目（统一格式） */
export function createDefaultWorldBookEntryData(overrides: Partial<WorldBookEntryData> = {}): WorldBookEntryData {
    return {
        uid: 0,
        keys: [],
        secondary_keys: [],
        comment: '',
        content: '',
        constant: false,
        selective: true,
        selectiveLogic: SelectiveLogic.AND_ANY,
        enabled: true,
        insertion_order: 100,
        position: WorldBookEntryPosition.BEFORE_CHAR,
        use_regex: true,
        depth: 4,
        role: null,
        vectorized: false,
        probability: 100,
        useProbability: true,
        excludeRecursion: false,
        preventRecursion: false,
        delayUntilRecursion: false,
        scanDepth: null,
        caseSensitive: null,
        matchWholeWords: null,
        useGroupScoring: null,
        automationId: '',
        outletName: '',
        group: '',
        groupOverride: false,
        groupWeight: 100,
        sticky: null,
        cooldown: null,
        delay: null,
        displayIndex: 0,
        addMemo: false,
        triggers: [],
        ignoreBudget: false,
        matchPersonaDescription: false,
        matchCharacterDescription: false,
        matchCharacterPersonality: false,
        matchCharacterDepthPrompt: false,
        matchScenario: false,
        matchCreatorNotes: false,
        characterFilter: null,
        ...overrides,
    };
}

/** 创建默认的世界书对象 */
export function createDefaultWorldBookData(overrides: Partial<WorldBookData> = {}): WorldBookData {
    return {
        name: '',
        entries: [],
        ...overrides,
    };
}

// ============================================================
//  正则脚本默认值
// ============================================================

/** 创建默认的正则脚本对象 */
export function createDefaultRegexScriptData(overrides: Partial<RegexScriptData> = {}): RegexScriptData {
    return {
        id: generateUUID(),
        scriptName: '',
        findRegex: '',
        replaceString: '',
        trimStrings: [],
        placement: [],
        disabled: false,
        markdownOnly: false,
        promptOnly: false,
        runOnEdit: true,
        substituteRegex: SubstituteRegex.NONE,
        minDepth: null,
        maxDepth: null,
        ...overrides,
    };
}