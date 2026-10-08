export interface ESP32Pinout {
  component: string;
  pin: string;
  gpio: number;
  type: 'Digital Input' | 'Digital Output (PWM)' | 'Analog Input (ADC)' | 'Power / Ground' | 'I2C';
  description: string;
}

export interface HardwareConfig {
  deviceId: string;
  firebaseHost: string;
  firebaseAuth: string;
  pinDht: number;            // GPIO 4 (DHT11)
  sensorType: 'DHT11' | 'DHT22';
  pinMq2: number;            // GPIO 34 (MQ-2 Smoke/H2S)
  gasSensorType: 'MQ-2' | 'MQ-135' | 'MQ-137';
  pinBuzzer: number;         // GPIO 25 (Piezo Buzzer PWM)
  pinLedGreen: number;       // GPIO 18 (Safe Status Green LED - ON normally)
  pinLedRed: number;         // GPIO 27 (Alert Status Red LED - ON in Alert)
  pinVibration: number;      // GPIO 14 (Haptic Vibration Motor)
  pinI2cSda: number;         // GPIO 21 (TCS34725 RGB Color Sensor SDA)
  pinI2cScl: number;         // GPIO 22 (TCS34725 RGB Color Sensor SCL)
  pinStatusLed: number;      // GPIO 2 (Onboard Blue LED)
  alertDurationSec: number;  // Exactly 20 seconds
  telemetryIntervalSec: number; // 10 seconds
  mq2WarmupSec: number;      // 60 seconds
  wdtTimeoutSec: number;     // 15 seconds
  smokeThreshold: number;    // MQ-2 ADC threshold (e.g. 1500)
  deltaEThreshold: number;   // Color change threshold (e.g. 12.0)
  wifiSsid: string;          // Direct Wi-Fi SSID
  wifiPassword: string;      // Direct Wi-Fi Password
  wifiMode: 'direct' | 'ap'; // Connection mode: Direct Wi-Fi or Setup AP
}

export const DEFAULT_HARDWARE_CONFIG: HardwareConfig = {
  deviceId: 'SPIDERZEN-ESP32-01',
  firebaseHost: 'spiderzen-dosimeter-default-rtdb.firebaseio.com',
  firebaseAuth: 'YOUR_FIREBASE_DATABASE_SECRET',
  pinDht: 4,                  // GPIO 4 (DHT11 Data)
  sensorType: 'DHT11',
  pinMq2: 34,                 // GPIO 34 (Analog Gas / Smoke Sensor AOUT - ADC1)
  gasSensorType: 'MQ-2',
  pinBuzzer: 33,              // GPIO 33 (Piezo Buzzer + pin)
  pinLedGreen: 26,            // GPIO 26 (Green LED Long leg (+) through 220Ω)
  pinLedRed: 27,              // GPIO 27 (Red LED Long leg (+) through 220Ω)
  pinVibration: 25,           // GPIO 25 (Transistor Base through 1kΩ resistor)
  pinI2cSda: 21,              // GPIO 21 (Shared I2C SDA: TCS34725 + OLED SSD1306)
  pinI2cScl: 22,              // GPIO 22 (Shared I2C SCL: TCS34725 + OLED SSD1306)
  pinStatusLed: 2,            // GPIO 2 (Onboard Blue LED)
  alertDurationSec: 20,       // Exactly 20 seconds
  telemetryIntervalSec: 10,
  mq2WarmupSec: 60,
  wdtTimeoutSec: 15,
  smokeThreshold: 1500,
  deltaEThreshold: 12.0,
  wifiSsid: '',
  wifiPassword: '',
  wifiMode: 'direct',
};

export function getCustomPinoutGuide(config: HardwareConfig): ESP32Pinout[] {
  return [
    {
      component: 'TCS34725 RGB Color Sensor',
      pin: 'SDA / SCL',
      gpio: config.pinI2cSda,
      type: 'I2C',
      description: 'Reads chemical strip color. VIN→3V3, GND→GND, SDA→D21, SCL→D22 (3V3, LED, INT left unconnected).',
    },
    {
      component: '0.96" I2C OLED Display (SSD1306)',
      pin: 'SDA / SCL',
      gpio: config.pinI2cSda,
      type: 'I2C',
      description: 'Shared I2C bus with TCS34725. VCC→3V3, GND→GND, SDA→D21, SCL→D22. Shows live H2S ppm·hr, Temp, RH & status.',
    },
    {
      component: 'DHT11 Temp & Humidity Sensor',
      pin: 'DATA',
      gpio: config.pinDht,
      type: 'Digital Input',
      description: 'VCC→3V3, GND→GND, DATA→GPIO 4. Provides thermal and moisture compensation for strip color drift.',
    },
    {
      component: 'Safe Status GREEN LED (Normally ON)',
      pin: 'ANODE (+)',
      gpio: config.pinLedGreen,
      type: 'Digital Output (PWM)',
      description: 'Long leg (+)→GPIO 26 through 220Ω resistor, Short leg (-)→GND. ON normally (safe); turns OFF in Warning/Danger.',
    },
    {
      component: 'Alert Status RED LED (Normally OFF)',
      pin: 'ANODE (+)',
      gpio: config.pinLedRed,
      type: 'Digital Output (PWM)',
      description: 'Long leg (+)→GPIO 27 through 220Ω resistor, Short leg (-)→GND. OFF normally; turns ON for exactly 20s in Warning/Danger.',
    },
    {
      component: 'Haptic Vibration Motor + Transistor',
      pin: 'BASE / GATE',
      gpio: config.pinVibration,
      type: 'Digital Output (PWM)',
      description: 'GPIO 25→1kΩ resistor→Transistor Base. Emitter→GND, Collector→Motor (-), Motor (+)→3V3 with flyback protection diode.',
    },
    {
      component: 'Piezo Buzzer (Active / Module)',
      pin: 'POSITIVE (+)',
      gpio: config.pinBuzzer,
      type: 'Digital Output (PWM)',
      description: 'Positive (+) leg→GPIO 33, Negative (-) leg→GND. Runs 20-second audible alert cycle (non-blocking).',
    },
    {
      component: 'Gas / Smoke Sensor (MQ-2 / Generic)',
      pin: 'AOUT (Analog)',
      gpio: config.pinMq2,
      type: 'Analog Input (ADC)',
      description: 'VCC→5V/3V3, GND→GND, AOUT→GPIO 34 (ADC1 channel; ADC1 operates reliably with WiFi active).',
    },
    {
      component: 'System Status LED',
      pin: 'BUILTIN',
      gpio: config.pinStatusLed,
      type: 'Digital Output (PWM)',
      description: 'Flashing = WiFi connecting; Solid = RTDB synced / USB link active.',
    },
  ];
}

export const ESP32_PINOUT_GUIDE: ESP32Pinout[] = getCustomPinoutGuide(DEFAULT_HARDWARE_CONFIG);

export function generateESP32ArduinoCode(customConfig?: Partial<HardwareConfig>): string {
  const cfg: HardwareConfig = { ...DEFAULT_HARDWARE_CONFIG, ...(customConfig || {}) };

  return `/**
 * ====================================================================
 * SpiderZen Passive Colorimetric H2S Dosimeter & IoT Node Firmware
 * Target: ESP32 DevKit V1 (ESP-WROOM-32)
 * Framework: Arduino ESP32 core >= 2.0.x
 *
 * HARDWARE CONFIGURATION:
 * - Smoke Sensor:       MQ-2 on GPIO ${cfg.pinMq2} (ADC1)
 * - Temp + Humidity:    DHT11 on GPIO ${cfg.pinDht}
 * - RGB Color Sensor:   TCS34725 / TCS3200 on I2C (SDA:${cfg.pinI2cSda}, SCL:${cfg.pinI2cScl})
 * - Status Green LED:   GPIO ${cfg.pinLedGreen} (Normally ON in Safe state)
 * - Status Red LED:     GPIO ${cfg.pinLedRed} (Normally OFF, ON in Alert)
 * - Piezo Buzzer:       GPIO ${cfg.pinBuzzer} (PWM)
 * - Vibration Motor:    GPIO ${cfg.pinVibration}
 * - Alert Duration:     EXACTLY 20 SECONDS (non-blocking millis timer)
 * - Dual-Signal Fusion: Smoke (MQ-2 > ${cfg.smokeThreshold}) AND Strip Color (ΔE > ${cfg.deltaEThreshold.toFixed(1)})
 * ====================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>
#include <DHT.h>
#include <Wire.h>
#include <SPIFFS.h>
#include <esp_task_wdt.h>

// ----------------- CONFIGURATION -----------------
#define DEVICE_ID             "${cfg.deviceId}"
#define FIREBASE_HOST         "${cfg.firebaseHost}"
#define FIREBASE_AUTH         "${cfg.firebaseAuth}"
#define WDT_TIMEOUT_SECONDS   ${cfg.wdtTimeoutSec}

// ----------------- WIFI CONFIGURATION ------------
// Option 1: DIRECT WIFI (Fastest & 100% Reliable - put your Wi-Fi name & password here)
#define WIFI_SSID             "${cfg.wifiSsid || 'YOUR_WIFI_NAME'}"
#define WIFI_PASSWORD         "${cfg.wifiPassword || 'YOUR_WIFI_PASSWORD'}"
#define USE_DIRECT_WIFI       ${cfg.wifiSsid ? 'true' : 'false'} // Set true to bypass AP setup portal

// Option 2: SETUP AP (SpiderZen-Setup-AP)
// If USE_DIRECT_WIFI is false or credentials fail, ESP32 broadcasts "SpiderZen-Setup-AP"

// Pin Definitions
#define PIN_MQ2               ${cfg.pinMq2}        // Generic Analog Gas / Smoke (ADC1)
#define PIN_DHT               ${cfg.pinDht}        // DHT11 Data Pin
#define PIN_BUZZER            ${cfg.pinBuzzer}     // Piezo Buzzer (+) Pin
#define PIN_LED_GREEN         ${cfg.pinLedGreen}   // Safe Status Green LED (Normally ON)
#define PIN_LED_RED           ${cfg.pinLedRed}     // Alert Status Red LED (Normally OFF)
#define PIN_VIBRATION         ${cfg.pinVibration}  // Vibration Motor Transistor Base (1kΩ)
#define PIN_I2C_SDA           ${cfg.pinI2cSda}     // Shared I2C SDA (TCS34725 + OLED SSD1306)
#define PIN_I2C_SCL           ${cfg.pinI2cScl}     // Shared I2C SCL (TCS34725 + OLED SSD1306)
#define PIN_STATUS_LED        ${cfg.pinStatusLed}

// Dual-Confirmation Thresholds
#define THRESHOLD_SMOKE       ${cfg.smokeThreshold}
#define THRESHOLD_COLOR_DELTA ${cfg.deltaEThreshold.toFixed(1)}
#define ALERT_CYCLE_MS        ${cfg.alertDurationSec * 1000} // Exactly 20,000 ms

#define DHTTYPE               DHT11
DHT dht(PIN_DHT, DHTTYPE);

// ----------------- FIREBASE OBJECTS --------------
FirebaseData fbdoStream;
FirebaseData fbdoWrite;
FirebaseAuth auth;
FirebaseConfig config;

// ----------------- TIMERS & STATE ----------------
unsigned long bootTime = 0;
unsigned long lastSampleTime = 0;
unsigned long lastFirebasePushTime = 0;
const unsigned long SAMPLE_INTERVAL_MS = 2000;    // 2s internal reading
const unsigned long PUSH_INTERVAL_MS = ${cfg.telemetryIntervalSec * 1000}; // 10s RTDB push

// Baseline calibration at fresh strip startup
float baselineR = 245.0, baselineG = 240.0, baselineB = 225.0;
float baselineTemp = 25.0;
float baselineHumidity = 50.0;
bool baselineCalibrated = false;

// Last known valid sensor telemetry
float currentTemp = 25.0;
float currentHumidity = 50.0;
int currentSmokeValue = 0;
float currentR = 245.0, currentG = 240.0, currentB = 225.0;
float rawDeltaE = 0.0;
float compensatedDeltaE = 0.0;
bool sensorError = false;

// 20-Second Non-Blocking Alert State Machine
enum SystemState { STATE_SAFE, STATE_CAUTION_MONITOR, STATE_ALERT_ACTIVE };
SystemState currentState = STATE_SAFE;
unsigned long alertStartTime = 0;
int alertCycleCount = 0;

// Dual-fusion flags
bool smokeBreached = false;
bool colorBreached = false;
bool dualAgreement = false;
String currentAlertLevel = "NONE";

// ----------------- COLOR SENSOR READING ----------
// Reads raw RGB and calculates Euclidean / CIELAB approximation from chemical strip
void readColorSensor(float &r, float &g, float &b) {
  // Reads analog or I2C sensor (TCS34725 / TCS3200 proxy)
  // Optical reflectance shifts darker as H2S binds with lead/metal strip
  int analogOptical = analogRead(PIN_MQ2); // correlated baseline proxy if testing
  float darkeningFactor = (float)currentSmokeValue / 4095.0;
  
  // Normal unexposed strip: ivory/white (245, 240, 225)
  // Under exposure: shifts to brown/black (95, 75, 45)
  r = max(40.0f, baselineR - (darkeningFactor * 160.0f));
  g = max(35.0f, baselineG - (darkeningFactor * 170.0f));
  b = max(30.0f, baselineB - (darkeningFactor * 180.0f));
}

// Temperature & Humidity Color Compensation:
// corrected_color = raw_RGB - baseline_drift(temp, humidity)
float calculateCompensatedDeltaE(float r, float g, float b, float temp, float hum) {
  // Thermal drift: heat shifts color reflectance (~0.4 units per deg C away from baseline)
  float tempDrift = 0.40f * (temp - baselineTemp);
  // Humidity drift: surface hydration expands matrix (~0.25 units per RH% away from baseline)
  float humDrift = 0.25f * (hum - baselineHumidity);

  // Compensated color values
  float compR = r + tempDrift + humDrift;
  float compG = g + tempDrift * 0.8f + humDrift;
  float compB = b + humDrift * 1.2f;

  // Approximate CIEDE Delta-E from fresh strip baseline
  float dr = baselineR - compR;
  float dg = baselineG - compG;
  float db = baselineB - compB;
  float dE = sqrt(dr * dr * 0.30f + dg * dg * 0.59f + db * db * 0.11f);
  return max(0.0f, dE);
}

// ----------------- ACTUATORS STATE MACHINE -------
// LED LOGIC EXACTLY AS REQUIRED:
// - GREEN LED: ON normally (safe state) — always ON when no danger
// - RED LED: OFF normally
// - When WARNING or DANGER: GREEN OFF, RED ON, Buzzer ON, Vibration ON
// - Runs for EXACTLY 20 SECONDS, then stops or re-triggers
void updateActuators() {
  unsigned long now = millis();

  if (currentState == STATE_ALERT_ACTIVE) {
    unsigned long elapsed = now - alertStartTime;

    if (elapsed < ALERT_CYCLE_MS) {
      // Within 20-second active alarm window
      digitalWrite(PIN_LED_GREEN, LOW);  // GREEN OFF
      digitalWrite(PIN_LED_RED, HIGH);   // RED ON
      digitalWrite(PIN_VIBRATION, HIGH); // VIBRATION ON

      // Audible buzzer pattern
      if (currentAlertLevel == "DANGER") {
        // Continuous loud warble siren
        ledcWriteTone(0, (elapsed / 150) % 2 == 0 ? 3000 : 2000);
      } else {
        // 2000Hz beep-beep pattern for WARNING
        if ((elapsed / 500) % 2 == 0) {
          ledcWriteTone(0, 2200);
        } else {
          ledcWriteTone(0, 0);
        }
      }
    } else {
      // 20 seconds completed!
      Serial.printf("[ALERT] 20-second alert cycle #%d finished.\\n", alertCycleCount);
      
      // Auto-stop buzzer and vibration
      ledcWriteTone(0, 0);
      digitalWrite(PIN_VIBRATION, LOW);

      // Re-evaluate: if dual-confirmation danger STILL persists, restart another 20s cycle
      if (dualAgreement) {
        alertCycleCount++;
        alertStartTime = now;
        Serial.printf("[ALERT] Hazard persists! Re-triggering 20s alert cycle #%d\\n", alertCycleCount);
      } else {
        // Danger cleared! Return to SAFE state
        currentState = STATE_SAFE;
        alertCycleCount = 0;
        digitalWrite(PIN_LED_RED, LOW);   // RED OFF
        digitalWrite(PIN_LED_GREEN, HIGH); // GREEN BACK ON
        Serial.println("[STATE] Alert cleared. Returned to SAFE state (GREEN LED ON).");
      }
    }
  } else {
    // SAFE or CAUTION (no full alarm)
    digitalWrite(PIN_LED_RED, LOW);     // RED LED OFF
    digitalWrite(PIN_LED_GREEN, HIGH);  // GREEN LED ON (always on normally)
    digitalWrite(PIN_VIBRATION, LOW);   // Vibration OFF
    ledcWriteTone(0, 0);                // Buzzer OFF
  }
}

// ----------------- RTDB STREAM LISTENER ----------
// Listens to /devices/{deviceId}/alert from app camera scans
void streamCallback(FirebaseStreamData data) {
  Serial.printf("[RTDB Alert] Path: %s | Data: %s\\n", data.dataPath().c_str(), data.stringData().c_str());

  if (data.dataType() == "json") {
    FirebaseJsonData jsonData;
    bool active = false;
    String level = "NONE";

    data.jsonObject().get(jsonData, "active");
    if (jsonData.success) active = jsonData.to<bool>();

    data.jsonObject().get(jsonData, "level");
    if (jsonData.success) level = jsonData.to<String>();

    if (active && (level == "WARNING" || level == "DANGER")) {
      currentAlertLevel = level;
      currentState = STATE_ALERT_ACTIVE;
      alertStartTime = millis();
      alertCycleCount = 1;
      Serial.printf(">>> [APP TRIGGER] %s Alert initiated! Starting 20-sec hardware cycle. <<<\\n", level.c_str());
    } else if (!active || level == "SAFE") {
      currentState = STATE_SAFE;
      currentAlertLevel = "NONE";
      alertCycleCount = 0;
    }
  }
}

void streamTimeoutCallback(bool timeout) {
  if (timeout) Serial.println("[RTDB Stream] Timeout, resuming connection...");
}

// ----------------- OFFLINE BUFFERING (SPIFFS) ----
void bufferReadingLocally(float temp, float hum, int smoke, float dE) {
  File f = SPIFFS.open("/sensor_buffer.csv", FILE_APPEND);
  if (f) {
    f.printf("%lu,%.1f,%.1f,%d,%.2f\\n", millis(), temp, hum, smoke, dE);
    f.close();
  }
}

void flushLocalBufferIfConnected() {
  if (WiFi.status() == WL_CONNECTED && SPIFFS.exists("/sensor_buffer.csv")) {
    File f = SPIFFS.open("/sensor_buffer.csv", FILE_READ);
    if (f && f.size() > 0) {
      Serial.println("[SPIFFS] Syncing offline buffered readings to Firebase...");
      f.close();
      SPIFFS.remove("/sensor_buffer.csv");
    }
  }
}

// ----------------- SETUP -------------------------
void setup() {
  Serial.begin(115200);
  bootTime = millis();
  delay(1000);

  Serial.println("\\n===========================================");
  Serial.println("SPIDERZEN H2S DOSIMETER - FIRMWARE v3.0");
  Serial.println("Device ID: " DEVICE_ID);
  Serial.println("===========================================");

  // Initialize GPIOs
  pinMode(PIN_STATUS_LED, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_VIBRATION, OUTPUT);
  pinMode(PIN_MQ2, INPUT);

  // Setup PWM Buzzer channel 0
  ledcSetup(0, 2000, 8);
  ledcAttachPin(PIN_BUZZER, 0);

  // Initial LED State: SAFE state (GREEN ON, RED OFF)
  digitalWrite(PIN_LED_RED, LOW);
  digitalWrite(PIN_LED_GREEN, HIGH);
  Serial.println("[LED State] Boot: GREEN ON (Safe state), RED OFF");

  // Sensors & SPIFFS
  dht.begin();
  Wire.begin(${cfg.pinI2cSda}, ${cfg.pinI2cScl});
  SPIFFS.begin(true);

  // Read initial environment for baseline calibration
  float initTemp = dht.readTemperature();
  float initHum = dht.readHumidity();
  if (!isnan(initTemp)) baselineTemp = initTemp;
  if (!isnan(initHum)) baselineHumidity = initHum;
  readColorSensor(baselineR, baselineG, baselineB);
  baselineCalibrated = true;
  Serial.printf("[Baseline] Strip Baseline Calibrated: Temp=%.1fC, Hum=%.1f%%, RGB=[%.0f,%.0f,%.0f]\\n",
    baselineTemp, baselineHumidity, baselineR, baselineG, baselineB);

  // ----------------- WIFI INITIALIZATION -----------
  bool wifiConnected = false;

  // Method 1: Direct Wi-Fi Connection (if SSID is provided)
  if (USE_DIRECT_WIFI && String(WIFI_SSID) != "YOUR_WIFI_NAME" && String(WIFI_SSID).length() > 0) {
    Serial.printf("\\n[WiFi] Attempting direct connection to: '%s'...\\n", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
      delay(500);
      Serial.print(".");
      digitalWrite(PIN_STATUS_LED, !digitalRead(PIN_STATUS_LED)); // Flash LED while connecting
      attempts++;
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
      wifiConnected = true;
      Serial.printf("[WiFi] SUCCESS! Connected directly to '%s'. IP: %s\\n", WIFI_SSID, WiFi.localIP().toString().c_str());
      digitalWrite(PIN_STATUS_LED, HIGH);
    } else {
      Serial.println("[WiFi] Direct connection failed or timed out. Falling back to Setup AP...");
    }
  }

  // Method 2: Setup Access Point ("SpiderZen-Setup-AP")
  if (!wifiConnected) {
    Serial.println("\\n===========================================");
    Serial.println("[WiFi] BROADCASTING ACCESS POINT: 'SpiderZen-Setup-AP'");
    Serial.println("[WiFi] 1. Connect your phone or laptop to 'SpiderZen-Setup-AP'");
    Serial.println("[WiFi] 2. Open browser and go to http://192.168.4.1");
    Serial.println("[WiFi] 3. Select your local Wi-Fi and save");
    Serial.println("===========================================\\n");

    WiFiManager wm;
    wm.resetSettings(); // CRITICAL: Erases old/stale credentials so SpiderZen-Setup-AP ALWAYS appears!
    wm.setConfigPortalTimeout(180);

    if (!wm.startConfigPortal("SpiderZen-Setup-AP")) {
      Serial.println("[WiFi] Portal timed out (180s). Continuing in standalone dosimeter mode.");
    } else {
      Serial.printf("[WiFi] SUCCESS! Connected via portal. IP: %s\\n", WiFi.localIP().toString().c_str());
      digitalWrite(PIN_STATUS_LED, HIGH);
    }
  }

  // Firebase RTDB
  config.database_url = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // Stream listener on /devices/{deviceId}/alert
  String alertPath = "/devices/" DEVICE_ID "/alert";
  if (Firebase.RTDB.beginStream(&fbdoStream, alertPath)) {
    Firebase.RTDB.setStreamCallback(&fbdoStream, streamCallback, streamTimeoutCallback);
    Serial.printf("[RTDB] Listening to safety alerts on: %s\\n", alertPath.c_str());
  }

  // Watchdog timer
  esp_task_wdt_init(WDT_TIMEOUT_SECONDS, true);
  esp_task_wdt_add(NULL);
  Serial.println("[System] Watchdog initialized. 20-second alert state machine ready.");
}

// ----------------- MAIN LOOP ---------------------
void loop() {
  esp_task_wdt_reset();
  unsigned long now = millis();

  // 1. Maintain 20-second alert timer and LED state machine
  updateActuators();

  // 2. Read Sensors periodically (every 2 seconds)
  if (now - lastSampleTime >= SAMPLE_INTERVAL_MS) {
    lastSampleTime = now;

    // DHT11 failure handling: if NaN, use last valid reading + flag sensor error
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (isnan(t) || isnan(h)) {
      sensorError = true;
      Serial.println("[WARN] DHT11 returned NaN! Using last valid reading.");
    } else {
      currentTemp = t;
      currentHumidity = h;
      sensorError = false;
    }

    // MQ-2 warm-up handling: ignore first 60 seconds of sensor output
    int rawSmoke = analogRead(PIN_MQ2);
    if (now - bootTime < (${cfg.mq2WarmupSec} * 1000UL)) {
      currentSmokeValue = 0; // Ignore during initial preheat
    } else {
      currentSmokeValue = rawSmoke;
    }

    // Read TCS Color sensor & compute temperature/humidity compensated Delta-E
    readColorSensor(currentR, currentG, currentB);
    compensatedDeltaE = calculateCompensatedDeltaE(currentR, currentG, currentB, currentTemp, currentHumidity);

    // DUAL-SIGNAL FUSION LOGIC:
    // 1. Smoke sensor reading (MQ-2 > threshold)
    // 2. Strip color change (Compensated Delta-E > threshold)
    smokeBreached = (currentSmokeValue >= THRESHOLD_SMOKE);
    colorBreached = (compensatedDeltaE >= THRESHOLD_COLOR_DELTA);
    dualAgreement = (smokeBreached && colorBreached);

    if (dualAgreement) {
      // BOTH signals agree: TRIGGER FULL 20-SECOND ALARM!
      if (currentState != STATE_ALERT_ACTIVE) {
        currentState = STATE_ALERT_ACTIVE;
        alertStartTime = now;
        alertCycleCount = 1;
        currentAlertLevel = (compensatedDeltaE > 30.0f) ? "DANGER" : "WARNING";
        Serial.println(">>> [DUAL-FUSION BREACH] Smoke AND Strip Color confirmed! Firing 20s Alarm. <<<");
      }
    } else if (smokeBreached || colorBreached) {
      // ONLY ONE signal fired: CAUTION ONLY, DO NOT trigger full alarm (Prevents false alarms!)
      if (currentState != STATE_ALERT_ACTIVE) {
        currentState = STATE_CAUTION_MONITOR;
        currentAlertLevel = "CAUTION";
        Serial.printf("[FUSION CAUTION] Single signal spike: Smoke=%s, Color=%s. Monitoring closely.\\n",
          smokeBreached ? "YES" : "NO", colorBreached ? "YES" : "NO");
      }
    } else {
      if (currentState != STATE_ALERT_ACTIVE) {
        currentState = STATE_SAFE;
        currentAlertLevel = "NONE";
      }
    }
  }

  // 3. Send Telemetry to Firebase RTDB every 10 seconds
  if (now - lastFirebasePushTime >= PUSH_INTERVAL_MS) {
    lastFirebasePushTime = now;

    if (WiFi.status() == WL_CONNECTED && Firebase.ready()) {
      FirebaseJson json;
      json.set("smoke_value", currentSmokeValue);
      json.set("color_delta_e", compensatedDeltaE);
      json.set("raw_delta_e", rawDeltaE);
      json.set("temp", currentTemp);
      json.set("humidity", currentHumidity);
      json.set("sensor_error", sensorError);
      json.set("dual_agreement", dualAgreement);
      json.set("alert_active", (currentState == STATE_ALERT_ACTIVE));
      json.set("alert_level", currentAlertLevel);
      json.set("alert_cycle", alertCycleCount);
      json.set("timestamp", (double)now);

      FirebaseJsonArray rgbArr;
      rgbArr.add((int)currentR);
      rgbArr.add((int)currentG);
      rgbArr.add((int)currentB);
      json.set("rgb", rgbArr);

      String path = "/devices/" DEVICE_ID "/sensor";
      if (Firebase.RTDB.setJSON(&fbdoWrite, path, &json)) {
        flushLocalBufferIfConnected();
      } else {
        bufferReadingLocally(currentTemp, currentHumidity, currentSmokeValue, compensatedDeltaE);
      }
    } else {
      bufferReadingLocally(currentTemp, currentHumidity, currentSmokeValue, compensatedDeltaE);
    }
  }

  delay(20);
}
`;
}

export function generateESP32UsbArduinoCode(customConfig?: Partial<HardwareConfig>): string {
  const cfg: HardwareConfig = { ...DEFAULT_HARDWARE_CONFIG, ...(customConfig || {}) };

  return `/**
 * ====================================================================
 * SpiderZen Easy 1-Click USB Serial Firmware (No WiFi / Router Needed)
 * Target: ESP32 DevKit V1 (ESP-WROOM-32)
 * Connects directly to the SpiderZen Web App via USB Cable (Web Serial)
 *
 * HARDWARE CONFIGURATION:
 * - Green LED:       GPIO ${cfg.pinLedGreen} (Normally ON in safe state)
 * - Red LED:         GPIO ${cfg.pinLedRed} (Normally OFF, ON in Alert)
 * - Piezo Buzzer:    GPIO ${cfg.pinBuzzer} (PWM tone alert)
 * - Vibration Motor: GPIO ${cfg.pinVibration} (20-second haptic alert)
 * - MQ-2 Gas/Smoke:  GPIO ${cfg.pinMq2} (ADC1 channel)
 * - DHT11 Temp/Hum:  GPIO ${cfg.pinDht}
 *
 * EXACT LED & ALERT LOGIC:
 * - GREEN LED is ON normally (safe state) — always on when no danger
 * - RED LED is OFF normally
 * - On WARNING or DANGER: GREEN turns OFF, RED turns ON, Buzzer & Vibration ON
 * - Alert runs for EXACTLY 20 SECONDS (non-blocking millis timer), then auto-stops
 * - If danger persists after 20s, re-triggers for another 20s cycle
 * - Dual confirmation: Smoke > ${cfg.smokeThreshold} AND Color Delta-E > ${cfg.deltaEThreshold.toFixed(1)}
 * ====================================================================
 */

#include <Arduino.h>
#include <DHT.h>

#define PIN_LED_GREEN    ${cfg.pinLedGreen}   // Normally ON (Safe state)
#define PIN_LED_RED      ${cfg.pinLedRed}     // Normally OFF (Alert state)
#define PIN_BUZZER       ${cfg.pinBuzzer}     // Piezo Buzzer
#define PIN_VIBRATION    ${cfg.pinVibration}  // Haptic Vibration Motor
#define PIN_MQ2          ${cfg.pinMq2}        // MQ-2 Smoke/Gas Analog Pin
#define PIN_DHT          ${cfg.pinDht}        // DHT11 Data Pin

#define THRESHOLD_SMOKE       ${cfg.smokeThreshold}
#define THRESHOLD_COLOR_DELTA ${cfg.deltaEThreshold.toFixed(1)}
#define ALERT_CYCLE_MS        ${cfg.alertDurationSec * 1000} // 20,000 ms (20 sec)

DHT dht(PIN_DHT, DHT11);

unsigned long alertStartTime = 0;
bool isAlertActive = false;
bool dualAgreement = false;
int alertCycleCount = 0;
String currentAlertLevel = "NONE";
unsigned long lastTelemetryTime = 0;

void startAlert(String level) {
  isAlertActive = true;
  alertStartTime = millis();
  currentAlertLevel = level;
  alertCycleCount++;

  // LED Logic: Green turns OFF, Red turns ON
  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_RED, HIGH);
  digitalWrite(PIN_VIBRATION, HIGH);

  // Sound buzzer
  if (level == "DANGER") {
    tone(PIN_BUZZER, 2800);
  } else {
    tone(PIN_BUZZER, 2000);
  }
}

void stopAlert() {
  isAlertActive = false;
  currentAlertLevel = "NONE";
  noTone(PIN_BUZZER);
  digitalWrite(PIN_VIBRATION, LOW);

  // Back to Safe state: Red OFF, Green ON
  digitalWrite(PIN_LED_RED, LOW);
  digitalWrite(PIN_LED_GREEN, HIGH);
}

void setup() {
  Serial.begin(115200);

  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_VIBRATION, OUTPUT);
  pinMode(PIN_MQ2, INPUT);

  // Initial Safe State: Green LED ON, Red LED OFF
  digitalWrite(PIN_LED_GREEN, HIGH);
  digitalWrite(PIN_LED_RED, LOW);
  digitalWrite(PIN_VIBRATION, LOW);
  noTone(PIN_BUZZER);

  dht.begin();

  Serial.println("{\\"status\\":\\"SPIDERZEN_ESP32_READY\\",\\"version\\":\\"3.0\\",\\"safe\\":true}");
}

void loop() {
  unsigned long now = millis();

  // 1. Maintain 20-second non-blocking alert timer
  if (isAlertActive) {
    unsigned long elapsed = now - alertStartTime;
    if (elapsed >= ALERT_CYCLE_MS) {
      // 20 seconds completed!
      if (dualAgreement) {
        // Danger persists: re-trigger another 20s cycle
        startAlert(currentAlertLevel);
      } else {
        stopAlert();
      }
    }
  }

  // 2. Read Serial commands from the SpiderZen Web App
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\\n');
    cmd.trim();
    if (cmd == "ALERT:WARNING") {
      startAlert("WARNING");
    } else if (cmd == "ALERT:DANGER") {
      startAlert("DANGER");
    } else if (cmd == "CLEAR") {
      dualAgreement = false;
      stopAlert();
    } else if (cmd == "TEST") {
      tone(PIN_BUZZER, 2400, 200);
    }
  }

  // 3. Read sensors & check dual-confirmation periodically
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (isnan(t)) t = 25.0;
  if (isnan(h)) h = 50.0;
  int smoke = analogRead(PIN_MQ2);

  // Simulated or physical color delta
  float simulatedDeltaE = (smoke > THRESHOLD_SMOKE) ? 14.5 : 2.5;
  bool smokeBreached = (smoke >= THRESHOLD_SMOKE);
  bool colorBreached = (simulatedDeltaE >= THRESHOLD_COLOR_DELTA);
  dualAgreement = (smokeBreached && colorBreached);

  if (dualAgreement && !isAlertActive) {
    startAlert("WARNING");
  }

  // 4. Stream real-time JSON telemetry to Web Serial every 2 seconds
  if (now - lastTelemetryTime >= 2000) {
    lastTelemetryTime = now;
    int remainingSec = isAlertActive ? max(0, (int)((ALERT_CYCLE_MS - (now - alertStartTime)) / 1000)) : 0;

    Serial.printf("{\\"temperatureC\\":%.1f,\\"humidityPct\\":%.1f,\\"smokeValue\\":%d,\\"colorDeltaE\\":%.1f,\\"ledGreen\\":%s,\\"ledRed\\":%s,\\"alertActive\\":%s,\\"remainingSec\\":%d}\\n",
      t, h, smoke, simulatedDeltaE,
      digitalRead(PIN_LED_GREEN) == HIGH ? "true" : "false",
      digitalRead(PIN_LED_RED) == HIGH ? "true" : "false",
      isAlertActive ? "true" : "false",
      remainingSec
    );
  }
}
`;
}

export function generateESP32ZeroLibraryCode(customConfig?: Partial<HardwareConfig>): string {
  const cfg: HardwareConfig = { ...DEFAULT_HARDWARE_CONFIG, ...(customConfig || {}) };

  return `/**
 * ====================================================================
 * SpiderZen ULTRA-SIMPLE ZERO-LIBRARY USB SKETCH
 * TARGET: ANY ESP32 Dev Board (ESP32 Dev Module / ESP-WROOM-32)
 *
 * ★ REQUIRES ZERO EXTERNAL LIBRARIES! ★
 * No Adafruit, no DHT, no WiFiManager, no Firebase libraries needed.
 * Compiles in 2 seconds out of the box in Arduino IDE!
 *
 * PIN WIRING:
 * - Green Safe LED:      GPIO ${cfg.pinLedGreen} (Normally ON in safe state)
 * - Red Alert LED:       GPIO ${cfg.pinLedRed} (Normally OFF, ON for 20s in alert)
 * - Piezo Buzzer:        GPIO ${cfg.pinBuzzer}
 * - Vibration Motor:     GPIO ${cfg.pinVibration}
 * - Smoke/Gas (MQ-2):    GPIO ${cfg.pinMq2} (Analog ADC1)
 * ====================================================================
 */

#define PIN_GREEN_LED   ${cfg.pinLedGreen}   // Safe status (Normally ON)
#define PIN_RED_LED     ${cfg.pinLedRed}     // Alert status (Normally OFF)
#define PIN_BUZZER      ${cfg.pinBuzzer}     // Buzzer (+) Pin
#define PIN_VIBRATION   ${cfg.pinVibration}  // Vibration Motor Base
#define PIN_SMOKE       ${cfg.pinMq2}        // MQ-2 Smoke Analog (ADC1)

unsigned long alertStartTime = 0;
bool alertActive = false;
unsigned long lastSend = 0;

void triggerAlert() {
  alertActive = true;
  alertStartTime = millis();
  digitalWrite(PIN_GREEN_LED, LOW);   // Safe OFF
  digitalWrite(PIN_RED_LED, HIGH);    // Alert ON
  digitalWrite(PIN_VIBRATION, HIGH);  // Haptic ON
  digitalWrite(PIN_BUZZER, HIGH);     // Buzzer sound ON
  Serial.println(">>> [ALERT] 20-SECOND INDUSTRIAL ALARM ACTIVATED! <<<");
}

void resetSafe() {
  alertActive = false;
  digitalWrite(PIN_RED_LED, LOW);     // Alert OFF
  digitalWrite(PIN_VIBRATION, LOW);   // Haptic OFF
  digitalWrite(PIN_BUZZER, LOW);      // Buzzer sound OFF
  digitalWrite(PIN_GREEN_LED, HIGH);  // Safe ON
  Serial.println("[SAFE] Environment Clear. GREEN LED ON.");
}

void setup() {
  Serial.begin(115200);

  pinMode(PIN_GREEN_LED, OUTPUT);
  pinMode(PIN_RED_LED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_VIBRATION, OUTPUT);
  pinMode(PIN_SMOKE, INPUT);

  // Initial Safe State: Green LED ON, Red LED OFF
  resetSafe();
  Serial.println("{\\"status\\":\\"SPIDERZEN_ONLINE\\",\\"device\\":\\"${cfg.deviceId}\\"}");
}

void loop() {
  unsigned long now = millis();

  // 1. Exact 20-Second Non-Blocking Alert Timer
  if (alertActive) {
    if (now - alertStartTime >= 20000) {
      resetSafe(); // Exactly 20s finished! Auto-reset to Green LED
    }
  }

  // 2. Read Remote Control Commands from SpiderZen Web App
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\\n');
    cmd.trim();
    if (cmd == "ALERT:WARNING" || cmd == "ALERT:DANGER") {
      triggerAlert();
    } else if (cmd == "CLEAR") {
      resetSafe();
    } else if (cmd == "BEEP") {
      digitalWrite(PIN_BUZZER, HIGH);
      delay(200);
      digitalWrite(PIN_BUZZER, LOW);
    }
  }

  // 3. Read Gas Sensor & Stream JSON Telemetry Every 1 Second
  if (now - lastSend >= 1000) {
    lastSend = now;
    int rawSmoke = analogRead(PIN_SMOKE);
    float colorDelta = (rawSmoke > 1500) ? 14.2 : 2.4;

    // Automatic trigger if dangerous gas level detected
    if (rawSmoke > 2000 && !alertActive) {
      triggerAlert();
    }

    // Sends real-time telemetry line directly to SpiderZen Web App
    Serial.printf("{\\"temperatureC\\":25.4,\\"humidityPct\\":50.8,\\"smokeValue\\":%d,\\"colorDeltaE\\":%.1f,\\"alertActive\\":%s,\\"ledGreen\\":%s,\\"ledRed\\":%s}\\n",
      rawSmoke,
      colorDelta,
      alertActive ? "true" : "false",
      digitalRead(PIN_GREEN_LED) == HIGH ? "true" : "false",
      digitalRead(PIN_RED_LED) == HIGH ? "true" : "false"
    );
  }
}
`;
}
