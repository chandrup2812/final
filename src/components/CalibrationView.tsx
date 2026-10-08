import React, { useState } from 'react';
import {
  FlaskConical,
  Activity,
  Cpu,
  CheckCircle,
  Play,
  RotateCcw,
  Sparkles,
  BarChart2,
  Info,
} from 'lucide-react';
import { CalibrationDatasetRow, CalibrationMetrics } from '../types';
import {
  getActiveCalibrationMetrics,
  setActiveCalibration,
  estimateExposure,
} from '../lib/aiEstimator';

interface CalibrationViewProps {
  dataset: CalibrationDatasetRow[];
  onCalibrationUpdated: (metrics: CalibrationMetrics) => void;
}

export const CalibrationView: React.FC<CalibrationViewProps> = ({
  dataset,
  onCalibrationUpdated,
}) => {
  const [modelType, setModelType] = useState<
    'Gradient Boosting (GBR)' | 'Random Forest' | 'Polynomial Regressor'
  >('Gradient Boosting (GBR)');

  const [metrics, setMetrics] = useState<CalibrationMetrics>(getActiveCalibrationMetrics());
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [testDeltaE, setTestDeltaE] = useState<number>(24.8);
  const [testTemp, setTestTemp] = useState<number>(25.0);
  const [testHumidity, setTestHumidity] = useState<number>(50.0);
  const [testStripType, setTestStripType] = useState<'FAST' | 'SLOW'>('FAST');

  const handleTrain = () => {
    setIsTraining(true);
    setTimeout(() => {
      try {
        const newMetrics = setActiveCalibration(dataset, modelType);
        setMetrics(newMetrics);
        onCalibrationUpdated(newMetrics);
      } catch (err) {
        console.error(err);
      } finally {
        setIsTraining(false);
      }
    }, 400);
  };

  // Test prediction with current active model
  const testEstimate = estimateExposure({
    rgb: { r: 180, g: 155, b: 110 },
    lab: { L: 65, a: 3, b: 25 },
    referenceLab: { L: 96, a: 0, b: 2 },
    deltaE: testDeltaE,
    temperatureC: testTemp,
    humidityPct: testHumidity,
    stripType: testStripType,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-[#00e5ff] uppercase tracking-wider">AI / ML CALIBRATION</span>
            <span className="text-slate-600">·</span>
            <span className="text-xs font-mono text-slate-400">5-FOLD CROSS VALIDATION (SEED=42)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-wide">
            Model Training & Evaluation
          </h2>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
          <span>Active Dataset:</span>
          <span className="text-cyan-400 font-bold">{dataset.length} Samples</span>
        </div>
      </div>

      {/* Model Selection & Train Action Card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 mb-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex-1">
            <h3 className="font-heading font-bold text-lg text-white mb-2">
              Select Architecture & Retrain
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4 max-w-2xl font-sans">
              Train an empirical regression estimator directly on validated chamber exposure points. All metrics are computed strictly via held-out 5-fold cross-validation.
            </p>

            {/* Model Architecture Radio Tabs */}
            <div className="flex flex-wrap gap-2 text-xs font-medium">
              {(['Gradient Boosting (GBR)', 'Random Forest', 'Polynomial Regressor'] as const).map(
                (type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setModelType(type)}
                    className={`py-2 px-4 rounded-lg transition-colors ${
                      modelType === type
                        ? 'bg-[#ff6b1a] text-white font-semibold shadow-md shadow-orange-500/20'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    {type}
                  </button>
                )
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleTrain}
            disabled={isTraining}
            className="w-full lg:w-auto flex items-center justify-center gap-2 py-3 px-8 rounded-lg bg-[#00e5ff] hover:bg-[#00c8e0] text-slate-950 font-heading font-bold text-sm tracking-wider transition-all shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50"
          >
            {isTraining ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-slate-950" />}
            <span>{isTraining ? 'TRAINING 5-FOLD CV...' : 'TRAIN MODEL'}</span>
          </button>
        </div>
      </div>

      {/* Honest Metrics Grid (MAE, RMSE, R², n_samples) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 block mb-1">R² DETERMINATION</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-mono font-bold text-[#00e5ff] tabular-nums">
              {metrics.r2.toFixed(4)}
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono mt-1 block">Cross-Validated (k=5)</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 block mb-1">MAE (MEAN ABS ERROR)</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-mono font-bold text-white tabular-nums">
              {metrics.mae.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 font-mono">ppm·hr</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">Honest Test Residual</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 block mb-1">RMSE (ROOT MEAN SQ)</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-mono font-bold text-white tabular-nums">
              {metrics.rmse.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 font-mono">ppm·hr</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">Standard Error of Estimate</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 block mb-1">VALIDATION SAMPLES</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-mono font-bold text-[#ff6b1a] tabular-nums">
              {metrics.nSamples}
            </span>
            <span className="text-xs text-slate-400 font-mono">points</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">Empirical Test Chambers</span>
        </div>
      </div>

      {/* Feature Importances & Model Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Feature Importance Breakdown */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <h3 className="font-heading font-bold text-white text-lg tracking-wide mb-2">
            Relative Feature Weight Importance
          </h3>
          <p className="text-xs text-slate-400 mb-6 font-sans">
            Relative influence of optical and thermodynamic parameters on estimated ppm·hr.
          </p>

          <div className="space-y-4">
            {metrics.featureImportances.map((f) => (
              <div key={f.feature}>
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="text-slate-300">{f.feature}</span>
                  <span className="text-cyan-400 font-bold">{(f.importance * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#00e5ff] h-full rounded-full transition-all duration-500"
                    style={{ width: `${f.importance * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800/80 text-[11px] font-mono text-slate-500 flex items-center justify-between">
            <span>Model Version: {metrics.version}</span>
            <span>Trained: {new Date(metrics.trainingDate).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Live Calibration Sandbox & Predictor Test */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <h3 className="font-heading font-bold text-white text-lg tracking-wide mb-2 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[#ff6b1a]" />
            <span>Interactive Model Predictor</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4 font-sans">
            Test how the trained model converts arbitrary ΔE₀₀ and environmental inputs into estimated exposure.
          </p>

          <div className="space-y-4 text-xs font-mono">
            {/* Strip Type */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Strip Chemistry:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTestStripType('FAST')}
                  className={`px-2.5 py-1 rounded text-[11px] ${
                    testStripType === 'FAST' ? 'bg-[#ff6b1a] text-white font-bold' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  FAST
                </button>
                <button
                  type="button"
                  onClick={() => setTestStripType('SLOW')}
                  className={`px-2.5 py-1 rounded text-[11px] ${
                    testStripType === 'SLOW' ? 'bg-[#ff6b1a] text-white font-bold' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  SLOW
                </button>
              </div>
            </div>

            {/* Delta-E */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300">ΔE₀₀ Color Difference:</span>
                <span className="text-cyan-400 font-bold">{testDeltaE.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="65"
                step="0.5"
                value={testDeltaE}
                onChange={(e) => setTestDeltaE(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Temperature */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300">Temperature (°C):</span>
                <span className="text-orange-400 font-bold">{testTemp.toFixed(1)}°C</span>
              </div>
              <input
                type="range"
                min="10"
                max="45"
                step="0.5"
                value={testTemp}
                onChange={(e) => setTestTemp(parseFloat(e.target.value))}
                className="w-full accent-orange-400 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Humidity */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300">Humidity (%):</span>
                <span className="text-cyan-400 font-bold">{testHumidity.toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="90"
                step="1"
                value={testHumidity}
                onChange={(e) => setTestHumidity(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Output Metric */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-700/80 flex items-center justify-between mt-4">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Estimated Exposure</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white font-mono">
                    {testEstimate.exposurePpmHr.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400">ppm·hr</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase">Predicted Category</span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded border ${
                    testEstimate.safetyLevel === 'DANGER'
                      ? 'text-red-400 border-red-500/40 bg-red-950/50'
                      : testEstimate.safetyLevel === 'WARNING'
                      ? 'text-[#ff6b1a] border-orange-500/40 bg-orange-950/50'
                      : testEstimate.safetyLevel === 'CAUTION'
                      ? 'text-amber-400 border-amber-500/40 bg-amber-950/50'
                      : 'text-emerald-400 border-emerald-500/40 bg-emerald-950/50'
                  }`}
                >
                  {testEstimate.safetyLevel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
