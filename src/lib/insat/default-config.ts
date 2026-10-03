/**
 * INSAT Default Sensor Configuration
 *
 * Standard CWC/INSAT DCS telemetry mapping table as defined by the
 * Central Water Commission satellite data collection protocol.
 *
 * Maps raw CSD sensor channels (s00–s14, c1–c3) to physical parameters
 * with their INSAT conversion equations.
 */

import { InsatSensorConfig, InsatSensorProfile } from './types';

/**
 * The standard 11-parameter INSAT sensor mapping used by CWC telemetry stations.
 * Based on the official INSAT-DCS sensor configuration table.
 */
export const DEFAULT_INSAT_SENSORS: InsatSensorConfig[] = [
  {
    sensorName: 'AirTemp (s00)',
    unit: 'DegC',
    rightDigit: 1,
    resolution: 0.1,
    insatSensorIds: ['s00'],
    insatSensorPositions: [4],
    equationDisplay: '(Abs(x)−400)/10',
    equationType: 'abs_minus_offset_div',
    equationParams: { offset: 400, divisor: 10 },
    enabled: true,
  },
  {
    sensorName: 'Battery (C1)',
    unit: 'Volt',
    rightDigit: 1,
    resolution: 0.1,
    insatSensorIds: ['c1'],
    insatSensorPositions: [0],
    equationDisplay: 'x/10',
    equationType: 'x_div',
    equationParams: { divisor: 10 },
    enabled: true,
  },
  {
    sensorName: 'Humidity (s07)',
    unit: '%',
    rightDigit: 0,
    resolution: 1,
    insatSensorIds: ['s07'],
    insatSensorPositions: [10],
    equationDisplay: 'Abs(x)/10',
    equationType: 'abs_x_div',
    equationParams: { divisor: 10 },
    enabled: true,
  },
  {
    sensorName: 'Pressure (s06)',
    unit: 'mBar',
    rightDigit: 1,
    resolution: 0.1,
    insatSensorIds: ['s06'],
    insatSensorPositions: [9],
    equationDisplay: '(x/(x+0.0000001))*((x/10.23)+925)',
    equationType: 'pressure_formula',
    enabled: true,
  },
  {
    sensorName: 'RainDaily (C3)',
    unit: 'mm',
    rightDigit: 0,
    resolution: 1,
    insatSensorIds: ['c3'],
    insatSensorPositions: [2],
    equationDisplay: 'x',
    equationType: 'identity',
    enabled: true,
  },
  {
    sensorName: 'Rainfall (C2)',
    unit: 'mm',
    rightDigit: 1,
    resolution: 0.5,
    insatSensorIds: ['c2'],
    insatSensorPositions: [1],
    equationDisplay: 'x/2',
    equationType: 'x_div',
    equationParams: { divisor: 2 },
    enabled: true,
  },
  {
    sensorName: 'Evaporation (s11)',
    unit: 'mm',
    rightDigit: 0,
    resolution: 1,
    insatSensorIds: ['s11'],
    insatSensorPositions: [6],
    equationDisplay: 'Abs(x)',
    equationType: 'abs_x',
    enabled: true,
  },
  {
    sensorName: 'SolarRad (s14)',
    unit: 'W/m2',
    rightDigit: 0,
    resolution: 1,
    insatSensorIds: ['s14'],
    insatSensorPositions: [13],
    equationDisplay: 'x',
    equationType: 'identity',
    enabled: true,
  },
  {
    sensorName: 'WindDir (s05)',
    unit: 'Deg',
    rightDigit: 0,
    resolution: 1,
    insatSensorIds: ['s05'],
    insatSensorPositions: [8],
    equationDisplay: 'Abs(x)',
    equationType: 'abs_x',
    enabled: true,
  },
  {
    sensorName: 'WindSpeed (s04)',
    unit: 'm/s',
    rightDigit: 1,
    resolution: 0.1,
    insatSensorIds: ['s04'],
    insatSensorPositions: [7],
    equationDisplay: 'Abs(x)/10',
    equationType: 'abs_x_div',
    equationParams: { divisor: 10 },
    enabled: true,
  },
  {
    sensorName: 'WaterLevel (S08+S09)',
    unit: 'meter',
    rightDigit: 3,
    resolution: 0.001,
    insatSensorIds: ['s08', 's09'],
    insatSensorPositions: [11, 12],
    equationDisplay: '(x1+x2)+MSL',
    equationType: 'composite_water_level',
    equationParams: { msl: 0 },
    enabled: true,
  },
];

/**
 * Default INSAT sensor profile for CWC telemetry stations.
 */
export const DEFAULT_INSAT_PROFILE: InsatSensorProfile = {
  name: 'CWC Default',
  description: 'Standard CWC/INSAT DCS telemetry mapping for hydro-meteorological stations',
  sensors: DEFAULT_INSAT_SENSORS,
  defaultMSL: 0,
};
