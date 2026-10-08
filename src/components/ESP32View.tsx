import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Wifi,
  Download,
  Copy,
  Check,
  Volume2,
  Settings,
  Flame,
  Activity,
  Code,
  ShieldCheck,
  RefreshCw,
  Zap,
  Sliders,
  Radio,
  FileCode,
  ArrowRight,
  Layers,
  Usb,
  Terminal,
  Play,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Globe,
} from 'lucide-react';
import { ESP32Device, WorkerProfile } from '../types';
import {
  DEFAULT_HARDWARE_CONFIG,
  HardwareConfig,
  getCustomPinoutGuide,
  generateESP32ArduinoCode,
  generateESP32UsbArduinoCode,
  generateESP32ZeroLibraryCode,
} from '../lib/esp32Firmware';
import { spiderZenStore } from '../lib/spiderZenStore';
import { firebaseSync } from '../lib/firebaseSync';

interface ESP32ViewProps {
  devices: ESP32Device[];
  workers: WorkerProfile[];
  onPairDevice: (deviceId: string, name: string, workerId?: string, wifiSSID?: string) => void;
  onTriggerAlert: (deviceId: string, level: 'WARNING' | 'DANGER') => void;
  onClearAlert: (deviceId: string) => void;
  onTestSound: (level: 'WARNING' | 'DANGER' | 'TEST') => void;
}

export const ESP32View: React.FC<ESP32ViewProps> = ({
  devices,
  workers,
  onPairDevice,
  onTriggerAlert,
  onClearAlert,
  onTestSound,
}) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(devices[0]?.deviceId || 'SPIDERZEN-ESP32-01');
  const [newDeviceId, setNewDeviceId] = useState<string>('SPIDERZEN-ESP32-04');
  const [newDeviceName, setNewDeviceName] = useState<string>('Wristband Node #4 (Tank Farm)');
  const [pairedWorkerId, setPairedWorkerId] = useState<string>(workers[0]?.id || '');
  const [wifiSSID, setWifiSSID] = useState<string>('Plant_WiFi_AP');
  const [wifiPassword, setWifiPassword] = useState<string>('RefinerySecure2026');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedUsbCode, setCopiedUsbCode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'easy_connect' | 'firebase' | 'monitor' | 'hardware_config' | 'firmware' | 'wiring'>('easy_connect');
  const [showStepByStepGuide, setShowStepByStepGuide] = useState<boolean>(false);
  const [showUsbTroubleshooter, setShowUsbTroubleshooter] = useState<boolean>(false);

  // Firebase IoT Cloud state
  const [fbConfig, setFbConfig] = useState(firebaseSync.getConfig());
  const [fbConnected, setFbConnected] = useState<boolean>(true);
  const [fbStatusText, setFbStatusText] = useState<string>('Ready & listening to device paths');
  const [fbLogs, setFbLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Firebase RTDB client initialized.`,
  ]);
  const [copiedRules, setCopiedRules] = useState<boolean>(false);

  // Web Serial API state
  const [isSerialConnected, setIsSerialConnected] = useState<boolean>(false);
  const [serialLogs, setSerialLogs] = useState<string[]>([
    '[System] Ready for Web Serial USB connection. Plug in ESP32 via USB and click Connect.',
  ]);
  const [serialError, setSerialError] = useState<string | null>(null);
  const serialPortRef = useRef<any>(null);
  const serialWriterRef = useRef<any>(null);

  const selectedDevice = devices.find((d) => d.deviceId === selectedDeviceId) || devices[0];

  const [hwConfig, setHwConfig] = useState<HardwareConfig>({
    ...DEFAULT_HARDWARE_CONFIG,
    deviceId: selectedDevice?.deviceId || 'SPIDERZEN-ESP32-01',
  });

  const handlePairSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceId) return;
    onPairDevice(newDeviceId, newDeviceName, pairedWorkerId, wifiSSID);
    setSelectedDeviceId(newDeviceId);
    setHwConfig((prev) => ({ ...prev, deviceId: newDeviceId }));
  };

  const dynamicPinout = getCustomPinoutGuide(hwConfig);
  const arduinoCode = generateESP32ArduinoCode(hwConfig);
  const simpleUsbArduinoCode = generateESP32UsbArduinoCode(hwConfig);
  const zeroLibraryCode = generateESP32ZeroLibraryCode(hwConfig);

  const [usbSketchType, setUsbSketchType] = useState<'zero_library' | 'standard'>('zero_library');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const simIntervalRef = useRef<any>(null);

  const activeUsbCode = usbSketchType === 'zero_library' ? zeroLibraryCode : simpleUsbArduinoCode;

  const startSimulation = () => {
    setIsSimulating(true);
    setSerialLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] [SIMULATOR] Virtual ESP32 Node Connected! Streaming live telemetry...`,
      ...prev,
    ]);
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    simIntervalRef.current = setInterval(() => {
      const rawSmoke = Math.floor(1280 + Math.random() * 280);
      const temp = Number((25.1 + Math.random() * 1.6).toFixed(1));
      const hum = Number((50.2 + Math.random() * 3.2).toFixed(1));
      const dE = Number((2.2 + Math.random() * 0.9).toFixed(1));
      spiderZenStore.updateDeviceTelemetry(selectedDeviceId, temp, hum, rawSmoke, dE);
      setSerialLogs((prev) => [
        `[RX] {"temperatureC":${temp},"humidityPct":${hum},"smokeValue":${rawSmoke},"colorDeltaE":${dE},"status":"SAFE"}`,
        ...prev.slice(0, 40),
      ]);
    }, 1500);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    setSerialLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] [SIMULATOR] Virtual ESP32 disconnected.`,
      ...prev,
    ]);
  };

  useEffect(() => {
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  // Firebase Live Sync Effect
  useEffect(() => {
    firebaseSync.subscribeToDevice(selectedDeviceId);
    const unsub = firebaseSync.onStatusChange((connected, lastEvent) => {
      setFbConnected(connected);
      if (lastEvent) {
        setFbStatusText(lastEvent);
        setFbLogs((prev) => [lastEvent, ...prev.slice(0, 30)]);
      }
    });
    return () => unsub();
  }, [selectedDeviceId]);

  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    firebaseSync.saveConfig(fbConfig);
    let host = fbConfig.databaseURL.replace(/^https?:\/\//, '');
    if (host.endsWith('/')) host = host.slice(0, -1);
    setHwConfig((prev) => ({
      ...prev,
      firebaseHost: host,
      firebaseAuth: fbConfig.databaseSecret || 'YOUR_FIREBASE_DATABASE_SECRET',
    }));
    firebaseSync.subscribeToDevice(selectedDeviceId);
    setFbLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] Firebase configuration updated & reconnected!`,
      ...prev,
    ]);
  };

  const handleTestFirebaseAlert = async (level: 'WARNING' | 'DANGER') => {
    onTriggerAlert(selectedDeviceId, level);
    onTestSound(level);
    await firebaseSync.sendHardwareAlert(selectedDeviceId, level);
    setFbLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] [TX] Pushed ${level} alert to /devices/${selectedDeviceId}/alert in Firebase!`,
      ...prev,
    ]);
  };

  const handleTestFirebaseClear = async () => {
    onClearAlert(selectedDeviceId);
    await firebaseSync.sendHardwareAlert(selectedDeviceId, 'CLEAR');
    setFbLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] [TX] Reset safe state (/devices/${selectedDeviceId}/alert: CLEAR) in Firebase!`,
      ...prev,
    ]);
  };

  const handlePushFirebaseSample = async () => {
    await firebaseSync.pushTestTelemetryToFirebase(selectedDeviceId, 1420, 3.8);
    setFbLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] [TEST] Pushed simulated sensor reading to /devices/${selectedDeviceId}/sensor in Firebase!`,
      ...prev,
    ]);
  };

  // Web Serial Connect Handler
  const connectWebSerial = async () => {
    setSerialError(null);
    if (!('serial' in navigator)) {
      setSerialError('Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera on desktop/Android, or use the WiFi RTDB option.');
      return;
    }

    try {
      const nav = navigator as any;
      const port = await nav.serial.requestPort();
      await port.open({ baudRate: 115200 });
      serialPortRef.current = port;

      const textEncoder = new TextEncoderStream();
      textEncoder.readable.pipeTo(port.writable);
      serialWriterRef.current = textEncoder.writable.getWriter();

      setIsSerialConnected(true);
      setSerialLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] Connected to ESP32 on USB Serial at 115200 baud!`,
        ...prev,
      ]);

      // Read loop
      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();

      (async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              const text = value.trim();
              setSerialLogs((prev) => [
                `[RX] ${text}`,
                ...prev.slice(0, 50),
              ]);

              // Automatically ingest JSON telemetry from USB Serial
              try {
                const parsed = JSON.parse(text);
                if (
                  parsed &&
                  (parsed.smokeValue !== undefined ||
                    parsed.smoke !== undefined ||
                    parsed.temperatureC !== undefined)
                ) {
                  const t = Number(parsed.temperatureC ?? parsed.temp ?? 25.0);
                  const h = Number(parsed.humidityPct ?? parsed.humidity ?? 50.0);
                  const s = Number(parsed.smokeValue ?? parsed.smoke ?? 0);
                  const dE = Number(parsed.colorDeltaE ?? parsed.delta_e ?? 0);
                  spiderZenStore.updateDeviceTelemetry(selectedDeviceId, t, h, s, dE);
                }
              } catch {
                // Non-JSON logging
              }
            }
          }
        } catch (err) {
          console.warn('Serial read ended:', err);
        }
      })();
    } catch (err: any) {
      console.warn('Serial connection error:', err);
      setSerialError(err.message || 'Failed to open serial port. Verify USB cable is plugged in and not in use by Arduino IDE.');
      setIsSerialConnected(false);
    }
  };

  const disconnectWebSerial = async () => {
    try {
      if (serialWriterRef.current) {
        await serialWriterRef.current.close();
      }
      if (serialPortRef.current) {
        await serialPortRef.current.close();
      }
    } catch {
      // ignore
    }
    setIsSerialConnected(false);
    setSerialLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] USB Serial port disconnected.`,
      ...prev,
    ]);
  };

  const sendSerialCommand = async (cmd: string) => {
    // Synchronize UI virtual hardware state & test tones
    if (cmd === 'ALERT:WARNING') {
      onTriggerAlert(selectedDeviceId, 'WARNING');
      onTestSound('WARNING');
    } else if (cmd === 'ALERT:DANGER') {
      onTriggerAlert(selectedDeviceId, 'DANGER');
      onTestSound('DANGER');
    } else if (cmd === 'CLEAR') {
      onClearAlert(selectedDeviceId);
    } else if (cmd === 'BEEP') {
      onTestSound('TEST');
    }

    if (!serialWriterRef.current) {
      setSerialLogs((prev) => [
        `[Virtual Link] Sent: "${cmd}" (Simulated 20s sound & LEDs in app)`,
        ...prev,
      ]);
      return;
    }

    try {
      await serialWriterRef.current.write(cmd + '\n');
      setSerialLogs((prev) => [
        `[TX] Sent command: "${cmd}"`,
        ...prev,
      ]);
    } catch (err: any) {
      setSerialError('Failed to send command: ' + err.message);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(arduinoCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyUsbCode = () => {
    navigator.clipboard.writeText(activeUsbCode);
    setCopiedUsbCode(true);
    setTimeout(() => setCopiedUsbCode(false), 2000);
  };

  const handleDownloadIno = () => {
    const element = document.createElement('a');
    const file = new Blob([arduinoCode], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `SpiderZen_${hwConfig.deviceId}.ino`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadUsbIno = () => {
    const element = document.createElement('a');
    const file = new Blob([activeUsbCode], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = usbSketchType === 'zero_library' ? `SpiderZen_Zero_Library_ESP32.ino` : `SpiderZen_Easy_USB.ino`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-[#ff6b1a] uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>EASY HARDWARE INTEGRATION</span>
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs font-mono text-cyan-400">1-CLICK USB CABLE / WIFI CLOUD</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-wide">
            Connect App & Hardware
          </h2>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('easy_connect')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'easy_connect' ? 'bg-[#ff6b1a] text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>⚡ Easy 1-Click USB</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('firebase')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'firebase' ? 'bg-[#ff6b1a] text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>🔥 Firebase Cloud Hub</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('monitor')}
            className={`px-3 py-1.5 rounded transition-colors ${
              activeTab === 'monitor' ? 'bg-[#ff6b1a] text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Live Monitor & WiFi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hardware_config')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'hardware_config' ? 'bg-[#ff6b1a] text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Hardware Customizer</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('firmware')}
            className={`px-3 py-1.5 rounded transition-colors ${
              activeTab === 'firmware' ? 'bg-[#ff6b1a] text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            WiFi Firmware (.ino)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('wiring')}
            className={`px-3 py-1.5 rounded transition-colors ${
              activeTab === 'wiring' ? 'bg-[#ff6b1a] text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pinout & Schematic
          </button>
        </div>
      </div>

      {/* Tab 0: EASY 1-CLICK USB CONNECT (The Absolute Easiest Way) */}
      {activeTab === 'easy_connect' && (
        <div className="space-y-6">
            {/* Hero Easy Method Banner */}
          <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/30">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2.5 py-1 rounded mb-3">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>THE SIMPLEST WAY · ZERO ROUTER OR FIREBASE CONFIG REQUIRED</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-2">
                  Direct 1-Click USB Cable Connection
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-sans leading-relaxed">
                  No WiFi passwords, no router configuration, and no cloud keys needed! Simply plug your ESP32 board into your computer or phone using a standard USB cable, and click Connect below.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                <button
                  type="button"
                  onClick={() => setShowStepByStepGuide(!showStepByStepGuide)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 font-mono text-xs transition-colors"
                >
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <span>{showStepByStepGuide ? 'Hide Steps' : 'Step-by-Step Guide'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowUsbTroubleshooter(!showUsbTroubleshooter)}
                  className={`w-full sm:w-auto flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl border font-mono text-xs transition-all ${
                    showUsbTroubleshooter || serialError
                      ? 'bg-amber-950/70 border-amber-500 text-amber-300 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>{showUsbTroubleshooter ? 'Hide USB Help' : 'Troubleshoot USB & Drivers'}</span>
                </button>

                {!isSerialConnected ? (
                  <button
                    type="button"
                    onClick={connectWebSerial}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#00e5ff] hover:bg-[#00c8e0] text-slate-950 font-heading font-bold text-sm tracking-wider transition-all shadow-xl shadow-cyan-500/25 active:scale-95"
                  >
                    <Usb className="w-5 h-5" />
                    <span>CONNECT VIA USB (WEB SERIAL)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={disconnectWebSerial}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-heading font-bold text-sm tracking-wider transition-all shadow-xl shadow-red-500/25 active:scale-95"
                  >
                    <Usb className="w-5 h-5" />
                    <span>DISCONNECT USB</span>
                  </button>
                )}

                {!isSimulating ? (
                  <button
                    type="button"
                    onClick={startSimulation}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-emerald-600/25 active:scale-95"
                    title="Simulate live ESP32 telemetry immediately without physical hardware"
                  >
                    <Play className="w-4 h-4" />
                    <span>▶ Test Demo Stream (No Hardware)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopSimulation}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold transition-all animate-pulse"
                  >
                    <span>■ Stop Demo Stream</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDownloadUsbIno}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs border border-slate-700 transition-colors"
                >
                  <Download className="w-4 h-4 text-[#ff6b1a]" />
                  <span>Download Easy .ino</span>
                </button>
              </div>
            </div>

            {serialError && (
              <div className="mt-4 p-4 rounded-xl bg-red-950/70 border border-red-500/80 text-red-200 text-xs font-mono">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold text-white block mb-1">USB Connection Error:</span>
                    <span>{serialError}</span>
                    <div className="mt-2 text-red-300 text-[11px] font-sans">
                      Common causes: <strong>1)</strong> USB cable is charge-only (no data wires), <strong>2)</strong> Missing CH340/CP2102 driver on PC, or <strong>3)</strong> Arduino IDE's Serial Monitor is already open. See the troubleshooting guide below.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dedicated USB & Driver Troubleshooting Wizard */}
          {(showUsbTroubleshooter || serialError) && (
            <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/20 shadow-2xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-white text-base tracking-wide">
                      USB & Driver Troubleshooting Checklist (Why USB Is Not Connecting)
                    </h4>
                    <p className="text-xs text-slate-400 font-sans">
                      Follow these 5 proven checks to get your ESP32 detected on your computer immediately.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUsbTroubleshooter(false)}
                  className="text-xs font-mono text-slate-400 hover:text-white"
                >
                  Dismiss
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {/* Issue 1: Charge-Only Cable */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-amber-400 font-mono font-bold block mb-1">
                      1. Is your USB Cable "Charge-Only"?
                    </span>
                    <p className="text-slate-300 text-[11px] leading-relaxed mb-2">
                      Over 80% of connection failures are caused by micro-USB cables that have only 2 power wires and <strong>no data lines (D+/D-)</strong>.
                    </p>
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-400 space-y-1">
                      <div><strong>Test:</strong> When plugged in, does your computer play a USB chime sound?</div>
                      <div>• If <strong>NO sound</strong> plays at all: Your cable is charge-only! Swap with a phone data cable.</div>
                    </div>
                  </div>
                </div>

                {/* Issue 2: Missing USB Driver */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-cyan-400 font-mono font-bold block mb-1">
                      2. Install USB Chip Drivers (CH340 / CP2102)
                    </span>
                    <p className="text-slate-300 text-[11px] leading-relaxed mb-2">
                      ESP32 boards have a small rectangular or square chip near the USB connector. Your PC requires drivers to recognize it:
                    </p>
                    <ul className="space-y-1.5 font-mono text-[10px] text-slate-300">
                      <li className="flex items-center justify-between p-1.5 bg-slate-950 rounded border border-slate-800">
                        <span><strong>CH340 / CH341</strong> (Most boards)</span>
                        <span className="text-cyan-400">CH341SER Driver</span>
                      </li>
                      <li className="flex items-center justify-between p-1.5 bg-slate-950 rounded border border-slate-800">
                        <span><strong>CP2102 / CP2104</strong> (Silicon Labs)</span>
                        <span className="text-cyan-400">CP210x VCP Driver</span>
                      </li>
                    </ul>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono mt-2 block">
                    Check Windows Device Manager → Ports (COM & LPT)
                  </span>
                </div>

                {/* Issue 3: Port Locked by Arduino IDE */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-emerald-400 font-mono font-bold block mb-1">
                      3. Close Arduino IDE Serial Monitor!
                    </span>
                    <p className="text-slate-300 text-[11px] leading-relaxed mb-2">
                      A serial COM port can only be opened by <strong>one program at a time</strong>.
                    </p>
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-400 space-y-1">
                      <div>If the Serial Monitor window or tab is open inside the Arduino IDE, the browser will be <strong>blocked</strong> from opening the port.</div>
                      <div className="text-emerald-300">• Close Serial Monitor, then click Connect.</div>
                    </div>
                  </div>
                </div>

                {/* Issue 4: Hold BOOT button during upload */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-orange-400 font-mono font-bold block mb-1">
                      4. Hold BOOT Button When Uploading
                    </span>
                    <p className="text-slate-300 text-[11px] leading-relaxed mb-2">
                      If Arduino IDE fails with: <code className="text-red-300">A fatal error occurred: Failed to connect to ESP32</code>:
                    </p>
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-400">
                      As soon as Arduino IDE shows <code className="text-orange-300">Connecting........_____.....</code>, press and hold the <strong>BOOT (or IO0)</strong> button on the ESP32 until the upload % begins.
                    </div>
                  </div>
                </div>

                {/* Issue 5: Breadboard Short Circuit */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-purple-400 font-mono font-bold block mb-1">
                      5. Rule Out Breadboard Overload / Shorts
                    </span>
                    <p className="text-slate-300 text-[11px] leading-relaxed mb-2">
                      If a motor, buzzer, or sensor is wired incorrectly, the ESP32 power regulator triggers overload protection and cuts USB power.
                    </p>
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-400">
                      <strong>Test:</strong> Unplug all breadboard jumper wires. Plug in just the <strong>bare ESP32 board</strong> alone to verify that it connects.
                    </div>
                  </div>
                </div>

                {/* Issue 6: Browser Compatibility */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-blue-400 font-mono font-bold block mb-1">
                      6. Use Chrome or Edge Browser
                    </span>
                    <p className="text-slate-300 text-[11px] leading-relaxed mb-2">
                      The Web Serial API is only supported in modern Chromium browsers:
                    </p>
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-400 space-y-1">
                      <div>✓ <strong>Google Chrome</strong> (Desktop / Android)</div>
                      <div>✓ <strong>Microsoft Edge</strong> (Desktop)</div>
                      <div className="text-red-400">✗ Firefox and Safari do not support Web Serial.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Step-by-Step Hardware to Software Connection Instructions */}
          {(showStepByStepGuide || true) && (
            <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-cyan-500/30 bg-slate-950/90 shadow-2xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-white text-base tracking-wide">
                      Steps to Connect Your Hardware to the SpiderZen Software
                    </h4>
                    <p className="text-xs text-slate-400 font-sans">
                      Follow these 5 straightforward steps once your wiring connections are completed.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/40">
                  Ready for Connections
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-sans">
                {/* Step 1 */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2 font-mono font-bold text-cyan-400">
                      <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500/60 flex items-center justify-center text-[11px]">1</span>
                      <span>Verify Finished Wiring</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed mb-2 text-[11px]">
                      Confirm your 8 prototype components:
                    </p>
                    <ul className="space-y-1 font-mono text-[10px] text-slate-400">
                      <li>• TCS34725: D21 (SDA), D22 (SCL), 3V3</li>
                      <li>• OLED: D21 (SDA), D22 (SCL), 3V3</li>
                      <li>• DHT11: DATA → GPIO {hwConfig.pinDht}</li>
                      <li>• Green LED: (+) GPIO {hwConfig.pinLedGreen} (220Ω)</li>
                      <li>• Red LED: (+) GPIO {hwConfig.pinLedRed} (220Ω)</li>
                      <li>• Vibration: Base GPIO {hwConfig.pinVibration} (1kΩ)</li>
                      <li>• Buzzer: (+) GPIO {hwConfig.pinBuzzer}, (-) GND</li>
                      <li>• Smoke/Gas: AOUT → GPIO {hwConfig.pinMq2} (ADC1)</li>
                    </ul>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono mt-3 block">
                    ✓ All GNDs connected together
                  </span>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2 font-mono font-bold text-[#ff6b1a]">
                      <span className="w-5 h-5 rounded-full bg-orange-950 border border-orange-500/60 flex items-center justify-center text-[11px]">2</span>
                      <span>Flash Arduino Firmware</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed mb-2 text-[11px]">
                      Open Arduino IDE on your computer:
                    </p>
                    <ol className="space-y-1 font-mono text-[10px] text-slate-400 list-decimal pl-4">
                      <li>Select Board: <em>ESP32 Dev Module</em></li>
                      <li>Install DHT sensor library</li>
                      <li>Click <strong>[Download Easy .ino]</strong> above</li>
                      <li>Click <strong>Upload (→)</strong> in IDE</li>
                    </ol>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono mt-3 block">
                    ✓ Upload completes at 115200 baud
                  </span>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2 font-mono font-bold text-emerald-400">
                      <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-500/60 flex items-center justify-center text-[11px]">3</span>
                      <span>Link App with Hardware</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed mb-2 text-[11px]">
                      Connect in 1 single click:
                    </p>
                    <ul className="space-y-1.5 text-[11px] text-slate-300">
                      <li>• Keep USB plugged into PC/Phone</li>
                      <li>• Click the bright cyan <strong>[CONNECT VIA USB]</strong> button</li>
                      <li>• Select your ESP32 port (e.g. COM3 or /dev/ttyUSB0)</li>
                    </ul>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono mt-3 block">
                    ✓ Immediate Bidirectional Link
                  </span>
                </div>

                {/* Step 4 */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2 font-mono font-bold text-amber-400">
                      <span className="w-5 h-5 rounded-full bg-amber-950 border border-amber-500/60 flex items-center justify-center text-[11px]">4</span>
                      <span>Hardware Changes Later?</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed mb-2 text-[11px]">
                      If you change pins, sensors, or wiring in the future:
                    </p>
                    <p className="text-slate-400 text-[10px] leading-relaxed">
                      Simply switch to the <strong>Hardware Customizer</strong> tab, change the pin dropdowns, and download the new sketch. The software adapts automatically!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('hardware_config')}
                    className="text-[10px] font-mono text-cyan-400 hover:underline mt-3 block text-left"
                  >
                    → Open Hardware Customizer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Live USB Control & Terminal Monitor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Direct Hardware Command Actions */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-heading font-bold text-white text-lg tracking-wide flex items-center gap-2">
                  <Play className="w-4 h-4 text-[#ff6b1a]" />
                  <span>Send Direct Commands to Hardware</span>
                </h4>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${isSerialConnected ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800' : 'text-slate-400 bg-slate-900'}`}>
                  {isSerialConnected ? 'CONNECTED' : 'STANDALONE / SIMULATED'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-6 font-sans">
                Click any button to trigger the physical buzzer & LEDs on your ESP32 right now (20-second non-blocking hardware cycle):
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => sendSerialCommand('ALERT:WARNING')}
                  className="p-3.5 rounded-xl bg-orange-950/40 border border-orange-500/60 hover:bg-orange-900/50 text-white font-mono text-xs font-semibold flex flex-col items-center gap-1 transition-all"
                >
                  <Volume2 className="w-5 h-5 text-amber-400" />
                  <span>Trigger 20s Warning Alert</span>
                  <span className="text-[10px] text-slate-400 font-normal">GREEN OFF · RED ON · Buzzer + Haptic (20s)</span>
                </button>

                <button
                  type="button"
                  onClick={() => sendSerialCommand('ALERT:DANGER')}
                  className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/60 hover:bg-red-900/50 text-white font-mono text-xs font-semibold flex flex-col items-center gap-1 transition-all"
                >
                  <Volume2 className="w-5 h-5 text-red-400" />
                  <span>Trigger 20s Critical Danger</span>
                  <span className="text-[10px] text-slate-400 font-normal">GREEN OFF · RED ON · Siren + Haptic (20s)</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => sendSerialCommand('BEEP')}
                  className="flex-1 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono transition-colors"
                >
                  Quick 200ms Test Beep
                </button>

                <button
                  type="button"
                  onClick={() => sendSerialCommand('CLEAR')}
                  className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
                >
                  Reset Safe (RED OFF, GREEN ON)
                </button>
              </div>
            </div>

            {/* Live Serial Monitor Output */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span className="font-heading font-bold text-white text-base">
                    Live USB Serial Console
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSerialLogs([])}
                  className="text-[11px] font-mono text-slate-500 hover:text-slate-300"
                >
                  Clear Console
                </button>
              </div>

              <div className="flex-1 min-h-[220px] max-h-[260px] overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
                {serialLogs.map((log, i) => (
                  <div key={i} className={log.startsWith('[TX]') ? 'text-cyan-400' : log.startsWith('[RX]') ? 'text-emerald-400' : 'text-slate-400'}>
                    {log}
                  </div>
                ))}
              </div>

              <span className="text-[11px] font-mono text-slate-500 mt-2 block">
                Auto-parses JSON telemetry and reflects live in your Dashboard.
              </span>
            </div>
          </div>

          {/* Easy USB Arduino Sketch Preview */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="font-heading font-bold text-white text-lg tracking-wide flex items-center gap-2">
                  <Code className="w-5 h-5 text-[#ff6b1a]" />
                  <span>
                    {usbSketchType === 'zero_library'
                      ? 'Ultra-Simple Zero-Library Sketch (Compiles in 2s)'
                      : 'The 30-Line Plug & Play USB Arduino Sketch'}
                  </span>
                </h4>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {usbSketchType === 'zero_library'
                    ? '★ ZERO EXTERNAL LIBRARIES NEEDED! No Adafruit, no DHT downloads. Works on every ESP32.'
                    : 'Standard sketch reading DHT11 data pin and MQ-2 analog voltage.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyUsbCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition-colors"
                >
                  {copiedUsbCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUsbCode ? 'COPIED' : 'COPY CODE'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadUsbIno}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff6b1a] hover:bg-[#e0560a] text-white text-xs font-mono font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>DOWNLOAD .INO</span>
                </button>
              </div>
            </div>

            {/* Sketch Type Selector */}
            <div className="flex flex-wrap items-center gap-2 mb-3 text-xs font-mono">
              <span className="text-slate-400 text-[11px]">Select Sketch Type:</span>
              <button
                type="button"
                onClick={() => setUsbSketchType('zero_library')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  usbSketchType === 'zero_library'
                    ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>★ Zero Libraries (100% Guaranteed to Compile)</span>
              </button>
              <button
                type="button"
                onClick={() => setUsbSketchType('standard')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  usbSketchType === 'standard'
                    ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>Full Sensor Sketch (with DHT11)</span>
              </button>
            </div>

            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 font-mono text-xs overflow-x-auto max-h-[340px] leading-relaxed">
              {activeUsbCode}
            </pre>
          </div>
        </div>
      )}

      {/* Tab: FIREBASE IOT CLOUD HUB */}
      {activeTab === 'firebase' && (
        <div className="space-y-6">
          {/* Hero Firebase Banner */}
          <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-orange-500/40 bg-gradient-to-br from-slate-900 via-slate-950 to-orange-950/20">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-mono text-orange-400 bg-orange-950/60 border border-orange-800/40 px-2.5 py-1 rounded mb-3">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>FIREBASE REALTIME DATABASE (RTDB) · WIRELESS IOT PIPELINE</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-2">
                  Connect Hardware via Firebase Cloud
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-sans leading-relaxed">
                  Your ESP32 publishes sensor readings (temperature, humidity, smoke, and chemical strip color ΔE) directly to Firebase, and listens for 20-second industrial safety alerts in real time over WebSockets!
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 font-mono text-xs">
                  <span className={`w-2.5 h-2.5 rounded-full ${fbConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span className="text-white font-bold">{fbConnected ? 'FIREBASE SYNC ACTIVE' : 'CONNECTING'}</span>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadIno}
                  className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#ff6b1a] hover:bg-[#e0560a] text-white font-mono text-xs font-bold transition-all shadow-lg shadow-orange-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span>DOWNLOAD FIREBASE .INO</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Firebase Configuration & Remote Actuators */}
            <div className="lg:col-span-2 space-y-6">
              {/* Configuration Form */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-orange-400" />
                    <h4 className="font-heading font-bold text-white text-base tracking-wide">
                      Firebase Project & RTDB Settings
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Target Device: <strong className="text-cyan-400">{selectedDeviceId}</strong>
                  </span>
                </div>

                <form onSubmit={handleSaveFirebaseConfig} className="space-y-4 text-xs font-mono">
                  <div>
                    <label className="text-slate-300 block mb-1">
                      Firebase Realtime Database URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://your-project-default-rtdb.firebaseio.com"
                      value={fbConfig.databaseURL}
                      onChange={(e) => setFbConfig({ ...fbConfig, databaseURL: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-orange-500 placeholder:text-slate-600"
                      required
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Found in Firebase Console → Realtime Database (e.g. https://[PROJECT]-default-rtdb.firebaseio.com)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-300 block mb-1">Firebase Project ID</label>
                      <input
                        type="text"
                        placeholder="spiderzen-dosimeter"
                        value={fbConfig.projectId || ''}
                        onChange={(e) => setFbConfig({ ...fbConfig, projectId: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-orange-500 placeholder:text-slate-600"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1">
                        Database Secret / Legacy Token (Optional)
                      </label>
                      <input
                        type="password"
                        placeholder="Leave blank if using open test rules"
                        value={fbConfig.databaseSecret || ''}
                        onChange={(e) => setFbConfig({ ...fbConfig, databaseSecret: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-orange-500 placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-orange-600/30 flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save & Sync to ESP32 Firmware</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePushFirebaseSample}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs border border-slate-700 flex items-center gap-1.5 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Push Test Telemetry to Firebase</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Real-Time Hardware Remote Control via Firebase */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Radio className="w-5 h-5 text-cyan-400" />
                    <h4 className="font-heading font-bold text-white text-base tracking-wide">
                      Test 2-Way Hardware Alerts via Firebase
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    Live Cloud Triggers
                  </span>
                </div>

                <p className="text-xs text-slate-300 mb-4 font-sans leading-relaxed">
                  Clicking below writes directly to <code className="text-orange-400">/devices/{selectedDeviceId}/alert</code> in Firebase. Your physical ESP32 streaming listener will pick it up instantly:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => handleTestFirebaseAlert('WARNING')}
                    className="p-4 rounded-xl bg-orange-950/50 hover:bg-orange-900/60 border border-orange-500/60 text-white font-mono text-xs font-bold flex flex-col items-center gap-1.5 transition-all text-center"
                  >
                    <Volume2 className="w-5 h-5 text-amber-400" />
                    <span>Send 20s Warning Alert to ESP32</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      GREEN OFF · RED ON · Buzzer + Haptic (20s)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTestFirebaseAlert('DANGER')}
                    className="p-4 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-500/60 text-white font-mono text-xs font-bold flex flex-col items-center gap-1.5 transition-all text-center"
                  >
                    <Volume2 className="w-5 h-5 text-red-400" />
                    <span>Send Critical Danger Alert to ESP32</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      GREEN OFF · RED ON · Fast Siren + Haptic (20s)
                    </span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleTestFirebaseClear}
                    className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 transition-colors"
                  >
                    Reset Safe State via Firebase (RED OFF, GREEN ON)
                  </button>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Live Firebase Event Console & Security Rules */}
            <div className="space-y-6">
              {/* Live Firebase Stream Console */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-orange-400" />
                    <span className="font-heading font-bold text-white text-base">
                      Firebase RTDB Stream Console
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFbLogs([])}
                    className="text-[11px] font-mono text-slate-500 hover:text-slate-300"
                  >
                    Clear
                  </button>
                </div>

                <div className="flex-1 min-h-[220px] max-h-[260px] overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
                  {fbLogs.map((log, i) => (
                    <div
                      key={i}
                      className={
                        log.startsWith('[TX]')
                          ? 'text-cyan-400'
                          : log.startsWith('[RX]')
                          ? 'text-emerald-400'
                          : log.startsWith('[TEST]')
                          ? 'text-amber-400'
                          : 'text-slate-400'
                      }
                    >
                      {log}
                    </div>
                  ))}
                </div>

                <span className="text-[11px] font-mono text-slate-500 mt-2 block">
                  Path: /devices/{selectedDeviceId}/sensor & /alert
                </span>
              </div>

              {/* Firebase Realtime Database Security Rules */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <h5 className="font-heading font-bold text-white text-sm">
                      Firebase Realtime Database Rules
                    </h5>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const rules = JSON.stringify(
                        {
                          rules: {
                            devices: {
                              '.read': true,
                              '.write': true,
                            },
                          },
                        },
                        null,
                        2
                      );
                      navigator.clipboard.writeText(rules);
                      setCopiedRules(true);
                      setTimeout(() => setCopiedRules(false), 2000);
                    }}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono border border-slate-700 flex items-center gap-1"
                  >
                    {copiedRules ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedRules ? 'COPIED' : 'COPY'}</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 font-sans mb-3 leading-relaxed">
                  In Firebase Console $\rightarrow$ <strong>Realtime Database</strong> $\rightarrow$ <strong>Rules</strong> tab, paste:
                </p>

                <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-300">
{`{
  "rules": {
    "devices": {
      ".read": true,
      ".write": true
    }
  }
}`}
                </pre>
              </div>

              {/* 4-Step Quick Setup Guide */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-800 font-sans text-xs space-y-2">
                <h5 className="font-heading font-bold text-white text-sm flex items-center gap-1.5 mb-2">
                  <BookOpen className="w-4 h-4 text-orange-400" />
                  <span>How to Set Up Firebase (60 Seconds)</span>
                </h5>
                <ol className="space-y-1.5 text-slate-300 text-[11px] list-decimal pl-4">
                  <li>Go to <strong>console.firebase.google.com</strong> and click <em>Create a project</em>.</li>
                  <li>In left sidebar, click <strong>Build → Realtime Database</strong> $\rightarrow$ <em>Create Database</em>.</li>
                  <li>Choose location (e.g. United States or Singapore) and select <strong>Start in test mode</strong>.</li>
                  <li>Copy the database URL (e.g. <code className="text-orange-400">https://xxx-default-rtdb.firebaseio.com</code>) and paste it into the box on the left!</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: Live Monitor & Virtual Hardware Emulator */}
      {activeTab === 'monitor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Virtual Hardware Simulator (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Device Selector */}
            <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">Select Active Node:</span>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => {
                    setSelectedDeviceId(e.target.value);
                    setHwConfig((prev) => ({ ...prev, deviceId: e.target.value }));
                  }}
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none"
                >
                  {devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.deviceId} — {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400">Assigned Worker:</span>
                <span className="text-xs font-mono text-cyan-400 font-semibold">
                  {workers.find((w) => w.id === selectedDevice?.pairedWorkerId)?.name || 'Unassigned'}
                </span>
              </div>
            </div>

            {/* Interactive Hardware Visualizer (Virtual ESP32 DevKit Board) */}
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-cyan-400">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-lg text-white tracking-wide">
                      Virtual Node: {selectedDevice.deviceId}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      IP: {selectedDevice.ipAddress || '192.168.10.45'} · Firmware {selectedDevice.firmwareVersion}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      selectedDevice.online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                    }`}
                  />
                  <span className="text-xs font-mono font-bold text-slate-300">
                    {selectedDevice.online ? 'RTDB SYNCED' : 'OFFLINE'}
                  </span>
                </div>
              </div>

              {/* Hardware Visual Actuators Bar (Green LED, Red LED, Buzzer, Vibration) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {/* Green Safe LED (Normally ON) */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                    selectedDevice.alertState.ledGreen
                      ? 'border-emerald-400 bg-emerald-950/40 shadow-lg shadow-emerald-500/20'
                      : 'border-slate-800 bg-slate-900/60 opacity-40'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full mb-1.5 ${
                      selectedDevice.alertState.ledGreen
                        ? 'bg-emerald-400 shadow-md shadow-emerald-400 animate-pulse'
                        : 'bg-slate-700'
                    }`}
                  />
                  <span className="text-xs font-mono font-bold text-white">GPIO {hwConfig.pinLedGreen}: GREEN LED</span>
                  <span className="text-[10px] text-emerald-400 font-mono mt-0.5">
                    {selectedDevice.alertState.ledGreen ? 'ON (SAFE STATE)' : 'OFF (ALERT)'}
                  </span>
                </div>

                {/* Red Alert LED (Normally OFF, ON in Alert) */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                    selectedDevice.alertState.ledRed
                      ? 'border-red-500 bg-red-950/50 shadow-lg shadow-red-500/30'
                      : 'border-slate-800 bg-slate-900/60 opacity-40'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full mb-1.5 ${
                      selectedDevice.alertState.ledRed
                        ? 'bg-red-500 shadow-md shadow-red-500 animate-ping'
                        : 'bg-slate-700'
                    }`}
                  />
                  <span className="text-xs font-mono font-bold text-white">GPIO {hwConfig.pinLedRed}: RED LED</span>
                  <span className="text-[10px] text-red-400 font-mono mt-0.5">
                    {selectedDevice.alertState.ledRed ? 'ON (ALERT ACTIVE)' : 'OFF (SAFE)'}
                  </span>
                </div>

                {/* Piezo Buzzer & PWM Tone (20s Timer) */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                    selectedDevice.alertState.buzzerTriggered
                      ? 'border-orange-500 bg-orange-950/40 shadow-lg shadow-orange-500/20'
                      : 'border-slate-800 bg-slate-900/60 opacity-40'
                  }`}
                >
                  <Volume2
                    className={`w-6 h-6 mb-1.5 ${
                      selectedDevice.alertState.buzzerTriggered
                        ? 'text-[#ff6b1a] animate-bounce'
                        : 'text-slate-500'
                    }`}
                  />
                  <span className="text-xs font-mono font-bold text-white">GPIO {hwConfig.pinBuzzer}: BUZZER</span>
                  <span className="text-[10px] text-orange-400 font-mono mt-0.5">
                    {selectedDevice.alertState.buzzerTriggered
                      ? `${selectedDevice.alertState.durationRemainingSec}s REMAINING`
                      : 'SILENT'}
                  </span>
                </div>

                {/* Haptic Vibration Motor */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                    selectedDevice.alertState.vibrationTriggered
                      ? 'border-cyan-500 bg-cyan-950/40 shadow-lg shadow-cyan-500/20'
                      : 'border-slate-800 bg-slate-900/60 opacity-40'
                  }`}
                >
                  <Activity
                    className={`w-6 h-6 mb-1.5 ${
                      selectedDevice.alertState.vibrationTriggered
                        ? 'text-cyan-400 animate-pulse'
                        : 'text-slate-500'
                    }`}
                  />
                  <span className="text-xs font-mono font-bold text-white">GPIO {hwConfig.pinVibration}: VIBRATION</span>
                  <span className="text-[10px] text-cyan-400 font-mono mt-0.5">
                    {selectedDevice.alertState.vibrationTriggered ? '20s HAPTIC ON' : 'OFF'}
                  </span>
                </div>
              </div>

              {/* 0.96" I2C OLED Display Preview (Shared I2C D21/D22 with TCS34725) */}
              <div className="mb-6 p-4 rounded-xl border border-cyan-500/30 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                      SHARED I²C BUS (SDA: D21, SCL: D22) · TCS34725 + 0.96" OLED
                    </span>
                    <h4 className="font-heading font-bold text-white text-sm">
                      0.96" OLED Hardware Screen Mirror (SSD1306)
                    </h4>
                  </div>
                </div>

                {/* OLED Bezel Screen Emulation */}
                <div className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-black border-2 border-slate-700 shadow-inner font-mono text-xs text-cyan-300 leading-tight space-y-0.5 min-w-[270px]">
                  <div className="flex items-center justify-between text-[10px] text-cyan-400/80 border-b border-cyan-900/60 pb-1 mb-1 font-bold">
                    <span>SPIDERZEN H2S</span>
                    <span className={selectedDevice.alertState.active ? 'text-red-400 animate-pulse font-bold' : 'text-emerald-400'}>
                      {selectedDevice.alertState.active ? `ALERT ${selectedDevice.alertState.durationRemainingSec}s` : 'STATUS: SAFE'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span>T: {selectedDevice.telemetry.temperatureC.toFixed(1)}°C</span>
                    <span>RH: {selectedDevice.telemetry.humidityPct.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span>Gas: {selectedDevice.telemetry.smokeValue}</span>
                    <span>dE: {selectedDevice.telemetry.compensatedDeltaE.toFixed(1)}</span>
                  </div>
                  <div className="text-[9px] pt-1 text-slate-400 flex justify-between border-t border-slate-900 mt-1">
                    <span>{selectedDevice.alertState.active ? 'GRN:OFF | RED:ON' : 'GRN:ON | RED:OFF'}</span>
                    <span>{selectedDevice.alertState.active ? 'BUZ+VIB: 20s' : 'ACTUATORS: IDLE'}</span>
                  </div>
                </div>
              </div>

              {/* 20-Second Active Alert Countdown Banner */}
              {selectedDevice.alertState.active && (
                <div className="mb-6 p-4 rounded-xl border border-red-500/60 bg-red-950/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center font-mono font-bold text-red-400 text-lg">
                      {selectedDevice.alertState.durationRemainingSec}s
                    </div>
                    <div>
                      <h4 className="font-heading font-bold text-white text-sm">
                        20-SECOND HARDWARE ALERT CYCLE ACTIVE (CYCLE #{selectedDevice.alertState.cycleCount || 1})
                      </h4>
                      <p className="text-xs text-red-200">
                        RED LED ON · GREEN LED OFF · Buzzer + Vibration running for exactly 20 seconds. Non-blocking millis() timer.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onClearAlert(selectedDevice.deviceId)}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700"
                  >
                    Force Silence
                  </button>
                </div>
              )}

              {/* Dual-Signal Fusion Logic Panel (Smoke + Strip Color Comparison) */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      DUAL-SIGNAL FUSION ENGINE (ANTI FALSE ALARM)
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      selectedDevice.fusion.dualAgreement
                        ? 'text-red-400 border-red-500/40 bg-red-950/60'
                        : selectedDevice.fusion.cautionOnly
                        ? 'text-amber-400 border-amber-500/40 bg-amber-950/60'
                        : 'text-emerald-400 border-emerald-500/40 bg-emerald-950/60'
                    }`}
                  >
                    {selectedDevice.fusion.dualAgreement
                      ? 'DUAL AGREEMENT: 20s ALARM FIRED'
                      : selectedDevice.fusion.cautionOnly
                      ? 'CAUTION ONLY: SINGLE SIGNAL SPIKE (FALSE ALARM BLOCKED)'
                      : 'SAFE STATE: DUAL CLEAR (GREEN LED ON)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  {/* Signal 1: MQ-2 Smoke Sensor */}
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-400">SIGNAL 1: MQ-2 SMOKE SENSOR</span>
                      <span
                        className={`font-bold ${
                          selectedDevice.fusion.smokeAboveThreshold ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {selectedDevice.fusion.smokeAboveThreshold ? 'EXCEEDED' : 'NORMAL'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-white">
                        {selectedDevice.telemetry.smokeValue}
                      </span>
                      <span className="text-slate-500 text-[11px]">/ 1500 threshold</span>
                    </div>
                  </div>

                  {/* Signal 2: TCS Strip Color Sensor (Temp/Hum Compensated) */}
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-400">SIGNAL 2: TCS STRIP COLOR (COMPENSATED)</span>
                      <span
                        className={`font-bold ${
                          selectedDevice.fusion.colorDeltaAboveThreshold ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {selectedDevice.fusion.colorDeltaAboveThreshold ? 'EXCEEDED' : 'NORMAL'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-white">
                        ΔE = {selectedDevice.telemetry.compensatedDeltaE.toFixed(1)}
                      </span>
                      <span className="text-slate-500 text-[11px]">/ 12.0 threshold</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span>DHT11 Compensation: corrected_color = raw_RGB − drift(temp, hum)</span>
                  <span>Temp: {selectedDevice.telemetry.temperatureC}°C · RH: {selectedDevice.telemetry.humidityPct}%</span>
                </div>
              </div>

              {/* AI Early-Warning Prediction (5 Minutes Before) */}
              <div className="p-4 rounded-xl border border-orange-500/40 bg-orange-950/20 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#ff6b1a]" />
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      AI EARLY-WARNING PREDICTION (5 MINUTES BEFORE BREACH)
                    </span>
                  </div>
                  {selectedDevice.prediction.isPredictingBreach ? (
                    <span className="bg-orange-500 text-black text-[10px] font-mono font-bold px-2 py-0.5 rounded animate-pulse">
                      PREDICTED BREACH (~{selectedDevice.prediction.predictedBreachMinutes} MIN)
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-mono text-[10px]">
                      TREND STABLE
                    </span>
                  )}
                </div>

                <p className="text-xs text-orange-200/90 font-sans mb-3">
                  {selectedDevice.prediction.message}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">
                    Trend rate: +{selectedDevice.prediction.trendRatePpmHrPerMin} ppm·hr/min · Projected 5m: {selectedDevice.prediction.projectedExposureIn5Min} ppm·hr
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      spiderZenStore.triggerEarlyWarningForecast(selectedDevice.deviceId, 4.5);
                    }}
                    className="px-3 py-1 rounded bg-[#ff6b1a] hover:bg-[#e0560a] text-white text-[11px] font-mono font-semibold transition-colors"
                  >
                    Simulate 5-Min Forecast
                  </button>
                </div>
              </div>

              {/* Live Telemetry Readings from Node */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 mb-6">
                <span className="text-xs font-mono text-slate-400 block mb-3 uppercase tracking-wider">
                  REAL-TIME TELEMETRY (RTDB PATH: /devices/{selectedDevice.deviceId}/sensor)
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10px] block">TEMPERATURE</span>
                    <span className="text-white font-bold">{selectedDevice.telemetry.temperatureC}°C</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10px] block">HUMIDITY</span>
                    <span className="text-white font-bold">{selectedDevice.telemetry.humidityPct}%</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10px] block">{hwConfig.gasSensorType} RAW</span>
                    <span className="text-white font-bold">{selectedDevice.telemetry.gasRaw} / 4095</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10px] block">GAS FLAG PROXY</span>
                    <span
                      className={`font-bold ${
                        selectedDevice.telemetry.gasFlag ? 'text-orange-400' : 'text-emerald-400'
                      }`}
                    >
                      {selectedDevice.telemetry.gasFlag ? 'ELEVATED' : 'NORMAL'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Interactive Actuator Trigger Testing Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onTriggerAlert(selectedDevice.deviceId, 'WARNING');
                      onTestSound('WARNING');
                    }}
                    className="px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-mono text-xs font-semibold shadow-md shadow-orange-600/20"
                  >
                    Fire Warning Alert
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onTriggerAlert(selectedDevice.deviceId, 'DANGER');
                      onTestSound('DANGER');
                    }}
                    className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-semibold shadow-md shadow-red-600/20"
                  >
                    Fire Critical Danger Alert
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onClearAlert(selectedDevice.deviceId)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs border border-slate-700"
                >
                  Clear Hardware Actuators
                </button>
              </div>
            </div>
          </div>

          {/* Device Pairing Form (Right 1 col) */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <h3 className="font-heading font-bold text-white text-lg tracking-wide mb-2 flex items-center gap-2">
              <Wifi className="w-5 h-5 text-cyan-400" />
              <span>Pair WiFi Cloud Node</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6 font-sans">
              Enroll an ESP32 wearable wristband node into the refinery mesh network.
            </p>

            <form onSubmit={handlePairSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-slate-300 block mb-1">Hardware Device ID</label>
                <input
                  type="text"
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  placeholder="e.g. SPIDERZEN-ESP32-05"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Location / Node Label</label>
                <input
                  type="text"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  placeholder="e.g. Wristband Node #5"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Pair to Personnel</label>
                <select
                  value={pairedWorkerId}
                  onChange={(e) => setPairedWorkerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                >
                  <option value="">-- Unassigned --</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Refinery WiFi SSID</label>
                <input
                  type="text"
                  value={wifiSSID}
                  onChange={(e) => setWifiSSID(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">WPA2 Pre-Shared Key</label>
                <input
                  type="password"
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-[#ff6b1a] hover:bg-[#e0560a] text-white font-heading font-bold text-xs tracking-wider transition-all shadow-md shadow-orange-500/20 active:scale-95"
              >
                PROVISION & PAIR NODE
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Hardware Customizer & Pin Mapping */}
      {activeTab === 'hardware_config' && (
        <div className="space-y-6">
          {/* Quick Hardware Architecture Presets */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-heading font-bold text-white text-lg tracking-wide flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span>Hardware Architecture Presets & Pin Customization</span>
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Have a different wiring or pinout? Change any pin below: both the 1-Click USB sketch and WiFi firmware update automatically.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setHwConfig({
                      ...DEFAULT_HARDWARE_CONFIG,
                      deviceId: selectedDevice?.deviceId || 'SPIDERZEN-ESP32-01',
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono transition-colors"
                >
                  Standard DevKit V1 (Default)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setHwConfig({
                      ...DEFAULT_HARDWARE_CONFIG,
                      deviceId: selectedDevice?.deviceId || 'SPIDERZEN-ESP32-01',
                      pinDht: 16,
                      pinMq2: 35,
                      pinBuzzer: 19,
                      pinLedGreen: 23,
                      pinLedRed: 18,
                      pinVibration: 13,
                      pinI2cSda: 21,
                      pinI2cScl: 22,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-400 text-xs font-mono transition-colors"
                >
                  Alternative Pinout (Custom)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setHwConfig({
                      ...DEFAULT_HARDWARE_CONFIG,
                      deviceId: selectedDevice?.deviceId || 'SPIDERZEN-ESP32-01',
                      sensorType: 'DHT22',
                      pinDht: 4,
                      pinMq2: 34,
                      smokeThreshold: 1200,
                      deltaEThreshold: 10.0,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-orange-500/40 text-[#ff6b1a] text-xs font-mono transition-colors"
                >
                  High-Sensitivity Setup
                </button>
              </div>
            </div>
          </div>

          {/* Interactive GPIO & Sensor Mapping Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Actuators Pinout Configuration */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800">
              <h4 className="font-heading font-bold text-white text-base tracking-wide mb-4 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#ff6b1a]" />
                <span>Actuators & Status Indicator Pins</span>
              </h4>

              <div className="space-y-4 text-xs font-mono">
                <div>
                  <label className="text-slate-300 block mb-1">
                    Safe Status GREEN LED (Normally ON in Safe State)
                  </label>
                  <select
                    value={hwConfig.pinLedGreen}
                    onChange={(e) => setHwConfig({ ...hwConfig, pinLedGreen: parseInt(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  >
                    {[18, 19, 21, 22, 23, 25, 26, 27, 4, 5, 12, 13, 14, 15].map((pin) => (
                      <option key={pin} value={pin}>
                        GPIO {pin} {pin === 18 ? '(Default Green - Active High)' : ''}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-emerald-400 mt-1 block">
                    Always ON when safe. Turns OFF immediately upon WARNING or DANGER.
                  </span>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">
                    Alert Status RED LED (Normally OFF, ON in Alert)
                  </label>
                  <select
                    value={hwConfig.pinLedRed}
                    onChange={(e) => setHwConfig({ ...hwConfig, pinLedRed: parseInt(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  >
                    {[27, 26, 25, 23, 22, 21, 19, 18, 14, 13, 12, 4, 5, 32, 33].map((pin) => (
                      <option key={pin} value={pin}>
                        GPIO {pin} {pin === 27 ? '(Default Red - Alert Active)' : ''}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-red-400 mt-1 block">
                    Turns ON for exactly 20 seconds during warning or danger.
                  </span>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">
                    Piezo Buzzer PWM Pin (Current: GPIO {hwConfig.pinBuzzer})
                  </label>
                  <select
                    value={hwConfig.pinBuzzer}
                    onChange={(e) => setHwConfig({ ...hwConfig, pinBuzzer: parseInt(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  >
                    {[25, 26, 27, 18, 19, 21, 22, 23, 14, 13, 12, 4, 5].map((pin) => (
                      <option key={pin} value={pin}>
                        GPIO {pin} {pin === 25 ? '(Default PWM channel)' : ''}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-orange-400 mt-1 block">
                    Runs 20-second audible alert cycle (non-blocking timer).
                  </span>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">
                    Haptic Vibration Motor Pin (Current: GPIO {hwConfig.pinVibration})
                  </label>
                  <select
                    value={hwConfig.pinVibration}
                    onChange={(e) => setHwConfig({ ...hwConfig, pinVibration: parseInt(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  >
                    {[14, 13, 12, 15, 2, 4, 5, 18, 19, 21, 22, 23, 26, 27].map((pin) => (
                      <option key={pin} value={pin}>
                        GPIO {pin} {pin === 14 ? '(Default Vibration Gate)' : ''}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-cyan-400 mt-1 block">
                    Wearable collar / wrist tactile vibration (20-second active window).
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-300">Alert Duration Cycle</span>
                    <span className="text-cyan-400 font-bold">{hwConfig.alertDurationSec} seconds (Fixed Spec)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Buzzer, vibration, and red LED run for exactly 20 seconds, then auto-stop or re-trigger if danger persists.
                  </span>
                </div>
              </div>
            </div>

            {/* Sensors Configuration */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800">
              <h4 className="font-heading font-bold text-white text-base tracking-wide mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                <span>Sensors, Pinouts & Fusion Thresholds</span>
              </h4>

              <div className="space-y-4 text-xs font-mono">
                {/* MQ-2 Smoke Sensor */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1">MQ-2 Analog Pin</label>
                    <select
                      value={hwConfig.pinMq2}
                      onChange={(e) => setHwConfig({ ...hwConfig, pinMq2: parseInt(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                    >
                      {[34, 35, 36, 39, 32, 33].map((pin) => (
                        <option key={pin} value={pin}>
                          GPIO {pin} (ADC1 channel)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">Smoke Threshold (ADC)</label>
                    <input
                      type="number"
                      min="500"
                      max="3800"
                      step="50"
                      value={hwConfig.smokeThreshold}
                      onChange={(e) => setHwConfig({ ...hwConfig, smokeThreshold: parseInt(e.target.value) || 1500 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                    />
                  </div>
                </div>

                {/* Temp & Humidity Sensor */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1">Environment Sensor</label>
                    <select
                      value={hwConfig.sensorType}
                      onChange={(e) => setHwConfig({ ...hwConfig, sensorType: e.target.value as HardwareConfig['sensorType'] })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                    >
                      <option value="DHT11">DHT11 (Digital 1-Wire)</option>
                      <option value="DHT22">DHT22 (Digital High-Precision)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">DHT11 Data Pin</label>
                    <select
                      value={hwConfig.pinDht}
                      onChange={(e) => setHwConfig({ ...hwConfig, pinDht: parseInt(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                    >
                      {[4, 5, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23].map((pin) => (
                        <option key={pin} value={pin}>
                          GPIO {pin} {pin === 4 ? '(Default Data)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Color Sensor TCS34725 / TCS3200 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1">TCS I2C SDA Pin</label>
                    <select
                      value={hwConfig.pinI2cSda}
                      onChange={(e) => setHwConfig({ ...hwConfig, pinI2cSda: parseInt(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                    >
                      {[21, 22, 19, 18, 4, 5, 25, 26].map((pin) => (
                        <option key={pin} value={pin}>
                          GPIO {pin} {pin === 21 ? '(Standard I2C SDA)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">TCS I2C SCL Pin</label>
                    <select
                      value={hwConfig.pinI2cScl}
                      onChange={(e) => setHwConfig({ ...hwConfig, pinI2cScl: parseInt(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                    >
                      {[22, 21, 19, 18, 4, 5, 25, 26].map((pin) => (
                        <option key={pin} value={pin}>
                          GPIO {pin} {pin === 22 ? '(Standard I2C SCL)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Strip Color ΔE Threshold */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-300">Compensated Color ΔE Threshold</span>
                    <span className="text-cyan-400 font-bold">{hwConfig.deltaEThreshold.toFixed(1)} ΔE units</span>
                  </div>
                  <input
                    type="range"
                    min="3.0"
                    max="35.0"
                    step="0.5"
                    value={hwConfig.deltaEThreshold}
                    onChange={(e) => setHwConfig({ ...hwConfig, deltaEThreshold: parseFloat(e.target.value) })}
                    className="w-full accent-[#ff6b1a] bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Dual confirmation requires BOTH Smoke &gt; {hwConfig.smokeThreshold} AND ΔE &gt; {hwConfig.deltaEThreshold.toFixed(1)} to prevent false alarms.
                  </span>
                </div>

                {/* Telemetry Interval */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-300">Firebase Telemetry Push Rate</span>
                    <span className="text-cyan-400 font-bold">{hwConfig.telemetryIntervalSec} seconds</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={hwConfig.telemetryIntervalSec}
                    onChange={(e) => setHwConfig({ ...hwConfig, telemetryIntervalSec: parseInt(e.target.value) })}
                    className="w-full accent-[#ff6b1a] bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Firmware & Pinout State:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Auto-Synchronized
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Firmware Code Viewer & Download (.ino) */}
      {activeTab === 'firmware' && (
        <div className="space-y-6">
          {/* Wi-Fi Setup & Troubleshooting Guide Card */}
          <div className="glass-panel p-6 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-500/60 flex items-center justify-center text-amber-400 shrink-0">
                <Wifi className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <h3 className="font-heading font-bold text-white text-lg tracking-wide flex items-center gap-2">
                    <span>Wi-Fi Connection Helper & Troubleshooting</span>
                  </h3>
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Why "SpiderZen-Setup-AP" might not show up
                  </span>
                </div>
                <p className="text-xs text-slate-300 mb-4 font-sans leading-relaxed">
                  If your ESP32 does not broadcast <strong>SpiderZen-Setup-AP</strong>, it usually means the ESP32 is trying to reconnect to an old Wi-Fi network previously saved in its internal flash memory, or it is waiting for direct credentials. Choose the easiest method below:
                </p>

                {/* Direct Wi-Fi Input Form (Fastest, 100% Reliable) */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Option 1: Direct Wi-Fi Credentials (Recommended — No Hotspot Needed!)</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">Live-syncs into code below</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Enter your Wi-Fi router or phone mobile hotspot name & password. The sketch below will directly connect to it upon boot:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-mono text-slate-300 block mb-1">
                        Wi-Fi Name (SSID) — 2.4 GHz
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. MyHomeWiFi or MobileHotspot"
                        value={hwConfig.wifiSsid}
                        onChange={(e) => setHwConfig({ ...hwConfig, wifiSsid: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-slate-300 block mb-1">
                        Wi-Fi Password
                      </label>
                      <input
                        type="text"
                        placeholder="Enter your Wi-Fi password"
                        value={hwConfig.wifiPassword}
                        onChange={(e) => setHwConfig({ ...hwConfig, wifiPassword: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Option 2: Captive Portal details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-amber-400 font-bold block mb-1">Option 2: Captive Setup AP</span>
                    <span className="text-slate-400 text-[11px] leading-relaxed block font-sans">
                      Leave the Wi-Fi fields blank. The updated code now runs <code className="text-cyan-300">wm.resetSettings()</code> to force-clear previous cache and guarantee <strong>SpiderZen-Setup-AP</strong> appears!
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-cyan-400 font-bold block mb-1">Serial Monitor Diagnostics</span>
                    <span className="text-slate-400 text-[11px] leading-relaxed block font-sans">
                      Open Arduino IDE $\rightarrow$ <strong>Tools $\rightarrow$ Serial Monitor</strong> at <strong>115200 baud</strong>. It prints the exact step the ESP32 is executing and its assigned IP address.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Firmware Code Viewer & Download */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-heading font-bold text-white text-lg tracking-wide flex items-center gap-2">
                  <Code className="w-5 h-5 text-cyan-400" />
                  <span>ESP32 Full WiFi + RTDB Firmware (.ino)</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Node: {hwConfig.deviceId} · Wi-Fi Mode: {hwConfig.wifiSsid ? `Direct (${hwConfig.wifiSsid})` : 'SpiderZen-Setup-AP Portal'} · Buzzer GPIO {hwConfig.pinBuzzer}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'COPIED' : 'COPY'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadIno}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff6b1a] hover:bg-[#e0560a] text-white text-xs font-mono font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>DOWNLOAD .INO</span>
                </button>
              </div>
            </div>

            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 font-mono text-xs overflow-x-auto max-h-[520px] leading-relaxed">
              {arduinoCode}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 4: Pinout & Hardware Schematic */}
      {activeTab === 'wiring' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-bold text-white text-lg tracking-wide flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#ff6b1a]" />
                <span>Hardware Pinout & Circuit Schematic</span>
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Reflects your active custom configuration for node <strong>{hwConfig.deviceId}</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('hardware_config')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-mono border border-slate-700 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Modify Pins</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">COMPONENT</th>
                  <th className="py-3 px-4 font-semibold">PIN</th>
                  <th className="py-3 px-4 font-semibold">ESP32 GPIO</th>
                  <th className="py-3 px-4 font-semibold">TYPE</th>
                  <th className="py-3 px-4 font-semibold">CIRCUIT INSTRUCTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {dynamicPinout.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-4 font-bold text-white">{p.component}</td>
                    <td className="py-2.5 px-4 text-cyan-400">{p.pin}</td>
                    <td className="py-2.5 px-4 font-bold text-white">GPIO {p.gpio}</td>
                    <td className="py-2.5 px-4 text-slate-400">{p.type}</td>
                    <td className="py-2.5 px-4 text-slate-300">{p.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
