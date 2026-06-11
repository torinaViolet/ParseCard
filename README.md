# ParseCard v2.0

**SillyTavern 角色卡、世界书、正则脚本的解析与序列化工具库**

TypeScript 实现，面向对象设计，零外部依赖，核心层同时支持 Node.js 和浏览器环境。

## 功能特性

- 🎭 **角色卡** — 面向对象的`CharacterCard` 类，支持 V2/V3 格式自动兼容，getter/setter 自动同步顶层与data冗余字段
- 📖 **世界书** — `WorldBook` + `WorldBookEntry` 类，独立/内嵌两种格式自动检测、统一解析、互转
- 🔧 **正则脚本** — `RegexScript` 类，支持独立文件和角色卡内嵌
- 🖼️ **PNG 读写** — 从 PNG tEXt chunk 中读写角色卡数据，支持无底图生成
- 📂 **文件 I/O** — 一行代码加载 PNG / JSON 文件，同步 + 异步双版本
- 🔗 **链式调用** — `card.bindWorldBook(wb).addRegexScript(script)`
- 🛡️ **鲁棒性** — 字段缺失、类型错误、null 值全面容错
- 🌐 **跨环境** — 核心层 `parsecard` 不依赖 Node.js API，浏览器可直接使用；文件 I/O 通过 `parsecard/node` 按需引入

## 安装

```bash
npm install parsecard
```

## 快速开始

### 角色卡 — 基本用法

```typescript
import { CharacterCard } from 'parsecard';

// 从 JSON 对象解析（自动兼容 V2 / V3）
const card = CharacterCard.fromJSON(jsonData);
console.log(card.name);           // 角色名
console.log(card.description);// 角色描述
console.log(card.firstMes);       // 第一条消息

// 直接属性赋值（toJSON 时自动同步顶层冗余字段）
card.name = '新名字';
card.description = '新描述';
card.tags = ['标签1', '标签2'];

// 序列化（输出 SillyTavern 兼容格式）
const output = card.toJSON();
```

### 角色卡 — 从PNG 读写

```typescript
import { CharacterCard } from 'parsecard';

// 从 PNG 二进制数据解析
const card = CharacterCard.fromPNG(pngBuffer);

// 写入 PNG（传入底图，或传null 自动生成 1×1 透明 PNG）
const pngData = card.toPNG(pngBuffer);
const pngFromScratch = card.toPNG(); // 无底图
```

### 角色卡 — Node.js 文件操作

```typescript
import {
    loadCharacterCard,
    loadCharacterCardAsync,
    saveCharacterCard,
    saveCharacterCardAsync,
} from 'parsecard/node';

// 一行加载（自动识别 PNG / JSON 格式）
const card = loadCharacterCard('角色卡.png');

// 修改
card.name = '修改后的角色';
card.fav = true;

// 保存（根据扩展名自动选择格式）
saveCharacterCard(card, 'output.png');
saveCharacterCard(card, 'output.json');

// 异步版本
const card2 = await loadCharacterCardAsync('角色卡.json');
await saveCharacterCardAsync(card2, 'output.png');
```

### 世界书

```typescript
import { WorldBook, WorldBookEntry, WorldBookEntryPosition, TriggerType } from 'parsecard';

// 自动检测格式解析（独立 / 内嵌）
const wb = WorldBook.fromJSON(jsonData);

// 也可明确指定格式
const wb1 = WorldBook.fromStandaloneJSON(rawStandalone);
const wb2 = WorldBook.fromEmbeddedJSON(rawEmbedded);

// 条目操作
const entry = wb.addEntry({ comment: '新条目', content: '内容', keys: ['关键词'] });
wb.removeEntry(entry.uid);

// 查询
const constants = wb.findConstant();     // 蓝灯条目
const depthEntries = wb.findDepth();                                     // 深度插入
const beforeChar = wb.findByPosition(WorldBookEntryPosition.BEFORE_CHAR); // 按位置
const custom = wb.findEntries(e => e.probability< 50);                  // 自定义条件

// 条目触发类型管理
entry.triggerType = TriggerType.CONSTANT;// 设为蓝灯
entry.disable();                           // 禁用
entry.enable();                            // 启用

// 合并两个世界书
const merged = wb.merge(otherBook, '合并后的名称');

// 格式互转
const standalone = wb.toStandaloneJSON();   // 独立格式
const embedded = wb.toEmbeddedJSON();       // 内嵌格式

// 人类可读描述
console.log(wb.describe());
```

### 正则脚本

```typescript
import { RegexScript, RegexPlacement, SubstituteRegex } from 'parsecard';

// 解析
const script = RegexScript.fromJSON(jsonData);
console.log(script.scriptName);
console.log(script.findRegex);

// 创建
const newScript = RegexScript.create({
    scriptName: '我的正则',
    findRegex: '\\*\\*(.*?)\\*\\*',
    replaceString: '<b>$1</b>',
    placement: [RegexPlacement.AI_OUTPUT],
    markdownOnly: true,
});

// 启用/禁用
newScript.disable();
newScript.enable();

// 克隆（生成新ID）
const cloned = newScript.clone();

// 序列化
const output = newScript.toJSON();
```

### 绑定操作（链式调用）

```typescript
import { CharacterCard, WorldBook, RegexScript } from 'parsecard';

const card = CharacterCard.create({ name: '新角色' });
const wb = WorldBook.fromJSON(rawWorldBook);
const script = RegexScript.fromJSON(rawScript);

// 链式绑定
card
    .bindWorldBook(wb)
    .addRegexScript(script);

// 访问
console.log(card.characterBook?.name);  // 世界书名称
console.log(card.regexScripts.length);  // 正则脚本数量

// 解绑
const detachedBook = card.unbindWorldBook();
const detachedScripts = card.unbindRegexScripts();
```

### Node.js 文件操作汇总

```typescript
import {
    // 角色卡
    loadCharacterCard, loadCharacterCardAsync,
    saveCharacterCard, saveCharacterCardAsync,
    // 世界书
    loadWorldBook, loadWorldBookAsync,
    saveWorldBook, saveWorldBookAsync,
    // 正则脚本
    loadRegexScript, loadRegexScriptAsync,
    saveRegexScript, saveRegexScriptAsync,
} from 'parsecard/node';
```

## 导入方式

```typescript
// 核心功能（浏览器 + Node.js 通用）
import { CharacterCard, WorldBook, RegexScript } from 'parsecard';

// 文件 I/O（仅 Node.js）
import { loadCharacterCard, saveCharacterCard } from 'parsecard/node';
```

### 时间戳兼容

`CharacterCard.fromJSON()` 和 `normalizeTimestamp()` 会将以下 `create_date` 输入规范化为 ISO 8601 UTC：

- ISO 8601 和其他 JavaScript 可解析的日期字符串。
- 10 位 Unix 秒数字或数字字符串。
- 13 位 Unix 毫秒数字或数字字符串。
- 旧版使用的 `"{10 位 Unix 秒}Z"` 格式。

无法解析的输入保持向后兼容，会回退为当前时间。`CharacterCard.toJSON({ create_date })`
也接受字符串、Unix 秒或 Unix 毫秒。

## API 概览

### `CharacterCard`

| 方法 / 属性 | 说明 |
|---|---|
| `CharacterCard.fromJSON(raw)` | 从 JSON 对象解析（V2/V3 自动兼容） |
| `CharacterCard.fromPNG(buffer)` | 从 PNG 二进制数据解析 |
| `CharacterCard.create(overrides?)` | 创建空白角色卡 |
| `.name`, `.description`, `.personality`, `.scenario` | 基本属性（getter/setter） |
| `.firstMes`, `.mesExample`, `.creatorNotes` | 消息与注释 |
| `.systemPrompt`, `.postHistoryInstructions` | 提示词 |
| `.tags`, `.creator`, `.characterVersion` | 元数据 |
| `.alternateGreetings` | 替代问候语 |
| `.talkativeness`, `.fav`, `.world`, `.depthPrompt` | 扩展属性 |
| `.characterBook` | 获取内嵌世界书（`WorldBook \| null`） |
| `.bindWorldBook(wb)` | 绑定世界书 |
| `.unbindWorldBook()` | 解绑世界书 |
| `.regexScripts` | 获取正则脚本列表 |
| `.addRegexScript(script)` | 添加正则脚本 |
| `.removeRegexScript(id)` | 移除正则脚本 |
| `.bindRegexScripts(scripts)` | 批量绑定正则脚本 |
| `.unbindRegexScripts()` | 解绑所有正则脚本 |
| `.toJSON(options?)` | 序列化为 SillyTavern 兼容 JSON|
| `.toPNG(sourceImage?, options?)` | 写入 PNG |
| `.clone()` | 深拷贝 |

### `WorldBook`

| 方法 / 属性 | 说明 |
|---|---|
| `WorldBook.fromJSON(raw)` | 自动检测格式解析 |
| `WorldBook.fromStandaloneJSON(raw)` | 解析独立格式 |
| `WorldBook.fromEmbeddedJSON(raw)` | 解析内嵌格式 |
| `WorldBook.create(name?)` | 创建空白世界书 |
| `.name`, `.entries`, `.length` | 基本属性 |
| `.addEntry(overrides?)` | 添加条目 |
| `.removeEntry(uid)` | 移除条目 |
| `.getEntry(uid)` | 按uid 获取 |
| `.findEntries(predicate)` | 自定义查询 |
| `.findConstant()` | 蓝灯条目 |
| `.findVectorized()` | 向量化条目 |
| `.findDepth()` | 深度插入条目 |
| `.findByPosition(pos)` | 按位置查询 |
| `.findByTriggerType(type)` | 按触发类型 |
| `.reindex()` | 重编uid/displayIndex |
| `.merge(other, name?)` | 合并世界书 |
| `.toStandaloneJSON()` | 导出独立格式 |
| `.toEmbeddedJSON()` | 导出内嵌格式 |
| `.describe()` | 人类可读描述 |
| `.clone()` | 深拷贝 |

### `WorldBookEntry`

| 方法 / 属性 | 说明 |
|---|---|
| `.uid`, `.keys`, `.secondaryKeys`, `.comment`, `.content` | 基本属性 |
| `.constant`, `.selective`, `.enabled`, `.position`, `.depth`, `.role` | 行为属性 |
| `.triggerType` | 触发类型（getter/setter，自动管理 constant/vectorized） |
| `.isEnabled` | 是否已启用 |
| `.enable()` / `.disable()` | 启用/禁用 |
| `.describe()` | 人类可读描述 |
| `.clone()` | 深拷贝 |

### `RegexScript`

| 方法 / 属性 | 说明 |
|---|---|
| `RegexScript.fromJSON(raw)` | 从 JSON 解析 |
| `RegexScript.create(overrides?)` | 创建新脚本 |
| `.id`, `.scriptName`, `.findRegex`, `.replaceString` | 基本属性 |
| `.placement`, `.disabled`, `.markdownOnly`, `.promptOnly` | 行为属性 |
| `.isEnabled` | 是否已启用 |
| `.enable()` / `.disable()` | 启用/禁用 |
| `.toJSON()` | 序列化|
| `.clone()` | 深拷贝（生成新 ID） |

## 枚举常量

### 世界书插入位置 `WorldBookEntryPosition`

| 值 | 常量 | 说明 |
|----|------|------|
| 0 | `BEFORE_CHAR` | 角色定义之前 |
| 1 | `AFTER_CHAR` | 角色定义之后 |
| 2 | `BEFORE_AUTHOR_NOTE` | 作者注释之前 |
| 3 | `AFTER_AUTHOR_NOTE` | 作者注释之后 |
| 4 | `AT_DEPTH` | 在深度插入 |
| 5 | `BEFORE_EXAMPLE_MESSAGES` | 示例消息前 |
| 6 | `AFTER_EXAMPLE_MESSAGES` | 示例消息后 |
| 7 | `OUTLET` |锚点 |

### 选择逻辑 `SelectiveLogic`

| 值 | 常量 | 说明 |
|----|------|------|
| 0 | `AND_ANY` | 与任意 |
| 1 | `NOT_ALL` | 非所有 |
| 2 | `NOT_ANY` | 非任何 |
| 3 | `AND_ALL` | 与所有 |

### 角色身份 `EntryRole`

| 值 | 常量 | 说明 |
|----|------|------|
| 0 | `SYSTEM` | 系统 |
| 1 | `USER` | 用户 |
| 2 | `ASSISTANT` | AI|

### 正则作用范围 `RegexPlacement`

| 值 | 常量 | 说明 |
|----|------|------|
| 1 | `USER_INPUT` | 用户输入 |
| 2 | `AI_OUTPUT` | AI 输出 |
| 3 | `SLASH_COMMAND` | 快捷命令 |
| 5 | `WORLD_INFO` | 世界信息 |
| 6 | `REASONING` | 推理 |

### 正则宏替换 `SubstituteRegex`

| 值 | 常量 | 说明 |
|----|------|------|
| 0 | `NONE` | 不替换 |
| 1 | `RAW` | 替换（原始） |
| 2 | `ESCAPED` | 替换（转义） |

### 触发器`EntryTrigger`

| 值 | 说明 |
|----|------|
| `normal` | 正常生成 |
| `continue` | 继续生成 |
| `impersonate` | AI 帮答|
| `swipe` | 滑动 |
| `regenerate` | 重新生成 |
| `quiet` | 静默 |

### 触发类型 `TriggerType`

| 值 | 说明 |
|----|------|
| `keyword` | 关键词触发（绿灯） |
| `constant` | 常驻触发（蓝灯） |
| `vectorized` | 向量化触发 |

## 错误处理

```typescript
import { ParseCardError, InvalidFormatError, PNGError, FileIOError } from 'parsecard';

try {
    const card = CharacterCard.fromPNG(brokenBuffer);
} catch (e) {
    if (e instanceof PNGError) {
        // PNG 格式问题
    } else if (e instanceof InvalidFormatError) {
        // JSON 结构问题
    }
}
```

| 错误类 | code | 说明 |
|--------|------|------|
| `ParseCardError` | — | 基础错误类 |
| `InvalidFormatError` | `INVALID_FORMAT` | JSON 格式/结构无效 |
| `PNGError` | `PNG_ERROR` | PNG 文件格式错误 |
| `FileIOError` | `FILE_IO_ERROR` | 文件读写失败（仅 `parsecard/node`） |

## 数据模型

### 世界书两种格式差异

本库内部使用**统一格式**，解析时自动处理两种 SillyTavern 格式的差异：

| 差异项 | 独立世界书 | 内嵌 character_book |
|--------|-----------|-------------------|
| entries类型 | Object `{"0":{}}` | Array `[{}]` |
| ID 字段 | `uid` | `id` |
| 主关键词 | `key` | `keys` |
| 次关键词 | `keysecondary` | `secondary_keys` |
| 插入顺序 | `order` | `insertion_order` |
| 启用/禁用 | `disable`（反向） | `enabled`（正向） |
| 扩展字段 | 平铺在条目上 | 包裹在 `extensions` 中 |
| 命名风格 | camelCase | snake_case |

## v1.0 → v2.0 迁移

v2.0 是**破坏性重构**，主要变化：

| v1.0 | v2.0 |
|------|------|
| `parseCharacterCard(raw)` | `CharacterCard.fromJSON(raw)` |
| `serializeCharacterCard(card)` | `card.toJSON()` |
| `readCharacterCardFromPNG(buf)` | `CharacterCard.fromPNG(buf)` |
| `writeCharacterCardToPNG(buf, card)` | `card.toPNG(buf)` |
| `card.data.name` | `card.name` |
| `card.data.first_mes` | `card.firstMes` |
| `card.data.extensions.fav` | `card.fav` |
| `setName(card, '名字')` | `card.name = '名字'` |
| `bindWorldBook(card, wb)` | `card.bindWorldBook(wb)` |
| `parseWorldBook(raw)` | `WorldBook.fromJSON(raw)` |
| `parseRegexScript(raw)` | `RegexScript.fromJSON(raw)` |
| `addEntry(wb, overrides)` | `wb.addEntry(overrides)` |
| `findConstantEntries(wb)` | `wb.findConstant()` |
| `describeWorldBook(wb)` | `wb.describe()` |
| JavaScript + JSDoc | TypeScript (strict) |

## License

[Apache License 2.0](LICENSE)
