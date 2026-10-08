import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { Navbar, PageId } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { ScannerView } from './components/ScannerView';
import { ResultView } from './components/ResultView';
import { DashboardView } from './components/DashboardView';
import { HistoryView } from './components/HistoryView';
import { AlertsView } from './components/AlertsView';
import { DatasetView } from './components/DatasetView';
import { CalibrationView } from './components/CalibrationView';
import { ESP32View } from './components/ESP32View';
import { UnitTestsModal } from './components/UnitTestsModal';
import { ReportModal } from './components/ReportModal';
import { spiderZenStore } from './lib/spiderZenStore';
import { CalibrationDatasetRow, CalibrationMetrics, ScanResult, ThresholdConfig } from './types';
import { REFERENCE_CALIBRATION_DATA } from './lib/aiEstimator';
import { CloudCheck, CheckCircle2, AlertTriangle, ShieldAlert, Zap, Usb, Cpu } from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('home');
  const [activeWorkerId, setActiveWorkerId] = useState<string>('WKR-101');
  const [currentScanResult, setCurrentScanResult] = useState<ScanResult | null>(null);
  const [reportScan, setReportScan] = useState<ScanResult | null>(null);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isUnitTestsOpen, setIsUnitTestsOpen] = useState<boolean>(false);
  const [activeDataset, setActiveDataset] = useState<CalibrationDatasetRow[]>(REFERENCE_CALIBRATION_DATA);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'sync' | 'alert' | 'success' } | null>(null);

  // Sync with store state
  const storeVersion = useSyncExternalStore(
    (onStoreChange) => spiderZenStore.subscribe(onStoreChange),
    () => spiderZenStore.getScans().length + spiderZenStore.getAlerts().length
  );

  const scans = spiderZenStore.getScans();
  const workers = spiderZenStore.getWorkers();
  const devices = spiderZenStore.getDevices();
  const alerts = spiderZenStore.getAlerts();
  const thresholds = spiderZenStore.getThresholds();

  const activeWorker = workers.find((w) => w.id === activeWorkerId) || workers[0];
  const onlineDevicesCount = devices.filter((d) => d.online).length;

  const showToast = (text: string, type: 'sync' | 'alert' | 'success' = 'sync') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleScanComplete = (result: ScanResult) => {
    setCurrentScanResult(result);
    setCurrentPage('result');
  };

  const handleSaveResult = (result: ScanResult) => {
    spiderZenStore.recordScan(result);
    showToast(
      `Saved & Auto-Synced: ${result.exposurePpmHr.toFixed(1)} ppm·hr (${result.safetyLevel}) to Firebase Firestore & RTDB.`,
      result.safetyLevel === 'DANGER' || result.safetyLevel === 'WARNING' ? 'alert' : 'sync'
    );
  };

  const handleStartDemo = () => {
    setCurrentPage('scanner');
  };

  const handleExportCsv = () => {
    const csvData = spiderZenStore.exportScansCsv();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `spiderzen_exposure_scans_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported scan history audit CSV successfully.', 'success');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e1a] text-slate-100">
      {/* Top Bar Navigation */}
      <Navbar
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage(page)}
        workers={workers}
        activeWorkerId={activeWorkerId}
        onSelectWorker={(id) => setActiveWorkerId(id)}
        devices={devices}
        alertCount={alerts.filter((a) => !a.resolved).length}
        onOpenUnitTests={() => setIsUnitTestsOpen(true)}
      />

      {/* Quick ESP32 Hardware Connectivity Strip */}
      <div className="w-full bg-[#070b14]/95 border-b border-slate-800/80 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                onlineDevicesCount > 0
                  ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]'
                  : 'bg-slate-500'
              }`}
            />
            <span className="text-slate-400 font-semibold">ESP32 STATUS:</span>
            <span className={onlineDevicesCount > 0 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
              {onlineDevicesCount > 0 ? `${onlineDevicesCount} Node(s) Online` : 'Hardware Disconnected'}
            </span>
          </div>
          {onlineDevicesCount > 0 && (
            <span className="hidden md:inline text-[10px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
              Live Sensor Telemetry Streaming
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage('esp32')}
            className="px-3 py-1 rounded-lg bg-[#ff6b1a]/20 hover:bg-[#ff6b1a]/30 text-[#ff6b1a] border border-orange-500/40 flex items-center gap-1.5 transition-colors font-bold text-xs"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Connect ESP32 (Easy 1-Click USB / WiFi)</span>
          </button>
        </div>
      </div>

      {/* Cloud Sync & Hardware Alert Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up max-w-md">
          <div
            className={`p-4 rounded-xl border shadow-2xl flex items-start gap-3 backdrop-blur-md ${
              toastMessage.type === 'alert'
                ? 'bg-orange-950/90 border-orange-500/80 text-orange-200'
                : toastMessage.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-200'
                : 'bg-slate-900/90 border-cyan-500/60 text-cyan-200'
            }`}
          >
            {toastMessage.type === 'alert' ? (
              <AlertTriangle className="w-5 h-5 text-[#ff6b1a] shrink-0 mt-0.5 animate-bounce" />
            ) : toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <CloudCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
            )}
            <div className="text-xs font-mono">
              <strong className="block text-white font-semibold mb-0.5">
                {toastMessage.type === 'alert'
                  ? 'CRITICAL RTDB SAFETY TRIGGER'
                  : 'FIREBASE CLOUD SYNCHRONIZATION'}
              </strong>
              <span>{toastMessage.text}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Page View Routing */}
      <main className="flex-1 w-full">
        {currentPage === 'home' && (
          <HomeView
            onScanClick={() => setCurrentPage('scanner')}
            onDashboardClick={() => setCurrentPage('dashboard')}
            onStartDemo={handleStartDemo}
            workers={workers}
            devices={devices}
            alerts={alerts}
          />
        )}

        {currentPage === 'scanner' && (
          <ScannerView
            activeWorker={activeWorker}
            onScanComplete={handleScanComplete}
          />
        )}

        {currentPage === 'result' && currentScanResult && (
          <ResultView
            result={currentScanResult}
            onSaveResult={handleSaveResult}
            onScanAgain={() => setCurrentPage('scanner')}
            onViewGraph={() => setCurrentPage('dashboard')}
            onGenerateReport={(scan) => {
              setReportScan(scan);
              setIsReportOpen(true);
            }}
          />
        )}

        {currentPage === 'dashboard' && (
          <DashboardView
            workers={workers}
            devices={devices}
            scans={scans}
            thresholds={thresholds}
            onUpdateThresholds={(t) => {
              spiderZenStore.updateThresholds(t);
              showToast('Updated plant safety thresholds and re-indexed status levels.', 'success');
            }}
            onExportCsv={handleExportCsv}
            onTriggerTestAlert={(deviceId) => {
              spiderZenStore.triggerHardwareAlert(deviceId, 'WARNING', 18.4, 'Worker Node');
              showToast(`Triggered test alarm on ESP32 Node: ${deviceId}`, 'alert');
            }}
            onSelectWorker={(id) => setActiveWorkerId(id)}
            onScanClick={() => setCurrentPage('scanner')}
          />
        )}

        {currentPage === 'history' && (
          <HistoryView
            scans={scans}
            onSelectScan={(scan) => {
              setCurrentScanResult(scan);
              setCurrentPage('result');
            }}
            onExportCsv={handleExportCsv}
          />
        )}

        {currentPage === 'alerts' && (
          <AlertsView
            alerts={alerts}
            onResolveAlert={(alertId) => {
              spiderZenStore.resolveAlert(alertId);
              showToast('Incident acknowledged and cleared by Safety Officer.', 'success');
            }}
            onTestSoundAlert={() => {
              spiderZenStore.playSyntheticBuzzer('DANGER');
              showToast('Emulating ESP32 Piezo Siren Audio (2800Hz / 1400Hz)...', 'alert');
            }}
          />
        )}

        {currentPage === 'dataset' && (
          <DatasetView
            onDatasetLoaded={(ds) => {
              setActiveDataset(ds);
              showToast(`Loaded ${ds.length} test chamber calibration points.`, 'success');
            }}
            onNavigateToCalibration={() => setCurrentPage('calibration')}
          />
        )}

        {currentPage === 'calibration' && (
          <CalibrationView
            dataset={activeDataset}
            onCalibrationUpdated={(m) => {
              showToast(`AI Calibration retrained successfully! 5-Fold R²: ${m.r2.toFixed(4)}, MAE: ${m.mae} ppm·hr.`, 'success');
            }}
          />
        )}

        {currentPage === 'esp32' && (
          <ESP32View
            devices={devices}
            workers={workers}
            onPairDevice={(id, name, workerId, wifi) => {
              spiderZenStore.registerOrPairDevice(id, name, workerId, wifi);
              showToast(`Paired ESP32 node ${id} to mesh network!`, 'success');
            }}
            onTriggerAlert={(id, level) => {
              spiderZenStore.triggerHardwareAlert(id, level, level === 'DANGER' ? 62.0 : 24.5, 'Worker');
              showToast(`Fired ${level} alert to /devices/${id}/alert on RTDB`, 'alert');
            }}
            onClearAlert={(id) => {
              spiderZenStore.clearDeviceAlert(id);
              showToast(`Cleared hardware actuators on node ${id}`, 'success');
            }}
            onTestSound={(level) => {
              spiderZenStore.playSyntheticBuzzer(level);
            }}
          />
        )}
      </main>

      {/* Modals */}
      <UnitTestsModal
        isOpen={isUnitTestsOpen}
        onClose={() => setIsUnitTestsOpen(false)}
      />

      <ReportModal
        scan={reportScan}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />

      {/* Permanent Industrial Safety Disclaimer Footer */}
      <Footer />
    </div>
  );
}
