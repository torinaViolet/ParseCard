# SillyTavern 数据结构兼容性与预设系统调查

调查日期：2026-06-19

本文件记录对本机多个 SillyTavern 版本的数据结构调查结果，并与 ParseCard 当前实现做兼容性对比。重点覆盖角色卡、PNG 元数据、世界书、正则脚本，以及后续可作为新功能补充的 SillyTavern 预设系统。

## 调查范围

本机发现的 SillyTavern 版本：

- `D:\Application\SillyTavern\SillyTavern-1.12.3`
- `D:\Application\SillyTavern\SillyTavern-1.14.0`
- `D:\Application\SillyTavern\SillyTavern-1.16.0`
- `D:\Application\SillyTavern\SillyTavern-1.18.0`

源码主要以 `SillyTavern-1.18.0` 为准；本地用户数据主要来自 `1.12.3`、`1.14.0`、`1.16.0`。`1.18.0\data\default-user` 未发现已有角色卡/世界书/预设数据，但 `1.18.0\default\content\presets` 提供了完整默认预设样例。

ParseCard 当前范围：

- `src\CharacterCard.ts`
- `src\WorldBook.ts`
- `src\RegexScript.ts`
- `src\png.ts`
- `src\types.ts`
- `src\defaults.ts`
- `src\enums.ts`
- `src\io.ts`

## SillyTavern 实现入口

### 角色卡与 PNG

- `src\character-card-parser.js`
  - 负责从 PNG tEXt chunk / JSON 中读取角色卡数据。
  - 负责写入 PNG 元数据。
  - 读取 PNG 时会解析所有 tEXt chunk，并优先使用 `ccv3`，其次使用 `chara`。
  - 写入 PNG 时会删除旧 `chara` 与 `ccv3`，然后写入新的 `chara`，新版本还会写入 `ccv3`。
- `src\types\spec-v2.d.ts`
  - 定义 Tavern Card V2 类型和内嵌 `CharacterBook` 类型。
- `src\validator\TavernCardValidator.js`
  - 对 V2 / V3 角色卡做结构校验。
  - V3 要求 `spec = "chara_card_v3"`，`spec_version >= "3.0" && < "4.0"`，且 `data` 为对象。
- `src\endpoints\characters.js`
  - 角色卡后端接口。
  - 会迁移旧结构到 V2 形状，并同步顶层冗余字段。
  - 会处理 `data.extensions.talkativeness`、`fav`、`world`、`depth_prompt` 等 SillyTavern 自有扩展。
- `public\scripts\char-data.js`
  - 前端角色卡数据处理。
  - 注释中提到 extension 会承载 SillyTavern、Chub、RisuAI、Pygmalion 等来源的扩展字段。

### 世界书

- `src\endpoints\worldinfo.js`
  - 世界书后端接口。
  - 定义新建 entry 的默认字段。
  - 支持独立世界书文件 `data\<user>\worlds\*.json`。
- `public\scripts\world-info.js`
  - 前端世界书编辑、排序、导入导出逻辑。
  - 定义位置枚举、逻辑枚举以及实际使用字段。

### 正则脚本

- `public\scripts\extensions\regex\engine.js`
  - 定义正则应用位置枚举。
  - 负责在输入、输出、世界信息、快捷命令、推理文本等位置应用正则。
- `public\scripts\extensions\regex\index.js`
  - 正则扩展的 UI、保存、导入导出与 preset 挂载逻辑。

### 预设系统

- `src\endpoints\presets.js`
  - 后端 `/api/presets/save`、`/delete`、`/restore`。
  - 根据 `apiId` 将预设保存到不同用户目录。
- `src\constants.js`
  - `USER_DIRECTORY_TEMPLATE` 定义预设目录名。
- `src\endpoints\content-manager.js`
  - 默认预设恢复逻辑。
  - 从 `default\content\index.json` 找默认 preset/template。
- `public\scripts\preset-manager.js`
  - 前端统一预设管理器。
  - 管理普通生成预设、Advanced Formatting 模板、主设置导入/导出。
- `public\scripts\kai-settings.js`
  - Kobold / Kobold Horde 预设结构和加载逻辑。
- `public\scripts\nai-settings.js`
  - NovelAI 预设结构和 NovelAI 官方 preset 转换逻辑。
- `public\scripts\textgen-settings.js`
  - Text Completion / TextGen 预设结构。
- `public\scripts\openai.js`
  - Chat Completion / OpenAI 兼容接口预设结构。
- `public\scripts\instruct-mode.js`
  - Instruct Template 结构、迁移和应用逻辑。
- `public\scripts\power-user.js`
  - Context Template 结构、`power_user.context` 默认值、`getContextSettings()`。
- `public\scripts\sysprompt.js`
  - System Prompt 结构，兼容旧 instruct 中的 `system_prompt`。
- `public\scripts\reasoning.js`
  - Reasoning Formatting 结构和推理块解析/格式化逻辑。
- `src\users.js`
  - 服务端迁移旧 instruct `system_prompt` 到独立 sysprompt 目录。

## 角色卡结构

SillyTavern 使用 Tavern Card V2 / V3 形状。V2 的核心结构是：

```ts
interface TavernCardV2 {
  spec: "chara_card_v2";
  spec_version: string;
  data: {
    name: string;
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    mes_example: string;
    creator_notes: string;
    system_prompt: string;
    post_history_instructions: string;
    alternate_greetings: string[];
    tags: string[];
    creator: string;
    character_version: string;
    extensions: Record<string, unknown>;
    character_book?: CharacterBook;
  };
}
```

V3 的 validator 更偏容错：它主要检查 `spec = "chara_card_v3"`、`spec_version` 在 `3.x` 范围内，以及 `data` 是对象。实际字段仍高度兼容 V2 的 `data` 形状。

SillyTavern 会维护若干顶层冗余字段，用于兼容旧版本或前端列表显示，例如 `name`、`description`、`personality`、`scenario`、`first_mes`、`mes_example`、`creatorcomment`、`avatar`、`chat` 等。ParseCard 当前已经会在 `toJSON()` 时同步主要顶层字段。

### 角色卡扩展字段

SillyTavern 自用的常见 `data.extensions` 字段：

- `talkativeness`
- `fav`
- `world`
- `depth_prompt`
- `regex_scripts`

本地真实数据中还发现：

- `data.group_only_greetings`
- 顶层 `chat`

兼容性结论：

- `group_only_greetings` 是 SillyTavern 已在本地卡片中使用的字段，ParseCard 当前会丢弃。
- 顶层 `chat` 更像 SillyTavern 私有运行时字段，重要性低于 `data.*`。
- `data.extensions` 不应只按已知字段重建。SillyTavern 明确允许第三方扩展在这里存放数据，ParseCard 后续应保留未知 extension 字段。

## PNG 元数据

SillyTavern 将角色卡 JSON 以 base64 写入 PNG tEXt chunk。

关键字：

- `chara`
- `ccv3`

重要行为：

- 读取时优先选择 `ccv3`，没有时再用 `chara`。
- 写入时会删除旧 `chara` 和旧 `ccv3`。
- 新版本写入时会同时写入 `chara` 和 `ccv3`；`ccv3` 内容是转换为 `chara_card_v3` 后的数据。

本地 PNG 统计：

- `1.12.3`：32 个 PNG，4 个有 `chara`，0 个有 `ccv3`。
- `1.14.0`：80 个 PNG，52 个有 `chara`，52 个有 `ccv3`，二者同时存在 52 个。
- `1.16.0`：31 个 PNG，3 个同时有 `chara` 和 `ccv3`。
- `1.18.0`：本地用户目录未发现角色卡 PNG。

ParseCard 当前 `src\png.ts`：

- 只读写 `chara`。
- 写入时只删除旧 `chara`，不会删除旧 `ccv3`。

这是一个高优先级兼容问题：如果用户拿已有 `ccv3` 的 PNG 当底图写回，ParseCard 会留下旧 `ccv3`，SillyTavern 读取时又优先使用 `ccv3`，最终表现为“写入成功但 SillyTavern 仍显示旧数据”。

建议：

- 读取 PNG 时支持 `ccv3`，并按 SillyTavern 一样优先 `ccv3`。
- 写入 PNG 时删除旧 `chara` 和旧 `ccv3`。
- 为最大兼容性，写入时可同时生成 `chara` 与 `ccv3`。

## 世界书结构

SillyTavern 有两种世界书形态：

- 独立世界书：`data\<user>\worlds\*.json`
- 角色卡内嵌世界书：`data.character_book`

### 独立世界书

真实独立文件大致形状：

```ts
interface StandaloneWorldInfoFile {
  entries: Record<string, StandaloneWorldInfoEntry>;
  name?: string;
  description?: string;
  recursiveScanning?: boolean;
  scanDepth?: number;
  tokenBudget?: number;
  originalData?: unknown;
}
```

`entries` 是以 uid 字符串为 key 的对象。

本地样例中发现：

- `1.12.3`：顶层常见 `entries`、`originalData`。
- `1.14.0`：顶层常见 `description`、`entries`、`name`、`originalData`、`recursiveScanning`、`scanDepth`、`tokenBudget`。
- `1.16.0`：顶层仍可出现 `originalData`。

ParseCard 当前 `WorldBookData` 只保留 `name` 和 `entries`，独立世界书导出也只输出 `entries`，因此会丢失：

- `description`
- `recursiveScanning`
- `scanDepth`
- `tokenBudget`
- `originalData`

其中 `originalData` 可能是导入来源保留信息，是否完整保留取决于 ParseCard 是否定位为“无损编辑器”。如果定位为兼容工具库，建议至少通过 `extras` 或 raw 字段保留。

### 内嵌 CharacterBook

SillyTavern `spec-v2.d.ts` 中的内嵌结构大致为：

```ts
interface CharacterBook {
  name?: string;
  description?: string;
  scan_depth?: number;
  token_budget?: number;
  recursive_scanning?: boolean;
  extensions: Record<string, unknown>;
  entries: CharacterBookEntry[];
}
```

需要注意：validator 要求 `character_book.extensions` 和 `entries` 存在，但 SillyTavern 自身的转换逻辑在某些路径下可能产出只有 `{ entries, name }` 的对象。因此 ParseCard 应做宽松读取：有则保留，没有则默认 `extensions: {}`。

ParseCard 当前内嵌世界书会丢失：

- `description`
- `scan_depth`
- `token_budget`
- `recursive_scanning`
- `extensions`

### 世界书条目字段

SillyTavern 1.18.0 新建条目模板包含：

- `key`
- `keysecondary`
- `comment`
- `content`
- `constant`
- `vectorized`
- `selective`
- `selectiveLogic`
- `addMemo`
- `order`
- `position`
- `disable`
- `ignoreBudget`
- `excludeRecursion`
- `preventRecursion`
- `matchPersonaDescription`
- `matchCharacterDescription`
- `matchCharacterPersonality`
- `matchCharacterDepthPrompt`
- `matchScenario`
- `matchCreatorNotes`
- `delayUntilRecursion`
- `probability`
- `useProbability`
- `depth`
- `outletName`
- `group`
- `groupOverride`
- `groupWeight`
- `scanDepth`
- `caseSensitive`
- `matchWholeWords`
- `useGroupScoring`
- `automationId`
- `role`
- `sticky`
- `cooldown`
- `delay`
- `triggers`

本地 `1.14.0` 内嵌条目还发现：

- 顶层 `case_sensitive`
- 顶层 `priority`
- 独立条目 `extensions`

ParseCard 当前覆盖了多数 1.18.0 字段，但需要补齐或保留：

- 独立世界书条目 `extensions`
- 内嵌条目顶层 `case_sensitive`
- 内嵌条目顶层 `priority`
- 可能出现的顶层 `name`

`delayUntilRecursion` 细节：

- SillyTavern 1.18.0 新建模板默认是 `0`。
- ParseCard 默认值是 `false`。
- 当前类型允许 `boolean | number`，类型方向正确，但默认值和序列化应尽量贴近 SillyTavern。

### 世界书枚举

位置枚举：

- `0`：before / before char
- `1`：after / after char
- `2`：Author's Note top
- `3`：Author's Note bottom
- `4`：at depth
- `5`：examples/messages top
- `6`：examples/messages bottom
- `7`：outlet

逻辑枚举：

- `0`：AND_ANY
- `1`：NOT_ALL
- `2`：NOT_ANY
- `3`：AND_ALL

ParseCard 当前枚举与 SillyTavern 匹配。

## 正则脚本结构

SillyTavern 正则脚本字段：

```ts
interface RegexScript {
  id: string;
  scriptName: string;
  findRegex: string;
  replaceString: string;
  trimStrings: string[];
  placement: number[];
  disabled: boolean;
  markdownOnly: boolean;
  promptOnly: boolean;
  runOnEdit: boolean;
  substituteRegex: number;
  minDepth: number;
  maxDepth: number;
}
```

正则作用位置：

- `0`：MD_DISPLAY，已废弃
- `1`：USER_INPUT
- `2`：AI_OUTPUT
- `3`：SLASH_COMMAND
- `4`：旧值，当前跳过
- `5`：WORLD_INFO
- `6`：REASONING

`substituteRegex`：

- `0`：NONE
- `1`：RAW
- `2`：ESCAPED

ParseCard 当前字段基本匹配，但 enum 没导出废弃的 `MD_DISPLAY = 0`。由于原始数组能保留数字 0，这不是破坏性问题；但为了类型完整性，可补一个标记为 deprecated 的 enum 成员。

## 预设系统

预设系统可以分为两类：

- 生成参数预设：Kobold、NovelAI、TextGen、OpenAI。
- Advanced Formatting 模板：Instruct、Context、System Prompt、Reasoning Formatting。

此外，SillyTavern 还支持 Master Import/Export，把多个模板和部分生成设置打成一个 JSON。

### 存储目录

`src\constants.js` 中的 `USER_DIRECTORY_TEMPLATE` 定义用户目录：

| apiId | 用户目录 |
| --- | --- |
| `kobold` / `koboldhorde` | `KoboldAI Settings` |
| `novel` | `NovelAI Settings` |
| `textgenerationwebui` | `TextGen Settings` |
| `openai` | `OpenAI Settings` |
| `instruct` | `instruct` |
| `context` | `context` |
| `sysprompt` | `sysprompt` |
| `reasoning` | `reasoning` |

默认内容目录在 `default\content\presets` 下，子目录名略有不同：

- `kobold`
- `novel`
- `textgen`
- `openai`
- `instruct`
- `context`
- `sysprompt`
- `reasoning`

`default\content\index.json` 使用类型名来标记默认内容，例如：

- `kobold_preset`
- `novel_preset`
- `textgen_preset`
- `openai_preset`
- `instruct`
- `context`
- `sysprompt`
- `reasoning`

### 后端接口

`src\endpoints\presets.js` 的接口很薄：

- `POST /api/presets/save`
  - body：`{ preset, name, apiId }`
  - `name` 经过 `sanitize-filename`。
  - 保存为 `<name>.json`。
  - 内容是 `JSON.stringify(preset, null, 4)`。
- `POST /api/presets/delete`
  - body：`{ name, apiId }`
  - 删除对应目录下的 `<name>.json`。
- `POST /api/presets/restore`
  - body：`{ name, apiId }`
  - 从 `default\content\index.json` 找同名、同目标目录的默认预设。
  - 返回 `{ isDefault, preset }`。

后端不会深度校验字段。字段筛选、旧格式转换、UI 同步主要在前端。

### 前端 PresetManager

`public\scripts\preset-manager.js` 是统一管理器。

注册方式：

- 页面上的 `select[data-preset-manager-for]` 会注册为一个 `PresetManager`。
- `koboldhorde` 会归并到 `kobold`。
- 不传 `apiId` 时，默认使用当前 `main_api`。

命名索引方式：

- `textgenerationwebui` 和 Advanced Formatting 模板属于 keyed API，用 preset name 直接作为 option value。
- `kobold`、`novel`、`openai` 使用 `{ name: index }` 形式的 `preset_names`，option value 是数组下标。

保存行为：

- `savePreset(name, settings?)` 如果没有传 settings，会调用 `getPresetSettings(name)` 从当前全局设置中抽取可保存字段。
- `instruct` 保存前会检查并迁移旧 `system_prompt`。
- `novel` 保存外部 NovelAI preset 时会调用 `convertNovelPreset()`。
- 保存后调用 `/api/presets/save`。

会被过滤掉、不写入 preset 的运行时字段包括：

- 连接地址和服务状态：`api_server`、`server_urls`、`streaming_url`、`online_status` 一类。
- 当前选择指针：`preset`、`preset_settings`、`preset_settings_novel` 等。
- 部分流式、模型、派生状态、reasoning UI 状态等。

普通生成预设会额外写入：

- `genamt`
- `max_length`

但 OpenAI 和 Advanced Formatting 模板不加这两个字段。

### Preset extensions

PresetManager 提供：

- `readPresetExtensionField({ name, path })`
- `writePresetExtensionField({ name, path, value })`

行为：

- 从当前选中 preset 的 `extensions` 里读写指定 path。
- 如果写的是当前正在使用的 preset，会同步更新 active settings，并调用 `saveSettings()`。
- 然后还会更新 preset 文件本身。

这说明 preset 和角色卡一样，也应该保留未知 `extensions` 字段。正则扩展等功能可以把数据挂在生成预设上。

### Master Import/Export

`PresetManager.masterSections` 支持这些 section：

- `instruct`：Instruct Template
- `context`：Context Template
- `sysprompt`：System Prompt
- `preset`：Text Completion Preset，对应 `textgenerationwebui`
- `reasoning`：Reasoning Formatting
- `srw`：Start Reply With

Master Import 会先尝试识别旧单文件：

- Instruct：包含 `name`、`input_sequence`、`output_sequence`
- Context：包含 `name`、`story_string`
- System Prompt：包含 `name`、`content`
- Text Completion：包含 `temp`、`top_k`、`top_p`、`rep_pen`
- Reasoning：包含 `name`、`prefix`、`suffix`、`separator`

如果是组合文件，则按 section 导入。

### Instruct Template

默认状态在 `power_user.instruct`，预设数组是 `instruct_presets`。

当前主要字段：

```ts
interface InstructPreset {
  name: string;
  input_sequence: string;
  input_suffix: string;
  output_sequence: string;
  output_suffix: string;
  system_sequence: string;
  system_suffix: string;
  last_system_sequence: string;
  first_input_sequence: string;
  first_output_sequence: string;
  last_input_sequence: string;
  last_output_sequence: string;
  story_string_prefix: string;
  story_string_suffix: string;
  stop_sequence: string;
  wrap: boolean;
  macro: boolean;
  names_behavior: "none" | "force" | "always";
  activation_regex: string;
  bind_to_context?: boolean;
  user_alignment_message: string;
  system_same_as_user: boolean;
  skip_examples?: boolean;
  sequences_as_stop_strings: boolean;
}
```

旧字段迁移：

- `separator_sequence` -> `output_suffix`
- `names` / `names_force_groups` -> `names_behavior`
- 删除 `system_sequence_prefix`、`system_sequence_suffix`
- 旧 `system_prompt` 会迁移到 sysprompt

本地版本差异：

- `1.12.3` instruct 样例仍有 `system_prompt`、`names`、`names_force_groups`、`separator_sequence`。
- `1.14.0` / `1.16.0` 已是新版字段，增加 `first_input_sequence`、`last_input_sequence`、`story_string_prefix`、`story_string_suffix`、`sequences_as_stop_strings`。

### Context Template

默认状态在 `power_user.context`，预设数组是 `context_presets`。

当前主要字段：

```ts
interface ContextPreset {
  name: string;
  story_string: string;
  chat_start: string;
  example_separator: string;
  use_stop_strings: boolean;
  names_as_stop_strings: boolean;
  story_string_position: number;
  story_string_role: number;
  story_string_depth: number;
  // 旧版或全局混入字段可能出现：
  always_force_name2?: boolean;
  trim_sentences?: boolean;
  single_line?: boolean;
}
```

旧模板如果缺少 `story_string_position`，SillyTavern 会自动检查并补足 `{{anchorBefore}}`、`{{anchorAfter}}`。

本地版本差异：

- `1.12.3` context 样例包含 `allow_jailbreak`、`include_newline` 等旧字段。
- `1.14.0` / `1.16.0` 样例已包含 `names_as_stop_strings`、`story_string_position`、`story_string_role`、`story_string_depth`。

### System Prompt

默认状态在 `power_user.sysprompt`，预设数组是 `system_prompts`。

结构很小：

```ts
interface SystemPromptPreset {
  name: string;
  content: string;
  post_history?: string;
}
```

迁移逻辑：

- 前端 `sysprompt.js` 会在导入/保存 instruct template 时检查 `system_prompt`。
- 服务端 `users.js` 会扫描旧 instruct 文件，把 `system_prompt` 独立迁移为 sysprompt JSON，并在 instruct 中删除该字段。
- 迁移产物可能命名为 `[Migrated] <name>`。

本地 `1.14.0` / `1.16.0` 均有 sysprompt 目录，字段为 `name`、`content`、`post_history`。

### Reasoning Formatting

默认状态在 `power_user.reasoning`，预设数组是 `reasoning_templates`。

模板结构：

```ts
interface ReasoningTemplate {
  name: string;
  prefix: string;
  suffix: string;
  separator: string;
}
```

运行时设置还包括：

- `auto_parse`
- `add_to_prompts`
- `auto_expand`
- `show_hidden`
- `max_additions`

但这些运行时设置会在保存模板时被过滤，不属于 reasoning template 文件核心字段。

Reasoning 逻辑会：

- 从模型响应、OpenRouter/Gemini/DeepSeek 等来源提取 reasoning。
- 使用 `prefix` / `suffix` / `separator` 自动解析或格式化 `<think>...</think>` 一类内容。
- 支持把 reasoning 写入消息 `extra.reasoning`、`extra.reasoning_duration`、`extra.reasoning_type`。

### TextGen / Text Completion Preset

来源：`public\scripts\textgen-settings.js`

代表字段：

```ts
interface TextGenPreset {
  temp: number;
  temperature_last: boolean;
  top_p: number;
  top_k: number;
  top_a: number;
  min_p: number;
  tfs: number;
  typical_p: number;
  rep_pen: number;
  rep_pen_range: number;
  rep_pen_decay?: number;
  rep_pen_slope: number;
  no_repeat_ngram_size: number;
  freq_pen: number;
  presence_pen: number;
  do_sample: boolean;
  dynatemp?: boolean;
  min_temp?: number;
  max_temp?: number;
  dry_allowed_length?: number;
  dry_multiplier?: number;
  dry_base?: number;
  dry_sequence_breakers?: string;
  max_length?: number;
  genamt?: number;
  sampler_order?: number[];
  sampler_priority?: unknown[];
  samplers?: unknown[];
  samplers_priorities?: unknown[];
  grammar_string?: string;
  json_schema?: unknown;
  json_schema_allow_empty?: boolean;
  banned_tokens?: string;
  logit_bias?: unknown[];
  extensions?: Record<string, unknown>;
}
```

本地默认 `1.18.0` textgen 预设没有 `extensions` 字段，但运行时默认设置有 `extensions: {}`，用户预设可出现。

### Kobold Preset

来源：`public\scripts\kai-settings.js`

代表字段：

```ts
interface KoboldPreset {
  temp: number;
  rep_pen: number;
  rep_pen_range: number;
  rep_pen_slope: number;
  top_p: number;
  min_p: number;
  top_a: number;
  top_k: number;
  typical: number;
  tfs: number;
  sampler_order: number[];
  mirostat: number;
  mirostat_tau: number;
  mirostat_eta: number;
  use_default_badwordsids: boolean;
  grammar: string;
  seed?: number;
  max_length?: number;
  genamt?: number;
  extensions?: Record<string, unknown>;
}
```

本地 `1.16.0` 用户样例中已出现 `extensions`。

### NovelAI Preset

来源：`public\scripts\nai-settings.js`

代表字段：

```ts
interface NovelAIPreset {
  max_context?: number;
  max_length?: number;
  min_length: number;
  temperature: number;
  repetition_penalty: number;
  repetition_penalty_range: number;
  repetition_penalty_slope: number;
  repetition_penalty_frequency: number;
  repetition_penalty_presence: number;
  tail_free_sampling: number;
  top_k: number;
  top_p: number;
  top_a: number;
  typical_p: number;
  min_p?: number;
  math1_temp?: number;
  math1_quad?: number;
  math1_quad_entropy_scale?: number;
  mirostat_lr?: number;
  mirostat_tau?: number;
  phrase_rep_pen?: string;
  prefix?: string;
  banned_tokens?: string;
  order: number[];
  logit_bias?: unknown[];
  preamble?: string;
  return_full_text?: boolean;
  use_cache?: boolean;
  extensions?: Record<string, unknown>;
}
```

NovelAI 官方 preset 如果是 `presetVersion === 3` 且有 `parameters`，SillyTavern 会转换成内部结构，并默认附加 `extensions: {}`。

### OpenAI / Chat Completion Preset

来源：`public\scripts\openai.js`

OpenAI 预设字段最多，覆盖：

- 温度、惩罚、top 参数：`temperature` / `temp_openai`、`frequency_penalty`、`presence_penalty`、`top_p`、`top_k`、`min_p`、`top_a`、`repetition_penalty`。
- token 和上下文：`openai_max_context`、`openai_max_tokens`、`max_context_unlocked`。
- prompts：`prompts`、`prompt_order`、`send_if_empty`、`impersonation_prompt`、`new_chat_prompt`、`new_group_chat_prompt`、`new_example_chat_prompt`、`continue_nudge_prompt`、`group_nudge_prompt`。
- 格式模板：`wi_format`、`scenario_format`、`personality_format`。
- provider/model：`chat_completion_source`、`openai_model`、`claude_model`、`google_model`、`vertexai_model`、`mistralai_model`、`cohere_model`、`deepseek_model`、`openrouter_model` 等。
- OpenRouter/provider 限制：`openrouter_providers`、`openrouter_quantizations`、`openrouter_allow_fallbacks`、`openrouter_use_fallback`。
- 多模态/工具/推理：`media_inlining`、`inline_image_quality`、`function_calling`、`show_thoughts`、`reasoning_effort`、`verbosity`、`enable_web_search`、`request_images`。
- 自定义请求：`custom_url`、`custom_model`、`custom_include_body`、`custom_exclude_body`、`custom_include_headers`。
- 其他：`seed`、`n`、`names_behavior`、`squash_system_messages`、`continue_prefill`、`assistant_prefill`、`assistant_impersonation`、`use_sysprompt`、`extensions`。

#### Prompt Manager / 提示词编排

截图中 `Main Prompt`、`World Info (before)`、`Persona Description`、`Char Description`、`Chat History` 这一列来自 `public\scripts\PromptManager.js`，不是普通 sampler 参数。它保存在 OpenAI preset 的两个字段里：

- `prompts`
- `prompt_order`

`prompts` 是 prompt 定义表，默认 12 个：

```ts
interface ChatCompletionPrompt {
  identifier: string;
  name: string;
  role?: "system" | "user" | "assistant";
  content?: string;
  system_prompt?: boolean;
  marker?: boolean;
  position?: string | number;
  injection_position?: 0 | 1;
  injection_depth?: number;
  injection_order?: number;
  injection_trigger?: string[];
  forbid_overrides?: boolean;
  extension?: boolean;
}
```

字段含义：

- `identifier` 是稳定 id，也是 `prompt_order` 引用的 key。
- `name` 是 UI 显示名称。
- `role` 决定发送给 Chat Completion API 时的 message role。
- `content` 是实际提示词内容；marker prompt 通常没有固定内容，而是在生成时被真实内容替换。
- `system_prompt` 表示系统内置 prompt，不能被删除。
- `marker` 表示占位/锚点 prompt，例如世界书、角色描述、聊天示例、聊天记录。
- `injection_position`：`0` 为相对 prompt list 编排，`1` 为 in-chat/absolute injection。
- `injection_depth` 是 absolute injection 插入到聊天历史中的深度，默认 `4`。
- `injection_order` 是同一深度内排序值，默认 `100`。
- `injection_trigger` 限定生成类型，例如 normal / continue / quiet 等；空数组或缺失表示总是触发。
- `forbid_overrides` 表示不允许被角色卡字段覆盖。
- `extension` 表示由扩展添加。

默认 prompt identifiers：

- `main`：Main Prompt
- `nsfw`：Auxiliary Prompt
- `dialogueExamples`：Chat Examples，marker
- `jailbreak`：Post-History Instructions
- `chatHistory`：Chat History，marker
- `worldInfoAfter`：World Info (after)，marker
- `worldInfoBefore`：World Info (before)，marker
- `enhanceDefinitions`：Enhance Definitions
- `charDescription`：Char Description，marker
- `charPersonality`：Char Personality，marker
- `scenario`：Scenario，marker
- `personaDescription`：Persona Description，marker

`prompt_order` 是实际排序和启用状态：

```ts
interface PromptOrderGroup {
  character_id: string | number;
  order: PromptOrderEntry[];
}

interface PromptOrderEntry {
  identifier: string;
  enabled: boolean;
}
```

OpenAI PromptManager 在 1.18.0 中使用全局策略：

- `setupChatCompletionPromptManager()` 配置 `promptOrder.strategy = "global"`。
- `dummyId = 100001`。
- 旧默认 preset 文件中也可能存在 `character_id = 100000` 的 order，因此读取时不要假设只有一个分组。
- 实际 UI 会通过 `getPromptOrderForCharacter({ id: dummyId })` 读取当前分组。

默认顺序与截图基本一致：

1. `main`
2. `worldInfoBefore`
3. `personaDescription`
4. `charDescription`
5. `charPersonality`
6. `scenario`
7. `enhanceDefinitions`，默认 disabled
8. `nsfw`
9. `worldInfoAfter`
10. `dialogueExamples`
11. `chatHistory`
12. `jailbreak`

SillyTavern 会做这些兼容处理：

- 如果 `prompts` 为空，会填充 `chatCompletionDefaultPrompts.prompts`。
- 如果缺少默认 system prompt，会自动补回。
- 如果 prompt 没有 `identifier`，会生成 uuid。
- 如果 `prompt_order` 里引用了不存在的 prompt，会移除孤儿引用。
- 旧字段 `main_prompt`、`nsfw_prompt`、`jailbreak_prompt` 会迁移到 `prompts` 中对应 identifier 的 `content`。

生成时的关键流程：

- `PromptManager.getPromptCollection(type)` 根据 `prompt_order` 顺序筛选 enabled prompt。
- `preparePrompt()` 会执行 `substituteParams()`，替换 `{{char}}`、`{{user}}`、`{{original}}` 等宏。
- `openai.js` 的 `preparePromptsForChatCompletion()` 会把 prompt manager 的 prompt 与角色卡、世界书、聊天记录、示例对话、扩展 prompt 合并。
- marker prompt 是插槽，不一定直接发送自身内容；例如 `chatHistory` 会由实际聊天消息集合填入，`worldInfoBefore/After` 会由世界书内容填入。
- UI 中 token 数来自 `PromptManager.populateTokenCounts()`，它读取最近一次 dry-run / generation 产生的 message collection。

PromptManager 还有独立的导入/导出格式：

```ts
interface PromptManagerExport {
  version: 1;
  type: "full" | "character";
  data: {
    prompts: ChatCompletionPrompt[];
    prompt_order: PromptOrderEntry[] | null;
  };
}
```

这里导出的 `prompts` 只包含用户自定义 prompt，不包含 `system_prompt` 和 marker prompt；OpenAI preset 文件中的 `prompts` 则包含完整默认 prompt 定义。实现新功能时要区分“OpenAI preset 文件”和“PromptManager 单独导出文件”。

#### Logit Bias / 偏置预设

截图顶部的“添加偏置条目”和“大多数词符都有一个前导空格”来自 OpenAI logit bias UI。它和 Prompt Manager 不是同一个结构。

运行时默认字段在 `public\scripts\openai.js`：

```ts
interface OpenAILogitBiasEntry {
  id: string;
  text: string;
  value: number;
}

interface OpenAILogitBiasSettings {
  bias_preset_selected: string | null;
  bias_presets: Record<string, OpenAILogitBiasEntry[]>;
}
```

默认值：

- `bias_preset_selected = "Default (none)"`
- `bias_presets["Default (none)"] = []`
- 还有一个默认示例 `Anti-bond`

存储细节：

- `bias_preset_selected` 在 `settingsToUpdate` 中，会进入 OpenAI preset 文件。
- `bias_presets` 不在 `settingsToUpdate` 中，默认 OpenAI preset 文件通常不包含它。
- `default\content\settings.json` 会包含完整 `bias_presets`。
- `custom-request.js` 特别处理了“preset 有 `bias_preset_selected` 但没有 `bias_presets`”的情况，说明 SillyTavern 允许 OpenAI preset 只保存当前选择名，而不携带偏置定义。

导入/导出细节：

- logit bias preset 有单独导入/导出按钮。
- 单独导出的文件是 `OpenAILogitBiasEntry[]`，不是完整 OpenAI preset。
- 导入时要求 JSON 是数组，并且每个 entry 至少有 `text` 和 `value`；没有 `id` 会补 uuid。

生成时：

- `openai.js` 会把当前 `bias_presets[bias_preset_selected]` POST 到 `/api/backends/chat-completions/bias?model=...`。
- 服务端 `src\endpoints\backends\chat-completions.js` 根据 tokenizer 把 entry 转成真正的 `{ tokenId: biasValue }`。
- 如果 `text` 是 JSON 数组字符串，例如 `[123,456]`，服务端会直接当 token id 使用。
- 否则服务端直接 encode `entry.text`。UI 提示“大多数词符都有一个前导空格”，因此普通词建议写成带前导空格的文本，例如 `" bond"`。
- 只有支持 logit bias 的 provider 才会发送该字段；不支持时 `openai.js` 会删除 `generate_data.logit_bias`。

ParseCard 如果支持这一块，建议将其作为 OpenAI preset 附属能力但不要强制写入每个 preset：

- `bias_preset_selected` 可以作为 OpenAI preset 字段保留。
- `bias_presets` 作为可选字段读取，出现就无损保留。
- 提供单独的 `LogitBiasPreset` 读写能力，支持 SillyTavern 的数组文件。

字段名在版本间变化明显。本地 `1.12.3` OpenAI 样例中还存在旧字段，如 `claude_use_sysprompt`、`openrouter_force_instruct`、`windowai_model`、`wrap_in_quotes` 等；`1.14.0` 又新增了大量 provider 字段。对 OpenAI preset 最稳妥的策略是：

- 只对少数核心字段提供类型化访问。
- 其余字段使用 `Record<string, unknown>` 无损保留。
- 永远保留 `extensions`。

## 本地样例统计

### 角色卡和世界书

`1.12.3`：

- 角色卡：4
- 世界书：4
- 卡片发现 `data.group_only_greetings`
- 内嵌世界书顶层：`entries`、`name`
- 独立世界书顶层：`entries`、`originalData`

`1.14.0`：

- 角色卡：52
- 世界书：56
- 卡片发现 `data.group_only_greetings`
- 内嵌世界书顶层：`description`、`entries`、`extensions`、`name`、`recursive_scanning`、`scan_depth`、`token_budget`
- 内嵌 entry 发现 `case_sensitive`、`priority`
- 独立世界书顶层：`description`、`entries`、`name`、`originalData`、`recursiveScanning`、`scanDepth`、`tokenBudget`
- 独立 entry 发现 `characterFilter`、`extensions`

`1.16.0`：

- 角色卡：3
- 世界书：3
- 卡片仍有 `data.group_only_greetings`
- 独立世界书仍可出现 `originalData`
- 独立 entry 仍可出现 `extensions`

### 预设

本地用户目录统计：

| 版本 | Kobold | NovelAI | TextGen | OpenAI | instruct | context | sysprompt | reasoning |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1.12.3 | 27 | 19 | 35 | 1 | 27 | 24 | 0 | 0 |
| 1.14.0 | 6 | 24 | 6 | 3 | 37 | 33 | 13 | 3 |
| 1.16.0 | 7 | 24 | 6 | 1 | 37 | 33 | 13 | 3 |
| 1.18.0 用户目录 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1.18.0 默认内容 | 6 | 24 | 6 | 1 | 38 | 34 | 13 | 5 |

关键版本变化：

- `sysprompt` 和 `reasoning` 在旧 `1.12.3` 用户目录中不存在。
- `1.12.3` 的 instruct 仍包含 `system_prompt`，新版本迁移到独立 sysprompt。
- TextGen、OpenAI 字段随版本和 provider 增长很快，必须设计成宽松结构。
- 所有生成预设都应允许 `extensions`，即使默认 JSON 不一定显式包含。

## ParseCard 当前差异汇总

高优先级：

- PNG 只处理 `chara`，没有处理 `ccv3`。这会导致写回已有 SillyTavern 新版 PNG 时，SillyTavern 继续读取旧 `ccv3`。
- `data.extensions` 只保留已知字段，未知扩展会丢失。

中优先级：

- 角色卡 `data.group_only_greetings` 会丢失。
- 内嵌 `character_book` 的 book-level metadata 会丢失：`description`、`scan_depth`、`token_budget`、`recursive_scanning`、`extensions`。
- 独立世界书顶层 metadata 会丢失：`description`、`recursiveScanning`、`scanDepth`、`tokenBudget`、`originalData`。
- 世界书 entry 的 `extensions`、`priority`、`case_sensitive` 等兼容字段没有完整保留。

低优先级：

- 正则 enum 缺少 deprecated `MD_DISPLAY = 0`。
- `delayUntilRecursion` 默认值与 SillyTavern 新模板不同。
- `talkativeness` 可考虑允许 string / number 或保留原始类型。

## 预设系统新功能建议

建议新增一个独立模块，而不是把预设混进 `CharacterCard`：

- `src\Preset.ts`
- `src\PresetManager.ts` 或 `src\presets.ts`
- `src\OpenAIPromptManager.ts` 或放在 `src\presets\openai.ts`
- `src\LogitBiasPreset.ts` 或放在 `src\presets\logit-bias.ts`
- Node I/O 可在 `src\io.ts` 增加 `loadPreset` / `savePreset`，或在 `parsecard/node` 下导出。

建议的类型层次：

```ts
type PresetApiId =
  | "kobold"
  | "koboldhorde"
  | "novel"
  | "textgenerationwebui"
  | "openai"
  | "instruct"
  | "context"
  | "sysprompt"
  | "reasoning";

interface BasePreset {
  name?: string;
  extensions?: Record<string, unknown>;
  [key: string]: unknown;
}

type SillyTavernPreset =
  | KoboldPreset
  | NovelAIPreset
  | TextGenPreset
  | OpenAIPreset
  | InstructPreset
  | ContextPreset
  | SystemPromptPreset
  | ReasoningTemplate;
```

设计原则：

- 对 OpenAI / TextGen 这类变化快的 preset，提供宽松类型和无损保留。
- 对 instruct / context / sysprompt / reasoning 这类结构稳定的模板，提供更明确的类或 helper。
- 对 OpenAI Prompt Manager，单独建模 `prompts` 和 `prompt_order`，不要把它简化成普通字符串 prompt。
- 对 logit bias，区分 OpenAI preset 中的 `bias_preset_selected` 和独立的 `bias_presets` 定义表。
- 默认 `toJSON()` 不删除未知字段。
- 提供 `extensions` 的 get/set path helper，贴近 SillyTavern 的 `readPresetExtensionField` / `writePresetExtensionField`。
- 读文件时可以根据 `apiId` 明确解析；如果没有 `apiId`，用字段特征猜测类型。
- 支持 Master Import/Export 组合结构，至少能识别和拆出 `instruct`、`context`、`sysprompt`、`preset`、`reasoning`、`srw`。
- 支持 PromptManager 的独立导入/导出结构：`{ version, type, data: { prompts, prompt_order } }`。
- 支持 logit bias preset 的独立数组文件：`OpenAILogitBiasEntry[]`。

建议优先级：

1. 先修 PNG `ccv3`，这是实际读写 bug。
2. 做无损保留框架：角色卡 data extras、extensions extras、世界书 metadata、entry extras。
3. 新增 preset 基础读写能力，先覆盖 `instruct`、`context`、`sysprompt`、`reasoning`。
4. 再覆盖 TextGen / Kobold / NovelAI / OpenAI 的宽松类型。
5. 补 OpenAI Prompt Manager 的 `prompts` / `prompt_order` helper。
6. 补 logit bias preset 数组文件读写。
7. 最后补 Master Import/Export 和 preset extensions helper。

## 测试建议

角色卡/PNG：

- 构造同时含 `chara` 与旧 `ccv3` 的 PNG，写入后确认 SillyTavern 会读取新数据。
- 读取只有 `ccv3` 的 PNG。
- 读取写回后确认 `data.group_only_greetings` 和未知 `extensions.*` 不丢失。

世界书：

- 独立世界书保留 `description`、`recursiveScanning`、`scanDepth`、`tokenBudget`、`originalData`。
- 内嵌 `character_book` 保留 `extensions` 和 book-level metadata。
- entry 保留未知字段和 `extensions`。

预设：

- 逐类读取 `default\content\presets` 下的默认 JSON。
- 逐类读取本地用户目录旧版本 JSON。
- 对 `1.12.3` instruct 做迁移兼容测试。
- 对 OpenAI preset 做 unknown field round-trip。
- 对 OpenAI `prompts` / `prompt_order` 做 round-trip，确认默认 12 个 prompt 和多个 `character_id` 分组不丢失。
- 对旧 `main_prompt` / `nsfw_prompt` / `jailbreak_prompt` 做迁移测试。
- 对 PromptManager 单独导出的 `{ version, type, data }` 文件做导入解析测试。
- 对 logit bias 单独数组文件做导入导出测试，确认 `{ id, text, value }` 保留，没有 `id` 时可补 uuid。
- 对 OpenAI preset 只有 `bias_preset_selected`、没有 `bias_presets` 的情况做兼容测试。
- 对 preset `extensions.regex_scripts` 做读写测试。
