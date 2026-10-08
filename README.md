# SpiderZen: Passive Colorimetric H₂S Dosimeter & IoT Safety System

SpiderZen is an end-to-end industrial occupational health and safety system designed for refineries, drilling rigs, and chemical manufacturing plants. It estimates cumulative **Hydrogen Sulfide ($H_2S$)** gas exposure ($ppm \cdot hr$) from wearable passive colorimetric chemical strips, synchronizes real-time telemetry to Firebase, provides an interactive plant dashboard, and connects to worker ESP32 wearable nodes that trigger audible buzzers, haptic vibration, and LED warning lights.

---

## 1. System Architecture

```
[Wearable Passive Strip]  -->  [Phone Camera Scan]  -->  [Quality Gates (Blur / Lighting)]
                                                                |
                                                                v
[ESP32 Wearable Node]     <--  [Firebase RTDB / USB]  <--  [CIEDE2000 ΔE₀₀ + AI Model]
 (MQ-2 / DHT11 / TCS /         (/devices/{id}/alert)           (Arrhenius & Hydration Corrected)
  Buzzer / LEDs / Haptic)
```

- **Frontend:** React 19 + TypeScript + Tailwind CSS (Mobile-First, Responsive Desktop & Tablet).
- **Sensors:** 
  - **MQ-2 Smoke/Gas Sensor** (ADC1 analog channel) for gas presence.
  - **DHT11 Temperature & Humidity** for thermal/hydration baseline drift correction.
  - **TCS34725 / TCS3200 RGB Color Sensor** (I2C) reading strip darkening in real-time.
  - **Safe Status Green LED** (Normally ON in safe state).
  - **Alert Status Red LED** (Normally OFF, turns ON in Warning/Danger).
  - **Piezo Buzzer** (Audible alarm).
  - **Haptic Vibration Motor** (Collar / wrist tactile alert).
- **Exact Actuator Logic:**
  - **GREEN LED:** ON normally (safe state) — always on when no danger.
  - **RED LED:** OFF normally.
  - **On WARNING or DANGER:** GREEN LED turns OFF, RED LED turns ON, Buzzer ON, Vibration motor ON.
  - All three run for **EXACTLY 20 SECONDS** (non-blocking `millis()` timer, not `delay()`), then auto-stop.
  - If danger persists after 20 seconds, re-triggers for another 20-second cycle.
  - When alert clears: RED LED turns OFF, GREEN LED turns back ON.
- **Dual-Signal Fusion Logic:**
  - System compares TWO signals before firing full alarms:
    1. Smoke sensor reading ($MQ-2 \ge 1500$)
    2. Strip color change ($\Delta E_{00} \ge 12.0$ from baseline)
  - **ALERT FIRES ONLY WHEN BOTH SIGNALS AGREE.**
  - If only one signal fires: logged as CAUTION (monitoring closely), but full alarm is blocked to prevent false alarms.
- **Temperature & Humidity Compensation:**
  - $\text{corrected\_color} = \text{raw\_RGB} - \text{baseline\_drift}(\text{temp}, \text{humidity})$. Fresh strip baseline recorded at startup.
- **AI Early-Warning Prediction (5 Minutes Before):**
  - Evaluates rate of change over the last 10–15 minutes of readings.
  - Extrapolates time to breach: when predicted crossing time $\le 5$ minutes, triggers early 20-second alert and safety push notification.

---

## 2. Hardware Pinout & Wiring Table

| Component | Pin | ESP32 GPIO | Description |
| :--- | :--- | :--- | :--- |
| **MQ-2 Smoke / H₂S Sensor** | AOUT | GPIO 34 | Analog ADC1 channel (voltage-divided to 3.3V safe level) |
| **DHT11 Temp & Humidity** | DATA | GPIO 4 | Digital 1-wire pin with 10kΩ pull-up resistor to 3.3V |
| **TCS34725 / TCS3200 RGB Sensor** | SDA / SCL | GPIO 21 / 22 | Hardware I2C bus for real-time strip optical reflectance |
| **Safe Status GREEN LED** | ANODE | GPIO 18 | **Normally ON** in safe state; turns OFF on alert (330Ω to GND) |
| **Alert Status RED LED** | ANODE | GPIO 27 | **Normally OFF**; turns ON for 20s during alert (330Ω to GND) |
| **Piezo Buzzer** | POSITIVE | GPIO 25 | PWM tone output (2000 Hz beep / 2800 Hz warble siren) |
| **Haptic Vibration Motor** | GATE | GPIO 14 | 2N7000 MOSFET driver with flyback diode |
| **Common Ground** | GND | GND | **All sensor/actuator GNDs tied to ESP32 GND** |

---

## 3. Optical Scanner & Camera Controls (ON / OFF & Lens Selection)

The SpiderZen dosimeter scanner provides full manual and automated control over device camera hardware:
- **Camera ON / OFF Switch:** A dedicated toggle switch in the header allows workers and safety operators to start or pause the camera stream at any time.
- **Privacy & Power Standby:** When turned OFF, camera hardware is immediately stopped and released (`MediaStreamTrack.stop()`), ensuring zero battery drain and complete workplace privacy.
- **In-Viewport & Action Bar Controls:** 
  - When the camera is **ON**, dedicated buttons in both the viewfinder overlay and bottom control bar allow 1-click **[CAMERA OFF]**.
  - When the camera is **OFF**, a prominent green **[TURN CAMERA ON]** button reactivates the live feed instantly.
- **Front / Rear Lens Switcher (`Flip Cam`):** Seamlessly flips between the rear camera (`environment`) for dosimeter strips and the front camera (`user`) for self-check or device testing.
- **Fallback Modes:** Upload existing strip photos or run calibrated demo benchmark strips whenever a physical camera is unavailable.

---

If you have finished your physical connections, here is how to connect your hardware to the SpiderZen software:

### Step 1: Connect via USB Cable (The Easiest & Fastest Way)
1. Open the SpiderZen app in Google Chrome or Microsoft Edge.
2. Plug your ESP32 board into your computer using a standard micro-USB or USB-C cable.
3. In the SpiderZen app, navigate to **ESP32 & IoT** $\rightarrow$ **Easy 1-Click USB** tab.
4. Click **[Download Easy .ino]** and open the file in the **Arduino IDE**.
5. In Arduino IDE:
   - Select Board: `Tools` $\rightarrow$ `Board` $\rightarrow$ `ESP32 Arduino` $\rightarrow$ `ESP32 Dev Module`.
   - Install `DHT sensor library` by Adafruit if not already installed.
   - Click **Upload** ($\rightarrow$).
6. Back in SpiderZen, click **[CONNECT VIA USB (WEB SERIAL)]**.
7. Select your ESP32 port (e.g. `COM3` on Windows or `/dev/ttyUSB0` on Linux/Mac) in the browser popup.
8. **Connected!** The app now streams live temperature, humidity, smoke, and color delta directly into your dashboard, and you can test buzzer/LED triggers with 1 click.

### Step 2: Connect via Plant Wi-Fi & Firebase RTDB (Wireless Industrial Mode)
1. In SpiderZen, navigate to **ESP32 & IoT** $\rightarrow$ **WiFi Firmware (.ino)** tab.
2. Click **[Download .ino]** and flash it to the ESP32.
3. Power on the ESP32. On first boot, it broadcasts a temporary setup network named `SpiderZen-Setup-AP`.
4. Connect your phone or laptop to `SpiderZen-Setup-AP` and enter your facility Wi-Fi credentials.
5. The ESP32 connects to Wi-Fi, links to Firebase Realtime Database path `/devices/{deviceId}/sensor`, and streams telemetry every 10 seconds.

---

## 4. What If Your Hardware Wiring Changes in the Future?

If you swap pins, use a different sensor (such as DHT22 or an alternative ADC pin), or change your layout:
1. In SpiderZen, go to **ESP32 & IoT** $\rightarrow$ **Hardware Customizer** tab.
2. Select your new GPIO pins from the dropdown menus (e.g. change Buzzer from GPIO 25 to GPIO 19, or Green LED to GPIO 23).
3. Both the **Easy USB sketch** and **Full WiFi sketch** update immediately.
4. Download the newly generated `.ino` file and upload it to your board. Zero software recoding needed!

---

## 5. Mandatory Safety Notice

SpiderZen is a prototype exposure-estimation system. It does not replace certified workplace personal gas monitors, fixed electrochemical detector grids, or approved respiratory personal protective equipment (PPE).

