/**
 * @file PNG 元数据读写
 * @description 从PNG 文件的tEXt chunk 中读写 SillyTavern 角色卡数据
 *
 * PNG 文件结构：
 * - 8 字节 PNG 签名
 * - 多个 chunk，每个 chunk 由以下部分组成：
 *   - 4 字节 数据长度（大端序）
 *   - 4 字节 chunk 类型（如 "tEXt", "IHDR", "IEND"）
 *   - N 字节 chunk 数据
 *   - 4 字节 CRC32 校验码
 *
 * SillyTavern 将角色卡 JSON 以 base64 编码存储在 tEXt chunk 中，
 * keyword 为 "chara"，用null 字节(0x00) 分隔 keyword 和文本内容。
 */

import { PNGError } from './errors.js';

// PNG 文件签名（8 字节）
const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

// tEXt chunk 中的关键字
const CHARA_KEYWORD = 'chara';

// ============================================================
//  创建最小PNG
// ============================================================

/**
 * 创建最小的 1×1 透明 PNG 数据
 * 用于在没有底图时创建角色卡 PNG
 */
export function createMinimalPNG(): Uint8Array {
    // IHDR: 1×1, 8-bit RGBA
    const ihdrData = new Uint8Array(13);
    ihdrData[3] = 1;  // width = 1
    ihdrData[7] = 1;  // height = 1
    ihdrData[8] = 8;  // bit depth = 8
    ihdrData[9] = 6;  // color type = 6 (RGBA)

    const ihdrChunk = buildChunk('IHDR', ihdrData);

    // IDAT: filter=None(0x00) + RGBA(0,0,0,0)
    const rawPixel = new Uint8Array([0, 0, 0, 0, 0]);
    const compressedData = deflateRaw(rawPixel);
    const idatChunk = buildChunk('IDAT', compressedData);

    // IEND
    const iendChunk = buildChunk('IEND', new Uint8Array(0));

    return concatArrays(PNG_SIGNATURE, ihdrChunk, idatChunk, iendChunk);
}

// ============================================================
//  PNG 读取
// ============================================================

/**
 * 从 PNG 数据中读取角色卡 JSON 字符串
 * @returns JSON 字符串，未找到返回 null
 */
export function readJsonFromPNG(pngInput: Uint8Array | ArrayBuffer): string | null {
    const pngData = toUint8Array(pngInput);
    const base64Text = extractCharaText(pngData);
    if (!base64Text) return null;

    try {
        return base64Decode(base64Text);
    } catch (e) {
        throw new PNGError(`解码 PNG 中的 base64 数据失败: ${(e as Error).message}`);
    }
}

/**
 * 将角色卡 JSON 写入 PNG 数据
 * @param pngInput 原始 PNG 数据，传null 则自动生成最小 PNG
 * @param jsonString 角色卡 JSON 字符串
 * @returns 新的 PNG 文件数据
 */
export function writeJsonToPNG(pngInput: Uint8Array | ArrayBuffer | null, jsonString: string): Uint8Array {
    let pngData: Uint8Array;

    if (pngInput == null) {
        pngData = createMinimalPNG();
    } else {
        pngData = toUint8Array(pngInput);
    }

    if (!isPNG(pngData)) {
        throw new PNGError('不是合法的 PNG 文件：签名不匹配');
    }

    const base64Data = base64Encode(jsonString);
    const newChunk = buildTextChunk(CHARA_KEYWORD, base64Data);

    // 解析原始 chunks，移除已有的 chara tEXt chunk
    const chunks = parseChunks(pngData);
    const filteredChunks = chunks.filter(chunk => {
        if (chunk.type !== 'tEXt') return true;
        const nullIndex = chunk.data.indexOf(0x00);
        if (nullIndex === -1) return true;
        const keyword = decodeString(chunk.data.slice(0, nullIndex));
        return keyword !== CHARA_KEYWORD;
    });

    // 在IHDR 之后、第一个 IDAT 之前插入新的 chara chunk
    let insertIndex = 1;
    for (let i = 0; i < filteredChunks.length; i++) {
        if (filteredChunks[i].type === 'IDAT') {
            insertIndex = i;
            break;
        }
    }

    //拼接最终输出
    const parts: Uint8Array[] = [PNG_SIGNATURE];
    for (let i = 0; i < filteredChunks.length; i++) {
        if (i === insertIndex) {
            parts.push(newChunk);
        }
        const chunk = filteredChunks[i];
        parts.push(buildChunk(chunk.type, chunk.data));
    }
    if (insertIndex >= filteredChunks.length) {
        parts.push(newChunk);
    }

    return concatArrays(...parts);
}

/**
 * 从 PNG 文件中移除 chara tEXt chunk
 */
export function removeCharaFromPNG(pngInput: Uint8Array | ArrayBuffer): Uint8Array {
    const pngData = toUint8Array(pngInput);

    if (!isPNG(pngData)) {
        throw new PNGError('不是合法的 PNG 文件：签名不匹配');
    }

    const chunks = parseChunks(pngData);
    const parts: Uint8Array[] = [PNG_SIGNATURE];

    for (const chunk of chunks) {
        if (chunk.type === 'tEXt') {
            const nullIndex = chunk.data.indexOf(0x00);
            if (nullIndex !== -1) {
                const keyword = decodeString(chunk.data.slice(0, nullIndex));
                if (keyword === CHARA_KEYWORD) continue;
            }
        }
        parts.push(buildChunk(chunk.type, chunk.data));
    }

    return concatArrays(...parts);
}

/**
 * 检查 PNG 文件是否包含角色卡数据
 */
export function hasCharaInPNG(pngInput: Uint8Array | ArrayBuffer): boolean {
    try {
        const pngData = toUint8Array(pngInput);
        return extractCharaText(pngData) !== null;
    } catch {
        return false;
    }
}

// ============================================================
//  内部辅助函数
// ============================================================

interface PNGChunk {
    type: string;
    data: Uint8Array;
    offset: number;
}

function toUint8Array(input: Uint8Array | ArrayBuffer): Uint8Array {
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (input instanceof Uint8Array) return input;
    throw new PNGError('输入必须是 Uint8Array 或 ArrayBuffer');
}

function isPNG(data: Uint8Array): boolean {
    if (data.length < 8) return false;
    for (let i = 0; i < 8; i++) {
        if (data[i] !== PNG_SIGNATURE[i]) return false;
    }
    return true;
}

function parseChunks(pngData: Uint8Array): PNGChunk[] {
    if (!isPNG(pngData)) {
        throw new PNGError('不是合法的 PNG 文件：签名不匹配');
    }

    const chunks: PNGChunk[] = [];
    let offset = 8;

    while (offset < pngData.length) {
        if (offset + 8 > pngData.length) break;

        const length = readUint32BE(pngData, offset);
        const typeBytes = pngData.slice(offset + 4, offset + 8);
        const type = decodeString(typeBytes);

        if (offset + 12 + length > pngData.length) {
            throw new PNGError(`PNG chunk 损坏：类型 ${type}，期望 ${length} 字节数据`);
        }

        const data = pngData.slice(offset + 8, offset + 8 + length);
        chunks.push({ type, data, offset });
        offset += 12 + length;
    }

    return chunks;
}

function extractCharaText(pngData: Uint8Array): string | null {
    const chunks = parseChunks(pngData);

    for (const chunk of chunks) {
        if (chunk.type !== 'tEXt') continue;
        const nullIndex = chunk.data.indexOf(0x00);
        if (nullIndex === -1) continue;
        const keyword = decodeString(chunk.data.slice(0, nullIndex));
        if (keyword !== CHARA_KEYWORD) continue;
        return decodeString(chunk.data.slice(nullIndex + 1));
    }

    return null;
}

function deflateRaw(data: Uint8Array): Uint8Array {
    const len = data.length;
    const nlen = (~len) & 0xFFFF;
    const result = new Uint8Array(2 +5 + len +4);

    result[0] = 0x78;
    result[1] = 0x01;
    result[2] = 0x01;
    result[3] = len & 0xFF;
    result[4] = (len >> 8) & 0xFF;
    result[5] = nlen & 0xFF;
    result[6] = (nlen >> 8) & 0xFF;
    result.set(data, 7);

    let a = 1, b = 0;
    for (let i = 0; i < data.length; i++) {
        a = (a + data[i]) % 65521;
        b = (b + a) % 65521;
    }
    const adler = ((b << 16) | a) >>> 0;
    const off = 7+ len;
    result[off] = (adler >> 24) & 0xFF;
    result[off + 1] = (adler >> 16) & 0xFF;
    result[off + 2] = (adler >> 8) & 0xFF;
    result[off + 3] = adler & 0xFF;

    return result;
}

function buildChunk(type: string, data: Uint8Array): Uint8Array {
    const typeBytes = encodeString(type);
    const crcData = concatArrays(typeBytes, data);
    const crcValue = crc32(crcData);
    return concatArrays(
        writeUint32BE(data.length),
        typeBytes,
        data,
        writeUint32BE(crcValue),);
}

function buildTextChunk(keyword: string, text: string): Uint8Array {
    const keywordBytes = encodeString(keyword);
    const nullByte = new Uint8Array([0x00]);
    const textBytes = encodeString(text);
    const chunkData = concatArrays(keywordBytes, nullByte, textBytes);
    return buildChunk('tEXt', chunkData);
}

// ============================================================
//  CRC32
// ============================================================

let crcTable: Uint32Array | null = null;

function makeCRCTable(): Uint32Array {
    if (crcTable) return crcTable;
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        crcTable[n] = c;
    }
    return crcTable;
}

function crc32(data: Uint8Array): number {
    const table = makeCRCTable();
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
        crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ============================================================
//  二进制辅助
// ============================================================

function readUint32BE(data: Uint8Array, offset: number): number {
    return (
        (data[offset] << 24) |
        (data[offset + 1] << 16) |
        (data[offset + 2] << 8) |
        data[offset + 3]
    ) >>> 0;
}

function writeUint32BE(value: number): Uint8Array {
    const bytes = new Uint8Array(4);
    bytes[0] = (value >>> 24) & 0xFF;
    bytes[1] = (value >>> 16) & 0xFF;
    bytes[2] = (value >>> 8) & 0xFF;
    bytes[3] = value & 0xFF;
    return bytes;
}

function encodeString(str: string): Uint8Array {
    return new TextEncoder().encode(str);
}

function decodeString(data: Uint8Array): string {
    return new TextDecoder().decode(data);
}

function concatArrays(...arrays: Uint8Array[]): Uint8Array {
    let totalLength = 0;
    for (const arr of arrays) totalLength += arr.length;
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}

// ============================================================
//  Base64（兼容 Node.js 和浏览器）
// ============================================================

function base64Encode(str: string): string {
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(str, 'utf-8').toString('base64');
    }
    const bytes = encodeString(str);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64Decode(base64: string): string {
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(base64, 'base64').toString('utf-8');
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return decodeString(bytes);
}