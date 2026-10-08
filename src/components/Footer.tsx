import React from 'react';
import { ShieldAlert, Cpu, Radio, ShieldCheck, Flame } from 'lucide-react';
import appIconImg from '../assets/images/spiderzen_app_icon_1790869694292.jpg';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#070a13] border-t border-slate-800/80 py-8 px-4 sm:px-6 mt-16 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand & Version */}
        <div className="flex flex-col gap-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <div className="w-5 h-5 rounded overflow-hidden border border-orange-500/40 bg-slate-900 shrink-0 relative flex items-center justify-center">
              <img
                src={appIconImg}
                alt="SpiderZen Icon"
                className="w-full h-full object-cover"
                loading="eager"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <Flame className="w-3 h-3 text-[#ff6b1a] absolute" />
            </div>
            <span className="font-brand font-bold text-white text-sm tracking-wider">
              SPIDER<span className="text-[#ff6b1a]">ZEN</span>
            </span>
            <span className="text-slate-600">·</span>
            <span className="font-mono text-cyan-400 text-[11px]">v2.4 IoT Pipeline</span>
          </div>
          <p className="text-slate-500 max-w-md">
            Passive colorimetric H₂S dosimeter with CIEDE2000 machine learning estimation,
            Firebase RTDB cloud synchronization, and ESP32 active collar/wristband hardware alerts.
          </p>
        </div>

        {/* Mandatory Industrial Safety Disclaimer */}
        <div className="flex items-start gap-3 bg-amber-950/20 border border-amber-800/30 rounded-lg p-3 max-w-xl">
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-amber-200/90 text-xs leading-relaxed font-sans">
            <strong className="text-amber-400 font-semibold">SAFETY NOTICE:</strong> SpiderZen is a prototype
            exposure-estimation system. It does not replace certified workplace gas detectors, fixed point
            electrochemical sensors, or approved personal protective equipment (PPE).
          </p>
        </div>

        {/* Technical Specs Checklist */}
        <div className="flex flex-col items-center md:items-end gap-1 font-mono text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>CIEDE2000 ΔE₀₀ Optical Engine</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#ff6b1a]" />
            <span>ESP32 RTDB Listener (30s Telemetry)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>OSHA / NIOSH PEL Reference Bounds</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
