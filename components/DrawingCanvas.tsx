
import React, { useEffect, useRef } from 'react';
import SignaturePad from 'signature_pad';

interface DrawingCanvasProps {
  backgroundImage?: string;
  penColor?: string;
  className?: string;
  onInit?: (pad: SignaturePad) => void;
  readOnly?: boolean;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ 
  backgroundImage, 
  penColor = '#5b8cff', 
  className = "",
  onInit,
  readOnly = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const pad = new SignaturePad(canvasRef.current, {
        penColor: penColor,
        backgroundColor: 'rgba(0,0,0,0)',
      });
      padRef.current = pad;
      if (onInit) onInit(pad);
      
      if (readOnly) {
        pad.off();
      }
    }

    const handleResize = () => {
      // Basic responsive canvas logic
      if (canvasRef.current && padRef.current) {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvasRef.current.width = canvasRef.current.offsetWidth * ratio;
        canvasRef.current.height = canvasRef.current.offsetHeight * ratio;
        canvasRef.current.getContext("2d")?.scale(ratio, ratio);
        padRef.current.clear(); // clearing on resize to keep it simple
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      padRef.current?.off();
    };
  }, [onInit, readOnly]);

  useEffect(() => {
    if (padRef.current) {
      padRef.current.penColor = penColor;
    }
  }, [penColor]);

  return (
    <div 
      className={`relative border-2 border-slate-700 rounded-xl overflow-hidden bg-slate-900 ${className}`}
      style={{ 
        aspectRatio: '16/10',
        backgroundImage: backgroundImage ? `url('${backgroundImage}')` : 'none',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center'
      }}
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block cursor-crosshair"
      />
    </div>
  );
};

export default DrawingCanvas;
