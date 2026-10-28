import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Mic,
  MicOff,
  Globe2,
  AlertCircle,
  Bot,
  User,
  Sparkles,
} from 'lucide-react';
import { messageSlideUp, chipPop } from '../../styles/tokens';
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

const REGIONAL_LANGUAGES: { code: SupportedLanguage; name: string; native: string }[] = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
];

const COGNITIVE_QUESTIONS = [
  {
    field: 'jawline_chin',
    question: 'Think about the suspect’s lower face: was the chin pointed, square, or softly rounded?',
    hints: ['Broad square jaw', 'Tapered pointed chin', 'Cleft chin'],
  },
  {
    field: 'eyes',
    question: 'How did their gaze appear? Were the eyes narrow almond slits, or wide and deep-set?',
    hints: ['Narrow almond slits', 'Deep-set eyes with dark shadows', 'Wide almond eyes'],
  },
  {
    field: 'nose',
    question: 'Focus on the bridge of the nose: was it straight, hooked downwards, or crooked?',
    hints: ['Hooked downward tip', 'Straight thin bridge', 'Crooked/broken bridge'],
  },
  {
    field: 'scars_marks_tattoos',
    question: 'Did you notice any identifying marks, birthmarks, moles, or scars on the face?',
    hints: ['Vertical scar over right brow', 'Knife scar on left cheek', 'Mole near mouth'],
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

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const checkForContradictions = (text: string) => {
    const lower = text.toLowerCase();
    if (
      (lower.includes('teen') || lower.includes('18') || lower.includes('20')) &&
      (currentFacialState.facial_hair.toLowerCase().includes('grey') || lower.includes('grey beard'))
    ) {
      return 'Notice: Subject age was stated as ~20 while a grey beard was noted earlier. Would you like to revise or proceed?';
    }
    if (lower.includes('clean shaven') && (lower.includes('heavy beard') || lower.includes('full beard'))) {
      return 'Notice: Description mentions "clean shaven" alongside "heavy beard". Clarify which is accurate.';
    }
    return null;
  };

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

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => (prev ? `${prev} ${transcript}` : transcript));
        setIsRecording(false);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const detectedConflict = checkForContradictions(inputText);
    setContradictionWarning(detectedConflict);

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
    <div className="flex flex-col h-full bg-surface-card border border-line-subtle rounded-xl overflow-hidden shadow-xs font-sans">
      {/* Chat header */}
      <div className="px-4 py-3 bg-surface-base/80 border-b border-line-subtle flex items-center justify-between gap-2">
        <div>
          <h3 className="font-serif font-medium text-sm text-ink-heading tracking-wide">
            Witness Conversation
          </h3>
          <p className="text-[11px] text-ink-muted">
            Describe what the witness remembers in natural language
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Guided Questions Toggle */}
          <button
            type="button"
            onClick={() => setInterviewMode(!interviewMode)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-all ${
              interviewMode
                ? 'bg-accent/20 text-accent border border-accent/40'
                : 'bg-surface-elevated text-ink-muted hover:text-ink-body border border-line-subtle'
            }`}
            title="Toggle sequential question assistance"
          >
            <Bot className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
            <span className="hidden sm:inline">Guided Questions</span>
          </button>

          {/* Language Selector */}
          <div className="flex items-center space-x-1 bg-surface-base border border-line-subtle rounded-md px-2 py-1">
            <Globe2 className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.5} />
            <select
              value={selectedLanguage}
              onChange={e => setSelectedLanguage(e.target.value as SupportedLanguage)}
              className="bg-transparent text-xs text-ink-body focus:outline-none cursor-pointer"
            >
              {REGIONAL_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code} className="bg-surface-card text-ink-body">
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Contradiction Warning */}
      {contradictionWarning && (
        <div className="px-4 py-2 bg-surface-elevated border-b border-accent/30 flex items-start space-x-2 text-xs text-ink-heading">
          <AlertCircle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="flex-1 text-[11.5px] leading-relaxed">
            {contradictionWarning}
          </div>
          <button
            type="button"
            onClick={() => setContradictionWarning(null)}
            className="text-ink-muted hover:text-ink-heading text-[11px] font-mono ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Guided Question Box */}
      {interviewMode && currentCognitiveQuestion && (
        <div className="m-3 p-3 bg-surface-base border border-line-subtle rounded-lg text-xs">
          <div className="flex items-center justify-between text-[10.5px] font-mono text-accent uppercase mb-1">
            <span>Question {questionIndex + 1} of {COGNITIVE_QUESTIONS.length}</span>
            <span className="text-ink-faint">Focus: {currentCognitiveQuestion.field}</span>
          </div>
          <p className="font-medium text-ink-heading mb-2">
            {currentCognitiveQuestion.question}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {currentCognitiveQuestion.hints.map(hint => (
              <button
                key={hint}
                type="button"
                onClick={() => setInputText(hint)}
                className="px-2 py-0.5 rounded bg-surface-card hover:bg-surface-elevated border border-line-subtle text-[11px] text-ink-muted hover:text-ink-body transition-colors"
              >
                + {hint}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 p-4 overflow-y-auto overscroll-contain space-y-3"
        style={{ overscrollBehavior: 'contain' }}
      >
        <AnimatePresence initial={false}>
          {messages.map(msg => {
            const isWitness = msg.sender === 'witness';
            return (
              <motion.div
                key={msg.id}
                variants={messageSlideUp}
                initial="hidden"
                animate="visible"
                className={`flex flex-col ${isWitness ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-lg text-xs leading-relaxed border transition-colors ${
                    isWitness
                      ? 'bg-surface-elevated text-ink-heading border-line-medium'
                      : 'bg-surface-base text-ink-body border-line-subtle'
                  }`}
                >
                  {/* Meta Header */}
                  <div className="flex items-center justify-between gap-3 text-[10.5px] text-ink-muted pb-1 mb-1.5 border-b border-line-subtle">
                    <div className="flex items-center space-x-1.5 font-medium">
                      {isWitness ? (
                        <>
                          <User className="w-3 h-3 text-accent" strokeWidth={1.5} />
                          <span className="text-ink-heading">Witness statement</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-ink-muted" strokeWidth={1.5} />
                          <span>Forensic composite engine</span>
                        </>
                      )}
                      {msg.is_audio && (
                        <span className="text-[9px] font-mono px-1 rounded bg-surface-card text-ink-muted">
                          Voice
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {msg.confidence && (
                        <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono uppercase bg-surface-card text-ink-muted">
                          {msg.confidence}
                        </span>
                      )}
                      <span className="font-mono text-[9.5px] text-ink-faint">
                        {msg.timestamp.slice(11, 16)}
                      </span>
                    </div>
                  </div>

                  {/* Body Text */}
                  <div className="text-[12px] text-ink-body leading-relaxed">
                    {msg.text}
                  </div>

                  {/* Regional language quote if non-English */}
                  {msg.original_text && (
                    <div className="mt-2 pt-1.5 border-t border-line-subtle text-[11px] text-ink-muted italic font-serif">
                      "{msg.original_text}"
                    </div>
                  )}

                  {/* Small quiet trait chips */}
                  {msg.changed_traits && msg.changed_traits.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-line-subtle flex flex-wrap gap-1">
                      {msg.changed_traits.map(trait => (
                        <motion.span
                          key={trait}
                          variants={chipPop}
                          initial="hidden"
                          animate="visible"
                          className="px-2 py-0.5 rounded text-[10px] font-mono text-ink-muted bg-surface-card border border-line-subtle"
                        >
                          +{trait}
                        </motion.span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator (3 pulsing dots in sequence) */}
        {isLoading && (
          <div className="flex items-center space-x-2.5 p-3 rounded-lg bg-surface-base border border-line-subtle text-xs text-ink-muted w-fit">
            <span className="text-[11.5px] text-ink-muted">Artist drafting composite</span>
            <div className="flex items-center space-x-1 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent typing-dot-1"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-accent typing-dot-2"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-accent typing-dot-3"></span>
            </div>
          </div>
        )}


      </div>

      {/* Input Form & Confidence Selector */}
      <div className="p-3 bg-surface-base/80 border-t border-line-subtle space-y-2">
        {/* Certainty selector */}
        <div className="flex items-center justify-between text-[11px] text-ink-muted">
          <div className="flex items-center space-x-1.5">
            <span className="text-ink-faint text-[10.5px]">Witness certainty:</span>
            {(['certain', 'likely', 'maybe', 'not_sure'] as const).map(rate => (
              <button
                key={rate}
                type="button"
                onClick={() => setConfidence(rate)}
                className={`px-2 py-0.5 rounded text-[10.5px] font-mono capitalize transition-all ${
                  confidence === rate
                    ? 'bg-accent/20 text-accent border border-accent/40 font-medium'
                    : 'text-ink-muted hover:text-ink-heading hover:bg-surface-elevated'
                }`}
              >
                {rate.replace('_', ' ')}
              </button>
            ))}
          </div>

          <span className="text-ink-faint text-[10.5px] hidden sm:inline">
            Press Enter to submit
          </span>
        </div>

        {/* Input field */}
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder={
              selectedLanguage === 'en'
                ? 'Describe what the witness remembers (e.g., "sharper jaw, narrow almond eyes")...'
                : `Enter description in ${selectedLanguage.toUpperCase()}...`
            }
            className="w-full pl-3.5 pr-20 py-2.5 bg-surface-card border border-line-subtle rounded-md text-xs text-ink-body placeholder-ink-faint focus:border-accent focus:outline-none transition-colors"
          />

          <div className="absolute right-1.5 flex items-center space-x-1">
            <button
              type="button"
              onClick={handleToggleVoice}
              disabled={isLoading}
              className={`p-1.5 rounded-md transition-all ${
                isRecording
                  ? 'bg-accent text-surface-base animate-pulse'
                  : 'text-ink-muted hover:text-accent hover:bg-surface-elevated'
              }`}
              title="Speak description via browser speech recognition"
            >
              {isRecording ? <MicOff className="w-4 h-4" strokeWidth={1.5} /> : <Mic className="w-4 h-4" strokeWidth={1.5} />}
            </button>

            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-1.5 rounded-md bg-accent hover:bg-accent-hover text-surface-base disabled:opacity-35 transition-all active:scale-[0.98]"
              title="Submit statement"
            >
              <Send className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
