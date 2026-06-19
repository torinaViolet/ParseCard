/**
 * @file CharacterCard 类
 * @description 角色卡的面向对象封装，支持 V2/V3 格式解析、属性同步、序列化
 */

import type{
    CharacterCardData,
    CharacterCardExtensions,
    CharacterCardRaw,
    DepthPrompt,
    SerializeOptions,
} from './types.js';
import {
    CharacterCardSpec,
    CharacterCardSpecVersion,
} from './enums.js';
import {
    createDefaultCardData,
    createDefaultCardExtensions,
    createDefaultDepthPrompt,
} from './defaults.js';
import {
    asString, asBoolean, asStringArray,
    deepClone, createTimestamp, normalizeTimestamp,
} from './utils.js';
import { readJsonFromPNG, writeJsonToPNG } from './png.js';
import { WorldBook } from './WorldBook.js';
import { RegexScript } from './RegexScript.js';
import { InvalidFormatError } from './errors.js';

interface CharacterCardMetadata {
    avatar?: string;
    createDate?: string;
}

/**
 * 角色卡类
 *
 * 核心设计：
 * - 内部维护 `CharacterCardData` 结构
 * - getter/setter 提供便捷的属性访问
 * - `toJSON()` 时自动生成顶层冗余字段（name, description, creatorcomment 等）
 * - 世界书和正则脚本以对象形式管理，序列化时自动转换
 *
 * @example
 * ```ts
 * // 从 JSON 解析
 * const card = CharacterCard.fromJSON(rawObject);
 *
 * // 直接属性赋值
 * card.name = '新名字';
 * card.description = '新描述';
 *
 * // 世界书操作
 * const wb = WorldBook.fromJSON(rawWorldBook);
 * card.bindWorldBook(wb);
 *
 * // 序列化
 * const json = card.toJSON();
 * const pngData = card.toPNG();
 * ```
 */
export class CharacterCard {
    private _spec: string;
    private _specVersion: string;
    private _data: CharacterCardData;
    private _worldBook: WorldBook | null = null;
    private _regexScripts: RegexScript[] = [];
    private _avatar: string;
    private _createDate: string;

    // ============================================================
    //  构造 & 工厂方法
    // ============================================================

    constructor(
        spec: string,
        specVersion: string,
        data: CharacterCardData,
        metadata: CharacterCardMetadata = {},
    ) {
        this._spec = spec;
        this._specVersion = specVersion;
        this._data = data;
        this._avatar = metadata.avatar ?? 'none';
        this._createDate = metadata.createDate ?? '';

        // 如果 data 中包含内嵌世界书，提取为WorldBook 实例
        if (data.character_book) {
            this._worldBook = WorldBook.fromData(data.character_book);
            // 内部_data 不再持有 character_book，由 _worldBook 管理
            delete this._data.character_book;
        }

        // 如果extensions 中包含正则脚本，提取为 RegexScript 实例
        if (data.extensions?.regex_scripts && Array.isArray(data.extensions.regex_scripts)) {
            this._regexScripts = data.extensions.regex_scripts.map(s => RegexScript.fromJSON(s));
            delete this._data.extensions.regex_scripts;
        }
    }

    /**
     * 从原始 JSON 对象解析
     * 自动兼容 V2 和 V3 格式
     */
    static fromJSON(raw: unknown): CharacterCard {
        if (!raw || typeof raw !== 'object') {
            return CharacterCard.create();
        }

        const obj = raw as Record<string, unknown>;

        // 尝试从 data 字段获取核心数据
        const rawData = (obj.data && typeof obj.data === 'object') ? obj.data : obj;
        const data = parseCardData(rawData as Record<string, unknown>);

        const spec = asString(obj.spec, CharacterCardSpec.V3);
        const specVersion = asString(obj.spec_version, CharacterCardSpecVersion.V3);

        return new CharacterCard(spec, specVersion, data, {
            avatar: asString(obj.avatar, 'none'),
            createDate: obj.create_date == null ? '' : normalizeTimestamp(obj.create_date),
        });
    }

    /**
     * 从 PNG 二进制数据解析
     * @returns 角色卡对象，未找到数据时返回null
     */
    static fromPNG(pngInput: Uint8Array | ArrayBuffer): CharacterCard | null {
        const jsonStr = readJsonFromPNG(
            pngInput instanceof ArrayBuffer ? new Uint8Array(pngInput) : pngInput
        );
        if (!jsonStr) return null;

        try {
            const raw = JSON.parse(jsonStr);
            return CharacterCard.fromJSON(raw);
        } catch (e) {
            throw new InvalidFormatError(`解析 PNG 中的角色卡数据失败: ${(e as Error).message}`);
        }
    }

    /**
     * 创建空白角色卡
     */
    static create(overrides: Partial<CharacterCardData> = {}): CharacterCard {
        const data = createDefaultCardData(overrides);
        return new CharacterCard(
            CharacterCardSpec.V3,
            CharacterCardSpecVersion.V3,
            data,
        );
    }

    // ============================================================
    //  Spec 信息
    // ============================================================

    get spec(): string { return this._spec; }
    set spec(value: string) { this._spec = value; }

    get specVersion(): string { return this._specVersion; }
    set specVersion(value: string) { this._specVersion = value; }

    // ============================================================
    //  基本属性（getter/setter）
    // ============================================================

    /** 角色名*/
    get name(): string { return this._data.name; }
    set name(value: string) { this._data.name = value; }

    /** 角色描述 */
    get description(): string { return this._data.description; }
    set description(value: string) { this._data.description = value; }

    /** 角色设定摘要 */
    get personality(): string { return this._data.personality; }
    set personality(value: string) { this._data.personality = value; }

    /** 交互情景/背景 */
    get scenario(): string { return this._data.scenario; }
    set scenario(value: string) { this._data.scenario = value; }

    /** 第一条消息 */
    get firstMes(): string { return this._data.first_mes; }
    set firstMes(value: string) { this._data.first_mes = value; }

    /** 对话示例 */
    get mesExample(): string { return this._data.mes_example; }
    set mesExample(value: string) { this._data.mes_example = value; }

    /** 创作者注释 */
    get creatorNotes(): string { return this._data.creator_notes; }
    set creatorNotes(value: string) { this._data.creator_notes = value; }

    /** 主要提示词 */
    get systemPrompt(): string { return this._data.system_prompt; }
    set systemPrompt(value: string) { this._data.system_prompt = value; }

    /** 后续历史指令 */
    get postHistoryInstructions(): string { return this._data.post_history_instructions; }
    set postHistoryInstructions(value: string) { this._data.post_history_instructions = value; }

    /** 标签 */
    get tags(): string[] { return this._data.tags; }
    set tags(value: string[]) { this._data.tags = Array.isArray(value) ? [...value] : []; }

    /** 创作者名称 */
    get creator(): string { return this._data.creator; }
    set creator(value: string) { this._data.creator = value; }

    /** 角色版本 */
    get characterVersion(): string { return this._data.character_version; }
    set characterVersion(value: string) { this._data.character_version = value; }

    /** 替代问候语列表 */
    get alternateGreetings(): string[] { return this._data.alternate_greetings; }
    set alternateGreetings(value: string[]) { this._data.alternate_greetings = Array.isArray(value) ? [...value] : []; }

    // ============================================================
    //  扩展属性
    // ============================================================

    /** 话痨程度 */
    get talkativeness(): string { return this._data.extensions.talkativeness; }
    set talkativeness(value: string) { this._data.extensions.talkativeness = String(value); }

    /** 是否收藏 */
    get fav(): boolean { return this._data.extensions.fav; }
    set fav(value: boolean) { this._data.extensions.fav = !!value; }

    /** 关联的世界书名称 */
    get world(): string { return this._data.extensions.world; }
    set world(value: string) { this._data.extensions.world = value; }

    /** 角色备注 / 深度提示词 */
    get depthPrompt(): DepthPrompt { return this._data.extensions.depth_prompt; }
    set depthPrompt(value: DepthPrompt) { this._data.extensions.depth_prompt = { ...value }; }

    // ============================================================
    //  世界书操作
    // ============================================================

    /** 获取内嵌世界书（无则返回 null） */
    get characterBook(): WorldBook | null {
        return this._worldBook;
    }

    /** 绑定世界书（深拷贝） */
    bindWorldBook(worldBook: WorldBook): this {
        this._worldBook = worldBook.clone();
        return this;
    }

    /** 解绑世界书，返回被解除的世界书 */
    unbindWorldBook(): WorldBook | null {
        if (!this._worldBook) return null;
        const wb = this._worldBook;
        this._worldBook = null;
        return wb;
    }

    /** 是否有内嵌世界书 */
    get hasWorldBook(): boolean {
        return this._worldBook !== null;
    }

    // ============================================================
    //  正则脚本操作
    // ============================================================

    /** 获取正则脚本列表 */
    get regexScripts(): RegexScript[]{
        return this._regexScripts;
    }

    /** 批量绑定正则脚本（替换现有的，深拷贝） */
    bindRegexScripts(scripts: RegexScript[]): this {
        this._regexScripts = scripts.map(s => s.clone());
        return this;
    }

    /** 添加单个正则脚本（深拷贝） */
    addRegexScript(script: RegexScript): this {
        this._regexScripts.push(script.clone());
        return this;
    }

    /** 移除指定 ID 的正则脚本 */
    removeRegexScript(scriptId: string): RegexScript | null {
        const index = this._regexScripts.findIndex(s => s.id === scriptId);
        if (index === -1) return null;
        return this._regexScripts.splice(index, 1)[0];
    }

    /** 解绑所有正则脚本，返回被解除的脚本列表 */
    unbindRegexScripts(): RegexScript[] {
        const scripts = this._regexScripts;
        this._regexScripts = [];
        return scripts;
    }

    /** 是否有正则脚本 */
    get hasRegexScripts(): boolean {
        return this._regexScripts.length > 0;
    }

    // ============================================================
    //  序列化
    // ============================================================

    /**
     * 序列化为完整的 JSON 对象（SillyTavern 兼容格式）
     * 自动生成顶层冗余字段
     */
    toJSON(options: SerializeOptions = {}): Record<string, unknown> {
        const ext = this._data.extensions;

        // 构建 data.extensions：保留未知扩展字段，再覆盖已知托管字段
        const serializedExt: Record<string, unknown> = {
            ...(deepClone(ext) as Record<string, unknown>),
            talkativeness: ext.talkativeness,
            fav: ext.fav,
            world: ext.world,
            depth_prompt: {
                prompt: ext.depth_prompt.prompt,
                depth: ext.depth_prompt.depth,
                role: ext.depth_prompt.role,
            },
        };

        // 正则脚本
        delete serializedExt.regex_scripts;
        if (this._regexScripts.length > 0) {
            serializedExt.regex_scripts = RegexScript.toJSONArray(this._regexScripts);
        }

        // 构建 data：保留未知 data 字段，再覆盖已知托管字段
        const serializedData: Record<string, unknown> = {
            ...(deepClone(this._data) as Record<string, unknown>),
            name: this._data.name,
            description: this._data.description,
            personality: this._data.personality,
            scenario: this._data.scenario,
            first_mes: this._data.first_mes,
            mes_example: this._data.mes_example,
            creator_notes: this._data.creator_notes,
            system_prompt: this._data.system_prompt,
            post_history_instructions: this._data.post_history_instructions,
            tags: deepClone(this._data.tags),
            creator: this._data.creator,
            character_version: this._data.character_version,
            alternate_greetings: deepClone(this._data.alternate_greetings),
            extensions: serializedExt,
        };
        delete serializedData.character_book;

        // 内嵌世界书
        if (this._worldBook) {
            serializedData.character_book = this._worldBook.toEmbeddedJSON();
        }

        // 完整对象（含顶层冗余字段）
        return {
            name: this._data.name,
            description: this._data.description,
            personality: this._data.personality,
            scenario: this._data.scenario,
            first_mes: this._data.first_mes,
            mes_example: this._data.mes_example,
            creatorcomment: this._data.creator_notes,
            avatar: options.avatar === undefined
                ? this._avatar
                : asString(options.avatar, 'none'),
            talkativeness: ext.talkativeness || '0.5',
            fav: ext.fav || false,
            tags: deepClone(this._data.tags),
            spec: this._spec,
            spec_version: this._specVersion,
            data: serializedData,
            create_date: options.create_date === undefined
                ? (this._createDate || createTimestamp())
                : normalizeTimestamp(options.create_date),
        };
    }

    /**
     * 将角色卡写入 PNG
     * @param pngInput 底图 PNG 数据，传null则自动生成最小 PNG
     * @param options 序列化选项
     * @returns PNG 文件的Uint8Array
     */
    toPNG(pngInput: Uint8Array | ArrayBuffer | null = null, options: SerializeOptions = {}): Uint8Array {
        const json = this.toJSON(options);
        const ccv3Json = {
            ...deepClone(json),
            spec: CharacterCardSpec.V3,
            spec_version: CharacterCardSpecVersion.V3,
        };
        return writeJsonToPNG(pngInput, JSON.stringify(json), {
            ccv3JsonString: JSON.stringify(ccv3Json),
        });
    }

    /**
     * 获取内部数据结构的深拷贝
     *包含世界书和正则脚本
     */
    toData(): CharacterCardRaw {
        const data = deepClone(this._data);

        if (this._worldBook) {
            data.character_book = this._worldBook.toData();
        }

        if (this._regexScripts.length > 0) {
            data.extensions.regex_scripts = this._regexScripts.map(s => s.toData());
        }

        return {
            spec: this._spec,
            spec_version: this._specVersion,
            data,
        };
    }

    /**
     * 克隆（深拷贝）
     */
    clone(): CharacterCard {
        const rawData = this.toData();
        return new CharacterCard(rawData.spec, rawData.spec_version, rawData.data, {
            avatar: this._avatar,
            createDate: this._createDate,
        });
    }
}

// ============================================================
//  内部解析辅助函数
// ============================================================

function parseCardData(rawData: Record<string, unknown>): CharacterCardData {
    if (!rawData || typeof rawData !== 'object') {
        return createDefaultCardData();
    }

    const extensions = parseCardExtensions(
        rawData.extensions as Record<string, unknown> | undefined
    );

    // 解析内嵌世界书（可选）
    let character_book = undefined;
    if (rawData.character_book && typeof rawData.character_book === 'object') {
        // 先转为 WorldBook 再转回 data，确保格式统一
        const wb = WorldBook.fromEmbeddedJSON(rawData.character_book);
        character_book = wb.toData();
    }

    const dataOverrides: Partial<CharacterCardData> = {
        ...(deepClone(rawData) as Partial<CharacterCardData>),
        name: asString(rawData.name),
        description: asString(rawData.description),
        personality: asString(rawData.personality),
        scenario: asString(rawData.scenario),
        first_mes: asString(rawData.first_mes),
        mes_example: asString(rawData.mes_example),
        creator_notes: asString(rawData.creator_notes),
        system_prompt: asString(rawData.system_prompt),
        post_history_instructions: asString(rawData.post_history_instructions),
        tags: asStringArray(rawData.tags),
        creator: asString(rawData.creator),
        character_version: asString(rawData.character_version),
        alternate_greetings: asStringArray(rawData.alternate_greetings),
        extensions,
    };

    if (rawData.group_only_greetings !== undefined) {
        dataOverrides.group_only_greetings = asStringArray(rawData.group_only_greetings);
    }

    if (character_book) {
        dataOverrides.character_book = character_book;
    } else {
        delete dataOverrides.character_book;
    }

    return createDefaultCardData(dataOverrides);
}

function parseCardExtensions(rawExt: Record<string, unknown> | undefined): CharacterCardExtensions {
    if (!rawExt || typeof rawExt !== 'object') {
        return createDefaultCardExtensions();
    }

    const ext = createDefaultCardExtensions({
        ...(deepClone(rawExt) as Partial<CharacterCardExtensions>),
        talkativeness: asString(rawExt.talkativeness, '0.5'),
        fav: asBoolean(rawExt.fav),
        world: asString(rawExt.world),
        depth_prompt: parseDepthPrompt(rawExt.depth_prompt as Record<string, unknown> | undefined),
    });

    // 解析内嵌正则脚本（可选）
    if (Array.isArray(rawExt.regex_scripts)) {
        ext.regex_scripts = rawExt.regex_scripts.map((s: unknown) => {
            const script = RegexScript.fromJSON(s);
            return script.toData();
        });
    }

    return ext;
}

function parseDepthPrompt(rawDP: Record<string, unknown> | undefined): DepthPrompt {
    if (!rawDP || typeof rawDP !== 'object') {
        return createDefaultDepthPrompt();
    }
    return createDefaultDepthPrompt({
        prompt: asString(rawDP.prompt),
        depth: typeof rawDP.depth === 'number' ? rawDP.depth : 4,
        role: asString(rawDP.role, 'system'),
    });
}
