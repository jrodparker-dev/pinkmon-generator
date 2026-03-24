export type Rgb = { r: number; g: number; b: number };

export type PokeballAsset = {
  name: string;
  url: string;
  color: Rgb;
};

function distance(a: Rgb, b: Rgb): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

function averageColorFromData(data: Uint8ClampedArray): Rgb {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 20) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count += 1;
  }

  if (!count) return { r: 127, g: 127, b: 127 };

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
}

export async function getAverageColor(url: string): Promise<Rgb> {
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
  if (!ctx) return { r: 127, g: 127, b: 127 };

  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return averageColorFromData(imageData.data);
}

export function pickBestBall(target: Rgb, balls: PokeballAsset[]): PokeballAsset | null {
  if (!balls.length) return null;

  let best = balls[0];
  let bestDistance = distance(target, best.color);

  for (let i = 1; i < balls.length; i++) {
    const score = distance(target, balls[i].color);
    if (score < bestDistance) {
      best = balls[i];
      bestDistance = score;
    }
  }

  return best;
}
