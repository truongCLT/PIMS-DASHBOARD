import ExcelJS from 'exceljs';
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('/c/Users/PC-InfoPlus/Downloads/2026.08 경영관리보고회_취합완료_rev.1.xlsx');
wb.worksheets.forEach(ws => {
  console.log('SHEET:', ws.name, 'rows:', ws.rowCount, 'cols:', ws.columnCount);
});
