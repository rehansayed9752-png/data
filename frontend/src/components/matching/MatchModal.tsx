import React from 'react';
import {
  Search,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  X,
  Tag,
  MapPin,
  FileBadge2,
  TrendingUp,
} from 'lucide-react';
import { MugshotRecord, CaseFile, OfficerProfile } from '../../types/forensic';
import { MUGSHOT_DATABASE } from '../../data/mockForensicData';

interface MatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseFile: CaseFile;
  currentOfficer: OfficerProfile;
  onFlagLead: (suspect: MugshotRecord) => void;
  flaggedLeads: MugshotRecord[];
}

export const MatchModal: React.FC<MatchModalProps> = ({
  isOpen,
  onClose,
  caseFile,
  currentOfficer,
  onFlagLead,
  flaggedLeads,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0c0f17] border border-white/[0.12] rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-[#101420] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-display font-bold text-sm text-zinc-100">
                  Authorized Law Enforcement Suspect Database Search
                </h2>
                <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 font-mono text-[10px] rounded border border-indigo-500/30">
                  CUFS / LFW 100 RECORDS
                </span>
              </div>
              <div className="text-[11px] font-mono text-zinc-400">
                DeepFace Facenet512 Facial Embedding + Anatomical Semantic Overlap
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Legal Evidentiary Disclaimer Banner */}
        <div className="px-4 py-2.5 bg-amber-950/40 border-b border-amber-500/30 flex items-start space-x-2.5 text-xs text-amber-200">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-amber-300">INVESTIGATIVE LEAD NOTICE: </strong>
            Similarity scores represent vector proximity and semantic trait overlap with seeded demonstration records.
            Ranked results are investigatory leads to guide field inquiries and <strong>never constitute legal proof of identity or guilt</strong>.
          </div>
        </div>

        {/* Suspects Match List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {MUGSHOT_DATABASE.map(suspect => {
            const isFlagged = flaggedLeads.some(l => l.id === suspect.id);
            return (
              <div
                key={suspect.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isFlagged
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-[#121622] border-white/[0.07] hover:border-white/[0.15]'
                }`}
              >
                {/* Suspect Portrait & Metadata */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-20 h-24 bg-black rounded-lg border border-white/[0.1] overflow-hidden flex-shrink-0 shadow-md">
                    <img
                      src={suspect.image_url}
                      alt={suspect.full_name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-display font-bold text-sm text-zinc-100">
                        {suspect.full_name}
                      </h3>
                      <span className="font-mono text-[10.5px] text-amber-400 font-semibold">
                        {suspect.record_code}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-400 font-mono">
                      {suspect.age} Yrs • {suspect.gender} • {suspect.height_cm} cm
                    </div>

                    <div className="flex items-center space-x-1.5 text-xs text-zinc-300">
                      <MapPin className="w-3 h-3 text-zinc-500" />
                      <span>{suspect.last_known_area}</span>
                    </div>

                    {/* Prior offenses */}
                    <div className="text-[11px] text-red-300 font-mono">
                      Priors: {suspect.prior_offenses.join(', ')}
                    </div>

                    {/* Matched attribute pills */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {suspect.matched_attributes.map(tag => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.2 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[9.5px] font-mono"
                        >
                          ✓ {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Match Score & Action */}
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center space-y-2 border-t md:border-t-0 border-white/[0.06] pt-2 md:pt-0">
                  <div className="text-right">
                    <div className="flex items-center space-x-1 justify-end">
                      <span className="text-[11px] font-mono text-zinc-400">Match Vector:</span>
                      <span className="text-base font-mono font-bold text-emerald-400">
                        {suspect.similarity_score}%
                      </span>
                    </div>
                    <div className="text-[9.5px] font-mono text-zinc-500">
                      Facenet512 Cosine Rank
                    </div>
                  </div>

                  <button
                    onClick={() => onFlagLead(suspect)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      isFlagged
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                    }`}
                  >
                    {isFlagged ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Lead Flagged</span>
                      </>
                    ) : (
                      <>
                        <FileBadge2 className="w-3.5 h-3.5" />
                        <span>Flag as Lead</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#101420] border-t border-white/[0.08] flex items-center justify-between text-xs font-mono text-zinc-400">
          <div>
            Authorized Access: {currentOfficer.full_name} ({currentOfficer.badge_number})
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            Close Search
          </button>
        </div>
      </div>
    </div>
  );
};
