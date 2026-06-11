/**
 * @file RegexScript 类
 * @description 正则脚本的面向对象封装
 */

import type { RegexScriptData } from './types.js';
import { SubstituteRegex } from './enums.js';
import { createDefaultRegexScriptData } from './defaults.js';
import {
    asString, asInteger, asBoolean,
    asStringArray, asNumberArray, asNullableNumber,
    deepClone, generateUUID,
} from './utils.js';

/**
 * 正则脚本类
 *
 * 封装 SillyTavern 正则脚本的解析、创建与序列化。
 * 可独立使用，也可内嵌到角色卡中。
 *
 * @example
 * ```ts
 * // 创建新脚本
 * const script = RegexScript.create({ scriptName: '测试', findRegex: 'hello' });
 *
 * // 从JSON 解析
 * const script = RegexScript.fromJSON(rawObject);
 *
 * // 序列化
 * const json = script.toJSON();
 * ```
 */
export class RegexScript {
    private _data: RegexScriptData;

    //============================================================
    //  构造 & 工厂方法
    // ============================================================

    constructor(data: RegexScriptData) {
        this._data = data;
    }

    /**
     * 从原始 JSON 对象解析
     * 独立文件和内嵌在角色卡中的结构完全一致
     */
    static fromJSON(raw: unknown): RegexScript {
        if (!raw || typeof raw !== 'object') {
            return new RegexScript(createDefaultRegexScriptData());
        }

        const obj = raw as Record<string, unknown>;

        return new RegexScript(createDefaultRegexScriptData({
            id: asString(obj.id, generateUUID()),
            scriptName: asString(obj.scriptName),
            findRegex: asString(obj.findRegex),
            replaceString: asString(obj.replaceString),
            trimStrings: asStringArray(obj.trimStrings),
            placement: asNumberArray(obj.placement),
            disabled: asBoolean(obj.disabled),
            markdownOnly: asBoolean(obj.markdownOnly),
            promptOnly: asBoolean(obj.promptOnly),
            runOnEdit: asBoolean(obj.runOnEdit, true),
            substituteRegex: asInteger(obj.substituteRegex, SubstituteRegex.NONE) ?? SubstituteRegex.NONE,
            minDepth: asNullableNumber(obj.minDepth),
            maxDepth: asNullableNumber(obj.maxDepth),
        }));
    }

    /**
     * 从 JSON 数组批量解析
     */
    static fromJSONArray(rawArray: unknown): RegexScript[] {
        if (!Array.isArray(rawArray)) return [];
        return rawArray.map(raw => RegexScript.fromJSON(raw));
    }

    /**
     * 创建新的正则脚本
     */
    static create(overrides: Partial<RegexScriptData> = {}): RegexScript {
        return new RegexScript(createDefaultRegexScriptData(overrides));
    }

    // ============================================================
    //  属性访问
    // ============================================================

    /**唯一标识符（UUID） */
    get id(): string { return this._data.id; }
    set id(value: string) { this._data.id = value; }

    /** 脚本名称 */
    get scriptName(): string { return this._data.scriptName; }
    set scriptName(value: string) { this._data.scriptName = value; }

    /** 查找正则表达式 */
    get findRegex(): string { return this._data.findRegex; }
    set findRegex(value: string) { this._data.findRegex = value; }

    /** 替换字符串（支持 {{match}}、$1、$2 等） */
    get replaceString(): string { return this._data.replaceString; }
    set replaceString(value: string) { this._data.replaceString = value; }

    /** 修剪列表 */
    get trimStrings(): string[] { return this._data.trimStrings; }
    set trimStrings(value: string[]) { this._data.trimStrings = value; }

    /** 作用范围 */
    get placement(): number[] { return this._data.placement; }
    set placement(value: number[]) { this._data.placement = value; }

    /** 是否禁用 */
    get disabled(): boolean { return this._data.disabled; }
    set disabled(value: boolean) { this._data.disabled = value; }

    /**仅格式显示 */
    get markdownOnly(): boolean { return this._data.markdownOnly; }
    set markdownOnly(value: boolean) { this._data.markdownOnly = value; }

    /** 仅格式提示词 */
    get promptOnly(): boolean { return this._data.promptOnly; }
    set promptOnly(value: boolean) { this._data.promptOnly = value; }

    /** 编辑消息时是否运行 */
    get runOnEdit(): boolean { return this._data.runOnEdit; }
    set runOnEdit(value: boolean) { this._data.runOnEdit = value; }

    /** 正则宏替换策略 */
    get substituteRegex(): number { return this._data.substituteRegex; }
    set substituteRegex(value: number) { this._data.substituteRegex = value; }

    /** 最小深度 */
    get minDepth(): number | null { return this._data.minDepth; }
    set minDepth(value: number | null) { this._data.minDepth = value; }

    /** 最大深度 */
    get maxDepth(): number | null { return this._data.maxDepth; }
    set maxDepth(value: number | null) { this._data.maxDepth = value; }

    // ============================================================
    //  便捷方法
    // ============================================================

    /** 是否已启用 */
    get isEnabled(): boolean { return !this._data.disabled; }

    /** 启用 */
    enable(): this{
        this._data.disabled = false;
        return this;
    }

    /** 禁用 */
    disable(): this {
        this._data.disabled = true;
        return this;
    }

    // ============================================================
    //  序列化
    // ============================================================

    /** 序列化为 JSON 对象 */
    toJSON(): RegexScriptData {
        return deepClone(this._data);
    }

    /**
     * 获取内部数据的深拷贝
     */
    toData(): RegexScriptData {
        return deepClone(this._data);
    }

    /**
     * 克隆（深拷贝，生成新ID）
     */
    clone(): RegexScript {
        const cloned = new RegexScript(deepClone(this._data));
        cloned.id = generateUUID();
        return cloned;
    }

    /**
     * 批量序列化
     */
    static toJSONArray(scripts: RegexScript[]): RegexScriptData[] {
        return scripts.map(s => s.toJSON());
    }
}