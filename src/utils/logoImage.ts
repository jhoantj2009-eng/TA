/**
 * Normaliza y comprime la imagen del logo corporativo cargada por el usuario
 * para garantizar nitidez en PDF/encabezado, compatibilidad con localStorage y sincronización en Firestore (<= 160 KB).
 */
export function normalizeUploadedLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen del logo'));
    reader.onloadend = () => {
      const rawDataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!rawDataUrl) {
        reject(new Error('Imagen vacía'));
        return;
      }

      // Mantener SVG o imágenes livianas directamente si ya son compactas
      if (file.type === 'image/svg+xml' && rawDataUrl.length <= 150_000) {
        resolve(rawDataUrl);
        return;
      }
      if (rawDataUrl.length <= 140_000 && !file.type.includes('bmp')) {
        resolve(rawDataUrl);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const maxSides = [720, 560, 440, 340];
          const prefersPng = file.type === 'image/png' || file.type === 'image/webp';
          let best = rawDataUrl;

          for (const maxSide of maxSides) {
            const scale = Math.min(
              1,
              maxSide / Math.max(img.naturalWidth || 1, img.naturalHeight || 1)
            );
            const w = Math.max(1, Math.round((img.naturalWidth || maxSide) * scale));
            const h = Math.max(1, Math.round((img.naturalHeight || maxSide) * scale));

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) break;

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            if (prefersPng) {
              ctx.clearRect(0, 0, w, h);
              ctx.drawImage(img, 0, 0, w, h);
              const pngCandidate = canvas.toDataURL('image/png');
              if (pngCandidate.length < best.length) {
                best = pngCandidate;
              }
              if (pngCandidate.length <= 155_000) {
                resolve(pngCandidate);
                return;
              }
            }

            // Respaldo JPEG con fondo blanco limpio si el PNG sigue excediendo el límite de nube
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            const jpgCandidate = canvas.toDataURL('image/jpeg', 0.88);
            if (jpgCandidate.length < best.length) {
              best = jpgCandidate;
            }
            if (jpgCandidate.length <= 155_000) {
              resolve(jpgCandidate);
              return;
            }
          }

          resolve(best);
        } catch {
          resolve(rawDataUrl);
        }
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}
