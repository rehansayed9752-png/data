import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, FolderOpen, MapPin, User, Plus } from 'lucide-react';
import { modalVariants, backdropVariants } from '../../styles/tokens';
import { CaseFile } from '../../types/forensic';

interface CaseSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  cases: CaseFile[];
  activeCaseId: string;
  onSelectCase: (selectedCase: CaseFile) => void;
  onOpenNewCase: () => void;
}

export const CaseSwitcherModal: React.FC<CaseSwitcherModalProps> = ({
  isOpen,
  onClose,
  cases,
  activeCaseId,
  onSelectCase,
  onOpenNewCase,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredCases = cases.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.case_number.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.witness_alias.toLowerCase().includes(q) ||
      c.incident_location.toLowerCase().includes(q)
    );
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-xl bg-surface-card border border-line-medium rounded-xl shadow-2xl p-6 z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-line-subtle mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-line-medium flex items-center justify-center text-accent">
                  <FolderOpen className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif font-semibold text-lg text-ink-heading tracking-wide">
                    Case Switcher
                  </h2>
                  <p className="text-xs text-ink-muted font-sans">
                    Switch active investigation workspace or create a new file
                  </p>
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

            {/* Search and Action Bar */}
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-ink-faint absolute left-3 top-2.5" strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="Search by case number, title, or witness alias..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-surface-base border border-line-subtle rounded-md text-xs text-ink-body placeholder-ink-faint focus:border-accent focus:outline-none transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNewCase();
                }}
                className="flex items-center space-x-1.5 px-3 py-2 bg-accent hover:bg-accent-hover rounded-md text-xs font-semibold text-surface-base transition-all shadow-xs active:scale-[0.98]"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                <span>New Case</span>
              </button>
            </div>

            {/* Case List */}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {filteredCases.length > 0 ? (
                filteredCases.map(item => {
                  const isActive = item.id === activeCaseId;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        onSelectCase(item);
                        onClose();
                      }}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-surface-elevated border-accent/60 text-ink-heading shadow-xs'
                          : 'bg-surface-base border-line-subtle hover:border-line-medium text-ink-body'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-semibold text-accent">
                            {item.case_number}
                          </span>
                          <span className="text-ink-faint text-[10px]">•</span>
                          <span className="text-xs font-medium text-ink-heading truncate">
                            {item.title}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3 text-[11px] text-ink-muted">
                          <span className="flex items-center space-x-1">
                            <User className="w-3 h-3 text-ink-faint" strokeWidth={1.5} />
                            <span>{item.witness_alias}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3 text-ink-faint" strokeWidth={1.5} />
                            <span className="truncate max-w-[160px]">{item.incident_location}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {isActive && (
                          <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-accent/15 border border-accent/40 text-accent text-[10.5px] font-mono">
                            <Check className="w-3 h-3" strokeWidth={2} />
                            <span>Active</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Friendly Empty State */
                <div className="py-8 text-center text-ink-muted font-sans text-xs">
                  <FolderOpen className="w-8 h-8 text-ink-faint mx-auto mb-2" strokeWidth={1.5} />
                  <p className="font-medium text-ink-heading">No cases found matching "{searchQuery}"</p>
                  <p className="text-[11px] text-ink-muted mt-1">
                    Check your spelling or initialize a fresh case file to begin an interview.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
