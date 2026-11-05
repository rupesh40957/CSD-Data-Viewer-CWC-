import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { parseCwcMatrixWorkbook } from '../src/lib/parser/matrix-excel-parser';
import { buildMatrixReportFromRecords } from '../src/lib/export/matrix-builder';
import { createMatrixExcelWorkbook, createFlatExcelWorkbook } from '../src/lib/export/exceljs-export';
import { generateMatrixCsv, generateFlattenedMatrixCsv, generateFlatRecordsCsv } from '../src/lib/export/csv-export';
import { decodeCsdBuffer, parseCsdContent } from '../src/lib/parser/csd-parser';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passCount++;
    console.log(`  ✓ PASS: ${msg}`);
  } else {
    failCount++;
    console.error(`  ✗ FAIL: ${msg}`);
  }
}

async function runTestSuite() {
  console.log('==================================================================');
  console.log('   CWC EXCEL & CSV EXPORT COMPREHENSIVE VERIFICATION SUITE       ');
  console.log('==================================================================\n');

  // Test 1: Reference Excel File Parsing
  console.log('--- TEST 1: Reference File Analysis (UYD NEW DELHI 15-OCT TO 31-OCT.xlsx) ---');
  const refPath = path.resolve('public/demo/UYD NEW DELHI 15-OCT TO 31-OCT.xlsx');
  const buffer = fs.readFileSync(refPath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  const { file: parsedFile, matrixModel } = parseCwcMatrixWorkbook(
    arrayBuffer,
    'UYD NEW DELHI 15-OCT TO 31-OCT.xlsx',
    buffer.byteLength
  );

  assert(matrixModel.totalColumns === 120, 'Reference file total columns must be exactly 120');
  assert(matrixModel.timestamps.length === 408, 'Reference file hourly rows must be exactly 408');
  assert(matrixModel.stationGroups.length === 19, 'Reference file station count must be exactly 19');
  assert(parsedFile.records.length === 7752, 'Reference file normalized records must be 7,752 (19 * 408)');
  assert(matrixModel.stationGroups[0].stationName === 'Baghpat', 'First station is Baghpat');
  assert(matrixModel.stationGroups[8].stationName === 'Mawi', 'Station 9 is Mawi (AWS)');
  assert(matrixModel.stationGroups[8].colSpan === 11, 'Mawi has 11 sensor channels');
  assert(matrixModel.stationGroups[0].colSpan === 6, 'Baghpat has 6 sensor channels');

  // Test 2: Professional Excel (.xlsx) Generation & Styling
  console.log('\n--- TEST 2: Excel (.xlsx) Multi-Level Header & Styling Verification ---');
  const wb = await createMatrixExcelWorkbook(matrixModel);
  const outXlsxPath = path.resolve('public/demo/verified_cwc_telemetry.xlsx');
  await wb.xlsx.writeFile(outXlsxPath);
  assert(fs.existsSync(outXlsxPath), 'Generated Excel file must exist on disk');

  // Read back and inspect
  const readBackWb = new ExcelJS.Workbook();
  await readBackWb.xlsx.readFile(outXlsxPath);
  const ws = readBackWb.worksheets[0];

  assert(ws.rowCount === 414, 'Generated worksheet row count must be 414 (6 header rows + 408 data rows)');
  assert(ws.columnCount === 120, 'Generated worksheet column count must be 120');

  // Check Title
  const a1 = ws.getCell('A1');
  assert(a1.text.includes('Central Receiving Station'), 'A1 contains official title text');
  assert(a1.text.includes('15-Oct-2026') && a1.text.includes('31-Oct-2026'), 'A1 contains reporting period');
  assert((a1.fill as any)?.fgColor?.argb === 'FFFFFFFF', 'A1 has pure white fill matching official template');
  const rich = (a1.value as any)?.richText;
  assert(Array.isArray(rich) && rich.length >= 2, 'A1 uses richText for distinct multi-line styling');
  assert(rich?.[1]?.font?.color?.argb === 'FF002060', 'A1 line 2 date range has official Royal Blue font (002060)');
  assert(ws.getRow(1).height === 48, 'Row 1 height is 48pt');
  assert(a1.border?.top?.style === 'thick', 'A1 top border is thick black');
  assert(a1.border?.bottom?.style === 'thick', 'A1 bottom border is thick black');

  // Check Station Groups (Row 2)
  const b2 = ws.getCell('B2');
  assert(b2.text === 'Baghpat', 'B2 has station name Baghpat');
  assert((b2.fill as any)?.fgColor?.argb === 'FF1E3A5F', 'Station header has Slate Navy fill (1E3A5F)');
  assert(b2.font?.color?.argb === 'FFFFFFFF', 'Station header has white font');

  // Check Sensor Parameters (Row 3)
  const b3 = ws.getCell('B3');
  assert(b3.text === 'Rainfall (INSAT)', 'B3 has parameter name Rainfall (INSAT)');
  assert((b3.fill as any)?.fgColor?.argb === 'FFE2E8F0', 'Parameter header has Soft Slate fill (E2E8F0)');
  assert(b3.font?.bold === true, 'Parameter header text is bold');

  // Check WIMS Code (Row 4) & Datalogger ID (Row 5) & Unit (Row 6)
  const b5 = ws.getCell('B5');
  assert(b5.text === '7D869DC4', 'B5 has Datalogger ID 7D869DC4');
  const b6 = ws.getCell('B6');
  assert(b6.text === 'mm', 'B6 has sensor unit mm');

  // Check Freeze Panes
  const views = ws.views || [];
  const frozenView = views[0] as ExcelJS.WorksheetViewFrozen;
  assert(views.length > 0 && frozenView.state === 'frozen', 'Freeze pane is enabled');
  assert(frozenView.xSplit === 1 && frozenView.ySplit === 6, 'Freeze pane is locked at Row 6 and Column 1');

  // Check PageSetup
  assert(ws.pageSetup.orientation === 'landscape', 'Print orientation is landscape');
  assert(ws.pageSetup.printTitlesRow === '1:6', 'Print titles repeat rows 1:6');

  // Check Data Rows & Borders
  const b7 = ws.getCell('B7');
  assert(b7.border?.top?.style === 'thin', 'Cell B7 has thin top border');
  assert(b7.border?.bottom?.style === 'thin', 'Cell B7 has thin bottom border');
  assert(b7.border?.left?.style === 'thin', 'Cell B7 has thin left border');

  // Check Station Group Boundary Border
  const g7 = ws.getCell('G7'); // Last col of Baghpat
  assert(g7.border?.right?.style === 'medium', 'Last column of station group has medium border separator');

  // Check Row 414 (Last data row)
  const lastRow = ws.getRow(414);
  assert(String(lastRow.getCell(1).value) === '2026-10-31 23:00:00', 'Row 414 timestamp is 2026-10-31 23:00:00');

  // Test 3: CSV Generation & UTF-8 BOM
  console.log('\n--- TEST 3: CSV Multi-Level & Flattened Export Verification ---');
  const matrixCsv = generateMatrixCsv(matrixModel);
  // Parse with XLSX to test standard CSV RFC compliance
  const parsedCsvWb = XLSX.read(matrixCsv, { type: 'string', raw: true });
  const csvSheet = parsedCsvWb.Sheets[parsedCsvWb.SheetNames[0]];
  const csvRows = XLSX.utils.sheet_to_json<string[]>(csvSheet, { header: 1 });

  assert(csvRows.length >= 414, `Matrix CSV parsed rows must be at least 414 (got ${csvRows.length})`);
  assert(String(csvRows[0]?.[0]).includes('Central Receiving Station'), 'Matrix CSV Row 0 is Report Title');
  assert(String(csvRows[0]?.[0]).includes('15-Oct-2026') && String(csvRows[0]?.[0]).includes('31-Oct-2026'), 'Matrix CSV Row 0 contains dynamic reporting period');
  assert(String(csvRows[1]?.[0]) === 'Date and Time (IST)', 'Matrix CSV Row 1 Col 0 is Date and Time (IST)');
  assert(String(csvRows[1]?.[1]) === 'Baghpat', 'Matrix CSV Row 1 Col 1 is Baghpat');
  assert(String(csvRows[2]?.[1]) === 'Rainfall (INSAT)', 'Matrix CSV Row 2 Col 1 is Rainfall (INSAT)');
  assert(String(csvRows[4]?.[1]) === '7D869DC4', 'Matrix CSV Row 4 Col 1 is Datalogger ID');
  assert(String(csvRows[5]?.[1]) === 'mm', 'Matrix CSV Row 5 Col 1 is Sensor Unit');

  const flatCsv = generateFlattenedMatrixCsv(matrixModel);
  const parsedFlatCsvWb = XLSX.read(flatCsv, { type: 'string', raw: true });
  const flatSheet = parsedFlatCsvWb.Sheets[parsedFlatCsvWb.SheetNames[0]];
  const flatRows = XLSX.utils.sheet_to_json<string[]>(flatSheet, { header: 1 });
  assert(String(flatRows[0]?.[1]).includes('Baghpat - Rainfall (INSAT) (mm)'), 'Flattened CSV has combined Station - Sensor header');

  // Test 4: Exporting from Raw CSD records
  console.log('\n--- TEST 4: Exporting from Raw CSD Records (20260929.csd) ---');
  const csdBuffer = fs.readFileSync('public/demo/20260929.csd');
  const arrayBuf = csdBuffer.buffer.slice(csdBuffer.byteOffset, csdBuffer.byteOffset + csdBuffer.byteLength);
  const decoded = decodeCsdBuffer(arrayBuf);
  const csdParsed = parseCsdContent(decoded, '20260929.csd', csdBuffer.byteLength);

  const csdMatrix = buildMatrixReportFromRecords(csdParsed.records);
  assert(csdMatrix.stationGroups.length > 0, `Built CSD matrix with ${csdMatrix.stationGroups.length} stations`);
  assert(csdMatrix.timestamps.length > 0, `Built CSD matrix with ${csdMatrix.timestamps.length} timestamps`);

  const csdWb = await createMatrixExcelWorkbook(csdMatrix);
  const outCsdXlsx = path.resolve('public/demo/csd_matrix_export.xlsx');
  await csdWb.xlsx.writeFile(outCsdXlsx);
  assert(fs.existsSync(outCsdXlsx), 'Generated CSD matrix Excel export file exists');

  // Flat Records Export
  const flatWb = createFlatExcelWorkbook(csdParsed.records);
  const outFlatXlsx = path.resolve('public/demo/csd_flat_export.xlsx');
  await flatWb.xlsx.writeFile(outFlatXlsx);
  assert(fs.existsSync(outFlatXlsx), 'Generated CSD flat Excel export file exists');

  console.log('\n==================================================================');
  console.log(`   TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED        `);
  console.log('==================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
