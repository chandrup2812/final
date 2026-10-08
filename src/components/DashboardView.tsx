import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Radio,
  Cpu,
  Download,
  Sliders,
  Bell,
  RefreshCw,
  Plus,
  Volume2,
} from 'lucide-react';
import { ESP32Device, ScanResult, ThresholdConfig, WorkerProfile } from '../types';

interface DashboardViewProps {
  workers: WorkerProfile[];
  devices: ESP32Device[];
  scans: ScanResult[];
  thresholds: ThresholdConfig;
  onUpdateThresholds: (thresholds: ThresholdConfig) => void;
  onExportCsv: () => void;
  onTriggerTestAlert: (deviceId: string) => void;
  onSelectWorker: (workerId: string) => void;
  onScanClick: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  workers,
  devices,
  scans,
  thresholds,
  onUpdateThresholds,
  onExportCsv,
  onTriggerTestAlert,
  onSelectWorker,
  onScanClick,
}) => {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('ALL');
  const [showThresholdModal, setShowThresholdModal] = useState<boolean>(false);
  const [tempThresholds, setTempThresholds] = useState<ThresholdConfig>(thresholds);

  // Filter scans by worker if selected
  const filteredScans = selectedWorkerId === 'ALL'
    ? scans
    : scans.filter((s) => s.workerId === selectedWorkerId);

  // Prepare graph points
  const graphPoints = [...filteredScans]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-12);

  const maxVal = Math.max(60, ...graphPoints.map((p) => p.exposurePpmHr));

  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateThresholds(tempThresholds);
    setShowThresholdModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-[#00e5ff] uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>FIREBASE RTDB CLOUD DASHBOARD</span>
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs font-mono text-slate-400">PLANT SECTION 04</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-wide">
            Live Worker H₂S Exposure Overview
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowThresholdModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Threshold Settings</span>
          </button>

          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onScanClick}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ff6b1a] hover:bg-[#e0560a] text-white text-xs font-bold font-heading tracking-wider transition-all shadow-lg shadow-orange-500/20 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>RECORD NEW SCAN</span>
          </button>
        </div>
      </div>

      {/* Threshold Breached Banner if any worker is WARNING or DANGER */}
      {workers.some((w) => w.safetyLevel === 'WARNING' || w.safetyLevel === 'DANGER') && (
        <div className="mb-6 p-4 rounded-xl border border-orange-500/50 bg-orange-950/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-[#ff6b1a]">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-white text-sm tracking-wide">
                ACTIVE WORKER SAFETY THRESHOLD BREACH DETECTED
              </h4>
              <p className="text-xs text-orange-200/80">
                At least one personnel node has surpassed 15 ppm·hr. ESP32 piezo beeper alert engaged.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline font-mono text-xs text-orange-400 bg-orange-950 px-2.5 py-1 rounded border border-orange-800/40">
            AUTO-SYNCED TO RTDB
          </span>
        </div>
      )}

      {/* Worker Status Cards Grid */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
            WORKER EXPOSURE STATUS CARDS
          </h3>
          <span className="text-xs font-mono text-slate-500">
            Thresholds: Safe &lt;{thresholds.safeMax} · Caution {thresholds.safeMax}-{thresholds.cautionMax} · Danger &gt;{thresholds.dangerMin} ppm·hr
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {workers.map((worker) => {
            const isDanger = worker.safetyLevel === 'DANGER';
            const isWarning = worker.safetyLevel === 'WARNING';
            const isCaution = worker.safetyLevel === 'CAUTION';

            const cardBorder = isDanger
              ? 'border-red-500/60 shadow-lg shadow-red-500/10'
              : isWarning
              ? 'border-orange-500/50 shadow-lg shadow-orange-500/10'
              : isCaution
              ? 'border-amber-500/40'
              : 'border-slate-800';

            const statusColor = isDanger
              ? 'text-red-400 bg-red-950/60'
              : isWarning
              ? 'text-[#ff6b1a] bg-orange-950/60'
              : isCaution
              ? 'text-amber-400 bg-amber-950/60'
              : 'text-emerald-400 bg-emerald-950/60';

            return (
              <div
                key={worker.id}
                onClick={() => {
                  setSelectedWorkerId(worker.id);
                  onSelectWorker(worker.id);
                }}
                className={`glass-panel p-4 rounded-xl border ${cardBorder} cursor-pointer hover:border-cyan-500/40 transition-all`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="font-heading font-bold text-white text-base block">{worker.name}</span>
                    <span className="text-[11px] font-mono text-slate-400">{worker.id} · {worker.role}</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-current ${statusColor}`}>
                    {worker.safetyLevel}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-xs text-slate-400">Cumulative Exposure</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-white tabular-nums">
                      {worker.currentExposurePpmHr.toFixed(1)}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">ppm·hr</span>
                  </div>
                </div>

                {/* Progress Exposure Bar */}
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isDanger ? 'bg-red-500' : isWarning ? 'bg-orange-500' : isCaution ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, (worker.currentExposurePpmHr / thresholds.dangerMin) * 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/60">
                  <span>Device: {worker.assignedDeviceId || 'None'}</span>
                  <span>{worker.scansCount} scans</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Middle Section: Live Cumulative Exposure Graph + ESP32 Nodes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Exposure Trend Graph (2 Columns) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="font-heading font-bold text-white text-lg tracking-wide">
                Cumulative Exposure Trend (ppm·hr)
              </h3>
              <p className="text-xs text-slate-400">
                Deterministic CIEDE2000 multi-point shift progression
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setSelectedWorkerId('ALL')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  selectedWorkerId === 'ALL'
                    ? 'bg-[#ff6b1a] text-white font-medium'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Workers
              </button>
              {workers.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setSelectedWorkerId(w.id)}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    selectedWorkerId === w.id
                      ? 'bg-[#ff6b1a] text-white font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {w.id}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Chart */}
          <div className="w-full h-64 sm:h-72 relative">
            {graphPoints.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                No scans recorded for this filter.
              </div>
            ) : (
              <svg className="w-full h-full overflow-visible">
                {/* Horizontal reference bands */}
                {/* Safe zone (< 5) */}
                <line
                  x1="40"
                  y1={240 - (thresholds.safeMax / maxVal) * 200}
                  x2="100%"
                  y2={240 - (thresholds.safeMax / maxVal) * 200}
                  stroke="rgba(16, 185, 129, 0.25)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x="45"
                  y={235 - (thresholds.safeMax / maxVal) * 200}
                  fill="rgba(16, 185, 129, 0.7)"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  Safe Threshold ({thresholds.safeMax} ppm·hr)
                </text>

                {/* Caution/Warning zone (15) */}
                <line
                  x1="40"
                  y1={240 - (thresholds.cautionMax / maxVal) * 200}
                  x2="100%"
                  y2={240 - (thresholds.cautionMax / maxVal) * 200}
                  stroke="rgba(245, 158, 11, 0.3)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x="45"
                  y={235 - (thresholds.cautionMax / maxVal) * 200}
                  fill="rgba(245, 158, 11, 0.8)"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  Warning Limit ({thresholds.cautionMax} ppm·hr)
                </text>

                {/* Danger zone (50) */}
                <line
                  x1="40"
                  y1={240 - (thresholds.dangerMin / maxVal) * 200}
                  x2="100%"
                  y2={240 - (thresholds.dangerMin / maxVal) * 200}
                  stroke="rgba(239, 68, 68, 0.4)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x="45"
                  y={235 - (thresholds.dangerMin / maxVal) * 200}
                  fill="rgba(239, 68, 68, 0.8)"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  Critical Danger ({thresholds.dangerMin} ppm·hr)
                </text>

                {/* Line Path */}
                {graphPoints.length > 1 && (
                  <path
                    d={graphPoints.reduce((acc, pt, idx) => {
                      const x = 50 + (idx / (graphPoints.length - 1)) * 480;
                      const y = 240 - (pt.exposurePpmHr / maxVal) * 200;
                      return `${acc} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }, '')}
                    fill="none"
                    stroke="#ff6b1a"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                )}

                {/* Data Points */}
                {graphPoints.map((pt, idx) => {
                  const x = 50 + (idx / Math.max(1, graphPoints.length - 1)) * 480;
                  const y = 240 - (pt.exposurePpmHr / maxVal) * 200;
                  const color =
                    pt.safetyLevel === 'DANGER'
                      ? '#ef4444'
                      : pt.safetyLevel === 'WARNING'
                      ? '#ff6b1a'
                      : pt.safetyLevel === 'CAUTION'
                      ? '#f59e0b'
                      : '#10b981';

                  return (
                    <g key={pt.id} className="cursor-pointer group">
                      <circle cx={x} cy={y} r="5" fill={color} stroke="#0a0e1a" strokeWidth="2" />
                      <text
                        x={x}
                        y={y - 10}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="10"
                        fontFamily="monospace"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {pt.exposurePpmHr.toFixed(1)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>

        {/* ESP32 Hardware Status Nodes (1 Column) */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#ff6b1a]" />
                <h3 className="font-heading font-bold text-white text-lg tracking-wide">
                  ESP32 IoT Nodes
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                Firebase RTDB
              </span>
            </div>

            <div className="space-y-3.5">
              {devices.map((device) => {
                const isAlertActive = device.alertState.active;

                return (
                  <div
                    key={device.deviceId}
                    className={`p-3.5 rounded-xl border ${
                      isAlertActive
                        ? 'border-orange-500/60 bg-orange-950/20'
                        : 'border-slate-800 bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-xs font-mono font-semibold text-white block">
                          {device.deviceId}
                        </span>
                        <span className="text-[11px] text-slate-400">{device.name}</span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                          device.online
                            ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/40'
                            : 'text-slate-500 bg-slate-800'
                        }`}
                      >
                        {device.online ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </div>

                    {/* Sensor Telemetry */}
                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-300 bg-slate-950/60 p-2 rounded mb-2">
                      <div>
                        <span className="text-slate-500 block text-[9px]">TEMP</span>
                        <span>{device.telemetry.temperatureC}°C</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px]">HUMIDITY</span>
                        <span>{device.telemetry.humidityPct}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px]">MQ GAS</span>
                        <span className={device.telemetry.gasFlag ? 'text-orange-400 font-bold' : ''}>
                          {device.telemetry.gasRaw}
                        </span>
                      </div>
                    </div>

                    {/* Actuator Buzzer / LED Test Button */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-[10px] font-mono text-slate-400">
                        {isAlertActive ? `⚠️ Alert: ${device.alertState.level}` : 'Actuators Idle'}
                      </span>

                      <button
                        onClick={() => onTriggerTestAlert(device.deviceId)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[11px] font-mono transition-colors"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Test Alert</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Sync Interval: 30s</span>
            <span>WiFi + RTDB Stream</span>
          </div>
        </div>
      </div>

      {/* Exposure History Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-heading font-bold text-white text-lg tracking-wide">
            Recent Dosimeter Scans & Audit Trail
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {filteredScans.length} Total Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">SCAN ID</th>
                <th className="py-3 px-4 font-semibold">WORKER</th>
                <th className="py-3 px-4 font-semibold">EXPOSURE</th>
                <th className="py-3 px-4 font-semibold">STATUS</th>
                <th className="py-3 px-4 font-semibold">ΔE₀₀ (CIEDE)</th>
                <th className="py-3 px-4 font-semibold">STRIP</th>
                <th className="py-3 px-4 font-semibold">TEMP/RH</th>
                <th className="py-3 px-4 font-semibold">TIMESTAMP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredScans.slice(0, 8).map((scan) => {
                const levelColor =
                  scan.safetyLevel === 'DANGER'
                    ? 'text-red-400'
                    : scan.safetyLevel === 'WARNING'
                    ? 'text-[#ff6b1a]'
                    : scan.safetyLevel === 'CAUTION'
                    ? 'text-amber-400'
                    : 'text-emerald-400';

                return (
                  <tr key={scan.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 text-cyan-400 font-bold">{scan.id}</td>
                    <td className="py-3 px-4 text-white">
                      <div>{scan.workerName}</div>
                      <div className="text-[10px] text-slate-500">{scan.workerId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-bold text-sm tabular-nums ${levelColor}`}>
                        {scan.exposurePpmHr.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1">ppm·hr</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-900 px-2 py-0.5 rounded text-[10px] text-slate-300 border border-slate-800">
                        {scan.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-cyan-300 tabular-nums">{scan.deltaE.toFixed(2)}</td>
                    <td className="py-3 px-4 text-slate-400">{scan.stripType}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {scan.temperatureC.toFixed(0)}°C / {scan.humidityPct.toFixed(0)}%
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Threshold Configuration Modal */}
      {showThresholdModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-700 max-w-md w-full shadow-2xl">
            <h3 className="font-heading font-bold text-xl text-white mb-2">
              Threshold Configuration
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Customize toxic H₂S exposure limits for plant safety triggers.
            </p>

            <form onSubmit={handleSaveThresholds} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-slate-300 block mb-1">Safe Maximum Limit (ppm·hr)</label>
                <input
                  type="number"
                  step="0.5"
                  value={tempThresholds.safeMax}
                  onChange={(e) => setTempThresholds({ ...tempThresholds, safeMax: parseFloat(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Caution Maximum / Warning Trigger (ppm·hr)</label>
                <input
                  type="number"
                  step="0.5"
                  value={tempThresholds.cautionMax}
                  onChange={(e) => setTempThresholds({ ...tempThresholds, cautionMax: parseFloat(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Critical Danger Level (ppm·hr)</label>
                <input
                  type="number"
                  step="0.5"
                  value={tempThresholds.dangerMin}
                  onChange={(e) => setTempThresholds({ ...tempThresholds, dangerMin: parseFloat(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowThresholdModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#ff6b1a] hover:bg-[#e0560a] text-white font-semibold"
                >
                  Save & Apply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
