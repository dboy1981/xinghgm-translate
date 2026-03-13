var XLSX = require('xlsx');
const fs = require('fs-extra')

exports.readXlsx = function (path, sheet_name) {
    if(!fs.existsSync(path)) {
        return [];
    }
    const workbook = XLSX.readFile(path);
    if(!sheet_name) {
        sheet_name = workbook.SheetNames[0];
    }
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name]);
    return data;
}

exports.writeXlsx = function (path, data, sheet_name, options) {
  const option = Object.assign({}, {defVal: ''}, options || {})
  fs.ensureFile(path, err => {
    if(err){
      console.log(err) // => null
      return;
    }
    if(!sheet_name) {
      sheet_name = 'Sheet1';
    }
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data, option);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet_name);
    XLSX.writeFile(workbook, path);
  })
}

exports.readWorkbook = function (path) {
  return XLSX.readFile(path);
}

exports.writeWorkbook = function (data, path) {
  return XLSX.writeFile(data, path)
}
