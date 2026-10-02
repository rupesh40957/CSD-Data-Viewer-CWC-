/**
 * Automated Verification & Validation Test Suite for CSD Parser
 * Validates against the actual 20260929.csd file.
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseCSDBuffer } from '../src/parser/csd-parser';
import { generateCSDSummary } from '../src/parser/debug';

// ANSI terminal colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedTests++;
    console.log(`  ${GREEN}✓ PASS${RESET} : ${testName}`);
  } else {
    failedTests++;
    console.error(`  ${RED}✗ FAIL${RESET} : ${testName}`);
    if (detail) console.error(`    ${detail}`);
  }
}

function runTests() {
  console.log(`\n${CYAN}======================================================${RESET}`);
  console.log(`${CYAN}   CSD TELEMETRY PARSER AUTOMATED TEST SUITE          ${RESET}`);
  console.log(`${CYAN}======================================================${RESET}\n`);

  const filePath = path.resolve(__dirname, '../20260929.csd');
  if (!fs.existsSync(filePath)) {
    console.error(`${RED}Cannot find test file: ${filePath}${RESET}`);
    process.exit(1);
  }

  const buffer = fs.readFileSync(filePath);
  console.log(`Loaded test file: ${filePath} (${buffer.length} bytes)\n`);

  const startTime = Date.now();
  const parsed = parseCSDBuffer(buffer, { encoding: 'windows-1252' }, '20260929.csd');
  const parseDuration = Date.now() - startTime;

  console.log(`${YELLOW}>>> PARSE PERFORMANCE: ${parseDuration} ms for ${parsed.recordCount} records${RESET}\n`);

  // 1. Total records validation
  console.log(`${CYAN}[1. Total Records Validation]${RESET}`);
  assert(parsed.recordCount === 2564, 'Record count must match exactly 2,564', `Found: ${parsed.recordCount}`);
  assert(parsed.validRecordCount === 2564, 'All records have valid ID and timestamp', `Valid: ${parsed.validRecordCount}`);
  assert(parsed.invalidRecordCount === 0, 'No structurally invalid records', `Invalid: ${parsed.invalidRecordCount}`);

  // 2. First record validation
  console.log(`\n${CYAN}[2. First Record Validation]${RESET}`);
  const r1 = parsed.records[0];
  assert(r1.lineNumber === 1, 'First record line number is 1');
  assert(r1.id === '738B66FA', `First record ID is 738B66FA (got "${r1.id}")`);
  assert(r1.rawTimestamp === '29/09/2026 00:01:26.573', `Raw timestamp matches exactly ("${r1.rawTimestamp}")`);
  assert(r1.offset === '05:00', `Offset is 05:00 (got "${r1.offset}")`);
  assert(r1.recordType === 'L', `Record status is L (got "${r1.recordType}")`);
  assert(r1.c1 === 123, `c1 is 123 (got ${r1.c1})`);
  assert(r1.c2 === 0, `c2 is 0 (got ${r1.c2})`);
  assert(r1.c3 === 135, `c3 is 135 (got ${r1.c3})`);
  assert(r1.h === '0256', `H code is 0256 (got "${r1.h}")`);
  assert(r1.signal === '08P47NG!CA89', `Signal is 08P47NG!CA89 (got "${r1.signal}")`);
  assert(r1.quality === 'Good', `Quality is Good (got "${r1.quality}")`);
  assert(r1.sensors.length === 11, `First record has 11 sensor readings (got ${r1.sensors.length})`);

  // Verify s10 negative integer parsing in record 1 ("s10:-02")
  const s10 = r1.sensors.find((s) => s.key === 's10');
  assert(s10 !== undefined && s10.value === -2, `s10 parsed as -2 without transformation (got ${s10?.value})`);
  assert(s10?.rawValue === '-02', `s10 rawValue preserved as "-02" (got "${s10?.rawValue}")`);

  // Verify s16 float in record 1 ("s16:00.000")
  const s16 = r1.sensors.find((s) => s.key === 's16');
  assert(s16 !== undefined && s16.value === 0, `s16 parsed as 0 (got ${s16?.value})`);
  assert(s16?.rawValue === '00.000', `s16 rawValue preserved as "00.000" (got "${s16?.rawValue}")`);

  // 3. Last record validation
  console.log(`\n${CYAN}[3. Last Record Validation]${RESET}`);
  const rLast = parsed.records[parsed.recordCount - 1];
  assert(rLast.lineNumber === 2564, 'Last record line number is 2564');
  assert(rLast.id === '739C7556', `Last record ID is 739C7556 (got "${rLast.id}")`);
  assert(rLast.rawTimestamp === '29/09/2026 04:23:42.833', `Raw timestamp is 29/09/2026 04:23:42.833 ("${rLast.rawTimestamp}")`);
  assert(rLast.offset === '04:00', `Offset is 04:00 (got "${rLast.offset}")`);
  assert(rLast.recordType === 'L', `Record status is L (got "${rLast.recordType}")`);
  assert(rLast.c1 === null, `c1 is null due to $$ (got ${rLast.c1})`);
  assert(rLast.c2 === 0, `c2 is 0 (got ${rLast.c2})`);
  assert(rLast.c3 === 0, `c3 is 0 (got ${rLast.c3})`);
  assert(rLast.h === '1007', `H code is 1007 (got "${rLast.h}")`);
  assert(rLast.signal === '08P39NN!CA89', `Signal is 08P39NN!CA89 (got "${rLast.signal}")`);
  assert(rLast.quality === 'Bad', `Quality is Bad (got "${rLast.quality}")`);

  // 4. Timestamp Precision Validation
  console.log(`\n${CYAN}[4. Timestamp Precision & Range Validation]${RESET}`);
  assert(r1.timestamp !== null, 'First record timestamp parsed to Date');
  assert(r1.timestamp?.getMilliseconds() === 573, `Exact milliseconds preserved (expected 573, got ${r1.timestamp?.getMilliseconds()})`);
  assert(rLast.timestamp?.getMilliseconds() === 833, `Last record milliseconds preserved (expected 833, got ${rLast.timestamp?.getMilliseconds()})`);
  assert(parsed.startTime !== null && parsed.endTime !== null, 'File start and end times populated');
  assert(parsed.startTime?.getTime()! <= parsed.endTime?.getTime()!, 'Start time is before or equal to end time');

  // 5. Detected Fields Validation
  console.log(`\n${CYAN}[5. Detected Fields Validation]${RESET}`);
  const expectedFields = ['id', 'timestamp', 'offset', 'recordType', 'c1', 'c2', 'c3', 'H', 'quality', 'signal'];
  for (const ef of expectedFields) {
    assert(parsed.fieldsDetected.includes(ef), `Detected core field: ${ef}`);
  }
  assert(parsed.metadata.sensorKeysDetected.length >= 15, `Detected >= 15 unique sensor keys (got ${parsed.metadata.sensorKeysDetected.length})`);
  assert(parsed.metadata.sensorKeysDetected.includes('s00'), 'Includes sensor s00');
  assert(parsed.metadata.sensorKeysDetected.includes('s16'), 'Includes sensor s16');
  assert(parsed.metadata.sensorKeysDetected.includes('s17'), 'Includes sensor s17');

  // 6. Missing Fields ($$) & Corrupt Marker Validation
  console.log(`\n${CYAN}[6. Missing Fields ($$) & Corrupt Markers]${RESET}`);
  assert(parsed.metadata.corruptMarkerRecordCount > 0, `Detected frames with corrupt $$ markers (${parsed.metadata.corruptMarkerRecordCount} frames)`);
  // Find a record with s02:$$
  const dollarRecord = parsed.records.find((r) => r.sensors.some((s) => s.value === null && s.rawValue === '$$'));
  assert(dollarRecord !== undefined, 'Found record containing sensor with $$ corrupt marker');
  if (dollarRecord) {
    const sDollar = dollarRecord.sensors.find((s) => s.rawValue === '$$');
    assert(sDollar?.value === null, `Sensor with $$ parsed as value: null`);
    assert(sDollar?.rawValue === '$$', `Sensor with $$ preserved rawValue as "$$"`);
  }

  // 7. Repeated Fields Validation (duplicate sensor keys like multiple s00)
  console.log(`\n${CYAN}[7. Repeated Fields (Duplicate Keys) Validation]${RESET}`);
  // In the file, many records have 7x s00 (e.g. Type A records)
  const multiS00Record = parsed.records.find((r) => r.sensors.filter((s) => s.key === 's00').length >= 5);
  assert(multiS00Record !== undefined, 'Successfully found and parsed record with multiple repeated s00 keys');
  if (multiS00Record) {
    const s00Count = multiS00Record.sensors.filter((s) => s.key === 's00').length;
    assert(s00Count === 7, `Preserved all 7 repeated s00 sensors without overwriting (count: ${s00Count})`);
  }

  // 8. Numeric Parsing & Floating Point Validation
  console.log(`\n${CYAN}[8. Numeric & Float Parsing Validation]${RESET}`);
  // Find a record with non-zero s16 float like "01.286"
  const floatRecord = parsed.records.find((r) => r.sensors.some((s) => s.key === 's16' && s.value !== null && s.value > 1));
  assert(floatRecord !== undefined, 'Found record with float s16 value > 1');
  if (floatRecord) {
    const s16Val = floatRecord.sensors.find((s) => s.key === 's16');
    assert(typeof s16Val?.value === 'number', `Float value parsed as number type (${s16Val?.value})`);
    assert(s16Val?.rawValue?.includes('.') === true, `Float rawValue preserved exact string representation ("${s16Val?.rawValue}")`);
  }

  // 9. Quality & Status Parsing
  console.log(`\n${CYAN}[9. Quality & Status Breakdown Validation]${RESET}`);
  assert(parsed.metadata.goodRecordCount === 2276, `Good records match exactly 2,276 (got ${parsed.metadata.goodRecordCount})`);
  assert(parsed.metadata.badRecordCount === 288, `Bad records match exactly 288 (got ${parsed.metadata.badRecordCount})`);
  assert(parsed.metadata.uniqueStations.length === 506, `Unique stations match exactly 506 (got ${parsed.metadata.uniqueStations.length})`);

  // Final summary
  console.log(`\n${CYAN}======================================================${RESET}`);
  if (failedTests === 0) {
    console.log(`${GREEN}ALL ${passedTests} PARSER TESTS PASSED! (0 failures)${RESET}`);
  } else {
    console.error(`${RED}${failedTests} TESTS FAILED out of ${passedTests + failedTests}!${RESET}`);
  }
  console.log(`${CYAN}======================================================${RESET}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests();
