export type Rgb = { r: number; g: number; b: number };

export type ImageColorProfile = {
  average: Rgb;
  chroma: Rgb;
  blackRatio: number;
  whiteRatio: number;
  palette: Rgb[];
  pixelCount: number;
};

export type PokeballAsset = {
  name: string;
  url: string;
  color: Rgb;
  profile?: ImageColorProfile;
};

const FALLBACK_GRAY: Rgb = { r: 127, g: 127, b: 127 };

function distance(a: Rgb, b: Rgb): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

function luma(c: Rgb): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

function saturation(c: Rgb): number {
  return Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
}

function quantize(c: Rgb): Rgb {
  const step = 32;
  return {
    r: Math.max(0, Math.min(255, Math.round(c.r / step) * step)),
    g: Math.max(0, Math.min(255, Math.round(c.g / step) * step)),
    b: Math.max(0, Math.min(255, Math.round(c.b / step) * step)),
  };
}

function avg(sum: Rgb, count: number, fallback: Rgb): Rgb {
  if (!count) return fallback;
  return {
    r: Math.round(sum.r / count),
    g: Math.round(sum.g / count),
    b: Math.round(sum.b / count),
  };
}

function buildMixedPalette(colors: Rgb[]): Rgb[] {
  const out = colors.slice();
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      out.push({
        r: Math.round((colors[i].r + colors[j].r) / 2),
        g: Math.round((colors[i].g + colors[j].g) / 2),
        b: Math.round((colors[i].b + colors[j].b) / 2),
      });
    }
  }
  return out;
}

function analyzeImageData(data: Uint8ClampedArray): ImageColorProfile {
  let pixelCount = 0;
  let blackCount = 0;
  let whiteCount = 0;
  let chromaCount = 0;

  const avgSum: Rgb = { r: 0, g: 0, b: 0 };
  const chromaSum: Rgb = { r: 0, g: 0, b: 0 };
  const buckets = new Map<string, { color: Rgb; count: number }>();

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 20) continue;

    const color: Rgb = { r: data[i], g: data[i + 1], b: data[i + 2] };
    pixelCount += 1;
    avgSum.r += color.r;
    avgSum.g += color.g;
    avgSum.b += color.b;

    const bright = luma(color);
    const sat = saturation(color);
    const isBlack = bright <= 30;
    const isWhite = bright >= 225 && sat <= 40;

    if (isBlack) {
      blackCount += 1;
      continue;
    }
    if (isWhite) {
      whiteCount += 1;
      continue;
    }

    chromaCount += 1;
    chromaSum.r += color.r;
    chromaSum.g += color.g;
    chromaSum.b += color.b;

    const q = quantize(color);
    const key = `${q.r}-${q.g}-${q.b}`;
    const hit = buckets.get(key);
    if (hit) hit.count += 1;
    else buckets.set(key, { color: q, count: 1 });
  }

  const average = avg(avgSum, pixelCount, FALLBACK_GRAY);
  const chroma = avg(chromaSum, chromaCount, average);
  const palette = Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map((x) => x.color);

  return {
    average,
    chroma,
    blackRatio: pixelCount ? blackCount / pixelCount : 0,
    whiteRatio: pixelCount ? whiteCount / pixelCount : 0,
    palette: palette.length ? palette : [chroma],
    pixelCount: pixelCount || 1,
  };
}

export function mergeColorProfiles(profiles: ImageColorProfile[]): ImageColorProfile | null {
  if (!profiles.length) return null;

  let pixels = 0;
  let black = 0;
  let white = 0;
  const avgSum: Rgb = { r: 0, g: 0, b: 0 };
  const chromaSum: Rgb = { r: 0, g: 0, b: 0 };
  const palette = new Map<string, { color: Rgb; weight: number }>();

  for (const p of profiles) {
    const w = p.pixelCount;
    pixels += w;
    black += p.blackRatio * w;
    white += p.whiteRatio * w;
    avgSum.r += p.average.r * w;
    avgSum.g += p.average.g * w;
    avgSum.b += p.average.b * w;
    chromaSum.r += p.chroma.r * w;
    chromaSum.g += p.chroma.g * w;
    chromaSum.b += p.chroma.b * w;

    for (const c of p.palette) {
      const q = quantize(c);
      const key = `${q.r}-${q.g}-${q.b}`;
      const hit = palette.get(key);
      if (hit) hit.weight += w;
      else palette.set(key, { color: q, weight: w });
    }
  }

  const topPalette = Array.from(palette.values())
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((x) => x.color);

  return {
    average: avg(avgSum, pixels, FALLBACK_GRAY),
    chroma: avg(chromaSum, pixels, FALLBACK_GRAY),
    blackRatio: black / pixels,
    whiteRatio: white / pixels,
    palette: topPalette.length ? topPalette : [FALLBACK_GRAY],
    pixelCount: pixels,
  };
}

export async function getColorProfile(url: string): Promise<ImageColorProfile> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      average: FALLBACK_GRAY,
      chroma: FALLBACK_GRAY,
      blackRatio: 0,
      whiteRatio: 0,
      palette: [FALLBACK_GRAY],
      pixelCount: 1,
    };
  }

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return analyzeImageData(imageData.data);
}

export const corsSafeImageUrl = (url: string): string => {
  const noProto = url.replace(/^https?:\/\//, '');
  return `https://images.weserv.nl/?url=${encodeURIComponent(noProto)}`;
};

function scoreBallAgainstProfile(sprite: ImageColorProfile, ball: PokeballAsset): number {
  const ballProfile = ball.profile;
  if (!ballProfile) return distance(sprite.chroma, ball.color);

  const spriteColors = buildMixedPalette(sprite.palette.slice(0, 4));
  const ballColors = buildMixedPalette(ballProfile.palette.slice(0, 4));

  let bestColorDistance = Infinity;
  for (const a of spriteColors) {
    for (const b of ballColors) {
      const d = distance(a, b);
      if (d < bestColorDistance) bestColorDistance = d;
    }
  }

  const bwMajority = Math.max(sprite.blackRatio, sprite.whiteRatio) > 0.5;
  const bwWeight = bwMajority ? 220 : 90;
  const bwDiff = Math.abs(sprite.blackRatio - ballProfile.blackRatio) + Math.abs(sprite.whiteRatio - ballProfile.whiteRatio);

  return bestColorDistance + bwDiff * bwWeight;
}

export function pickBestBallForProfile(profile: ImageColorProfile, balls: PokeballAsset[]): PokeballAsset | null {
  if (!balls.length) return null;

  let best = balls[0];
  let bestScore = scoreBallAgainstProfile(profile, best);

  for (let i = 1; i < balls.length; i++) {
    const score = scoreBallAgainstProfile(profile, balls[i]);
    if (score < bestScore) {
      best = balls[i];
      bestScore = score;
    }
  }

  return best;
}
