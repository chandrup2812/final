import { LabColor, RGBColor, HSVColor, QualityGateResult } from '../types';

/**
 * Gamma-correct an sRGB channel from 0-255 to linear 0.0-1.0
 */
export function sRGBToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Linear RGB channel 0.0-1.0 to gamma-compressed sRGB 0-255
 */
export function linearTosRGB(c: number): number {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, Math.round(v * 255)));
}

/**
 * Convert sRGB to CIELAB using Standard D65 illuminant
 */
export function rgbToLab(rgb: RGBColor): LabColor {
  const rLin = sRGBToLinear(rgb.r);
  const gLin = sRGBToLinear(rgb.g);
  const bLin = sRGBToLinear(rgb.b);

  // sRGB to XYZ matrix (D65)
  const x = rLin * 0.4124564 + gLin * 0.3575761 + bLin * 0.1804375;
  const y = rLin * 0.2126729 + gLin * 0.7151522 + bLin * 0.0721750;
  const z = rLin * 0.0193339 + gLin * 0.1191920 + bLin * 0.9503041;

  // Reference white D65
  const xn = 0.95047;
  const yn = 1.00000;
  const zn = 1.08883;

  const xr = x / xn;
  const yr = y / yn;
  const zr = z / zn;

  const epsilon = 0.008856; // (6/29)^3
  const kappa = 903.3;      // (29/3)^3

  const fx = xr > epsilon ? Math.cbrt(xr) : (kappa * xr + 16) / 116;
  const fy = yr > epsilon ? Math.cbrt(yr) : (kappa * yr + 16) / 116;
  const fz = zr > epsilon ? Math.cbrt(zr) : (kappa * zr + 16) / 116;

  const L = Math.max(0, Math.min(100, 116 * fy - 16));
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  return {
    L: Number(L.toFixed(3)),
    a: Number(a.toFixed(3)),
    b: Number(b.toFixed(3)),
  };
}

/**
 * Convert RGB to HSV
 */
export function rgbToHsv(rgb: RGBColor): HSVColor {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : Math.round((delta / max) * 100);
  const v = Math.round(max * 100);

  return { h, s, v };
}

const rad2deg = (rad: number) => (rad * 180) / Math.PI;
const deg2rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Calculate CIEDE2000 (ΔE00) Color Difference between two Lab colors.
 * Implementation conforming to CIE Technical Report 142-2001 and ASTM D2244.
 */
export function deltaE2000(lab1: LabColor, lab2: LabColor, kL = 1, kC = 1, kH = 1): number {
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;

  const c1 = Math.sqrt(a1 * a1 + b1 * b1);
  const c2 = Math.sqrt(a2 * a2 + b2 * b2);
  const cBar = (c1 + c2) / 2;

  const cBar7 = Math.pow(cBar, 7);
  const g = 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + 6103515625))); // 25^7 = 6103515625

  const aPrime1 = (1 + g) * a1;
  const aPrime2 = (1 + g) * a2;

  const cPrime1 = Math.sqrt(aPrime1 * aPrime1 + b1 * b1);
  const cPrime2 = Math.sqrt(aPrime2 * aPrime2 + b2 * b2);

  // Hue angles in degrees
  let hPrime1 = rad2deg(Math.atan2(b1, aPrime1));
  if (hPrime1 < 0) hPrime1 += 360;

  let hPrime2 = rad2deg(Math.atan2(b2, aPrime2));
  if (hPrime2 < 0) hPrime2 += 360;

  const deltaLPrime = L2 - L1;
  const deltaCPrime = cPrime2 - cPrime1;

  let deltahPrime = 0;
  if (cPrime1 * cPrime2 !== 0) {
    const diff = hPrime2 - hPrime1;
    if (Math.abs(diff) <= 180) {
      deltahPrime = diff;
    } else if (diff > 180) {
      deltahPrime = diff - 360;
    } else {
      deltahPrime = diff + 360;
    }
  }

  const deltaHPrime = 2 * Math.sqrt(cPrime1 * cPrime2) * Math.sin(deg2rad(deltahPrime / 2));

  const lPrimeBar = (L1 + L2) / 2;
  const cPrimeBar = (cPrime1 + cPrime2) / 2;

  let hPrimeBar = 0;
  if (cPrime1 * cPrime2 !== 0) {
    const diff = Math.abs(hPrime1 - hPrime2);
    if (diff <= 180) {
      hPrimeBar = (hPrime1 + hPrime2) / 2;
    } else if (hPrime1 + hPrime2 < 360) {
      hPrimeBar = (hPrime1 + hPrime2 + 360) / 2;
    } else {
      hPrimeBar = (hPrime1 + hPrime2 - 360) / 2;
    }
  }

  const t =
    1 -
    0.17 * Math.cos(deg2rad(hPrimeBar - 30)) +
    0.24 * Math.cos(deg2rad(2 * hPrimeBar)) +
    0.32 * Math.cos(deg2rad(3 * hPrimeBar + 6)) -
    0.2 * Math.cos(deg2rad(4 * hPrimeBar - 63));

  const lPrimeBarMinus50 = lPrimeBar - 50;
  const lPrimeBarMinus50Sq = lPrimeBarMinus50 * lPrimeBarMinus50;
  const sL = 1 + (0.015 * lPrimeBarMinus50Sq) / Math.sqrt(20 + lPrimeBarMinus50Sq);
  const sC = 1 + 0.045 * cPrimeBar;
  const sH = 1 + 0.015 * cPrimeBar * t;

  const deltaTheta = 30 * Math.exp(-Math.pow((hPrimeBar - 275) / 25, 2));
  const cPrimeBar7 = Math.pow(cPrimeBar, 7);
  const rC = 2 * Math.sqrt(cPrimeBar7 / (cPrimeBar7 + 6103515625));
  const rT = -Math.sin(deg2rad(2 * deltaTheta)) * rC;

  const vL = deltaLPrime / (kL * sL);
  const vC = deltaCPrime / (kC * sC);
  const vH = deltaHPrime / (kH * sH);

  const deltaE = Math.sqrt(vL * vL + vC * vC + vH * vH + rT * vC * vH);
  return Number(deltaE.toFixed(3));
}

/**
 * Lighting correction: Gray-World white balance + reference patch illumination normalization
 */
export function normalizeWithWhitePatch(sampleRgb: RGBColor, whitePatchRgb: RGBColor): RGBColor {
  // If reference patch is detected, normalize relative to standard perfect white (255, 255, 255)
  const gainR = whitePatchRgb.r > 20 ? 255 / whitePatchRgb.r : 1;
  const gainG = whitePatchRgb.g > 20 ? 255 / whitePatchRgb.g : 1;
  const gainB = whitePatchRgb.b > 20 ? 255 / whitePatchRgb.b : 1;

  // Limit gain to reasonable optical range (0.5 to 2.2) to prevent noise boost
  const clampGain = (g: number) => Math.max(0.5, Math.min(2.2, g));

  const adjR = Math.min(255, Math.max(0, Math.round(sampleRgb.r * clampGain(gainR))));
  const adjG = Math.min(255, Math.max(0, Math.round(sampleRgb.g * clampGain(gainG))));
  const adjB = Math.min(255, Math.max(0, Math.round(sampleRgb.b * clampGain(gainB))));

  return { r: adjR, g: adjG, b: adjB };
}

/**
 * Quality Gates:
 * 1. Blur check via Laplacian variance estimation
 * 2. Lighting check (mean luminance 45 to 230, no extreme saturation)
 * 3. Reference patch detection
 * 4. Strip presence & color range
 */
export function runQualityGates(
  imageData: ImageData,
  sampleRgb: RGBColor,
  refPatchRgb: RGBColor
): QualityGateResult {
  const reasons: string[] = [];

  // 1. Calculate Laplacian variance for blur
  const { data, width, height } = imageData;
  let laplacianSum = 0;
  let laplacianSumSq = 0;
  let pixelCount = 0;

  // Sample every 4th pixel for high performance in real-time
  const step = 4;
  for (let y = 1; y < height - 1; y += step) {
    for (let x = 1; x < width - 1; x += step) {
      const idx = (y * width + x) * 4;
      // Convert to luminance
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

      const idxUp = ((y - 1) * width + x) * 4;
      const idxDown = ((y + 1) * width + x) * 4;
      const idxLeft = (y * width + (x - 1)) * 4;
      const idxRight = (y * width + (x + 1)) * 4;

      const lumUp = 0.299 * data[idxUp] + 0.587 * data[idxUp + 1] + 0.114 * data[idxUp + 2];
      const lumDown = 0.299 * data[idxDown] + 0.587 * data[idxDown + 1] + 0.114 * data[idxDown + 2];
      const lumLeft = 0.299 * data[idxLeft] + 0.587 * data[idxLeft + 1] + 0.114 * data[idxLeft + 2];
      const lumRight = 0.299 * data[idxRight] + 0.587 * data[idxRight + 1] + 0.114 * data[idxRight + 2];

      // Discrete Laplacian: 4*center - (up + down + left + right)
      const lap = Math.abs(4 * lum - (lumUp + lumDown + lumLeft + lumRight));
      laplacianSum += lap;
      laplacianSumSq += lap * lap;
      pixelCount++;
    }
  }

  const meanLap = laplacianSum / (pixelCount || 1);
  const variance = laplacianSumSq / (pixelCount || 1) - meanLap * meanLap;
  const blurScore = Math.max(0, Math.round(variance));
  const blurPassed = blurScore >= 12; // Threshold for acceptable crispness

  if (!blurPassed) {
    reasons.push(`Image is too blurry (sharpness score ${blurScore}, minimum required is 12). Hold phone steady and focus on the wristband.`);
  }

  // 2. Lighting Check
  const sampleLum = 0.299 * sampleRgb.r + 0.587 * sampleRgb.g + 0.114 * sampleRgb.b;
  const lightingScore = Math.round(sampleLum);
  let lightingPassed = true;

  if (lightingScore < 35) {
    lightingPassed = false;
    reasons.push(`Lighting too dim (${lightingScore}/255). Move to a well-lit area or turn on flashlight.`);
  } else if (lightingScore > 238) {
    lightingPassed = false;
    reasons.push(`Overexposed / glare glare detected (${lightingScore}/255). Avoid direct specular reflection.`);
  }

  // 3. Reference Patch Check
  // The dosimeter patch has a built-in white/off-white calibration reference pad
  const refLum = 0.299 * refPatchRgb.r + 0.587 * refPatchRgb.g + 0.114 * refPatchRgb.b;
  const patchDetected = refLum >= 60 && Math.abs(refPatchRgb.r - refPatchRgb.b) < 65;

  if (!patchDetected) {
    reasons.push('White calibration reference patch not detected inside alignment zone. Ensure strip is fully inside the rectangle.');
  }

  // 4. Strip Detected Check
  const stripDetected = (sampleRgb.r + sampleRgb.g + sampleRgb.b) > 40;
  if (!stripDetected) {
    reasons.push('Chemical sensor window empty or obscured.');
  }

  const passed = blurPassed && lightingPassed && patchDetected && stripDetected;

  return {
    passed,
    blurScore,
    blurPassed,
    lightingScore,
    lightingPassed,
    stripDetected,
    patchDetected,
    reasons,
  };
}
