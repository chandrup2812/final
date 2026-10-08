import { deltaE2000, rgbToHsv, rgbToLab, runQualityGates } from './colorimetry';
import { estimateExposure, REFERENCE_CALIBRATION_DATA, trainCalibrationModel } from './aiEstimator';
import { LabColor, RGBColor } from '../types';

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  actual: string;
  expected: string;
  durationMs: number;
  error?: string;
}

export interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: TestResult[];
}

export function runSpiderZenUnitTests(): TestSuiteSummary {
  const startTime = performance.now();
  const results: TestResult[] = [];

  // Suite 1: Color Space Conversions
  {
    const t0 = performance.now();
    const whiteRgb: RGBColor = { r: 255, g: 255, b: 255 };
    const whiteLab = rgbToLab(whiteRgb);
    const passed = Math.abs(whiteLab.L - 100) < 0.1 && Math.abs(whiteLab.a) < 0.2 && Math.abs(whiteLab.b) < 0.2;
    results.push({
      suite: 'Colorimetry',
      name: 'RGB to CIELAB D65: Pure White L* should equal 100',
      passed,
      actual: `L=${whiteLab.L}, a=${whiteLab.a}, b=${whiteLab.b}`,
      expected: 'L=100.0, a=0.0, b=0.0',
      durationMs: Number((performance.now() - t0).toFixed(2)),
    });
  }

  {
    const t0 = performance.now();
    const blackRgb: RGBColor = { r: 0, g: 0, b: 0 };
    const blackLab = rgbToLab(blackRgb);
    const passed = blackLab.L === 0;
    results.push({
      suite: 'Colorimetry',
      name: 'RGB to CIELAB D65: Pure Black L* should equal 0',
      passed,
      actual: `L=${blackLab.L}`,
      expected: 'L=0.0',
      durationMs: Number((performance.now() - t0).toFixed(2)),
    });
  }

  {
    const t0 = performance.now();
    const redRgb: RGBColor = { r: 255, g: 0, b: 0 };
    const redHsv = rgbToHsv(redRgb);
    const passed = redHsv.h === 0 && redHsv.s === 100 && redHsv.v === 100;
    results.push({
      suite: 'Colorimetry',
      name: 'RGB to HSV: Pure Red should be H=0, S=100, V=100',
      passed,
      actual: `H=${redHsv.h}, S=${redHsv.s}, V=${redHsv.v}`,
      expected: 'H=0, S=100, V=100',
      durationMs: Number((performance.now() - t0).toFixed(2)),
    });
  }

  // Suite 2: CIEDE2000 (ΔE00) Standardized Color Difference
  {
    const t0 = performance.now();
    // Identical colors must have delta-E == 0
    const colorA: LabColor = { L: 50.0, a: 2.6772, b: -79.7751 };
    const dE = deltaE2000(colorA, colorA);
    const passed = dE === 0;
    results.push({
      suite: 'CIEDE2000',
      name: 'CIEDE2000 Identity: ΔE00 of identical color pair must be 0.000',
      passed,
      actual: `ΔE=${dE}`,
      expected: 'ΔE=0.000',
      durationMs: Number((performance.now() - t0).toFixed(2)),
    });
  }

  {
    const t0 = performance.now();
    // CIE standard published pair test: Pair 1 from Sharma et al. (2005)
    // Pair 1: (50.0000, 2.6772, -79.7751) vs (50.0000, 0.0000, -82.7485) -> expected ΔE00 ~ 2.0425
    const pair1_1: LabColor = { L: 50.0, a: 2.6772, b: -79.7751 };
    const pair1_2: LabColor = { L: 50.0, a: 0.0, b: -82.7485 };
    const dE = deltaE2000(pair1_1, pair1_2);
    const passed = Math.abs(dE - 2.043) < 0.05;
    results.push({
      suite: 'CIEDE2000',
      name: 'CIEDE2000 Benchmark Pair 1: Sharma et al. validation (expected ~2.04)',
      passed,
      actual: `ΔE=${dE}`,
      expected: 'ΔE=2.043 ± 0.05',
      durationMs: Number((performance.now() - t0).toFixed(2)),
    });
  }

  // Suite 3: Quality Gates
  {
    const t0 = performance.now();
    // Create synthetic dark image data (simulating camera lens covered)
    const width = 40;
    const height = 40;
    const imgData = new ImageData(width, height);
    for (let i = 0; i < imgData.data.length; i += 4) {
      imgData.data[i] = 10;     // R
      imgData.data[i + 1] = 10; // G
      imgData.data[i + 2] = 10; // B
      imgData.data[i + 3] = 255;// A
    }

    const qResult = runQualityGates(
      imgData,
      { r: 10, g: 10, b: 10 },
      { r: 10, g: 10, b: 10 }
    );

    const passed = !qResult.passed && qResult.reasons.length > 0;
    results.push({
      suite: 'Quality Gates',
      name: 'Gate Enforcement: Under-exposed/covered lens must be rejected',
      passed,
      actual: `Passed=${qResult.passed}, Reasons=${qResult.reasons.length}`,
      expected: 'Passed=false, Reasons >= 1',
      durationMs: Number((performance.now() - t0).toFixed(2)),
    });
  }

  // Suite 4: Calibration Model Cross-Validation Metrics
  {
    const t0 = performance.now();
    const trained = trainCalibrationModel(REFERENCE_CALIBRATION_DATA, 'Gradient Boosting (GBR)');
    const { metrics } = trained;
    const honestMetricsPassed =
      metrics.nSamples >= 20 &&
      metrics.r2 >= 0.90 &&
      metrics.mae > 0 &&
      metrics.rmse > 0 &&
      metrics.kFoldFolds === 5;

    results.push({
      suite: 'AI Calibration',
      name: '5-Fold Cross Validation: GBR model achieves R² >= 0.90 on reference data',
      passed: honestMetricsPassed,
      actual: `R²=${metrics.r2}, MAE=${metrics.mae}, RMSE=${metrics.rmse}, Folds=${metrics.kFoldFolds}`,
      expected: 'R² >= 0.90, Folds=5, honest MAE & RMSE calculated',
      durationMs: Number((performance.now() - t0).toFixed(2)),
    });
  }

  // Suite 5: Exposure Estimator
  {
    const t0 = performance.now();
    const estimate = estimateExposure({
      rgb: { r: 145, g: 118, b: 76 },
      lab: { L: 52.3, a: 6.8, b: 24.1 },
      referenceLab: { L: 96.5, a: -0.2, b: 1.8 },
      deltaE: 36.2,
      temperatureC: 25.0,
      humidityPct: 50.0,
      stripType: 'FAST',
    });

    // At deltaE = 36.2, reference calibrated exposure is ~29.5 ppm·hr (WARNING category)
    const passed = estimate.exposurePpmHr > 20 && estimate.exposurePpmHr < 40 && estimate.safetyLevel === 'WARNING';
    results.push({
      suite: 'AI Estimator',
      name: 'Exposure Estimation: Mid-level exposed strip classifies as WARNING (15-50 ppm·hr)',
      passed,
      actual: `Exposure=${estimate.exposurePpmHr} ppm·hr, Level=${estimate.safetyLevel}`,
      expected: 'Exposure ~29.5 ppm·hr (15 - 50 ppm·hr), Level=WARNING',
      durationMs: Number((performance.now() - t0).toFixed(2)),
    });
  }

  const durationMs = Number((performance.now() - startTime).toFixed(2));
  const passedCount = results.filter((r) => r.passed).length;

  return {
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    durationMs,
    results,
  };
}
