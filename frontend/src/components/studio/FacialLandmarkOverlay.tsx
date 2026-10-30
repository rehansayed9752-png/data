import React, { useState } from 'react';
import { Crosshair, Sparkles, X, Check } from 'lucide-react';
import { FacialStateJSON } from '../../types/forensic';

export interface FacialLandmark {
  id: string;
  name: string;
  key: keyof FacialStateJSON;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  samplePrompts: string[];
}

export const FACIAL_LANDMARKS: FacialLandmark[] = [
  {
    id: 'forehead',
    name: 'Forehead & Hairline',
    key: 'forehead',
    x: 50,
    y: 20,
    samplePrompts: [
      'Receding hairline with high temple peaks',
      'Broad smooth forehead with furrowed brow lines',
      'Low hairline with widow peak',
    ],
  },
  {
    id: 'brows',
    name: 'Eyebrows',
    key: 'eyebrows',
    x: 50,
    y: 32,
    samplePrompts: [
      'Thick bushy dark eyebrows with scar on right arch',
      'Arched thin eyebrows with sharp outer tail',
      'Straight low-set heavy brows, unibrow trace',
    ],
  },
  {
    id: 'left_eye',
    name: 'Left Eye',
    key: 'eyes',
    x: 38,
    y: 38,
    samplePrompts: [
      'Deep-set almond shaped left eye with crow feet',
      'Hooded eyelid with piercing pale iris',
      'Prominent dark circles and heavy under-eye bags',
    ],
  },
  {
    id: 'right_eye',
    name: 'Right Eye',
    key: 'eyes',
    x: 62,
    y: 38,
    samplePrompts: [
      'Narrow squinting right eye with distinct upper lid crease',
      'Drooping eyelid ptosis on right eye',
      'Sharp intense gaze with small pupil',
    ],
  },
  {
    id: 'nose',
    name: 'Nose & Bridge',
    key: 'nose',
    x: 50,
    y: 52,
    samplePrompts: [
      'Prominent aquiline hooked nose with broken bridge deviation',
      'Broad bulbous tip with flared nostrils',
      'Straight narrow sharp Roman nose bridge',
    ],
  },
  {
    id: 'cheeks',
    name: 'Cheekbones',
    key: 'cheeks',
    x: 32,
    y: 56,
    samplePrompts: [
      'High prominent sunken hollow cheekbones',
      'Full rounded cheeks with faint pockmark scarring',
      'Chiseled angular zygomatic structure',
    ],
  },
  {
    id: 'mouth',
    name: 'Mouth & Lips',
    key: 'mouth_lips',
    x: 50,
    y: 68,
    samplePrompts: [
      'Thin straight compressed lips with downturned corners',
      'Full lower lip with vertical split scar center-left',
      'Asymmetrical crooked sneer, narrow upper lip',
    ],
  },
  {
    id: 'jaw_chin',
    name: 'Jawline & Chin',
    key: 'jawline_chin',
    x: 50,
    y: 84,
    samplePrompts: [
      'Wide square mandibular jaw with prominent cleft chin',
      'Narrow tapered sharp triangular chin',
      'Heavy blunt jawline with slight double-chin crease',
    ],
  },
  {
    id: 'facial_hair',
    name: 'Facial Hair / Stubble',
    key: 'facial_hair',
    x: 68,
    y: 74,
    samplePrompts: [
      'Rough 5 o-clock dark shadow stubble across jaw',
      'Thick trimmed goatee and disconnected mustache',
      'Full dense untrimmed beard extending to neck',
    ],
  },
];

interface FacialLandmarkOverlayProps {
  isVisible: boolean;
  facialState?: FacialStateJSON;
  onApplyPrompt: (prompt: string, landmark: FacialLandmark) => void;
  disabled?: boolean;
}

export const FacialLandmarkOverlay: React.FC<FacialLandmarkOverlayProps> = ({
  isVisible,
  facialState,
  onApplyPrompt,
  disabled = false,
}) => {
  const [selectedLandmark, setSelectedLandmark] = useState<FacialLandmark | null>(null);
  const [customInput, setCustomInput] = useState('');

  if (!isVisible) return null;

  const handleSelect = (lm: FacialLandmark) => {
    setSelectedLandmark(lm);
    setCustomInput('');
  };

  const handleSubmitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim() || !selectedLandmark || disabled) return;
    onApplyPrompt(customInput.trim(), selectedLandmark);
    setSelectedLandmark(null);
    setCustomInput('');
  };

  const handleQuickPrompt = (prompt: string) => {
    if (!selectedLandmark || disabled) return;
    onApplyPrompt(prompt, selectedLandmark);
    setSelectedLandmark(null);
  };

  return (
    <div className="absolute inset-0 z-20 pointer-events-none select-none">
      {/* Visual Pins */}
      {FACIAL_LANDMARKS.map(lm => {
        const isSelected = selectedLandmark?.id === lm.id;
        return (
          <div
            key={lm.id}
            style={{ left: `${lm.x}%`, top: `${lm.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
          >
            <button
              type="button"
              onClick={() => handleSelect(lm)}
              title={`Refine ${lm.name}`}
              className={`group relative flex items-center justify-center transition-all ${
                isSelected ? 'scale-125 z-30' : 'hover:scale-110'
              }`}
            >
              {/* Outer Pulse Ring */}
              <span
                className={`absolute w-7 h-7 rounded-full border transition-all ${
                  isSelected
                    ? 'border-accent bg-accent/20 animate-ping opacity-75'
                    : 'border-[#18181B]/40 dark:border-white/40 bg-white/40 dark:bg-black/40 group-hover:border-accent'
                }`}
              />

              {/* Pin Center */}
              <span
                className={`relative w-4 h-4 rounded-full flex items-center justify-center shadow-md border ${
                  isSelected
                    ? 'bg-accent border-white text-white'
                    : 'bg-[#18181B] dark:bg-white text-white dark:text-[#18181B] border-white/60 dark:border-black/60 group-hover:bg-accent'
                }`}
              >
                <Crosshair className="w-2.5 h-2.5" strokeWidth={2.5} />
              </span>

              {/* Tooltip Tag on hover/active */}
              <span
                className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap shadow-md pointer-events-none transition-all ${
                  isSelected
                    ? 'bg-[#18181B] text-white opacity-100'
                    : 'bg-black/80 text-white opacity-0 group-hover:opacity-100'
                }`}
              >
                {lm.name}
              </span>
            </button>
          </div>
        );
      })}

      {/* Floating Precision Refinement Dialog */}
      {selectedLandmark && (
        <div className="absolute bottom-4 left-4 right-4 z-40 bg-white dark:bg-[#12141C] border border-[#E4E4E0] dark:border-[#272B38] rounded-lg shadow-2xl p-3.5 pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E4E4E0] dark:border-[#272B38]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#18181B] dark:text-white">
                Landmark Pin: {selectedLandmark.name}
              </span>
              {facialState && (
                <span className="text-[10px] font-mono text-[#71717A] max-w-[200px] truncate hidden sm:inline">
                  (Current: {facialState[selectedLandmark.key] || 'Default'})
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedLandmark(null)}
              className="p-1 rounded text-[#71717A] hover:text-[#18181B] dark:hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Pre-tuned Forensic Anatomical Descriptors */}
          <div className="mb-2.5">
            <div className="text-[10px] font-mono text-[#71717A] mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-accent" />
              <span>Recommended Anatomical Variants (Click to apply):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedLandmark.samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleQuickPrompt(p)}
                  className="px-2 py-1 rounded bg-[#F4F4F5] dark:bg-[#181B26] hover:bg-accent hover:text-white text-[11px] text-[#18181B] dark:text-gray-200 border border-[#E4E4E0] dark:border-[#272B38] transition-colors text-left"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Precision Input */}
          <form onSubmit={handleSubmitCustom} className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              disabled={disabled}
              placeholder={`Witness notes for ${selectedLandmark.name.toLowerCase()}...`}
              className="flex-1 px-3 py-1.5 rounded text-xs font-mono bg-white dark:bg-[#0B0D13] border border-[#D4D4D0] dark:border-[#272B38] text-[#18181B] dark:text-white focus:outline-none focus:border-accent"
              autoFocus
            />
            <button
              type="submit"
              disabled={!customInput.trim() || disabled}
              className="px-3 py-1.5 rounded bg-[#18181B] dark:bg-white text-white dark:text-[#18181B] text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-1 font-mono"
            >
              <Check className="w-3 h-3" />
              <span>Apply</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
