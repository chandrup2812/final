import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  set,
  get,
  Database,
  Unsubscribe,
} from 'firebase/database';
import { spiderZenStore } from './spiderZenStore';

export interface FirebaseIoTConfig {
  databaseURL: string;
  projectId?: string;
  apiKey?: string;
  databaseSecret?: string;
}

const STORAGE_KEY_FIREBASE = 'spiderzen_firebase_iot_config_v1';

export const DEFAULT_FIREBASE_CONFIG: FirebaseIoTConfig = {
  databaseURL: 'https://spiderzen-dosimeter-default-rtdb.firebaseio.com',
  projectId: 'spiderzen-dosimeter',
  apiKey: '',
  databaseSecret: '',
};

class FirebaseSyncService {
  private app: FirebaseApp | null = null;
  private db: Database | null = null;
  private config: FirebaseIoTConfig = DEFAULT_FIREBASE_CONFIG;
  private activeListeners: Map<string, Unsubscribe> = new Map();
  private pollIntervals: Map<string, any> = new Map();
  private isConnected: boolean = false;
  private connectionStatusListeners: Set<(connected: boolean, lastEvent?: string) => void> = new Set();
  private lastLog: string = 'Initialized. Ready to connect.';

  constructor() {
    this.loadConfig();
    this.initFirebase();
  }

  public getConfig(): FirebaseIoTConfig {
    return { ...this.config };
  }

  public saveConfig(newConfig: Partial<FirebaseIoTConfig>) {
    this.config = { ...this.config, ...newConfig };
    // Clean trailing slash
    if (this.config.databaseURL.endsWith('/')) {
      this.config.databaseURL = this.config.databaseURL.slice(0, -1);
    }
    try {
      localStorage.setItem(STORAGE_KEY_FIREBASE, JSON.stringify(this.config));
    } catch {
      // storage unavailable
    }
    this.initFirebase();
  }

  private loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_FIREBASE);
      if (raw) {
        this.config = { ...DEFAULT_FIREBASE_CONFIG, ...JSON.parse(raw) };
      }
    } catch {
      this.config = { ...DEFAULT_FIREBASE_CONFIG };
    }
  }

  private initFirebase() {
    // Unsubscribe previous listeners
    this.activeListeners.forEach((unsub) => unsub());
    this.activeListeners.clear();
    this.pollIntervals.forEach((interval) => clearInterval(interval));
    this.pollIntervals.clear();

    const dbUrl = this.config.databaseURL || DEFAULT_FIREBASE_CONFIG.databaseURL;

    try {
      let app: FirebaseApp;
      if (getApps().length === 0) {
        app = initializeApp({
          databaseURL: dbUrl,
          projectId: this.config.projectId || 'spiderzen-dosimeter',
          apiKey: this.config.apiKey || 'AIzaSySpiderZenPlaceholderKey',
        });
      } else {
        app = getApp();
      }

      this.app = app;
      this.db = getDatabase(app, dbUrl);
      this.isConnected = true;
      this.lastLog = `Connected to Firebase RTDB: ${dbUrl}`;
      this.notifyStatus(true, this.lastLog);
    } catch (err: any) {
      console.warn('[FirebaseSync] SDK init notice (will use REST fallback if needed):', err.message);
      this.isConnected = false;
      this.lastLog = `Using REST API for: ${dbUrl}`;
      this.notifyStatus(false, this.lastLog);
    }
  }

  public subscribeToDevice(deviceId: string) {
    if (this.activeListeners.has(deviceId)) return;

    const sensorPath = `devices/${deviceId}/sensor`;
    this.lastLog = `Subscribing to Firebase path: /${sensorPath}`;

    // Method 1: Modern Firebase SDK Real-Time WebSocket stream
    if (this.db) {
      try {
        const sensorRef = ref(this.db, sensorPath);
        const unsubscribe = onValue(
          sensorRef,
          (snapshot) => {
            const data = snapshot.val();
            if (data) {
              this.handleIncomingTelemetry(deviceId, data);
            }
          },
          (error) => {
            console.warn('[FirebaseSync] Stream error, activating REST poll:', error.message);
            this.startRestPolling(deviceId);
          }
        );

        this.activeListeners.set(deviceId, unsubscribe);
        return;
      } catch (err) {
        console.warn('[FirebaseSync] SDK subscription failed, using REST:', err);
      }
    }

    // Method 2: High-compatibility REST Polling (Zero API key required!)
    this.startRestPolling(deviceId);
  }

  private startRestPolling(deviceId: string) {
    if (this.pollIntervals.has(deviceId)) return;

    const poll = async () => {
      try {
        const url = `${this.config.databaseURL}/devices/${deviceId}/sensor.json`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          if (data) {
            this.handleIncomingTelemetry(deviceId, data);
            if (!this.isConnected) {
              this.isConnected = true;
              this.notifyStatus(true, 'REST connection verified');
            }
          }
        }
      } catch {
        // network or CORS transient issue
      }
    };

    poll();
    const intervalId = setInterval(poll, 3000);
    this.pollIntervals.set(deviceId, intervalId);
  }

  private handleIncomingTelemetry(deviceId: string, data: any) {
    const temp = Number(data.temp ?? data.temperatureC ?? data.temperature ?? 25.0);
    const hum = Number(data.humidity ?? data.humidityPct ?? 50.0);
    const smoke = Number(data.smoke_value ?? data.smokeValue ?? data.smoke ?? 0);
    const deltaE = Number(data.color_delta_e ?? data.colorDeltaE ?? data.delta_e ?? 0);

    spiderZenStore.updateDeviceTelemetry(deviceId, temp, hum, smoke, deltaE);

    this.lastLog = `[RX ${new Date().toLocaleTimeString()}] Smoke: ${smoke} | Temp: ${temp}°C | RH: ${hum}% | ΔE: ${deltaE.toFixed(1)}`;
    this.notifyStatus(true, this.lastLog);
  }

  /**
   * Pushes a 20-second industrial alert command to Firebase RTDB.
   * The ESP32's Firebase stream listener will immediately receive this and activate:
   * - Red LED: ON
   * - Green LED: OFF
   * - Buzzer: ON
   * - Vibration Motor: ON
   */
  public async sendHardwareAlert(deviceId: string, level: 'WARNING' | 'DANGER' | 'CLEAR'): Promise<boolean> {
    const alertData = {
      level,
      active: level !== 'CLEAR',
      timestamp: Date.now(),
      sender: 'SpiderZen-WebApp',
    };

    // 1. Try Firebase SDK
    if (this.db) {
      try {
        const alertRef = ref(this.db, `devices/${deviceId}/alert`);
        await set(alertRef, alertData);
        this.lastLog = `[TX] Sent ${level} alert to /devices/${deviceId}/alert via Firebase SDK`;
        this.notifyStatus(true, this.lastLog);
        return true;
      } catch (err: any) {
        console.warn('[FirebaseSync] SDK write error, falling back to REST:', err.message);
      }
    }

    // 2. Try Firebase REST API (PUT /devices/{deviceId}/alert.json)
    try {
      const url = `${this.config.databaseURL}/devices/${deviceId}/alert.json`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData),
      });

      if (res.ok) {
        this.lastLog = `[TX] Sent ${level} alert to /devices/${deviceId}/alert via Firebase REST API`;
        this.notifyStatus(true, this.lastLog);
        return true;
      }
    } catch (err: any) {
      console.warn('[FirebaseSync] REST write error:', err.message);
    }

    return false;
  }

  /**
   * Pushes simulated or test hardware telemetry directly into Firebase RTDB
   * so the user can verify the database works before physically plugging in the ESP32!
   */
  public async pushTestTelemetryToFirebase(deviceId: string, smoke = 1350, dE = 4.2): Promise<boolean> {
    const sampleData = {
      temp: Number((24.8 + Math.random() * 1.5).toFixed(1)),
      humidity: Number((49.5 + Math.random() * 3).toFixed(1)),
      smoke_value: smoke,
      color_delta_e: dE,
      safe: smoke < 1500 && dE < 12.0,
      timestamp: Date.now(),
      rgb: [230, 220, 205],
    };

    // 1. Try Firebase SDK
    if (this.db) {
      try {
        const sensorRef = ref(this.db, `devices/${deviceId}/sensor`);
        await set(sensorRef, sampleData);
        this.lastLog = `[TEST] Successfully pushed test telemetry to Firebase RTDB!`;
        this.notifyStatus(true, this.lastLog);
        this.handleIncomingTelemetry(deviceId, sampleData);
        return true;
      } catch {
        // try REST
      }
    }

    // 2. Try REST API
    try {
      const url = `${this.config.databaseURL}/devices/${deviceId}/sensor.json`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleData),
      });

      if (res.ok) {
        this.lastLog = `[TEST] Successfully pushed test telemetry via Firebase REST API!`;
        this.notifyStatus(true, this.lastLog);
        this.handleIncomingTelemetry(deviceId, sampleData);
        return true;
      }
    } catch {
      // transient failure
    }

    return false;
  }

  public onStatusChange(callback: (connected: boolean, lastEvent?: string) => void): () => void {
    this.connectionStatusListeners.add(callback);
    callback(this.isConnected, this.lastLog);
    return () => this.connectionStatusListeners.delete(callback);
  }

  private notifyStatus(connected: boolean, lastEvent?: string) {
    this.isConnected = connected;
    this.connectionStatusListeners.forEach((cb) => cb(connected, lastEvent));
  }
}

export const firebaseSync = new FirebaseSyncService();
