import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderPlus, MapPin, User } from 'lucide-react';
import { modalVariants, backdropVariants } from '../../styles/tokens';
import { CaseFile, RenderStyle } from '../../types/forensic';

interface NewCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCase: (newCase: CaseFile) => void;
  leadOfficerId: string;
}

export const NewCaseModal: React.FC<NewCaseModalProps> = ({
  isOpen,
  onClose,
  onCreateCase,
  leadOfficerId,
}) => {
  const [caseNumber, setCaseNumber] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [witnessAlias, setWitnessAlias] = useState('');
  const [renderStyle, setRenderStyle] = useState<RenderStyle>('forensic_graphite');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      setCaseNumber(`CASE-2026-${randomDigits}`);
      setTitle('');
      setLocation('');
      setWitnessAlias('Witness W-01');
      setNotes('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newCase: CaseFile = {
      id: `case-${Date.now()}`,
      case_number: caseNumber.trim() || `CASE-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      title: title.trim(),
      incident_type: 'Eyewitness Forensic Investigation',
      incident_location: location.trim() || 'Central District Jurisdiction',
      incident_date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      witness_alias: witnessAlias.trim() || 'Witness W-01',
      case_seed: Math.floor(100000 + Math.random() * 900000),
      render_style: renderStyle,
      current_iteration_id: 'iter-1',
      status: 'active_interview',
      lead_officer_id: leadOfficerId,
      created_at: new Date().toISOString(),
    };

    onCreateCase(newCase);
    onClose();
  };

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
            className="relative w-full max-w-lg bg-surface-card border border-line-medium rounded-xl shadow-2xl p-6 z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-line-subtle mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-line-medium flex items-center justify-center text-accent">
                  <FolderPlus className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif font-semibold text-lg text-ink-heading tracking-wide">
                    Start a New Case
                  </h2>
                  <p className="text-xs text-ink-muted font-sans">
                    Initialize suspect description and witness file
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

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-ink-muted font-medium mb-1">
                  Case Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Commercial Bank Interception at MG Road"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-base border border-line-subtle rounded-md text-ink-body placeholder-ink-faint focus:border-accent focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-muted font-medium mb-1">
                    Case Number
                  </label>
                  <input
                    type="text"
                    value={caseNumber}
                    onChange={e => setCaseNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-base border border-line-subtle rounded-md text-ink-body font-mono text-xs focus:border-accent focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-ink-muted font-medium mb-1">
                    Witness Alias
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-ink-faint absolute left-2.5 top-2.5" strokeWidth={1.5} />
                    <input
                      type="text"
                      placeholder="Witness W-01"
                      value={witnessAlias}
                      onChange={e => setWitnessAlias(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-surface-base border border-line-subtle rounded-md text-ink-body placeholder-ink-faint focus:border-accent focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-ink-muted font-medium mb-1">
                  Incident Location
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-ink-faint absolute left-2.5 top-2.5" strokeWidth={1.5} />
                  <input
                    type="text"
                    placeholder="e.g., Metro Station Underpass, MG Road"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-surface-base border border-line-subtle rounded-md text-ink-body placeholder-ink-faint focus:border-accent focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-ink-muted font-medium mb-1">
                  Render Preset
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'forensic_graphite', label: 'Graphite 2B' },
                    { id: 'charcoal_shaded', label: 'Charcoal' },
                    { id: 'photorealistic_id', label: 'Photo ID' },
                  ].map(style => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setRenderStyle(style.id as RenderStyle)}
                      className={`py-1.5 px-2 rounded-md border text-center transition-all ${
                        renderStyle === style.id
                          ? 'bg-accent text-surface-base font-semibold border-accent'
                          : 'bg-surface-base border-line-subtle text-ink-muted hover:text-ink-heading hover:border-line-medium'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-ink-muted font-medium mb-1">
                  Optional Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Scene notes, lighting details, or observation duration..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-base border border-line-subtle rounded-md text-ink-body placeholder-ink-faint focus:border-accent focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end space-x-2.5 border-t border-line-subtle">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-md text-ink-muted hover:text-ink-heading hover:bg-surface-elevated transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-accent hover:bg-accent-hover text-surface-base font-semibold transition-all shadow-xs active:scale-[0.98]"
                >
                  Create Case Record
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
