import React, { useState } from 'react';
import {
  Download,
  Filter,
  Search,
  Eye,
  Calendar,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { ScanResult, SafetyLevel } from '../types';

interface HistoryViewProps {
  scans: ScanResult[];
  onSelectScan: (scan: ScanResult) => void;
  onExportCsv: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  scans,
  onSelectScan,
  onExportCsv,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [safetyFilter, setSafetyFilter] = useState<string>('ALL');
  const [stripFilter, setStripFilter] = useState<string>('ALL');

  const filteredScans = scans.filter((s) => {
    const matchesSearch =
      s.workerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.workerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSafety = safetyFilter === 'ALL' || s.safetyLevel === safetyFilter;
    const matchesStrip = stripFilter === 'ALL' || s.stripType === stripFilter;

    return matchesSearch && matchesSafety && matchesStrip;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-[#ff6b1a] uppercase tracking-wider">DOSIMETER ARCHIVE</span>
            <span className="text-slate-600">·</span>
            <span className="text-xs font-mono text-cyan-400">AUDIT COMPLIANCE RECORD</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-wide">
            Exposure Scan History
          </h2>
        </div>

        <button
          onClick={onExportCsv}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Export Full CSV Audit</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by worker name, ID, or scan ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Safety Level Filter */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Severity:</span>
          <select
            value={safetyFilter}
            onChange={(e) => setSafetyFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="SAFE">SAFE (&lt;5 ppm·hr)</option>
            <option value="CAUTION">CAUTION (5-15 ppm·hr)</option>
            <option value="WARNING">WARNING (15-50 ppm·hr)</option>
            <option value="DANGER">DANGER (&gt;50 ppm·hr)</option>
          </select>
        </div>

        {/* Strip Type Filter */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Strip:</span>
          <select
            value={stripFilter}
            onChange={(e) => setStripFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Strips</option>
            <option value="FAST">FAST (Sensitive)</option>
            <option value="SLOW">SLOW (Wide-Range)</option>
          </select>
        </div>
      </div>

      {/* Scans List Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">SCAN ID</th>
                <th className="py-3.5 px-4 font-semibold">WORKER DETAILS</th>
                <th className="py-3.5 px-4 font-semibold">EXPOSURE (PPM·HR)</th>
                <th className="py-3.5 px-4 font-semibold">SEVERITY</th>
                <th className="py-3.5 px-4 font-semibold">ΔE₀₀ (CIEDE)</th>
                <th className="py-3.5 px-4 font-semibold">STRIP</th>
                <th className="py-3.5 px-4 font-semibold">ENVIRONMENT</th>
                <th className="py-3.5 px-4 font-semibold">TIMESTAMP</th>
                <th className="py-3.5 px-4 font-semibold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredScans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-sans">
                    No matching scan records found.
                  </td>
                </tr>
              ) : (
                filteredScans.map((scan) => {
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
                        <div className="font-semibold">{scan.workerName}</div>
                        <div className="text-[10px] text-slate-400">{scan.workerId} · {scan.deviceId || 'No ESP32'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-base font-bold tabular-nums ${levelColor}`}>
                          {scan.exposurePpmHr.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">ppm·hr</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border border-current ${
                            scan.safetyLevel === 'DANGER'
                              ? 'text-red-400 bg-red-950/40'
                              : scan.safetyLevel === 'WARNING'
                              ? 'text-[#ff6b1a] bg-orange-950/40'
                              : scan.safetyLevel === 'CAUTION'
                              ? 'text-amber-400 bg-amber-950/40'
                              : 'text-emerald-400 bg-emerald-950/40'
                          }`}
                        >
                          {scan.safetyLevel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-cyan-300 tabular-nums">
                        {scan.deltaE.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {scan.stripType}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {scan.temperatureC.toFixed(1)}°C / {scan.humidityPct.toFixed(0)}%
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(scan.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onSelectScan(scan)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-white transition-colors text-[11px] inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
