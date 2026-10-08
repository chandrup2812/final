import React, { useState, useRef } from 'react';
import {
  Upload,
  Database,
  FileCheck,
  AlertCircle,
  Download,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { CalibrationDatasetRow } from '../types';
import { REFERENCE_CALIBRATION_DATA } from '../lib/aiEstimator';

interface DatasetViewProps {
  onDatasetLoaded: (dataset: CalibrationDatasetRow[]) => void;
  onNavigateToCalibration: () => void;
}

const REQUIRED_FIELDS = [
  'strip_id',
  'strip_type',
  'rgb_r',
  'rgb_g',
  'rgb_b',
  'delta_e',
  'temperature_c',
  'humidity_pct',
  'true_exposure_ppm_hr',
];

export const DatasetView: React.FC<DatasetViewProps> = ({
  onDatasetLoaded,
  onNavigateToCalibration,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [dataset, setDataset] = useState<CalibrationDatasetRow[]>(REFERENCE_CALIBRATION_DATA);
  const [columns, setColumns] = useState<string[]>(Object.keys(REFERENCE_CALIBRATION_DATA[0]));
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    'Loaded initial 24-point laboratory test chamber calibration reference dataset.'
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError(null);
    setSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text || text.trim().length === 0) {
          setValidationError('Uploaded file is empty.');
          return;
        }

        // Try parsing JSON first
        if (file.name.endsWith('.json')) {
          try {
            const parsed = JSON.parse(text);
            if (!Array.isArray(parsed) || parsed.length === 0) {
              setValidationError('JSON must contain a non-empty array of calibration objects.');
              return;
            }
            validateAndSetDataset(parsed);
            return;
          } catch {
            setValidationError('Malformed JSON file. Please ensure syntax is valid.');
            return;
          }
        }

        // Parse CSV
        const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          setValidationError('CSV must contain a header row and at least one data row.');
          return;
        }

        const headerLine = lines[0];
        const rawHeaders = headerLine.split(',').map((h) => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

        const parsedRows: Record<string, unknown>[] = [];
        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
          const rowObj: Record<string, unknown> = {};
          rawHeaders.forEach((h, idx) => {
            const val = vals[idx];
            const num = parseFloat(val);
            rowObj[h] = isNaN(num) ? val : num;
          });
          parsedRows.push(rowObj);
        }

        validateAndSetDataset(parsedRows);
      } catch (err) {
        setValidationError(`Failed to process dataset file: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsText(file);
  };

  const validateAndSetDataset = (rows: Record<string, unknown>[]) => {
    if (rows.length === 0) {
      setValidationError('Dataset has zero entries.');
      return;
    }

    const firstRowKeys = Object.keys(rows[0]).map((k) => k.toLowerCase());
    setColumns(firstRowKeys);

    // Identify which required fields are missing
    const missing = REQUIRED_FIELDS.filter((rf) => !firstRowKeys.includes(rf));
    setMissingFields(missing);

    if (missing.length > 0) {
      setValidationError(`Dataset is missing ${missing.length} required field(s): ${missing.join(', ')}`);
      return;
    }

    // Cast rows to CalibrationDatasetRow safely
    const cleanRows: CalibrationDatasetRow[] = rows.map((r, idx) => ({
      strip_id: String(r.strip_id || `SAMPLE-${idx + 1}`),
      strip_type: String(r.strip_type).toUpperCase() === 'SLOW' ? 'SLOW' : 'FAST',
      rgb_r: Number(r.rgb_r ?? 240),
      rgb_g: Number(r.rgb_g ?? 235),
      rgb_b: Number(r.rgb_b ?? 220),
      ref_r: Number(r.ref_r ?? 248),
      ref_g: Number(r.ref_g ?? 246),
      ref_b: Number(r.ref_b ?? 242),
      delta_e: Number(r.delta_e ?? 1.0),
      temperature_c: Number(r.temperature_c ?? 25.0),
      humidity_pct: Number(r.humidity_pct ?? 50.0),
      true_exposure_ppm_hr: Number(r.true_exposure_ppm_hr ?? 0.0),
    }));

    setDataset(cleanRows);
    setSuccessMessage(`Successfully validated and loaded ${cleanRows.length} calibration samples.`);
    onDatasetLoaded(cleanRows);
  };

  const downloadSampleTemplate = () => {
    const headers = REQUIRED_FIELDS.join(',');
    const sampleRow = 'CAL-EXP-01,FAST,204,184,142,14.8,25.0,55.0,7.6';
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, sampleRow].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'spiderzen_calibration_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadBenchmarkData = () => {
    setDataset(REFERENCE_CALIBRATION_DATA);
    setColumns(Object.keys(REFERENCE_CALIBRATION_DATA[0]));
    setMissingFields([]);
    setValidationError(null);
    setSuccessMessage('Loaded certified 24-point environmental test chamber reference dataset.');
    onDatasetLoaded(REFERENCE_CALIBRATION_DATA);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">AI CALIBRATION PIPELINE</span>
            <span className="text-slate-600">·</span>
            <span className="text-xs font-mono text-slate-400">DATASET VALIDATOR</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-wide">
            Calibration Training Dataset
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={downloadSampleTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Template CSV</span>
          </button>

          <button
            onClick={loadBenchmarkData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-400 text-xs font-mono transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Benchmark Lab Data</span>
          </button>
        </div>
      </div>

      {/* Upload Zone & Field Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Upload Box (2 Cols) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={handleFileUpload}
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-[#ff6b1a] rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-950/40"
          >
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-cyan-400 mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <h4 className="font-heading font-bold text-white text-base mb-1">
              Upload Calibration Dataset (.CSV or .JSON)
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
              Click to select or drag and drop certified test chamber strip exposure data. Zero crashes guaranteed on malformed files.
            </p>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-3 py-1 rounded">
              Accepts CSV with headers or JSON array
            </span>
          </div>

          {/* Validation Feedback */}
          {validationError && (
            <div className="mt-4 p-3.5 rounded-lg bg-red-950/40 border border-red-500/50 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-red-200">VALIDATION WARNING:</strong>
                <span>{validationError}</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 flex items-start gap-2.5 text-xs text-emerald-300">
              <FileCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Required Fields Schema Checklist (1 Col) */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="font-heading font-bold text-white text-base tracking-wide mb-2 flex items-center gap-2">
              <Database className="w-4 h-4 text-[#ff6b1a]" />
              <span>Required Schema Fields</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              All 9 features are strictly required to ensure CIEDE2000 Arrhenius physical fidelity.
            </p>

            <ul className="space-y-1.5 text-xs font-mono">
              {REQUIRED_FIELDS.map((rf) => {
                const isPresent = columns.includes(rf);
                return (
                  <li
                    key={rf}
                    className={`flex items-center justify-between p-1.5 rounded ${
                      isPresent ? 'bg-emerald-950/20 text-emerald-300' : 'bg-red-950/30 text-red-300'
                    }`}
                  >
                    <span>{rf}</span>
                    <span className="text-[10px] font-bold">
                      {isPresent ? 'VALID' : 'MISSING'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <button
            onClick={onNavigateToCalibration}
            disabled={missingFields.length > 0}
            className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#ff6b1a] hover:bg-[#e0560a] text-white text-xs font-heading font-bold tracking-wider transition-all disabled:opacity-40"
          >
            <span>TRAIN MODEL WITH DATASET</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dataset Preview Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="font-heading font-bold text-white text-lg tracking-wide">
              Dataset Preview ({dataset.length} Samples)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {columns.length} columns detected
          </span>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 sticky top-0">
              <tr>
                <th className="py-2.5 px-3">STRIP ID</th>
                <th className="py-2.5 px-3">TYPE</th>
                <th className="py-2.5 px-3">RGB (R, G, B)</th>
                <th className="py-2.5 px-3">ΔE₀₀</th>
                <th className="py-2.5 px-3">TEMP (°C)</th>
                <th className="py-2.5 px-3">RH (%)</th>
                <th className="py-2.5 px-3 text-cyan-400">TRUE PPM·HR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {dataset.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40">
                  <td className="py-2 px-3 text-white font-semibold">{row.strip_id}</td>
                  <td className="py-2 px-3">
                    <span className="bg-slate-900 px-1.5 py-0.5 rounded text-[10px] text-slate-300">
                      {row.strip_type}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-400">
                    <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle" style={{ backgroundColor: `rgb(${row.rgb_r}, ${row.rgb_g}, ${row.rgb_b})` }} />
                    {row.rgb_r}, {row.rgb_g}, {row.rgb_b}
                  </td>
                  <td className="py-2 px-3 text-cyan-300 tabular-nums">{row.delta_e.toFixed(2)}</td>
                  <td className="py-2 px-3">{row.temperature_c.toFixed(1)}</td>
                  <td className="py-2 px-3">{row.humidity_pct.toFixed(0)}</td>
                  <td className="py-2 px-3 font-bold text-white tabular-nums">
                    {row.true_exposure_ppm_hr.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
