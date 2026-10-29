import React, { useEffect, useState } from 'react';

/**
 * ForensicScanOverlay
 * Active biometric laser-scan HUD rendered over the composite image viewport
 * while the forensic generation or refinement pipeline is executing.
 */
export const ForensicScanOverlay: React.FC<{ isGenerating: boolean }> = ({ isGenerating }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = [
    'PARSING WITNESS STATEMENT...',
    'MAPPING 14 CRANIOFACIAL LANDMARKS...',
    'LOCKING IDENTITY SEED & PROPORTIONS...',
    'SHADING FORENSIC GRAPHITE COMPOSITE...',
  ];

  useEffect(() => {
    if (!isGenerating) {
      setStepIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setStepIndex(prev => (prev + 1) % steps.length);
    }, 1400);
    return () => clearInterval(interval);
  }, [isGenerating]);

  if (!isGenerating) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Forensic biometric synthesis in progress"
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden bg-slate-950/35 backdrop-blur-[1.5px]"
    >
      <style>{`
        @keyframes forensicScanSweep {
          0%, 100% {
            top: 4%;
            opacity: 0.85;
          }
          50% {
            top: 94%;
            opacity: 1;
          }
        }
        @keyframes forensicRadarPulse {
          0%, 100% {
            transform: scale(0.98);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.02);
            opacity: 0.6;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .forensic-scan-laser {
            animation: none !important;
            top: 50% !important;
          }
          .forensic-reticle-pulse {
            animation: none !important;
          }
        }
      `}</style>

      {/* Subtle 32px Forensic Coordinate Grid Overlay */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(56, 189, 248, 0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.35) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* 4 Corner HUD Alignment Brackets */}
      <div className="absolute top-4 left-4 h-6 w-6 border-t-2 border-l-2 border-cyan-400/80" />
      <div className="absolute top-4 right-4 h-6 w-6 border-t-2 border-r-2 border-cyan-400/80" />
      <div className="absolute bottom-4 left-4 h-6 w-6 border-b-2 border-l-2 border-cyan-400/80" />
      <div className="absolute bottom-4 right-4 h-6 w-6 border-b-2 border-r-2 border-cyan-400/80" />

      {/* Center Cranial Alignment Reticle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="forensic-reticle-pulse relative h-56 w-44 rounded-full border border-dashed border-cyan-400/35"
          style={{ animation: 'forensicRadarPulse 3s ease-in-out infinite' }}
        >
          {/* Anatomical Alignment Axes */}
          <div className="absolute top-1/3 left-3 right-3 border-t border-cyan-400/25" />
          <div className="absolute top-2/3 left-6 right-6 border-t border-cyan-400/25" />
          <div className="absolute inset-y-3 left-1/2 border-l border-cyan-400/25" />
        </div>
      </div>

      {/* Sweeping Cyan Forensic Laser Bar with Gradient Trail */}
      <div
        className="forensic-scan-laser absolute left-0 right-0 h-[2px] bg-cyan-400 shadow-[0_0_16px_3px_rgba(34,211,238,0.85)]"
        style={{ animation: 'forensicScanSweep 2.6s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
      >
        <div className="h-10 w-full -translate-y-full bg-gradient-to-t from-cyan-400/25 to-transparent" />
      </div>

      {/* Bottom Telemetry Status Pill */}
      <div className="absolute bottom-5 inset-x-0 flex justify-center px-4">
        <div className="flex items-center gap-2.5 rounded-full border border-cyan-500/40 bg-slate-900/90 px-4 py-1.5 text-xs font-mono tracking-wider text-cyan-300 shadow-lg backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="truncate">{steps[stepIndex]}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * ForensicLoginScanner
 * Huge biometric square scanner frame with high-fidelity multi-polygon 3D wireframe SVG
 * and sweeping laser beam for the law enforcement login gateway.
 */
export const ForensicLoginScanner: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none flex flex-col items-center justify-center select-none"
    >
      <style>{`
        @keyframes largeForensicLaser {
          0%, 100% {
            top: 8%;
            opacity: 0.75;
          }
          50% {
            top: 90%;
            opacity: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .forensic-large-laser {
            animation: none !important;
            top: 50% !important;
          }
        }
      `}</style>

      {/* Huge Square Biometric Scanner Frame */}
      <div className="relative flex h-[360px] w-[360px] sm:h-[400px] sm:w-[400px] lg:h-[420px] lg:w-[420px] items-center justify-center rounded-3xl border border-slate-700/80 bg-[#111827]/85 shadow-[0_0_50px_rgba(0,0,0,0.65)] backdrop-blur-md overflow-hidden">
        {/* Inner Subtle Frame */}
        <div className="absolute inset-3 rounded-2xl border border-slate-800/90" />

        {/* Subtle Coordinate Grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(34,211,238,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(34,211,238,0.18) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Large Corner HUD Brackets */}
        <div className="absolute top-7 left-7 h-8 w-8 border-t-2 border-l-2 border-cyan-400/70 rounded-tl-sm" />
        <div className="absolute top-7 right-7 h-8 w-8 border-t-2 border-r-2 border-cyan-400/70 rounded-tr-sm" />
        <div className="absolute bottom-7 left-7 h-8 w-8 border-b-2 border-l-2 border-cyan-400/70 rounded-bl-sm" />
        <div className="absolute bottom-7 right-7 h-8 w-8 border-b-2 border-r-2 border-cyan-400/70 rounded-br-sm" />

        {/* Detailed Polygon Craniofacial Wireframe SVG */}
        <svg
          viewBox="0 0 200 240"
          className="h-[290px] w-[250px] stroke-cyan-400/80 fill-none drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]"
          strokeWidth="1.2"
        >
          {/* Outer Cranium & Jawline Polygon */}
          <polygon points="100,16 142,26 164,58 168,105 158,154 134,198 100,222 66,198 42,154 32,105 36,58 58,26" />

          {/* Inner Forehead & Temple Mesh */}
          <polyline points="58,26 76,52 100,48 124,52 142,26" />
          <polyline points="36,58 62,74 100,72 138,74 164,58" />
          <line x1="100" y1="16" x2="100" y2="222" className="stroke-cyan-400/40" strokeDasharray="3 3" />

          {/* Brow Ridge & Eye Sockets */}
          <polygon points="52,92 68,84 86,92 82,104 64,106" className="stroke-cyan-300" />
          <polygon points="148,92 132,84 114,92 118,104 136,106" className="stroke-cyan-300" />
          <line x1="32" y1="105" x2="52" y2="92" />
          <line x1="168" y1="105" x2="148" y2="92" />
          <line x1="86" y1="92" x2="114" y2="92" />

          {/* Nasal Bridge & Pyramid */}
          <polygon points="100,72 88,134 100,144 112,134" />
          <line x1="86" y1="92" x2="88" y2="134" />
          <line x1="114" y1="92" x2="112" y2="134" />

          {/* Cheekbones & Midface Triangles */}
          <polyline points="32,105 56,136 88,134" />
          <polyline points="168,105 144,136 112,134" />
          <line x1="64" y1="106" x2="56" y2="136" />
          <line x1="136" y1="106" x2="144" y2="136" />
          <line x1="56" y1="136" x2="74" y2="170" />
          <line x1="144" y1="136" x2="126" y2="170" />
          <line x1="42" y1="154" x2="56" y2="136" />
          <line x1="158" y1="154" x2="144" y2="136" />

          {/* Mouth & Lips Mesh */}
          <polygon points="74,170 90,164 100,167 110,164 126,170 112,182 88,182" />
          <line x1="74" y1="170" x2="126" y2="170" />
          <line x1="88" y1="134" x2="74" y2="170" />
          <line x1="112" y1="134" x2="126" y2="170" />

          {/* Chin & Mandible Connections */}
          <polyline points="42,154 74,170 88,182 100,222 112,182 126,170 158,154" />
          <polyline points="66,198 88,182" />
          <polyline points="134,198 112,182" />

          {/* Glowing Anatomical Landmark Nodes */}
          {[
            [62, 74],
            [138, 74],
            [86, 92],
            [114, 92],
            [52, 92],
            [148, 92],
            [100, 144],
            [56, 136],
            [144, 136],
            [74, 170],
            [126, 170],
            [66, 198],
            [134, 198],
            [100, 222],
          ].map(([cx, cy], idx) => (
            <circle
              key={idx}
              cx={cx}
              cy={cy}
              r="3"
              className="fill-cyan-300 stroke-cyan-100 animate-pulse"
            />
          ))}
        </svg>

        {/* Sweeping Horizontal Cyan Laser Beam */}
        <div
          className="forensic-large-laser absolute inset-x-4 h-[2px] bg-cyan-300 shadow-[0_0_20px_4px_rgba(34,211,238,0.95)]"
          style={{ animation: 'largeForensicLaser 3.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
        >
          <div className="h-14 w-full -translate-y-1/2 bg-gradient-to-b from-transparent via-cyan-400/25 to-transparent" />
        </div>
      </div>

      {/* Single Minimal Caption Underneath */}
      <div className="mt-4 flex items-center gap-2.5 text-xs font-mono tracking-[0.2em] text-slate-400 uppercase">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>FORENSIC ID TERMINAL // READY</span>
      </div>
    </div>
  );
};
