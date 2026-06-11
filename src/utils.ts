/**
 * @file 工具函数
 * @description 时间格式化、数据验证、类型转换等通用工具
 */

// ============================================================
//  时间处理
// ============================================================

/**
 * 生成 SillyTavern 格式的时间戳（ISO 8601）
 * 格式示例: "2026-04-10T17:13:23.447Z"
 */
export function createTimestamp(date: Date = new Date()): string {
    return date.toISOString();
}

/**
 * 验证时间戳是否为合法的 ISO 8601 格式
 */
export function isValidTimestamp(timestamp: string): boolean {
    if (typeof timestamp !== 'string') return false;
    const date = new Date(timestamp);
    return !isNaN(date.getTime());
}

/**
 * 修复/规范化时间戳为 ISO 8601 格式
 * 如果无法解析则返回当前时间的时间戳
 */
export function normalizeTimestamp(timestamp: unknown): string {
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
            return date.toISOString();
        }
    }
    if (typeof timestamp === 'number') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
            return date.toISOString();
        }
    }
    return createTimestamp();
}

// ============================================================
//  类型安全工具
// ============================================================

/** 安全地获取字符串值 */
export function asString(value: unknown, defaultValue: string = ''): string {
    if (typeof value === 'string') return value;
    if (value == null) return defaultValue;
    return String(value);
}

/** 安全地获取数字值 */
export function asNumber(value: unknown, defaultValue: number | null = null): number | null {
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (typeof value === 'string') {
        const num = Number(value);
        if (!isNaN(num)) return num;
    }
    return defaultValue;
}

/** 安全地获取整数值 */
export function asInteger(value: unknown, defaultValue: number | null = null): number | null {
    const num = asNumber(value, defaultValue);
    if (num === null) return null;
    return Math.round(num);
}

/** 安全地获取布尔值 */
export function asBoolean(value: unknown, defaultValue: boolean = false): boolean {
    if (typeof value === 'boolean') return value;
    if (value == null) return defaultValue;
    if (value === 'true' || value === 1) return true;
    if (value === 'false' || value === 0) return false;
    return defaultValue;
}

/** 安全地获取数组值 */
export function asArray<T>(value: unknown, defaultValue: T[] = []): T[] {
    if (Array.isArray(value)) return value;
    return defaultValue;
}

/**
 * 安全地获取字符串数组
 * 自动过滤非字符串元素，字符串自动按逗号分割
 */
export function asStringArray(value: unknown): string[] {
    if (value == null) return [];
    // 字符串自动按逗号分割（支持中文逗号 \uff0c）
    if (typeof value === 'string') {
        if (!value.trim()) return [];
        return value.replace(/\uff0c/g, ',').split(',').map(s => s.trim()).filter(Boolean);
    }
    if (!Array.isArray(value)) {
        // 其他类型（数字等）转为单元素字符串数组
        return [String(value)];
    }
    const result: string[] = [];
    for (const item of value) {
        if (typeof item === 'string') result.push(item);
        else if (item != null) result.push(String(item));
    }
    return result;
}

/**
 * 安全地获取数字数组
 * 自动过滤非数字元素
 */
export function asNumberArray(value: unknown): number[] {
    if (!Array.isArray(value)) return [];
    return value
        .map(item => (typeof item === 'number' ? item : Number(item)))
        .filter(item => !isNaN(item));
}

/** 安全地获取可为null 的布尔值 */
export function asNullableBoolean(value: unknown, defaultValue: boolean | null = null): boolean | null {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === 1) return true;
    if (value === 'false' || value === 0) return false;
    return defaultValue;
}

/** 安全地获取可为 null 的数字值 */
export function asNullableNumber(value: unknown, defaultValue: number | null = null): number | null {
    if (value === null || value === undefined) return defaultValue;
    return asNumber(value, defaultValue);
}

/** 安全地获取可为 null 的布尔或数字值（delayUntilRecursion 字段使用） */
export function asBooleanOrNumber(value: unknown, defaultValue: boolean | number = false): boolean | number {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (value == null) return defaultValue;
    return defaultValue;
}

// ============================================================
//  深拷贝
// ============================================================

/** 深拷贝对象 */
export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

// ============================================================
//  UUID 生成（兼容浏览器和Node.js）
// ============================================================

/** 生成 UUID v4 */
export function generateUUID(): string {
    // 优先使用 crypto.randomUUID()
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // 降级方案
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}