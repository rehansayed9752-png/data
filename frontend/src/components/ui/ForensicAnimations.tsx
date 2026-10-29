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
 * Compact crime-lab biometric wireframe scanner widget for the law enforcement login terminal.
 */
export const ForensicLoginScanner: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative mx-auto flex flex-col items-center justify-center p-3 select-none w-full max-w-[260px]"
    >
      <style>{`
        @keyframes miniRadarSweep {
          0%, 100% {
            transform: translateY(-48px);
            opacity: 0.4;
          }
          50% {
            transform: translateY(48px);
            opacity: 0.95;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .forensic-mini-radar {
            animation: none !important;
            transform: translateY(0) !important;
          }
        }
      `}</style>

      {/* Screen Container */}
      <div className="relative flex h-36 w-36 items-center justify-center rounded-2xl border border-slate-700/70 bg-slate-900/90 shadow-inner overflow-hidden">
        {/* Subtle Coordinate Matrix Grid */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(56,189,248,0.5) 1px, transparent 1px)',
            backgroundSize: '14px 14px',
          }}
        />

        {/* Minimal Craniofacial Wireframe SVG with 8 Anatomical Nodes */}
        <svg viewBox="0 0 100 120" className="h-28 w-24 stroke-cyan-400/75 fill-none" strokeWidth="1.4">
          {/* Cranial & Mandibular Contour */}
          <path d="M25,35 C25,14 75,14 75,35 C75,62 68,85 50,98 C32,85 25,62 25,35 Z" />
          
          {/* Internal Biometric Mesh Lines */}
          <line x1="26" y1="48" x2="74" y2="48" strokeDasharray="2 2" className="stroke-cyan-500/40" />
          <line x1="50" y1="18" x2="50" y2="96" strokeDasharray="2 2" className="stroke-cyan-500/40" />
          <polyline points="35,46 50,64 65,46" className="stroke-cyan-400/40" />
          <polyline points="38,76 50,80 62,76" className="stroke-cyan-400/60" />

          {/* Pulsing Landmark Nodes (Left/Right Eye, Nose Tip, Cheekbones, Mental Protuberance) */}
          <circle cx="37" cy="46" r="2.2" className="fill-cyan-300 animate-pulse" />
          <circle cx="63" cy="46" r="2.2" className="fill-cyan-300 animate-pulse" />
          <circle cx="50" cy="63" r="1.8" className="fill-cyan-300" />
          <circle cx="32" cy="70" r="1.6" className="fill-cyan-400/80" />
          <circle cx="68" cy="70" r="1.6" className="fill-cyan-400/80" />
          <circle cx="50" cy="96" r="2" className="fill-cyan-300 animate-pulse" />
        </svg>

        {/* Sweeping Mini Horizontal Laser Bar */}
        <div
          className="forensic-mini-radar absolute inset-x-3 h-[1.5px] bg-cyan-400 shadow-[0_0_10px_2px_rgba(34,211,238,0.8)]"
          style={{ animation: 'miniRadarSweep 3.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
        />

        {/* Viewport Corner Ticks */}
        <div className="absolute top-2 left-2 h-3 w-3 border-t border-l border-cyan-400/60" />
        <div className="absolute top-2 right-2 h-3 w-3 border-t border-r border-cyan-400/60" />
        <div className="absolute bottom-2 left-2 h-3 w-3 border-b border-l border-cyan-400/60" />
        <div className="absolute bottom-2 right-2 h-3 w-3 border-b border-r border-cyan-400/60" />
      </div>

      {/* Terminal Readout Header */}
      <div className="mt-2.5 flex items-center gap-2 text-[11px] font-mono tracking-widest text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>FORENSIC ID TERMINAL // READY</span>
      </div>

      {/* Telemetry Micro-Readouts */}
      <div className="mt-3 w-full space-y-1.5 border-t border-zinc-800/80 pt-2 text-[10px] font-mono text-zinc-400">
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">BIOMETRIC ENGINE:</span>
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" /> ONLINE
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">14-REGION LOCK:</span>
          <span className="text-cyan-400 font-medium">READY</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">SHA-256 AUDIT:</span>
          <span className="text-zinc-300 font-medium">VERIFIED</span>
        </div>
      </div>
    </div>
  );
};
