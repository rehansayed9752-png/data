import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ShieldAlert,
  X,
  Tag,
  Check,
} from 'lucide-react';
import { MugshotRecord, CaseFile, OfficerProfile } from '../../types/forensic';
import { MUGSHOT_DATABASE } from '../../data/mockForensicData';
import { modalVariants, backdropVariants } from '../../styles/tokens';

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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative bg-surface-card border border-line-medium rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden z-10"
          >
            {/* Modal Header */}
            <div className="p-4 bg-surface-base border-b border-line-subtle flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-line-subtle flex items-center justify-center text-accent">
                  <Search className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="font-serif font-semibold text-base text-ink-heading">
                      Suspect Database Match
                    </h2>
                    <span className="px-2 py-0.2 bg-surface-elevated text-ink-muted font-mono text-[10px] rounded border border-line-subtle">
                      CUFS / LFW Records
                    </span>
                  </div>
                  <div className="text-xs text-ink-muted">
                    Facenet-512 facial embedding vector proximity with anatomical trait correlation
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-md text-ink-muted hover:text-ink-heading hover:bg-surface-elevated transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Legal Evidentiary Disclaimer */}
            <div className="px-4 py-2.5 bg-surface-elevated/70 border-b border-line-subtle flex items-start space-x-2.5 text-xs text-ink-body">
              <ShieldAlert className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <p className="leading-relaxed text-ink-muted">
                <strong className="text-ink-heading">Investigative Lead Notice: </strong>
                Similarity scores represent vector proximity against reference records. Ranked results are investigative leads only and{' '}
                <strong className="text-ink-heading">never constitute legal proof of identity</strong>.
              </p>
            </div>

            {/* Suspects Match List */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {MUGSHOT_DATABASE.map(suspect => {
                const isFlagged = flaggedLeads.some(l => l.id === suspect.id);
                return (
                  <div
                    key={suspect.id}
                    className={`p-3.5 rounded-lg border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isFlagged
                        ? 'bg-surface-elevated border-line-medium shadow-xs'
                        : 'bg-surface-base border-line-subtle hover:border-line-medium'
                    }`}
                  >
                    {/* Portrait & Details */}
                    <div className="flex items-start space-x-3.5">
                      <div className="w-18 h-22 bg-surface-card rounded-md border border-line-subtle overflow-hidden flex-shrink-0">
                        <img
                          src={suspect.image_url}
                          alt={suspect.full_name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-serif font-semibold text-sm text-ink-heading">
                            {suspect.full_name}
                          </span>
                          <span className="text-xs font-mono text-ink-faint">
                            ({suspect.record_code})
                          </span>
                        </div>

                        <div className="text-xs text-ink-muted">
                          Age: {suspect.age} • Gender: {suspect.gender} • Area: {suspect.last_known_area}
                        </div>

                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          {suspect.matched_attributes.map((attr, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-surface-card border border-line-subtle text-[10.5px] text-ink-muted font-sans"
                            >
                              {attr}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Similarity Score & Action */}
                    <div className="flex md:flex-col items-center md:items-end justify-between gap-2 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-xl font-serif font-bold text-accent">
                          {suspect.similarity_score}%
                        </div>
                        <div className="text-[10px] font-mono text-ink-faint">
                          Vector Proximity
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onFlagLead(suspect)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          isFlagged
                            ? 'bg-accent text-surface-base font-semibold'
                            : 'bg-surface-card hover:bg-surface-elevated border border-line-subtle text-ink-body hover:text-ink-heading'
                        }`}
                      >
                        {isFlagged ? 'Flagged as Lead' : 'Flag as Lead'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
