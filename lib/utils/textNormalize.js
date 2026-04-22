/**
 * 跨平台 / Excel 粘贴常见噪声：统一换行、去掉零宽与 BOM，便于主键一致与输出稳定。
 */

// ZWSP、ZWJ、ZWNJ、BOM；行/段分隔符在部分表或复制来源中会出现
const INVISIBLE_NOISE = /[\u200B-\u200D\uFEFF\u2028\u2029]/g

function stripLeadingBom(s) {
  if (s.length > 0 && s.charCodeAt(0) === 0xfeff) {
    return s.slice(1)
  }
  return s
}

/**
 * 与历史逻辑一致：去掉全部「空白类」字符后做匹配（并额外去掉零宽、BOM、Unicode 换行符）。
 * 先做 NFC，减少 macOS/Windows 下组合字符分解不一致导致的键不一致。
 */
function normalizeKeyString(input) {
  if (input == null) return ''
  let s = String(input)
  s = stripLeadingBom(s)
  s = s.replace(INVISIBLE_NOISE, '')
  if (typeof s.normalize === 'function') {
    s = s.normalize('NFC')
  }
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  return s.replace(/\s/g, '')
}

/**
 * 写入翻译列：统一为 \n；去 BOM/零宽；去掉每行行尾空白，避免 Win/Mac 互拷产生「看不见的空格」。
 */
function normalizeTranslationOutput(input) {
  if (input == null) return ''
  let s = String(input)
  s = stripLeadingBom(s)
  s = s.replace(INVISIBLE_NOISE, '')
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  return s
    .split('\n')
    .map((line) => line.replace(/[\s\u00a0\u2000-\u200a\u3000]+$/g, ''))
    .join('\n')
}

module.exports = {
  normalizeKeyString,
  normalizeTranslationOutput,
}
