import React, { useState, useRef } from 'react';
import {
  Sliders,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  Shield,
  Layers,
  Sparkles,
  Info,
  Maximize2,
  AlertCircle,
  FileCheck,
  Check,
  Glasses,
  Scissors,
  HelpCircle,
} from 'lucide-react';
import { SketchIteration, FacialStateJSON, RenderStyle, DisguiseOption } from '../../types/forensic';
import { DISGUISE_OPTIONS } from '../../data/mockForensicData';
import { generateForensicSketchDataUrl } from '../../utils/proceduralSketch';

interface CanvasViewerProps {
  currentIteration: SketchIteration;
  previousIteration: SketchIteration | null;
  renderStyle: RenderStyle;
  onUpdateLikeness: (score: number) => void;
  onSelectVariation: (variationIteration: SketchIteration) => void;
}

export const CanvasViewer: React.FC<CanvasViewerProps> = ({
  currentIteration,
  previousIteration,
  renderStyle,
  onUpdateLikeness,
  onSelectVariation,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50); // percentage 0-100
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [showDisguises, setShowDisguises] = useState(false);
  const [activeDisguise, setActiveDisguise] = useState<DisguiseOption | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [likenessInput, setLikenessInput] = useState(currentIteration.witness_likeness_score);
  const [showLandmarks, setShowLandmarks] = useState(true);

  // Variations A, B, C based on current iteration with subtle surgical alterations
  const [variationsList, setVariationsList] = useState<SketchIteration[]>(() => {
    const varA: SketchIteration = {
      ...currentIteration,
      id: `${currentIteration.id}-varA`,
      variation_label: 'A',
      is_variation: true,
      facial_state: {
        ...currentIteration.facial_state,
        jawline_chin: 'Angular jawline with prominent squarer mandibular angle',
      },
      image_url: generateForensicSketchDataUrl(
        { ...currentIteration.facial_state, jawline_chin: 'Angular square jawline' },
        renderStyle,
        99812,
        currentIteration.iteration_number
      ),
    };

    const varB: SketchIteration = {
      ...currentIteration,
      id: `${currentIteration.id}-varB`,
      variation_label: 'B',
      is_variation: true,
      facial_state: {
        ...currentIteration.facial_state,
        eyes: 'Slightly wider hooded almond eyes with subtle periorbital asymmetry',
      },
      image_url: generateForensicSketchDataUrl(
        { ...currentIteration.facial_state, eyes: 'Hooded almond eyes' },
        renderStyle,
        77123,
        currentIteration.iteration_number
      ),
    };

    const varC: SketchIteration = {
      ...currentIteration,
      id: `${currentIteration.id}-varC`,
      variation_label: 'C',
      is_variation: true,
      facial_state: {
        ...currentIteration.facial_state,
        nose: 'Narrower aquiline bridge with subtle fracture deviation',
      },
      image_url: generateForensicSketchDataUrl(
        { ...currentIteration.facial_state, nose: 'Narrow aquiline bridge' },
        renderStyle,
        44199,
        currentIteration.iteration_number
      ),
    };

    return [varA, varB, varC];
  });

  const [activeTabMode, setActiveTabMode] = useState<'canvas' | 'variations'>('canvas');

  // Handle dragging the split slider
  const containerRef = useRef<HTMLDivElement>(null);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCompareMode || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = Math.round((x / rect.width) * 100);
    setSliderPosition(percent);
  };

  const handleLikenessChange = (newVal: number) => {
    setLikenessInput(newVal);
    onUpdateLikeness(newVal);
  };

  // Helper for disguise modified image URL
  const getDisguisedImageUrl = () => {
    if (!activeDisguise) return currentIteration.image_url;
    let modifiedState = { ...currentIteration.facial_state };

    if (activeDisguise.id === 'disguise-cap') {
      modifiedState.hair_style_texture = 'Occluded by dark tactical beanie pulled low over forehead';
      modifiedState.forehead = 'Upper forehead completely covered by knit cap';
    } else if (activeDisguise.id === 'disguise-glasses') {
      modifiedState.accessories = 'Large dark aviator tinted sunglasses concealing eyes and brows';
    } else if (activeDisguise.id === 'disguise-beard') {
      modifiedState.facial_hair = 'Thick full bushy black beard concealing jawline and chin contour';
    } else if (activeDisguise.id === 'disguise-mask') {
      modifiedState.accessories = 'Blue surgical protective mask covering nose tip, mouth, and chin';
    }

    return generateForensicSketchDataUrl(modifiedState, renderStyle, 999121, currentIteration.iteration_number);
  };

  const activeDisplayImage = activeDisguise ? getDisguisedImageUrl() : currentIteration.image_url;

  return (
    <div className="flex flex-col h-full bg-[#0a0c12] border border-white/[0.08] rounded-xl overflow-hidden relative">
      {/* Top Controls Toolbar */}
      <div className="p-2.5 bg-[#0e111a] border-b border-white/[0.07] flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center space-x-2">
          {/* View mode toggle: Single vs Variations */}
          <div className="flex items-center bg-[#141824] border border-white/[0.08] rounded p-0.5 text-xs font-mono">
            <button
              onClick={() => {
                setActiveTabMode('canvas');
                setActiveDisguise(null);
              }}
              className={`px-2 py-1 rounded transition-colors ${
                activeTabMode === 'canvas'
                  ? 'bg-zinc-800 text-amber-300 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Primary Composite
            </button>
            <button
              onClick={() => setActiveTabMode('variations')}
              className={`px-2 py-1 rounded transition-colors ${
                activeTabMode === 'variations'
                  ? 'bg-zinc-800 text-amber-300 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Variations (A/B/C)
            </button>
          </div>

          {/* Before / After comparison toggle (only when prev iteration exists) */}
          {previousIteration && activeTabMode === 'canvas' && (
            <button
              onClick={() => setIsCompareMode(!isCompareMode)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-all ${
                isCompareMode
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                  : 'bg-[#141824] text-zinc-400 hover:text-zinc-200 border-white/[0.08]'
              }`}
              title="Split comparison slider: Iteration N-1 vs Iteration N"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Split Comparison</span>
            </button>
          )}

          {/* Disguise Simulator Button */}
          <button
            onClick={() => setShowDisguises(!showDisguises)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-all ${
              showDisguises || activeDisguise
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-[#141824] text-zinc-400 hover:text-zinc-200 border-white/[0.08]'
            }`}
            title="Open Disguise & Exploration Simulator"
          >
            <Glasses className="w-3.5 h-3.5" />
            <span>Disguise Modeler</span>
          </button>
        </div>

        {/* Right side toolbar tools: Zoom, Landmarks, Inspector */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setZoomLevel(prev => Math.max(70, prev - 15))}
            className="p-1.5 rounded bg-[#141824] hover:bg-white/[0.05] border border-white/[0.07] text-zinc-400 hover:text-zinc-200"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-zinc-400 px-1">
            {zoomLevel}%
          </span>
          <button
            onClick={() => setZoomLevel(prev => Math.min(160, prev + 15))}
            className="p-1.5 rounded bg-[#141824] hover:bg-white/[0.05] border border-white/[0.07] text-zinc-400 hover:text-zinc-200"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowLandmarks(!showLandmarks)}
            className={`p-1.5 rounded border transition-colors ${
              showLandmarks
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-[#141824] text-zinc-400 border-white/[0.07]'
            }`}
            title="Toggle anatomical calibration grid and reticles"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowInspector(!showInspector)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
              showInspector
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-[#141824] text-zinc-400 hover:text-zinc-200 border-white/[0.07]'
            }`}
            title="Inspect 14-Point FacialStateJSON"
          >
            <Info className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">14-Point Anatomy</span>
          </button>
        </div>
      </div>

      {/* Disguise Simulation Active Banner */}
      {activeDisguise && (
        <div className="bg-amber-950/60 border-b border-amber-500/40 px-3 py-1.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span className="font-mono uppercase font-bold tracking-wider text-[11px] text-amber-300">
              SIMULATION ACTIVE: {activeDisguise.name}
            </span>
            <span className="text-[10px] text-amber-400/80 hidden md:inline">
              [NOT WITNESS RECORD • NON-EVIDENTIARY]
            </span>
          </div>
          <button
            onClick={() => setActiveDisguise(null)}
            className="text-[11px] font-mono text-zinc-300 hover:text-white bg-black/40 px-2 py-0.5 rounded border border-white/[0.1]"
          >
            Reset to Original
          </button>
        </div>
      )}

      {/* Disguise Options Drawer */}
      {showDisguises && (
        <div className="p-3 bg-[#0d1017] border-b border-white/[0.08] animate-fadeIn">
          <div className="text-[10px] font-mono uppercase text-amber-400 tracking-wider font-semibold mb-2 flex items-center space-x-1.5">
            <Glasses className="w-3 h-3" />
            <span>Forensic Disguise Modeler (Phase 7 Non-Evidentiary Simulation)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DISGUISE_OPTIONS.map(disguise => (
              <button
                key={disguise.id}
                onClick={() => {
                  setActiveDisguise(activeDisguise?.id === disguise.id ? null : disguise);
                }}
                className={`p-2 rounded text-left border transition-all ${
                  activeDisguise?.id === disguise.id
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                    : 'bg-[#141824] border-white/[0.08] text-zinc-300 hover:bg-white/[0.04]'
                }`}
              >
                <div className="text-xs font-semibold leading-tight mb-1 flex items-center justify-between">
                  <span>{disguise.name}</span>
                  {activeDisguise?.id === disguise.id && (
                    <Check className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
                <div className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">
                  {disguise.effectDescription}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="flex-1 relative overflow-hidden bg-[#07080c] flex items-center justify-center">
        {activeTabMode === 'canvas' ? (
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            className="w-full h-full relative select-none flex items-center justify-center p-4"
          >
            {/* Calibration Corner Reticles */}
            {showLandmarks && (
              <>
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-amber-500/40 pointer-events-none"></div>
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-amber-500/40 pointer-events-none"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-amber-500/40 pointer-events-none"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-amber-500/40 pointer-events-none"></div>
              </>
            )}

            {/* If Before / After Compare Slider Mode is Active */}
            {isCompareMode && previousIteration ? (
              <div className="relative w-full max-w-[480px] aspect-[400/480] border border-white/[0.12] rounded-lg overflow-hidden shadow-2xl">
                {/* Before Image (Left / Background) */}
                <img
                  src={previousIteration.image_url}
                  alt={`Iteration #${previousIteration.iteration_number}`}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{ transform: `scale(${zoomLevel / 100})` }}
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/75 border border-white/[0.1] rounded text-[10px] font-mono text-zinc-300">
                  BEFORE: Iteration #{previousIteration.iteration_number}
                </div>

                {/* After Image (Right / Clipped by slider) */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <img
                    src={activeDisplayImage}
                    alt={`Iteration #${currentIteration.iteration_number}`}
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none max-w-none"
                    style={{
                      width: `${containerRef.current?.clientWidth || 480}px`,
                      height: '100%',
                      transform: `scale(${zoomLevel / 100})`,
                    }}
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500/80 text-black font-bold rounded text-[10px] font-mono">
                    AFTER: Iteration #{currentIteration.iteration_number}
                  </div>
                </div>

                {/* Vertical Divider Hairline */}
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-amber-400 shadow-[0_0_10px_rgba(212,175,55,0.8)] cursor-ew-resize flex items-center justify-center pointer-events-none"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="w-5 h-5 rounded-full bg-amber-400 text-black text-[10px] font-bold flex items-center justify-center shadow-lg border border-black">
                    ⇆
                  </div>
                </div>
              </div>
            ) : (
              /* Single View Composite Canvas */
              <div
                className="relative max-w-[500px] w-full aspect-[400/480] rounded-lg border border-white/[0.1] overflow-hidden shadow-2xl bg-[#090b10] flex items-center justify-center transition-transform"
                style={{ transform: `scale(${zoomLevel / 100})` }}
              >
                <img
                  src={activeDisplayImage}
                  alt={`Forensic Sketch Iteration #${currentIteration.iteration_number}`}
                  className="w-full h-full object-contain"
                />

                {/* Evidentiary watermark banner on preview */}
                <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1 bg-black/80 backdrop-blur border border-white/[0.08] rounded flex items-center justify-between text-[9.5px] font-mono text-zinc-400">
                  <div className="flex items-center space-x-2">
                    <span className="text-amber-400 font-bold">
                      ITER #{currentIteration.iteration_number}
                    </span>
                    <span>•</span>
                    <span>LATENCY: {currentIteration.latency_ms}ms</span>
                    <span>•</span>
                    <span className="text-cyan-400">{currentIteration.ai_provider}</span>
                  </div>
                  <div className="text-zinc-500">
                    2048x2048 RES READY
                  </div>
                </div>

                {/* Disguise watermark overlay if active */}
                {activeDisguise && (
                  <div className="absolute top-4 left-0 right-0 py-1 bg-red-600/80 text-white text-[10px] font-mono font-bold tracking-widest text-center uppercase pointer-events-none transform -rotate-3 shadow-lg">
                    *** SIMULATION ONLY — NOT EYEWITNESS EVIDENCE ***
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Variations Matrix View (Phase 5) */
          <div className="w-full h-full p-4 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Ambiguity Variations: Choose Alternative Hypothesis</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Derived from ambiguous witness memory. Selecting a variation sets it as the active branch without deleting alternatives.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {variationsList.map(v => (
                  <div
                    key={v.id}
                    className="p-3 bg-[#111520] border border-white/[0.09] hover:border-amber-500/40 rounded-lg flex flex-col justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-400 mb-2">
                        <span>VARIATION {v.variation_label}</span>
                        <span className="text-[10px] text-zinc-400 font-normal">
                          {v.variation_label === 'A'
                            ? 'Squarer Mandible'
                            : v.variation_label === 'B'
                            ? 'Hooded Almond Eyes'
                            : 'Narrow Aquiline Bridge'}
                        </span>
                      </div>
                      <div className="aspect-[400/480] bg-black rounded border border-white/[0.06] overflow-hidden mb-2">
                        <img
                          src={v.image_url}
                          alt={`Variation ${v.variation_label}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="text-[11px] text-zinc-300 mb-3 line-clamp-2">
                        {v.variation_label === 'A'
                          ? v.facial_state.jawline_chin
                          : v.variation_label === 'B'
                          ? v.facial_state.eyes
                          : v.facial_state.nose}
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectVariation(v)}
                      className="w-full py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-medium transition-colors"
                    >
                      Branch from Variation {v.variation_label}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 14-Point Anatomical Feature State Inspector Drawer */}
        {showInspector && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-[#0d1017]/95 backdrop-blur-md border-l border-white/[0.1] p-3 overflow-y-auto z-40 animate-slideLeft shadow-2xl">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/[0.08]">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-400">
                <Info className="w-3.5 h-3.5" />
                <span>14-Point FacialStateJSON</span>
              </div>
              <button
                onClick={() => setShowInspector(false)}
                className="text-zinc-500 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              {Object.entries(currentIteration.facial_state).map(([key, value]) => {
                const isModified = currentIteration.changed_fields.includes(key as keyof FacialStateJSON);
                return (
                  <div
                    key={key}
                    className={`p-2 rounded border ${
                      isModified
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                        : 'bg-[#131722] border-white/[0.06] text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase font-semibold mb-1">
                      <span>{key.replace(/_/g, ' ')}</span>
                      {isModified && (
                        <span className="text-[9px] px-1 bg-amber-400 text-black font-bold rounded">
                          UPDATED
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] leading-relaxed text-zinc-200 font-sans">
                      {value}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar: Witness Likeness Score Rating Slider */}
      <div className="p-3 bg-[#0d1017] border-t border-white/[0.08] flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3 flex-1 max-w-xl">
          <div className="flex items-center space-x-1.5 text-xs font-medium text-zinc-300 whitespace-nowrap">
            <span>Witness Likeness:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {likenessInput} / 10
            </span>
          </div>

          <input
            type="range"
            min="1"
            max="10"
            step="0.1"
            value={likenessInput}
            onChange={e => handleLikenessChange(parseFloat(e.target.value))}
            className="flex-1 accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono text-zinc-400">
          <span className="hidden sm:inline">
            Status: {likenessInput >= 8 ? '✅ Court Ready' : likenessInput >= 6 ? '⚡ Promising Lead' : '⏳ Preliminary'}
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-amber-400">
            Audit Event Auto-Logged
          </span>
        </div>
      </div>
    </div>
  );
};
