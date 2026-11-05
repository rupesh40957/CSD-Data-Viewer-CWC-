import { buildMatrixReportFromRecords } from '../src/lib/export/matrix-builder';
import { CsdRecord } from '../src/types/csd';

const TOTAL_RECORDS = 363786;
const TOTAL_STATIONS = 911;
const TOTAL_HOURS = 29 * 24;

const baseDate = new Date('2026-10-01T00:00:00Z');
const mockRecords: CsdRecord[] = [];
const stationIds: string[] = [];
for (let s = 1; s <= TOTAL_STATIONS; s++) {
  stationIds.push(`738B${s.toString(16).toUpperCase().padStart(4, '0')}`);
}

for (let i = 0; i < TOTAL_RECORDS; i++) {
  const stId = stationIds[i % TOTAL_STATIONS];
  const hourOffset = (i % TOTAL_HOURS);
  const ts = new Date(baseDate.getTime() + hourOffset * 3600 * 1000 + (i % 60) * 1000);
  mockRecords.push({
    id: `rec-${i}`,
    lineNumber: i + 1,
    stationId: stId,
    stationName: `Station ${stId}`,
    timestamp: ts,
    timestampRaw: ts.toISOString(),
    timeOffset: '05:00',
    status: 'L',
    c1: 124,
    c2: 0,
    c3: 135,
    h: '0256',
    sensors: [
      { key: 's00', label: 'AirTemp', value: 475, raw: 's00:475', index: 0, isCorrupted: false },
      { key: 's07', label: 'Humidity', value: 450, raw: 's07:450', index: 1, isCorrupted: false },
    ],
    sensorMap: { s00: [475], s07: [450] },
    s16: 1.25,
    s17: 12.4,
    signal: { raw: '08P47NG!CA89', prefix: 8, power: 47, signalType: 'NG', suffix: 'CA89' },
    quality: 'Good',
    hasCorruptMarkers: false,
    errors: [],
  });
}

const visible20 = stationIds.slice(0, 20);

// Profile steps inside buildMatrixReportFromRecords
const tStart = performance.now();

// Step 1: stationSet filter
const t0 = performance.now();
const stationSet = new Set<string>();
for (let i = 0; i < visible20.length; i++) {
  const s = visible20[i];
  stationSet.add(s);
  stationSet.add(s.toUpperCase());
  stationSet.add(s.toLowerCase());
}
const matching: CsdRecord[] = [];
for (let i = 0; i < mockRecords.length; i++) {
  const r = mockRecords[i];
  if (stationSet.has(r.stationId) || (r.stationName && stationSet.has(r.stationName))) {
    matching.push(r);
  }
}
const t1 = performance.now();
console.log(`Step 1 (Station filtering across 363k records): ${(t1 - t0).toFixed(2)} ms (matched ${matching.length})`);

// Step 2: date range
const t2 = performance.now();
let minDate: Date | null = null;
let maxDate: Date | null = null;
for (const r of matching) {
  if (!minDate || r.timestamp < minDate) minDate = r.timestamp;
  if (!maxDate || r.timestamp > maxDate) maxDate = r.timestamp;
}
const t3 = performance.now();
console.log(`Step 2 (Min/Max date): ${(t3 - t2).toFixed(2)} ms`);

// Step 3: stationMap
const t4 = performance.now();
const stationMap = new Map<string, { stationName: string; stationId: string; wimsCode?: string }>();
for (const r of matching) {
  const stId = String(r.stationId || 'UNKNOWN');
  const key = stId.toUpperCase();
  if (!stationMap.has(key)) {
    stationMap.set(key, { stationId: stId, stationName: r.stationName || stId, wimsCode: '' });
  }
}
const t5 = performance.now();
console.log(`Step 3 (Station map): ${(t5 - t4).toFixed(2)} ms`);

// Call the actual function
const tBuild0 = performance.now();
const model = buildMatrixReportFromRecords(mockRecords, undefined, 0, visible20);
const tBuild1 = performance.now();
console.log(`Full buildMatrixReportFromRecords: ${(tBuild1 - tBuild0).toFixed(2)} ms`);

