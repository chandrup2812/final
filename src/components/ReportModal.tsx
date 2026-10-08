import React from 'react';
import { Printer, Download, X, ShieldAlert, CheckCircle2, FileText } from 'lucide-react';
import { ScanResult } from '../types';

interface ReportModalProps {
  scan: ScanResult | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ scan, isOpen, onClose }) => {
  if (!isOpen || !scan) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-700 max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col bg-[#0b101d]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#ff6b1a]" />
            <h3 className="font-heading font-bold text-lg text-white tracking-wide">
              Official Dosimeter Exposure Certificate
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff6b1a] hover:bg-[#e0560a] text-white text-xs font-semibold"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Certificate Sheet */}
        <div className="overflow-y-auto flex-1 p-6 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-6">
          {/* Header Block */}
          <div className="border-b border-slate-800 pb-4 flex items-start justify-between">
            <div>
              <span className="font-brand font-bold text-lg tracking-wider text-white">
                SPIDER<span className="text-[#ff6b1a]">ZEN</span>
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Refinery Industrial Hygiene & Occupational Safety Division
              </span>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              <div>Certificate ID: <strong className="text-white">{scan.id}</strong></div>
              <div>Date: {new Date(scan.timestamp).toLocaleDateString()}</div>
            </div>
          </div>

          {/* Personnel & Device Record */}
          <div className="grid grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-lg border border-slate-800">
            <div>
              <span className="text-slate-500 block text-[10px]">MONITORED WORKER</span>
              <span className="text-sm font-bold text-white block mt-0.5">{scan.workerName}</span>
              <span className="text-[11px] text-cyan-400 font-mono">Employee ID: {scan.workerId}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">IOT WEARABLE NODE</span>
              <span className="text-sm font-bold text-white block mt-0.5">{scan.deviceId || 'Wristband Standalone'}</span>
              <span className="text-[11px] text-slate-400">RTDB Stream Verified</span>
            </div>
          </div>

          {/* Core Measurement Metric */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 text-center">
            <span className="text-[11px] text-slate-400 block mb-1 uppercase tracking-wider">
              Cumulative Shift Hydrogen Sulfide (H₂S) Exposure
            </span>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-5xl font-black text-white font-mono tabular-nums">
                {scan.exposurePpmHr.toFixed(2)}
              </span>
              <span className="text-xl text-slate-400 font-bold">ppm·hr</span>
            </div>
            <div className="mt-2 inline-block px-3 py-1 rounded text-xs font-bold border border-current" style={{
              color: scan.safetyLevel === 'SAFE' ? '#10b981' : scan.safetyLevel === 'CAUTION' ? '#f59e0b' : scan.safetyLevel === 'WARNING' ? '#ff6b1a' : '#ef4444'
            }}>
              STATUS: {scan.safetyLevel} (Permissible Limit Compliance)
            </div>
          </div>

          {/* Optical & Physical Parameters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block">CIEDE2000 ΔE₀₀</span>
              <span className="text-white font-bold text-sm">{scan.deltaE.toFixed(2)}</span>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block">CHEMISTRY TYPE</span>
              <span className="text-white font-bold text-sm">{scan.stripType} STRIP</span>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block">TEMPERATURE</span>
              <span className="text-white font-bold text-sm">{scan.temperatureC.toFixed(1)}°C</span>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block">HUMIDITY</span>
              <span className="text-white font-bold text-sm">{scan.humidityPct.toFixed(0)}%</span>
            </div>
          </div>

          {/* Validation Notice */}
          <div className="border-t border-slate-800 pt-4 text-[10px] text-slate-500 space-y-1">
            <p>
              <strong>CALIBRATION RUNTIME:</strong> {scan.calibrationModel} ({scan.calibrationVersion})
            </p>
            <p>
              <strong>DISCLAIMER:</strong> SpiderZen is an auxiliary screening dosimeter. Values are derived from colorimetric reflectance against laboratory calibration curves.
            </p>
          </div>

          {/* Signoff Line */}
          <div className="pt-6 flex justify-between items-end text-[11px] text-slate-400">
            <div>
              <div className="w-44 border-b border-slate-700 mb-1" />
              <span>Shift Safety Officer Signature</span>
            </div>
            <div>
              <div className="w-36 border-b border-slate-700 mb-1" />
              <span>Inspection Date</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
