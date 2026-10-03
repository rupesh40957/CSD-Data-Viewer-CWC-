/**
 * INSAT Engineering Value Computation Engine
 *
 * Applies INSAT DCS sensor equations to raw CSD telemetry values,
 * producing calibrated engineering readings (e.g. AirTemp in °C,
 * WaterLevel in meters, Pressure in mBar).
 *
 * All equations are pure functions — no side effects or mutations.
 */

import {
  InsatSensorConfig,
  InsatEquationType,
  ComputedEngineeringValue,
  RecordEngineeringValues,
} from './types';
import { CSDRecord } from '@/types/csd';

/**
 * Extract the raw numeric value for a given sensor key from a CSD record.
 * Handles both sensor array keys (s00–s17) and config keys (c1–c3).
 */
function getRawValue(record: CSDRecord, sensorKey: string): number | null {
  // Config channels
  if (sensorKey === 'c1') return record.c1;
  if (sensorKey === 'c2') return record.c2;
  if (sensorKey === 'c3') return record.c3;

  // Specialized sensor fields
  if (sensorKey === 's16') return record.s16;
  if (sensorKey === 's17') return record.s17;

  // Standard sensor array lookup
  const sensor = record.sensors.find((s) => s.key === sensorKey);
  if (sensor) return sensor.value;

  // Also check sensorMap for faster lookup
  if (record.sensorMap[sensorKey]) {
    const values = record.sensorMap[sensorKey];
    return values.length > 0 ? values[0] : null;
  }

  return null;
}

/**
 * Apply a specific INSAT equation to raw input value(s).
 *
 * @param equationType - The equation algorithm to apply
 * @param rawValues - Array of raw numeric inputs (1 for most sensors, 2 for WaterLevel)
 * @param params - Optional equation parameters (offset, divisor, msl, etc.)
 * @returns Computed engineering value or null if inputs are invalid
 */
function applyEquation(
  equationType: InsatEquationType,
  rawValues: (number | null)[],
  params?: Record<string, number>
): number | null {
  const x = rawValues[0];

  switch (equationType) {
    case 'abs_minus_offset_div': {
      // (Abs(x) - offset) / divisor → e.g. AirTemp: (Abs(x)-400)/10
      if (x === null) return null;
      const offset = params?.offset ?? 0;
      const divisor = params?.divisor ?? 1;
      return (Math.abs(x) - offset) / divisor;
    }

    case 'x_div': {
      // x / divisor → e.g. Battery: x/10, Rainfall: x/2
      if (x === null) return null;
      const divisor = params?.divisor ?? 1;
      return x / divisor;
    }

    case 'abs_x_div': {
      // Abs(x) / divisor → e.g. Humidity: Abs(x)/10, WindSpeed: Abs(x)/10
      if (x === null) return null;
      const divisor = params?.divisor ?? 1;
      return Math.abs(x) / divisor;
    }

    case 'pressure_formula': {
      // (x / (x + 0.0000001)) * ((x / 10.23) + 925) → Pressure
      if (x === null) return null;
      const safeDenom = x + 0.0000001;
      return (x / safeDenom) * (x / 10.23 + 925);
    }

    case 'identity': {
      // x (pass-through) → RainDaily, SolarRad
      if (x === null) return null;
      return x;
    }

    case 'abs_x': {
      // Abs(x) → Evaporation, WindDir
      if (x === null) return null;
      return Math.abs(x);
    }

    case 'composite_water_level': {
      // (x1 + x2) + MSL → WaterLevel from s08 (integer) + s09 (fractional)
      const x1 = rawValues[0];
      const x2 = rawValues[1] ?? null;
      if (x1 === null && x2 === null) return null;
      const msl = params?.msl ?? 0;
      return ((x1 ?? 0) + (x2 ?? 0)) + msl;
    }

    default:
      return null;
  }
}

/**
 * Compute a single engineering value for a given sensor config and CSD record.
 */
export function computeEngineeringValue(
  config: InsatSensorConfig,
  record: CSDRecord,
  mslOverride?: number
): ComputedEngineeringValue {
  const rawInputs = config.insatSensorIds.map((key) => getRawValue(record, key));
  const allNull = rawInputs.every((v) => v === null);

  if (allNull) {
    return {
      parameterName: config.sensorName,
      unit: config.unit,
      value: null,
      displayValue: '—',
      rawInputs,
      sourceKeys: config.insatSensorIds,
      isValid: false,
    };
  }

  // Merge MSL override into equation params for WaterLevel
  let params = config.equationParams;
  if (config.equationType === 'composite_water_level' && mslOverride !== undefined) {
    params = { ...params, msl: mslOverride };
  }

  const computed = applyEquation(config.equationType, rawInputs, params);

  if (computed === null || !isFinite(computed)) {
    return {
      parameterName: config.sensorName,
      unit: config.unit,
      value: null,
      displayValue: '—',
      rawInputs,
      sourceKeys: config.insatSensorIds,
      isValid: false,
    };
  }

  const rounded = Number(computed.toFixed(config.rightDigit));

  return {
    parameterName: config.sensorName,
    unit: config.unit,
    value: rounded,
    displayValue: rounded.toFixed(config.rightDigit),
    rawInputs,
    sourceKeys: config.insatSensorIds,
    isValid: true,
  };
}

/**
 * Compute all engineering values for a single CSD record.
 *
 * @param sensors - Array of enabled INSAT sensor configurations
 * @param record - The CSD record to compute values for
 * @param msl - Mean Sea Level adjustment for WaterLevel
 * @returns Object keyed by parameter name with computed engineering values
 */
export function computeRecordEngineeringValues(
  sensors: InsatSensorConfig[],
  record: CSDRecord,
  msl: number = 0
): RecordEngineeringValues {
  const result: RecordEngineeringValues = {};

  for (const config of sensors) {
    if (!config.enabled) continue;
    result[config.sensorName] = computeEngineeringValue(config, record, msl);
  }

  return result;
}

/**
 * Format a computed engineering value for compact table display.
 * Shows value + unit abbreviation.
 */
export function formatEngineeringValue(ev: ComputedEngineeringValue): string {
  if (!ev.isValid || ev.value === null) return '—';
  return `${ev.displayValue} ${ev.unit}`;
}

/**
 * Get a color hint for a specific parameter value (for table cell coloring).
 * Uses startsWith matching so names like "Battery (C1)" still resolve correctly.
 */
export function getParameterColor(paramName: string, value: number | null): string {
  if (value === null) return 'var(--quality-bad)';

  if (paramName.startsWith('AirTemp')) {
    if (value > 45) return '#ef4444';       // extreme heat
    if (value > 35) return '#f97316';       // hot
    if (value < 0) return '#3b82f6';        // freezing
    if (value < 10) return '#06b6d4';       // cold
    return '#10b981';                        // normal
  }

  if (paramName.startsWith('Battery')) {
    if (value < 10) return '#ef4444';        // critical
    if (value < 11) return '#f97316';        // low
    return '#10b981';                        // ok
  }

  if (paramName.startsWith('Humidity')) {
    if (value > 90) return '#3b82f6';
    if (value < 20) return '#f97316';
    return 'var(--text-muted)';
  }

  if (paramName.startsWith('WaterLevel')) {
    return '#06b6d4';
  }

  if (paramName.startsWith('Rainfall') || paramName.startsWith('RainDaily')) {
    if (value > 50) return '#3b82f6';
    if (value > 10) return '#06b6d4';
    if (value > 0) return '#10b981';
    return 'var(--text-muted)';
  }

  if (paramName.startsWith('WindSpeed')) {
    if (value > 20) return '#ef4444';
    if (value > 10) return '#f97316';
    return 'var(--text-muted)';
  }

  if (paramName.startsWith('Pressure')) {
    return '#8b5cf6';
  }

  if (paramName.startsWith('WindDir')) {
    return 'var(--text-muted)';
  }

  if (paramName.startsWith('Evaporation')) {
    if (value > 0) return '#06b6d4';
    return 'var(--text-muted)';
  }

  if (paramName.startsWith('SolarRad')) {
    if (value > 500) return '#f97316';
    if (value > 0) return '#eab308';
    return 'var(--text-muted)';
  }

  return 'var(--text-main)';
}

