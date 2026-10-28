import React from 'react';
import {
  Shield,
  FileCheck2,
  Database,
  Download,
  FileText,
  UserCheck,
  ChevronDown,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react';
import { OfficerProfile, CaseFile, RenderStyle } from '../../types/forensic';
import { DEMO_OFFICERS } from '../../data/mockForensicData';

interface NavbarProps {
  activeTab: 'studio' | 'dashboard' | 'audit';
  setActiveTab: (tab: 'studio' | 'dashboard' | 'audit') => void;
  currentOfficer: OfficerProfile;
  setCurrentOfficer: (officer: OfficerProfile) => void;
  activeCase: CaseFile;
  renderStyle: RenderStyle;
  setRenderStyle: (style: RenderStyle) => void;
  onRunDbMatch: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  isAuditVerified: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentOfficer,
  setCurrentOfficer,
  activeCase,
  renderStyle,
  setRenderStyle,
  onRunDbMatch,
  onExportPng,
  onExportPdf,
  isAuditVerified,
}) => {
  const [officerDropdownOpen, setOfficerDropdownOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#08090d]/95 backdrop-blur-md border-b border-white/[0.08]">
      {/* Top micro-status strip */}
      <div className="px-4 py-1 bg-[#0b0d13] border-b border-white/[0.05] flex items-center justify-between text-[11px] font-mono text-zinc-400">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="tracking-wider uppercase font-semibold">TERMINAL ONLINE</span>
          </div>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-300">
            NODE: <span className="text-zinc-400">BLR-CID-HQ-04</span>
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-300">
            CASE SEED: <span className="text-amber-400">#{activeCase.case_seed}</span>
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-300">
            ENGINE: <span className="text-cyan-400">gemini-2.5-flash-image</span> + <span className="text-zinc-400">flux-fallback</span>
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 text-emerald-400">
            <FileCheck2 className="w-3.5 h-3.5" />
            <span className="tracking-wide">
              {isAuditVerified ? 'SHA-256 CHAIN VERIFIED (0 TAMPERED)' : 'AUDIT CHAIN PENDING'}
            </span>
          </div>
        </div>
      </div>

      {/* Main command bar */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Brand identity & Case indicator */}
        <div className="flex items-center space-x-5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-display font-bold text-sm tracking-wide text-zinc-100">
                  FORENSIC<span className="text-amber-400">SKETCH</span>.AI
                </span>
                <span className="px-1.5 py-0.2 bg-amber-500/15 border border-amber-500/30 text-[9.5px] font-mono text-amber-400 rounded">
                  v2.5
                </span>
              </div>
              <div className="text-[10px] font-mono text-zinc-400 tracking-tight">
                CRIME SCENE COMPOSITE DIVISION
              </div>
            </div>
          </div>

          <div className="h-7 w-[1px] bg-white/[0.08] hidden sm:block"></div>

          {/* Active case badge */}
          <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded bg-[#121622] border border-white/[0.07]">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span className="font-mono text-xs font-semibold text-zinc-200">
              {activeCase.case_number}
            </span>
            <span className="text-zinc-500 font-mono text-xs">/</span>
            <span className="text-xs text-zinc-300 max-w-[220px] truncate">
              {activeCase.title}
            </span>
          </div>
        </div>

        {/* Center navigation tabs */}
        <nav className="flex items-center space-x-1 p-1 bg-[#0f121a] border border-white/[0.08] rounded-lg">
          <button
            onClick={() => setActiveTab('studio')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              activeTab === 'studio'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Composite Studio</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Investigation Hub</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              activeTab === 'audit'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center space-x-1.5">
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Chain of Custody</span>
            </div>
          </button>
        </nav>

        {/* Right side controls: Render style, Officer quick-switch, Exports */}
        <div className="flex items-center space-x-2.5">
          {/* Render style selector */}
          <div className="hidden xl:flex items-center bg-[#10141f] border border-white/[0.08] rounded p-0.5 text-xs font-mono">
            <button
              onClick={() => setRenderStyle('forensic_graphite')}
              className={`px-2 py-1 rounded transition-colors ${
                renderStyle === 'forensic_graphite'
                  ? 'bg-zinc-800 text-amber-300 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Monochrome 2B/4B Graphite Pencil Forensic Composite"
            >
              Graphite 2B
            </button>
            <button
              onClick={() => setRenderStyle('charcoal_shaded')}
              className={`px-2 py-1 rounded transition-colors ${
                renderStyle === 'charcoal_shaded'
                  ? 'bg-zinc-800 text-amber-300 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="High-Contrast Anatomical Charcoal Shading"
            >
              Charcoal
            </button>
            <button
              onClick={() => setRenderStyle('photorealistic_id')}
              className={`px-2 py-1 rounded transition-colors ${
                renderStyle === 'photorealistic_id'
                  ? 'bg-zinc-800 text-amber-300 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Photorealistic Suspect Identification Render"
            >
              Photo ID
            </button>
          </div>

          {/* Action: Run DB Match */}
          <button
            onClick={onRunDbMatch}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-medium transition-all"
            title="Execute facial similarity search against authorized LE mugshot database"
          >
            <Search className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">LE Match DB</span>
          </button>

          {/* Action: Export 2048px PNG */}
          <button
            onClick={onExportPng}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-white/[0.1] text-zinc-200 text-xs font-medium transition-all"
            title="Export high-resolution 2048x2048 PNG with forensic footer"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden md:inline">2048px PNG</span>
          </button>

          {/* Action: Court PDF Dossier */}
          <button
            onClick={onExportPdf}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 border border-amber-400/50 text-white text-xs font-semibold shadow-sm transition-all"
            title="Generate official court-ready Case Evidence Package PDF"
          >
            <FileText className="w-3.5 h-3.5 text-amber-100" />
            <span>Court Dossier</span>
          </button>

          {/* Officer Demo Quick-Switch */}
          <div className="relative">
            <button
              onClick={() => setOfficerDropdownOpen(!officerDropdownOpen)}
              className="flex items-center space-x-2 px-2.5 py-1.5 rounded bg-[#141824] hover:bg-[#1a2030] border border-white/[0.09] text-xs transition-all"
            >
              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold font-mono text-[10px]">
                {currentOfficer.avatar_initials}
              </div>
              <div className="text-left hidden md:block">
                <div className="font-semibold text-zinc-200 text-[11px] leading-tight">
                  {currentOfficer.badge_number}
                </div>
                <div className="text-[9.5px] text-zinc-400 leading-tight">
                  {currentOfficer.role === 'investigator'
                    ? 'Investigator'
                    : currentOfficer.role === 'forensic_specialist'
                    ? 'Forensic Specialist'
                    : 'Supervisor'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {/* Officer selector dropdown */}
            {officerDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#111520] border border-white/[0.12] rounded-lg shadow-2xl p-1.5 z-50">
                <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-amber-400/80 border-b border-white/[0.06] mb-1">
                  Demo Officer Quick-Switch
                </div>
                {DEMO_OFFICERS.map(officer => (
                  <button
                    key={officer.officer_id}
                    onClick={() => {
                      setCurrentOfficer(officer);
                      setOfficerDropdownOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded flex items-start space-x-2.5 transition-colors ${
                      officer.officer_id === currentOfficer.officer_id
                        ? 'bg-amber-500/15 border border-amber-500/30'
                        : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="w-6 h-6 rounded bg-zinc-800 text-amber-300 border border-white/[0.1] flex items-center justify-center text-xs font-mono font-bold mt-0.5">
                      {officer.avatar_initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-zinc-200 flex items-center justify-between">
                        <span>{officer.full_name}</span>
                        <span className="font-mono text-[10px] text-amber-400">
                          {officer.badge_number}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate">
                        {officer.rank} • {officer.department}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
