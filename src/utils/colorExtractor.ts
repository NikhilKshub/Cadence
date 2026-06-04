export async function extractDominantColor(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 50;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('#7c3aed');
        return;
      }
      ctx.drawImage(img, 0, 0, 50, 50);
      let data;
      try {
        data = ctx.getImageData(0, 0, 50, 50).data;
      } catch (e) {
        resolve('#7c3aed');
        return;
      }

      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let count = 0;

      for (let i = 0; i < data.length; i += 20) { // Sample every 5th pixel (4 channels * 5 = 20)
        const r = data[i]!;
        const g = data[i + 1]!;
        const b = data[i + 2]!;
        const a = data[i + 3]!;

        if (a < 128) continue; // Skip mostly transparent

        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        if (brightness < 30 || brightness > 220) continue; // Skip too dark or too light

        rSum += r;
        gSum += g;
        bSum += b;
        count++;
      }

      if (count === 0) {
        resolve('#7c3aed');
        return;
      }

      let rAvg = Math.round(rSum / count);
      let gAvg = Math.round(gSum / count);
      let bAvg = Math.round(bSum / count);

      // Convert to HSL to check saturation
      const rNorm = rAvg / 255;
      const gNorm = gAvg / 255;
      const bNorm = bAvg / 255;
      const max = Math.max(rNorm, gNorm, bNorm);
      const min = Math.min(rNorm, gNorm, bNorm);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
          case gNorm: h = (bNorm - rNorm) / d + 2; break;
          case bNorm: h = (rNorm - gNorm) / d + 4; break;
        }
        h /= 6;
      }

      // If saturation < 30%, boost to 50%
      if (s < 0.3) {
        s = 0.5;
        // Convert back to RGB
        const hue2rgb = (p: number, q: number, t: number) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        rAvg = Math.round(hue2rgb(p, q, h + 1/3) * 255);
        gAvg = Math.round(hue2rgb(p, q, h) * 255);
        bAvg = Math.round(hue2rgb(p, q, h - 1/3) * 255);
      }

      const toHex = (n: number) => n.toString(16).padStart(2, '0');
      resolve(`#${toHex(rAvg)}${toHex(gAvg)}${toHex(bAvg)}`);
    };
    img.onerror = () => {
      resolve('#7c3aed');
    };
    img.src = imageSrc;
  });
}

export function applyAccentColor(hexColor: string): void {
  document.documentElement.classList.add('color-transitioning');
  setTimeout(() => {
    document.documentElement.style.setProperty('--color-accent', hexColor);
    document.documentElement.style.setProperty('--color-accent-subtle', hexColor + '20');
  }, 50);
  setTimeout(() => {
    document.documentElement.classList.remove('color-transitioning');
  }, 1050);
}

export function resetAccentColor(): void {
  applyAccentColor('#7c3aed');
}
