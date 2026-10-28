import React, { useState } from 'react';
import { RefinementChat } from './RefinementChat';
import { FeatureQuickChips } from './FeatureQuickChips';
import { CanvasViewer } from './CanvasViewer';
import { IterationTimeline } from './IterationTimeline';
import {
  CaseFile,
  SketchIteration,
  ChatMessage,
  FacialStateJSON,
  RenderStyle,
  SupportedLanguage,
  OfficerProfile,
} from '../../types/forensic';
import { generateForensicSketchDataUrl } from '../../utils/proceduralSketch';

interface SketchStudioProps {
  caseFile: CaseFile;
  currentOfficer: OfficerProfile;
  renderStyle: RenderStyle;
  iterations: SketchIteration[];
  setIterations: React.Dispatch<React.SetStateAction<SketchIteration[]>>;
  currentIterationId: string;
  setCurrentIterationId: (id: string) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onLogAuditEvent: (actionType: any, target: string, details: any) => void;
}

export const SketchStudio: React.FC<SketchStudioProps> = ({
  caseFile,
  currentOfficer,
  renderStyle,
  iterations,
  setIterations,
  currentIterationId,
  setCurrentIterationId,
  messages,
  setMessages,
  onLogAuditEvent,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const currentIteration =
    iterations.find(it => it.id === currentIterationId) || iterations[iterations.length - 1];

  const currentIdx = iterations.findIndex(it => it.id === currentIteration.id);
  const previousIteration = currentIdx > 0 ? iterations[currentIdx - 1] : null;

  // Handle trait selection from Quick-Chips
  const handleSelectTrait = (
    category: keyof FacialStateJSON,
    value: string,
    promptSnippet: string
  ) => {
    handleWitnessMessage(
      promptSnippet,
      'certain',
      'en',
      undefined,
      category,
      value
    );
  };

  // Main witness refinement generator
  const handleWitnessMessage = (
    text: string,
    confidence: 'certain' | 'likely' | 'maybe' | 'not_sure',
    language: SupportedLanguage,
    originalText?: string,
    directCategory?: keyof FacialStateJSON,
    directValue?: string
  ) => {
    setIsLoading(true);

    const newMsgId = `msg-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: newMsgId,
      sender: 'witness',
      text,
      original_text: originalText,
      language,
      timestamp: new Date().toISOString(),
      confidence,
    };

    setMessages(prev => [...prev, userMessage]);

    // Simulate surgical AI refinement with Gemini 2.5 Flash Image / locked seed
    setTimeout(() => {
      const changedFields: (keyof FacialStateJSON)[] = [];
      const updatedFacialState = { ...currentIteration.facial_state };

      const lower = text.toLowerCase();
      if (directCategory && directValue) {
        updatedFacialState[directCategory] = directValue;
        changedFields.push(directCategory);
      } else {
        // Natural language parsing rules
        if (lower.includes('jaw') || lower.includes('chin')) {
          updatedFacialState.jawline_chin = lower.includes('square')
            ? 'Broad square mandibular jawline with blunt chin'
            : 'Tapered angular jaw with narrower pointed chin';
          changedFields.push('jawline_chin');
        }
        if (lower.includes('eye') || lower.includes('brow')) {
          updatedFacialState.eyes = lower.includes('narrow') || lower.includes('almond')
            ? 'Narrow deep-set almond eyes with intense gaze'
            : 'Wider hooded almond eyes set slightly further apart';
          changedFields.push('eyes');
          if (lower.includes('bushy') || lower.includes('thick')) {
            updatedFacialState.eyebrows = 'Very thick bushy dark eyebrows with low horizontal arch';
            changedFields.push('eyebrows');
          }
        }
        if (lower.includes('nose')) {
          updatedFacialState.nose = lower.includes('hook') || lower.includes('crook')
            ? 'Crooked bridge with slight hooked downward tip'
            : 'Straight narrow aquiline nose bridge';
          changedFields.push('nose');
        }
        if (lower.includes('scar') || lower.includes('mark')) {
          updatedFacialState.scars_marks_tattoos = 'Vertical scar above right eyebrow AND distinct knife scar on left cheek';
          changedFields.push('scars_marks_tattoos');
        }
        if (lower.includes('beard') || lower.includes('mustache') || lower.includes('stubble')) {
          updatedFacialState.facial_hair = lower.includes('clean')
            ? 'Clean-shaven lower face with visible bone contours'
            : 'Heavy dark 5 o-clock stubble with faint mustache contour';
          changedFields.push('facial_hair');
        }
      }

      if (changedFields.length === 0) {
        changedFields.push('jawline_chin', 'eyes');
      }

      const nextIterationNumber = iterations.length + 1;
      const nextIterationId = `iter-${nextIterationNumber}`;

      const newImageUrl = generateForensicSketchDataUrl(
        updatedFacialState,
        renderStyle,
        caseFile.case_seed,
        nextIterationNumber
      );

      const newIteration: SketchIteration = {
        id: nextIterationId,
        case_id: caseFile.id,
        iteration_number: nextIterationNumber,
        parent_iteration_id: currentIteration.id,
        image_url: newImageUrl,
        witness_prompt: text,
        witness_likeness_score: Math.min(9.8, parseFloat((currentIteration.witness_likeness_score + 0.6).toFixed(1))),
        ai_provider: 'gemini-2.5-flash-image',
        latency_ms: Math.floor(Math.random() * 800) + 2100,
        created_at: new Date().toISOString(),
        facial_state: updatedFacialState,
        changed_fields: changedFields,
        confidence_rating: confidence === 'not_sure' ? 'maybe' : confidence,
      };

      setIterations(prev => [...prev, newIteration]);
      setCurrentIterationId(nextIterationId);

      // System notification message
      const systemReply: ChatMessage = {
        id: `sys-${Date.now()}`,
        sender: 'system',
        text: `Iteration #${nextIterationNumber} generated via gemini-2.5-flash-image. Identity locked. Updated anatomical regions: ${changedFields.join(', ')}.`,
        timestamp: new Date().toISOString(),
        changed_traits: changedFields,
      };
      setMessages(prev => [...prev, systemReply]);

      // Audit event
      onLogAuditEvent('REFINED_FACIAL_FEATURE', `Iteration #${nextIterationNumber}`, {
        parent_iteration: currentIteration.id,
        witness_prompt: text,
        changed_fields: changedFields,
        confidence,
        provider: 'gemini-2.5-flash-image',
      });

      setIsLoading(false);
    }, 1200);
  };

  // Update Likeness rating
  const handleUpdateLikeness = (score: number) => {
    setIterations(prev =>
      prev.map(it => (it.id === currentIteration.id ? { ...it, witness_likeness_score: score } : it))
    );
    onLogAuditEvent('UPDATED_LIKENESS_SCORE', `Iteration #${currentIteration.iteration_number}`, {
      likeness_score: score,
      officer_badge: currentOfficer.badge_number,
    });
  };

  // Branch from prior iteration
  const handleBranchIteration = (iterationToFork: SketchIteration) => {
    const nextIterationNumber = iterations.length + 1;
    const forkedIteration: SketchIteration = {
      ...iterationToFork,
      id: `iter-${nextIterationNumber}-branch`,
      iteration_number: nextIterationNumber,
      parent_iteration_id: iterationToFork.id,
      witness_prompt: `[BRANCHED FROM #${iterationToFork.iteration_number}] Memory update branch`,
      created_at: new Date().toISOString(),
    };

    setIterations(prev => [...prev, forkedIteration]);
    setCurrentIterationId(forkedIteration.id);

    onLogAuditEvent('REVERTED_ITERATION', `Iteration #${iterationToFork.iteration_number}`, {
      branched_from: iterationToFork.id,
      new_iteration_id: forkedIteration.id,
    });
  };

  return (
    <div className="flex-1 p-3 flex flex-col space-y-3 overflow-hidden max-w-[1700px] mx-auto w-full">
      {/* Main split-screen layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        {/* Left Column (5 of 12 cols = ~42% width): Chat & Quick-Chips */}
        <div className="lg:col-span-5 flex flex-col space-y-3 min-h-[520px]">
          <div className="flex-1 min-h-0">
            <RefinementChat
              messages={messages}
              onSendMessage={handleWitnessMessage}
              isLoading={isLoading}
              currentFacialState={currentIteration.facial_state}
            />
          </div>

          <FeatureQuickChips
            onSelectTrait={handleSelectTrait}
            disabled={isLoading}
          />
        </div>

        {/* Right Column (7 of 12 cols = ~58% width): Canvas Viewport */}
        <div className="lg:col-span-7 flex flex-col space-y-3 min-h-[520px]">
          <div className="flex-1 min-h-0">
            <CanvasViewer
              currentIteration={currentIteration}
              previousIteration={previousIteration}
              renderStyle={renderStyle}
              onUpdateLikeness={handleUpdateLikeness}
              onSelectVariation={handleBranchIteration}
            />
          </div>

          <IterationTimeline
            iterations={iterations}
            currentIterationId={currentIteration.id}
            onSelectIteration={it => setCurrentIterationId(it.id)}
            onBranchIteration={handleBranchIteration}
          />
        </div>
      </div>
    </div>
  );
};
