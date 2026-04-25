// sRGB <-> linear conversions (WCAG 2.1)
const toLinear = c => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const toSRGB = l => {
  const c = Math.max(0, Math.min(1, l));
  return Math.round((c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255);
};

const getLuminance = (r, g, b) =>
  0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

const getContrastRatio = (lum1, lum2) => {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
};

// Normalize any color format (oklch, hsl, rgb, …) to RGB via canvas
const colorToRGB = colorStr => {
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  const cx = c.getContext('2d');
  cx.fillStyle = colorStr;
  cx.fillRect(0, 0, 1, 1);
  const d = cx.getImageData(0, 0, 1, 1).data;
  return { r: d[0], g: d[1], b: d[2] };
};

// Scale in linear space towards black to reach targetLum
const darkenToLuminance = (r, g, b, currentLum, targetLum) => {
  const factor = currentLum > 0 ? Math.min(1, targetLum / currentLum) : 0;
  return {
    r: toSRGB(toLinear(r) * factor),
    g: toSRGB(toLinear(g) * factor),
    b: toSRGB(toLinear(b) * factor),
  };
};

// Mix in linear space towards white to reach targetLum
const lightenToLuminance = (r, g, b, currentLum, targetLum) => {
  const mixFactor = currentLum < 1 ? Math.max(0, Math.min(1, (targetLum - currentLum) / (1 - currentLum))) : 0;
  return {
    r: toSRGB(toLinear(r) + (1 - toLinear(r)) * mixFactor),
    g: toSRGB(toLinear(g) + (1 - toLinear(g)) * mixFactor),
    b: toSRGB(toLinear(b) + (1 - toLinear(b)) * mixFactor),
  };
};

// The minimum opacity used on text (opacity-60 class). The text color must be
// strong enough that even at this opacity over the background it meets 4.5:1.
const MIN_TEXT_OPACITY = 0.6;

// Binary-search for the grey sRGB value (0–255) whose blended luminance at
// `opacity` over (bgR,bgG,bgB) equals targetEffLum.
// lighter=true  → return smallest v with effLum >= target (for lightening)
// lighter=false → return largest  v with effLum <= target (for darkening)
function greyForEffectiveLum(bgR, bgG, bgB, targetEffLum, opacity, lighter) {
  let lo = 0, hi = 255;
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) >> 1;
    const effLum = getLuminance(
      mid * opacity + bgR * (1 - opacity),
      mid * opacity + bgG * (1 - opacity),
      mid * opacity + bgB * (1 - opacity)
    );
    if (effLum < targetEffLum) lo = mid + 1;
    else hi = mid;
  }
  return lighter ? Math.min(255, lo) : Math.max(0, lo - 1);
}

export function applyContrastColor(cardElement) {
  const raw = cardElement.dataset.rawColor;
  if (!raw) return;

  const [r, g, b] = raw.split(',').map(Number);
  cardElement.style.setProperty('--card-bg-color', `rgb(${r}, ${g}, ${b})`);

  const bgLuminance = getLuminance(r, g, b);
  const textColorStr = getComputedStyle(cardElement).color;
  const { r: textR, g: textG, b: textB } = colorToRGB(textColorStr);
  const textLuminance = getLuminance(textR, textG, textB);
  const minContrast = 4.5;

  if (getContrastRatio(bgLuminance, textLuminance) < minContrast) {
    let adjusted;

    if (bgLuminance > textLuminance) {
      // Background lighter — try darkening text
      const targetEffLum = (bgLuminance + 0.05) / minContrast - 0.05;
      if (targetEffLum >= 0) {
        const v = greyForEffectiveLum(r, g, b, targetEffLum, MIN_TEXT_OPACITY, false);
        adjusted = darkenToLuminance(textR, textG, textB, textLuminance, getLuminance(v, v, v));
      } else {
        const targetEffLum2 = minContrast * (bgLuminance + 0.05) - 0.05;
        const v = greyForEffectiveLum(r, g, b, Math.min(1, targetEffLum2), MIN_TEXT_OPACITY, true);
        adjusted = lightenToLuminance(textR, textG, textB, textLuminance, getLuminance(v, v, v));
      }
    } else {
      // Background darker — try lightening text
      const targetEffLum = minContrast * (bgLuminance + 0.05) - 0.05;
      if (targetEffLum <= 1) {
        const v = greyForEffectiveLum(r, g, b, targetEffLum, MIN_TEXT_OPACITY, true);
        adjusted = lightenToLuminance(textR, textG, textB, textLuminance, getLuminance(v, v, v));
      } else {
        const targetEffLum2 = (bgLuminance + 0.05) / minContrast - 0.05;
        const v = greyForEffectiveLum(r, g, b, Math.max(0, targetEffLum2), MIN_TEXT_OPACITY, false);
        adjusted = darkenToLuminance(textR, textG, textB, textLuminance, getLuminance(v, v, v));
      }
    }

    cardElement.style.setProperty('--card-text-color', `rgb(${adjusted.r}, ${adjusted.g}, ${adjusted.b})`);
  } else {
    cardElement.style.removeProperty('--card-text-color');
  }
}

export function extractAverageColor(imgElement, cardElement) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = imgElement.src;

  img.onload = () => {
    const W = imgElement.offsetWidth || img.naturalWidth;
    const H = imgElement.offsetHeight || img.naturalHeight;
    const borderSizePercent = 0.02; // only use the outer 2% border of the image to avoid skew from central content

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, W, H);

    const bx = Math.round(W * borderSizePercent);
    const by = Math.round(H * borderSizePercent);
    const data = ctx.getImageData(0, 0, W, H).data;

    const OUTLIER_TRIM = 0.10; // discard brightest and darkest 10% to suppress highlight/shadow outliers

    const pixels = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (x >= bx && x < W - bx && y >= by && y < H - by) continue;
        const i = (y * W + x) * 4;
        pixels.push([data[i], data[i + 1], data[i + 2]]);
      }
    }

    pixels.sort((a, b) => getLuminance(...a) - getLuminance(...b));
    const trim = Math.floor(pixels.length * OUTLIER_TRIM);
    const trimmed = pixels.slice(trim, pixels.length - trim);

    let r = 0, g = 0, b = 0;
    for (const [pr, pg, pb] of trimmed) { r += pr; g += pg; b += pb; }
    r = Math.round(r / trimmed.length);
    g = Math.round(g / trimmed.length);
    b = Math.round(b / trimmed.length);

    const rawColor = `${r},${g},${b}`;
    // Broadcast mode: apply the extracted color to all [data-color-card] siblings on the page
    const targets = cardElement.dataset.colorBroadcast === 'true'
      ? Array.from(document.querySelectorAll('[data-color-card="true"]'))
      : [cardElement];

    targets.forEach(target => {
      target.dataset.rawColor = rawColor;
      applyContrastColor(target);
    });
  };

  img.onerror = () => console.error('Failed to load image for color extraction:', imgElement.src);
}

function init() {
  document.querySelectorAll('[data-extract-color="true"]').forEach(img => {
    const card = img.closest('[data-color-card="true"]');
    if (card) {
      if (img.complete) {
        extractAverageColor(img, card);
      } else {
        img.addEventListener('load', () => extractAverageColor(img, card));
      }
    }
  });

  // Re-apply contrast colors whenever the theme changes
  new MutationObserver(() => {
    document.querySelectorAll('[data-color-card="true"]').forEach(applyContrastColor);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
