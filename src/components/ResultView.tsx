import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Save,
  BarChart3,
  FileText,
  CloudCheck,
  CheckCircle,
  Thermometer,
  Droplets,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ScanResult } from '../types';

interface ResultViewProps {
  result: ScanResult;
  onSaveResult: (result: ScanResult) => void;
  onScanAgain: () => void;
  onViewGraph: () => void;
  onGenerateReport: (result: ScanResult) => void;
}

export const ResultView: React.FC<ResultViewProps> = ({
  result,
  onSaveResult,
  onScanAgain,
  onViewGraph,
  onGenerateReport,
}) => {
  const [saved, setSaved] = useState<boolean>(false);
  const isSimulated = result.status === 'SIMULATED';

  const handleSave = () => {
    onSaveResult(result);
    setSaved(true);
  };

  const getSafetyBadge = () => {
    switch (result.safetyLevel) {
      case 'SAFE':
        return {
          bg: 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400',
          indicator: 'bg-emerald-500',
          title: 'SAFE EXPOSURE (< 5 ppm·hr)',
          desc: 'Cumulative atmospheric H₂S exposure is well within normal continuous 8-hour shift limits.',
          icon: ShieldCheck,
        };
      case 'CAUTION':
        return {
          bg: 'bg-amber-950/40 border-amber-500/40 text-amber-400',
          indicator: 'bg-amber-500',
          title: 'CAUTION LIMIT (5 – 15 ppm·hr)',
          desc: 'Sub-acute accumulation detected. Monitor unit vent lines and inspect pipe seals.',
          icon: AlertTriangle,
        };
      case 'WARNING':
        return {
          bg: 'bg-orange-950/40 border-orange-500/40 text-[#ff6b1a]',
          indicator: 'bg-orange-500',
          title: 'WARNING BREACH (15 – 50 ppm·hr)',
          desc: 'Threshold breached! Worker collar node and supervisor dashboard alerted. Initiate ventilation.',
          icon: AlertTriangle,
        };
      case 'DANGER':
      default:
        return {
          bg: 'bg-red-950/50 border-red-500/60 text-red-400',
          indicator: 'bg-red-500 animate-pulse',
          title: 'CRITICAL DANGER (> 50 ppm·hr)',
          desc: 'IMMEDIATE EVACUATION REQUIRED! Acute toxic concentration. Continuous hardware buzzer & alarm engaged.',
          icon: ShieldAlert,
        };
    }
  };

  const badge = getSafetyBadge();
  const BadgeIcon = badge.icon;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Demo / Simulated Banner (Section 4 Requirement) */}
      {isSimulated && (
        <div className="mb-6 p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 flex items-center justify-between gap-3 text-amber-300 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>DEMO / SIMULATED RESULT:</strong> This scan was generated using synthetic optical reference data for demonstration purposes.
            </span>
          </div>
          <span className="bg-amber-500/20 px-2 py-0.5 rounded text-[11px] font-bold text-amber-300">
            SIMULATED
          </span>
        </div>
      )}

      {/* Main Exposure Metric Hero Card */}
      <div
        className={`glass-panel p-6 sm:p-8 rounded-2xl border ${
          result.safetyLevel === 'DANGER'
            ? 'border-red-500/60 shadow-2xl shadow-red-500/20'
            : result.safetyLevel === 'WARNING'
            ? 'border-orange-500/50 shadow-2xl shadow-orange-500/15'
            : 'border-slate-800'
        } mb-6`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-slate-400">ESTIMATED CUMULATIVE H₂S EXPOSURE</span>
              <span className="text-slate-600">·</span>
              <span className="text-xs font-mono text-cyan-400 font-semibold">{result.status}</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-5xl sm:text-6xl font-black text-white tracking-tight tabular-nums">
                {result.exposurePpmHr.toFixed(2)}
              </span>
              <span className="font-heading text-xl sm:text-2xl text-slate-400 font-bold">ppm·hr</span>
            </div>
          </div>

          {/* Safety Status Pill */}
          <div className={`p-4 rounded-xl border ${badge.bg} flex items-start gap-3 max-w-sm`}>
            <BadgeIcon className="w-6 h-6 shrink-0 mt-0.5" />
            <div>
              <span className="font-heading font-bold text-sm block tracking-wider">{badge.title}</span>
              <p className="text-xs opacity-90 mt-0.5 leading-snug">{badge.desc}</p>
            </div>
          </div>
        </div>

        {/* Environmental & Optical Colorimetry Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {/* Delta-E CIEDE2000 */}
          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 block mb-1">ΔE₀₀ (CIEDE2000)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-[#00e5ff] tabular-nums">
                {result.deltaE.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">D65 Ref</span>
            </div>
          </div>

          {/* Strip Chemistry Type */}
          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 block mb-1">Strip Chemistry</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Layers className="w-4 h-4 text-[#ff6b1a]" />
              <span className="text-base font-bold font-heading text-white">{result.stripType} STRIP</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
              {result.stripType === 'FAST' ? '0.1 - 10 ppm·hr' : '5 - 120 ppm·hr'}
            </span>
          </div>

          {/* Ambient Temperature */}
          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 block mb-1">Ambient Temperature</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Thermometer className="w-4 h-4 text-orange-400" />
              <span className="text-base font-bold font-mono text-white tabular-nums">
                {result.temperatureC.toFixed(1)}°C
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Arrhenius Normalized</span>
          </div>

          {/* Relative Humidity */}
          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 block mb-1">Relative Humidity</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Droplets className="w-4 h-4 text-cyan-400" />
              <span className="text-base font-bold font-mono text-white tabular-nums">
                {result.humidityPct.toFixed(1)}%
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Hydration Corrected</span>
          </div>
        </div>

        {/* Detailed Color Space Breakdown */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 mb-6">
          <span className="text-xs font-mono text-slate-400 block mb-3 uppercase tracking-wider">
            OPTICAL CHROMATICITY TRISTIMULUS METRICS
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* RGB with visual color swatch */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg border border-white/20 shadow-md shrink-0"
                style={{
                  backgroundColor: `rgb(${result.rgb.r}, ${result.rgb.g}, ${result.rgb.b})`,
                }}
              />
              <div>
                <span className="text-[11px] font-mono text-slate-400 block">sRGB Color</span>
                <span className="text-xs font-mono text-white">
                  R:{result.rgb.r} G:{result.rgb.g} B:{result.rgb.b}
                </span>
              </div>
            </div>

            {/* HSV */}
            <div>
              <span className="text-[11px] font-mono text-slate-400 block">HSV Color Space</span>
              <span className="text-xs font-mono text-slate-200">
                H:{result.hsv.h}° S:{result.hsv.s}% V:{result.hsv.v}%
              </span>
            </div>

            {/* CIELAB */}
            <div>
              <span className="text-[11px] font-mono text-slate-400 block">CIE L*a*b* (D65)</span>
              <span className="text-xs font-mono text-slate-200">
                L*:{result.lab.L} a*:{result.lab.a} b*:{result.lab.b}
              </span>
            </div>
          </div>
        </div>

        {/* Metadata Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-500 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Timestamp: {new Date(result.timestamp).toLocaleString()}</span>
          </div>
          <div>
            <span>Model: {result.calibrationModel} ({result.calibrationVersion})</span>
          </div>
          {saved && (
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CloudCheck className="w-4 h-4" />
              <span>Synced to Firebase Firestore & RTDB</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons: [SAVE RESULT], [VIEW GRAPH], [SCAN AGAIN], [GENERATE REPORT] */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saved}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-heading font-bold text-sm tracking-wider transition-all ${
            saved
              ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 cursor-default'
              : 'bg-[#ff6b1a] hover:bg-[#e0560a] text-white shadow-lg shadow-orange-500/20 active:scale-95'
          }`}
        >
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{saved ? 'RESULT SAVED & SYNCED' : 'SAVE RESULT'}</span>
        </button>

        <button
          type="button"
          onClick={onViewGraph}
          className="flex items-center justify-center gap-2 py-3 px-5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-400 font-heading font-bold text-sm tracking-wider transition-all active:scale-95"
        >
          <BarChart3 className="w-4 h-4" />
          <span>VIEW GRAPH</span>
        </button>

        <button
          type="button"
          onClick={() => onGenerateReport(result)}
          className="flex items-center justify-center gap-2 py-3 px-5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-heading font-semibold text-sm tracking-wider transition-all active:scale-95"
        >
          <FileText className="w-4 h-4" />
          <span>GENERATE REPORT</span>
        </button>

        <button
          type="button"
          onClick={onScanAgain}
          className="flex items-center justify-center gap-2 py-3 px-5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-heading font-semibold text-sm tracking-wider transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          <span>SCAN AGAIN</span>
        </button>
      </div>
    </div>
  );
};
