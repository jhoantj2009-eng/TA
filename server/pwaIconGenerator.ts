import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export interface GeneratedPwaIconBuffers {
  version: string;
  icon180: Buffer;
  icon192: Buffer;
  icon512: Buffer;
  iconMaskable512: Buffer;
}

export interface GeneratedPwaIconDataUrls {
  version: string;
  icon180: string;
  icon192: string;
  icon512: string;
  iconMaskable512: string;
}

function bufferToPngDataUrl(buf: Buffer): string {
  return `data:image/png;base64,${buf.toString('base64')}`;
}

async function renderSquarePngBuffer(
  sourceBuffer: Buffer,
  size: number,
  paddingRatio: number
): Promise<Buffer> {
  const safeMargin = Math.round(size * paddingRatio);
  const innerSize = Math.max(1, size - safeMargin * 2);

  // Redimensionar conservando relación de aspecto sin recortar y aplanar sobre fondo blanco sólido
  const resized = await sharp(sourceBuffer, { density: 300 })
    .rotate()
    .resize(innerSize, innerSize, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
      kernel: sharp.kernel.lanczos3,
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ compressionLevel: 9 })
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

export function decodeImageDataUrl(dataUrl: string): Buffer | null {
  if (typeof dataUrl !== 'string') return null;
  const trimmed = dataUrl.trim();
  const base64Match = trimmed.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/s);
  if (base64Match) {
    return Buffer.from(base64Match[1], 'base64');
  }
  const utf8SvgMatch = trimmed.match(/^data:image\/svg\+xml(?:;charset=[^;,]+)?,(.+)$/s);
  if (utf8SvgMatch) {
    return Buffer.from(decodeURIComponent(utf8SvgMatch[1]), 'utf-8');
  }
  return null;
}

export async function generatePwaIconsFromBuffer(
  sourceBuffer: Buffer
): Promise<GeneratedPwaIconBuffers> {
  const version = crypto.createHash('sha256').update(sourceBuffer).digest('hex').slice(0, 10);

  const [icon180, icon192, icon512, iconMaskable512] = await Promise.all([
    renderSquarePngBuffer(sourceBuffer, 180, 0.1),
    renderSquarePngBuffer(sourceBuffer, 192, 0.1),
    renderSquarePngBuffer(sourceBuffer, 512, 0.1),
    renderSquarePngBuffer(sourceBuffer, 512, 0.18),
  ]);

  return {
    version,
    icon180,
    icon192,
    icon512,
    iconMaskable512,
  };
}

export async function generatePwaIconDataUrlsFromLogo(
  logoDataUrl: string
): Promise<GeneratedPwaIconDataUrls | null> {
  const sourceBuffer = decodeImageDataUrl(logoDataUrl);
  if (!sourceBuffer || sourceBuffer.length === 0) return null;

  const buffers = await generatePwaIconsFromBuffer(sourceBuffer);
  return {
    version: buffers.version,
    icon180: bufferToPngDataUrl(buffers.icon180),
    icon192: bufferToPngDataUrl(buffers.icon192),
    icon512: bufferToPngDataUrl(buffers.icon512),
    iconMaskable512: bufferToPngDataUrl(buffers.iconMaskable512),
  };
}

/**
 * Encuentra la imagen de logotipo corporativo suministrada en el proyecto (plantilla o archivo estático)
 * en orden de prioridad:
 * 1. data/header-config.json (campo `logo`, si fue guardado como plantilla)
 * 2. public/company_logo.{png,jpg,jpeg,webp,svg}
 */
export function resolveProjectCompanyLogoBuffer(projectRoot: string): Buffer | null {
  const headerConfigPath = path.join(projectRoot, 'data', 'header-config.json');
  if (fs.existsSync(headerConfigPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(headerConfigPath, 'utf-8'));
      if (parsed && typeof parsed.logo === 'string' && parsed.logo.trim()) {
        const buf = decodeImageDataUrl(parsed.logo);
        if (buf && buf.length > 0) {
          return buf;
        }
      }
    } catch {
      // Continuar a los archivos de public/
    }
  }

  const candidateFiles = [
    'public/company_logo.png',
    'public/company_logo.jpg',
    'public/company_logo.jpeg',
    'public/company_logo.webp',
    'public/company_logo.svg',
  ];

  for (const rel of candidateFiles) {
    const fullPath = path.join(projectRoot, rel);
    if (fs.existsSync(fullPath)) {
      const buf = fs.readFileSync(fullPath);
      if (buf.length > 0) return buf;
    }
  }

  return null;
}
