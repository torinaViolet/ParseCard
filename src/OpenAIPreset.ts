/**
 * @file OpenAI / Chat Completion 预设
 * @description SillyTavern OpenAI preset 的 Prompt Manager 条目增删改查
 */

import type {
    AddPromptOptions,
    ChatCompletionPrompt,
    OpenAIPresetData,
    PromptListItem,
    PromptListOptions,
    PromptOrderEntry,
    PromptOrderGroup,
} from './types.js';
import { asString, deepClone, generateUUID } from './utils.js';

export const DEFAULT_PROMPT_ORDER_CHARACTER_ID = 100001;

export const DEFAULT_OPENAI_PROMPTS: ChatCompletionPrompt[] = [
    {
        identifier: 'main',
        name: 'Main Prompt',
        system_prompt: true,
        role: 'system',
        content: 'Write {{char}}\'s next reply in a fictional chat between {{char}} and {{user}}.',
        injection_position: 0,
        injection_depth: 4,
        injection_order: 100,
        injection_trigger: [],
        forbid_overrides: false,
    },
    {
        identifier: 'nsfw',
        name: 'Auxiliary Prompt',
        system_prompt: true,
        role: 'system',
        content: '',
        injection_position: 0,
        injection_depth: 4,
        injection_order: 100,
        injection_trigger: [],
        forbid_overrides: false,
    },
    {
        identifier: 'dialogueExamples',
        name: 'Chat Examples',
        system_prompt: true,
        marker: true,
    },
    {
        identifier: 'jailbreak',
        name: 'Post-History Instructions',
        system_prompt: true,
        role: 'system',
        content: '',
        injection_position: 0,
        injection_depth: 4,
        injection_order: 100,
        injection_trigger: [],
        forbid_overrides: false,
    },
    {
        identifier: 'chatHistory',
        name: 'Chat History',
        system_prompt: true,
        marker: true,
    },
    {
        identifier: 'worldInfoAfter',
        name: 'World Info (after)',
        system_prompt: true,
        marker: true,
    },
    {
        identifier: 'worldInfoBefore',
        name: 'World Info (before)',
        system_prompt: true,
        marker: true,
    },
    {
        identifier: 'enhanceDefinitions',
        name: 'Enhance Definitions',
        system_prompt: true,
        marker: false,
        role: 'system',
        content: 'If you have more knowledge of {{char}}, add to the character\'s lore and personality to enhance them but keep the Character Sheet\'s definitions absolute.',
    },
    {
        identifier: 'charDescription',
        name: 'Char Description',
        system_prompt: true,
        marker: true,
    },
    {
        identifier: 'charPersonality',
        name: 'Char Personality',
        system_prompt: true,
        marker: true,
    },
    {
        identifier: 'scenario',
        name: 'Scenario',
        system_prompt: true,
        marker: true,
    },
    {
        identifier: 'personaDescription',
        name: 'Persona Description',
        system_prompt: true,
        marker: true,
    },
];

export const DEFAULT_OPENAI_PROMPT_ORDER: PromptOrderEntry[] = [
    { identifier: 'main', enabled: true },
    { identifier: 'worldInfoBefore', enabled: true },
    { identifier: 'personaDescription', enabled: true },
    { identifier: 'charDescription', enabled: true },
    { identifier: 'charPersonality', enabled: true },
    { identifier: 'scenario', enabled: true },
    { identifier: 'enhanceDefinitions', enabled: false },
    { identifier: 'nsfw', enabled: true },
    { identifier: 'worldInfoAfter', enabled: true },
    { identifier: 'dialogueExamples', enabled: true },
    { identifier: 'chatHistory', enabled: true },
    { identifier: 'jailbreak', enabled: true },
];

const DEFAULT_OPENAI_PRESET_SETTINGS: OpenAIPresetData = {
    temperature: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    top_p: 1,
    top_k: 0,
    top_a: 0,
    min_p: 0,
    repetition_penalty: 1,
    openai_max_context: 8192,
    openai_max_tokens: 300,
    send_if_empty: '',
    impersonation_prompt: '[Write your next reply from the point of view of {{user}}, using the chat history so far as a guideline for the writing style of {{user}}. Don\'t write as {{char}} or system. Don\'t describe actions of {{char}}.]',
    new_chat_prompt: '[Start a new Chat]',
    new_group_chat_prompt: '[Start a new group chat. Group members: {{group}}]',
    new_example_chat_prompt: '[Example Chat]',
    continue_nudge_prompt: '[Continue your last message without repeating its original content.]',
    group_nudge_prompt: '[Write the next reply only as {{char}}.]',
    bias_preset_selected: 'Default (none)',
    max_context_unlocked: false,
    wi_format: '{0}',
    scenario_format: '{{scenario}}',
    personality_format: '{{personality}}',
    assistant_prefill: '',
    assistant_impersonation: '',
    squash_system_messages: false,
    stream_openai: true,
    seed: -1,
    n: 1,
    extensions: {},
};

/**
 * OpenAI / Chat Completion 预设类
 *
 * 设计目标：
 * - 顶层 OpenAI preset 字段无损保留
 * - 对 `prompts` 提供条目 CRUD
 * - 对 `prompt_order` 提供排序和启用状态管理
 */
export class OpenAIPreset {
    private _data: OpenAIPresetData;

    constructor(data: OpenAIPresetData = {}) {
        this._data = deepClone(data);
        this._data.prompts = Array.isArray(this._data.prompts)
            ? this._data.prompts.map(prompt => normalizePrompt(prompt))
            : [];
        this._data.prompt_order = Array.isArray(this._data.prompt_order)
            ? this._data.prompt_order
                .map(group => normalizeOrderGroup(group))
                .filter((group): group is PromptOrderGroup => group !== null)
            : [];
    }

    /** 从 OpenAI preset JSON 解析 */
    static fromJSON(raw: unknown): OpenAIPreset {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            return new OpenAIPreset();
        }
        return new OpenAIPreset(raw as OpenAIPresetData);
    }

    /** 创建 SillyTavern 可用的默认 OpenAI / Chat Completion 预设 */
    static create(overrides: OpenAIPresetData = {}): OpenAIPreset {
        const hasCustomPrompts = Array.isArray(overrides.prompts);
        const hasCustomPromptOrder = Array.isArray(overrides.prompt_order);
        const base = deepClone(DEFAULT_OPENAI_PRESET_SETTINGS);
        return new OpenAIPreset({
            ...base,
            ...deepClone(overrides),
            prompts: hasCustomPrompts
                ? deepClone(overrides.prompts ?? [])
                : deepClone(DEFAULT_OPENAI_PROMPTS),
            prompt_order: hasCustomPromptOrder
                ? deepClone(overrides.prompt_order ?? [])
                : [
                    {
                        character_id: DEFAULT_PROMPT_ORDER_CHARACTER_ID,
                        order: deepClone(DEFAULT_OPENAI_PROMPT_ORDER),
                    },
                ],
        });
    }

    /** 预设名称；部分 SillyTavern 文件没有该字段 */
    get name(): string {
        return asString(this._data.name);
    }

    set name(value: string) {
        this._data.name = value;
    }

    /** 常用外层参数：temperature */
    get temperature(): number | undefined {
        return getNumberSetting(this._data.temperature);
    }

    set temperature(value: number | undefined) {
        this.setSetting('temperature', value);
    }

    /** 常用外层参数：top_p */
    get topP(): number | undefined {
        return getNumberSetting(this._data.top_p);
    }

    set topP(value: number | undefined) {
        this.setSetting('top_p', value);
    }

    /** 常用外层参数：openai_max_context */
    get maxContext(): number | undefined {
        return getNumberSetting(this._data.openai_max_context);
    }

    set maxContext(value: number | undefined) {
        this.setSetting('openai_max_context', value);
    }

    /** 常用外层参数：openai_max_tokens */
    get maxTokens(): number | undefined {
        return getNumberSetting(this._data.openai_max_tokens);
    }

    set maxTokens(value: number | undefined) {
        this.setSetting('openai_max_tokens', value);
    }

    /** 常用外层参数：reasoning_effort */
    get reasoningEffort(): string {
        return asString(this._data.reasoning_effort);
    }

    set reasoningEffort(value: string) {
        this.setSetting('reasoning_effort', value);
    }

    /** 常用外层参数：show_thoughts */
    get showThoughts(): boolean | undefined {
        return getBooleanSetting(this._data.show_thoughts);
    }

    set showThoughts(value: boolean | undefined) {
        this.setSetting('show_thoughts', value);
    }

    /** 通用外层参数读取 */
    getSetting<T = unknown>(key: string): T | undefined {
        return this._data[key] as T | undefined;
    }

    /** 通用外层参数写入；传 undefined 会删除该字段 */
    setSetting(key: string, value: unknown): this {
        if (value === undefined) {
            delete this._data[key];
        } else {
            this._data[key] = deepClone(value);
        }
        return this;
    }

    /** Prompt 定义表 */
    get prompts(): ChatCompletionPrompt[] {
        return this._data.prompts ?? [];
    }

    /** Prompt 排序分组 */
    get promptOrder(): PromptOrderGroup[] {
        return this._data.prompt_order ?? [];
    }

    /** 补齐 SillyTavern 默认内置 prompts 和默认排序项，不覆盖已有 prompt 内容 */
    ensureDefaultPrompts(characterId: string | number = this.defaultCharacterId): this {
        for (const defaultPrompt of DEFAULT_OPENAI_PROMPTS) {
            if (!this.hasPrompt(defaultPrompt.identifier)) {
                this.prompts.push(deepClone(defaultPrompt));
            }
        }

        return this.resetDefaultPromptOrder(characterId);
    }

    /** 用 SillyTavern 默认顺序重排内置 prompts，自定义条目追加在后面 */
    resetDefaultPromptOrder(characterId: string | number = this.defaultCharacterId): this {
        const group = this.ensureOrderGroup(characterId);
        const existing = new Map(group.order.map(entry => [entry.identifier, entry]));
        const nextOrder: PromptOrderEntry[] = DEFAULT_OPENAI_PROMPT_ORDER.map(defaultEntry => {
            const current = existing.get(defaultEntry.identifier);
            return current ? deepClone(current) : deepClone(defaultEntry);
        });

        for (const entry of group.order) {
            if (!DEFAULT_OPENAI_PROMPT_ORDER.some(defaultEntry => defaultEntry.identifier === entry.identifier)) {
                nextOrder.push(deepClone(entry));
            }
        }

        group.order = nextOrder;
        return this;
    }

    /** 当前默认操作的 character_id，优先使用 SillyTavern 全局分组 100001 */
    get defaultCharacterId(): string | number {
        const globalGroup = this.promptOrder.find(group =>
            sameCharacterId(group.character_id, DEFAULT_PROMPT_ORDER_CHARACTER_ID)
        );
        return globalGroup?.character_id
            ?? this.promptOrder[0]?.character_id
            ?? DEFAULT_PROMPT_ORDER_CHARACTER_ID;
    }

    /** 获取 prompt */
    getPrompt(identifier: string): ChatCompletionPrompt | null {
        return this.prompts.find(prompt => prompt.identifier === identifier) ?? null;
    }

    /** 是否存在 prompt */
    hasPrompt(identifier: string): boolean {
        return this.getPrompt(identifier) !== null;
    }

    /** 搜索 prompt 名称、identifier 或内容 */
    searchPrompts(query: string): ChatCompletionPrompt[] {
        const keyword = query.trim().toLowerCase();
        if (!keyword) return [...this.prompts];
        return this.prompts.filter(prompt =>
            asString(prompt.identifier).toLowerCase().includes(keyword)
            || asString(prompt.name).toLowerCase().includes(keyword)
            || asString(prompt.content).toLowerCase().includes(keyword)
        );
    }

    /**
     * 按 prompt_order 列出条目。
     * 默认包含未出现在排序分组中的 prompt，并追加在末尾。
     */
    listPromptEntries(options: PromptListOptions = {}): PromptListItem[] {
        const includeUnordered = options.includeUnordered !== false;
        const group = this.findOrderGroup(options.characterId ?? this.defaultCharacterId);
        const promptMap = new Map(this.prompts.map(prompt => [prompt.identifier, prompt]));
        const seen = new Set<string>();
        const items: PromptListItem[] = [];

        if (group) {
            group.order.forEach((orderEntry, index) => {
                const prompt = promptMap.get(orderEntry.identifier);
                if (!prompt) return;
                seen.add(orderEntry.identifier);
                items.push({
                    identifier: orderEntry.identifier,
                    prompt,
                    order: orderEntry,
                    index,
                    enabled: !!orderEntry.enabled,
                    ordered: true,
                });
            });
        }

        if (includeUnordered) {
            for (const prompt of this.prompts) {
                if (seen.has(prompt.identifier)) continue;
                items.push({
                    identifier: prompt.identifier,
                    prompt,
                    index: items.length,
                    enabled: typeof prompt.enabled === 'boolean' ? prompt.enabled : true,
                    ordered: false,
                });
            }
        }

        return items;
    }

    /** 新增 prompt，并默认加入排序分组 */
    addPrompt(prompt: Partial<ChatCompletionPrompt>, options: AddPromptOptions = {}): ChatCompletionPrompt {
        const identifier = asString(prompt.identifier, generateUUID());
        if (!identifier) {
            throw new Error('Prompt identifier 不能为空');
        }
        if (this.hasPrompt(identifier)) {
            throw new Error(`Prompt identifier 已存在: ${identifier}`);
        }

        const promptData = deepClone(prompt);
        const newPrompt: ChatCompletionPrompt = {
            ...promptData,
            identifier,
            name: asString(promptData.name, 'New Prompt'),
        };
        this.prompts.push(newPrompt);

        if (options.includeInOrder !== false) {
            const enabled = options.enabled
                ?? (typeof prompt.enabled === 'boolean' ? prompt.enabled : true);
            this.insertOrderEntry(identifier, enabled, options);
        }

        return newPrompt;
    }

    /** 更新 prompt；如果更新 identifier，会同步 prompt_order 引用 */
    updatePrompt(identifier: string, updates: Partial<ChatCompletionPrompt>): ChatCompletionPrompt | null {
        const prompt = this.getPrompt(identifier);
        if (!prompt) return null;

        const nextIdentifier = updates.identifier === undefined
            ? identifier
            : asString(updates.identifier, identifier);

        if (nextIdentifier !== identifier && this.hasPrompt(nextIdentifier)) {
            throw new Error(`Prompt identifier 已存在: ${nextIdentifier}`);
        }

        Object.assign(prompt, deepClone(updates), { identifier: nextIdentifier });

        if (nextIdentifier !== identifier) {
            for (const group of this.promptOrder) {
                for (const entry of group.order) {
                    if (entry.identifier === identifier) {
                        entry.identifier = nextIdentifier;
                    }
                }
            }
        }

        return prompt;
    }

    /** 删除 prompt，并默认从所有 prompt_order 中移除 */
    removePrompt(identifier: string, removeFromOrder: boolean = true): ChatCompletionPrompt | null {
        const index = this.prompts.findIndex(prompt => prompt.identifier === identifier);
        if (index === -1) return null;

        const [removed] = this.prompts.splice(index, 1);
        if (removeFromOrder) {
            for (const group of this.promptOrder) {
                group.order = group.order.filter(entry => entry.identifier !== identifier);
            }
        }
        return removed;
    }

    /** 复制 prompt，默认生成新 UUID */
    clonePrompt(
        identifier: string,
        overrides: Partial<ChatCompletionPrompt> = {},
        options: AddPromptOptions = {},
    ): ChatCompletionPrompt | null {
        const prompt = this.getPrompt(identifier);
        if (!prompt) return null;

        const nextIdentifier = asString(overrides.identifier, generateUUID());
        const nextName = overrides.name ?? `${prompt.name} copy`;
        return this.addPrompt({
            ...deepClone(prompt),
            ...deepClone(overrides),
            identifier: nextIdentifier,
            name: nextName,
        }, {
            after: identifier,
            enabled: this.isPromptEnabled(identifier, options.characterId),
            ...options,
        });
    }

    /** 查询某分组中的启用状态 */
    isPromptEnabled(identifier: string, characterId?: string | number): boolean {
        const group = this.findOrderGroup(characterId ?? this.defaultCharacterId);
        const entry = group?.order.find(item => item.identifier === identifier);
        if (entry) return !!entry.enabled;

        const prompt = this.getPrompt(identifier);
        return typeof prompt?.enabled === 'boolean' ? prompt.enabled : true;
    }

    /** 设置某分组中的启用状态；如果 order 中没有该 prompt，会自动加入 */
    setPromptEnabled(identifier: string, enabled: boolean, characterId?: string | number): this {
        if (!this.hasPrompt(identifier)) {
            throw new Error(`Prompt 不存在: ${identifier}`);
        }
        const group = this.ensureOrderGroup(characterId ?? this.defaultCharacterId);
        let entry = group.order.find(item => item.identifier === identifier);
        if (!entry) {
            entry = { identifier, enabled };
            group.order.push(entry);
        } else {
            entry.enabled = enabled;
        }
        return this;
    }

    /** 将 prompt 移动到某个排序位置；如果 order 中没有该 prompt，会自动加入 */
    movePrompt(identifier: string, index: number, characterId?: string | number): this {
        if (!this.hasPrompt(identifier)) {
            throw new Error(`Prompt 不存在: ${identifier}`);
        }
        const group = this.ensureOrderGroup(characterId ?? this.defaultCharacterId);
        let currentIndex = group.order.findIndex(entry => entry.identifier === identifier);
        if (currentIndex === -1) {
            group.order.push({ identifier, enabled: this.isPromptEnabled(identifier, group.character_id) });
            currentIndex = group.order.length - 1;
        }

        const [entry] = group.order.splice(currentIndex, 1);
        group.order.splice(clampIndex(index, group.order.length), 0, entry);
        return this;
    }

    /** 移除排序引用，但不删除 prompt 本体 */
    removePromptFromOrder(identifier: string, characterId?: string | number): this {
        const group = this.findOrderGroup(characterId ?? this.defaultCharacterId);
        if (group) {
            group.order = group.order.filter(entry => entry.identifier !== identifier);
        }
        return this;
    }

    /** 确保排序分组存在 */
    ensureOrderGroup(characterId: string | number = this.defaultCharacterId): PromptOrderGroup {
        let group = this.findOrderGroup(characterId);
        if (!group) {
            group = { character_id: characterId, order: [] };
            this.promptOrder.push(group);
        }
        if (!Array.isArray(group.order)) {
            group.order = [];
        }
        return group;
    }

    /** 导出 JSON 数据 */
    toJSON(): OpenAIPresetData {
        return deepClone(this._data);
    }

    /** 导出内部数据 */
    toData(): OpenAIPresetData {
        return this.toJSON();
    }

    /** 克隆预设 */
    clone(): OpenAIPreset {
        return new OpenAIPreset(this.toJSON());
    }

    private findOrderGroup(characterId: string | number): PromptOrderGroup | null {
        return this.promptOrder.find(group => sameCharacterId(group.character_id, characterId)) ?? null;
    }

    private insertOrderEntry(identifier: string, enabled: boolean, options: AddPromptOptions): void {
        const group = this.ensureOrderGroup(options.characterId ?? this.defaultCharacterId);
        group.order = group.order.filter(entry => entry.identifier !== identifier);

        const entry: PromptOrderEntry = { identifier, enabled };
        const index = resolveInsertIndex(group.order, options);
        group.order.splice(index, 0, entry);
    }
}

function sameCharacterId(a: string | number, b: string | number): boolean {
    return String(a) === String(b);
}

function clampIndex(index: number, maxInclusive: number): number {
    if (!Number.isFinite(index)) return maxInclusive;
    return Math.max(0, Math.min(Math.trunc(index), maxInclusive));
}

function resolveInsertIndex(order: PromptOrderEntry[], options: AddPromptOptions): number {
    if (options.before) {
        const index = order.findIndex(entry => entry.identifier === options.before);
        if (index !== -1) return index;
    }
    if (options.after) {
        const index = order.findIndex(entry => entry.identifier === options.after);
        if (index !== -1) return index + 1;
    }
    if (typeof options.index === 'number') {
        return clampIndex(options.index, order.length);
    }
    return order.length;
}

function normalizePrompt(raw: unknown): ChatCompletionPrompt {
    const obj = (raw && typeof raw === 'object' && !Array.isArray(raw))
        ? raw as Partial<ChatCompletionPrompt>
        : {};
    const identifier = asString(obj.identifier) || generateUUID();
    return {
        ...deepClone(obj),
        identifier,
        name: asString(obj.name, identifier),
    };
}

function normalizeOrderEntry(raw: unknown): PromptOrderEntry | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return null;
    }
    const obj = raw as Partial<PromptOrderEntry>;
    const identifier = asString(obj.identifier);
    if (!identifier) return null;
    return {
        ...deepClone(obj),
        identifier,
        enabled: typeof obj.enabled === 'boolean' ? obj.enabled : true,
    };
}

function normalizeOrderGroup(raw: unknown): PromptOrderGroup | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return null;
    }
    const obj = raw as Partial<PromptOrderGroup>;
    return {
        ...deepClone(obj),
        character_id: obj.character_id ?? DEFAULT_PROMPT_ORDER_CHARACTER_ID,
        order: Array.isArray(obj.order)
            ? obj.order
                .map(entry => normalizeOrderEntry(entry))
                .filter((entry): entry is PromptOrderEntry => entry !== null)
            : [],
    };
}

function getNumberSetting(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
}

function getBooleanSetting(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') {
        return value;
    }
    if (value === 'true' || value === 1) {
        return true;
    }
    if (value === 'false' || value === 0) {
        return false;
    }
    return undefined;
}
