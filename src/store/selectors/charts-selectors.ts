import { AppStore } from '../use-app-store';
import { CSDRecord, SensorSeries, SensorDataPoint } from '@/types/csd';
import { formatTimeOnly, formatCsdTimestamp } from '@/lib/parser/timestamp-parser';
import { selectFilteredRecords } from './records-selectors';

const EMPTY_SERIES: SensorSeries = {
  sensorKey: '',
  label: '',
  dataPoints: [],
  stats: {
    min: null,
    max: null,
    avg: null,
    latest: null,
    count: 0,
    nullCount: 0,
  },
};

const EMPTY_CHART_ROWS: Array<{
  time: string;
  timestamp: Date;
  recordId: string;
  stationId: string;
  [key: string]: unknown;
}> = [];

/**
 * Min-Max bucket downsampling algorithm.
 * Guarantees that extrema (spikes and dips) are preserved even when reducing 10,000+ points
 * down to 200-400 points for fluid 60fps charting.
 */
function downsamplePoints<T extends { value: number | null }>(
  points: T[],
  limit: number
): T[] {
  if (points.length <= limit || limit <= 0) return points;

  const sampled: T[] = [];
  const bucketSize = points.length / limit;

  // Always keep first point
  sampled.push(points[0]);

  for (let b = 1; b < limit - 1; b++) {
    const start = Math.floor(b * bucketSize);
    const end = Math.min(points.length - 1, Math.floor((b + 1) * bucketSize));

    let minPoint: T | null = null;
    let maxPoint: T | null = null;

    for (let i = start; i < end; i++) {
      const p = points[i];
      if (p.value !== null) {
        if (!minPoint || (minPoint.value !== null && p.value < minPoint.value)) {
          minPoint = p;
        }
        if (!maxPoint || (maxPoint.value !== null && p.value > maxPoint.value)) {
          maxPoint = p;
        }
      }
    }

    if (minPoint && maxPoint && minPoint !== maxPoint) {
      // Push in chronological order
      if (points.indexOf(minPoint) < points.indexOf(maxPoint)) {
        sampled.push(minPoint);
        sampled.push(maxPoint);
      } else {
        sampled.push(maxPoint);
        sampled.push(minPoint);
      }
    } else if (minPoint) {
      sampled.push(minPoint);
    } else {
      sampled.push(points[start]);
    }
  }

  // Always keep last point
  if (points.length > 1) {
    sampled.push(points[points.length - 1]);
  }

  return sampled;
}

// Internal cache for selectSensorSeries
let lastSeriesRecordRef: CSDRecord[] | null = null;
let lastSeriesSensor = '';
let lastSeriesStation = '';
let lastSeriesSampleLimit = 300;
let cachedSensorSeries: SensorSeries = EMPTY_SERIES;

/**
 * Memoized selector for a single sensor's time-series data with computed statistics.
 */
export function selectSensorSeries(state: AppStore, requestedSensor?: string): SensorSeries {
  const records = selectFilteredRecords(state);
  if (records.length === 0) return EMPTY_SERIES;

  const sensorKey = requestedSensor || state.chartConfig.selectedSensors[0] || 's16';
  const stationFocus = state.chartConfig.stationFocus;
  const sampleLimit = state.chartConfig.sampleLimit || 300;

  if (
    records === lastSeriesRecordRef &&
    sensorKey === lastSeriesSensor &&
    stationFocus === lastSeriesStation &&
    sampleLimit === lastSeriesSampleLimit
  ) {
    return cachedSensorSeries;
  }

  let sourceRecords = records;
  if (stationFocus && stationFocus !== 'ALL') {
    sourceRecords = records.filter((r) => r.stationId === stationFocus);
  }

  let sum = 0;
  let validCount = 0;
  let nullCount = 0;
  let min: number | null = null;
  let max: number | null = null;
  let latest: number | null = null;

  const allPoints: SensorDataPoint[] = [];

  for (let i = 0; i < sourceRecords.length; i++) {
    const r = sourceRecords[i];
    let val: number | null = null;

    if (sensorKey === 's16') {
      val = r.s16;
    } else if (sensorKey === 's17') {
      val = r.s17;
    } else if (sensorKey === 'c1') {
      val = r.c1;
    } else if (sensorKey === 'c2') {
      val = r.c2;
    } else if (sensorKey === 'c3') {
      val = r.c3;
    } else if (sensorKey === 'signalPower') {
      val = r.signal.power;
    } else if (r.sensorMap[sensorKey] && r.sensorMap[sensorKey].length > 0) {
      val = r.sensorMap[sensorKey][0];
    }

    if (val !== null && !isNaN(val)) {
      sum += val;
      validCount++;
      if (min === null || val < min) min = val;
      if (max === null || val > max) max = val;
      latest = val;
    } else {
      nullCount++;
    }

    allPoints.push({
      timestamp: r.timestamp,
      timestampRaw: r.timestampRaw,
      timeLabel: formatTimeOnly(r.timestamp),
      value: val,
      recordId: r.id,
      stationId: r.stationId,
      quality: r.quality,
      isCorrupted: val === null || r.hasCorruptMarkers,
    });
  }

  const downsampled = downsamplePoints(allPoints, sampleLimit);

  lastSeriesRecordRef = records;
  lastSeriesSensor = sensorKey;
  lastSeriesStation = stationFocus;
  lastSeriesSampleLimit = sampleLimit;

  cachedSensorSeries = {
    sensorKey,
    label: sensorKey === 's16' ? 's16 (Composite Float)' : sensorKey,
    stationId: stationFocus,
    dataPoints: downsampled,
    stats: {
      min,
      max,
      avg: validCount > 0 ? Number((sum / validCount).toFixed(3)) : null,
      latest,
      count: validCount,
      nullCount,
    },
  };

  return cachedSensorSeries;
}

// Internal cache for selectChartData
let lastChartDataRecords: CSDRecord[] | null = null;
let lastChartSensorsKey = '';
let lastChartStationFocus = '';
let lastChartSampleLimit = 300;
let cachedChartRows: typeof EMPTY_CHART_ROWS = EMPTY_CHART_ROWS;

/**
 * Memoized selector for multi-sensor aligned chart rows, downsampled for optimal performance.
 */
export function selectChartData(state: AppStore): typeof EMPTY_CHART_ROWS {
  const records = selectFilteredRecords(state);
  if (records.length === 0) return EMPTY_CHART_ROWS;

  const { selectedSensors, stationFocus, sampleLimit } = state.chartConfig;
  const sensorsKey = selectedSensors.join(',');

  if (
    records === lastChartDataRecords &&
    sensorsKey === lastChartSensorsKey &&
    stationFocus === lastChartStationFocus &&
    sampleLimit === lastChartSampleLimit
  ) {
    return cachedChartRows;
  }

  let sourceRecords = records;
  if (stationFocus && stationFocus !== 'ALL') {
    sourceRecords = records.filter((r) => r.stationId === stationFocus);
  }

  const targetLimit = sampleLimit || 300;
  const step = Math.max(1, Math.floor(sourceRecords.length / targetLimit));

  const rows: typeof EMPTY_CHART_ROWS = [];

  for (let i = 0; i < sourceRecords.length; i += step) {
    const r = sourceRecords[i];
    const row: {
      time: string;
      timestamp: Date;
      recordId: string;
      stationId: string;
      [key: string]: unknown;
    } = {
      time: formatTimeOnly(r.timestamp),
      timestamp: r.timestamp,
      recordId: r.id,
      stationId: r.stationId,
    };

    for (const sensorKey of selectedSensors) {
      let val: number | null = null;
      if (sensorKey === 's16') {
        val = r.s16;
      } else if (sensorKey === 's17') {
        val = r.s17;
      } else if (sensorKey === 'c1') {
        val = r.c1;
      } else if (sensorKey === 'c2') {
        val = r.c2;
      } else if (sensorKey === 'c3') {
        val = r.c3;
      } else if (sensorKey === 'signalPower') {
        val = r.signal.power;
      } else if (r.sensorMap[sensorKey] && r.sensorMap[sensorKey].length > 0) {
        val = r.sensorMap[sensorKey][0];
      }
      row[sensorKey] = val;
    }

    rows.push(row);
  }

  lastChartDataRecords = records;
  lastChartSensorsKey = sensorsKey;
  lastChartStationFocus = stationFocus;
  lastChartSampleLimit = sampleLimit;
  cachedChartRows = rows;

  return cachedChartRows;
}
