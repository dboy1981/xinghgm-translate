---
name: xinghgm-translate
description: >-
  以 dist 目录 xlsx 为标准数据源，按 key 匹配将 src 中指定列写回标准值，输出到 result，不改动 src。
  在用户提到星痕翻译、dist/src/result、Excel 翻译批量更新、file_mapping，或需用基准表刷新待译表时使用。
---

# 星痕翻译文件处理

## 概述

用 **dist** 作为标准翻译数据，按配置的 **key** 对齐 **src** 中同名行，将 **update_column_names** 列单元格替换为 dist 中 **val_name** 列的值；结果写入 **result**，**不修改 src**。

## 何时启用

- 用户要批量更新 Excel 翻译表，或提到「星痕翻译」「dist 标准 / src 待替换」。
- 项目或上传内容呈现 **dist / src / result**（或需你创建 **result**）。
- 用户描述「A 目录替换 B 目录」：将 **A → dist**、**B → src**（目录不存在则创建）。
- 用户上传 zip：可能一个包内含 dist+src，或两个包分别对应 dist / src；包内无 dist、src 时需与用户确认哪个是基准、哪个是待更新。
- 意图不清时：引导用户明确 **dist、src、文件对应关系**，以及 **update_column_names**、**val_name**。

## 执行流程

1. **工作目录**：在 `tmp/xinghgm-translate/projects` 下准备项目根，内含 `dist`、`src`、`result`（不存在则创建）。后续命令中的「项目根路径」即此目录（除非用户指定其他根路径且结构相同）。
2. **解压与归类**：将用户提供的 zip 解压到合适位置；若用户用「目录 A / 目录 B」表述，按上文映射到 dist / src。
3. **配置**：若缺少 `config.json`，根据目录内 xlsx 与用户口述列名，对照 `config.example.json` 生成；配置路径可为 **`.json` 或 `.js`**（脚本均支持）。
4. **依赖**：在**本仓库根**执行 `npm install`（若尚未安装）。
5. **运行**：从**本仓库根**执行  
   `node scripts/translate.js <项目根路径> [config路径]`  
   或使用 `npm run translate -- <项目根路径> [config路径]`。
6. **交付**：向用户说明结果在 `<项目根路径>/result`，**src 未被改写**。

## 自然语言 → 配置

| 用户说法 | 配置含义 |
|----------|----------|
| 「翻译 indonesian 这一列」 | `update_column_names`: `["indonesian"]`；未另说明时 `val_name` 与脚本默认或用户确认的 dist 标准列一致 |
| 「A 目录 englishtw 列替换 B 目录的 indonesian 列」 | `update_column_names`: `["indonesian"]`，`val_name`: `"englishtw"` |
| 未提供 config | 结合目录结构与上表规则编写 `config.json` |

## 约束与禁区

- **列名 `english`**：`val_name` 与 `update_column_names` 中**不要**使用字面量 `english`。若用户坚持「英文列」，提醒将表头改为 **`英文翻译`**（或等效列名），并在 config 中使用该列名。
- **主键列内容**：**严禁**修改或删除 **key_name** 所对应表格列中的单元格内容（只替换 **update_column_names** 指定列）。
- **key_name**：默认与 `scripts/translate.js` 内 `defaultConfig.key_name` 一致；**用户未明确要求时不要改动**（与 `config.example.json` 保持一致即可）。

## 配置项

| 配置项 | 说明 | 示例 |
|--------|------|------|
| key_name | 主键列名（可为数组） | `["要翻译的内容","字符串HashID"]` |
| key_column_names | 参与匹配的列名 | `["要翻译的内容"]` |
| val_name | dist 中取值列名 | `"indonesian"` |
| update_column_names | src 中要写入的列名 | `["indonesian"]` |
| create_key | 可选，自定义 key 生成逻辑 | 见脚本内默认实现 |
| file_mapping | 多文件时 src 与 dist **一一对应**（文件名可不同） | 见下文 |
| dist_file | 单文件模式指定 dist 文件；留空则递归取 dist 下**最新修改**的 xlsx | `""` 或路径 |

### file_mapping（多基准文件）

当 dist 内多个基准文件与 src 多文件一一对应、且**文件名不一致**时使用：

```json
{
  "file_mapping": [
    { "src": "src 相对路径/文件.xlsx", "dist": "dist 相对路径/基准.xlsx" }
  ]
}
```

- `src`：相对于项目根下 `src/` 的路径。  
- `dist`：相对于项目根下 `dist/` 的路径。  

示例：src 中 `我的配置表.xlsx` 对应 dist 中 `en/translate_config_merge.xlsx`：

```json
{ "src": "我的配置表.xlsx", "dist": "en/translate_config_merge.xlsx" }
```

## 运行示例

```bash
cd /path/to/xinghgm-translate   # 本仓库根目录
npm install

# 默认配置（项目根下须有 dist、src；result 会自动创建）
node scripts/translate.js /path/to/project-root

# 自定义配置
node scripts/translate.js /path/to/project-root ./config.json

npm run translate -- /path/to/project-root
```

## 仓库目录结构（本技能所在项目）

```
xinghgm-translate/
├── package.json
├── SKILL.md
├── config.example.json
├── lib/
│   ├── processors/
│   ├── formatters/
│   └── utils/
└── scripts/
    └── translate.js
```

用户数据目录（处理时）典型布局：

```
<项目根路径>/
├── dist/      # 标准翻译 xlsx
├── src/       # 待更新 xlsx（只读）
└── result/    # 输出（脚本会 mkdir）
```
