import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  SwitchCamera,
  Upload,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Thermometer,
  Droplets,
  Eye,
  Info,
  Power,
  ShieldCheck,
} from 'lucide-react';
import { QualityGateResult, RGBColor, ScanResult, StripType, WorkerProfile } from '../types';
import { deltaE2000, normalizeWithWhitePatch, rgbToHsv, rgbToLab, runQualityGates } from '../lib/colorimetry';
import { estimateExposure, generateSyntheticStripColor } from '../lib/aiEstimator';

interface ScannerViewProps {
  activeWorker: WorkerProfile;
  onScanComplete: (result: ScanResult) => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({ activeWorker, onScanComplete }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraTurnedOffByUser, setCameraTurnedOffByUser] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [stripType, setStripType] = useState<StripType>('FAST');
  const [temperatureC, setTemperatureC] = useState<number>(25.0);
  const [humidityPct, setHumidityPct] = useState<number>(50.0);
  const [qualityGateFailure, setQualityGateFailure] = useState<QualityGateResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastImageSrc, setLastImageSrc] = useState<string | null>(null);

  // Stop camera feed and release media tracks
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraTurnedOffByUser(true);
    setCameraError(null);
  }, []);

  // Initialize camera with facingMode (default: environment or user)
  const startCamera = useCallback(async (desiredFacing?: 'environment' | 'user') => {
    setCameraError(null);
    setQualityGateFailure(null);
    setCameraTurnedOffByUser(false);

    const mode = desiredFacing || facingMode;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported by your browser or environment.');
      return;
    }

    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        setCameraTurnedOffByUser(false);
      }
    } catch (err: unknown) {
      console.warn('Camera access unavailable:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setCameraError(msg || 'Permission denied or camera not detected.');
      setCameraActive(false);
    }
  }, [facingMode]);

  // Master Camera Toggle function (Turn ON <-> Turn OFF)
  const toggleCamera = useCallback(() => {
    if (cameraActive && !cameraError) {
      stopCamera();
    } else {
      startCamera();
    }
  }, [cameraActive, cameraError, stopCamera, startCamera]);

  // Lens Switcher (Front <-> Back camera)
  const toggleFacingMode = useCallback(async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (cameraActive && !cameraError) {
      await startCamera(nextMode);
    }
  }, [facingMode, cameraActive, cameraError, startCamera]);

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  // Optical analysis pipeline from image/video source
  const analyzeImageElement = (
    imageSource: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
    isDemo = false,
    demoExposureTarget?: number
  ) => {
    setIsProcessing(true);
    setQualityGateFailure(null);

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      setIsProcessing(false);
      return;
    }

    ctx.drawImage(imageSource, 0, 0, sourceWidth, sourceHeight);

    // Bounding zones: Center 40% is sample reaction strip, top-right 15% is reference patch
    const sampleBox = {
      x: Math.floor(sourceWidth * 0.35),
      y: Math.floor(sourceHeight * 0.35),
      w: Math.floor(sourceWidth * 0.3),
      h: Math.floor(sourceHeight * 0.3),
    };

    const refBox = {
      x: Math.floor(sourceWidth * 0.72),
      y: Math.floor(sourceHeight * 0.15),
      w: Math.floor(sourceWidth * 0.18),
      h: Math.floor(sourceHeight * 0.18),
    };

    const sampleImgData = ctx.getImageData(sampleBox.x, sampleBox.y, sampleBox.w, sampleBox.h);
    const refImgData = ctx.getImageData(refBox.x, refBox.y, refBox.w, refBox.h);

    // Compute average RGB for sample and reference patch
    let sR = 0, sG = 0, sB = 0;
    const sLen = sampleImgData.data.length / 4;
    for (let i = 0; i < sampleImgData.data.length; i += 4) {
      sR += sampleImgData.data[i];
      sG += sampleImgData.data[i + 1];
      sB += sampleImgData.data[i + 2];
    }
    const rawSampleRgb: RGBColor = {
      r: Math.round(sR / sLen),
      g: Math.round(sG / sLen),
      b: Math.round(sB / sLen),
    };

    let rR = 0, rG = 0, rB = 0;
    const rLen = refImgData.data.length / 4;
    for (let i = 0; i < refImgData.data.length; i += 4) {
      rR += refImgData.data[i];
      rG += refImgData.data[i + 1];
      rB += refImgData.data[i + 2];
    }
    const rawRefRgb: RGBColor = {
      r: Math.round(rR / rLen),
      g: Math.round(rG / rLen),
      b: Math.round(rB / rLen),
    };

    // Quality Gates check
    const fullFrameImgData = ctx.getImageData(0, 0, Math.min(640, sourceWidth), Math.min(360, sourceHeight));
    const gateResult = runQualityGates(fullFrameImgData, rawSampleRgb, rawRefRgb);

    // If demo mode was explicitly selected, bypass camera blur if synthetic
    if (!isDemo && !gateResult.passed) {
      setQualityGateFailure(gateResult);
      setIsProcessing(false);
      return;
    }

    // Step: Lighting Correction via Reference White Patch
    const correctedSampleRgb = normalizeWithWhitePatch(rawSampleRgb, rawRefRgb);

    // Step: Convert to CIELAB and HSV
    const sampleLab = rgbToLab(correctedSampleRgb);
    const refLab = rgbToLab(rawRefRgb);
    const hsv = rgbToHsv(correctedSampleRgb);

    // Step: CIEDE2000 ΔE₀₀ Comparison
    const deltaE = deltaE2000(refLab, sampleLab);

    // If demo exposure target specified, override to matching realistic color
    let finalSampleRgb = correctedSampleRgb;
    let finalSampleLab = sampleLab;
    let finalRefLab = refLab;
    let finalDeltaE = deltaE;

    if (isDemo && demoExposureTarget !== undefined) {
      const syn = generateSyntheticStripColor(demoExposureTarget, stripType);
      finalSampleRgb = syn.sampleRgb;
      finalSampleLab = syn.sampleLab;
      finalRefLab = syn.refLab;
      finalDeltaE = syn.deltaE;
    }

    // Step: Calibrated AI Estimation Model
    const estimate = estimateExposure(
      {
        rgb: finalSampleRgb,
        hsv,
        lab: finalSampleLab,
        referenceLab: finalRefLab,
        deltaE: finalDeltaE,
        temperatureC,
        humidityPct,
        stripType,
      },
      { isDemo }
    );

    const scan: ScanResult = {
      id: `SCN-${Date.now().toString().slice(-4)}`,
      workerId: activeWorker.id,
      workerName: activeWorker.name,
      deviceId: activeWorker.assignedDeviceId,
      exposurePpmHr: isDemo && demoExposureTarget !== undefined ? demoExposureTarget : estimate.exposurePpmHr,
      status: isDemo ? 'SIMULATED' : 'ESTIMATED',
      stripType,
      rgb: finalSampleRgb,
      hsv,
      lab: finalSampleLab,
      referenceLab: finalRefLab,
      deltaE: finalDeltaE,
      temperatureC,
      humidityPct,
      calibrationModel: estimate.calibrationModel,
      calibrationVersion: estimate.calibrationVersion,
      timestamp: new Date().toISOString(),
      safetyLevel: estimate.safetyLevel,
      notes: isDemo
        ? 'Simulated calibration demo run.'
        : `Optical scan processed with CIEDE2000 white-balance correction (Gain factor ${estimate.environmentalCorrectionFactor}).`,
      imageUrl: lastImageSrc || undefined,
    };

    setIsProcessing(false);
    onScanComplete(scan);
  };

  // Handle capture from live camera
  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setQualityGateFailure({
        passed: false,
        blurScore: 0,
        blurPassed: false,
        lightingScore: 0,
        lightingPassed: false,
        stripDetected: false,
        patchDetected: false,
        reasons: ['Video feed not ready. Please allow camera stream to settle.'],
      });
      return;
    }
    analyzeImageElement(video, video.videoWidth, video.videoHeight, false);
  };

  // Handle image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setLastImageSrc(dataUrl);

      const img = new Image();
      img.onload = () => {
        analyzeImageElement(img, img.naturalWidth || 640, img.naturalHeight || 480, false);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Demo presets
  const handleDemoPreset = (targetPpmHr: number, label: string) => {
    const syn = generateSyntheticStripColor(targetPpmHr, stripType);
    // Draw synthetic preview onto temporary canvas
    const c = document.createElement('canvas');
    c.width = 640;
    c.height = 480;
    const ctx = c.getContext('2d')!;

    // Background dosimeter strip housing (dark grey carbon casing)
    ctx.fillStyle = '#1a1f2c';
    ctx.fillRect(0, 0, 640, 480);

    // Strip frame
    ctx.fillStyle = '#2d3748';
    ctx.roundRect(160, 80, 320, 320, 16);
    ctx.fill();

    // Chemical Reaction patch
    ctx.fillStyle = `rgb(${syn.sampleRgb.r}, ${syn.sampleRgb.g}, ${syn.sampleRgb.b})`;
    ctx.fillRect(220, 140, 200, 200);

    // Reference white patch (top right)
    ctx.fillStyle = `rgb(${syn.refRgb.r}, ${syn.refRgb.g}, ${syn.refRgb.b})`;
    ctx.fillRect(460, 60, 100, 100);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px monospace';
    ctx.fillText(`DEMO: ${label} (~${targetPpmHr} ppm·hr)`, 180, 390);

    const dataUrl = c.toDataURL('image/jpeg');
    setLastImageSrc(dataUrl);

    analyzeImageElement(c, 640, 480, true, targetPpmHr);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-[#ff6b1a] uppercase tracking-wider">OPTICAL SCANNER</span>
            <span className="text-slate-600">·</span>
            <span className="text-xs font-mono text-cyan-400">CIEDE2000 WHITE-PATCH ENGINE</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-wide">
            Scan Dosimeter Strip
          </h2>
        </div>

        {/* Actions: Camera Power Control Station & Worker badge */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Master Camera Power Switch (Toggle ON / OFF) */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-md gap-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold tracking-wider">
                <span
                  className={`w-2 h-2 rounded-full transition-colors ${
                    cameraActive && !cameraError
                      ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]'
                      : 'bg-slate-500'
                  }`}
                />
                <span className={cameraActive && !cameraError ? 'text-emerald-400' : 'text-slate-400'}>
                  {cameraActive && !cameraError ? 'CAMERA: ON' : 'CAMERA: OFF'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {cameraActive && !cameraError
                  ? `${facingMode === 'environment' ? 'Rear' : 'Front'} Lens Active`
                  : 'Feed Paused'}
              </span>
            </div>

            {/* Tactile Toggle Switch Button */}
            <button
              type="button"
              onClick={toggleCamera}
              role="switch"
              aria-checked={cameraActive && !cameraError}
              className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                cameraActive && !cameraError
                  ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
              title={cameraActive && !cameraError ? 'Click to Turn Camera OFF' : 'Click to Turn Camera ON'}
            >
              <span className="sr-only">Toggle Camera Power</span>
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                  cameraActive && !cameraError ? 'translate-x-6' : 'translate-x-0'
                }`}
              >
                {cameraActive && !cameraError ? (
                  <Camera className="w-3 h-3 text-emerald-600" />
                ) : (
                  <CameraOff className="w-3 h-3 text-slate-600" />
                )}
              </span>
            </button>
          </div>

          {/* Quick Lens Switcher (Flip Front/Back Camera) */}
          <button
            type="button"
            onClick={toggleFacingMode}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-cyan-400 transition-all shadow-md active:scale-95"
            title={`Switch to ${facingMode === 'environment' ? 'Front camera' : 'Rear / Environment camera'}`}
          >
            <SwitchCamera className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">
              {facingMode === 'environment' ? 'Flip to Front' : 'Flip to Rear'}
            </span>
          </button>

          {/* Worker badge */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 px-3 py-2 rounded-xl text-xs font-mono">
            <span className="text-slate-400">Worker:</span>
            <span className="text-white font-semibold">{activeWorker.name}</span>
            <span className="text-slate-500">({activeWorker.id})</span>
          </div>
        </div>
      </div>

      {/* Environmental & Strip Mode Controls */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Strip Type Selection */}
        <div>
          <label className="text-xs font-mono text-slate-300 block mb-1.5 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#ff6b1a]" />
            <span>Strip Chemical Rating</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStripType('FAST')}
              className={`py-1.5 px-3 rounded text-xs font-medium transition-colors ${
                stripType === 'FAST'
                  ? 'bg-[#ff6b1a] text-white font-semibold shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              FAST (0.1–10 ppm·hr)
            </button>
            <button
              type="button"
              onClick={() => setStripType('SLOW')}
              className={`py-1.5 px-3 rounded text-xs font-medium transition-colors ${
                stripType === 'SLOW'
                  ? 'bg-[#ff6b1a] text-white font-semibold shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              SLOW (5–120 ppm·hr)
            </button>
          </div>
        </div>

        {/* Ambient Temperature */}
        <div>
          <label className="text-xs font-mono text-slate-300 block mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-orange-400" />
              <span>Ambient Temp (°C)</span>
            </span>
            <span className="text-white font-mono">{temperatureC}°C</span>
          </label>
          <input
            type="range"
            min="10"
            max="45"
            step="0.5"
            value={temperatureC}
            onChange={(e) => setTemperatureC(parseFloat(e.target.value))}
            className="w-full accent-[#ff6b1a] bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
            <span>10°C</span>
            <span>25°C Ref</span>
            <span>45°C</span>
          </div>
        </div>

        {/* Relative Humidity */}
        <div>
          <label className="text-xs font-mono text-slate-300 block mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-cyan-400" />
              <span>Relative Humidity (%)</span>
            </span>
            <span className="text-white font-mono">{humidityPct}%</span>
          </label>
          <input
            type="range"
            min="20"
            max="95"
            step="1"
            value={humidityPct}
            onChange={(e) => setHumidityPct(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
            <span>20%</span>
            <span>50% Ref</span>
            <span>95%</span>
          </div>
        </div>
      </div>

      {/* Main Viewport Container (Camera View or Fallback - NEVER A BLACK SCREEN) */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl flex items-center justify-center">
        {/* Hidden Canvas for computation */}
        <canvas ref={canvasRef} className="hidden" />

        {/* 1. Live Camera Stream */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${cameraActive && !cameraError ? 'block' : 'hidden'}`}
          autoPlay
          playsInline
          muted
        />

        {/* 2. Fallback: Camera Turned Off by User Screen */}
        {cameraTurnedOffByUser && !cameraActive && (
          <div className="p-6 text-center max-w-md flex flex-col items-center justify-center z-10">
            <div className="w-16 h-16 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-slate-400 mb-4 shadow-xl">
              <CameraOff className="w-8 h-8 text-amber-400" />
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2.5 py-0.5 rounded-full mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>CAMERA STREAM PAUSED</span>
            </div>
            <h3 className="font-heading font-bold text-xl text-white mb-2">
              CAMERA IS TURNED OFF
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6 font-sans">
              Camera hardware and video capture are paused. Turn the camera back on whenever you're ready, or upload an image file directly.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 w-full">
              <button
                type="button"
                onClick={() => startCamera()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-heading font-bold tracking-wider shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>TURN CAMERA ON</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold border border-cyan-700/50 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>UPLOAD IMAGE</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoPreset(18.4, 'Standard Refinery Shift')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#ff6b1a] hover:bg-[#e0560a] text-white text-xs font-semibold transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>USE DEMO IMAGE</span>
              </button>
            </div>
          </div>
        )}

        {/* 2b. Fallback: Camera Unavailable / Error Screen */}
        {!cameraTurnedOffByUser && (!cameraActive || cameraError) && (
          <div className="p-6 text-center max-w-md flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="font-heading font-bold text-xl text-white mb-2">
              CAMERA UNAVAILABLE
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
              {cameraError || 'Rear camera is currently unavailable or permission was not granted.'}
              {' '}You can retry the camera, upload an image file, or run a high-precision demo calibration test strip.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 w-full">
              <button
                type="button"
                onClick={() => startCamera()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-600 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>TRY AGAIN</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold border border-cyan-700/50 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>UPLOAD IMAGE</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoPreset(18.4, 'Standard Refinery Shift')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ff6b1a] hover:bg-[#e0560a] text-white text-xs font-semibold transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>USE DEMO IMAGE</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. Scan Frame Overlay (Visible when camera is active) */}
        {cameraActive && !cameraError && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
            {/* Top guide banner & In-Viewport Camera Controls */}
            <div className="flex items-center justify-between w-full max-w-2xl px-2">
              <div className="bg-slate-950/85 backdrop-blur-sm border border-slate-700/80 rounded-full px-3.5 py-1.5 text-xs font-mono text-slate-200 flex items-center gap-2 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Place strip inside frame ·</span>
                <span className="text-cyan-300 font-bold">{facingMode === 'environment' ? 'Rear Lens' : 'Front Lens'}</span>
              </div>

              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="bg-slate-950/90 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/60 text-cyan-300 rounded-full px-3 py-1.5 text-xs font-mono flex items-center gap-1.5 shadow-lg transition-all active:scale-95"
                  title="Switch between front and back camera"
                >
                  <SwitchCamera className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden md:inline">Flip Cam</span>
                </button>

                <button
                  type="button"
                  onClick={stopCamera}
                  className="bg-slate-950/90 hover:bg-red-950/90 border border-slate-700 hover:border-red-500/60 text-slate-300 hover:text-red-300 rounded-full px-3 py-1.5 text-xs font-mono flex items-center gap-1.5 shadow-lg transition-all active:scale-95"
                  title="Turn off camera"
                >
                  <CameraOff className="w-3.5 h-3.5 text-red-400" />
                  <span>Turn Off</span>
                </button>
              </div>
            </div>

            {/* Targeting Reticle Frame */}
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 border-2 border-dashed border-[#ff6b1a] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#ff6b1a]" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#ff6b1a]" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#ff6b1a]" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#ff6b1a]" />

              {/* Center sample window */}
              <div className="w-28 h-28 border border-cyan-400/80 rounded bg-cyan-500/10 flex items-center justify-center text-[11px] font-mono text-cyan-300 text-center p-1">
                Chemical Zone
              </div>

              {/* Reference patch indicator (Top right of frame) */}
              <div className="absolute top-2 right-2 w-12 h-12 border border-white/80 rounded bg-white/20 flex items-center justify-center text-[9px] font-mono text-white text-center">
                Ref White
              </div>
            </div>

            {/* Bottom status note */}
            <div className="text-[11px] font-mono text-slate-300 bg-slate-900/80 px-3 py-1 rounded">
              Quality Gates: Laplacian Blur Variance &gt; 12 · Ref Patch Check Active
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
            <RefreshCw className="w-8 h-8 text-[#ff6b1a] animate-spin" />
            <span className="font-heading text-lg font-bold text-white tracking-wider">
              EXTRACTING CIEDE2000 COLOR METRICS...
            </span>
            <span className="text-xs font-mono text-cyan-400">
              Applying Gray-World Normalization & Arrhenius Corrections
            </span>
          </div>
        )}
      </div>

      {/* Quality Gate Failure Feedback (NEVER RETURNS A NUMBER WHEN FAILED) */}
      {qualityGateFailure && (
        <div className="mt-6 glass-panel-orange p-5 rounded-xl border border-red-500/50 bg-red-950/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-heading font-bold text-lg text-white mb-1">
                QUALITY GATES FAILED — UNABLE TO ESTIMATE EXPOSURE
              </h4>
              <p className="text-xs text-slate-300 mb-3">
                For worker life safety, SpiderZen strictly requires clean optical conditions. No concentration estimate can be provided until quality criteria are met:
              </p>
              <ul className="space-y-1.5 text-xs text-red-200 font-mono">
                {qualityGateFailure.reasons.map((r, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">✕</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => startCamera('environment')}
                  className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-600"
                >
                  Rescan with Rear Camera
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoPreset(8.7, 'Calibrated Controlled Sample')}
                  className="px-4 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium"
                >
                  Load Validated Benchmark Strip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls Bar: [CAPTURE], [UPLOAD IMAGE], [DEMO IMAGE] */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {cameraActive && !cameraError ? (
            <>
              <button
                type="button"
                onClick={handleCapture}
                disabled={isProcessing}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 py-3 px-7 rounded-lg bg-[#ff6b1a] hover:bg-[#e0560a] text-white font-heading font-bold text-base tracking-wider transition-all shadow-lg shadow-orange-500/25 active:scale-95 disabled:opacity-50"
              >
                <Camera className="w-5 h-5" />
                <span>CAPTURE</span>
              </button>

              <button
                type="button"
                onClick={stopCamera}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-red-950/40 hover:bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-mono font-bold transition-all shadow-sm active:scale-95"
                title="Turn camera off"
              >
                <CameraOff className="w-4 h-4 text-red-400" />
                <span>CAMERA OFF</span>
              </button>

              <button
                type="button"
                onClick={toggleFacingMode}
                className="flex items-center justify-center gap-1.5 py-3 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 text-xs font-mono transition-all active:scale-95"
                title={`Switch lens (currently ${facingMode === 'environment' ? 'Rear' : 'Front'})`}
              >
                <SwitchCamera className="w-4 h-4" />
                <span className="hidden md:inline">{facingMode === 'environment' ? 'Front' : 'Rear'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => startCamera()}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-bold text-sm tracking-wider transition-all shadow-lg shadow-emerald-600/30 active:scale-95"
              title="Turn camera on"
            >
              <Camera className="w-5 h-5 animate-pulse" />
              <span>TURN CAMERA ON</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 py-3 px-5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-sm font-semibold transition-all"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>UPLOAD IMAGE</span>
          </button>
        </div>

        {/* Demo Preset Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate:</span>
          </span>

          <button
            type="button"
            onClick={() => handleDemoPreset(2.3, 'Safe Background Exposure')}
            className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-400 text-xs font-mono"
          >
            2.3 ppm·hr (Safe)
          </button>

          <button
            type="button"
            onClick={() => handleDemoPreset(8.7, 'Cautionary Exposure')}
            className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-400 text-xs font-mono"
          >
            8.7 ppm·hr (Caution)
          </button>

          <button
            type="button"
            onClick={() => handleDemoPreset(24.5, 'Warning Exposure Breach')}
            className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-orange-500/40 text-[#ff6b1a] text-xs font-mono"
          >
            24.5 ppm·hr (Warning)
          </button>

          <button
            type="button"
            onClick={() => handleDemoPreset(68.0, 'Danger Critical Breach')}
            className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-red-500/50 text-red-400 text-xs font-mono"
          >
            68.0 ppm·hr (Danger)
          </button>
        </div>
      </div>

      {/* Optical Engine Reference Specs */}
      <div className="mt-8 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3 text-xs text-slate-400">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Optical Metrology Principle:</strong> Standard sRGB data is converted to linear CIE XYZ and CIELAB under D65 standard illuminant. The CIEDE2000 algorithm accounts for non-uniform elliptical perceptibility in the yellow-to-brown $PbS$ chromatic plane, eliminating false color shifts caused by ambient refinery sodium or LED lighting.
        </p>
      </div>
    </div>
  );
};
