import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { SideDrawer } from './components/layout/SideDrawer';
import { NewCaseModal } from './components/cases/NewCaseModal';
import { CaseSwitcherModal } from './components/cases/CaseSwitcherModal';
import { SketchStudio } from './components/studio/SketchStudio';
import { InvestigationDashboard } from './components/dashboard/InvestigationDashboard';
import { AuditLogView } from './components/audit/AuditLogView';
import { MatchModal } from './components/matching/MatchModal';
import {
  OfficerProfile,
  CaseFile,
  RenderStyle,
  SketchIteration,
  ChatMessage,
  AuditLogEntry,
  MugshotRecord,
  AuditActionType,
} from './types/forensic';
import {
  DEMO_OFFICERS,
  INITIAL_CASES,
  INITIAL_ITERATIONS,
  generateInitialAuditLog,
  MUGSHOT_DATABASE,
} from './data/mockForensicData';
import { computeAuditRowHash } from './utils/crypto';
import { generateCourtDossierPdf, downloadHighResCompositePng } from './utils/exportDossier';
import { apiClient } from './api/client';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'studio' | 'dashboard' | 'audit'>('studio');
  const [currentOfficer, setCurrentOfficer] = useState<OfficerProfile>(DEMO_OFFICERS[0]);
  const [cases, setCases] = useState<CaseFile[]>(INITIAL_CASES);
  const [activeCase, setActiveCase] = useState<CaseFile>(INITIAL_CASES[0]);
  const [renderStyle, setRenderStyle] = useState<RenderStyle>('forensic_graphite');

  // Modal and drawer visibility
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  const [isCaseSwitcherOpen, setIsCaseSwitcherOpen] = useState(false);
  const [canvasToolTrigger, setCanvasToolTrigger] = useState<{
    tabMode?: 'canvas' | 'variations';
    isCompareMode?: boolean;
    showInspector?: boolean;
    showDisguises?: boolean;
  }>({});

  const [iterations, setIterations] = useState<SketchIteration[]>(INITIAL_ITERATIONS);
  const [currentIterationId, setCurrentIterationId] = useState<string>('iter-3');

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init-1',
      sender: 'witness',
      text: 'He was a male in his mid-30s, square jaw, thick bushy eyebrows, narrow almond eyes, crooked hooked nose, heavy stubble, and a scar over his right brow.',
      timestamp: '2026-10-28T09:21:40Z',
      confidence: 'likely',
      changed_traits: ['jawline_chin', 'eyebrows', 'eyes', 'nose', 'facial_hair', 'scars_marks_tattoos'],
    },
    {
      id: 'msg-sys-1',
      sender: 'system',
      text: 'Iteration #1 generated. Forensic graphite composite initialized with locked seed #849204.',
      timestamp: '2026-10-28T09:22:15Z',
    },
    {
      id: 'msg-init-2',
      sender: 'witness',
      text: 'The jawline is too wide—make the chin narrower and more pointed, and set his eyes slightly wider apart.',
      timestamp: '2026-10-28T09:34:00Z',
      confidence: 'certain',
      changed_traits: ['jawline_chin', 'eyes'],
    },
    {
      id: 'msg-sys-2',
      sender: 'system',
      text: 'Iteration #2 generated. In-place delta applied to mandibular angle and eye spacing.',
      timestamp: '2026-10-28T09:34:40Z',
    },
    {
      id: 'msg-init-3',
      sender: 'witness',
      text: 'Also add a diagonal knife scar across his left cheek and make the stubble darker with a faint mustache.',
      timestamp: '2026-10-28T09:47:30Z',
      confidence: 'certain',
      changed_traits: ['scars_marks_tattoos', 'facial_hair'],
    },
    {
      id: 'msg-sys-3',
      sender: 'system',
      text: 'Iteration #3 generated. Witness likeness score updated to 9.3/10.',
      timestamp: '2026-10-28T09:48:10Z',
    },
  ]);

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => generateInitialAuditLog());
  const [isAuditVerified, setIsAuditVerified] = useState<boolean>(true);

  const [flaggedLeads, setFlaggedLeads] = useState<MugshotRecord[]>([MUGSHOT_DATABASE[0]]);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to append a cryptographically chained audit log
  const handleLogAuditEvent = (
    actionType: AuditActionType,
    resourceTarget: string,
    details: Record<string, any>
  ) => {
    setAuditLogs(prev => {
      const prevEntry = prev[prev.length - 1];
      const prevHash = prevEntry ? prevEntry.row_hash : '0'.repeat(64);
      const nextSeq = prev.length + 1;
      const timestamp = new Date().toISOString();

      const rowHash = computeAuditRowHash(
        prevHash,
        currentOfficer.officer_id,
        activeCase.id,
        actionType,
        timestamp,
        details
      );

      const newEntry: AuditLogEntry = {
        seq_id: nextSeq,
        timestamp,
        officer_id: currentOfficer.officer_id,
        officer_name: currentOfficer.full_name,
        badge_number: currentOfficer.badge_number,
        officer_role: currentOfficer.role,
        case_id: activeCase.id,
        action_type: actionType,
        resource_target: resourceTarget,
        prev_hash: prevHash,
        row_hash: rowHash,
        ip_address: '10.14.88.24 (HQ Intranet)',
        details_json: details,
      };

      return [...prev, newEntry];
    });
  };

  // Cryptographic Chain Verification Engine (SHA-256)
  const handleVerifyChain = async (): Promise<boolean> => {
    let isValid = true;
    let expectedPrev = '0'.repeat(64);

    for (let i = 0; i < auditLogs.length; i++) {
      const row = auditLogs[i];
      if (row.prev_hash !== expectedPrev) {
        isValid = false;
        break;
      }
      const calculatedHash = computeAuditRowHash(
        row.prev_hash,
        row.officer_id,
        row.case_id,
        row.action_type,
        row.timestamp,
        row.details_json
      );
      if (calculatedHash !== row.row_hash) {
        isValid = false;
        break;
      }
      expectedPrev = row.row_hash;
    }

    setIsAuditVerified(isValid);

    handleLogAuditEvent('VERIFIED_AUDIT_CHAIN', 'Cryptographic Custody Ledger', {
      total_records: auditLogs.length,
      is_valid: isValid,
      verified_by: currentOfficer.badge_number,
    });

    triggerToast(
      isValid
        ? 'Audit chain verified. Zero tampered entries detected.'
        : 'Audit chain integrity failure detected!'
    );

    return isValid;
  };

  const currentIteration =
    iterations.find(it => it.id === currentIterationId) || iterations[iterations.length - 1];

  // Export Court Dossier PDF
  const handleExportPdf = async () => {
    triggerToast('Generating Court-Ready Evidentiary PDF Dossier...');
    await generateCourtDossierPdf({
      caseFile: activeCase,
      iteration: currentIteration,
      officer: currentOfficer,
      auditChain: auditLogs,
      flaggedLeads,
      allIterations: iterations,
    });
    handleLogAuditEvent('EXPORTED_CASE_DOSSIER_PDF', `Dossier PDF V${currentIteration.iteration_number}`, {
      iteration_number: currentIteration.iteration_number,
      officer_badge: currentOfficer.badge_number,
      total_iterations_included: iterations.length,
    });
    triggerToast('Official Court Dossier PDF downloaded.');
  };

  // Export 2048px PNG
  const handleExportPng = () => {
    const latestHash = auditLogs.length > 0 ? auditLogs[auditLogs.length - 1].row_hash : '00000000';
    downloadHighResCompositePng(currentIteration, activeCase, currentOfficer.badge_number, latestHash);
    handleLogAuditEvent('EXPORTED_HIGH_RES_SKETCH', `High-Res 2048px Composite Iteration #${currentIteration.iteration_number}`, {
      resolution: '2048x2048',
      officer_badge: currentOfficer.badge_number,
    });
    triggerToast('2048×2048 PNG Composite exported with forensic footer.');
  };

  // Flag Suspect Lead
  const handleFlagLead = (suspect: MugshotRecord) => {
    const alreadyFlagged = flaggedLeads.some(l => l.id === suspect.id);
    if (alreadyFlagged) {
      setFlaggedLeads(prev => prev.filter(l => l.id !== suspect.id));
      triggerToast(`Removed lead flag for ${suspect.full_name}`);
    } else {
      setFlaggedLeads(prev => [...prev, suspect]);
      handleLogAuditEvent('FLAGGED_SUSPECT_MATCH', `Suspect ${suspect.record_code} (${suspect.full_name})`, {
        suspect_id: suspect.id,
        similarity_score: suspect.similarity_score,
        matched_attributes: suspect.matched_attributes,
      });
      triggerToast(`Lead flagged: ${suspect.full_name} (${suspect.similarity_score}% Match)`);
    }
  };

  // Load cases from backend on mount if available
  useEffect(() => {
    apiClient
      .getCases()
      .then((serverCases) => {
        if (serverCases && serverCases.length > 0) {
          setCases(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            const newServerCases = serverCases.filter(sc => !existingIds.has(sc.id));
            return [...prev, ...newServerCases];
          });
        }
      })
      .catch(() => {
        // Backend offline, fallback to initial demo cases
      });
  }, []);

  // Create new case with backend synchronization
  const handleCreateCase = (newCase: CaseFile) => {
    setCases(prev => [newCase, ...prev]);
    setActiveCase(newCase);
    handleLogAuditEvent('CREATED_CASE_FILE', `New Case ${newCase.case_number}`, {
      case_number: newCase.case_number,
      title: newCase.title,
    });

    apiClient
      .createCase({
        title: newCase.title,
        incident_location: newCase.incident_location,
        witness_alias: newCase.witness_alias,
        render_style: newCase.render_style,
        lead_officer_id: currentOfficer.officer_id,
      })
      .then((createdServerCase) => {
        if (createdServerCase?.id) {
          setActiveCase(prev => ({ ...prev, id: createdServerCase.id }));
          setCases(prev => prev.map(c => c.id === newCase.id ? { ...c, id: createdServerCase.id } : c));
        }
      })
      .catch(() => {
        // Graceful offline fallback already handled in state
      });

    triggerToast(`Opened new case: ${newCase.case_number}`);
  };

  // Select case from switcher
  const handleSelectCase = (selectedCase: CaseFile) => {
    setActiveCase(selectedCase);
    handleLogAuditEvent('OPENED_CASE_FILE', `Switched to Case ${selectedCase.case_number}`, {
      case_number: selectedCase.case_number,
    });
    triggerToast(`Switched to: ${selectedCase.case_number}`);
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-surface-base text-ink-body flex flex-col font-sans relative selection:bg-accent/20 selection:text-ink-heading">
      {/* Editorial noise texture overlay */}
      <div className="noise-overlay" />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-elevated border border-line-medium text-ink-heading px-4 py-2.5 rounded-lg shadow-xl flex items-center space-x-2.5 text-xs font-sans">
          <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Clean Minimal Header */}
      <Header
        onOpenBurgerMenu={() => setIsDrawerOpen(true)}
        activeCase={activeCase}
        onOpenCaseSwitcher={() => setIsCaseSwitcherOpen(true)}
        onOpenNewCase={() => setIsNewCaseModalOpen(true)}
        onExportPdf={handleExportPdf}
        currentOfficer={currentOfficer}
      />

      {/* Side Drawer Menu */}
      <SideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        renderStyle={renderStyle}
        setRenderStyle={setRenderStyle}
        currentOfficer={currentOfficer}
        setCurrentOfficer={setCurrentOfficer}
        activeCase={activeCase}
        onOpenMatchModal={() => {
          setIsDrawerOpen(false);
          setIsMatchModalOpen(true);
        }}
        onToggleDisguiseDrawer={() => {
          setActiveTab('studio');
          setCanvasToolTrigger(prev => ({ ...prev, showDisguises: !prev.showDisguises }));
          setIsDrawerOpen(false);
        }}
        onToggleAnatomyInspector={() => {
          setActiveTab('studio');
          setCanvasToolTrigger(prev => ({ ...prev, showInspector: !prev.showInspector }));
          setIsDrawerOpen(false);
        }}
        onToggleSplitComparison={() => {
          setActiveTab('studio');
          setCanvasToolTrigger({ tabMode: 'canvas', isCompareMode: true });
          setIsDrawerOpen(false);
        }}
        onToggleVariationsView={() => {
          setActiveTab('studio');
          setCanvasToolTrigger({ tabMode: 'variations', isCompareMode: false });
          setIsDrawerOpen(false);
        }}
        onExportPng={() => {
          setIsDrawerOpen(false);
          handleExportPng();
        }}
        onExportPdf={() => {
          setIsDrawerOpen(false);
          handleExportPdf();
        }}
        isAuditVerified={isAuditVerified}
      />

      {/* New Case Modal */}
      <NewCaseModal
        isOpen={isNewCaseModalOpen}
        onClose={() => setIsNewCaseModalOpen(false)}
        onCreateCase={handleCreateCase}
        leadOfficerId={currentOfficer.officer_id}
      />

      {/* Case Switcher Modal */}
      <CaseSwitcherModal
        isOpen={isCaseSwitcherOpen}
        onClose={() => setIsCaseSwitcherOpen(false)}
        cases={cases}
        activeCaseId={activeCase.id}
        onSelectCase={handleSelectCase}
        onOpenNewCase={() => {
          setIsCaseSwitcherOpen(false);
          setIsNewCaseModalOpen(true);
        }}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === 'studio' && (
          <SketchStudio
            caseFile={activeCase}
            currentOfficer={currentOfficer}
            renderStyle={renderStyle}
            iterations={iterations}
            setIterations={setIterations}
            currentIterationId={currentIterationId}
            setCurrentIterationId={setCurrentIterationId}
            messages={messages}
            setMessages={setMessages}
            onLogAuditEvent={handleLogAuditEvent}
            externalToolTrigger={canvasToolTrigger}
          />
        )}

        {activeTab === 'dashboard' && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <InvestigationDashboard
              caseFile={activeCase}
              currentOfficer={currentOfficer}
              currentIteration={currentIteration}
              flaggedLeads={flaggedLeads}
              onOpenMatchModal={() => setIsMatchModalOpen(true)}
              onNavigateToStudio={() => setActiveTab('studio')}
              isAuditVerified={isAuditVerified}
            />
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <AuditLogView
              auditLogs={auditLogs}
              onVerifyChain={handleVerifyChain}
              isVerified={isAuditVerified}
            />
          </div>
        )}
      </main>

      {/* Suspect Database Match Modal */}
      <MatchModal
        isOpen={isMatchModalOpen}
        onClose={() => setIsMatchModalOpen(false)}
        caseFile={activeCase}
        currentOfficer={currentOfficer}
        onFlagLead={handleFlagLead}
        flaggedLeads={flaggedLeads}
      />
    </div>
  );
};

export default App;
