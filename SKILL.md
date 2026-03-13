---
name: xinghgm-translate
description: 星痕翻译文件处理。以 dist 目录中的 xlsx 文件作为标准翻译数据，根据 key_name 主键匹配，将 src 目录中相同 key 的 update_column_names 列单元格值替换为标准值，输出到 result 目录，不修改 src 源文件。适用于 Excel 翻译文件批量更新场景。
---

# 星痕翻译文件处理

## 描述

以 dist 目录中的文件作为标准翻译数据源，根据配置的 `key_name` 作为主键，匹配并替换 src 目录中相同 key 的 `update_column_names` 指定列单元格值，处理后的新文件输出到 result 目录，**不修改 src 中的源文件**。

## 使用方法

在以下场景中启用此技能：
- 用户需要批量更新 Excel 翻译文件
- 用户提到「星痕翻译」「dist 标准文件」「src 替换」「翻译文件处理」
- 用户有 dist/src/result 目录结构的翻译项目
- 用户明确提到「星痕翻译」，但是上传的目录结构中缺少result，可以自行创建
- 用户明确提到目录A替换目录B，那么直接把目录A复制到dist目录，目录B复制到src目录，目录不存在就创建
- 如果用户没有提供config.json文件，根据目录中的文件结构自行创建config.json文件
- 如果用户说「翻译indonesian这一列」，代表config.json文件中update_column_names:['indonesian']
- 如果用户说「A目录englishtw列替换B目录的indonesian这一列」，代表config.json文件中update_column_names:['indonesian']，val_name:'englishtw'
- 重点注意：val_name和update_column_names值不能是english，如果用户提出翻译（替换）english列，提醒用户修改，或者你帮用户修改excel表中的列名，把english改成'英文翻译'
- 用户提到「星痕翻译」等待或者提醒用户上传zip包，可能是两个zip包，也可能是单个zip包（里面包含「dist 标准文件」「src 替换」），如果zip包中没有dist和src目录，说明用户dist和src分成两个包上传，根据用户提示确认dist和src包
- 如果用户说的不清楚，引导用户说出具体的dist，src，映射关系，以及需要翻译的列名update_column_names和val_name

## 指令

执行星痕翻译文件处理时：

1. **创建工作目录**：每次处理翻译，必须在 `tmp/xinghgm-translate/projects` 下创建 `dist`、`src`、`result` 目录结构；目录不存在则创建，项目根路径即 `tmp/xinghgm-translate/projects`
2. **确认目录结构**：项目需包含 `dist`（标准文件）、`src`（待更新文件）、`result`（输出目录）
3. **运行脚本**：`node scripts/translate.js <项目根路径> [config.json]`，项目根路径为 `tmp/xinghgm-translate/projects`
4. **配置说明**：可通过 `config.json` 或脚本内默认配置指定 、`update_column_names`、`val_name` 等， `key_name` 不能修改只能用默认值

### 配置项

| 配置项 | 说明 | 示例 |
|--------|------|------|
| key_name | 主键列名（可数组） | `['要翻译的内容','字符串HashID']` |
| key_column_names | 作为 key 匹配的列名 | `['要翻译的内容']` |
| val_name | 标准文件中取值列名 | `'indonesian'` |
| update_column_names | 需要更新的列名 | `['indonesian']` |
| create_key | 可选，自定义 key 生成函数 | 见 config.js |
| **file_mapping** | **src 与 dist 一一对应**（文件名可不同） | 见下方 |
| dist_file | 单文件模式时指定 dist 文件 | 留空则自动取最新 |

### file_mapping：多 dist 与 src 一一对应

当 dist 有多个基准文件，且与 src 一一对应但**文件名不同**时，使用 `file_mapping`：

```json
{
  "file_mapping": [
    { "src": "src中的文件名.xlsx", "dist": "dist子路径/基准文件名.xlsx" },
    { "src": "子目录/另一文件.xlsx", "dist": "en/对应基准.xlsx" }
  ]
}
```

- `src`：相对于 `src/` 的路径
- `dist`：相对于 `dist/` 的路径

**文件名不同示例**：src 中 `我的配置表.xlsx` 对应 dist 中 `en/translate_config_merge.xlsx`：
```json
{ "src": "我的配置表.xlsx", "dist": "en/translate_config_merge.xlsx" }
```

### 运行示例

```bash
# 使用默认配置（项目根路径下的 dist/src/result）
node scripts/translate.js /path/to/XingHGM

# 使用自定义配置
node scripts/translate.js /path/to/XingHGM ./config.json

# 或使用 npm run
npm run translate -- /path/to/XingHGM
```

## 目录结构

```
xinghgm-translate/
├── package.json
├── SKILL.md
├── config.example.json
├── lib/                    # 内置依赖，无需外部引用
│   ├── processors/
│   ├── formatters/
│   └── utils/
└── scripts/
    └── translate.js
```
