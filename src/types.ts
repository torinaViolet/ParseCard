/**
 * @file TypeScript 类型定义
 * @description ParseCard 统一数据模型，所有接口定义集中在此文件
 */

// ============================================================
//  角色卡（Character Card）
// ============================================================

/** 角色备注 / 深度提示词 */
export interface DepthPrompt {
    /** 提示词内容 */
    prompt: string;
    /** 插入深度 */
    depth: number;
    /** 角色身份（"system" | "user" | "assistant"） */
    role: string;
}

/** 角色卡扩展数据 */
export interface CharacterCardExtensions {
    /** 话痨程度（"0" ~ "1"） */
    talkativeness: string;
    /** 是否收藏 */
    fav: boolean;
    /** 关联的世界书名称（空字符串表示无） */
    world: string;
    /** 角色备注 / 深度提示词 */
    depth_prompt: DepthPrompt;
    /** 正则脚本列表（可选） */
    regex_scripts?: RegexScriptData[];
}

/** 角色卡核心数据 */
export interface CharacterCardData {
    /** 角色名*/
    name: string;
    /** 角色描述 */
    description: string;
    /** 角色设定摘要 */
    personality: string;
    /** 交互情景/背景 */
    scenario: string;
    /** 第一条消息 */
    first_mes: string;
    /** 对话示例（用<START> 分隔多组） */
    mes_example: string;
    /** 创作者注释 */
    creator_notes: string;
    /** 主要提示词（替换预设中的主要提示词） */
    system_prompt: string;
    /** 后续历史指令（紧跟用户最新消息） */
    post_history_instructions: string;
    /** 标签列表 */
    tags: string[];
    /** 创作者名称 */
    creator: string;
    /** 角色版本 */
    character_version: string;
    /** 替代问候语列表 */
    alternate_greetings: string[];
    /** 扩展数据 */
    extensions: CharacterCardExtensions;/** 内嵌世界书（可选） */
    character_book?: WorldBookData;
}

/** 完整角色卡原始数据 */
export interface CharacterCardRaw {
    /** 规范标识*/
    spec: string;
    /** 规范版本 */
    spec_version: string;
    /** 核心数据 */
    data: CharacterCardData;
}

// ============================================================
//  世界书（World Book）— 统一格式
// ============================================================

/** 角色过滤器（独立世界书条目可用） */
export interface CharacterFilter {
    /** 是否为排除模式 */
    isExclude: boolean;
    /** 角色名列表 */
    names: string[];
    /** 标签列表 */
    tags: string[];
}

/** 世界书条目（统一格式） */
export interface WorldBookEntryData {
    /** 唯一 ID */
    uid: number;
    /** 主要关键词列表 */
    keys: string[];
    /** 次要关键词列表 */
    secondary_keys: string[];
    /** 标题 / 备注 */
    comment: string;
    /** 条目内容 */
    content: string;
    /** 是否常驻（蓝灯条目） */
    constant: boolean;
    /** 是否选择性触发 */
    selective: boolean;
    /** 选择逻辑（0=与任意, 1=非所有, 2=非任何, 3=与所有） */
    selectiveLogic: number;
    /** 是否启用 */
    enabled: boolean;
    /** 插入顺序 */
    insertion_order: number;
    /** 插入位置（0~7，见WorldBookEntryPosition枚举） */
    position: number;
    /** 是否使用正则表达式匹配关键词 */
    use_regex: boolean;
    /** 插入深度 */
    depth: number;
    /** 消息角色身份（0=系统, 1=用户, 2=AI，null=默认系统） */
    role: number | null;
    /** 是否为向量化条目 */
    vectorized: boolean;
    /** 触发概率（0~100） */
    probability: number;
    /** 是否启用概率 */
    useProbability: boolean;
    /** 不可递归（不会被其他条目激活） */
    excludeRecursion: boolean;
    /** 防止进一步递归 */
    preventRecursion: boolean;
    /** 延迟到递归 */
    delayUntilRecursion: boolean | number;
    /** 扫描深度（null=使用全局设置） */
    scanDepth: number | null;
    /** 区分大小写（null=使用全局设置） */
    caseSensitive: boolean | null;
    /** 匹配完整单词（null=使用全局设置） */
    matchWholeWords: boolean | null;
    /** 使用分组评分（null=使用全局设置） */
    useGroupScoring: boolean | null;
    /** 自动化ID */
    automationId: string;
    /** 锚点名称（position=7时使用） */
    outletName: string;
    /** 分组名称 */
    group: string;
    /** 分组覆盖（确定优先级） */
    groupOverride: boolean;
    /** 分组权重 */
    groupWeight: number;
    /** 粘性（触发后持续几轮） */
    sticky: number | null;
    /** 冷却（触发后冷却几轮） */
    cooldown: number | null;
    /** 延迟（延迟几轮后触发） */
    delay: number | null;
    /** 显示顺序 */
    displayIndex: number;
    /** 是否添加备注（UI状态字段） */
    addMemo: boolean;
    /** 筛选生成触发器列表 */
    triggers: string[];
    /** 无视回复限额 */
    ignoreBudget: boolean;
    /** 额外匹配来源：用户设定描述 */
    matchPersonaDescription: boolean;
    /** 额外匹配来源：角色描述 */
    matchCharacterDescription: boolean;
    /** 额外匹配来源：角色性格 */
    matchCharacterPersonality: boolean;
    /** 额外匹配来源：角色备注 */
    matchCharacterDepthPrompt: boolean;
    /** 额外匹配来源：情景*/
    matchScenario: boolean;
    /** 额外匹配来源：创作者的注释 */
    matchCreatorNotes: boolean;
    /** 角色过滤器（独立世界书可用，null=无过滤） */
    characterFilter: CharacterFilter | null;
}

/** 世界书（统一格式） */
export interface WorldBookData {
    /** 世界书名称 */
    name: string;
    /** 条目列表 */
    entries: WorldBookEntryData[];
}

// ============================================================
//  正则脚本（Regex Script）
// ============================================================

/** 正则脚本数据 */
export interface RegexScriptData {
    /** 唯一标识符（UUID） */
    id: string;
    /** 脚本名称 */
    scriptName: string;
    /** 查找正则表达式 */
    findRegex: string;
    /** 替换字符串（支持 {{match}}、$1、$2 等） */
    replaceString: string;
    /** 修剪列表（替换前先移除匹配中的这些子串） */
    trimStrings: string[];
    /** 作用范围（1=用户输入, 2=AI输出, 3=快捷命令, 5=世界信息, 6=推理） */
    placement: number[];
    /** 是否禁用 */
    disabled: boolean;
    /** 仅格式显示（仅在聊天页面视觉修改，不改真实消息） */
    markdownOnly: boolean;
    /** 仅格式提示词（仅在发给AI 的提示词中生效，不改真实消息） */
    promptOnly: boolean;
    /** 编辑消息时是否运行 */
    runOnEdit: boolean;
    /** 正则宏替换策略（0=不替换, 1=替换原始, 2=替换转义） */
    substituteRegex: number;
    /** 最小深度（null=无限制） */
    minDepth: number | null;
    /** 最大深度（null=无限制） */
    maxDepth: number | null;
}

// ============================================================
//  序列化选项
// ============================================================

/** 角色卡序列化选项 */
export interface SerializeOptions {
    /** 头像字段值 */
    avatar?: string;
    /** 创建日期 */
    create_date?: string;
}

/** 文件保存选项 */
export interface SaveOptions extends SerializeOptions {
    /** 底图PNG 数据（仅 PNG 格式时使用，不提供则生成最小PNG） */
    sourceImage?: Uint8Array | ArrayBuffer | null;
}