import React from 'react';
import { motion } from 'framer-motion';
import { GitBranch, Clock } from 'lucide-react';
import { SketchIteration } from '../../types/forensic';
import { buttonHoverLift } from '../../styles/tokens';

interface IterationTimelineProps {
  iterations: SketchIteration[];
  currentIterationId: string;
  onSelectIteration: (iteration: SketchIteration) => void;
  onBranchIteration: (iteration: SketchIteration) => void;
}

export const IterationTimeline: React.FC<IterationTimelineProps> = ({
  iterations,
  currentIterationId,
  onSelectIteration,
  onBranchIteration,
}) => {
  return (
    <div className="bg-surface-card border border-line-subtle rounded-xl p-3 font-sans">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-line-subtle">
        <div className="flex items-center space-x-2">
          <GitBranch className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
          <span className="font-serif font-semibold text-xs text-ink-heading">
            Version History
          </span>
          <span className="text-[10.5px] font-mono text-ink-faint">
            ({iterations.length} records preserved)
          </span>
        </div>

        <div className="text-[10.5px] text-ink-muted hidden sm:block">
          Non-destructive: branching creates a parallel lead without deleting prior steps
        </div>
      </div>

      {/* Horizontal filmstrip container */}
      <div className="flex items-center space-x-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
        {iterations.map((it, idx) => {
          const isSelected = it.id === currentIterationId;
          return (
            <div
              key={it.id}
              className={`flex-shrink-0 w-48 p-2.5 rounded-lg border transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-surface-elevated border-line-medium shadow-xs'
                  : 'bg-surface-base border-line-subtle hover:border-line-medium'
              }`}
            >
              <div>
                {/* Header tag */}
                <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                  <span className="font-medium text-ink-heading">
                    Iter #{it.iteration_number}
                  </span>
                  <span className="text-[10px] text-ink-muted">
                    {it.witness_likeness_score}/10
                  </span>
                </div>

                {/* Thumbnail and prompt */}
                <div
                  onClick={() => onSelectIteration(it)}
                  className="flex space-x-2 cursor-pointer mb-2"
                >
                  <div className="w-12 h-14 bg-surface-card rounded border border-line-subtle overflow-hidden flex-shrink-0">
                    <img
                      src={it.image_url}
                      alt={`Iteration #${it.iteration_number}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-ink-muted line-clamp-3 leading-snug font-sans italic">
                      "{it.witness_prompt}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons and latency */}
              <div className="pt-2 border-t border-line-subtle flex items-center justify-between text-[10px] font-mono">
                <span className="text-ink-faint">{it.latency_ms}ms</span>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => onSelectIteration(it)}
                    className={`px-2 py-0.5 rounded text-[10.5px] transition-colors ${
                      isSelected
                        ? 'bg-accent text-surface-base font-semibold'
                        : 'bg-surface-elevated text-ink-muted hover:text-ink-heading'
                    }`}
                  >
                    {isSelected ? 'Active' : 'Inspect'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onBranchIteration(it)}
                    className="px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-surface-card text-ink-muted hover:text-ink-heading border border-line-subtle transition-colors"
                    title="Fork this iteration as new timeline branch"
                  >
                    Branch
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
