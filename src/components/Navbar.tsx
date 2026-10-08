import React from 'react';
import {
  Camera,
  LayoutDashboard,
  History,
  AlertTriangle,
  Database,
  Cpu,
  FlaskConical,
  CheckCircle2,
  Radio,
  Flame,
} from 'lucide-react';
import logoImg from '../assets/images/spiderzen_safety_icon_1790929102788.jpg';
import { WorkerProfile, ESP32Device } from '../types';

export type PageId =
  | 'home'
  | 'scanner'
  | 'result'
  | 'dashboard'
  | 'history'
  | 'alerts'
  | 'dataset'
  | 'calibration'
  | 'esp32';

interface NavbarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  workers: WorkerProfile[];
  activeWorkerId: string;
  onSelectWorker: (workerId: string) => void;
  devices: ESP32Device[];
  alertCount: number;
  onOpenUnitTests: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  workers,
  activeWorkerId,
  onSelectWorker,
  devices,
  alertCount,
  onOpenUnitTests,
}) => {
  const activeWorker = workers.find((w) => w.id === activeWorkerId) || workers[0];
  const onlineDevicesCount = devices.filter((d) => d.online).length;

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0a0e1a]/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div
          onClick={() => onNavigate('home')}
          className="cursor-pointer flex items-center gap-2.5 select-none group"
        >
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-orange-500/40 bg-slate-900 shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform flex items-center justify-center relative">
            <img
              src={logoImg}
              alt="SpiderZen Logo"
              className="w-full h-full object-cover"
              loading="eager"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <Flame className="w-4 h-4 text-[#ff6b1a] absolute" />
          </div>
          <span className="font-brand font-bold text-xl tracking-wider text-white">
            SPIDER<span className="text-[#ff6b1a]">ZEN</span>
          </span>
          <span className="hidden lg:inline text-xs font-mono text-cyan-400/80 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
            H₂S DOSIMETER
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-300">
          <button
            onClick={() => onNavigate('scanner')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              currentPage === 'scanner'
                ? 'text-[#ff6b1a] bg-[#ff6b1a]/10 font-semibold'
                : 'hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Scanner</span>
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              currentPage === 'dashboard'
                ? 'text-[#00e5ff] bg-cyan-950/40 font-semibold'
                : 'hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onNavigate('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              currentPage === 'history'
                ? 'text-[#ff6b1a] bg-[#ff6b1a]/10 font-semibold'
                : 'hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </button>

          <button
            onClick={() => onNavigate('alerts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors relative ${
              currentPage === 'alerts'
                ? 'text-red-400 bg-red-950/40 font-semibold'
                : 'hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <span>Alerts</span>
            {alertCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => onNavigate('dataset')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              currentPage === 'dataset'
                ? 'text-cyan-400 bg-cyan-950/40 font-semibold'
                : 'hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Dataset</span>
          </button>

          <button
            onClick={() => onNavigate('calibration')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              currentPage === 'calibration'
                ? 'text-cyan-400 bg-cyan-950/40 font-semibold'
                : 'hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            <span>Calibration</span>
          </button>

          <button
            onClick={() => onNavigate('esp32')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              currentPage === 'esp32'
                ? 'text-[#ff6b1a] bg-[#ff6b1a]/10 font-semibold'
                : 'hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>ESP32 Node</span>
            <span
              className={`w-2 h-2 rounded-full ${
                onlineDevicesCount > 0 ? 'bg-emerald-400' : 'bg-slate-600'
              }`}
            />
          </button>
        </nav>

        {/* Zone 3: Actions & Worker Selector */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Unit tests trigger */}
          <button
            onClick={onOpenUnitTests}
            title="Run SpiderZen Unit Tests (CIEDE2000, Colorimetry, AI)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-xs font-mono text-slate-300 hover:text-white transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Self-Tests</span>
          </button>

          {/* Active worker selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-700 rounded px-2.5 py-1 text-xs">
            <span className="text-slate-400 hidden sm:inline">Worker:</span>
            <select
              value={activeWorkerId}
              onChange={(e) => onSelectWorker(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              {workers.map((w) => (
                <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                  {w.name} ({w.id})
                </option>
              ))}
            </select>
            <span
              className={`w-2 h-2 rounded-full ${
                activeWorker.safetyLevel === 'SAFE'
                  ? 'bg-emerald-400'
                  : activeWorker.safetyLevel === 'CAUTION'
                  ? 'bg-amber-400'
                  : activeWorker.safetyLevel === 'WARNING'
                  ? 'bg-orange-500'
                  : 'bg-red-500 animate-pulse'
              }`}
              title={`Status: ${activeWorker.safetyLevel}`}
            />
          </div>

          {/* Primary Quick Scan CTA */}
          <button
            onClick={() => onNavigate('scanner')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#ff6b1a] hover:bg-[#e0560a] text-white text-xs font-semibold tracking-wide transition-all shadow-lg shadow-orange-500/20 active:scale-95"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">SCAN</span>
          </button>
        </div>
      </div>

      {/* Mobile sub-navigation bar */}
      <div className="md:hidden flex items-center justify-around py-2 px-2 bg-slate-950/80 border-t border-slate-800 text-xs">
        <button
          onClick={() => onNavigate('scanner')}
          className={`flex flex-col items-center gap-0.5 ${currentPage === 'scanner' ? 'text-[#ff6b1a]' : 'text-slate-400'}`}
        >
          <Camera className="w-4 h-4" />
          <span>Scan</span>
        </button>
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center gap-0.5 ${currentPage === 'dashboard' ? 'text-[#00e5ff]' : 'text-slate-400'}`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => onNavigate('history')}
          className={`flex flex-col items-center gap-0.5 ${currentPage === 'history' ? 'text-[#ff6b1a]' : 'text-slate-400'}`}
        >
          <History className="w-4 h-4" />
          <span>History</span>
        </button>
        <button
          onClick={() => onNavigate('alerts')}
          className={`flex flex-col items-center gap-0.5 ${currentPage === 'alerts' ? 'text-red-400' : 'text-slate-400'}`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Alerts</span>
        </button>
        <button
          onClick={() => onNavigate('esp32')}
          className={`flex flex-col items-center gap-0.5 ${currentPage === 'esp32' ? 'text-[#ff6b1a]' : 'text-slate-400'}`}
        >
          <Cpu className="w-4 h-4" />
          <span>ESP32</span>
        </button>
        <button
          onClick={() => onNavigate('calibration')}
          className={`flex flex-col items-center gap-0.5 ${currentPage === 'calibration' ? 'text-cyan-400' : 'text-slate-400'}`}
        >
          <FlaskConical className="w-4 h-4" />
          <span>Model</span>
        </button>
      </div>
    </header>
  );
};
