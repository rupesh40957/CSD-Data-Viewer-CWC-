import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { decodeCsdBuffer, parseCsdContent } from '../src/lib/parser/csd-parser';

const excelPath = path.resolve('public/data/Telemetryu-sites-details-all-station.xlsx');
console.log('Reading:', excelPath);

const buf = fs.readFileSync(excelPath);
const workbook = XLSX.read(buf, { type: 'buffer' });

console.log('Sheet Names:', workbook.SheetNames);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Get raw JSON rows
const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
console.log('Total raw rows (including headers):', rawRows.length);
if (rawRows.length > 0) {
  console.log('Header Row (Row 0):', JSON.stringify(rawRows[0]));
  if (rawRows.length > 1) {
    console.log('Sample Row 1:', JSON.stringify(rawRows[1]));
  }
}

// Read with header mapping
const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
console.log('Parsed record objects count:', rows.length);

const stationIdMap = new Map<string, Record<string, unknown>>();
const duplicates: { id: string; rows: number[] }[] = [];
const rowSeen = new Map<string, number[]>();

rows.forEach((r, idx) => {
  const rowNum = idx + 2;
  const rawId = r['Sation ID'] ?? r['Station ID'] ?? r['Station_ID'];
  if (rawId !== undefined && rawId !== null && String(rawId).trim() !== '') {
    const norm = String(rawId).trim().toUpperCase();
    const existing = rowSeen.get(norm) || [];
    existing.push(rowNum);
    rowSeen.set(norm, existing);
    if (!stationIdMap.has(norm)) {
      stationIdMap.set(norm, r);
    }
  }
});

for (const [id, rowNums] of rowSeen.entries()) {
  if (rowNums.length > 1) {
    duplicates.push({ id, rows: rowNums });
  }
}

console.log('Total unique Station IDs in Excel:', stationIdMap.size);
console.log('Duplicate count in Excel:', duplicates.length);

// Read CSD with actual parser
const csdPath = path.resolve('public/demo/20260929.csd');
const fileBuffer = fs.readFileSync(csdPath);
const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);
const decoded = decodeCsdBuffer(arrayBuffer);
const parsedCsd = parseCsdContent(decoded, '20260929.csd', fileBuffer.byteLength);

console.log('\n--- CSD PARSED INFO ---');
console.log('Total CSD Records:', parsedCsd.records.length);
console.log('Unique CSD Stations:', parsedCsd.stations.length);

let matchedCount = 0;
let unmatchedCount = 0;
let matchedRecordsCount = 0;
let unmatchedRecordsCount = 0;

const matchedExamples: { stationId: string; stationName: string; records: number }[] = [];
const unmatchedExamples: { stationId: string; records: number }[] = [];

for (const st of parsedCsd.stations) {
  const norm = st.stationId.trim().toUpperCase();
  if (stationIdMap.has(norm)) {
    matchedCount++;
    matchedRecordsCount += st.totalRecords;
    const match = stationIdMap.get(norm)!;
    if (matchedExamples.length < 15) {
      matchedExamples.push({
        stationId: norm,
        stationName: String(match['Station_Name'] || ''),
        records: st.totalRecords,
      });
    }
  } else {
    unmatchedCount++;
    unmatchedRecordsCount += st.totalRecords;
    if (unmatchedExamples.length < 15) {
      unmatchedExamples.push({
        stationId: norm,
        records: st.totalRecords,
      });
    }
  }
}

console.log(`Matched Stations: ${matchedCount} / ${parsedCsd.stations.length} (${((matchedCount / parsedCsd.stations.length) * 100).toFixed(1)}%)`);
console.log(`Unmatched Stations: ${unmatchedCount} / ${parsedCsd.stations.length} (${((unmatchedCount / parsedCsd.stations.length) * 100).toFixed(1)}%)`);
console.log(`Matched Records: ${matchedRecordsCount} / ${parsedCsd.records.length} (${((matchedRecordsCount / parsedCsd.records.length) * 100).toFixed(1)}%)`);
console.log(`Unmatched Records: ${unmatchedRecordsCount} / ${parsedCsd.records.length} (${((unmatchedRecordsCount / parsedCsd.records.length) * 100).toFixed(1)}%)`);

console.log('\nSample Matched Stations:');
console.table(matchedExamples);

console.log('\nSample Unmatched Stations:');
console.table(unmatchedExamples);
