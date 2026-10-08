import {
  ESP32Device,
  SafetyAlert,
  ScanResult,
  ThresholdConfig,
  WorkerProfile,
} from '../types';
import { DEFAULT_THRESHOLDS, determineSafetyLevel } from './aiEstimator';

const STORAGE_KEY_SCANS = 'spiderzen_scans_v2';
const STORAGE_KEY_THRESHOLDS = 'spiderzen_thresholds_v2';
const STORAGE_KEY_DEVICES = 'spiderzen_devices_v2';
const STORAGE_KEY_WORKERS = 'spiderzen_workers_v2';
const STORAGE_KEY_ALERTS = 'spiderzen_alerts_v2';

export const UPDATED_DEFAULT_THRESHOLDS: ThresholdConfig = {
  ...DEFAULT_THRESHOLDS,
  smokeThreshold: 1500,       // MQ-2 ADC reading threshold
  colorDeltaThreshold: 12.0,  // ΔE threshold from fresh baseline
};

// Seed sample refinery workers
export const INITIAL_WORKERS: WorkerProfile[] = [
  {
    id: 'WKR-101',
    name: 'Sanjay Kumar',
    role: 'worker',
    shift: 'Shift A (06:00 - 14:00)',
    assignedDeviceId: 'SPIDERZEN-ESP32-01',
    currentExposurePpmHr: 18.4,
    safetyLevel: 'WARNING',
    lastScanTimestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    scansCount: 4,
  },
  {
    id: 'WKR-102',
    name: 'Elena Rostova',
    role: 'worker',
    shift: 'Shift A (06:00 - 14:00)',
    assignedDeviceId: 'SPIDERZEN-ESP32-02',
    currentExposurePpmHr: 3.2,
    safetyLevel: 'SAFE',
    lastScanTimestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    scansCount: 2,
  },
  {
    id: 'WKR-103',
    name: 'Marcus Vance',
    role: 'worker',
    shift: 'Shift B (14:00 - 22:00)',
    assignedDeviceId: 'SPIDERZEN-ESP32-03',
    currentExposurePpmHr: 8.7,
    safetyLevel: 'CAUTION',
    lastScanTimestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    scansCount: 3,
  },
  {
    id: 'WKR-104',
    name: 'Priya Sharma',
    role: 'supervisor',
    shift: 'Supervisor Shift',
    assignedDeviceId: undefined,
    currentExposurePpmHr: 0.8,
    safetyLevel: 'SAFE',
    lastScanTimestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    scansCount: 1,
  },
];

// Seed sample ESP32 devices with edited hardware specs:
// MQ-2, DHT11, TCS RGB sensor, Green/Red LED state machine, 20s alert timer
export const INITIAL_DEVICES: ESP32Device[] = [
  {
    deviceId: 'SPIDERZEN-ESP32-01',
    name: 'Wristband Node #1 (Sulfur Unit)',
    online: true,
    lastSeen: new Date().toISOString(),
    firmwareVersion: '3.0.0-spz',
    pairedWorkerId: 'WKR-101',
    wifiSSID: 'Refinery_Mesh_IoT_North',
    ipAddress: '192.168.10.45',
    telemetry: {
      temperatureC: 26.4,
      humidityPct: 54.0,
      smokeValue: 1920, // MQ-2 above threshold
      gasRaw: 1920,
      gasFlag: true,
      rgb: [165, 138, 95], // TCS Color reading
      colorDeltaE: 24.8,
      compensatedDeltaE: 23.2, // Temp/Hum compensated
      warmupRemainingSec: 0,
      sensorError: false,
      timestamp: new Date().toISOString(),
    },
    alertState: {
      active: true,
      level: 'WARNING',
      ledGreen: false, // GREEN OFF
      ledRed: true,    // RED ON
      buzzerTriggered: true,
      vibrationTriggered: true,
      durationRemainingSec: 14, // 20s countdown
      cycleCount: 1,
      lastTriggeredTime: new Date(Date.now() - 6 * 1000).toISOString(),
      exposureValue: 18.4,
      dualConfirmed: true,
    },
    fusion: {
      smokeAboveThreshold: true,
      colorDeltaAboveThreshold: true,
      dualAgreement: true,
      cautionOnly: false,
    },
    prediction: {
      isPredictingBreach: true,
      predictedBreachMinutes: 4.2,
      trendRatePpmHrPerMin: 1.15,
      projectedExposureIn5Min: 24.1,
      message: 'H₂S exposure rising — predicted threshold breach in ~4.2 min. Move to safe area.',
    },
  },
  {
    deviceId: 'SPIDERZEN-ESP32-02',
    name: 'Wristband Node #2 (Alkylation)',
    online: true,
    lastSeen: new Date().toISOString(),
    firmwareVersion: '3.0.0-spz',
    pairedWorkerId: 'WKR-102',
    wifiSSID: 'Refinery_Mesh_IoT_South',
    ipAddress: '192.168.10.46',
    telemetry: {
      temperatureC: 24.1,
      humidityPct: 48.0,
      smokeValue: 340,
      gasRaw: 340,
      gasFlag: false,
      rgb: [242, 238, 222],
      colorDeltaE: 2.1,
      compensatedDeltaE: 1.9,
      warmupRemainingSec: 0,
      sensorError: false,
      timestamp: new Date().toISOString(),
    },
    alertState: {
      active: false,
      level: 'NONE',
      ledGreen: true,  // GREEN ON normally in safe state
      ledRed: false,   // RED OFF normally
      buzzerTriggered: false,
      vibrationTriggered: false,
      durationRemainingSec: 0,
      cycleCount: 0,
    },
    fusion: {
      smokeAboveThreshold: false,
      colorDeltaAboveThreshold: false,
      dualAgreement: false,
      cautionOnly: false,
    },
    prediction: {
      isPredictingBreach: false,
      predictedBreachMinutes: null,
      trendRatePpmHrPerMin: 0.05,
      projectedExposureIn5Min: 3.4,
      message: 'Exposure trend stable within safe threshold.',
    },
  },
  {
    deviceId: 'SPIDERZEN-ESP32-03',
    name: 'Collar Node #3 (Hydrocracker)',
    online: true,
    lastSeen: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    firmwareVersion: '3.0.0-spz',
    pairedWorkerId: 'WKR-103',
    wifiSSID: 'Refinery_Mesh_IoT_East',
    ipAddress: '192.168.10.47',
    telemetry: {
      temperatureC: 28.2,
      humidityPct: 61.0,
      smokeValue: 1250, // Single signal spike without color breach (Caution only)
      gasRaw: 1250,
      gasFlag: false,
      rgb: [225, 215, 185],
      colorDeltaE: 7.4,
      compensatedDeltaE: 6.8,
      warmupRemainingSec: 0,
      sensorError: false,
      timestamp: new Date().toISOString(),
    },
    alertState: {
      active: false,
      level: 'CAUTION',
      ledGreen: true,  // GREEN ON (no alarm because only 1 signal fired!)
      ledRed: false,
      buzzerTriggered: false,
      vibrationTriggered: false,
      durationRemainingSec: 0,
      cycleCount: 0,
    },
    fusion: {
      smokeAboveThreshold: false,
      colorDeltaAboveThreshold: false,
      dualAgreement: false,
      cautionOnly: true, // Only smoke elevated, prevents false alarm!
    },
    prediction: {
      isPredictingBreach: false,
      predictedBreachMinutes: 8.5,
      trendRatePpmHrPerMin: 0.35,
      projectedExposureIn5Min: 10.4,
      message: 'Sub-acute accumulation monitored. Dual-fusion agreement pending.',
    },
  },
];

// Seed initial scan history
export const INITIAL_SCANS: ScanResult[] = [
  {
    id: 'SCN-9021',
    workerId: 'WKR-101',
    workerName: 'Sanjay Kumar',
    deviceId: 'SPIDERZEN-ESP32-01',
    exposurePpmHr: 18.4,
    status: 'VALIDATED',
    stripType: 'FAST',
    rgb: { r: 182, g: 156, b: 112 },
    hsv: { h: 38, s: 38, v: 71 },
    lab: { L: 65.2, a: 3.4, b: 26.8 },
    referenceLab: { L: 96.5, a: -0.2, b: 1.8 },
    deltaE: 24.8,
    temperatureC: 26.4,
    humidityPct: 54.0,
    calibrationModel: 'Gradient Boosting (GBR)',
    calibrationVersion: 'cal-v3.0-cv5',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    safetyLevel: 'WARNING',
    notes: 'Sample taken near Hydrodesulfurization separator unit pump seal.',
  },
  {
    id: 'SCN-9020',
    workerId: 'WKR-103',
    workerName: 'Marcus Vance',
    deviceId: 'SPIDERZEN-ESP32-03',
    exposurePpmHr: 8.7,
    status: 'ESTIMATED',
    stripType: 'SLOW',
    rgb: { r: 218, g: 202, b: 172 },
    hsv: { h: 39, s: 21, v: 85 },
    lab: { L: 81.4, a: 1.2, b: 16.5 },
    referenceLab: { L: 96.5, a: -0.2, b: 1.8 },
    deltaE: 14.1,
    temperatureC: 28.2,
    humidityPct: 61.0,
    calibrationModel: 'Gradient Boosting (GBR)',
    calibrationVersion: 'cal-v3.0-cv5',
    timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    safetyLevel: 'CAUTION',
  },
  {
    id: 'SCN-9019',
    workerId: 'WKR-102',
    workerName: 'Elena Rostova',
    deviceId: 'SPIDERZEN-ESP32-02',
    exposurePpmHr: 3.2,
    status: 'VALIDATED',
    stripType: 'FAST',
    rgb: { r: 232, g: 224, b: 202 },
    hsv: { h: 44, s: 13, v: 91 },
    lab: { L: 89.2, a: -0.5, b: 11.2 },
    referenceLab: { L: 96.5, a: -0.2, b: 1.8 },
    deltaE: 7.2,
    temperatureC: 24.1,
    humidityPct: 48.0,
    calibrationModel: 'Gradient Boosting (GBR)',
    calibrationVersion: 'cal-v3.0-cv5',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    safetyLevel: 'SAFE',
  },
];

// Seed initial alerts
export const INITIAL_ALERTS: SafetyAlert[] = [
  {
    id: 'ALT-1001',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    workerId: 'WKR-101',
    workerName: 'Sanjay Kumar',
    deviceId: 'SPIDERZEN-ESP32-01',
    exposurePpmHr: 18.4,
    thresholdBreached: 15.0,
    level: 'WARNING',
    esp32TriggerConfirmed: true,
    resolved: false,
    dualConfirmed: true,
    isEarlyPrediction: false,
    activeDurationSec: 20,
    notes: 'Dual-confirmation agreement (MQ-2 smoke=1920 > 1500 & TCS compensated ΔE=23.2 > 12.0). 20-second RED LED & buzzer active.',
  },
  {
    id: 'ALT-1002',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    workerId: 'WKR-101',
    workerName: 'Sanjay Kumar',
    deviceId: 'SPIDERZEN-ESP32-01',
    exposurePpmHr: 14.2,
    thresholdBreached: 15.0,
    level: 'WARNING',
    esp32TriggerConfirmed: true,
    resolved: true,
    dualConfirmed: true,
    isEarlyPrediction: true,
    predictedMinutes: 4.8,
    activeDurationSec: 20,
    notes: 'AI Early-Warning Forecast: Trend rate 1.2 ppm·hr/min predicted threshold crossing in 4.8 min. Worker notified 5 minutes before breach.',
  },
];

class SpiderZenStore {
  private scans: ScanResult[] = [];
  private workers: WorkerProfile[] = [];
  private devices: ESP32Device[] = [];
  private alerts: SafetyAlert[] = [];
  private thresholds: ThresholdConfig = UPDATED_DEFAULT_THRESHOLDS;
  private listeners: Set<() => void> = new Set();
  private audioContext: AudioContext | null = null;
  private timerInterval: any = null;

  constructor() {
    this.loadState();
    this.start20SecondTimerTicker();
  }

  // 20-Second Active Alert Countdown Ticker (non-blocking)
  private start20SecondTimerTicker() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      let stateChanged = false;

      this.devices = this.devices.map((device) => {
        if (device.alertState.active && device.alertState.durationRemainingSec > 0) {
          const nextSec = device.alertState.durationRemainingSec - 1;
          stateChanged = true;

          if (nextSec === 0) {
            // 20 seconds completed!
            if (device.fusion.dualAgreement) {
              // Danger still persists: re-trigger for another 20s cycle!
              return {
                ...device,
                alertState: {
                  ...device.alertState,
                  durationRemainingSec: 20,
                  cycleCount: device.alertState.cycleCount + 1,
                },
              };
            } else {
              // Danger cleared: auto-stop buzzer & vibration, restore GREEN ON / RED OFF!
              return {
                ...device,
                alertState: {
                  ...device.alertState,
                  active: false,
                  level: 'NONE',
                  ledGreen: true,  // GREEN ON
                  ledRed: false,   // RED OFF
                  buzzerTriggered: false,
                  vibrationTriggered: false,
                  durationRemainingSec: 0,
                  cycleCount: 0,
                },
              };
            }
          }

          return {
            ...device,
            alertState: {
              ...device.alertState,
              durationRemainingSec: nextSec,
            },
          };
        }
        return device;
      });

      if (stateChanged) {
        this.saveState();
      }
    }, 1000);
  }

  private loadState() {
    try {
      const savedScans = localStorage.getItem(STORAGE_KEY_SCANS);
      this.scans = savedScans ? JSON.parse(savedScans) : INITIAL_SCANS;

      const savedWorkers = localStorage.getItem(STORAGE_KEY_WORKERS);
      this.workers = savedWorkers ? JSON.parse(savedWorkers) : INITIAL_WORKERS;

      const savedDevices = localStorage.getItem(STORAGE_KEY_DEVICES);
      this.devices = savedDevices ? JSON.parse(savedDevices) : INITIAL_DEVICES;

      const savedAlerts = localStorage.getItem(STORAGE_KEY_ALERTS);
      this.alerts = savedAlerts ? JSON.parse(savedAlerts) : INITIAL_ALERTS;

      const savedThresholds = localStorage.getItem(STORAGE_KEY_THRESHOLDS);
      this.thresholds = savedThresholds ? JSON.parse(savedThresholds) : UPDATED_DEFAULT_THRESHOLDS;
    } catch {
      this.scans = INITIAL_SCANS;
      this.workers = INITIAL_WORKERS;
      this.devices = INITIAL_DEVICES;
      this.alerts = INITIAL_ALERTS;
      this.thresholds = UPDATED_DEFAULT_THRESHOLDS;
    }
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY_SCANS, JSON.stringify(this.scans));
      localStorage.setItem(STORAGE_KEY_WORKERS, JSON.stringify(this.workers));
      localStorage.setItem(STORAGE_KEY_DEVICES, JSON.stringify(this.devices));
      localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(this.alerts));
      localStorage.setItem(STORAGE_KEY_THRESHOLDS, JSON.stringify(this.thresholds));
    } catch {
      // Ignore storage errors in restricted contexts
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  // Getters
  public getScans(): ScanResult[] {
    return [...this.scans];
  }

  public getWorkers(): WorkerProfile[] {
    return [...this.workers];
  }

  public getDevices(): ESP32Device[] {
    return [...this.devices];
  }

  public getAlerts(): SafetyAlert[] {
    return [...this.alerts];
  }

  public getThresholds(): ThresholdConfig {
    return { ...this.thresholds };
  }

  // Actions
  public updateThresholds(newThresholds: ThresholdConfig) {
    this.thresholds = newThresholds;
    this.workers = this.workers.map((w) => ({
      ...w,
      safetyLevel: determineSafetyLevel(w.currentExposurePpmHr, this.thresholds),
    }));
    this.saveState();
  }

  public recordScan(scan: ScanResult) {
    this.scans.unshift(scan);

    const workerIndex = this.workers.findIndex((w) => w.id === scan.workerId);
    const safetyLevel = determineSafetyLevel(scan.exposurePpmHr, this.thresholds);

    if (workerIndex >= 0) {
      this.workers[workerIndex] = {
        ...this.workers[workerIndex],
        currentExposurePpmHr: scan.exposurePpmHr,
        safetyLevel,
        lastScanTimestamp: scan.timestamp,
        scansCount: this.workers[workerIndex].scansCount + 1,
      };
    }

    if (safetyLevel === 'WARNING' || safetyLevel === 'DANGER') {
      const deviceId = scan.deviceId || this.workers.find((w) => w.id === scan.workerId)?.assignedDeviceId;
      this.triggerHardwareAlert(deviceId, safetyLevel, scan.exposurePpmHr, scan.workerName, false, true);

      const alert: SafetyAlert = {
        id: `ALT-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toISOString(),
        workerId: scan.workerId,
        workerName: scan.workerName,
        deviceId,
        exposurePpmHr: scan.exposurePpmHr,
        thresholdBreached: safetyLevel === 'DANGER' ? this.thresholds.dangerMin : this.thresholds.cautionMax,
        level: safetyLevel,
        esp32TriggerConfirmed: true,
        resolved: false,
        dualConfirmed: true,
        activeDurationSec: 20,
        notes: `Scan breach: ${scan.exposurePpmHr.toFixed(1)} ppm·hr (${scan.stripType} strip, ΔE=${scan.deltaE.toFixed(1)}). RED LED ON / GREEN OFF + 20s Buzzer engaged.`,
      };
      this.alerts.unshift(alert);
    }

    this.saveState();
  }

  /**
   * Triggers hardware alert adhering to exact requirements:
   * - RED LED: ON
   * - GREEN LED: OFF
   * - Buzzer: ON
   * - Vibration: ON
   * - Runs for EXACTLY 20 SECONDS (non-blocking)
   */
  public triggerHardwareAlert(
    deviceId: string | undefined,
    level: 'WARNING' | 'DANGER',
    exposure: number,
    _workerName: string,
    isEarlyPrediction = false,
    dualConfirmed = true
  ) {
    if (!deviceId) return;

    this.devices = this.devices.map((dev) => {
      if (dev.deviceId === deviceId) {
        return {
          ...dev,
          alertState: {
            active: true,
            level,
            ledGreen: false, // GREEN LED TURNS OFF
            ledRed: true,    // RED LED TURNS ON
            buzzerTriggered: true,
            vibrationTriggered: true,
            durationRemainingSec: 20, // Exactly 20 seconds
            cycleCount: dev.alertState.active ? dev.alertState.cycleCount + 1 : 1,
            lastTriggeredTime: new Date().toISOString(),
            exposureValue: exposure,
            isEarlyPrediction,
            dualConfirmed,
          },
        };
      }
      return dev;
    });

    this.playSyntheticBuzzer(level);
    this.saveState();
  }

  /**
   * Resets hardware to safe state:
   * - RED LED: OFF
   * - GREEN LED: ON (normally on in safe state)
   * - Buzzer & Vibration: OFF
   */
  public clearDeviceAlert(deviceId: string) {
    this.devices = this.devices.map((dev) => {
      if (dev.deviceId === deviceId) {
        return {
          ...dev,
          alertState: {
            active: false,
            level: 'NONE',
            ledGreen: true,  // GREEN LED ON (safe state)
            ledRed: false,   // RED LED OFF
            buzzerTriggered: false,
            vibrationTriggered: false,
            durationRemainingSec: 0,
            cycleCount: 0,
          },
          fusion: {
            ...dev.fusion,
            dualAgreement: false,
            cautionOnly: false,
          },
        };
      }
      return dev;
    });
    this.saveState();
  }

  public resolveAlert(alertId: string) {
    this.alerts = this.alerts.map((a) => (a.id === alertId ? { ...a, resolved: true } : a));
    this.saveState();
  }

  /**
   * AI Trend-Based Early-Warning Prediction (5 minutes before breach)
   */
  public triggerEarlyWarningForecast(deviceId: string, predictedMinutes = 4.5) {
    const dev = this.devices.find((d) => d.deviceId === deviceId);
    if (!dev) return;

    const worker = this.workers.find((w) => w.id === dev.pairedWorkerId) || this.workers[0];

    // Fire 20-second early alert
    this.triggerHardwareAlert(deviceId, 'WARNING', dev.telemetry.compensatedDeltaE, worker.name, true, true);

    const alert: SafetyAlert = {
      id: `ALT-PRED-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      workerId: worker.id,
      workerName: worker.name,
      deviceId,
      exposurePpmHr: dev.telemetry.compensatedDeltaE * 0.75,
      thresholdBreached: this.thresholds.cautionMax,
      level: 'WARNING',
      esp32TriggerConfirmed: true,
      resolved: false,
      dualConfirmed: true,
      isEarlyPrediction: true,
      predictedMinutes,
      activeDurationSec: 20,
      notes: `AI Early-Warning Forecast: Rate of change indicates H₂S exposure will cross warning threshold in ~${predictedMinutes} minutes. 20-second warning siren & vibration engaged.`,
    };

    this.alerts.unshift(alert);

    this.devices = this.devices.map((d) =>
      d.deviceId === deviceId
        ? {
            ...d,
            prediction: {
              isPredictingBreach: true,
              predictedBreachMinutes: predictedMinutes,
              trendRatePpmHrPerMin: 1.25,
              projectedExposureIn5Min: 22.5,
              message: `H₂S exposure rising — predicted threshold breach in ~${predictedMinutes} min. Move to safe area.`,
            },
          }
        : d
    );

    this.saveState();
  }

  /**
   * Ingests live telemetry with Dual-Signal Fusion & Temp/Humidity compensation
   */
  public updateDeviceTelemetry(
    deviceId: string,
    temp: number,
    hum: number,
    smokeValue: number,
    colorDeltaE: number
  ) {
    // Temperature & Humidity compensation:
    // corrected_color = raw_RGB - baseline_drift(temp, humidity)
    const tempDrift = 0.40 * (temp - 25.0);
    const humDrift = 0.25 * (hum - 50.0);
    const compensatedDeltaE = Math.max(0, colorDeltaE - (tempDrift * 0.5 + humDrift * 0.3));

    // Dual-Signal Fusion:
    const smokeAbove = smokeValue >= this.thresholds.smokeThreshold;
    const colorAbove = compensatedDeltaE >= this.thresholds.colorDeltaThreshold;
    const dualAgreement = smokeAbove && colorAbove;
    const cautionOnly = (smokeAbove || colorAbove) && !dualAgreement;

    this.devices = this.devices.map((d) => {
      if (d.deviceId === deviceId) {
        return {
          ...d,
          online: true,
          lastSeen: new Date().toISOString(),
          telemetry: {
            ...d.telemetry,
            temperatureC: temp,
            humidityPct: hum,
            smokeValue,
            gasRaw: smokeValue,
            gasFlag: smokeAbove,
            colorDeltaE,
            compensatedDeltaE,
            timestamp: new Date().toISOString(),
          },
          fusion: {
            smokeAboveThreshold: smokeAbove,
            colorDeltaAboveThreshold: colorAbove,
            dualAgreement,
            cautionOnly,
          },
        };
      }
      return d;
    });

    if (dualAgreement) {
      const dev = this.devices.find((d) => d.deviceId === deviceId);
      if (dev && !dev.alertState.active) {
        this.triggerHardwareAlert(deviceId, 'WARNING', compensatedDeltaE, 'Worker', false, true);
      }
    }

    this.saveState();
  }

  public registerOrPairDevice(deviceId: string, name: string, pairedWorkerId?: string, wifiSSID?: string) {
    const existing = this.devices.find((d) => d.deviceId === deviceId);
    if (existing) {
      this.devices = this.devices.map((d) =>
        d.deviceId === deviceId
          ? {
              ...d,
              name,
              pairedWorkerId,
              wifiSSID: wifiSSID || d.wifiSSID,
              online: true,
              lastSeen: new Date().toISOString(),
            }
          : d
      );
    } else {
      this.devices.push({
        deviceId,
        name,
        online: true,
        lastSeen: new Date().toISOString(),
        firmwareVersion: '3.0.0-spz',
        pairedWorkerId,
        wifiSSID: wifiSSID || 'Plant_WiFi_AP',
        ipAddress: '192.168.10.' + (50 + Math.floor(Math.random() * 40)),
        telemetry: {
          temperatureC: 25.0,
          humidityPct: 50.0,
          smokeValue: 350,
          gasRaw: 350,
          gasFlag: false,
          rgb: [245, 240, 225],
          colorDeltaE: 0.8,
          compensatedDeltaE: 0.8,
          warmupRemainingSec: 0,
          sensorError: false,
          timestamp: new Date().toISOString(),
        },
        alertState: {
          active: false,
          level: 'NONE',
          ledGreen: true,  // GREEN ON normally in safe state
          ledRed: false,   // RED OFF normally
          buzzerTriggered: false,
          vibrationTriggered: false,
          durationRemainingSec: 0,
          cycleCount: 0,
        },
        fusion: {
          smokeAboveThreshold: false,
          colorDeltaAboveThreshold: false,
          dualAgreement: false,
          cautionOnly: false,
        },
        prediction: {
          isPredictingBreach: false,
          predictedBreachMinutes: null,
          trendRatePpmHrPerMin: 0.05,
          projectedExposureIn5Min: 1.2,
          message: 'Telemetry stable. Real-time dual-signal fusion active.',
        },
      });
    }

    if (pairedWorkerId) {
      this.workers = this.workers.map((w) =>
        w.id === pairedWorkerId ? { ...w, assignedDeviceId: deviceId } : w
      );
    }

    this.saveState();
  }

  public playSyntheticBuzzer(level: 'WARNING' | 'DANGER' | 'TEST') {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const ctx = this.audioContext;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.08, ctx.currentTime);

      if (level === 'DANGER') {
        osc.frequency.setValueAtTime(3000, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.15);
        osc.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else if (level === 'WARNING') {
        osc.frequency.setValueAtTime(2200, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.setValueAtTime(0.001, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.06, ctx.currentTime + 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.frequency.setValueAtTime(1800, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch {
      // Audio playback safely caught
    }
  }

  public exportScansCsv(): string {
    const headers = [
      'Scan_ID',
      'Timestamp',
      'Worker_ID',
      'Worker_Name',
      'Device_ID',
      'Exposure_Ppm_Hr',
      'Safety_Level',
      'Status',
      'Strip_Type',
      'Delta_E_CIEDE2000',
      'RGB_R',
      'RGB_G',
      'RGB_B',
      'Lab_L',
      'Lab_a',
      'Lab_b',
      'Temperature_C',
      'Humidity_Pct',
      'Calibration_Model',
    ];

    const rows = this.scans.map((s) => [
      s.id,
      s.timestamp,
      s.workerId,
      `"${s.workerName.replace(/"/g, '""')}"`,
      s.deviceId || 'N/A',
      s.exposurePpmHr.toFixed(2),
      s.safetyLevel,
      s.status,
      s.stripType,
      s.deltaE.toFixed(2),
      s.rgb.r,
      s.rgb.g,
      s.rgb.b,
      s.lab.L.toFixed(1),
      s.lab.a.toFixed(1),
      s.lab.b.toFixed(1),
      s.temperatureC.toFixed(1),
      s.humidityPct.toFixed(1),
      `"${s.calibrationModel}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export const spiderZenStore = new SpiderZenStore();
