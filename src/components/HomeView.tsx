import React from 'react';
import {
  Camera,
  LayoutDashboard,
  Play,
  Shield,
  Activity,
  Cpu,
  Flame,
  CheckCircle,
  AlertTriangle,
  Layers,
  ArrowRight,
} from 'lucide-react';
import logoImg from '../assets/images/spiderzen_safety_icon_1790929102788.jpg';
import heroImg from '../assets/images/refinery_industrial_hero_1790868178118.jpg';
import wristbandImg from '../assets/images/dosimeter_wristband_strip_1790868198929.jpg';
import { ESP32Device, SafetyAlert, WorkerProfile } from '../types';

interface HomeViewProps {
  onScanClick: () => void;
  onDashboardClick: () => void;
  onStartDemo: () => void;
  workers: WorkerProfile[];
  devices: ESP32Device[];
  alerts: SafetyAlert[];
}

export const HomeView: React.FC<HomeViewProps> = ({
  onScanClick,
  onDashboardClick,
  onStartDemo,
  workers,
  devices,
  alerts,
}) => {
  const safeWorkersCount = workers.filter((w) => w.safetyLevel === 'SAFE').length;
  const warningCount = workers.filter((w) => w.safetyLevel === 'WARNING' || w.safetyLevel === 'DANGER').length;
  const onlineDevicesCount = devices.filter((d) => d.online).length;

  return (
    <div className="w-full">
      {/* Hero Section with Industrial Refinery Background */}
      <section className="relative w-full min-h-[580px] lg:min-h-[640px] flex items-center justify-center overflow-hidden border-b border-slate-800">
        {/* Background Image with Deep Dark Navy Gradient Overlay */}
        <div className="absolute inset-0 z-0 bg-slate-950">
          <img
            src={heroImg}
            alt="Petrochemical Refinery at Twilight"
            className="w-full h-full object-cover object-center brightness-60"
            loading="eager"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e1a] via-[#0a0e1a]/85 to-[#0a0e1a]/50" />
          <div className="absolute inset-0 bg-radial-[at_top_right] from-orange-500/10 via-transparent to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center flex flex-col items-center">
          {/* App Icon Emblem */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-orange-500/40 bg-slate-900 shadow-2xl shadow-orange-500/25 mb-5 p-1 bg-gradient-to-b from-slate-800 to-slate-950 group hover:scale-105 transition-transform flex items-center justify-center relative">
            <img
              src={logoImg}
              alt="SpiderZen App Icon"
              className="w-full h-full object-cover rounded-xl"
              loading="eager"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <Flame className="w-8 h-8 text-[#ff6b1a] absolute" />
          </div>

          {/* Industrial Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-orange-500/30 bg-orange-950/40 text-orange-400 text-xs font-mono tracking-wider mb-6 backdrop-blur-sm">
            <Flame className="w-3.5 h-3.5 text-[#ff6b1a]" />
            <span>HAZARDOUS ATMOSPHERE DOSIMETRY · OSHA / NIOSH COMPLIANT METRICS</span>
          </div>

          <h1 className="font-brand font-black text-4xl sm:text-6xl lg:text-7xl text-white tracking-wider uppercase mb-4 text-balance drop-shadow-md">
            SPIDER<span className="text-[#ff6b1a]">ZEN</span>
          </h1>

          <p className="text-xl sm:text-2xl text-slate-200 font-heading font-medium tracking-wide max-w-3xl mb-8">
            Passive Colorimetric H₂S Exposure-Dosimeter Wristband
          </p>

          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mb-10 leading-relaxed font-sans">
            Estimates cumulative Hydrogen Sulfide exposure (ppm·hr) via smartphone camera colorimetry,
            empowered by deterministic CIEDE2000 machine learning, cloud Firebase telemetry,
            and immediate ESP32 IoT worker warning alerts.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 w-full max-w-md">
            <button
              onClick={onScanClick}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-[#ff6b1a] hover:bg-[#e0560a] text-white font-heading font-bold text-base tracking-wider transition-all shadow-lg shadow-orange-500/25 active:scale-95"
            >
              <Camera className="w-5 h-5" />
              <span>SCAN STRIP</span>
            </button>

            <button
              onClick={onDashboardClick}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 text-cyan-400 font-heading font-bold text-base tracking-wider transition-all shadow-lg shadow-cyan-500/10 active:scale-95"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>DASHBOARD</span>
            </button>

            <button
              onClick={onStartDemo}
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 font-medium text-sm transition-all"
            >
              <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
              <span>START DEMO</span>
            </button>
          </div>

          {/* Real-time Status Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-12 w-full max-w-4xl text-left">
            <div className="glass-panel p-3.5 rounded-lg border border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Monitored Personnel</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-white">{workers.length}</span>
                <span className="text-xs text-slate-500">Active Shift</span>
              </div>
            </div>

            <div className="glass-panel p-3.5 rounded-lg border border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">ESP32 Nodes Online</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-[#00e5ff]">{onlineDevicesCount}/{devices.length}</span>
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  Synced
                </span>
              </div>
            </div>

            <div className="glass-panel p-3.5 rounded-lg border border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Safe Exposure Status</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-emerald-400">{safeWorkersCount}</span>
                <span className="text-xs text-slate-400">/ {workers.length} workers</span>
              </div>
            </div>

            <div className="glass-panel p-3.5 rounded-lg border border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Threshold Breaches</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-bold font-mono ${warningCount > 0 ? 'text-[#ff6b1a]' : 'text-slate-300'}`}>
                  {alerts.length}
                </span>
                <span className="text-xs text-orange-400/80">Logged</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture & Workflow Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-2">END-TO-END PIPELINE</h2>
          <h3 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-wide">
            How SpiderZen Protects Industrial Personnel
          </h3>
          <p className="text-slate-400 text-sm mt-3">
            Passive dosimeter strips capture cumulative chemical exposure without batteries, while smartphone optical AI and IoT collars provide active protection.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Step 1 */}
          <div className="glass-panel p-6 rounded-xl relative group hover:border-orange-500/40 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-[#ff6b1a] mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono text-slate-500 block mb-1">STEP 01</span>
            <h4 className="text-lg font-heading font-semibold text-white mb-2">Passive Wristband Strip</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Worker wears lightweight dosimeter badge with lead-acetate or nano-metal reaction zone and a calibration white reference patch. H₂S gas binds stoichiometrically.
            </p>
          </div>

          {/* Step 2 */}
          <div className="glass-panel p-6 rounded-xl relative group hover:border-cyan-500/40 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono text-slate-500 block mb-1">STEP 02</span>
            <h4 className="text-lg font-heading font-semibold text-white mb-2">Optical Scan & CIEDE2000</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Worker scans strip with phone camera. Pre-flight quality gates check blur, lighting, and patch alignment. Gray-world white balance corrects ambient refinery glare.
            </p>
          </div>

          {/* Step 3 */}
          <div className="glass-panel p-6 rounded-xl relative group hover:border-orange-500/40 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-[#ff6b1a] mb-4">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono text-slate-500 block mb-1">STEP 03</span>
            <h4 className="text-lg font-heading font-semibold text-white mb-2">AI Exposure Estimation</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Trained gradient boosting model incorporates ΔE₀₀ color delta, ambient temperature, and relative humidity to estimate true cumulative H₂S exposure in ppm·hr.
            </p>
          </div>

          {/* Step 4 */}
          <div className="glass-panel p-6 rounded-xl relative group hover:border-red-500/40 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono text-slate-500 block mb-1">STEP 04</span>
            <h4 className="text-lg font-heading font-semibold text-white mb-2">ESP32 IoT Worker Alert</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              If exposure exceeds thresholds (&gt;15 or &gt;50 ppm·hr), Firebase RTDB writes trigger the worker’s ESP32 node to sound an audible buzzer and flash high-visibility safety LEDs.
            </p>
          </div>
        </div>

        {/* Dosimeter Strip Product Visual Spotlight */}
        <div className="mt-16 glass-panel rounded-2xl overflow-hidden border border-slate-800 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-6 lg:p-10">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#ff6b1a] bg-orange-950/40 border border-orange-800/40 px-2.5 py-1 rounded mb-4">
              <Shield className="w-3.5 h-3.5" />
              <span>HARDWARE SPECIFICATION</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-4">
              Dual-Range Colorimetric Wearable Sensor
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-6 font-sans">
              SpiderZen supports both <strong>Fast Strips</strong> (0.1–10 ppm·hr sensitive) for early trace gas detection and <strong>Slow Strips</strong> (5–120 ppm·hr wide-range) for sustained shifts in high-concentration sulfur recovery units.
            </p>

            <div className="space-y-3 text-xs font-mono text-slate-300 mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero battery requirement for chemical gas absorption</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Titanium-white embedded reference patch for lighting normalization</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Laplacian variance blur checking ensures deterministic optical scans</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>30-second automated ESP32 RTDB heartbeat & local SPIFFS buffering</span>
              </div>
            </div>

            <button
              onClick={onScanClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#ff6b1a] hover:bg-[#e0560a] text-white font-semibold text-sm transition-all"
            >
              <span>Test Strip Scanner Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shadow-2xl">
            <img
              src={wristbandImg}
              alt="SpiderZen Wristband Dosimeter Chemical Strip"
              className="w-full h-80 object-cover object-center"
              loading="eager"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-4">
              <span className="font-mono text-[11px] text-cyan-400 block">PATENTED DUAL-ZONE DOSIMETER</span>
              <p className="text-xs text-slate-300">Reaction Window + Standard D65 Calibration Reference Target</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
