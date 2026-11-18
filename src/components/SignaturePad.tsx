import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Check } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  initialValue?: string;
  label?: string;
  onValidityChange?: (isValid: boolean) => void;
}

/**
 * Checks whether a canvas element has no drawn pixels (alpha === 0 everywhere).
 */
export function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return true;
  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function SignaturePad({ onSave, initialValue, label = 'Firma', onValidityChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!initialValue);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (initialValue) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const blank = isCanvasBlank(canvas);
        setHasSignature(!blank);
        onValidityChange?.(!blank);
      };
      img.src = initialValue;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
      onValidityChange?.(false);
    }
  }, [initialValue, onValidityChange]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
    onValidityChange?.(true);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      save(); // Auto-save when drawing stops
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onValidityChange?.(false);
    onSave('');
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blank = isCanvasBlank(canvas);
    if (blank) {
      setHasSignature(false);
      onValidityChange?.(false);
      onSave('');
    } else {
      setHasSignature(true);
      onValidityChange?.(true);
      onSave(canvas.toDataURL('image/png'));
    }
  };

  return (
    <div className="flex flex-col items-center border border-gray-300 rounded-md p-2 bg-white w-full">
      <div className="flex justify-between w-full mb-2 text-sm text-gray-500 font-medium">
        <span>{label}</span>
        <div className="flex gap-2 print:hidden">
          <button type="button" onClick={clear} className="text-red-500 hover:text-red-700 flex items-center gap-1" title="Limpiar">
            <Eraser size={14} />
          </button>
          <button type="button" onClick={save} className="text-emerald-600 hover:text-emerald-800 flex items-center gap-1" title="Guardar">
            <Check size={14} />
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={200}
        className="border border-dashed border-gray-300 rounded cursor-crosshair touch-none w-full bg-gray-50 print:border-none print:bg-transparent min-h-[100px] sm:min-h-[150px]"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
    </div>
  );
}
