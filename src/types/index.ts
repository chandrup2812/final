export type ExposureStatus = 'ESTIMATED' | 'SIMULATED' | 'VALIDATED';

export type StripType = 'FAST' | 'SLOW';

export type SafetyLevel = 'SAFE' | 'CAUTION' | 'WARNING' | 'DANGER';

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface HSVColor {
  h: number; // 0 - 360
  s: number; // 0 - 100
  v: number; // 0 - 100
}

export interface LabColor {
  L: number; // 0 - 100
  a: number; // -128 - 127
  b: number; // -128 - 127
}

export interface QualityGateResult {
  passed: boolean;
  blurScore: number; // Laplacian variance
  blurPassed: boolean;
  lightingScore: number; // Mean luminance
  lightingPassed: boolean;
  stripDetected: boolean;
  patchDetected: boolean;
  reasons: string[];
}

export interface ScanResult {
  id: string;
  workerId: string;
  workerName: string;
  deviceId?: string;
  exposurePpmHr: number;
  status: ExposureStatus;
  stripType: StripType;
  rgb: RGBColor;
  hsv: HSVColor;
  lab: LabColor;
  referenceLab: LabColor;
  deltaE: number; // CIEDE2000
  temperatureC: number;
  humidityPct: number;
  calibrationModel: string;
  calibrationVersion: string;
  timestamp: string;
  imageUrl?: string;
  notes?: string;
  safetyLevel: SafetyLevel;
}

export interface WorkerProfile {
  id: string;
  name: string;
  role: 'worker' | 'supervisor' | 'safety_officer';
  shift: string;
  assignedDeviceId?: string;
  currentExposurePpmHr: number;
  safetyLevel: SafetyLevel;
  lastScanTimestamp: string;
  scansCount: number;
}

export interface FusionStatus {
  smokeAboveThreshold: boolean;
  colorDeltaAboveThreshold: boolean;
  dualAgreement: boolean;
  cautionOnly: boolean;
}

export interface EarlyWarningPrediction {
  isPredictingBreach: boolean;
  predictedBreachMinutes: number | null; // e.g. 4.2 minutes
  trendRatePpmHrPerMin: number; // rate of change
  projectedExposureIn5Min: number;
  message: string;
}

export interface ESP32Device {
  deviceId: string;
  name: string;
  online: boolean;
  lastSeen: string;
  firmwareVersion: string;
  pairedWorkerId?: string;
  wifiSSID?: string;
  ipAddress?: string;
  telemetry: {
    temperatureC: number;
    humidityPct: number;
    smokeValue: number; // MQ-2 analog reading
    gasRaw: number;
    gasFlag: boolean;
    rgb: [number, number, number]; // from TCS34725/TCS3200 sensor
    colorDeltaE: number;
    compensatedDeltaE: number; // Temperature & Humidity compensated
    warmupRemainingSec: number; // 60s MQ-2 warm-up
    sensorError: boolean;
    timestamp: string;
  };
  alertState: {
    active: boolean;
    level: 'NONE' | 'CAUTION' | 'WARNING' | 'DANGER';
    ledGreen: boolean; // TRUE normally in safe state
    ledRed: boolean;   // FALSE normally, TRUE in WARNING/DANGER
    buzzerTriggered: boolean;
    vibrationTriggered: boolean;
    durationRemainingSec: number; // Exactly 20-second active alert window
    cycleCount: number;
    lastTriggeredTime?: string;
    exposureValue?: number;
    isEarlyPrediction?: boolean;
    dualConfirmed?: boolean;
  };
  fusion: FusionStatus;
  prediction: EarlyWarningPrediction;
}

export interface SafetyAlert {
  id: string;
  timestamp: string;
  workerId: string;
  workerName: string;
  deviceId?: string;
  exposurePpmHr: number;
  thresholdBreached: number;
  level: SafetyLevel;
  esp32TriggerConfirmed: boolean;
  resolved: boolean;
  notes?: string;
  dualConfirmed?: boolean;
  isEarlyPrediction?: boolean;
  predictedMinutes?: number;
  activeDurationSec?: number;
}

export interface ThresholdConfig {
  safeMax: number;       // e.g. 5 ppm·hr
  cautionMax: number;    // e.g. 15 ppm·hr
  warningMax: number;    // e.g. 50 ppm·hr
  dangerMin: number;     // e.g. 50 ppm·hr
  smokeThreshold: number; // MQ-2 analog threshold e.g. 1500
  colorDeltaThreshold: number; // Delta-E threshold e.g. 12.0
}

export interface CalibrationDatasetRow {
  strip_id: string;
  strip_type: StripType;
  rgb_r: number;
  rgb_g: number;
  rgb_b: number;
  ref_r: number;
  ref_g: number;
  ref_b: number;
  delta_e: number;
  temperature_c: number;
  humidity_pct: number;
  true_exposure_ppm_hr: number;
  chamber_duration_hrs?: number;
  chamber_conc_ppm?: number;
}

export interface CalibrationMetrics {
  modelType: 'Gradient Boosting (GBR)' | 'Random Forest' | 'Polynomial Regressor';
  nSamples: number;
  mae: number;
  rmse: number;
  r2: number;
  kFoldFolds: number;
  trainingDate: string;
  version: string;
  featureImportances: { feature: string; importance: number }[];
}
