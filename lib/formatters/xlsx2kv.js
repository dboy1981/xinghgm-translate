// 把指定目录中的xlsx文件根据要求合并成一个key value 格式的xlsx文件
const fs = require('fs-extra')
const path = require('path')
const xlsx = require('../utils/xlsx')
const { normalizeKeyString } = require('../utils/textNormalize')
const SAVE_DATA = Symbol('SAVE_DATA')
const READ_CELL = Symbol('READ_CELL')
const READ_HEADER = Symbol('READ_HEADER')
const READ_DIR = Symbol('READ_DIR')
const READ_FILE = Symbol('READ_FILE')
const MUST_CONTAINS = Symbol('MUST_CONTAINS')

class Xlsx2KvFormatter {
  constructor(options) {
    this.init(options)
    // 默认表头
    this.header = [this.options.key_name, this.options.src_name, this.options.val_name, 'filename', 'sheetname']
    this.data = []
    this.current = {
      sheetname: null,
      filename: null,
      header_index: [],
      header_val: [],
      key_column_index: [],
    }
  }

  init(options) {
    // 如果key_column_names和key_column_index都为空，代表全文本作为key
    this.options = Object.assign({}, {
      key_name: 'key',
      val_name: 'val',
      src_name: 'src',
      sheet_filter: [],
      sheet_name_contains: [],
      key_column_names: [],   // 需要作为key值的列名，不做是否重复检查，防止漏读非第一行表头索引
      key_column_index: [],   // 需要作为key值的列索引
      header: [],             // 额外表头，不做是否重复检查，防止漏读非第一行表头索引
      header_index: [],
      readline: null,         // 读取每一行的回调函数
      key_filter: null,       // key过滤函数
    }, options)
    // 操作目录
    if(!this.options.dir) {  
      throw new Error('dir is required')
    }
    if(!this.options.output_filepath) {  
      throw new Error('output_filepath is required')
    }
  }

  [SAVE_DATA]() {
    if(this.data.length == 0) return;
    console.log('save data to', this.options.output_filepath)
    const header = [...this.header, ...this.options.header, ...this.options.header_index]
    if(this.options.debug) {
      console.log('header', header)
      console.log('data', this.data)
    }
    xlsx.writeXlsx(this.options.output_filepath, this.data, '', {header})
  }

  [READ_HEADER](sheet, z, sheetname, filename) {
    let isHeader = false;
    if(this.current.sheetname !== sheetname || this.current.filename !== filename) {
      this.current.sheetname = sheetname
      this.current.filename = filename
      this.current.header_index = this.options.header_index || this.options.header.map(() => '')
      this.current.header_val = this.current.header_index.map(() => '')
      this.current.key_column_index = this.options.key_column_names.map(() => '')
    }

    let key = sheet[z].v
    key = normalizeKeyString(key)
    if(!key) return isHeader;

    const index = this.options.header.indexOf(key)
    if(index > -1 && !this.current.header_index[index]) {
      isHeader = true
      this.current.header_index[index] = z[0]
    }

    const key_column_index = this.options.key_column_names.indexOf(key)
    if(key_column_index > -1) {
      isHeader = true
      this.current.key_column_index[key_column_index] = z[0]
    }
    return isHeader;
  }

  [READ_CELL](sheet, z, sheetname, filename) {
    if(!sheet[z] || !sheet[z].v){
      return null
    }

    // 解析表头和key列索引
    if(this[READ_HEADER](sheet, z, sheetname, filename)){
      return null
    }

    // 判断是否是key列
    if(this.current.key_column_index.indexOf(z[0]) > -1 || this.options.key_column_index.indexOf(z[0]) > -1) {
      if(typeof this.options.key_filter === 'function') {
        if(!this.options.key_filter(sheet[z].v, sheet, z)) {
          return null
        }
      }
      const row = {
        [this.header[0]]: sheet[z].v,
        [this.header[1]]: sheet[z].v,
        [this.header[2]]: '',
        [this.header[3]]: filename,
        [this.header[4]]: sheetname,
      }

      // 读取这一列的所有额外header值
      for(let i = 0; i < this.current.header_index.length; i++) {
        const header_z = this.current.header_index[i] + z.substring(1)
        if(sheet[header_z]) {
          this.current.header_val[i] = sheet[header_z].v
          row[this.options.header[i] || this.options.header_index[i]] = this.current.header_val[i]
        }
        
      }
      if(typeof this.options.readline === 'function') {
        this.options.readline(row, sheet, z)
      }
      return row
    }
    return null
  }

  [MUST_CONTAINS](sheetname) {
    if(this.options.sheet_name_contains.length == 0) return true;
    for(let name of this.options.sheet_name_contains) {
      if(sheetname.indexOf(name) > -1) {
        return true
      }
    }
    return false
  }

  [READ_FILE](filepath) {
    const filename = path.basename(filepath)
    const workbook = xlsx.readWorkbook(filepath)
    for(var sheetname of workbook.SheetNames) {
      if((this.options.sheet_filter.length > 0 && this.options.sheet_filter.indexOf(sheetname) == -1) || !this[MUST_CONTAINS](sheetname)) {
        continue
      }
      const sheet = workbook.Sheets[sheetname]
      for(var z in sheet) {
        if(z[0] === '!') {
          continue;
        }
        const row = this[READ_CELL](sheet, z, sheetname, filename)
        if(row) {
          if(this.options.debug) {
            console.log(row)
          }
          this.data.push(row)
        }
      }
    }
  }

  [READ_DIR](filepath) {
    const files = fs.readdirSync(filepath || this.options.dir)
    for(let filename of files) {
      if(filename.startsWith('.')) continue;
      const child_filepath = (filepath || this.options.dir) + '/' + filename
      console.log('read file: ', child_filepath)
      if(fs.statSync(child_filepath).isDirectory()){
        this[READ_DIR](child_filepath)
      } else {
        var ext = path.extname(child_filepath);
        if(ext == '.xls' || ext == '.xlsx' || ext == '.xlsm')
          this[READ_FILE](child_filepath)
      }
    }
  }

  async run() {
    this[READ_DIR]()
    this[SAVE_DATA]()
  }

}

module.exports = Xlsx2KvFormatter
