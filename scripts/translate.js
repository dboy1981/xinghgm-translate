#!/usr/bin/env node
/**
 * 星痕翻译文件处理脚本
 * 
 * 功能：以 dist 目录中的文件作为标准，根据 key_name 主键匹配，
 * 替换 src 目录中相同 key 的 update_column_names 单元格值，
 * 输出到 result 目录，不修改 src 源文件。
 * 
 * 用法：node translate.js <项目根路径> [config路径]
 * 示例：node translate.js /path/to/XingHGM
 *       node translate.js /path/to/XingHGM ./config.json
 */

const path = require('path')
const fs = require('fs')
const Processor = require('../lib/processors/translate')

// 获取 dist 目录中最新的 xlsx 文件（递归查找）
function findLatestDistFile(distDir) {
  if (!fs.existsSync(distDir)) return null
  let latest = null
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory() && !e.name.startsWith('.')) {
        walk(full)
      } else if (e.isFile() && /\.xlsx?$/i.test(e.name)) {
        const stat = fs.statSync(full)
        if (!latest || stat.mtimeMs > latest.mtimeMs) {
          latest = { file: full, mtimeMs: stat.mtimeMs }
        }
      }
    }
  }
  walk(distDir)
  return latest ? latest.file : null
}

// 加载配置
function loadConfig(projectRoot, configPath) {
  const defaultConfig = {
    key_name: ['要翻译的内容', '字符串HashID'],
    key_column_names: ['要翻译的内容'],
    val_name: 'indonesian',
    update_column_names: ['indonesian'],
    debug: false,
    create_key: function (key, sheet, z) {
      const adjCell = z.replace(z[0], 'B')
      const adjVal = sheet[adjCell]?.v
      if (!adjVal) return key
      return key + '_' + adjVal.toString().replace(/[\s ]/gi, '')
    }
  }

  let config = { ...defaultConfig }

  if (configPath && fs.existsSync(configPath)) {
    const ext = path.extname(configPath).toLowerCase()
    if (ext === '.json') {
      const json = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      config = { ...config, ...json }
    } else if (ext === '.js') {
      const mod = require(path.resolve(configPath))
      config = { ...config, ...mod }
    }
  }

  return config
}

function main() {
  const projectRoot = process.argv[2]
  const configPath = process.argv[3]

  if (!projectRoot) {
    console.error('用法: node translate.js <项目根路径> [config路径]')
    console.error('示例: node translate.js /path/to/XingHGM')
    process.exit(1)
  }

  const distDir = path.join(projectRoot, 'dist')
  const srcDir = path.join(projectRoot, 'src')
  const resultDir = path.join(projectRoot, 'result')

  if (!fs.existsSync(srcDir)) {
    console.error('错误: src 目录不存在:', srcDir)
    process.exit(1)
  }

  const config = loadConfig(projectRoot, configPath)
  const fileMapping = config.file_mapping

  fs.mkdirSync(resultDir, { recursive: true })

  const norm = (p) => p.replace(/\\/g, '/')

  if (fileMapping && Array.isArray(fileMapping) && fileMapping.length > 0) {
    console.log('======== 星痕翻译文件处理（file_mapping 模式）========')
    for (const pair of fileMapping) {
      const srcRel = norm((pair.src || pair[0] || '').trim())
      const distRel = norm((pair.dist || pair[1] || '').trim())
      if (!srcRel || !distRel) {
        console.warn('跳过无效映射:', pair)
        continue
      }
      const srcFull = path.join(srcDir, srcRel)
      const distFull = path.join(distDir, distRel)
      if (!fs.existsSync(srcFull)) {
        console.warn('src 文件不存在，跳过:', srcFull)
        continue
      }
      if (!fs.existsSync(distFull)) {
        console.warn('dist 基准文件不存在，跳过:', distFull)
        continue
      }
      console.log('处理:', srcRel, '-> 基准:', distRel)
      Processor.trans({
        key_name: config.key_name,
        dir: srcDir,
        output_dir: resultDir,
        output_filepath: distFull,
        key_column_names: config.key_column_names,
        val_name: config.val_name,
        update_column_names: config.update_column_names,
        debug: config.debug,
        create_key: config.create_key,
        file_filter: (filepath) => norm(path.relative(srcDir, filepath)) === srcRel,
        ...config.extra
      })
    }
  } else {
    const distFile = config.dist_file || findLatestDistFile(distDir)
    if (!distFile || !fs.existsSync(distFile)) {
      console.error('错误: 未找到 dist 标准文件，请确保 dist 目录中存在 .xlsx 文件，或配置 file_mapping')
      process.exit(1)
    }
    console.log('======== 星痕翻译文件处理 ========')
    console.log('标准文件:', distFile)
    console.log('源目录:', srcDir)
    console.log('输出目录:', resultDir)
    console.log('主键:', config.key_name)
    console.log('更新列:', config.update_column_names)
    console.log('================================')
    Processor.trans({
      key_name: config.key_name,
      dir: srcDir,
      output_dir: resultDir,
      output_filepath: distFile,
      key_column_names: config.key_column_names,
      val_name: config.val_name,
      update_column_names: config.update_column_names,
      debug: config.debug,
      create_key: config.create_key,
      ...config.extra
    })
  }

  console.log('处理完成，结果已保存到:', resultDir)
}

main()
