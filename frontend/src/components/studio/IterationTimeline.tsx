import React from 'react';
import { GitBranch, Clock, Sparkles, Check, ChevronRight } from 'lucide-react';
import { SketchIteration } from '../../types/forensic';

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
    <div className="bg-[#0b0e15] border border-white/[0.08] rounded-xl p-3">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
        <div className="flex items-center space-x-2">
          <GitBranch className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-display font-semibold text-xs text-zinc-200">
            Non-Destructive Version History Filmstrip
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            ({iterations.length} Iterations Anchored)
          </span>
        </div>

        <div className="text-[10px] font-mono text-zinc-400">
          Non-Destructive: Branching preserves all evidentiary states
        </div>
      </div>

      {/* Horizontal filmstrip container */}
      <div className="flex items-center space-x-3 overflow-x-auto pb-1 pt-1 scrollbar-thin">
        {iterations.map((it, idx) => {
          const isSelected = it.id === currentIterationId;
          return (
            <div
              key={it.id}
              className={`flex-shrink-0 w-52 p-2.5 rounded-lg border transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/20'
                  : 'bg-[#121622] border-white/[0.08] hover:border-white/[0.2] hover:bg-[#161b2a]'
              }`}
            >
              <div>
                {/* Header tag */}
                <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                  <span className="font-bold text-amber-400">
                    ITERATION #{it.iteration_number}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-black/50 text-[9.5px] text-emerald-400 font-semibold">
                    {it.witness_likeness_score}/10
                  </span>
                </div>

                {/* Thumbnail and snippet */}
                <div
                  onClick={() => onSelectIteration(it)}
                  className="flex space-x-2.5 cursor-pointer mb-2"
                >
                  <div className="w-14 h-16 bg-black rounded border border-white/[0.08] overflow-hidden flex-shrink-0">
                    <img
                      src={it.image_url}
                      alt={`Iteration #${it.iteration_number}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[10.5px] text-zinc-300 line-clamp-3 leading-snug font-sans italic">
                      "{it.witness_prompt}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons and metadata */}
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono">
                <span className="text-zinc-500">{it.latency_ms}ms</span>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onSelectIteration(it)}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                      isSelected
                        ? 'bg-amber-500 text-black font-semibold'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {isSelected ? 'Active' : 'Inspect'}
                  </button>

                  <button
                    onClick={() => onBranchIteration(it)}
                    className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-cyan-900/50 hover:text-cyan-300 text-zinc-400 border border-white/[0.06] transition-colors"
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
