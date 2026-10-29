import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sliders,
  ZoomIn,
  ZoomOut,
  Eye,
  Info,
  Check,
  Glasses,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  SketchIteration,
  FacialStateJSON,
  RenderStyle,
  DisguiseOption,
} from '../../types/forensic';
import { DISGUISE_OPTIONS } from '../../data/mockForensicData';
import { generateForensicSketchDataUrl } from '../../utils/proceduralSketch';
import { buttonHoverLift, crossFade400 } from '../../styles/tokens';

interface CanvasViewerProps {
  currentIteration: SketchIteration;
  previousIteration: SketchIteration | null;
  renderStyle: RenderStyle;
  onUpdateLikeness: (score: number) => void;
  onSelectVariation: (variationIteration: SketchIteration) => void;
  externalToolTrigger?: {
    tabMode?: 'canvas' | 'variations';
    isCompareMode?: boolean;
    showInspector?: boolean;
    showDisguises?: boolean;
  };
}

export const CanvasViewer: React.FC<CanvasViewerProps> = ({
  currentIteration,
  previousIteration,
  renderStyle,
  onUpdateLikeness,
  onSelectVariation,
  externalToolTrigger,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [showDisguises, setShowDisguises] = useState(false);
  const [activeDisguise, setActiveDisguise] = useState<DisguiseOption | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [likenessInput, setLikenessInput] = useState(currentIteration.witness_likeness_score);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [activeTabMode, setActiveTabMode] = useState<'canvas' | 'variations'>('canvas');

  // Auto-hide floating toolbar state
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetToolbarTimer = () => {
    setIsToolbarVisible(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      setIsToolbarVisible(false);
    }, 2000);
  };

  useEffect(() => {
    resetToolbarTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Variations A, B, C based on current iteration with subtle surgical alterations, updated dynamically on renderStyle or iteration change
  const [variationsList, setVariationsList] = useState<SketchIteration[]>([]);

  useEffect(() => {
    const varA: SketchIteration = {
      ...currentIteration,
      id: `${currentIteration.id}-varA`,
      variation_label: 'A',
      is_variation: true,
      facial_state: {
        ...currentIteration.facial_state,
        jawline_chin: 'Angular jawline with squarer mandibular angle',
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
        eyes: 'Slightly wider hooded almond eyes with subtle asymmetry',
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
        nose: 'Narrower aquiline bridge with subtle deviation',
      },
      image_url: generateForensicSketchDataUrl(
        { ...currentIteration.facial_state, nose: 'Narrow aquiline bridge' },
        renderStyle,
        44199,
        currentIteration.iteration_number
      ),
    };

    setVariationsList([varA, varB, varC]);
  }, [currentIteration, renderStyle]);

  const containerRef = useRef<HTMLDivElement>(null);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    resetToolbarTimer();
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

  // Helper for disguise modified image URL or instant renderStyle re-render for procedural/SVG iterations
  const getDisguisedImageUrl = () => {
    let modifiedState = { ...currentIteration.facial_state };

    if (activeDisguise) {
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
    }

    // If procedural sketch data URL or local-procedural provider, immediately re-render using chosen renderStyle
    if (currentIteration.image_url?.startsWith('data:image/svg+xml') || currentIteration.ai_provider === 'local-procedural') {
      return generateForensicSketchDataUrl(currentIteration.facial_state, renderStyle, 849204, currentIteration.iteration_number);
    }

    return currentIteration.image_url;
  };

  useEffect(() => {
    if (externalToolTrigger?.tabMode !== undefined) {
      setActiveTabMode(externalToolTrigger.tabMode);
    }
    if (externalToolTrigger?.isCompareMode !== undefined) {
      setIsCompareMode(externalToolTrigger.isCompareMode);
    }
    if (externalToolTrigger?.showInspector !== undefined) {
      setShowInspector(externalToolTrigger.showInspector);
    }
    if (externalToolTrigger?.showDisguises !== undefined) {
      setShowDisguises(externalToolTrigger.showDisguises);
    }
  }, [externalToolTrigger]);

  const activeDisplayImage = getDisguisedImageUrl();

  return (
    <div
      className="flex flex-col h-full bg-surface-card border border-line-subtle rounded-xl overflow-hidden relative font-sans"
      onMouseMove={resetToolbarTimer}
      onMouseEnter={resetToolbarTimer}
    >
      {/* Top Header / Mode Bar with Animated Pill Glider */}
      <div className="p-3 bg-surface-base border-b border-line-subtle flex items-center justify-between gap-3 flex-wrap">
        {/* Animated Tabs */}
        <div className="flex items-center p-0.5 rounded-lg bg-surface-card border border-line-subtle text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTabMode('canvas');
              setIsCompareMode(false);
              setActiveDisguise(null);
            }}
            className={`relative px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTabMode === 'canvas' && !isCompareMode
                ? 'text-ink-heading'
                : 'text-ink-muted hover:text-ink-body'
            }`}
          >
            {activeTabMode === 'canvas' && !isCompareMode && (
              <motion.div
                layoutId="activeCanvasTab"
                className="absolute inset-0 bg-surface-elevated rounded-md border border-line-medium shadow-xs"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">Composite</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTabMode('variations');
              setIsCompareMode(false);
              setActiveDisguise(null);
            }}
            className={`relative px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTabMode === 'variations'
                ? 'text-ink-heading'
                : 'text-ink-muted hover:text-ink-body'
            }`}
          >
            {activeTabMode === 'variations' && (
              <motion.div
                layoutId="activeCanvasTab"
                className="absolute inset-0 bg-surface-elevated rounded-md border border-line-medium shadow-xs"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">Variations (A/B/C)</span>
          </button>

          {previousIteration && (
            <button
              type="button"
              onClick={() => {
                setActiveTabMode('canvas');
                setIsCompareMode(true);
              }}
              className={`relative px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isCompareMode
                  ? 'text-ink-heading'
                  : 'text-ink-muted hover:text-ink-body'
              }`}
            >
              {isCompareMode && (
                <motion.div
                  layoutId="activeCanvasTab"
                  className="absolute inset-0 bg-surface-elevated rounded-md border border-line-medium shadow-xs"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">Split Comparison</span>
            </button>
          )}
        </div>

        {/* Action Toggles */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowDisguises(!showDisguises)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors border ${
              showDisguises || activeDisguise
                ? 'bg-accent/15 text-accent border-accent/40 font-medium'
                : 'bg-surface-card hover:bg-surface-elevated text-ink-muted hover:text-ink-body border-line-subtle'
            }`}
          >
            <Glasses className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Disguise Modeler</span>
          </button>

          <button
            type="button"
            onClick={() => setShowInspector(!showInspector)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors border ${
              showInspector
                ? 'bg-surface-elevated text-ink-heading border-line-medium font-medium'
                : 'bg-surface-card hover:bg-surface-elevated text-ink-muted hover:text-ink-body border-line-subtle'
            }`}
          >
            <Info className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">14-Point Anatomy</span>
          </button>
        </div>
      </div>

      {/* Disguise Modeler simulation pill */}
      {activeDisguise && (
        <div className="bg-surface-elevated border-b border-line-subtle px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
            <span className="text-ink-heading font-medium">
              Simulation: {activeDisguise.name}
            </span>
            <span className="text-ink-faint text-[11px] hidden md:inline">
              (Non-evidentiary exploration)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveDisguise(null)}
            className="text-[11px] text-ink-muted hover:text-ink-heading bg-surface-card hover:bg-surface-base px-2 py-0.5 rounded border border-line-subtle transition-colors"
          >
            Reset
          </button>
        </div>
      )}

      {/* Disguise Selection Drawer */}
      <AnimatePresence>
        {showDisguises && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-3 bg-surface-base border-b border-line-subtle overflow-hidden"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DISGUISE_OPTIONS.map(disguise => {
                const isSelected = activeDisguise?.id === disguise.id;
                return (
                  <button
                    key={disguise.id}
                    type="button"
                    onClick={() => setActiveDisguise(isSelected ? null : disguise)}
                    className={`p-2.5 rounded-lg text-left border transition-all ${
                      isSelected
                        ? 'bg-surface-elevated border-accent/50 text-ink-heading'
                        : 'bg-surface-card border-line-subtle text-ink-muted hover:text-ink-body hover:bg-surface-elevated/50'
                    }`}
                  >
                    <div className="text-xs font-medium mb-1 flex items-center justify-between">
                      <span>{disguise.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-accent" strokeWidth={2} />}
                    </div>
                    <div className="text-[11px] text-ink-faint line-clamp-2 leading-relaxed">
                      {disguise.effectDescription}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Viewport */}
      <div className="flex-1 relative overflow-hidden bg-surface-base flex items-center justify-center p-4">
        {/* Subtle Corner Marks */}
        <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-line-medium pointer-events-none"></div>
        <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-line-medium pointer-events-none"></div>
        <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-line-medium pointer-events-none"></div>
        <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-line-medium pointer-events-none"></div>

        {activeTabMode === 'canvas' ? (
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            className="w-full h-full relative select-none flex items-center justify-center"
          >
            {/* Split Comparison Mode */}
            {isCompareMode && previousIteration ? (
              <div className="relative w-full max-w-[460px] aspect-[400/480] border border-line-medium rounded-lg overflow-hidden shadow-lg bg-surface-card">
                {/* Before Image */}
                <img
                  src={previousIteration.image_url}
                  alt={`Iteration #${previousIteration.iteration_number}`}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{ transform: `scale(${zoomLevel / 100})` }}
                />
                <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-surface-base/80 backdrop-blur-xs border border-line-subtle rounded text-[10px] font-mono text-ink-muted">
                  Prior #{previousIteration.iteration_number}
                </div>

                {/* After Image */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <img
                    src={activeDisplayImage}
                    alt={`Iteration #${currentIteration.iteration_number}`}
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none max-w-none"
                    style={{
                      width: `${containerRef.current?.clientWidth || 460}px`,
                      height: '100%',
                      transform: `scale(${zoomLevel / 100})`,
                    }}
                  />
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-accent text-surface-base font-semibold rounded text-[10px] font-mono">
                    Current #{currentIteration.iteration_number}
                  </div>
                </div>

                {/* Hairline Divider */}
                <div
                  className="absolute top-0 bottom-0 w-[1px] bg-accent/80 cursor-ew-resize flex items-center justify-center pointer-events-none"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="w-5 h-5 rounded-full bg-surface-card text-accent text-[10px] flex items-center justify-center border border-accent/40 shadow-sm">
                    ⇆
                  </div>
                </div>
              </div>
            ) : (
              /* Single View Composite with 400ms cross-fade */
              <div
                className="relative max-w-[480px] w-full aspect-[400/480] rounded-lg border border-line-subtle overflow-hidden shadow-lg bg-surface-card flex items-center justify-center"
                style={{ transform: `scale(${zoomLevel / 100})`, transition: 'transform 0.15s ease-out' }}
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={activeDisplayImage}
                    src={activeDisplayImage}
                    alt={`Forensic Sketch Iteration #${currentIteration.iteration_number}`}
                    variants={crossFade400}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="w-full h-full object-contain"
                  />
                </AnimatePresence>

                {/* Quiet evidentiary metadata strip */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 px-2.5 py-1 bg-surface-base/85 backdrop-blur-xs border border-line-subtle rounded-md flex items-center justify-between text-[10px] font-mono text-ink-muted">
                  <div className="flex items-center space-x-2">
                    <span className="text-ink-heading font-medium">
                      Iter #{currentIteration.iteration_number}
                    </span>
                    <span>•</span>
                    <span>{currentIteration.latency_ms}ms</span>
                    <span>•</span>
                    <span>{currentIteration.ai_provider}</span>
                  </div>
                  <div className="text-ink-faint">
                    2048 × 2048 px
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Variations Matrix */
          <div className="w-full h-full p-4 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <div className="mb-4">
                <h3 className="font-serif font-semibold text-base text-ink-heading mb-1">
                  Ambiguity Variations
                </h3>
                <p className="text-xs text-ink-muted">
                  Alternative interpretations derived from witness uncertainty. Selecting a branch sets it as active without erasing history.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {variationsList.map(v => (
                  <div
                    key={v.id}
                    className="p-3.5 bg-surface-card border border-line-subtle hover:border-line-medium rounded-xl flex flex-col justify-between transition-all shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono font-medium text-accent mb-2">
                        <span>VARIATION {v.variation_label}</span>
                        <span className="text-[10.5px] text-ink-muted font-normal">
                          {v.variation_label === 'A'
                            ? 'Squarer Mandible'
                            : v.variation_label === 'B'
                            ? 'Hooded Almond Eyes'
                            : 'Narrow Aquiline Bridge'}
                        </span>
                      </div>
                      <div className="aspect-[400/480] bg-surface-base rounded-md border border-line-subtle overflow-hidden mb-2.5">
                        <img
                          src={v.image_url}
                          alt={`Variation ${v.variation_label}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <p className="text-xs text-ink-muted mb-3 line-clamp-2 leading-relaxed">
                        {v.variation_label === 'A'
                          ? v.facial_state.jawline_chin
                          : v.variation_label === 'B'
                          ? v.facial_state.eyes
                          : v.facial_state.nose}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectVariation(v)}
                      className="w-full py-1.5 rounded-md bg-surface-elevated hover:bg-accent hover:text-surface-base border border-line-medium text-ink-body text-xs font-medium transition-colors"
                    >
                      Branch from Variation {v.variation_label}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Floating Auto-Hiding Toolbar */}
        <AnimatePresence>
          {isToolbarVisible && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              onMouseEnter={() => {
                if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
                setIsToolbarVisible(true);
              }}
              className="absolute bottom-6 right-6 z-30 flex items-center space-x-1 p-1 bg-surface-card/90 backdrop-blur-md border border-line-medium rounded-lg shadow-xl"
            >
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(70, prev - 15))}
                className="p-1.5 rounded hover:bg-surface-elevated text-ink-muted hover:text-ink-heading transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
              <span className="text-[11px] font-mono text-ink-muted px-1.5 min-w-[42px] text-center">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(160, prev + 15))}
                className="p-1.5 rounded hover:bg-surface-elevated text-ink-muted hover:text-ink-heading transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
              <div className="h-3.5 w-[1px] bg-line-subtle mx-0.5"></div>
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                className="p-1.5 rounded hover:bg-surface-elevated text-ink-muted hover:text-ink-heading transition-colors"
                title="Reset zoom"
              >
                <RotateCcw className="w-3 h-3" strokeWidth={1.5} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 14-Point Anatomical Inspector Drawer */}
        <AnimatePresence>
          {showInspector && (
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute right-0 top-0 bottom-0 w-80 bg-surface-card/95 backdrop-blur-md border-l border-line-medium p-4 overflow-y-auto z-40 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-line-subtle">
                <div className="flex items-center space-x-2 text-xs font-semibold text-ink-heading">
                  <Info className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
                  <span>14-Point Facial State</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInspector(false)}
                  className="text-ink-muted hover:text-ink-heading text-xs font-mono p-1"
                >
                  x
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {Object.entries(currentIteration.facial_state).map(([key, value]) => {
                  const isModified = currentIteration.changed_fields.includes(key as keyof FacialStateJSON);
                  return (
                    <div
                      key={key}
                      className={`p-2.5 rounded-lg border transition-colors ${
                        isModified
                          ? 'bg-surface-elevated border-accent/40 text-ink-heading'
                          : 'bg-surface-base border-line-subtle text-ink-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase text-ink-faint mb-1">
                        <span>{key.replace(/_/g, ' ')}</span>
                        {isModified && (
                          <span className="text-[9px] px-1 py-0.2 bg-accent/20 text-accent font-semibold rounded">
                            Updated
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-ink-body font-sans leading-relaxed">
                        {value}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Bar: Witness Likeness Score */}
      <div className="p-3 bg-surface-base border-t border-line-subtle flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3 flex-1 max-w-md">
          <div className="flex items-center space-x-2 text-xs text-ink-body whitespace-nowrap">
            <span>Witness Likeness:</span>
            <span className="font-mono font-semibold text-ink-heading text-sm">
              {likenessInput} <span className="text-xs text-ink-muted">/ 10</span>
            </span>
          </div>

          <input
            type="range"
            min="1"
            max="10"
            step="0.1"
            value={likenessInput}
            onChange={e => handleLikenessChange(parseFloat(e.target.value))}
            className="flex-1 accent-accent h-1.5 bg-surface-elevated rounded-lg cursor-pointer"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs text-ink-muted font-sans">
          <span>
            {likenessInput >= 8
              ? 'Court-Ready Composite'
              : likenessInput >= 6
              ? 'Promising Lead Draft'
              : 'Preliminary Memory Slice'}
          </span>
          <span className="text-line-medium">•</span>
          <span className="text-ink-faint font-mono text-[11px]">Audit Auto-Logged</span>
        </div>
      </div>
    </div>
  );
};
