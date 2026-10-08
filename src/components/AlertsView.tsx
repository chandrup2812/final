import React from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Cpu,
  Clock,
  Volume2,
  Radio,
  FileCheck,
} from 'lucide-react';
import { SafetyAlert } from '../types';

interface AlertsViewProps {
  alerts: SafetyAlert[];
  onResolveAlert: (alertId: string) => void;
  onTestSoundAlert: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  onResolveAlert,
  onTestSoundAlert,
}) => {
  const unresolvedCount = alerts.filter((a) => !a.resolved).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>INCIDENT AUDIT LOG</span>
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs font-mono text-cyan-400">HARDWARE INTERLOCK AUDIT</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-wide">
            Safety Warning & Breach Logs
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onTestSoundAlert}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-orange-400 text-xs font-mono transition-colors"
          >
            <Volume2 className="w-4 h-4" />
            <span>Test Alarm Siren</span>
          </button>

          <div className="bg-red-950/40 border border-red-800/40 px-3.5 py-1.5 rounded-lg text-xs font-mono text-red-300">
            <span>{unresolvedCount} Active Breaches</span>
          </div>
        </div>
      </div>

      {/* Breach Incident Cards */}
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 text-slate-400">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h4 className="font-heading font-bold text-lg text-white mb-1">All Clear — Zero Active Breaches</h4>
            <p className="text-xs max-w-md mx-auto">
              No personnel exposure thresholds have been breached. Routine scans remain within safe workplace bounds.
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const isDanger = alert.level === 'DANGER';

            return (
              <div
                key={alert.id}
                className={`glass-panel p-5 rounded-xl border ${
                  isDanger
                    ? 'border-red-500/60 bg-red-950/20'
                    : 'border-orange-500/50 bg-orange-950/15'
                } transition-all`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isDanger ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-[#ff6b1a]'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">{alert.id}</span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            isDanger
                              ? 'text-red-400 border-red-500/40 bg-red-950/60'
                              : 'text-[#ff6b1a] border-orange-500/40 bg-orange-950/60'
                          }`}
                        >
                          {alert.level} BREACH
                        </span>
                        {alert.resolved && (
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded">
                            RESOLVED
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-300 font-heading font-semibold">
                        {alert.workerName} ({alert.workerId})
                      </span>
                    </div>
                  </div>

                  {/* Exposure Value Metric */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-mono text-slate-400">Peak Exposure:</span>
                    <span className="font-mono text-2xl font-black text-white tabular-nums">
                      {alert.exposurePpmHr.toFixed(1)}
                    </span>
                    <span className="text-xs font-mono text-slate-400">ppm·hr</span>
                    <span className="text-[11px] font-mono text-slate-500">
                      (Limit: {alert.thresholdBreached} ppm·hr)
                    </span>
                  </div>
                </div>

                {/* Details Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-slate-400 bg-slate-950/60 p-3 rounded-lg mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Time: {new Date(alert.timestamp).toLocaleString()}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Target Node: {alert.deviceId || 'Wristband'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">
                      {alert.esp32TriggerConfirmed ? 'ESP32 RTDB Trigger Confirmed' : 'Trigger Pending'}
                    </span>
                  </div>
                </div>

                {/* Notes & Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                  <p className="text-xs text-slate-400 font-sans">
                    {alert.notes || 'Automated dosimeter optical threshold trigger.'}
                  </p>

                  {!alert.resolved ? (
                    <button
                      onClick={() => onResolveAlert(alert.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-mono border border-slate-700 transition-colors"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Acknowledge & Clear</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-mono text-slate-500">
                      Acknowledged by Shift Safety Officer
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
