# 星痕翻译文件处理

以 dist 目录中的 xlsx 文件作为标准翻译数据，根据 key_name 主键匹配，将 src 目录中相同 key 的指定列单元格值替换为标准值，输出到 result 目录，不修改 src 源文件。

## 安装

```bash
npm install
```

## 快速开始

1. 在项目根目录下创建 `dist`、`src`、`result` 目录
2. 将标准翻译文件放入 `dist`，待更新文件放入 `src`
3. 运行：

```bash
node scripts/translate.js <项目根路径> [config.json]
# 或
npm run translate -- <项目根路径>
```

## 配置

通过 `config.json` 指定 `key_name`、`update_column_names`、`val_name` 等，详见 `config.example.json` 或 SKILL.md。

## 目录结构

```
xinghgm-translate/
├── package.json
├── SKILL.md
├── config.example.json
├── lib/
└── scripts/
    └── translate.js
```
