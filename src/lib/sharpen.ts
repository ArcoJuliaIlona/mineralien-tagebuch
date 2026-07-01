/**
 * Client-side unsharp-mask-style sharpening via canvas 3x3 convolution.
 * Returns a data URL for the sharpened image; falls back to the source URL on error.
 *
 * `amount` 0..1 blends between the original and a hard sharpen kernel.
 */
export async function sharpenImageUrl(src: string, amount = 0.6): Promise<string> {
  const img = await loadImage(src);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const out = convolveSharpen(imageData, amount);
  ctx.putImageData(out, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.95);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function convolveSharpen(src: ImageData, amount: number): ImageData {
  const { data, width, height } = src;
  const out = new ImageData(width, height);
  const dst = out.data;
  // Kernel = identity * (1 - a) + sharpen * a
  const a = Math.max(0, Math.min(1, amount));
  const center = 1 * (1 - a) + 5 * a;
  const side = 0 * (1 - a) + -1 * a;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const idx = i + c;
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
          dst[idx] = data[idx];
          continue;
        }
        const top = data[idx - width * 4];
        const bot = data[idx + width * 4];
        const lft = data[idx - 4];
        const rgt = data[idx + 4];
        const v = data[idx] * center + (top + bot + lft + rgt) * side;
        dst[idx] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
      dst[i + 3] = data[i + 3];
    }
  }
  return out;
}