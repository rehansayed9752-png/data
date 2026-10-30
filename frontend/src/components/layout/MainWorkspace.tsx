import React, { useState } from 'react';
import {
  FileText,
  Plus,
  ChevronDown,
  LogOut,
  Shield,
  FileDown,
  Lock,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import {
  OfficerProfile,
  CaseFile,
  PermissionMode,
  SketchIteration,
  ChatMessage,
  AuditLogEntry,
  MugshotRecord,
  SupportedLanguage,
  FacialStateJSON,
} from '../../types/forensic';
import { CompositeStudioModule } from '../workspace/CompositeStudioModule';
import { DatabaseMatchModule } from '../workspace/DatabaseMatchModule';
import { AuditLedgerModule } from '../workspace/AuditLedgerModule';
import { CaseSwitcherModal } from '../cases/CaseSwitcherModal';
import { NewCaseModal } from '../cases/NewCaseModal';

interface MainWorkspaceProps {
  currentOfficer: OfficerProfile;
  permissionMode: PermissionMode;
  onSignOut: () => void;
  activeCase: CaseFile;
  cases: CaseFile[];
  onSelectCase: (caseFile: CaseFile) => void;
  onCreateCase: (caseFile: CaseFile) => void;
  iterations: SketchIteration[];
  currentIterationId: string;
  onSelectIteration: (id: string) => void;
  messages: ChatMessage[];
  onSendMessage: (
    text: string,
    confidence: 'certain' | 'likely' | 'maybe' | 'not_sure',
    language: SupportedLanguage
  ) => void;
  isLoading: boolean;
  onUpdateLikeness: (score: number) => void;
  onSelectVariation: (variationIteration: SketchIteration) => void;
  flaggedLeads: MugshotRecord[];
  onFlagLead: (suspect: MugshotRecord) => void;
  auditLogs: AuditLogEntry[];
  onVerifyChain: () => Promise<boolean>;
  isAuditVerified: boolean;
  onExportPdf: () => void;
}

export type WorkspaceTab = 'studio' | 'database' | 'audit';

export const MainWorkspace: React.FC<MainWorkspaceProps> = ({
  currentOfficer,
  permissionMode,
  onSignOut,
  activeCase,
  cases,
  onSelectCase,
  onCreateCase,
  iterations,
  currentIterationId,
  onSelectIteration,
  messages,
  onSendMessage,
  isLoading,
  onUpdateLikeness,
  onSelectVariation,
  flaggedLeads,
  onFlagLead,
  auditLogs,
  onVerifyChain,
  isAuditVerified,
  onExportPdf,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('studio');
  const [isCaseSwitcherOpen, setIsCaseSwitcherOpen] = useState(false);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const isReadOnly = permissionMode === 'read_only';

  const fallbackIteration: SketchIteration = {
    id: 'iter-init',
    case_id: activeCase?.id || 'case-initial',
    iteration_number: 1,
    parent_iteration_id: null,
    image_url: '',
    witness_prompt: 'Initial witness statement',
    facial_state: {
      age_gender_ethnicity: 'Adult male, approximately 30-35 years old',
      head_face_shape: 'Balanced oval face shape',
      hair_style_texture: 'Short neat dark hair',
      forehead: 'Medium height smooth forehead',
      eyebrows: 'Natural medium-thickness eyebrows',
      eyes: 'Standard almond-shaped eyes, neutral gaze',
      nose: 'Straight medium-width nose',
      cheeks: 'Natural medium cheekbones',
      jawline_chin: 'Moderate tapered jawline and rounded chin',
      mouth_lips: 'Medium balanced lips, neutral expression',
      ears: 'Normal proportioned ears close to head',
      facial_hair: 'Clean-shaven',
      scars_marks_tattoos: 'No visible scars, moles, or tattoos',
      accessories: 'No glasses, hats, or jewelry',
    },
    changed_fields: [],
    confidence_rating: 'likely',
    created_at: new Date().toISOString(),
    witness_likeness_score: 5,
    latency_ms: 0,
    ai_provider: 'local-procedural',
  };

  const currentIteration =
    iterations.find(it => it.id === currentIterationId) ||
    (iterations.length > 0 ? iterations[iterations.length - 1] : fallbackIteration);
  const currentIdx = iterations.findIndex(it => it.id === currentIteration.id);
  const previousIteration = currentIdx > 0 ? iterations[currentIdx - 1] : null;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#F5F5F2] font-sans text-[#18181B]">
      {/* TOP INSTITUTIONAL NAVIGATION BAR (56px height, #FFFFFF, border-b 1px #E4E4E0) */}
      <header className="h-14 bg-white border-b border-[#E4E4E0] px-4 sm:px-6 flex items-center justify-between gap-4 flex-shrink-0 z-30">
        {/* Left: System Title & Case Switcher */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="flex items-baseline space-x-1 flex-shrink-0 font-mono">
            <span className="font-bold text-sm tracking-tight text-[#18181B]">FCES</span>
            <span className="text-xs text-[#71717A]">//</span>
          </div>

          {/* Case Switcher Button */}
          <button
            type="button"
            onClick={() => setIsCaseSwitcherOpen(true)}
            className="group flex items-center space-x-2 px-2.5 py-1 rounded border border-[#E4E4E0] hover:border-[#18181B] bg-white text-xs font-mono transition-colors text-left min-w-0"
            title="Click to switch cases"
          >
            <span className="font-bold text-[#18181B] truncate">{activeCase.case_number}</span>
            <span className="text-[#A1A1AA] hidden md:inline">—</span>
            <span className="text-[#52525B] truncate hidden md:inline max-w-[150px]">
              {activeCase.title}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#71717A] flex-shrink-0" strokeWidth={1.5} />
          </button>

          {/* New Case Button (Hidden/Disabled in Read Only) */}
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setIsNewCaseModalOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#18181B] hover:bg-[#27272A] text-white text-xs font-medium transition-colors"
              title="Create New Case File"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              <span className="hidden sm:inline">New Case</span>
            </button>
          )}
        </div>

        {/* Center: Modular View Switcher (3 Clean Underlined Tab Buttons) */}
        <nav className="flex items-center space-x-1 sm:space-x-3 text-xs font-mono font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className={`py-4 px-2 sm:px-3 border-b-2 transition-colors ${
              activeTab === 'studio'
                ? 'border-[#18181B] text-[#18181B] font-bold'
                : 'border-transparent text-[#71717A] hover:text-[#18181B]'
            }`}
          >
            01. Sketch Studio
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`py-4 px-2 sm:px-3 border-b-2 transition-colors ${
              activeTab === 'database'
                ? 'border-[#18181B] text-[#18181B] font-bold'
                : 'border-transparent text-[#71717A] hover:text-[#18181B]'
            }`}
          >
            02. Database Search
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`py-4 px-2 sm:px-3 border-b-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-[#18181B] text-[#18181B] font-bold'
                : 'border-transparent text-[#71717A] hover:text-[#18181B]'
            }`}
          >
            03. Access Audit Log
          </button>
        </nav>

        {/* Right: Permission Badge, Active Officer, Export PDF Dossier, Sign Out */}
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          {/* Permission Mode Indicator Badge */}
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
              isReadOnly
                ? 'bg-[#F4F4F5] text-[#52525B] border-[#D4D4D0]'
                : 'bg-[#18181B] text-white border-[#18181B]'
            }`}
          >
            {isReadOnly ? 'MODE: READ ONLY (LOCKED)' : 'MODE: READ & WRITE'}
          </span>

          {/* Active Officer Badge */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono text-[#52525B]">
            <span>{currentOfficer.badge_number}</span>
            <span className="text-[#A1A1AA]">({currentOfficer.full_name.split(' ').pop()})</span>
          </div>

                    {/* Day / Night Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded border border-[#E4E4E0] hover:border-[#18181B] bg-white hover:bg-[#F9F9F8] text-[#18181B] transition-colors cursor-pointer flex items-center justify-center"
            title={theme === 'dark' ? 'Switch to Day Mode' : 'Switch to Night Mode'}
            aria-label="Toggle Day/Night mode"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" strokeWidth={1.8} />
            ) : (
              <Moon className="w-4 h-4 text-[#52525B]" strokeWidth={1.8} />
            )}
          </button>

          {/* Export PDF Dossier */}
          <button
            type="button"
            onClick={onExportPdf}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded border border-[#E4E4E0] hover:border-[#18181B] bg-white hover:bg-[#F9F9F8] text-[#18181B] text-xs font-medium transition-colors cursor-pointer"
            title="Download Court Evidentiary PDF Dossier"
          >
            <FileDown className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Export PDF Dossier</span>
          </button>

          {/* Sign Out */}
          <button
            type="button"
            onClick={onSignOut}
            className="p-1.5 rounded border border-[#E4E4E0] hover:border-red-400 hover:text-red-700 text-[#71717A] transition-colors"
            title="Sign Out of Terminal"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* MAIN MODULE CONTENT VIEWPORT */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === 'studio' && (
          <CompositeStudioModule
            caseFile={activeCase}
            currentIteration={currentIteration}
            previousIteration={previousIteration}
            iterations={iterations}
            onSelectIteration={onSelectIteration}
            messages={messages}
            onSendMessage={onSendMessage}
            isLoading={isLoading}
            permissionMode={permissionMode}
            onUpdateLikeness={onUpdateLikeness}
            onSelectVariation={onSelectVariation}
          />
        )}

        {activeTab === 'database' && (
          <DatabaseMatchModule
            caseFile={activeCase}
            currentIteration={currentIteration}
            flaggedLeads={flaggedLeads}
            onFlagLead={onFlagLead}
            permissionMode={permissionMode}
          />
        )}

        {activeTab === 'audit' && (
          <AuditLedgerModule
            auditLogs={auditLogs}
            onVerifyChain={onVerifyChain}
            isVerified={isAuditVerified}
            activeCaseId={activeCase.id}
          />
        )}
      </main>

      {/* Case Switcher Modal */}
      <CaseSwitcherModal
        isOpen={isCaseSwitcherOpen}
        onClose={() => setIsCaseSwitcherOpen(false)}
        cases={cases}
        activeCaseId={activeCase.id}
        onSelectCase={onSelectCase}
        onOpenNewCase={() => {
          setIsCaseSwitcherOpen(false);
          setIsNewCaseModalOpen(true);
        }}
      />

      {/* New Case Modal */}
      <NewCaseModal
        isOpen={isNewCaseModalOpen}
        onClose={() => setIsNewCaseModalOpen(false)}
        onCreateCase={onCreateCase}
        leadOfficerId={currentOfficer.officer_id}
      />
    </div>
  );
};
