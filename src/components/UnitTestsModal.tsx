import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  X,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { runSpiderZenUnitTests, TestSuiteSummary } from '../lib/unitTests';

interface UnitTestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UnitTestsModal: React.FC<UnitTestsModalProps> = ({ isOpen, onClose }) => {
  const [summary, setSummary] = useState<TestSuiteSummary | null>(null);
  const [running, setRunning] = useState<boolean>(false);

  const executeTests = () => {
    setRunning(true);
    setTimeout(() => {
      const res = runSpiderZenUnitTests();
      setSummary(res);
      setRunning(false);
    }, 150);
  };

  useEffect(() => {
    if (isOpen && !summary) {
      executeTests();
    }
  }, [isOpen, summary]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel p-6 rounded-2xl border border-slate-700 max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-heading font-bold text-lg text-white tracking-wide">
                SpiderZen Automated Test Suite
              </h3>
              <p className="text-xs font-mono text-slate-400">
                CIEDE2000 · Colorimetry · Quality Gates · AI Estimator
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary Banner */}
        {summary && (
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 mb-4 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                {summary.passed} Passed
              </span>
              {summary.failed > 0 && (
                <span className="text-red-400 font-bold flex items-center gap-1">
                  <XCircle className="w-4 h-4" />
                  {summary.failed} Failed
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{summary.durationMs}ms</span>
            </div>
          </div>
        )}

        {/* Tests List */}
        <div className="overflow-y-auto flex-1 space-y-2.5 pr-1 text-xs font-mono">
          {summary?.results.map((r, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${
                r.passed
                  ? 'border-emerald-500/30 bg-emerald-950/15'
                  : 'border-red-500/40 bg-red-950/20'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  {r.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span className="text-white font-semibold">{r.name}</span>
                </div>
                <span className="text-[10px] text-slate-500">{r.durationMs}ms</span>
              </div>

              <div className="pl-6 text-[11px] space-y-0.5 text-slate-400">
                <div>
                  <span className="text-slate-500">Expected: </span>
                  <span className="text-slate-300">{r.expected}</span>
                </div>
                <div>
                  <span className="text-slate-500">Actual: </span>
                  <span className="text-cyan-300 font-semibold">{r.actual}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800">
          <span className="text-[11px] font-mono text-slate-500">
            Validated against ASTM D2244 & CIE 142-2001
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={executeTests}
              disabled={running}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono transition-colors"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
              <span>Re-run Tests</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[#ff6b1a] hover:bg-[#e0560a] text-white text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
