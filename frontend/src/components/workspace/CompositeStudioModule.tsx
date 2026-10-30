import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Sliders,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Mic,
  MicOff,
  Send,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Lock,
  Layers,
  Sparkles,
  Check,
} from 'lucide-react';
import {
  CaseFile,
  SketchIteration,
  ChatMessage,
  FacialStateJSON,
  RenderStyle,
  SupportedLanguage,
  PermissionMode,
} from '../../types/forensic';
import { generateForensicSketchDataUrl } from '../../utils/proceduralSketch';
import { ForensicScanOverlay } from '../ui/ForensicAnimations';
import { FacialLandmarkOverlay, FacialLandmark } from '../studio/FacialLandmarkOverlay';
import { Crosshair } from 'lucide-react';

interface CompositeStudioModuleProps {
  caseFile: CaseFile;
  currentIteration: SketchIteration;
  previousIteration: SketchIteration | null;
  iterations: SketchIteration[];
  onSelectIteration: (id: string) => void;
  messages: ChatMessage[];
  onSendMessage: (
    text: string,
    confidence: 'certain' | 'likely' | 'maybe' | 'not_sure',
    language: SupportedLanguage
  ) => void;
  isLoading: boolean;
  permissionMode: PermissionMode;
  onUpdateLikeness: (score: number) => void;
  onSelectVariation: (variationIteration: SketchIteration) => void;
}

const REGIONAL_LANGUAGES: { code: SupportedLanguage; label: string; speechCode: string }[] = [
  { code: 'en', label: 'English', speechCode: 'en-US' },
  { code: 'kn', label: 'Kannada', speechCode: 'kn-IN' },
  { code: 'hi', label: 'Hindi', speechCode: 'hi-IN' },
  { code: 'mr', label: 'Marathi', speechCode: 'mr-IN' },
];

const GUIDED_CHIPS = [
  { label: 'Square Jaw', prompt: 'broad square angular mandibular jawline' },
  { label: 'Hooked Nose', prompt: 'hooked downward bridge with prominent aquiline curve' },
  { label: 'Narrow Eyes', prompt: 'narrow almond eyes with intense gaze' },
  { label: 'Heavy Stubble', prompt: 'dark heavy 5 o-clock stubble across lower jaw' },
  { label: 'Cheek Scar', prompt: 'distinct 1.5-inch diagonal knife scar across left cheek' },
];

const DISGUISES = [
  { id: 'base', label: 'Base', promptDelta: '' },
  { id: 'cap', label: '+ Cap', promptDelta: 'wearing a dark tactical baseball cap pulled low over forehead' },
  { id: 'glasses', label: '+ Glasses', promptDelta: 'wearing dark aviator sunglasses concealing eyes' },
  { id: 'beard', label: '+ Beard', promptDelta: 'with a thick dark full beard altering jawline perception' },
  { id: 'hoodie', label: '+ Hoodie', promptDelta: 'wearing a dark hooded sweatshirt with hood pulled over ears and hair' },
];

export const CompositeStudioModule: React.FC<CompositeStudioModuleProps> = ({
  caseFile,
  currentIteration,
  previousIteration,
  iterations,
  onSelectIteration,
  messages,
  onSendMessage,
  isLoading,
  permissionMode,
  onUpdateLikeness,
  onSelectVariation,
}) => {
  const isReadOnly = permissionMode === 'read_only';

  // Witness input state
  const [inputText, setInputText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en');
  const [isRecording, setIsRecording] = useState(false);
  const [showGuidedHelper, setShowGuidedHelper] = useState(true);
  const [contradictionAlert, setContradictionAlert] = useState<string | null>(null);

  // Sketch inspection state
  const [isLoupeActive, setIsLoupeActive] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [loupePos, setLoupePos] = useState({ x: 220, y: 240 });
  const [currentLandmark, setCurrentLandmark] = useState('CRANIOFACIAL LANDMARK');
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareSplit, setCompareSplit] = useState(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [activeDisguise, setActiveDisguise] = useState('base');
  const [showVariationsDrawer, setShowVariationsDrawer] = useState(false);
  const [likenessInput, setLikenessInput] = useState(currentIteration.witness_likeness_score || 8.5);

  const canvasRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setLikenessInput(currentIteration.witness_likeness_score || 8.5);
  }, [currentIteration]);

  // Keyboard shortcut: L toggles Loupe, C toggles Compare
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'l' || e.key === 'L') {
        setIsLoupeActive(prev => !prev);
      } else if (e.key === 'c' || e.key === 'C') {
        if (previousIteration) setIsCompareMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previousIteration]);

  // Contradiction detection
  const checkContradictions = (text: string) => {
    const lower = text.toLowerCase();
    const hair = currentIteration.facial_state.facial_hair.toLowerCase();
    if (
      (lower.includes('19') || lower.includes('teen') || lower.includes('young')) &&
      (hair.includes('grey') || hair.includes('white beard'))
    ) {
      return 'Notice: Subject was recorded with a grey beard, which may contradict a teenage or young adult profile.';
    }
    if (lower.includes('clean shaven') && (lower.includes('full beard') || lower.includes('heavy stubble'))) {
      return 'Notice: Statement contains mutually exclusive terms ("clean shaven" alongside "full beard").';
    }
    return null;
  };

  const handleSendPrompt = () => {
    if (isReadOnly || !inputText.trim() || isLoading) return;

    const alertMsg = checkContradictions(inputText);
    setContradictionAlert(alertMsg);

    onSendMessage(inputText.trim(), 'certain', selectedLanguage);
    setInputText('');
  };

  // Web Speech API Voice Input
  const handleToggleVoice = () => {
    if (isReadOnly) return;
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Web Speech API is not supported in this browser. Please type the statement.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      const langConfig = REGIONAL_LANGUAGES.find(l => l.code === selectedLanguage);
      recognition.lang = langConfig ? langConfig.speechCode : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);

      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setInputText(prev => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  const handleApplyDisguise = (disguiseId: string, promptDelta: string) => {
    if (isReadOnly) return;
    setActiveDisguise(disguiseId);
    if (disguiseId === 'base') {
      onSendMessage('Revert suspect to base composite without disguise accessories.', 'certain', 'en');
    } else {
      onSendMessage(`Apply disguise overlay: ${promptDelta}. Strictly lock facial identity.`, 'certain', 'en');
    }
  };

  // Canvas Mouse Move Handler for Loupe & Split Comparison
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDraggingSplit) {
      const percent = Math.max(5, Math.min(95, (x / rect.width) * 100));
      setCompareSplit(percent);
      return;
    }

    if (isLoupeActive) {
      setLoupePos({ x, y });
      const normY = y / rect.height;
      const normX = x / rect.width;
      if (normY < 0.25) setCurrentLandmark('HAIRLINE & FOREHEAD');
      else if (normY < 0.40) setCurrentLandmark(normX < 0.5 ? 'RIGHT ORBIT & BROW' : 'LEFT ORBIT & BROW');
      else if (normY < 0.52) setCurrentLandmark(normX < 0.5 ? 'RIGHT EYE / IRIS' : 'LEFT EYE / IRIS');
      else if (normY < 0.65) setCurrentLandmark('NASAL DORSUM & TIP');
      else if (normY < 0.78) setCurrentLandmark('PHILTRUM & VERMILION');
      else setCurrentLandmark('MANDIBULAR ANGLE & CHIN');
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-[#F5F5F2] font-sans">
      {/* LEFT COLUMN: Witness Input & Refinement Log (380px width) */}
      <div className="w-full lg:w-[380px] flex-shrink-0 flex flex-col h-[440px] lg:h-full border-b lg:border-b-0 lg:border-r border-[#E4E4E0] bg-white">
        {/* Left Column Header */}
        <div className="px-4 py-3 border-b border-[#E4E4E0] flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-[#18181B]">
              Witness Interview & Log
            </h2>
            <p className="text-[11px] text-[#52525B]">
              Case {caseFile.case_number} • Seed #{caseFile.case_seed}
            </p>
          </div>

          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
              isReadOnly
                ? 'bg-[#F4F4F5] text-[#52525B] border border-[#E4E4E0]'
                : 'bg-[#18181B] text-white'
            }`}
          >
            {isReadOnly ? 'Read-Only' : 'Active Input'}
          </span>
        </div>

        {/* Read-Only Notice Banner */}
        {isReadOnly && (
          <div className="p-3 bg-[#F9F9F8] border-b border-[#E4E4E0] text-xs text-[#52525B] flex items-start gap-2">
            <Lock className="w-4 h-4 text-[#71717A] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="leading-relaxed">
              <strong>Read-Only Session:</strong> Witness input and sketch generation are disabled. You may inspect existing iterations and export court dossiers.
            </p>
          </div>
        )}

        {/* Read & Write Input Controls */}
        {!isReadOnly && (
          <div className="p-3.5 border-b border-[#E4E4E0] space-y-3 bg-[#FAFAFA]">
            {/* Language & Voice Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-mono text-[#52525B] uppercase">Language:</label>
                <select
                  value={selectedLanguage}
                  onChange={e => setSelectedLanguage(e.target.value as SupportedLanguage)}
                  className="px-2 py-1 text-xs bg-white border border-[#E4E4E0] rounded font-medium text-[#18181B] outline-none"
                >
                  {REGIONAL_LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Record Voice Button */}
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                  isRecording
                    ? 'bg-red-50 border-red-300 text-red-700 animate-pulse'
                    : 'bg-white border-[#E4E4E0] hover:border-[#D4D4D0] text-[#18181B]'
                }`}
                title="Dictate witness statement using Web Speech API"
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isRecording ? 'Listening...' : 'Record Voice'}</span>
              </button>
            </div>

            {/* Guided Prompt Helper (Toggleable) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-mono text-[#52525B] uppercase">
                  Suggested Anatomical Traits:
                </span>
                <button
                  type="button"
                  onClick={() => setShowGuidedHelper(prev => !prev)}
                  className="text-[10px] text-[#71717A] hover:text-[#18181B]"
                >
                  {showGuidedHelper ? 'Hide' : 'Show'}
                </button>
              </div>

              {showGuidedHelper && (
                <div className="flex flex-wrap gap-1">
                  {GUIDED_CHIPS.map(chip => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() =>
                        setInputText(prev => (prev ? `${prev}, ${chip.prompt}` : chip.prompt))
                      }
                      className="px-2 py-0.5 rounded bg-white hover:bg-[#F4F4F5] border border-[#E4E4E0] text-[11px] text-[#18181B] font-medium transition-colors"
                    >
                      + {chip.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Contradiction Alert Box */}
            {contradictionAlert && (
              <div className="p-2.5 rounded bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <div className="min-w-0 flex-1">
                  <p>{contradictionAlert}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setContradictionAlert(null)}
                      className="px-2 py-0.5 rounded bg-amber-700 hover:bg-amber-800 text-white text-[10px] font-semibold"
                    >
                      Confirm Anyway
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setContradictionAlert(null);
                        setInputText('');
                      }}
                      className="px-2 py-0.5 rounded bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 text-[10px] font-medium"
                    >
                      Revise Statement
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Description Textarea Input */}
            <div>
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendPrompt();
                  }
                }}
                placeholder="Describe suspect features or state an adjustment..."
                rows={3}
                className="w-full p-2.5 text-xs bg-white border border-[#E4E4E0] rounded focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] text-[#18181B] placeholder-[#A1A1AA] resize-none outline-none font-sans"
              />

              <button
                type="button"
                disabled={!inputText.trim() || isLoading}
                onClick={handleSendPrompt}
                className="mt-2 w-full py-2 px-3 rounded bg-[#18181B] hover:bg-[#27272A] text-white text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>{isLoading ? 'Synthesizing...' : 'Generate / Update Composite'}</span>
                <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}

        {/* Refinement History Log */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          <p className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] mb-1">
            Chronological Statements ({messages.length})
          </p>

          {messages.map((msg, i) => {
            const isWitness = msg.sender === 'witness';
            return (
              <div
                key={msg.id || i}
                className={`p-2.5 rounded border text-xs leading-relaxed ${
                  isWitness
                    ? 'bg-[#FBFBFA] border-[#E4E4E0] text-[#18181B]'
                    : 'bg-white border-[#E4E4E0] text-[#52525B]'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-[#71717A] mb-1">
                  <span className="font-semibold text-[#18181B]">
                    {isWitness ? 'Witness Statement' : 'System Diagnostic'}
                  </span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="whitespace-pre-wrap">{msg.text}</p>
                {msg.changed_traits && msg.changed_traits.length > 0 && (
                  <div className="mt-1.5 pt-1 border-t border-[#E4E4E0] flex flex-wrap gap-1">
                    {msg.changed_traits.map(t => (
                      <span
                        key={t}
                        className="px-1.5 py-0.2 rounded bg-[#F4F4F5] text-[#52525B] text-[9px] font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="p-3 rounded border border-dashed border-[#A1A1AA] bg-[#F9F9F8] text-xs text-[#52525B] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#18181B] animate-ping" />
              <span className="font-mono">Processing anatomical refinement via Gemini & Cloudflare...</span>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Tactile Sketch Sheet & Inspection Tools (Remaining width) */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#F5F5F2]">
        {/* Top Control Strip */}
        <div className="h-12 border-b border-[#E4E4E0] bg-white px-4 flex items-center justify-between gap-3 flex-shrink-0 text-xs">
          {/* Iteration Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <span className="text-[10px] font-mono text-[#71717A] uppercase mr-1 hidden sm:inline">
              Iterations:
            </span>
            {iterations.map(it => {
              const isActive = it.id === currentIteration.id;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => onSelectIteration(it.id)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                    isActive
                      ? 'bg-[#18181B] text-white'
                      : 'bg-[#F4F4F5] text-[#52525B] hover:bg-[#E4E4E0]'
                  }`}
                >
                  Iter {it.iteration_number}
                </button>
              );
            })}
          </div>

          {/* Inspection Tools & Disguises */}
          <div className="flex items-center gap-2">
            {/* Disguise Overlays (Enabled only in Read & Write) */}
            <div className="hidden xl:flex items-center gap-1 border-r border-[#E4E4E0] pr-2">
              <span className="text-[10px] font-mono text-[#71717A] uppercase mr-1">Disguise:</span>
              {DISGUISES.map(d => (
                <button
                  key={d.id}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => handleApplyDisguise(d.id, d.promptDelta)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    activeDisguise === d.id
                      ? 'bg-[#18181B] text-white'
                      : 'bg-[#F4F4F5] text-[#52525B] hover:bg-[#E4E4E0]'
                  } ${isReadOnly ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Magnifying Loupe Toggle */}
            <button
              type="button"
              onClick={() => setIsLoupeActive(prev => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                isLoupeActive
                  ? 'bg-[#18181B] border-[#18181B] text-white'
                  : 'bg-white border-[#E4E4E0] hover:bg-[#F4F4F5] text-[#18181B]'
              }`}
              title="Toggle Draggable Magnifying Loupe (Press 'L')"
            >
              <Search className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span className="hidden sm:inline">Loupe: {isLoupeActive ? 'On' : 'Off'}</span>
            </button>

                        {/* Facial Landmark Pinning Toggle */}
            <button
              type="button"
              onClick={() => setShowLandmarks(prev => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                showLandmarks
                  ? 'bg-[#18181B] border-[#18181B] text-white'
                  : 'bg-white border-[#E4E4E0] hover:bg-[#F4F4F5] text-[#18181B]'
              }`}
              title="Toggle Interactive Facial Landmark Pins"
            >
              <Crosshair className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span className="hidden sm:inline">Landmarks: {showLandmarks ? 'Pins On' : 'Pins Off'}</span>
            </button>

            {/* Compare Previous Toggle */}
            {previousIteration && (
              <button
                type="button"
                onClick={() => setIsCompareMode(prev => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                  isCompareMode
                    ? 'bg-[#18181B] border-[#18181B] text-white'
                    : 'bg-white border-[#E4E4E0] hover:bg-[#F4F4F5] text-[#18181B]'
                }`}
                title="Toggle Before/After Comparison Split (Press 'C')"
              >
                <Sliders className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span className="hidden sm:inline">Compare</span>
              </button>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center border border-[#E4E4E0] rounded bg-white">
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(100, prev - 25))}
                className="p-1 hover:bg-[#F4F4F5] text-[#52525B]"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
              <span className="px-2 font-mono text-[11px] text-[#18181B] min-w-[42px] text-center">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(250, prev + 25))}
                className="p-1 hover:bg-[#F4F4F5] text-[#52525B]"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
              {zoomLevel !== 100 && (
                <button
                  type="button"
                  onClick={() => setZoomLevel(100)}
                  className="p-1 hover:bg-[#F4F4F5] text-[#52525B] border-l border-[#E4E4E0]"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3 h-3" strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Center Sketch Sheet on Matte Off-White Archival Cartridge Paper (#FAF9F5) */}
        <div
          className="flex-1 min-h-0 relative flex items-center justify-center p-4 sm:p-6 overflow-hidden"
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={() => setIsDraggingSplit(false)}
          onMouseLeave={() => setIsDraggingSplit(false)}
        >
          {/* Paper Sheet Container */}
          <div
            ref={canvasRef}
            className="relative w-full max-w-[560px] aspect-[4/5] rounded border border-[#D4D4D0] shadow-sm overflow-hidden flex flex-col justify-between"
            style={{
              backgroundColor: '#FAF9F5',
              cursor: isLoupeActive ? 'crosshair' : 'default',
            }}
          >
            {/* Top Sheet Institutional Header */}
            <div className="p-3 border-b border-[#EBEBE8] flex items-center justify-between text-[#52525B] pointer-events-none z-10">
              <div>
                <p className="font-mono font-bold text-[10px] tracking-wider text-[#18181B] uppercase">
                  FORENSIC COMPOSITE // EXHIBIT #{currentIteration.iteration_number}
                </p>
                <p className="font-mono text-[9px] text-[#71717A]">
                  CASE REF: {caseFile.case_number} • LOCK SEED: {caseFile.case_seed}
                </p>
              </div>

              <span className="font-mono text-[9px] px-1.5 py-0.5 border border-[#D4D4D0] text-[#52525B] uppercase">
                CONFIDENTIAL RECORD
              </span>
            </div>

            {/* The Sketch Portrait Viewport */}
            <div
              className="flex-1 relative flex items-center justify-center p-6 overflow-hidden"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out',
              }}
            >
              {/* Silhouette Placeholder when no image exists */}
              {!currentIteration.image_url ? (
                <div className="flex flex-col items-center justify-center text-[#71717A] select-none p-8">
                  <svg viewBox="0 0 100 120" className="h-44 w-36 stroke-[#71717A] fill-[#27272A]/5" strokeWidth="1.5">
                    <path d="M25,35 C25,14 75,14 75,35 C75,62 68,85 50,98 C32,85 25,62 25,35 Z" />
                    <line x1="26" y1="48" x2="74" y2="48" strokeDasharray="2 2" className="stroke-[#71717A]/40" />
                    <line x1="50" y1="18" x2="50" y2="96" strokeDasharray="2 2" className="stroke-[#71717A]/40" />
                  </svg>
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-[#71717A]">
                    Awaiting Biometric Synthesis
                  </p>
                </div>
              ) : (
                <>
                  {/* Single Image View */}
                  {!isCompareMode && (
                    <img
                      src={currentIteration.image_url}
                      alt={`Suspect composite iteration ${currentIteration.iteration_number}`}
                      className={`max-w-full max-h-full object-contain filter contrast-[1.06] select-none transition-all duration-300 ${
                        isLoading ? 'opacity-60 blur-[1px]' : 'opacity-100'
                      }`}
                      draggable={false}
                    />
                  )}

                  
              {/* Interactive 2D Facial Landmark Overlay */}
              <FacialLandmarkOverlay
                isVisible={showLandmarks && !isCompareMode && !!currentIteration.image_url}
                facialState={currentIteration.facial_state}
                disabled={isReadOnly || isLoading}
                onApplyPrompt={(prompt) => {
                  onSendMessage(prompt, 'certain', selectedLanguage);
                }}
              />
                  {/* Compare Split View */}
                  {isCompareMode && previousIteration && (
                    <div className={`relative w-full h-full overflow-hidden select-none transition-all duration-300 ${isLoading ? 'opacity-60 blur-[1px]' : 'opacity-100'}`}>
                      {/* Before (Previous) */}
                      <img
                        src={previousIteration.image_url}
                        alt="Previous Iteration"
                        className="absolute inset-0 w-full h-full object-contain filter contrast-[1.06] select-none"
                        draggable={false}
                      />

                      {/* After (Current) */}
                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{ clipPath: `inset(0 0 0 ${compareSplit}%)` }}
                      >
                        <img
                          src={currentIteration.image_url}
                          alt="Current Iteration"
                          className="absolute inset-0 w-full h-full object-contain filter contrast-[1.06] select-none"
                          draggable={false}
                        />
                      </div>

                      {/* Divider Line */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-[#18181B] cursor-ew-resize z-20"
                        style={{ left: `${compareSplit}%` }}
                        onMouseDown={() => setIsDraggingSplit(true)}
                      >
                        <div className="absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-6 rounded-full bg-[#18181B] text-white flex items-center justify-center text-[10px] font-mono shadow-xs">
                          ||
                        </div>
                      </div>

                      <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-[#18181B] text-white font-mono text-[9px]">
                        Iter {previousIteration.iteration_number}
                      </div>
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#18181B] text-white font-mono text-[9px]">
                        Iter {currentIteration.iteration_number}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Active Forensic Biometric Laser Scan HUD */}
              <ForensicScanOverlay isGenerating={isLoading} />

              {/* Draggable Magnifying Loupe (2.5x circular lens) */}
              {isLoupeActive && !isLoading && (
                <div
                  className="pointer-events-none absolute select-none z-30"
                  style={{
                    left: loupePos.x - 70,
                    top: loupePos.y - 70,
                    width: 140,
                    height: 140,
                  }}
                >
                  <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-[#18181B] shadow-md bg-[#FAF9F5]">
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(${currentIteration.image_url})`,
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '250%',
                        backgroundPosition: `${(loupePos.x / 560) * 100}% ${(loupePos.y / 500) * 100}%`,
                        filter: 'contrast(1.15)',
                      }}
                    />

                    {/* Reticle lines */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                      <div className="w-full h-[0.5px] bg-[#18181B]" />
                      <div className="h-full w-[0.5px] bg-[#18181B] absolute" />
                      <div className="w-4 h-4 rounded-full border border-[#18181B] absolute" />
                    </div>

                    {/* Coordinates tag */}
                    <div className="absolute bottom-1.5 left-0 right-0 flex justify-center">
                      <span className="px-1.5 py-0.2 rounded bg-black/80 text-[8px] font-mono text-white">
                        2.5x • {currentLandmark}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Sheet Metadata Footer */}
            <div className="p-2.5 border-t border-[#EBEBE8] flex items-center justify-between text-[10px] font-mono text-[#71717A] pointer-events-none z-10">
              <span>PROVIDER: {currentIteration.ai_provider?.toUpperCase()}</span>
              <span>RENDER TIME: {currentIteration.latency_ms}MS</span>
            </div>
          </div>
        </div>

        {/* Variations Drawer (Options A / B / C) */}
        {showVariationsDrawer && (
          <div className="border-t border-[#E4E4E0] bg-white p-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold uppercase text-[#18181B]">
                Pick Facial Structure Variation (A / B / C)
              </span>
              <button
                type="button"
                onClick={() => setShowVariationsDrawer(false)}
                className="text-xs text-[#71717A] hover:text-[#18181B]"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: 'A', trait: 'Angular Mandible & Square Chin', delta: 'Angular jawline with squarer mandibular angle' },
                { label: 'B', trait: 'Softer Rounded Chin Contour', delta: 'Softly rounded chin with smoother mandible contour' },
                { label: 'C', trait: 'Broader Nasal Dorsum Bridge', delta: 'Wider nasal dorsum and broader alar base' },
              ].map(v => {
                const varIter: SketchIteration = {
                  ...currentIteration,
                  id: `${currentIteration.id}-var-${v.label}`,
                  variation_label: v.label as any,
                  is_variation: true,
                  image_url: generateForensicSketchDataUrl(
                    { ...currentIteration.facial_state, jawline_chin: v.delta },
                    'forensic_graphite',
                    caseFile.case_seed + (v.label === 'A' ? 0 : v.label === 'B' ? 10 : 20),
                    currentIteration.iteration_number
                  ),
                };

                return (
                  <div
                    key={v.label}
                    onClick={() => {
                      if (!isReadOnly) onSelectVariation(varIter);
                    }}
                    className={`p-2 rounded border border-[#E4E4E0] hover:border-[#18181B] bg-[#FAFAFA] hover:bg-white transition-all cursor-pointer flex items-center gap-2.5 ${
                      isReadOnly ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  >
                    <div className="w-10 h-12 bg-white rounded border border-[#E4E4E0] overflow-hidden flex-shrink-0">
                      <img src={varIter.image_url} alt={v.label} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#18181B]">Option {v.label}</p>
                      <p className="text-[10px] text-[#52525B] truncate">{v.trait}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Utility Bar of Sketch Sheet */}
        <div className="h-12 border-t border-[#E4E4E0] bg-white px-4 flex items-center justify-between text-xs flex-shrink-0">
          {/* Witness Likeness Rating Slider */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-[#52525B]">Likeness Rating:</span>
            <input
              type="range"
              min="1"
              max="10"
              step="0.1"
              disabled={isReadOnly}
              value={likenessInput}
              onChange={e => {
                const val = parseFloat(e.target.value);
                setLikenessInput(val);
                onUpdateLikeness(val);
              }}
              className="w-28 accent-[#18181B] cursor-pointer"
            />
            <span className="font-mono font-bold text-[#18181B] min-w-[36px]">
              {likenessInput.toFixed(1)}/10
            </span>
          </div>

          {/* Variations Drawer Toggle */}
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => setShowVariationsDrawer(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#E4E4E0] hover:border-[#18181B] bg-white hover:bg-[#F4F4F5] font-medium text-[#18181B] transition-colors ${
              isReadOnly ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <Layers className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Generate 3 Variations (A / B / C)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
