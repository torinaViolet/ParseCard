/**
 * @file WorldBook 与 WorldBookEntry 类
 * @description 世界书的面向对象封装，支持独立世界书和内嵌世界书的解析、操作与互转
 */

import type { WorldBookData, WorldBookEntryData, CharacterFilter } from './types.js';
import {
    WorldBookEntryPosition,
    EmbeddedWorldBookPosition,
    SelectiveLogic,
    TriggerType,
} from './enums.js';
import type { TriggerTypeValue } from './enums.js';
import {
    createDefaultWorldBookData,
    createDefaultWorldBookEntryData,
    createDefaultCharacterFilter,
} from './defaults.js';
import {
    asString, asNumber, asInteger, asBoolean,
    asStringArray, asNullableBoolean, asNullableNumber,
    asBooleanOrNumber, deepClone,
} from './utils.js';

interface WorldBookMetadata {
    description?: string;
    recursiveScanning?: boolean;
    scanDepth?: number;
    tokenBudget?: number;
    originalData?: unknown;
    extensions?: Record<string, unknown>;
    standaloneExtras?: Record<string, unknown>;
    embeddedExtras?: Record<string, unknown>;
}

const STANDALONE_ENTRY_KEYS = new Set([
    'uid', 'key', 'keysecondary', 'comment', 'content', 'constant', 'vectorized',
    'selective', 'selectiveLogic', 'addMemo', 'order', 'position', 'disable',
    'ignoreBudget', 'excludeRecursion', 'preventRecursion', 'delayUntilRecursion',
    'probability', 'useProbability', 'depth', 'outletName', 'group', 'groupOverride',
    'groupWeight', 'scanDepth', 'caseSensitive', 'matchWholeWords', 'useGroupScoring',
    'automationId', 'role', 'sticky', 'cooldown', 'delay', 'triggers', 'displayIndex',
    'matchPersonaDescription', 'matchCharacterDescription', 'matchCharacterPersonality',
    'matchCharacterDepthPrompt', 'matchScenario', 'matchCreatorNotes', 'characterFilter',
    'extensions',
]);

const EMBEDDED_ENTRY_KEYS = new Set([
    'id', 'keys', 'secondary_keys', 'comment', 'content', 'constant', 'selective',
    'insertion_order', 'enabled', 'position', 'use_regex', 'extensions',
]);

const EMBEDDED_ENTRY_EXTENSION_KEYS = new Set([
    'position', 'exclude_recursion', 'display_index', 'probability', 'useProbability',
    'depth', 'selectiveLogic', 'outlet_name', 'group', 'group_override', 'group_weight',
    'prevent_recursion', 'delay_until_recursion', 'scan_depth', 'match_whole_words',
    'use_group_scoring', 'case_sensitive', 'automation_id', 'role', 'vectorized',
    'sticky', 'cooldown', 'delay', 'match_persona_description',
    'match_character_description', 'match_character_personality',
    'match_character_depth_prompt', 'match_scenario', 'match_creator_notes', 'triggers',
    'ignore_budget',
]);

const STANDALONE_BOOK_KEYS = new Set([
    'entries', 'name', 'description', 'recursiveScanning', 'scanDepth',
    'tokenBudget', 'originalData',
]);

const EMBEDDED_BOOK_KEYS = new Set([
    'entries', 'name', 'description', 'scan_depth', 'token_budget',
    'recursive_scanning', 'extensions',
]);

function hasOwn(obj: object | undefined, key: string): boolean {
    return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function cloneValue<T>(value: T): T {
    return value === undefined ? value : deepClone(value);
}

function cloneRecord(value: Record<string, unknown> | undefined): Record<string, unknown> {
    return value ? deepClone(value) : {};
}

function cloneRecordIfObject(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return undefined;
    }
    return deepClone(value as Record<string, unknown>);
}

function collectExtras(
    source: Record<string, unknown>,
    knownKeys: Set<string>,
): Record<string, unknown> | undefined {
    const extras: Record<string, unknown> = {};
    for (const key of Object.keys(source)) {
        if (knownKeys.has(key)) continue;
        extras[key] = cloneValue(source[key]);
    }
    return Object.keys(extras).length > 0 ? extras : undefined;
}

function setIfDefined(target: Record<string, unknown>, key: string, value: unknown): void {
    if (value !== undefined) {
        target[key] = cloneValue(value);
    }
}

function optionalNumber(value: unknown): number | undefined {
    return asNumber(value) ?? undefined;
}

function parseStandaloneBookMetadata(obj: Record<string, unknown>): WorldBookMetadata {
    return {
        description: hasOwn(obj, 'description') ? asString(obj.description) : undefined,
        recursiveScanning: hasOwn(obj, 'recursiveScanning') ? asBoolean(obj.recursiveScanning) : undefined,
        scanDepth: hasOwn(obj, 'scanDepth') ? optionalNumber(obj.scanDepth) : undefined,
        tokenBudget: hasOwn(obj, 'tokenBudget') ? optionalNumber(obj.tokenBudget) : undefined,
        originalData: hasOwn(obj, 'originalData') ? cloneValue(obj.originalData) : undefined,
        standaloneExtras: collectExtras(obj, STANDALONE_BOOK_KEYS),
    };
}

function parseEmbeddedBookMetadata(obj: Record<string, unknown>): WorldBookMetadata {
    return {
        description: hasOwn(obj, 'description') ? asString(obj.description) : undefined,
        recursiveScanning: hasOwn(obj, 'recursive_scanning') ? asBoolean(obj.recursive_scanning) : undefined,
        scanDepth: hasOwn(obj, 'scan_depth') ? optionalNumber(obj.scan_depth) : undefined,
        tokenBudget: hasOwn(obj, 'token_budget') ? optionalNumber(obj.token_budget) : undefined,
        extensions: cloneRecordIfObject(obj.extensions),
        embeddedExtras: collectExtras(obj, EMBEDDED_BOOK_KEYS),
    };
}

function metadataFromData(data: WorldBookData): WorldBookMetadata {
    return {
        description: data.description,
        recursiveScanning: data.recursiveScanning,
        scanDepth: data.scanDepth,
        tokenBudget: data.tokenBudget,
        originalData: cloneValue(data.originalData),
        extensions: data.extensions ? deepClone(data.extensions) : undefined,
        standaloneExtras: data.standaloneExtras ? deepClone(data.standaloneExtras) : undefined,
        embeddedExtras: data.embeddedExtras ? deepClone(data.embeddedExtras) : undefined,
    };
}

//============================================================
//  WorldBookEntry 类
// ============================================================

/**
 * 世界书条目类
 *
 * @example
 * ```ts
 * const entry = WorldBookEntry.create({ comment: '新条目', content: '内容' });
 * entry.keys = ['关键词1', '关键词2'];
 * entry.triggerType = TriggerType.CONSTANT; // 设为蓝灯
 * ```
 */
export class WorldBookEntry {
    private _data: WorldBookEntryData;

    constructor(data: WorldBookEntryData) {
        this._data = data;
    }

    /** 从统一格式数据创建 */
    static create(overrides: Partial<WorldBookEntryData> = {}): WorldBookEntry {
        return new WorldBookEntry(createDefaultWorldBookEntryData(overrides));
    }

    /** 从独立世界书条目解析 */
    static fromStandaloneJSON(raw: unknown): WorldBookEntry {
        if (!raw || typeof raw !== 'object') {
            return new WorldBookEntry(createDefaultWorldBookEntryData());
        }
        const obj = raw as Record<string, unknown>;

        let characterFilter: CharacterFilter | null = null;
        if (obj.characterFilter && typeof obj.characterFilter === 'object') {
            const cf = obj.characterFilter as Record<string, unknown>;
            characterFilter = createDefaultCharacterFilter({
                isExclude: asBoolean(cf.isExclude),
                names: asStringArray(cf.names),
                tags: asStringArray(cf.tags),
            });
        }

        return new WorldBookEntry(createDefaultWorldBookEntryData({
            uid: asInteger(obj.uid, 0) ?? 0,
            keys: asStringArray(obj.key),
            secondary_keys: asStringArray(obj.keysecondary),
            comment: asString(obj.comment),
            content: asString(obj.content),
            constant: asBoolean(obj.constant),
            selective: asBoolean(obj.selective, true),
            selectiveLogic: asInteger(obj.selectiveLogic, SelectiveLogic.AND_ANY) ?? SelectiveLogic.AND_ANY,
            enabled: !asBoolean(obj.disable),
            insertion_order: asInteger(obj.order, 100) ?? 100,
            position: asInteger(obj.position, WorldBookEntryPosition.BEFORE_CHAR) ?? WorldBookEntryPosition.BEFORE_CHAR,
            use_regex: true,
            depth: asInteger(obj.depth, 4) ?? 4,
            role: asNullableNumber(obj.role),
            vectorized: asBoolean(obj.vectorized),
            probability: asInteger(obj.probability, 100) ?? 100,
            useProbability: asBoolean(obj.useProbability, true),
            excludeRecursion: asBoolean(obj.excludeRecursion),
            preventRecursion: asBoolean(obj.preventRecursion),
            delayUntilRecursion: asBooleanOrNumber(obj.delayUntilRecursion),
            scanDepth: asNullableNumber(obj.scanDepth),
            caseSensitive: asNullableBoolean(obj.caseSensitive),
            matchWholeWords: asNullableBoolean(obj.matchWholeWords),
            useGroupScoring: asNullableBoolean(obj.useGroupScoring),
            automationId: asString(obj.automationId),
            outletName: asString(obj.outletName),
            group: asString(obj.group),
            groupOverride: asBoolean(obj.groupOverride),
            groupWeight: asInteger(obj.groupWeight, 100) ?? 100,
            sticky: asNullableNumber(obj.sticky),
            cooldown: asNullableNumber(obj.cooldown),
            delay: asNullableNumber(obj.delay),
            displayIndex: asInteger(obj.displayIndex, 0) ?? 0,
            addMemo: asBoolean(obj.addMemo),
            triggers: asStringArray(obj.triggers),
            ignoreBudget: asBoolean(obj.ignoreBudget),
            matchPersonaDescription: asBoolean(obj.matchPersonaDescription),
            matchCharacterDescription: asBoolean(obj.matchCharacterDescription),
            matchCharacterPersonality: asBoolean(obj.matchCharacterPersonality),
            matchCharacterDepthPrompt: asBoolean(obj.matchCharacterDepthPrompt),
            matchScenario: asBoolean(obj.matchScenario),
            matchCreatorNotes: asBoolean(obj.matchCreatorNotes),
            characterFilter,
            extensions: cloneRecordIfObject(obj.extensions),
            standaloneExtras: collectExtras(obj, STANDALONE_ENTRY_KEYS),
        }));
    }

    /** 从内嵌世界书条目解析 */
    static fromEmbeddedJSON(raw: unknown): WorldBookEntry {
        if (!raw || typeof raw !== 'object') {
            return new WorldBookEntry(createDefaultWorldBookEntryData());
        }
        const obj = raw as Record<string, unknown>;
        const ext = (obj.extensions && typeof obj.extensions === 'object')
            ? obj.extensions as Record<string, unknown>
            : {};

        let position = asInteger(ext.position, WorldBookEntryPosition.BEFORE_CHAR) ?? WorldBookEntryPosition.BEFORE_CHAR;
        if (ext.position === null || ext.position === undefined) {
            position = obj.position === EmbeddedWorldBookPosition.BEFORE_CHAR
                ? WorldBookEntryPosition.BEFORE_CHAR
                : WorldBookEntryPosition.AFTER_CHAR;
        }

        return new WorldBookEntry(createDefaultWorldBookEntryData({
            uid: asInteger(obj.id, 0) ?? 0,
            keys: asStringArray(obj.keys),
            secondary_keys: asStringArray(obj.secondary_keys),
            comment: asString(obj.comment),
            content: asString(obj.content),
            constant: asBoolean(obj.constant),
            selective: asBoolean(obj.selective, true),
            selectiveLogic: asInteger(ext.selectiveLogic, SelectiveLogic.AND_ANY) ?? SelectiveLogic.AND_ANY,
            enabled: asBoolean(obj.enabled, true),
            insertion_order: asInteger(obj.insertion_order, 100) ?? 100,
            position,
            use_regex: asBoolean(obj.use_regex, true),
            depth: asInteger(ext.depth, 4) ?? 4,
            role: asNullableNumber(ext.role),
            vectorized: asBoolean(ext.vectorized),
            probability: asInteger(ext.probability, 100) ?? 100,
            useProbability: asBoolean(ext.useProbability, true),
            excludeRecursion: asBoolean(ext.exclude_recursion),
            preventRecursion: asBoolean(ext.prevent_recursion),
            delayUntilRecursion: asBooleanOrNumber(ext.delay_until_recursion),
            scanDepth: asNullableNumber(ext.scan_depth),
            caseSensitive: asNullableBoolean(ext.case_sensitive, asNullableBoolean(obj.case_sensitive)),
            matchWholeWords: asNullableBoolean(ext.match_whole_words),
            useGroupScoring: asNullableBoolean(ext.use_group_scoring),
            automationId: asString(ext.automation_id),
            outletName: asString(ext.outlet_name),
            group: asString(ext.group),
            groupOverride: asBoolean(ext.group_override),
            groupWeight: asInteger(ext.group_weight, 100) ?? 100,
            sticky: asNullableNumber(ext.sticky),
            cooldown: asNullableNumber(ext.cooldown),
            delay: asNullableNumber(ext.delay),
            displayIndex: asInteger(ext.display_index, 0) ?? 0,
            addMemo: false,
            triggers: asStringArray(ext.triggers),
            ignoreBudget: asBoolean(ext.ignore_budget),
            matchPersonaDescription: asBoolean(ext.match_persona_description),
            matchCharacterDescription: asBoolean(ext.match_character_description),
            matchCharacterPersonality: asBoolean(ext.match_character_personality),
            matchCharacterDepthPrompt: asBoolean(ext.match_character_depth_prompt),
            matchScenario: asBoolean(ext.match_scenario),
            matchCreatorNotes: asBoolean(ext.match_creator_notes),
            characterFilter: null,
            extensions: collectExtras(ext, EMBEDDED_ENTRY_EXTENSION_KEYS),
            embeddedExtras: collectExtras(obj, EMBEDDED_ENTRY_KEYS),
        }));
    }

    // ============================================================
    //  属性
    // ============================================================

    get uid(): number { return this._data.uid; }
    set uid(value: number) { this._data.uid = value; }

    get keys(): string[] { return this._data.keys; }
    set keys(value: string[]) { this._data.keys = value; }

    get secondaryKeys(): string[] { return this._data.secondary_keys; }
    set secondaryKeys(value: string[]) { this._data.secondary_keys = value; }

    get comment(): string { return this._data.comment; }
    set comment(value: string) { this._data.comment = value; }

    get content(): string { return this._data.content; }
    set content(value: string) { this._data.content = value; }

    get constant(): boolean { return this._data.constant; }
    set constant(value: boolean) { this._data.constant = value; }

    get selective(): boolean { return this._data.selective; }
    set selective(value: boolean) { this._data.selective = value; }

    get selectiveLogic(): number { return this._data.selectiveLogic; }
    set selectiveLogic(value: number) { this._data.selectiveLogic = value; }

    get enabled(): boolean { return this._data.enabled; }
    set enabled(value: boolean) { this._data.enabled = value; }

    get insertionOrder(): number { return this._data.insertion_order; }
    set insertionOrder(value: number) { this._data.insertion_order = value; }

    get position(): number { return this._data.position; }
    set position(value: number) { this._data.position = value; }

    get useRegex(): boolean { return this._data.use_regex; }
    set useRegex(value: boolean) { this._data.use_regex = value; }

    get depth(): number { return this._data.depth; }
    set depth(value: number) { this._data.depth = value; }

    get role(): number | null { return this._data.role; }
    set role(value: number | null) { this._data.role = value; }

    get vectorized(): boolean { return this._data.vectorized; }
    set vectorized(value: boolean) { this._data.vectorized = value; }

    get probability(): number { return this._data.probability; }
    set probability(value: number) { this._data.probability = value; }

    get useProbability(): boolean { return this._data.useProbability; }
    set useProbability(value: boolean) { this._data.useProbability = value; }

    get excludeRecursion(): boolean { return this._data.excludeRecursion; }
    set excludeRecursion(value: boolean) { this._data.excludeRecursion = value; }

    get preventRecursion(): boolean { return this._data.preventRecursion; }
    set preventRecursion(value: boolean) { this._data.preventRecursion = value; }

    get delayUntilRecursion(): boolean | number { return this._data.delayUntilRecursion; }
    set delayUntilRecursion(value: boolean | number) { this._data.delayUntilRecursion = value; }

    get scanDepth(): number | null { return this._data.scanDepth; }
    set scanDepth(value: number | null) { this._data.scanDepth = value; }

    get caseSensitive(): boolean | null { return this._data.caseSensitive; }
    set caseSensitive(value: boolean | null) { this._data.caseSensitive = value; }

    get matchWholeWords(): boolean | null { return this._data.matchWholeWords; }
    set matchWholeWords(value: boolean | null) { this._data.matchWholeWords = value; }

    get useGroupScoring(): boolean | null { return this._data.useGroupScoring; }
    set useGroupScoring(value: boolean | null) { this._data.useGroupScoring = value; }

    get automationId(): string { return this._data.automationId; }
    set automationId(value: string) { this._data.automationId = value; }

    get outletName(): string { return this._data.outletName; }
    set outletName(value: string) { this._data.outletName = value; }

    get group(): string { return this._data.group; }
    set group(value: string) { this._data.group = value; }

    get groupOverride(): boolean { return this._data.groupOverride; }
    set groupOverride(value: boolean) { this._data.groupOverride = value; }

    get groupWeight(): number { return this._data.groupWeight; }
    set groupWeight(value: number) { this._data.groupWeight = value; }

    get sticky(): number | null { return this._data.sticky; }
    set sticky(value: number | null) { this._data.sticky = value; }

    get cooldown(): number | null { return this._data.cooldown; }
    set cooldown(value: number | null) { this._data.cooldown = value; }

    get delay(): number | null { return this._data.delay; }
    set delay(value: number | null) { this._data.delay = value; }

    get displayIndex(): number { return this._data.displayIndex; }
    set displayIndex(value: number) { this._data.displayIndex = value; }

    get addMemo(): boolean { return this._data.addMemo; }
    set addMemo(value: boolean) { this._data.addMemo = value; }

    get triggers(): string[] { return this._data.triggers; }
    set triggers(value: string[]) { this._data.triggers = value; }

    get ignoreBudget(): boolean { return this._data.ignoreBudget; }
    set ignoreBudget(value: boolean) { this._data.ignoreBudget = value; }

    get matchPersonaDescription(): boolean { return this._data.matchPersonaDescription; }
    set matchPersonaDescription(value: boolean) { this._data.matchPersonaDescription = value; }

    get matchCharacterDescription(): boolean { return this._data.matchCharacterDescription; }
    set matchCharacterDescription(value: boolean) { this._data.matchCharacterDescription = value; }

    get matchCharacterPersonality(): boolean { return this._data.matchCharacterPersonality; }
    set matchCharacterPersonality(value: boolean) { this._data.matchCharacterPersonality = value; }

    get matchCharacterDepthPrompt(): boolean { return this._data.matchCharacterDepthPrompt; }
    set matchCharacterDepthPrompt(value: boolean) { this._data.matchCharacterDepthPrompt = value; }

    get matchScenario(): boolean { return this._data.matchScenario; }
    set matchScenario(value: boolean) { this._data.matchScenario = value; }

    get matchCreatorNotes(): boolean { return this._data.matchCreatorNotes; }
    set matchCreatorNotes(value: boolean) { this._data.matchCreatorNotes = value; }

    get characterFilter(): CharacterFilter | null { return this._data.characterFilter; }
    set characterFilter(value: CharacterFilter | null) { this._data.characterFilter = value; }

    // ============================================================
    //  便捷方法
    // ============================================================

    /** 获取触发类型 */
    get triggerType(): TriggerTypeValue {
        if (this._data.constant) return TriggerType.CONSTANT;
        if (this._data.vectorized) return TriggerType.VECTORIZED;
        return TriggerType.KEYWORD;
    }

    /** 设置触发类型（自动管理 constant / vectorized 标志） */
    set triggerType(type: TriggerTypeValue) {
        this._data.constant = (type === TriggerType.CONSTANT);
        this._data.vectorized = (type === TriggerType.VECTORIZED);
    }

    /** 是否已启用 */
    get isEnabled(): boolean { return this._data.enabled; }

    /** 启用条目 */
    enable(): this {
        this._data.enabled = true;
        return this;
    }

    /** 禁用条目 */
    disable(): this {
        this._data.enabled = false;
        return this;
    }

    /** 克隆条目（深拷贝） */
    clone(): WorldBookEntry {
        return new WorldBookEntry(deepClone(this._data));
    }

    /** 获取内部数据的深拷贝 */
    toData(): WorldBookEntryData {
        return deepClone(this._data);
    }

    // ============================================================
    //  序列化 - 独立格式
    // ============================================================

    /** 序列化为独立世界书条目格式 */
    toStandaloneJSON(): Record<string, unknown> {
        const result: Record<string, unknown> = {
            ...cloneRecord(this._data.standaloneExtras),
            uid: this._data.uid,
            key: deepClone(this._data.keys),
            keysecondary: deepClone(this._data.secondary_keys),
            comment: this._data.comment,
            content: this._data.content,
            constant: this._data.constant,
            vectorized: this._data.vectorized,
            selective: this._data.selective,
            selectiveLogic: this._data.selectiveLogic,
            addMemo: this._data.addMemo,
            order: this._data.insertion_order,
            position: this._data.position,
            disable: !this._data.enabled,
            ignoreBudget: this._data.ignoreBudget,
            excludeRecursion: this._data.excludeRecursion,
            preventRecursion: this._data.preventRecursion,
            delayUntilRecursion: this._data.delayUntilRecursion,
            probability: this._data.probability,
            useProbability: this._data.useProbability,
            depth: this._data.depth,
            outletName: this._data.outletName,
            group: this._data.group,
            groupOverride: this._data.groupOverride,
            groupWeight: this._data.groupWeight,
            scanDepth: this._data.scanDepth,
            caseSensitive: this._data.caseSensitive,
            matchWholeWords: this._data.matchWholeWords,
            useGroupScoring: this._data.useGroupScoring,
            automationId: this._data.automationId,
            role: this._data.role,
            sticky: this._data.sticky,
            cooldown: this._data.cooldown,
            delay: this._data.delay,
            triggers: deepClone(this._data.triggers),
            displayIndex: this._data.displayIndex,
            matchPersonaDescription: this._data.matchPersonaDescription,
            matchCharacterDescription: this._data.matchCharacterDescription,
            matchCharacterPersonality: this._data.matchCharacterPersonality,
            matchCharacterDepthPrompt: this._data.matchCharacterDepthPrompt,
            matchScenario: this._data.matchScenario,
            matchCreatorNotes: this._data.matchCreatorNotes,
        };

        if (this._data.characterFilter) {
            result.characterFilter = deepClone(this._data.characterFilter);
        }
        if (this._data.extensions) {
            result.extensions = deepClone(this._data.extensions);
        }

        return result;
    }

    /** 序列化为内嵌世界书条目格式 */
    toEmbeddedJSON(): Record<string, unknown> {
        const positionStr = this._data.position === WorldBookEntryPosition.BEFORE_CHAR
            ? EmbeddedWorldBookPosition.BEFORE_CHAR
            : EmbeddedWorldBookPosition.AFTER_CHAR;

        const extensions: Record<string, unknown> = {
            ...cloneRecord(this._data.extensions),
            position: this._data.position,
            exclude_recursion: this._data.excludeRecursion,
            display_index: this._data.displayIndex,
            probability: this._data.probability,
            useProbability: this._data.useProbability,
            depth: this._data.depth,
            selectiveLogic: this._data.selectiveLogic,
            outlet_name: this._data.outletName,
            group: this._data.group,
            group_override: this._data.groupOverride,
            group_weight: this._data.groupWeight,
            prevent_recursion: this._data.preventRecursion,
            delay_until_recursion: this._data.delayUntilRecursion,
            scan_depth: this._data.scanDepth,
            match_whole_words: this._data.matchWholeWords,
            use_group_scoring: this._data.useGroupScoring,
            case_sensitive: this._data.caseSensitive,
            automation_id: this._data.automationId,
            role: this._data.role,
            vectorized: this._data.vectorized,
            sticky: this._data.sticky,
            cooldown: this._data.cooldown,
            delay: this._data.delay,
            match_persona_description: this._data.matchPersonaDescription,
            match_character_description: this._data.matchCharacterDescription,
            match_character_personality: this._data.matchCharacterPersonality,
            match_character_depth_prompt: this._data.matchCharacterDepthPrompt,
            match_scenario: this._data.matchScenario,
            match_creator_notes: this._data.matchCreatorNotes,
            triggers: deepClone(this._data.triggers),
            ignore_budget: this._data.ignoreBudget,
        };

        const result: Record<string, unknown> = {
            ...cloneRecord(this._data.embeddedExtras),
            id: this._data.uid,
            keys: deepClone(this._data.keys),
            secondary_keys: deepClone(this._data.secondary_keys),
            comment: this._data.comment,
            content: this._data.content,
            constant: this._data.constant,
            selective: this._data.selective,
            insertion_order: this._data.insertion_order,
            enabled: this._data.enabled,
            position: positionStr,
            use_regex: this._data.use_regex,
            extensions,
        };

        if (hasOwn(this._data.embeddedExtras, 'case_sensitive')) {
            result.case_sensitive = this._data.caseSensitive;
        }

        return result;
    }

    // ============================================================
    //  人类可读描述
    // ============================================================

    /** 生成人类可读描述 */
    describe(): string {
        const posNames: Record<number, string> = {
            [WorldBookEntryPosition.BEFORE_CHAR]: '角色定义之前',
            [WorldBookEntryPosition.AFTER_CHAR]: '角色定义之后',
            [WorldBookEntryPosition.BEFORE_AUTHOR_NOTE]: '作者注释之前',
            [WorldBookEntryPosition.AFTER_AUTHOR_NOTE]: '作者注释之后',
            [WorldBookEntryPosition.AT_DEPTH]: '在深度',
            [WorldBookEntryPosition.BEFORE_EXAMPLE_MESSAGES]: '示例消息前',
            [WorldBookEntryPosition.AFTER_EXAMPLE_MESSAGES]: '示例消息后',
            [WorldBookEntryPosition.OUTLET]: '锚点',
        };
        const triggerNames: Record<string, string> = {
            [TriggerType.KEYWORD]: '关键词（绿灯）',
            [TriggerType.CONSTANT]: '常驻（蓝灯）',
            [TriggerType.VECTORIZED]: '向量化',
        };
        const roleNames: Record<number, string> = { 0: '系统', 1: '用户', 2: 'AI' };

        const lines = [
            `[${this._data.uid}] ${this._data.comment || '(无标题)'}`,
            `触发: ${triggerNames[this.triggerType] || this.triggerType}`,
            `  位置: ${posNames[this._data.position] || this._data.position}`,
        ];

        if (this._data.position === WorldBookEntryPosition.AT_DEPTH) {
            lines.push(`  深度: ${this._data.depth}, 角色: ${roleNames[this._data.role ?? 0] || '系统'}`);
        }
        if (this._data.position === WorldBookEntryPosition.OUTLET && this._data.outletName) {
            lines.push(`  锚点名称: ${this._data.outletName}`);
        }
        if (!this._data.enabled) {
            lines.push('⚠ 已禁用');
        }
        if (this._data.keys.length > 0) {
            lines.push(`  关键词: ${this._data.keys.join(', ')}`);
        }

        return lines.join('\n');
    }
}

// ============================================================
//  WorldBook 类
// ============================================================

/**
 * 世界书类
 *
 * @example
 * ```ts
 * // 自动检测格式解析
 * const wb = WorldBook.fromJSON(rawObject);
 *
 * // 条目操作
 * const entry = wb.addEntry({ comment: '新条目' });
 * wb.removeEntry(entry.uid);
 *
 * // 查询
 * const constants = wb.findConstant();
 * const atDepth = wb.findByPosition(WorldBookEntryPosition.AT_DEPTH);
 *
 * // 导出
 * const standalone = wb.toStandaloneJSON();
 * const embedded = wb.toEmbeddedJSON();
 * ```
 */
export class WorldBook {
    private _name: string;
    private _entries: WorldBookEntry[];
    private _metadata: WorldBookMetadata;

    constructor(name: string = '', entries: WorldBookEntry[] = [], metadata: WorldBookMetadata = {}) {
        this._name = name;
        this._entries = entries;
        this._metadata = deepClone(metadata);
    }

    // ============================================================
    //  工厂方法
    // ============================================================

    /** 创建空世界书 */
    static create(name: string = ''): WorldBook {
        return new WorldBook(name);
    }

    /**
     * 自动检测格式并解析
     *通过判断 entries 是Array 还是 Object 来区分独立/内嵌格式
     */
    static fromJSON(raw: unknown): WorldBook {
        if (!raw || typeof raw !== 'object') {
            return new WorldBook();
        }
        const obj = raw as Record<string, unknown>;
        const rawEntries = obj.entries;

        if (Array.isArray(rawEntries)) {
            return WorldBook.fromEmbeddedJSON(raw);
        }
        if (rawEntries && typeof rawEntries === 'object') {
            return WorldBook.fromStandaloneJSON(raw);
        }

        return new WorldBook(asString(obj.name), [], parseStandaloneBookMetadata(obj));
    }

    /** 解析独立世界书格式 */
    static fromStandaloneJSON(raw: unknown): WorldBook {
        if (!raw || typeof raw !== 'object') {
            return new WorldBook();
        }
        const obj = raw as Record<string, unknown>;
        const entries: WorldBookEntry[] = [];
        const rawEntries = obj.entries;

        if (rawEntries && typeof rawEntries === 'object' && !Array.isArray(rawEntries)) {
            const entriesObj = rawEntries as Record<string, unknown>;
            for (const key of Object.keys(entriesObj)) {
                entries.push(WorldBookEntry.fromStandaloneJSON(entriesObj[key]));
            }
        }

        entries.sort((a, b) => a.displayIndex - b.displayIndex);

        return new WorldBook(asString(obj.name), entries, parseStandaloneBookMetadata(obj));
    }

    /** 解析内嵌世界书格式 */
    static fromEmbeddedJSON(raw: unknown): WorldBook {
        if (!raw || typeof raw !== 'object') {
            return new WorldBook();
        }
        const obj = raw as Record<string, unknown>;
        const entries: WorldBookEntry[] = [];
        const rawEntries = obj.entries;

        if (Array.isArray(rawEntries)) {
            for (const rawEntry of rawEntries) {
                entries.push(WorldBookEntry.fromEmbeddedJSON(rawEntry));
            }
        }

        entries.sort((a, b) => a.displayIndex - b.displayIndex);

        return new WorldBook(asString(obj.name), entries, parseEmbeddedBookMetadata(obj));
    }

    /** 从WorldBookData 创建 */
    static fromData(data: WorldBookData): WorldBook {
        const entries = data.entries.map(e => new WorldBookEntry(deepClone(e)));
        return new WorldBook(data.name, entries, metadataFromData(data));
    }

    // ============================================================
    //  属性
    // ============================================================

    get name(): string { return this._name; }
    set name(value: string) { this._name = value; }

    /** 条目列表（只读引用，修改请使用方法） */
    get entries(): WorldBookEntry[] { return this._entries; }

    /** 条目数量 */
    get length(): number { return this._entries.length; }

    // ============================================================
    //  条目操作
    // ============================================================

    /** 获取下一个可用的uid */
    private nextUid(): number {
        if (this._entries.length === 0) return 0;
        return Math.max(...this._entries.map(e => e.uid)) + 1;
    }

    /** 获取下一个可用的 displayIndex */
    private nextDisplayIndex(): number {
        if (this._entries.length === 0) return 0;
        return Math.max(...this._entries.map(e => e.displayIndex)) + 1;
    }

    /** 添加条目（自动分配 uid 和 displayIndex） */
    addEntry(overrides: Partial<WorldBookEntryData> = {}): WorldBookEntry {
        const entry = WorldBookEntry.create({
            uid: this.nextUid(),
            displayIndex: this.nextDisplayIndex(),
            ...overrides,
        });
        this._entries.push(entry);
        return entry;
    }

    /** 移除条目（按 uid） */
    removeEntry(uid: number): WorldBookEntry | null {
        const index = this._entries.findIndex(e => e.uid === uid);
        if (index === -1) return null;
        return this._entries.splice(index, 1)[0];
    }

    /** 获取条目（按 uid） */
    getEntry(uid: number): WorldBookEntry | null {
        return this._entries.find(e => e.uid === uid) ?? null;
    }

    // ============================================================
    //  查询
    // ============================================================

    /** 按任意条件查询 */
    findEntries(predicate: (entry: WorldBookEntry) => boolean): WorldBookEntry[] {
        return this._entries.filter(predicate);
    }

    /** 按触发类型查询 */
    findByTriggerType(type: TriggerTypeValue): WorldBookEntry[] {
        return this._entries.filter(e => e.triggerType === type);
    }

    /** 按插入位置查询 */
    findByPosition(position: number): WorldBookEntry[] {
        return this._entries.filter(e => e.position === position);
    }

    /** 查找常驻条目（蓝灯） */
    findConstant(): WorldBookEntry[] {
        return this._entries.filter(e => e.constant);
    }

    /** 查找向量化条目 */
    findVectorized(): WorldBookEntry[] {
        return this._entries.filter(e => e.vectorized);
    }

    /** 查找深度插入条目 */
    findDepth(): WorldBookEntry[] {
        return this._entries.filter(e => e.position === WorldBookEntryPosition.AT_DEPTH);
    }

    /** 查找已启用的条目 */
    findEnabled(): WorldBookEntry[] {
        return this._entries.filter(e => e.enabled);
    }

    /** 查找已禁用的条目 */
    findDisabled(): WorldBookEntry[] {
        return this._entries.filter(e => !e.enabled);
    }

    // ============================================================
    //  批量操作
    // ============================================================

    /** 重新编排所有条目的uid和 displayIndex */
    reindex(): void {
        this._entries.sort((a, b) => a.displayIndex - b.displayIndex);
        for (let i = 0; i < this._entries.length; i++) {
            this._entries[i].uid = i;
            this._entries[i].displayIndex = i;
        }
    }

    /**
     * 合并另一个世界书
     * 条目会被深拷贝并重新编排 uid
     */
    merge(other: WorldBook, name?: string): WorldBook {
        const merged = new WorldBook(
            name ?? (this._name || other._name || ''),
            [],
            this._metadata,
        );
        const allEntries = [
            ...this._entries.map(e => e.clone()),
            ...other._entries.map(e => e.clone()),
        ];
        for (let i = 0; i < allEntries.length; i++) {
            allEntries[i].uid = i;
            allEntries[i].displayIndex = i;
        }
        merged._entries = allEntries;
        return merged;
    }

    /** 克隆（深拷贝） */
    clone(): WorldBook {
        return new WorldBook(
            this._name,
            this._entries.map(e => e.clone()),
            this._metadata,
        );
    }

    // ============================================================
    //  序列化
    // ============================================================

    /** 导出为独立世界书格式 */
    toStandaloneJSON(): Record<string, unknown> {
        const entries: Record<string, unknown> = {};
        for (const entry of this._entries) {
            entries[String(entry.uid)] = entry.toStandaloneJSON();
        }
        const result: Record<string, unknown> = {
            ...cloneRecord(this._metadata.standaloneExtras),
            entries,
        };

        if (this._name) {
            result.name = this._name;
        }
        setIfDefined(result, 'description', this._metadata.description);
        setIfDefined(result, 'recursiveScanning', this._metadata.recursiveScanning);
        setIfDefined(result, 'scanDepth', this._metadata.scanDepth);
        setIfDefined(result, 'tokenBudget', this._metadata.tokenBudget);
        setIfDefined(result, 'originalData', this._metadata.originalData);

        return result;
    }

    /** 导出为内嵌世界书格式 */
    toEmbeddedJSON(): Record<string, unknown> {
        const result: Record<string, unknown> = {
            ...cloneRecord(this._metadata.embeddedExtras),
            entries: this._entries.map(e => e.toEmbeddedJSON()),
            name: this._name,
            extensions: cloneRecord(this._metadata.extensions),
        };
        setIfDefined(result, 'description', this._metadata.description);
        setIfDefined(result, 'scan_depth', this._metadata.scanDepth);
        setIfDefined(result, 'token_budget', this._metadata.tokenBudget);
        setIfDefined(result, 'recursive_scanning', this._metadata.recursiveScanning);

        return result;
    }

    /** 默认 JSON 序列化（独立格式） */
    toJSON(): Record<string, unknown> {
        return this.toStandaloneJSON();
    }

    /** 导出为 WorldBookData */
    toData(): WorldBookData {
        const data: WorldBookData = {
            name: this._name,
            entries: this._entries.map(e => e.toData()),
        };
        const dataRecord = data as unknown as Record<string, unknown>;
        setIfDefined(dataRecord, 'description', this._metadata.description);
        setIfDefined(dataRecord, 'recursiveScanning', this._metadata.recursiveScanning);
        setIfDefined(dataRecord, 'scanDepth', this._metadata.scanDepth);
        setIfDefined(dataRecord, 'tokenBudget', this._metadata.tokenBudget);
        setIfDefined(dataRecord, 'originalData', this._metadata.originalData);
        if (this._metadata.extensions) {
            data.extensions = deepClone(this._metadata.extensions);
        }
        if (this._metadata.standaloneExtras) {
            data.standaloneExtras = deepClone(this._metadata.standaloneExtras);
        }
        if (this._metadata.embeddedExtras) {
            data.embeddedExtras = deepClone(this._metadata.embeddedExtras);
        }
        return data;
    }

    // ============================================================
    //  人类可读描述
    // ============================================================

    /** 生成世界书的人类可读描述 */
    describe(): string {
        const lines = [
            `世界书: ${this._name || '(未命名)'}  条目数: ${this._entries.length}`,
            '='.repeat(50),
        ];
        for (const entry of this._entries) {
            lines.push(entry.describe());
            lines.push('-'.repeat(50));
        }
        return lines.join('\n');
    }
}
