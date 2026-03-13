const Formatter = require('../formatters/xlsx2kv')
const TransFormatter = require('../formatters/xlsxupdate')
const xlsx = require('../utils/xlsx')
const path = require('path')
const fs = require('fs')

//加载已经翻译过的文档
function loadTranslated(filepath, key_name, val_name, sheetname) {
  const translated = {}
  const data = sheetname ? xlsx.readXlsx(filepath) : xlsx.readXlsx(filepath, sheetname)
  console.log('===========loadTranslated', filepath, key_name, val_name)
  for(var item of data) {
    var key = '';
    if(Array.isArray(key_name)) {
      for(var key_item of key_name) {
        if(!item[key_item]) continue;
        if(key) {
          key += '_'
        }
        key += item[key_item].toString().replace(/[\s ]/ig, '')
      }
    } else {
      if(!item[key_name]) continue;
      key = item[key_name].toString().replace(/[\s ]/ig, '')
    }
    if(!key) continue;
    if(key && item[val_name]) {
      translated[key] = item[val_name]
      console.log('loadTranslated', key, item[val_name])
    }
  }
  return translated
}

function loadOriginal(filepath, key_name, val_name) {
  return loadTranslated(filepath, key_name, val_name)
}

var regPuncFilter = /[a-zA-Z0-9\s\·\~\！\@\#\￥\%\……\&\*\（\）\——\-\+\=\【\】\{\}\、\|\；\‘\’\：\""\《\》\？\，\。\、\`\~\!\#\$\%\^\&\*\(\)\_\[\]{\}\\\|\;\'\'\:\"\"\,\.\/\<\>\?]/ig;
const cache_del_repeat = {}
var totalLine = 0;
var totalWords = 0;
var totalLineWithoutRepeat = 0;
var totalWordsWithoutRepeat = 0;

function getSrcFile(src, distPath){
  const files = fs.readdirSync(distPath);
  let last = {};
  for(var i = 0; i < files.length; i++){
    const reg = new RegExp('cn\\-' + src + '\\.(.+?)\\.xlsx', 'ig');
    const stat = fs.statSync(path.resolve(distPath, files[i]));
    if(!stat.isFile()) continue;
    if(last.stat && stat.mtimeMs < last.stat.mtimeMs) continue;
    if(reg.test(files[i])){
      last.file = files[i];
      last.stat = stat;
    }
  }
  return last.file;
}

exports.trans = function (options) {
  const opt = Object.assign({}, {
    key_name: '关键字(请勿修改)',
    val_name: '翻译',
    del_repeat: true
  }, options || {})
  opt.data = loadTranslated(opt.output_filepath, opt.key_name, opt.val_name, opt.translated_sheetname)
  if(Array.isArray(opt.add_data)) {
    for(var item of opt.add_data) {
      opt.data[item.key] = item.val
    }
  }
  const formatter = new TransFormatter(opt)
  formatter.run()
}

exports.create = function (options) {
  const opt = Object.assign({}, {
    key_name: '关键字(请勿修改)',
    src_name: '原文',
    val_name: '翻译',
    del_repeat: true
  }, options || {})
  const translated = loadTranslated(opt.output_filepath, opt.key_name, opt.val_name)
  if(opt.src) {
    const distDir = path.dirname(opt.output_filepath)
    let src_filename = getSrcFile(opt.src, distDir);
    console.log('===========', src_filename, distDir, opt.src)
    if(src_filename) {
      opt.src_filepath = path.resolve(distDir, src_filename);
      console.log('src_filepath: ' + opt.src_filepath);
    }
  }
  let original = null
  if(opt.src_filepath) {
    original = loadOriginal(opt.src_filepath, opt.key_name, opt.val_name)
  }
  opt.readline = function(line) {
    if(typeof options.readline === 'function') {
      options.readline(line)
    }
    if(translated[line[opt.key_name]]) {
      line[opt.val_name] = translated[line[opt.key_name]]
    }
    if(original && original[line[opt.key_name]]) {
      line[opt.src_name] = original[line[opt.key_name]]
    }
  }
  opt.key_filter = function(key, sheet, z) {
    totalLineWithoutRepeat++;
    if(typeof options.key_filter === 'function') {
      const filteredKey = options.key_filter(key, sheet, z)
      if(!filteredKey) return null;
      key = filteredKey;
    }
    if(!key) return null;
    
    const cleanKey = key.toString().replace(/[\s ]/ig, '');
    totalWordsWithoutRepeat += cleanKey.replace(regPuncFilter, '').length;
    
    if(opt.del_repeat) {
      if(cache_del_repeat[cleanKey]) {
        return null
      }
      cache_del_repeat[cleanKey] = true
    }
    
    totalLine++;
    totalWords += cleanKey.replace(regPuncFilter, '').length;
    return key
  }
  const formatter = new Formatter(opt)
  formatter.run()
  console.log('totalWords', totalWords)
  console.log('totalWordsWithRepeat', totalWordsWithoutRepeat)
  console.log('totalLine', totalLine)
  console.log('totalLineWithRepeat', totalLineWithoutRepeat)
}
