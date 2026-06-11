/**
 * @file文件 I/O 封装（Node.js 专用）
 * @description 提供角色卡、世界书、正则脚本的文件读写功能
 *
 * @example
 * ```ts
 * import { loadCharacterCard, saveCharacterCard } from 'parsecard/node';
 *
 * const card = loadCharacterCard('角色卡.png');
 * card.name = '新名字';
 * saveCharacterCard(card, 'output.png');
 * ```
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';

import { CharacterCard } from './CharacterCard.js';
import { WorldBook } from './WorldBook.js';
import { RegexScript } from './RegexScript.js';
import { FileIOError, InvalidFormatError } from './errors.js';
import type { SerializeOptions, SaveOptions } from './types.js';

export type { SerializeOptions, SaveOptions } from './types.js';

// ============================================================
//  格式检测辅助
// ============================================================

/** PNG 文件签名前两字节 */
const PNG_MAGIC = [137, 80];

/**
 * 根据扩展名或文件头判断是否为 PNG
 */
function isPNGFile(filePath: string, data?: Buffer | Uint8Array): boolean {
    const ext = extname(filePath).toLowerCase();
    if (ext === '.png') return true;
    if (data && data.length >=2 && data[0] === PNG_MAGIC[0] && data[1] === PNG_MAGIC[1]) {
        return true;
    }
    return false;
}

// ============================================================
//  CharacterCard 文件操作
// ============================================================

/**
 * 从文件加载角色卡（同步）
 *自动识别 PNG / JSON 格式
 *
 * @param filePath 文件路径（.png 或 .json）
 * @returns CharacterCard 实例
 * @throws {FileIOError} 文件读取失败
 * @throws {InvalidFormatError} 格式无效
 */
export function loadCharacterCard(filePath: string): CharacterCard {
    try {
        const data = readFileSync(filePath);

        if (isPNGFile(filePath, data)) {
            const card = CharacterCard.fromPNG(data);
            if (!card){
                throw new InvalidFormatError(`PNG 文件中未找到角色卡数据: ${filePath}`);
            }
            return card;
        }

        //尝试 JSON
        const text = data.toString('utf-8');
        const raw = JSON.parse(text);
        return CharacterCard.fromJSON(raw);
    } catch (e) {
        if (e instanceof InvalidFormatError || e instanceof FileIOError) throw e;
        throw new FileIOError(`加载角色卡失败 (${filePath}): ${(e as Error).message}`);
    }
}

/**
 * 从文件加载角色卡（异步）
 */
export async function loadCharacterCardAsync(filePath: string): Promise<CharacterCard> {
    try {
        const data = await readFile(filePath);

        if (isPNGFile(filePath, data)) {
            const card = CharacterCard.fromPNG(data);
            if (!card) {
                throw new InvalidFormatError(`PNG 文件中未找到角色卡数据: ${filePath}`);
            }
            return card;
        }

        const text = data.toString('utf-8');
        const raw = JSON.parse(text);
        return CharacterCard.fromJSON(raw);
    } catch (e) {
        if (e instanceof InvalidFormatError || e instanceof FileIOError) throw e;
        throw new FileIOError(`加载角色卡失败 (${filePath}): ${(e as Error).message}`);
    }
}

/**
 * 保存角色卡到文件（同步）
 * 根据扩展名自动选择 PNG 或 JSON 格式
 *
 * @param card 角色卡实例
 * @param filePath 输出文件路径
 * @param options 保存选项
 */
export function saveCharacterCard(
    card: CharacterCard,
    filePath: string,
    options: SaveOptions = {},
): void {
    try {
        const ext = extname(filePath).toLowerCase();

        if (ext === '.png') {
            let sourceImage: Uint8Array | null = null;
            if (options.sourceImage) {
                sourceImage = options.sourceImage instanceof ArrayBuffer
                    ? new Uint8Array(options.sourceImage)
                    : options.sourceImage as Uint8Array;
            }
            const pngData = card.toPNG(sourceImage, options);
            writeFileSync(filePath, pngData);
        } else {
            const json = card.toJSON(options);
            writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
        }
    } catch (e) {
        if (e instanceof FileIOError) throw e;
        throw new FileIOError(`保存角色卡失败 (${filePath}): ${(e as Error).message}`);
    }
}

/**
 * 保存角色卡到文件（异步）
 */
export async function saveCharacterCardAsync(
    card: CharacterCard,
    filePath: string,
    options: SaveOptions = {},
): Promise<void> {
    try {
        const ext = extname(filePath).toLowerCase();

        if (ext === '.png') {
            let sourceImage: Uint8Array | null = null;
            if (options.sourceImage) {
                sourceImage = options.sourceImage instanceof ArrayBuffer
                    ? new Uint8Array(options.sourceImage)
                    : options.sourceImage as Uint8Array;
            }
            const pngData = card.toPNG(sourceImage, options);
            await writeFile(filePath, pngData);
        } else {
            const json = card.toJSON(options);
            await writeFile(filePath, JSON.stringify(json, null, 2), 'utf-8');
        }
    } catch (e) {
        if (e instanceof FileIOError) throw e;
        throw new FileIOError(`保存角色卡失败 (${filePath}): ${(e as Error).message}`);
    }
}

// ============================================================
//  WorldBook 文件操作
// ============================================================

/**
 * 从JSON 文件加载世界书（同步）
 * 自动检测独立/内嵌格式
 */
export function loadWorldBook(filePath: string): WorldBook {
    try {
        const text = readFileSync(filePath, 'utf-8');
        const raw = JSON.parse(text);
        return WorldBook.fromJSON(raw);
    } catch (e) {
        if (e instanceof FileIOError) throw e;
        throw new FileIOError(`加载世界书失败 (${filePath}): ${(e as Error).message}`);
    }
}

/**
 * 从 JSON 文件加载世界书（异步）
 */
export async function loadWorldBookAsync(filePath: string): Promise<WorldBook> {
    try {
        const data = await readFile(filePath, 'utf-8');
        const raw = JSON.parse(data);
        return WorldBook.fromJSON(raw);
    } catch (e) {
        if (e instanceof FileIOError) throw e;
        throw new FileIOError(`加载世界书失败 (${filePath}): ${(e as Error).message}`);
    }
}

/**
 * 保存世界书到JSON文件（同步）
 * @param format 'standalone' 独立格式 | 'embedded' 内嵌格式
 */
export function saveWorldBook(
    worldBook: WorldBook,
    filePath: string,
    format: 'standalone' | 'embedded' = 'standalone',
): void {
    try {
        const json = format === 'embedded'
            ? worldBook.toEmbeddedJSON()
            : worldBook.toStandaloneJSON();
        writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
    } catch (e) {
        if (e instanceof FileIOError) throw e;
        throw new FileIOError(`保存世界书失败 (${filePath}): ${(e as Error).message}`);
    }
}

/**
 * 保存世界书到 JSON 文件（异步）
 */
export async function saveWorldBookAsync(
    worldBook: WorldBook,
    filePath: string,
    format: 'standalone' | 'embedded' = 'standalone',
): Promise<void> {
    try {
        const json = format === 'embedded'
            ? worldBook.toEmbeddedJSON()
            : worldBook.toStandaloneJSON();
        await writeFile(filePath, JSON.stringify(json, null, 2), 'utf-8');
    } catch (e) {
        if (e instanceof FileIOError) throw e;
        throw new FileIOError(`保存世界书失败 (${filePath}): ${(e as Error).message}`);
    }
}

// ============================================================
//  RegexScript 文件操作
// ============================================================

/**
 * 从 JSON 文件加载正则脚本（同步）
 */
export function loadRegexScript(filePath: string): RegexScript {
    try {
        const text = readFileSync(filePath, 'utf-8');
        const raw = JSON.parse(text);
        return RegexScript.fromJSON(raw);
    } catch (e) {
        if (e instanceof FileIOError) throw e;
        throw new FileIOError(`加载正则脚本失败 (${filePath}): ${(e as Error).message}`);
    }
}

/**
 * 从 JSON 文件加载正则脚本（异步）
 */
export async function loadRegexScriptAsync(filePath: string): Promise<RegexScript> {
    try {
        const data = await readFile(filePath, 'utf-8');
        const raw = JSON.parse(data);
        return RegexScript.fromJSON(raw);
    } catch (e) {
        if (e instanceof FileIOError) throw e;
        throw new FileIOError(`加载正则脚本失败 (${filePath}): ${(e as Error).message}`);
    }
}

/**
 * 保存正则脚本到 JSON 文件（同步）
 */
export function saveRegexScript(script: RegexScript, filePath: string): void {
    try {
        const json = script.toJSON();
        writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
    } catch (e) {
        if (e instanceof FileIOError) throw e;
        throw new FileIOError(`保存正则脚本失败 (${filePath}): ${(e as Error).message}`);
    }
}

/**
 * 保存正则脚本到 JSON 文件（异步）
 */
export async function saveRegexScriptAsync(script: RegexScript, filePath: string): Promise<void> {
    try {
        const json = script.toJSON();
        await writeFile(filePath, JSON.stringify(json, null, 2), 'utf-8');
    } catch (e) {
        if (e instanceof FileIOError) throw e;
        throw new FileIOError(`保存正则脚本失败 (${filePath}): ${(e as Error).message}`);
    }
}
