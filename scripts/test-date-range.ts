import { normalizeIsoDate, parseDateFromCsdFilename } from '../src/lib/parser/date-extractor';
import { formatCwcDateShort, buildMatrixReportFromRecords } from '../src/lib/export/matrix-builder';
import { CSDRecord, CSDFile } from '../src/types/csd';

console.log('======================================================');
console.log('   MULTI-DAY DATE RANGE & AGGREGATION TEST SUITE      ');
console.log('======================================================\n');

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ✓ PASS : ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL : ${msg}`);
    failed++;
  }
}

// 1. Date normalization test
console.log('[1. Date Normalization]');
assert(normalizeIsoDate('2026-10-01') === '2026-10-01', 'ISO YYYY-MM-DD preserved');
assert(normalizeIsoDate('20261001') === '2026-10-01', 'Compact YYYYMMDD converted to YYYY-MM-DD');
assert(normalizeIsoDate('2026/10/01') === '2026-10-01', 'Slash format 2026/10/01 converted to YYYY-MM-DD');
assert(normalizeIsoDate('') === '', 'Empty string returns empty');

// 2. Simulated 29-day archive file catalog
console.log('\n[2. Range Matching across 29-day Archive]');
const mockFiles = Array.from({ length: 29 }, (_, i) => {
  const day = String(i + 1).padStart(2, '0');
  const filename = `202610${day}.csd`;
  const parsed = parseDateFromCsdFilename(filename);
  return {
    id: `file_${day}`,
    name: filename,
    dateKey: parsed.dateKey,
    year: parsed.year,
    month: parsed.month,
    day: parsed.day,
  };
});

assert(mockFiles.length === 29, 'Total 29 mock files created');
assert(mockFiles[0].dateKey === '2026-10-01', 'First file dateKey is 2026-10-01');
assert(mockFiles[28].dateKey === '2026-10-29', 'Last file dateKey is 2026-10-29');

// Range query: 1st Oct to 5th Oct
const from = normalizeIsoDate('2026-10-01');
const to = normalizeIsoDate('2026-10-05');
const matching = mockFiles.filter((f) => f.dateKey >= from && f.dateKey <= to);

assert(matching.length === 5, `Expected exactly 5 files for Oct 1 to Oct 5 (got ${matching.length})`);
assert(matching[0].name === '20261001.csd', 'First matched file is 20261001.csd');
assert(matching[4].name === '20261005.csd', 'Last matched file is 20261005.csd');

// 3. Multi-day continuous records simulation
console.log('\n[3. Continuous Multi-Day Matrix Generation]');
const mockRecords: CSDRecord[] = [];
// Generate 5 days of hourly records for 2 stations
const stations = ['738B66FA', '739C7556'];
for (let d = 1; d <= 5; d++) {
  for (let h = 0; h < 24; h++) {
    const dayStr = String(d).padStart(2, '0');
    const hourStr = String(h).padStart(2, '0');
    // In CSD telemetry, timestamps stored in Record represent IST time via UTC components
    const dt = new Date(Date.UTC(2026, 9, d, h, 0, 0));
    stations.forEach((st) => {
      mockRecords.push({
        id: `${st}_${dayStr}_${hourStr}`,
        line: 1,
        stationId: st,
        timestamp: dt,
        timestampRaw: dt.toISOString(),
        offset: '05:30',
        status: 'L',
        c1: 120,
        c2: 0,
        c3: 130,
        h: '0256',
        signal: { power: 8, type: 'P', raw: '08P47' },
        quality: 'Good',
        sensors: [
          { key: 's00', name: 'AirTemp', value: 25.5, rawValue: '25.5' },
          { key: 's07', name: 'Humidity', value: 65, rawValue: '65' },
        ],
      });
    });
  }
}

assert(mockRecords.length === 5 * 24 * 2, `Generated ${mockRecords.length} mock records for 5 days`);

const matrix = buildMatrixReportFromRecords(mockRecords, [], 0, new Map());
assert(matrix.stationGroups.length === 2, `Matrix has 2 station groups (got ${matrix.stationGroups.length})`);
assert(matrix.timestamps.length >= 120, `Matrix has at least 120 hourly intervals (got ${matrix.timestamps.length})`);
assert(matrix.periodText.includes('01-Oct-2026') && matrix.periodText.includes('05-Oct-2026'), `Period text correctly spans 01-Oct to 05-Oct: "${matrix.periodText}"`);

console.log(`\n======================================================`);
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`======================================================`);

if (failed > 0) process.exit(1);
