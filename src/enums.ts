/**
 * @file枚举常量定义
 * @description SillyTavern 角色卡、世界书、正则脚本中使用的所有枚举值
 */

//============================================================
//角色卡规范版本
// ============================================================

/** 角色卡规范标识 */
export const CharacterCardSpec = {
    V2: 'chara_card_v2',
    V3: 'chara_card_v3',
} as const;

export type CharacterCardSpecType = typeof CharacterCardSpec[keyof typeof CharacterCardSpec];

/** 角色卡规范版本号 */
export const CharacterCardSpecVersion = {
    V2: '2.0',
    V3: '3.0',
} as const;

export type CharacterCardSpecVersionType = typeof CharacterCardSpecVersion[keyof typeof CharacterCardSpecVersion];

// ============================================================
//  世界书条目 - 插入位置
// ============================================================

/**
 * 世界书条目的插入位置
 */
export const WorldBookEntryPosition = {
    /** 角色定义之前 */
    BEFORE_CHAR: 0,
    /** 角色定义之后 */
    AFTER_CHAR: 1,/** 作者注释之前 */
    BEFORE_AUTHOR_NOTE: 2,
    /** 作者注释之后 */
    AFTER_AUTHOR_NOTE: 3,
    /** 在深度插入（配合 depth + role使用） */
    AT_DEPTH: 4,
    /** 示例消息前（↑EM） */
    BEFORE_EXAMPLE_MESSAGES: 5,
    /** 示例消息后（↓EM） */
    AFTER_EXAMPLE_MESSAGES: 6,
    /** 锚点（Outlet/Anchor，通过 {{outlet::名称}} 宏引用） */
    OUTLET: 7,
} as const;

export type WorldBookEntryPositionType = typeof WorldBookEntryPosition[keyof typeof WorldBookEntryPosition];

/**
 * 内嵌世界书 (character_book) 中position 字段使用的字符串值
 *仅用于 before_char(0) 和 after_char(1) 两种情况，
 * 其余位置统一使用 "after_char" 并在 extensions.position 中存储数字值
 */
export const EmbeddedWorldBookPosition = {BEFORE_CHAR: 'before_char',
    AFTER_CHAR: 'after_char',
} as const;

export type EmbeddedWorldBookPositionType = typeof EmbeddedWorldBookPosition[keyof typeof EmbeddedWorldBookPosition];

// ============================================================
//  世界书条目 - 选择逻辑
// ============================================================

/**
 * 世界书条目的关键词选择逻辑
 * 控制主关键词与次要关键词之间的逻辑关系
 */
export const SelectiveLogic = {
    /** 与任意- 主关键词匹配 AND 次要关键词任意一个匹配 */
    AND_ANY: 0,
    /** 非所有 - 主关键词匹配 AND NOT 所有次要关键词都匹配 */
    NOT_ALL: 1,
    /** 非任何 - 主关键词匹配 AND NOT 任何次要关键词匹配 */
    NOT_ANY: 2,
    /** 与所有 - 主关键词匹配 AND 所有次要关键词都匹配 */
    AND_ALL: 3,
} as const;

export type SelectiveLogicType = typeof SelectiveLogic[keyof typeof SelectiveLogic];

// ============================================================
//  世界书条目 - 角色身份（用于深度插入）
// ============================================================

/**
 * 世界书条目在深度插入时的消息角色身份
 */
export const EntryRole = {
    /** 系统消息 */
    SYSTEM: 0,
    /** 用户消息 */
    USER: 1,
    /** AI / 助手消息 */
    ASSISTANT: 2,
} as const;

export type EntryRoleType = typeof EntryRole[keyof typeof EntryRole];

// ============================================================
//  世界书条目 - 筛选生成触发器
// ============================================================

/**
 * 世界书条目的筛选生成触发器类型
 * 当 triggers 为空数组时，表示 "All types (default)"
 */
export const EntryTrigger = {
    /** 正常生成 */
    NORMAL: 'normal',
    /** 继续生成 */
    CONTINUE: 'continue',
    /** AI帮答（代替用户回复） */
    IMPERSONATE: 'impersonate',
    /** 滑动切换回复 */
    SWIPE: 'swipe',
    /** 重新生成 */
    REGENERATE: 'regenerate',
    /** 静默生成 */
    QUIET: 'quiet',
} as const;

export type EntryTriggerType = typeof EntryTrigger[keyof typeof EntryTrigger];

// ============================================================
//  正则脚本 - 作用范围
// ============================================================

/**
 * 正则脚本的作用范围（多选）
 * 注意：值4 不存在，为历史遗留跳过
 */
export const RegexPlacement = {
    /** 用户输入 */
    USER_INPUT: 1,
    /** AI 输出 */
    AI_OUTPUT: 2,
    /** 快捷命令 */
    SLASH_COMMAND: 3,
    /** 世界信息 */
    WORLD_INFO: 5,
    /** 推理*/
    REASONING: 6,
} as const;

export type RegexPlacementType = typeof RegexPlacement[keyof typeof RegexPlacement];

// ============================================================
//  正则脚本 - 宏替换策略
// ============================================================

/**
 * 正则表达式查找时的宏替换策略
 */
export const SubstituteRegex = {
    /** 不替换 */
    NONE: 0,
    /** 替换（原始） - 替换宏，保留原始文本 */
    RAW: 1,
    /** 替换（转义） - 替换宏，并进行正则转义 */
    ESCAPED: 2,
} as const;

export type SubstituteRegexType = typeof SubstituteRegex[keyof typeof SubstituteRegex];

// ============================================================
//  角色卡 depth_prompt - 角色身份
// ============================================================

/**
 * 角色卡 depth_prompt 中的角色身份
 * 注意：角色卡中使用字符串值，与世界书中使用数字值不同
 */
export const DepthPromptRole = {
    SYSTEM: 'system',
    USER: 'user',
    ASSISTANT: 'assistant',
} as const;

export type DepthPromptRoleType = typeof DepthPromptRole[keyof typeof DepthPromptRole];

// ============================================================
//  条目触发类型（根据 constant/vectorized 状态推断）
// ============================================================

/**
 * 条目触发类型
 */
export const TriggerType = {
    /** 关键词触发（绿灯） */
    KEYWORD: 'keyword',
    /** 常驻触发（蓝灯） */
    CONSTANT: 'constant',
    /** 向量化触发 */
    VECTORIZED: 'vectorized',
} as const;

export type TriggerTypeValue = typeof TriggerType[keyof typeof TriggerType];