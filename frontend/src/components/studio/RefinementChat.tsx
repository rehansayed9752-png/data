import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Globe2,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  MessageSquare,
  Bot,
  User,
  CheckCircle2,
  CornerDownRight,
  ShieldAlert,
} from 'lucide-react';
import { ChatMessage, SupportedLanguage, FacialStateJSON } from '../../types/forensic';

interface RefinementChatProps {
  messages: ChatMessage[];
  onSendMessage: (
    text: string,
    confidence: 'certain' | 'likely' | 'maybe' | 'not_sure',
    language: SupportedLanguage,
    originalText?: string
  ) => void;
  isLoading: boolean;
  currentFacialState: FacialStateJSON;
}

const REGIONAL_LANGUAGES: { code: SupportedLanguage; name: string; native: string; sample: string }[] = [
  { code: 'en', name: 'English', native: 'English', sample: 'Narrow the eyes and sharpen the chin' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', sample: 'ದವಡೆ ಮತ್ತು ಗಲ್ಲವನ್ನು ಚೂಪು ಮಾಡಿ (Make jaw and chin sharper)' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', sample: 'जबड़ा चौकोर और आंखें बादामी बनाएं (Square jaw, almond eyes)' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', sample: 'हनुवटी टोकदार करा आणि मिशी काढा (Sharp chin, faint mustache)' },
];

const COGNITIVE_QUESTIONS = [
  {
    field: 'jawline_chin',
    question: 'Focus on the suspect’s lower face: was the chin sharp and pointed, square and broad, or rounded?',
    hints: ['Broad square jaw', 'Tapered pointed chin', 'Cleft chin'],
  },
  {
    field: 'eyes',
    question: 'How did their gaze and eyelids appear? Were the eyes narrow almond-shaped, or wide and deep-set?',
    hints: ['Narrow almond slits', 'Deep-set eyes with dark circles', 'Wide open round eyes'],
  },
  {
    field: 'nose',
    question: 'Look at the nasal bridge: was it straight, hooked downwards, or crooked from an old injury?',
    hints: ['Hooked downward tip', 'Straight thin bridge', 'Crooked/broken bridge'],
  },
  {
    field: 'scars_marks_tattoos',
    question: 'Did you notice any forensic marks, birthmarks, moles, or scars on either cheek or near the eyebrows?',
    hints: ['Vertical scar over right brow', 'Knife scar on left cheek', 'Small mole near mouth'],
  },
];

export const RefinementChat: React.FC<RefinementChatProps> = ({
  messages,
  onSendMessage,
  isLoading,
  currentFacialState,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en');
  const [confidence, setConfidence] = useState<'certain' | 'likely' | 'maybe' | 'not_sure'>('certain');
  const [isRecording, setIsRecording] = useState(false);
  const [interviewMode, setInterviewMode] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [contradictionWarning, setContradictionWarning] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Contradiction detection engine
  const checkForContradictions = (text: string) => {
    const lower = text.toLowerCase();
    // Rule: young age conflicting with heavy grey beard
    if (
      (lower.includes('teen') || lower.includes('18') || lower.includes('20')) &&
      (currentFacialState.facial_hair.toLowerCase().includes('grey') || lower.includes('grey beard'))
    ) {
      return 'Potential Contradiction Flagged: Subject age entered as ~20 while grey beard was noted earlier. Would you like to revise or proceed?';
    }
    // Rule: clean shaven vs heavy beard
    if (lower.includes('clean shaven') && (lower.includes('heavy beard') || lower.includes('full beard'))) {
      return 'Anatomical Conflict: Stated "clean shaven" alongside "heavy beard". Clarify which is accurate.';
    }
    return null;
  };

  // Browser Web Speech API handler
  const handleToggleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not natively supported in this browser. Please use text input.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      const langMap: Record<SupportedLanguage, string> = {
        en: 'en-US',
        kn: 'kn-IN',
        hi: 'hi-IN',
        mr: 'mr-IN',
      };
      recognition.lang = langMap[selectedLanguage];

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => (prev ? `${prev} ${transcript}` : transcript));
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const detectedConflict = checkForContradictions(inputText);
    if (detectedConflict) {
      setContradictionWarning(detectedConflict);
    } else {
      setContradictionWarning(null);
    }

    let originalText: string | undefined = undefined;
    if (selectedLanguage !== 'en') {
      originalText = inputText;
    }

    onSendMessage(inputText, confidence, selectedLanguage, originalText);
    setInputText('');

    if (interviewMode && questionIndex < COGNITIVE_QUESTIONS.length - 1) {
      setQuestionIndex(prev => prev + 1);
    }
  };

  const currentCognitiveQuestion = COGNITIVE_QUESTIONS[questionIndex];

  return (
    <div className="flex flex-col h-full bg-[#0a0c12] border border-white/[0.08] rounded-xl overflow-hidden">
      {/* Chat header with mode and language selector */}
      <div className="p-3 bg-[#0d1017] border-b border-white/[0.07] flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-amber-400"></div>
          <span className="font-display font-semibold text-xs text-zinc-200">
            Witness Refinement Stream
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            ({messages.length} Turns Logged)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Cognitive Interview Mode Toggle */}
          <button
            onClick={() => setInterviewMode(!interviewMode)}
            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center space-x-1 transition-all ${
              interviewMode
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-white/[0.06]'
            }`}
            title="Toggle step-by-step cognitive anatomical interview"
          >
            <Bot className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">AI Interviewer</span>
          </button>

          {/* Regional Language Selector */}
          <div className="flex items-center space-x-1 bg-[#131722] border border-white/[0.08] rounded px-1.5 py-0.5">
            <Globe2 className="w-3 h-3 text-amber-400" />
            <select
              value={selectedLanguage}
              onChange={e => setSelectedLanguage(e.target.value as SupportedLanguage)}
              className="bg-transparent text-[11px] font-mono text-zinc-300 focus:outline-none cursor-pointer"
            >
              {REGIONAL_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code} className="bg-[#131722] text-zinc-200">
                  {lang.name} ({lang.native})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Contradiction Warning Alert Banner */}
      {contradictionWarning && (
        <div className="p-2.5 bg-red-950/40 border-b border-red-500/30 flex items-start space-x-2 text-xs text-red-200 animate-fadeIn">
          <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-red-300">Contradiction Warning: </span>
            {contradictionWarning}
          </div>
          <button
            onClick={() => setContradictionWarning(null)}
            className="text-red-400 hover:text-white text-[11px] font-mono"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* AI Interview Guidance Card (if interview mode active) */}
      {interviewMode && currentCognitiveQuestion && (
        <div className="m-3 p-3 bg-gradient-to-r from-cyan-950/30 to-indigo-950/30 border border-cyan-500/30 rounded-lg">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-cyan-400 font-semibold mb-1">
            <div className="flex items-center space-x-1.5">
              <Bot className="w-3.5 h-3.5" />
              <span>Cognitive Question {questionIndex + 1} of {COGNITIVE_QUESTIONS.length}</span>
            </div>
            <span>Field: {currentCognitiveQuestion.field}</span>
          </div>
          <p className="text-xs text-zinc-200 font-medium mb-2">
            {currentCognitiveQuestion.question}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {currentCognitiveQuestion.hints.map(hint => (
              <button
                key={hint}
                onClick={() => setInputText(hint)}
                className="px-2 py-0.5 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/30 rounded text-[10px] font-mono text-cyan-300 transition-colors"
              >
                + {hint}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 font-sans">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'witness' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[88%] p-3 rounded-lg text-xs leading-relaxed border ${
                msg.sender === 'witness'
                  ? 'bg-[#181d2a] text-zinc-100 border-white/[0.09] shadow-sm'
                  : msg.sender === 'interviewer_ai'
                  ? 'bg-cyan-950/20 text-cyan-200 border-cyan-500/30'
                  : 'bg-[#11141d] text-zinc-300 border-white/[0.06]'
              }`}
            >
              {/* Message Header */}
              <div className="flex items-center justify-between gap-3 text-[10px] font-mono text-zinc-500 pb-1.5 mb-1.5 border-b border-white/[0.05]">
                <div className="flex items-center space-x-1">
                  {msg.sender === 'witness' ? (
                    <>
                      <User className="w-3 h-3 text-amber-400" />
                      <span className="text-amber-300 font-semibold">Witness Statement</span>
                    </>
                  ) : msg.sender === 'interviewer_ai' ? (
                    <>
                      <Bot className="w-3 h-3 text-cyan-400" />
                      <span className="text-cyan-300 font-semibold">AI Interviewer</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-zinc-400" />
                      <span className="text-zinc-400 font-semibold">Forensic System</span>
                    </>
                  )}
                  {msg.is_audio && (
                    <span className="px-1 bg-amber-500/20 text-amber-300 rounded text-[9px]">
                      AUDIO
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1.5">
                  {msg.confidence && (
                    <span
                      className={`px-1 rounded text-[9px] font-semibold uppercase ${
                        msg.confidence === 'certain'
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : msg.confidence === 'likely'
                          ? 'text-amber-400 bg-amber-500/10'
                          : 'text-zinc-400 bg-zinc-800'
                      }`}
                    >
                      {msg.confidence}
                    </span>
                  )}
                  <span>{msg.timestamp.slice(11, 16)}</span>
                </div>
              </div>

              {/* Message Text */}
              <div className="text-zinc-200">{msg.text}</div>

              {/* Original language transcript if non-English */}
              {msg.original_text && (
                <div className="mt-1.5 pt-1.5 border-t border-white/[0.06] text-[11px] text-amber-300/80 font-serif">
                  <span className="text-[9px] font-mono uppercase text-zinc-500 block">
                    Original Statement ({msg.language?.toUpperCase()}):
                  </span>
                  "{msg.original_text}"
                </div>
              )}

              {/* Changed anatomical tags */}
              {msg.changed_traits && msg.changed_traits.length > 0 && (
                <div className="mt-2 pt-1.5 border-t border-white/[0.06] flex flex-wrap gap-1">
                  {msg.changed_traits.map(trait => (
                    <span
                      key={trait}
                      className="px-1.5 py-0.2 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[9.5px] font-mono rounded"
                    >
                      +{trait}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading state indicator */}
        {isLoading && (
          <div className="flex items-center space-x-2.5 p-3 rounded-lg bg-[#121622] border border-amber-500/30 text-xs text-amber-300 animate-pulse">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            <div className="font-mono">
              Compiling 14-region facial vectors and executing surgical image delta...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input controls & Prompt Bar */}
      <div className="p-3 bg-[#0d1017] border-t border-white/[0.08]">
        {/* Confidence rating pills */}
        <div className="flex items-center justify-between mb-2 text-[10px] font-mono text-zinc-400">
          <div className="flex items-center space-x-2">
            <span className="text-zinc-400">Witness Confidence:</span>
            {(['certain', 'likely', 'maybe', 'not_sure'] as const).map(rate => (
              <button
                key={rate}
                type="button"
                onClick={() => setConfidence(rate)}
                className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold transition-all ${
                  confidence === rate
                    ? rate === 'certain'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : rate === 'likely'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-zinc-700 text-zinc-200 border border-zinc-500'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {rate}
              </button>
            ))}
          </div>

          <span className="text-zinc-400 hidden sm:inline">
            Preserves unmentioned identity features
          </span>
        </div>

        {/* Input box with mic and submit */}
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder={
              selectedLanguage === 'en'
                ? 'Describe suspect refinement (e.g., "make chin more pointed and narrow the eyes")...'
                : `Enter description in ${selectedLanguage.toUpperCase()}...`
            }
            className="w-full pl-3 pr-24 py-2.5 bg-[#141824] border border-white/[0.1] rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 transition-colors font-sans"
          />

          <div className="absolute right-1.5 flex items-center space-x-1">
            {/* Voice Dictation Button */}
            <button
              type="button"
              onClick={handleToggleVoice}
              disabled={isLoading}
              className={`p-1.5 rounded transition-all ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-zinc-400 hover:text-amber-400 hover:bg-white/[0.05]'
              }`}
              title="Speak witness statement via Web Speech API"
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send / Refine button */}
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-1.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 disabled:opacity-40 disabled:hover:bg-amber-500 transition-all font-semibold"
              title="Apply feature refinement"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
