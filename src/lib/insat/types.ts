/**
 * INSAT Sensor Configuration & Engineering Value Types
 *
 * Defines the mapping between raw CSD telemetry channels (s00–s17, c1–c3)
 * and their INSAT-protocol engineering parameters (AirTemp, WaterLevel, etc.).
 *
 * Each sensor config carries the INSAT equation used to convert raw integer
 * telemetry values into calibrated engineering units.
 */

/**
 * A single INSAT sensor parameter definition.
 */
export interface InsatSensorConfig {
  /** Human-readable parameter name, e.g. "AirTemp", "WaterLevel" */
  sensorName: string;

  /** Engineering unit string, e.g. "DegC", "m/s", "mBar" */
  unit: string;

  /** Number of decimal places to display for the computed value */
  rightDigit: number;

  /** Minimum resolution step of the sensor */
  resolution: number;

  /**
   * INSAT sensor IDs that source the raw value(s).
   * Usually a single key like "s00", but WaterLevel uses ["s08", "s09"].
   * Config channels "c1", "c2", "c3" are also valid source keys.
   */
  insatSensorIds: string[];

  /**
   * Positional indices in the INSAT frame (informational / for reference).
   */
  insatSensorPositions: number[];

  /**
   * The equation string in human-readable form for display.
   * e.g. "(Abs(x)-400)/10", "x/2", "(x1+x2)+MSL"
   */
  equationDisplay: string;

  /**
   * The equation type identifier for the compute engine.
   * Maps to a known function in the compute engine.
   */
  equationType: InsatEquationType;

  /**
   * Optional equation parameters (e.g. MSL value for WaterLevel).
   */
  equationParams?: Record<string, number>;

  /** Whether this config is enabled for display */
  enabled: boolean;
}

/**
 * Enumeration of supported INSAT equation types.
 * Each maps to a specific mathematical transform in the compute engine.
 */
export type InsatEquationType =
  | 'abs_minus_offset_div'    // (Abs(x) - offset) / divisor  → AirTemp
  | 'x_div'                   // x / divisor                   → Battery, Rainfall
  | 'abs_x_div'               // Abs(x) / divisor              → Humidity, WindSpeed
  | 'pressure_formula'        // (x/(x+ε)) * ((x/10.23)+925)  → Pressure
  | 'identity'                // x (pass-through)              → RainDaily, SolarRad
  | 'abs_x'                   // Abs(x)                        → Evaporation, WindDir
  | 'composite_water_level';  // (x1 + x2) + MSL              → WaterLevel (s08 & s09)

/**
 * Result of applying an INSAT equation to a raw sensor value.
 */
export interface ComputedEngineeringValue {
  /** The INSAT parameter name, e.g. "AirTemp" */
  parameterName: string;

  /** Engineering unit, e.g. "DegC" */
  unit: string;

  /** Computed engineering value, or null if inputs are corrupt/missing */
  value: number | null;

  /** Formatted display string with proper decimal places */
  displayValue: string;

  /** The raw input value(s) used */
  rawInputs: (number | null)[];

  /** Source sensor key(s) */
  sourceKeys: string[];

  /** Whether computation succeeded */
  isValid: boolean;
}

/**
 * Complete set of computed engineering values for a single CSD record.
 * Keyed by INSAT parameter name.
 */
export type RecordEngineeringValues = Record<string, ComputedEngineeringValue>;

/**
 * The full INSAT sensor configuration profile.
 * Contains the ordered list of all configured sensors.
 */
export interface InsatSensorProfile {
  /** Profile name, e.g. "CWC Default" */
  name: string;

  /** Description */
  description: string;

  /** Ordered list of sensor configurations */
  sensors: InsatSensorConfig[];

  /** Default MSL (Mean Sea Level) value for WaterLevel computation */
  defaultMSL: number;
}
