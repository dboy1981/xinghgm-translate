/**
 * 与业务侧 C# FormatLineEnding 对齐：换行统一、Excel 占位换行、整段 trim。
 * 参考：Regex (?:\r\n|\n\r|\r|\n|_x000d_|_x000a_)+ → \n，再 Trim / 去首尾换行与制表。
 */

// ZWSP、ZWJ、ZWNJ、BOM；Unicode 行/段分隔（Excel/复制来源）
const INVISIBLE_NOISE = /[\u200B-\u200D\uFEFF\u2028\u2029]/g

/** 与 C# 一致：各类换行与 Excel XML 转义式换行合并为 \n（连续段合并为单个 \n） */
const LINE_BREAK_RUN = /(?:\r\n|\n\r|\r|\n|_x000d_|_x000a_)+/gi

function stripLeadingBom(s) {
  if (s.length > 0 && s.charCodeAt(0) === 0xfeff) {
    return s.slice(1)
  }
  return s
}

/**
 * 统一换行并去掉首尾空白（含空格、\t、\r、\n），与 FormatLineEnding 行为一致。
 * @param {string|null|undefined} str
 * @returns {string}
 */
function formatLineEnding(str) {
  if (str == null || str === '') {
    return str === null || str === undefined ? '' : str
  }
  let s = String(str)
  s = s.replace(LINE_BREAK_RUN, '\n')
  s = s.trim()
  // 与 C# TrimEnd('\n','\r','\t').TrimStart(...) 等价补充：trim 后若仍仅剩换行/制表
  s = s.replace(/^[\n\r\t]+/, '').replace(/[\n\r\t]+$/, '')
  return s
}

/**
 * 主键匹配：先走与导出一致的换行归一（含 _x000d_），再去掉全部空白类字符；并去零宽、BOM、NFC。
 */
function normalizeKeyString(input) {
  if (input == null) return ''
  let s = String(input)
  s = stripLeadingBom(s)
  s = s.replace(INVISIBLE_NOISE, '')
  if (typeof s.normalize === 'function') {
    s = s.normalize('NFC')
  }
  s = s.replace(LINE_BREAK_RUN, '\n')
  return s.replace(/\s/g, '')
}

/**
 * 写入翻译列：与 FormatLineEnding 一致，并去 BOM / 零宽字符。
 */
function normalizeTranslationOutput(input) {
  if (input == null) return ''
  let s = String(input)
  s = stripLeadingBom(s)
  s = s.replace(INVISIBLE_NOISE, '')
  return formatLineEnding(s)
}

module.exports = {
  formatLineEnding,
  normalizeKeyString,
  normalizeTranslationOutput,
}
