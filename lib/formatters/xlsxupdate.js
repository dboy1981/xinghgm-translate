const fs = require('fs-extra')
const path = require('path')
const xlsx = require('../utils/xlsx')

const CREATE_CELL = Symbol('CREATE_CELL')
const LOAD_UPDATE_DATA = Symbol('LOAD_UPDATE_DATA')
const UPDATE_CELL = Symbol('UPDATE_CELL')
const READ_HEADER = Symbol('READ_HEADER')
const READ_DIR = Symbol('READ_DIR')
const READ_FILE = Symbol('READ_FILE')
const MUST_CONTAINS = Symbol('MUST_CONTAINS')
const UPDATE_REF = Symbol('UPDATE_REF')
const NEXT_ALPHA = Symbol('NEXT_ALPHA')

class XlsxUpdateFormatter {
  constructor(options) {
    this.init(options)
    this.data = options.data
    this.current = {
      sheetname: null,
      filename: null,
      key_column_index: [],
      update_column_index: [],
    }
  }

  init(options) {
    this.options = Object.assign({}, {
      key_name: 'key',
      val_name: 'val',
      sheet_filter: [],
      sheet_name_contains: [],
      key_column_names: [],
      key_column_index: [],
      update_column_names: [],
      update_column_index: [],
      key_filter: null,
      update_next: false,
      file_filter: null,
    }, options)
    if(!this.options.dir) {  
      throw new Error('dir is required')
    }
    if(!this.options.output_dir) {  
      throw new Error('output_dir is required')
    }
    fs.ensureDirSync(this.options.output_dir)
  }

  [NEXT_ALPHA](alpha) {
    const charCode = alpha.charCodeAt(0)
    if(charCode === 90) {
      return 'AA'
    } else {
      return String.fromCharCode(charCode + 1)
    }
  }

  [CREATE_CELL](val, index, sheet) {
    if(!val || !index) return null;
    this[UPDATE_REF](sheet, index)
    val = val.toString()
    return { v: val,
      t: 's',
      h: val,
      w: val }
  }

  [LOAD_UPDATE_DATA]() {
    const data = xlsx.readXlsx(this.options.data_filepath)
    for(let item of data) {
      this.data[item[this.options.key_name]] = item[this.options.val_name]
    } 
  }

  [READ_HEADER](sheet, z, sheetname, filename) {
    let isHeader = false;
    if(!this.current.sheetname) {
      this.current.sheetname = sheetname
    }
    if(!this.current.filename) {
      this.current.filename = filename
    }
    if(this.current.sheetname !== sheetname || this.current.filename !== filename) {
      this.current.sheetname = sheetname
      this.current.filename = filename
      this.current.key_column_index = this.options.key_column_names.map(() => '')
      this.current.update_column_index = this.options.update_column_names.map(() => '')
    }

    let key = sheet[z].v
    key = key.toString().replace(/[\s ]/ig, '');
    if(!key) return isHeader;

    const key_column_index = this.options.key_column_names.indexOf(key)
    if(key_column_index > -1 && !this.current.key_column_index[key_column_index]) {
      isHeader = true
      this.current.key_column_index[key_column_index] = z[0]
    }
    const update_column_index = this.options.update_column_names.indexOf(key)
    if(update_column_index > -1 && !this.current.update_column_index[update_column_index]) {
      isHeader = true
      this.current.update_column_index[update_column_index] = z[0]
    }
    if(this.options.debug && isHeader) {
      console.log('key_column_index', key_column_index, this.current.key_column_index)
      console.log('update_column_index', update_column_index, this.current.update_column_index)
    }
    if(isHeader && this.options.updateHeader && this.options.update_next) {
      const updateVal = this.options.updateHeader[key]
      if(updateVal) {
        sheet[z.replace(z[0],this[NEXT_ALPHA](z[0]))] = this[CREATE_CELL](updateVal, this[NEXT_ALPHA](z[0]), sheet);
      }
    }
    return isHeader;
  }

  [UPDATE_REF](sheet, index) {
    if(!sheet['!ref']) {
      return
    }
    const ref = sheet['!ref'].split(':')
    const col = ref[1][0]
    const row = parseInt(ref[1].slice(1))
    if(col.charCodeAt(0) < index.charCodeAt(0)) {
      if(this.options.debug) {
        console.log('update_ref', sheet['!ref'], `${ref[0]}:${index}${row}`)
      }
      sheet['!ref'] = `${ref[0]}:${index}${row}`
    }
  }

  [UPDATE_CELL](sheet, z, sheetname, filename) {
    if(!sheet[z] || !sheet[z].v){
      return null
    }

    if(this[READ_HEADER](sheet, z, sheetname, filename)){
      return null
    }

    if(this.current.key_column_index.indexOf(z[0]) > -1 || this.options.key_column_index.indexOf(z[0]) > -1) {
      if(typeof this.options.key_filter === 'function') {
        if(!this.options.key_filter(sheet[z].v)) {
          return null
        }
      }
      
      var key = sheet[z].v.toString().replace(/[\s ]/ig, '');
      if(typeof this.options.create_key === 'function') {
        key = this.options.create_key(key, sheet, z)
      }
      const updateVal = this.data[key]
      if(this.options.debug) {
        console.log('update_cell', sheet[z].v, this.data[key], key)
      }
      if(!updateVal) return
      if(this.options.debug) {
        console.log('update_cell2', this.current.update_column_index, this.options.update_column_index)
      }
      if(this.options.update_next) {
        if(this.options.debug && updateVal) {
          console.log('update_cell', sheet[z].v, this[NEXT_ALPHA](z[0]), updateVal, z[0], z.replace(z[0],this[NEXT_ALPHA](z[0])))
        }
        sheet[z.replace(z[0],this[NEXT_ALPHA](z[0]))] = this[CREATE_CELL](updateVal, this[NEXT_ALPHA](z[0]), sheet);
      } else {
        if(this.current.update_column_index.length == 0 && this.options.update_column_index.length == 0) {
          sheet[z].v = updateVal
        } else {
          const index = this.current.key_column_index.indexOf(z[0]) > -1 ? this.current.key_column_index.indexOf(z[0]) : this.options.key_column_index.indexOf(z[0])
          if(index < 0) {
            console.log('没有找到更新列')
            return
          }
          if(this.options.debug) {
            console.log('update_cell3', z[0], index, this.current.update_column_index[index], this.options.update_column_index[index])
          }
          if(this.current.update_column_index[index]) {
            sheet[z.replace(z[0],this.current.update_column_index[index])] = this[CREATE_CELL](updateVal, this.current.update_column_index[index], sheet);
          } else {
            sheet[z.replace(z[0],this.options.update_column_index[index])] = this[CREATE_CELL](updateVal, this.options.update_column_index[index], sheet);
          }
        }
      }
      
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
      if(this.options.debug) {
        console.log('sheet', sheetname, sheet['!ref'])
      }
      for(var z in sheet) {
        if(z[0] === '!') {
          continue;
        }
        this[UPDATE_CELL](sheet, z, sheetname, filename)
      }
    }
    xlsx.writeWorkbook(workbook, this.options.output_dir + '/' + filename)
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
        if((ext == '.xls' || ext == '.xlsx' || ext == '.xlsm') &&
            (!this.options.file_filter || this.options.file_filter(child_filepath)))
          this[READ_FILE](child_filepath)
      }
    }
  }

  async run() {
    if(this.options.data_filepath) {
      this[LOAD_UPDATE_DATA]()
    }
    this[READ_DIR]()
  }
}

module.exports = XlsxUpdateFormatter
