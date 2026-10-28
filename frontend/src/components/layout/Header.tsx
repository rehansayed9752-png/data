import React from 'react';
import { motion } from 'framer-motion';
import { Menu, Plus, FileText, ChevronDown } from 'lucide-react';
import { headerFadeDown } from '../../styles/tokens';
import { OfficerProfile, CaseFile } from '../../types/forensic';

interface HeaderProps {
  onOpenBurgerMenu: () => void;
  activeCase: CaseFile;
  onOpenCaseSwitcher: () => void;
  onOpenNewCase: () => void;
  onExportPdf: () => void;
  currentOfficer: OfficerProfile;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenBurgerMenu,
  activeCase,
  onOpenCaseSwitcher,
  onOpenNewCase,
  onExportPdf,
  currentOfficer,
}) => {
  return (
    <motion.header
      variants={headerFadeDown}
      initial="hidden"
      animate="visible"
      className="sticky top-0 z-40 bg-surface-base/90 backdrop-blur-md border-b border-line-subtle px-4 lg:px-6 py-2.5 flex items-center justify-between gap-3 font-sans"
    >
      {/* Left: Burger, Logo, Case Dropdown */}
      <div className="flex items-center space-x-3.5 min-w-0">
        <button
          type="button"
          onClick={onOpenBurgerMenu}
          className="p-1.5 rounded-md text-ink-muted hover:text-ink-heading hover:bg-surface-elevated border border-line-subtle transition-colors"
          aria-label="Open menu drawer"
        >
          <Menu className="w-5 h-5 text-ink-body" strokeWidth={1.5} />
        </button>

        <div className="flex items-baseline space-x-1 flex-shrink-0">
          <span className="font-serif font-semibold text-lg text-ink-heading tracking-tight">
            ForensicSketch
          </span>
          <span className="text-[10px] font-mono text-accent font-bold tracking-wider">
            .AI
          </span>
        </div>

        <div className="h-4 w-[1px] bg-line-subtle hidden sm:block"></div>

        <button
          type="button"
          onClick={onOpenCaseSwitcher}
          className="group flex items-center space-x-2 px-2.5 py-1 rounded-md bg-surface-card hover:bg-surface-elevated border border-line-subtle hover:border-line-medium transition-all text-left min-w-0"
          title="Click to switch cases"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0"></span>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="font-mono text-xs font-medium text-ink-heading truncate max-w-[140px] sm:max-w-[200px] md:max-w-[260px]">
                {activeCase.case_number}
              </span>
              <span className="text-ink-faint text-xs hidden md:inline">—</span>
              <span className="text-xs text-ink-muted truncate hidden md:inline max-w-[160px]">
                {activeCase.title}
              </span>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-ink-faint group-hover:text-ink-body transition-colors flex-shrink-0" strokeWidth={1.5} />
        </button>
      </div>

      {/* Right: New Case (Primary), Court Dossier (Action), Avatar */}
      <div className="flex items-center space-x-2.5 flex-shrink-0">
        <button
          type="button"
          onClick={onOpenNewCase}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-accent hover:bg-accent-hover text-surface-base text-xs font-semibold transition-all shadow-xs active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          <span>New Case</span>
        </button>

        <button
          type="button"
          onClick={onExportPdf}
          className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-surface-card hover:bg-surface-elevated border border-line-subtle hover:border-line-medium text-ink-body text-xs font-medium transition-all active:scale-[0.98]"
        >
          <FileText className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.5} />
          <span>Court Dossier</span>
        </button>

        <button
          type="button"
          onClick={onOpenBurgerMenu}
          className="w-8 h-8 rounded-full bg-surface-elevated border border-line-subtle hover:border-line-medium flex items-center justify-center text-ink-heading font-mono text-xs font-medium transition-all"
          title={`${currentOfficer.full_name} (${currentOfficer.badge_number})`}
        >
          {currentOfficer.avatar_initials}
        </button>
      </div>
    </motion.header>
  );
};
