import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Layers,
  Sparkles,
  FileCheck2,
  Brush,
  Search,
  Glasses,
  Info,
  Sliders,
  GitBranch,
  Download,
  FileText,
  User,
  ChevronRight,
} from 'lucide-react';
import {
  drawerVariants,
  backdropVariants,
  drawerCascade,
  drawerItem,
} from '../../styles/tokens';
import {
  OfficerProfile,
  RenderStyle,
  CaseFile,
} from '../../types/forensic';
import { DEMO_OFFICERS } from '../../data/mockForensicData';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'studio' | 'dashboard' | 'audit';
  setActiveTab: (tab: 'studio' | 'dashboard' | 'audit') => void;
  renderStyle: RenderStyle;
  setRenderStyle: (style: RenderStyle) => void;
  currentOfficer: OfficerProfile;
  setCurrentOfficer: (officer: OfficerProfile) => void;
  activeCase: CaseFile;
  onOpenMatchModal: () => void;
  onToggleDisguiseDrawer: () => void;
  onToggleAnatomyInspector: () => void;
  onToggleSplitComparison: () => void;
  onToggleVariationsView: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  isAuditVerified: boolean;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  renderStyle,
  setRenderStyle,
  currentOfficer,
  setCurrentOfficer,
  activeCase,
  onOpenMatchModal,
  onToggleDisguiseDrawer,
  onToggleAnatomyInspector,
  onToggleSplitComparison,
  onToggleVariationsView,
  onExportPng,
  onExportPdf,
  isAuditVerified,
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
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Drawer Container */}
          <motion.div
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-0 bottom-0 left-0 w-full max-w-xs sm:max-w-sm bg-surface-base border-r border-line-subtle shadow-2xl z-10 flex flex-col"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-line-subtle flex items-center justify-between">
              <div className="flex items-baseline space-x-1">
                <span className="font-serif font-semibold text-lg text-ink-heading tracking-tight">
                  ForensicSketch
                </span>
                <span className="text-[10px] font-mono text-accent font-bold tracking-wider">
                  .AI
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-md text-ink-muted hover:text-ink-heading hover:bg-surface-elevated transition-colors"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Scrollable Groups */}
            <motion.div
              variants={drawerCascade}
              initial="hidden"
              animate="visible"
              className="flex-1 p-4 overflow-y-auto space-y-5 text-xs text-ink-body"
            >
              {/* SECTION: WORKSPACE */}
              <motion.div variants={drawerItem} className="space-y-1">
                <div className="text-[10.5px] font-mono uppercase tracking-wider text-ink-faint px-2 py-1">
                  Workspace
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('studio');
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-md transition-colors ${
                    activeTab === 'studio'
                      ? 'bg-surface-elevated text-ink-heading font-medium border border-line-medium'
                      : 'hover:bg-surface-card text-ink-muted hover:text-ink-heading'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Layers className="w-4 h-4 text-accent" strokeWidth={1.5} />
                    <span>Composite Studio</span>
                  </div>
                  {activeTab === 'studio' && <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('dashboard');
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-md transition-colors ${
                    activeTab === 'dashboard'
                      ? 'bg-surface-elevated text-ink-heading font-medium border border-line-medium'
                      : 'hover:bg-surface-card text-ink-muted hover:text-ink-heading'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Sparkles className="w-4 h-4 text-ink-muted" strokeWidth={1.5} />
                    <span>Investigation Hub</span>
                  </div>
                  {activeTab === 'dashboard' && <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('audit');
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-md transition-colors ${
                    activeTab === 'audit'
                      ? 'bg-surface-elevated text-ink-heading font-medium border border-line-medium'
                      : 'hover:bg-surface-card text-ink-muted hover:text-ink-heading'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <FileCheck2 className="w-4 h-4 text-ink-muted" strokeWidth={1.5} />
                    <span>Chain of Custody</span>
                  </div>
                  {activeTab === 'audit' && <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>}
                </button>
              </motion.div>

              {/* SECTION: SKETCH STYLE */}
              <motion.div variants={drawerItem} className="space-y-1">
                <div className="text-[10.5px] font-mono uppercase tracking-wider text-ink-faint px-2 py-1">
                  Sketch Style
                </div>
                {[
                  { id: 'forensic_graphite', label: 'Graphite 2B' },
                  { id: 'charcoal_shaded', label: 'Charcoal Shaded' },
                  { id: 'photorealistic_id', label: 'Photo ID Portrait' },
                ].map(style => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setRenderStyle(style.id as RenderStyle)}
                    className={`w-full flex items-center justify-between p-2 rounded-md transition-colors ${
                      renderStyle === style.id
                        ? 'bg-accent/15 border border-accent/40 text-ink-heading font-medium'
                        : 'hover:bg-surface-card text-ink-muted hover:text-ink-heading'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Brush className="w-4 h-4 text-ink-muted" strokeWidth={1.5} />
                      <span>{style.label}</span>
                    </div>
                    {renderStyle === style.id && <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>}
                  </button>
                ))}
              </motion.div>

              {/* SECTION: TOOLS */}
              <motion.div variants={drawerItem} className="space-y-1">
                <div className="text-[10.5px] font-mono uppercase tracking-wider text-ink-faint px-2 py-1">
                  Tools
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenMatchModal();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-surface-card text-ink-muted hover:text-ink-heading transition-colors"
                >
                  <div className="flex items-center space-x-2.5">
                    <Search className="w-4 h-4 text-ink-muted" strokeWidth={1.5} />
                    <span>LE Match Database</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-ink-faint" strokeWidth={1.5} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('studio');
                    onClose();
                    onToggleDisguiseDrawer();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-surface-card text-ink-muted hover:text-ink-heading transition-colors"
                >
                  <div className="flex items-center space-x-2.5">
                    <Glasses className="w-4 h-4 text-ink-muted" strokeWidth={1.5} />
                    <span>Disguise Modeler</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-ink-faint" strokeWidth={1.5} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('studio');
                    onClose();
                    onToggleAnatomyInspector();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-surface-card text-ink-muted hover:text-ink-heading transition-colors"
                >
                  <div className="flex items-center space-x-2.5">
                    <Info className="w-4 h-4 text-ink-muted" strokeWidth={1.5} />
                    <span>14-Point Anatomy</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-ink-faint" strokeWidth={1.5} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('studio');
                    onClose();
                    onToggleSplitComparison();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-surface-card text-ink-muted hover:text-ink-heading transition-colors"
                >
                  <div className="flex items-center space-x-2.5">
                    <Sliders className="w-4 h-4 text-ink-muted" strokeWidth={1.5} />
                    <span>Split Comparison</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-ink-faint" strokeWidth={1.5} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('studio');
                    onClose();
                    onToggleVariationsView();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-surface-card text-ink-muted hover:text-ink-heading transition-colors"
                >
                  <div className="flex items-center space-x-2.5">
                    <GitBranch className="w-4 h-4 text-ink-muted" strokeWidth={1.5} />
                    <span>Variations (A/B/C)</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-ink-faint" strokeWidth={1.5} />
                </button>
              </motion.div>

              {/* SECTION: EXPORT */}
              <motion.div variants={drawerItem} className="space-y-1">
                <div className="text-[10.5px] font-mono uppercase tracking-wider text-ink-faint px-2 py-1">
                  Export
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onExportPng();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-surface-card text-ink-muted hover:text-ink-heading transition-colors"
                >
                  <div className="flex items-center space-x-2.5">
                    <Download className="w-4 h-4 text-ink-muted" strokeWidth={1.5} />
                    <span>2048x2048 PNG Composite</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onExportPdf();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-surface-card text-ink-muted hover:text-ink-heading transition-colors"
                >
                  <div className="flex items-center space-x-2.5">
                    <FileText className="w-4 h-4 text-ink-muted" strokeWidth={1.5} />
                    <span>Official Court Dossier (PDF)</span>
                  </div>
                </button>
              </motion.div>

              {/* SECTION: ACCOUNT */}
              <motion.div variants={drawerItem} className="space-y-1">
                <div className="text-[10.5px] font-mono uppercase tracking-wider text-ink-faint px-2 py-1">
                  Account & Officer
                </div>
                <div className="p-2.5 rounded-md bg-surface-card border border-line-subtle space-y-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-full bg-surface-elevated border border-line-medium flex items-center justify-center font-mono text-xs text-ink-heading">
                      {currentOfficer.avatar_initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-ink-heading truncate">
                        {currentOfficer.full_name}
                      </div>
                      <div className="text-[10px] font-mono text-ink-faint">
                        {currentOfficer.badge_number} • {currentOfficer.role}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-line-subtle space-y-1">
                    <span className="text-[10px] text-ink-faint block">Quick Switch Profile:</span>
                    {DEMO_OFFICERS.map(officer => (
                      <button
                        key={officer.officer_id}
                        type="button"
                        onClick={() => setCurrentOfficer(officer)}
                        className={`w-full text-left px-2 py-1 rounded text-[11px] transition-colors flex items-center justify-between ${
                          currentOfficer.officer_id === officer.officer_id
                            ? 'bg-surface-elevated text-accent font-medium'
                            : 'hover:bg-surface-base text-ink-muted hover:text-ink-heading'
                        }`}
                      >
                        <span>{officer.badge_number} {officer.full_name}</span>
                        {currentOfficer.officer_id === officer.officer_id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* SECTION: SYSTEM INFO (Quietly grouped from former ticker) */}
              <motion.div variants={drawerItem} className="space-y-1 pt-1 border-t border-line-subtle">
                <div className="text-[10.5px] font-mono uppercase tracking-wider text-ink-faint px-2 py-1">
                  System Info
                </div>
                <div className="p-2.5 rounded-md bg-surface-card border border-line-subtle text-[10.5px] font-mono text-ink-muted space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-ink-faint">AI Cluster:</span>
                    <span className="text-accent flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse inline-block"></span>
                      <span>2x Gemini Pool Active</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-faint">Node:</span>
                    <span className="text-ink-body">BLR-CID-HQ-04</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-faint">Case Seed:</span>
                    <span className="text-accent">#{activeCase.case_seed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-faint">Engine:</span>
                    <span className="text-ink-body">gemini-2.5-flash-image</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-faint">Custody Chain:</span>
                    <span className="text-ink-heading">
                      {isAuditVerified ? 'Verified (0 Tampered)' : 'Pending Check'}
                    </span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
