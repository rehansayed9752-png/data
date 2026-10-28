import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
import { panelContainer, panelRise } from '../../styles/tokens';
import { apiClient } from '../../api/client';

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
  externalToolTrigger?: {
    tabMode?: 'canvas' | 'variations';
    isCompareMode?: boolean;
    showInspector?: boolean;
    showDisguises?: boolean;
  };
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
  externalToolTrigger,
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

    const formattedPrompt = directCategory && directValue 
      ? `Adjust ${directCategory} to: ${directValue}. ${text}`
      : text;

    apiClient
      .generateOrRefineSketch(caseFile.id, {
        parent_iteration_id: currentIteration.id,
        witness_prompt: formattedPrompt,
        render_style: renderStyle,
        confidence,
        language,
      })
      .then((serverIteration: any) => {
        // Backend returns SketchIterationSchema which maps to SketchIteration
        const nextIterationNumber = serverIteration.iteration_number || iterations.length + 1;
        const mappedIteration: SketchIteration = {
          id: serverIteration.id || `iter-${nextIterationNumber}`,
          case_id: serverIteration.case_id || caseFile.id,
          iteration_number: nextIterationNumber,
          parent_iteration_id: serverIteration.parent_iteration_id || currentIteration.id,
          image_url: serverIteration.image_url?.startsWith('/static')
            ? `http://localhost:8000${serverIteration.image_url}`
            : (serverIteration.image_url || currentIteration.image_url),
          witness_prompt: serverIteration.witness_prompt || text,
          witness_likeness_score: serverIteration.witness_likeness_score || Math.min(9.8, parseFloat((currentIteration.witness_likeness_score + 0.6).toFixed(1))),
          ai_provider: (serverIteration.ai_provider_used as any) || serverIteration.ai_provider || 'gemini-2.5-flash-image',
          latency_ms: serverIteration.generation_latency_ms || serverIteration.latency_ms || 2100,
          created_at: serverIteration.created_at || new Date().toISOString(),
          facial_state: serverIteration.facial_state_snapshot || serverIteration.facial_state || currentIteration.facial_state,
          changed_fields: (serverIteration.changed_traits || serverIteration.changed_fields || ['jawline_chin']) as (keyof FacialStateJSON)[],
          confidence_rating: confidence === 'not_sure' ? 'maybe' : confidence,
        };

        setIterations(prev => [...prev, mappedIteration]);
        setCurrentIterationId(mappedIteration.id);

        const systemReply: ChatMessage = {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: `Iteration #${mappedIteration.iteration_number} generated via ${mappedIteration.ai_provider}. Identity locked. Updated anatomical regions: ${mappedIteration.changed_fields.join(', ')}.`,
          timestamp: new Date().toISOString(),
          changed_traits: mappedIteration.changed_fields,
        };
        setMessages(prev => [...prev, systemReply]);

        onLogAuditEvent('REFINED_FACIAL_FEATURE', `Iteration #${mappedIteration.iteration_number}`, {
          parent_iteration: currentIteration.id,
          witness_prompt: text,
          changed_fields: mappedIteration.changed_fields,
          confidence,
          provider: mappedIteration.ai_provider,
        });

        setIsLoading(false);
      })
      .catch((_err) => {
        // Fallback strictly to local procedural generator if backend is unreachable
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

        const fallbackIteration: SketchIteration = {
          id: nextIterationId,
          case_id: caseFile.id,
          iteration_number: nextIterationNumber,
          parent_iteration_id: currentIteration.id,
          image_url: newImageUrl,
          witness_prompt: text,
          witness_likeness_score: Math.min(9.8, parseFloat((currentIteration.witness_likeness_score + 0.6).toFixed(1))),
          ai_provider: 'local-procedural',
          latency_ms: Math.floor(Math.random() * 800) + 2100,
          created_at: new Date().toISOString(),
          facial_state: updatedFacialState,
          changed_fields: changedFields,
          confidence_rating: confidence === 'not_sure' ? 'maybe' : confidence,
        };

        setIterations(prev => [...prev, fallbackIteration]);
        setCurrentIterationId(nextIterationId);

        // System notification message
        const systemReply: ChatMessage = {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: `Iteration #${nextIterationNumber} generated via local-procedural fallback. Identity locked. Updated anatomical regions: ${changedFields.join(', ')}.`,
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
          provider: 'local-procedural',
        });

        setIsLoading(false);
      });
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
      witness_prompt: `[Branch from #${iterationToFork.iteration_number}] Memory update`,
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
    <motion.div
      variants={panelContainer}
      initial="hidden"
      animate="visible"
      className="flex-1 p-3 sm:p-4 flex flex-col space-y-3 overflow-hidden max-w-[1700px] mx-auto w-full font-sans"
    >
      {/* Split-screen layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 min-h-0">
        {/* Left Column: Witness Chat & Feature Quick Chips */}
        <motion.div
          variants={panelRise}
          className="lg:col-span-5 flex flex-col space-y-3 min-h-[460px] lg:min-h-0 lg:h-full lg:overflow-hidden"
        >
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <RefinementChat
              messages={messages}
              onSendMessage={handleWitnessMessage}
              isLoading={isLoading}
              currentFacialState={currentIteration.facial_state}
            />
          </div>

          <div className="flex-shrink-0">
            <FeatureQuickChips
              onSelectTrait={handleSelectTrait}
              disabled={isLoading}
            />
          </div>
        </motion.div>

        {/* Right Column: Canvas Viewport & Iteration Timeline */}
        <motion.div
          variants={panelRise}
          className="lg:col-span-7 flex flex-col space-y-3 min-h-[460px] lg:min-h-0 lg:h-full lg:overflow-hidden"
        >
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <CanvasViewer
              currentIteration={currentIteration}
              previousIteration={previousIteration}
              renderStyle={renderStyle}
              onUpdateLikeness={handleUpdateLikeness}
              onSelectVariation={handleBranchIteration}
              externalToolTrigger={externalToolTrigger}
            />
          </div>

          <div className="flex-shrink-0">
            <IterationTimeline
              iterations={iterations}
              currentIterationId={currentIteration.id}
              onSelectIteration={it => setCurrentIterationId(it.id)}
              onBranchIteration={handleBranchIteration}
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
