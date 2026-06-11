/**
 * @file 自定义错误类
 * @description ParseCard 库的错误类型体系
 */

/** ParseCard 基础错误类 */
export class ParseCardError extends Error {
    public readonly code: string;

    constructor(message: string, code: string) {
        super(message);
        this.name = 'ParseCardError';
        this.code = code;}
}

/** 格式无效错误（JSON结构不符合预期） */
export class InvalidFormatError extends ParseCardError {
    constructor(message: string) {
        super(message, 'INVALID_FORMAT');
        this.name = 'InvalidFormatError';
    }
}

/** PNG 格式错误 */
export class PNGError extends ParseCardError {
    constructor(message: string) {
        super(message, 'PNG_ERROR');
        this.name = 'PNGError';
    }
}

/** 文件 I/O 错误 */
export class FileIOError extends ParseCardError {
    constructor(message: string) {
        super(message, 'FILE_IO_ERROR');
        this.name = 'FileIOError';
    }
}