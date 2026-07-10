// ---------------------------------------------------------------------------
// BLURHASH → dataURL (LQIP placeholder). Backend her yüklenen görsel için blurhash
// üretir (product_images.blurhash). Burada 32x32 çözünürlükte decode edilip küçük
// bir bulanık önizleme dataURL'i çıkarılır. Hata olursa null döner → çağıran
// premium shimmer'a düşer (kırılma yok). Yalnız client'ta çalışır (canvas gerektirir).
// Referans algoritma: woltapp/blurhash (public domain / MIT).
// ---------------------------------------------------------------------------

const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";

function decode83(str: string): number {
  let value = 0;
  for (const ch of str) {
    const idx = DIGITS.indexOf(ch);
    if (idx === -1) throw new Error("invalid blurhash char");
    value = value * 83 + idx;
  }
  return value;
}

function sRGBToLinear(v: number): number {
  const x = v / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}
function linearTosRGB(v: number): number {
  const x = Math.max(0, Math.min(1, v));
  return Math.round((x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055) * 255 + 0.5);
}
function signPow(v: number, exp: number): number {
  return (v < 0 ? -1 : 1) * Math.pow(Math.abs(v), exp);
}

function decodeDC(value: number): [number, number, number] {
  return [sRGBToLinear(value >> 16), sRGBToLinear((value >> 8) & 255), sRGBToLinear(value & 255)];
}
function decodeAC(value: number, maxVal: number): [number, number, number] {
  const q = Math.floor(value / (19 * 19));
  const g = Math.floor(value / 19) % 19;
  const b = value % 19;
  return [signPow((q - 9) / 9, 2) * maxVal, signPow((g - 9) / 9, 2) * maxVal, signPow((b - 9) / 9, 2) * maxVal];
}

function decodePixels(blurhash: string, width: number, height: number, punch = 1): Uint8ClampedArray {
  if (!blurhash || blurhash.length < 6) throw new Error("blurhash too short");
  const sizeFlag = decode83(blurhash[0]);
  const numY = Math.floor(sizeFlag / 9) + 1;
  const numX = (sizeFlag % 9) + 1;
  const quantMax = decode83(blurhash[1]);
  const maxValue = (quantMax + 1) / 166;

  const colors: Array<[number, number, number]> = [];
  const total = numX * numY;
  for (let i = 0; i < total; i++) {
    if (i === 0) {
      colors.push(decodeDC(decode83(blurhash.substring(2, 6))));
    } else {
      const v = decode83(blurhash.substring(4 + i * 2, 6 + i * 2));
      colors.push(decodeAC(v, maxValue * punch));
    }
  }

  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      for (let j = 0; j < numY; j++) {
        for (let i = 0; i < numX; i++) {
          const basis = Math.cos((Math.PI * x * i) / width) * Math.cos((Math.PI * y * j) / height);
          const color = colors[i + j * numX];
          r += color[0] * basis;
          g += color[1] * basis;
          b += color[2] * basis;
        }
      }
      const idx = 4 * (x + y * width);
      pixels[idx] = linearTosRGB(r);
      pixels[idx + 1] = linearTosRGB(g);
      pixels[idx + 2] = linearTosRGB(b);
      pixels[idx + 3] = 255;
    }
  }
  return pixels;
}

/** blurhash → küçük bulanık dataURL. Hata/SSR'de null (çağıran shimmer'a düşer). */
export function blurhashToDataURL(blurhash: string | null | undefined, size = 32): string | null {
  if (!blurhash || typeof document === "undefined") return null;
  try {
    const pixels = decodePixels(blurhash, size, size);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const imageData = ctx.createImageData(size, size);
    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
  } catch {
    return null;
  }
}
