import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/auth/LoginPage';
import { MainWorkspace } from './components/layout/MainWorkspace';
import {
  OfficerProfile,
  PermissionMode,
  CaseFile,
  RenderStyle,
  SketchIteration,
  ChatMessage,
  AuditLogEntry,
  MugshotRecord,
  AuditActionType,
  SupportedLanguage,
  FacialStateJSON,
} from './types/forensic';
import {
  DEMO_OFFICERS,
  INITIAL_CASES,
  INITIAL_ITERATIONS,
  generateInitialAuditLog,
  MUGSHOT_DATABASE,
} from './data/mockForensicData';
import { computeAuditRowHash } from './utils/crypto';
import { generateCourtDossierPdf } from './utils/exportDossier';
import { generateForensicSketchDataUrl } from './utils/proceduralSketch';
import { apiClient } from './api/client';

export const App: React.FC = () => {
  // Authentication & Permission Session State
  const [session, setSession] = useState<{
    officer: OfficerProfile;
    permissionMode: PermissionMode;
  } | null>(() => {
    try {
      const stored = localStorage.getItem('fces_session');
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  });

  const [cases, setCases] = useState<CaseFile[]>(INITIAL_CASES);
  const [activeCase, setActiveCase] = useState<CaseFile>(INITIAL_CASES[0]);
  const [renderStyle, setRenderStyle] = useState<RenderStyle>('forensic_graphite');
  const [iterations, setIterations] = useState<SketchIteration[]>(INITIAL_ITERATIONS);
  const [currentIterationId, setCurrentIterationId] = useState<string>('iter-3');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init-1',
      sender: 'witness',
      text: 'He was a male in his mid-30s, square jaw, thick bushy eyebrows, narrow almond eyes, hooked nose, heavy stubble, and a scar over his right brow.',
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const currentOfficer = session?.officer || DEMO_OFFICERS[0];
  const permissionMode = session?.permissionMode || 'read_write';

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
        { ...details, access_mode: permissionMode }
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
        access_mode: permissionMode,
        details_json: { ...details, access_mode: permissionMode },
      };

      return [...prev, newEntry];
    });
  };

  // Login handler
  const handleLogin = (officer: OfficerProfile, mode: PermissionMode) => {
    const newSession = { officer, permissionMode: mode };
    setSession(newSession);
    try {
      localStorage.setItem('fces_session', JSON.stringify(newSession));
    } catch {}

    handleLogAuditEvent('USER_LOGIN', 'Authorized Terminal Access', {
      permission_mode: mode,
      officer_badge: officer.badge_number,
      officer_rank: officer.rank,
      department: officer.department,
    });

    triggerToast(`Terminal session initialized in ${mode === 'read_only' ? 'READ-ONLY' : 'READ & WRITE'} mode.`);
  };

  // Sign out handler
  const handleSignOut = () => {
    setSession(null);
    try {
      localStorage.removeItem('fces_session');
    } catch {}
    triggerToast('Session closed.');
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
        ? 'SHA-256 custody ledger verified. Zero altered records.'
        : 'Integrity check failed: Tampered row detected!'
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

  // Flag / Unflag Suspect Lead
  const handleFlagLead = (suspect: MugshotRecord) => {
    if (permissionMode === 'read_only') return;

    const alreadyFlagged = flaggedLeads.some(l => l.id === suspect.id);
    if (alreadyFlagged) {
      setFlaggedLeads(prev => prev.filter(l => l.id !== suspect.id));
      triggerToast(`Lead removed: ${suspect.full_name}`);
    } else {
      setFlaggedLeads(prev => [...prev, suspect]);
      handleLogAuditEvent('FLAGGED_SUSPECT_MATCH', `Suspect ${suspect.record_code} (${suspect.full_name})`, {
        suspect_id: suspect.id,
        similarity_score: suspect.similarity_score,
        matched_attributes: suspect.matched_attributes,
      });
      triggerToast(`Lead attached to case: ${suspect.full_name} (${suspect.similarity_score}% match)`);
    }
  };

  // Main Witness Message & Sketch Generation
  const handleWitnessMessage = (
    text: string,
    confidence: 'certain' | 'likely' | 'maybe' | 'not_sure',
    language: SupportedLanguage
  ) => {
    if (permissionMode === 'read_only') return;

    setIsLoading(true);

    const newMsgId = `msg-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: newMsgId,
      sender: 'witness',
      text,
      language,
      timestamp: new Date().toISOString(),
      confidence,
    };

    setMessages(prev => [...prev, userMessage]);

    // Call Backend API with Cloudflare Worker & Gemini failover
    apiClient
      .generateOrRefineSketch(activeCase.id, {
        parent_iteration_id: currentIteration.id,
        witness_prompt: text,
        render_style: renderStyle,
        confidence,
        language,
      })
      .then((serverIteration: any) => {
        const nextIterationNumber = serverIteration.iteration_number || iterations.length + 1;
        const mappedIteration: SketchIteration = {
          id: serverIteration.id || `iter-${nextIterationNumber}`,
          case_id: serverIteration.case_id || activeCase.id,
          iteration_number: nextIterationNumber,
          parent_iteration_id: serverIteration.parent_iteration_id || currentIteration.id,
          image_url: serverIteration.image_url?.startsWith('/static')
            ? `http://localhost:8000${serverIteration.image_url}`
            : (serverIteration.image_url || currentIteration.image_url),
          witness_prompt: serverIteration.witness_prompt || text,
          witness_likeness_score:
            serverIteration.witness_likeness_score ||
            Math.min(9.8, parseFloat((currentIteration.witness_likeness_score + 0.6).toFixed(1))),
          ai_provider:
            serverIteration.ai_provider_used || serverIteration.ai_provider || 'gemini-2.5-flash-image',
          latency_ms: serverIteration.generation_latency_ms || serverIteration.latency_ms || 2100,
          created_at: serverIteration.created_at || new Date().toISOString(),
          facial_state:
            serverIteration.facial_state_snapshot ||
            serverIteration.facial_state ||
            currentIteration.facial_state,
          changed_fields: (serverIteration.changed_traits ||
            serverIteration.changed_fields || ['jawline_chin']) as (keyof FacialStateJSON)[],
          confidence_rating: confidence === 'not_sure' ? 'maybe' : confidence,
        };

        setIterations(prev => [...prev, mappedIteration]);
        setCurrentIterationId(mappedIteration.id);

        const systemReply: ChatMessage = {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: `Iteration #${mappedIteration.iteration_number} generated via ${mappedIteration.ai_provider}. Seed #${activeCase.case_seed} locked.`,
          timestamp: new Date().toISOString(),
          changed_traits: mappedIteration.changed_fields,
        };
        setMessages(prev => [...prev, systemReply]);

        handleLogAuditEvent('REFINED_FACIAL_FEATURE', `Iteration #${mappedIteration.iteration_number}`, {
          parent_iteration: currentIteration.id,
          witness_prompt: text,
          changed_fields: mappedIteration.changed_fields,
          confidence,
          provider: mappedIteration.ai_provider,
        });

        setIsLoading(false);
      })
      .catch(() => {
        // Fallback gracefully to local procedural generator if server is offline
        const changedFields: (keyof FacialStateJSON)[] = [];
        const updatedFacialState = { ...currentIteration.facial_state };

        const lower = text.toLowerCase();
        if (lower.includes('jaw') || lower.includes('chin')) {
          updatedFacialState.jawline_chin = lower.includes('square')
            ? 'Broad square mandibular jawline with blunt chin'
            : 'Tapered angular jaw with narrower pointed chin';
          changedFields.push('jawline_chin');
        }
        if (lower.includes('eye') || lower.includes('brow')) {
          updatedFacialState.eyes = lower.includes('narrow') || lower.includes('almond')
            ? 'Narrow deep-set almond eyes with intense gaze'
            : 'Wider hooded almond eyes set slightly further apart';
          changedFields.push('eyes');
        }
        if (lower.includes('nose')) {
          updatedFacialState.nose = lower.includes('hook') || lower.includes('crook')
            ? 'Crooked bridge with slight hooked downward tip'
            : 'Straight narrow aquiline nose bridge';
          changedFields.push('nose');
        }
        if (lower.includes('scar') || lower.includes('mark')) {
          updatedFacialState.scars_marks_tattoos =
            'Vertical scar above right eyebrow AND distinct knife scar on left cheek';
          changedFields.push('scars_marks_tattoos');
        }
        if (lower.includes('beard') || lower.includes('mustache') || lower.includes('stubble')) {
          updatedFacialState.facial_hair = lower.includes('clean')
            ? 'Clean-shaven lower face with visible bone contours'
            : 'Heavy dark 5 o-clock stubble with faint mustache contour';
          changedFields.push('facial_hair');
        }

        if (changedFields.length === 0) {
          changedFields.push('jawline_chin', 'eyes');
        }

        const nextIterationNumber = iterations.length + 1;
        const nextIterationId = `iter-${nextIterationNumber}`;

        const newImageUrl = generateForensicSketchDataUrl(
          updatedFacialState,
          renderStyle,
          activeCase.case_seed,
          nextIterationNumber
        );

        const fallbackIteration: SketchIteration = {
          id: nextIterationId,
          case_id: activeCase.id,
          iteration_number: nextIterationNumber,
          parent_iteration_id: currentIteration.id,
          image_url: newImageUrl,
          witness_prompt: text,
          witness_likeness_score: Math.min(
            9.8,
            parseFloat((currentIteration.witness_likeness_score + 0.6).toFixed(1))
          ),
          ai_provider: 'local-procedural',
          latency_ms: Math.floor(Math.random() * 800) + 1800,
          created_at: new Date().toISOString(),
          facial_state: updatedFacialState,
          changed_fields: changedFields,
          confidence_rating: confidence === 'not_sure' ? 'maybe' : confidence,
        };

        setIterations(prev => [...prev, fallbackIteration]);
        setCurrentIterationId(nextIterationId);

        const systemReply: ChatMessage = {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: `Iteration #${nextIterationNumber} synthesized via procedural engine. Seed #${activeCase.case_seed} locked.`,
          timestamp: new Date().toISOString(),
          changed_traits: changedFields,
        };
        setMessages(prev => [...prev, systemReply]);

        handleLogAuditEvent('REFINED_FACIAL_FEATURE', `Iteration #${nextIterationNumber}`, {
          parent_iteration: currentIteration.id,
          witness_prompt: text,
          changed_fields: changedFields,
          confidence,
          provider: 'local-procedural',
        });

        setIsLoading(false);
      });
  };

  // Update Likeness rating
  const handleUpdateLikeness = (score: number) => {
    if (permissionMode === 'read_only') return;

    setIterations(prev =>
      prev.map(it => (it.id === currentIteration.id ? { ...it, witness_likeness_score: score } : it))
    );
    handleLogAuditEvent('UPDATED_LIKENESS_SCORE', `Iteration #${currentIteration.iteration_number}`, {
      likeness_score: score,
      officer_badge: currentOfficer.badge_number,
    });
  };

  // Adopt Variation
  const handleSelectVariation = (variationIteration: SketchIteration) => {
    if (permissionMode === 'read_only') return;

    const nextIterationNumber = iterations.length + 1;
    const forkedIteration: SketchIteration = {
      ...variationIteration,
      id: `iter-${nextIterationNumber}-var`,
      iteration_number: nextIterationNumber,
      parent_iteration_id: currentIteration.id,
      witness_prompt: `[Adopted Variation] ${variationIteration.witness_prompt || 'Surgical trait adjustment'}`,
      created_at: new Date().toISOString(),
    };

    setIterations(prev => [...prev, forkedIteration]);
    setCurrentIterationId(forkedIteration.id);

    handleLogAuditEvent('REVERTED_ITERATION', `Iteration #${nextIterationNumber}`, {
      adopted_from: variationIteration.id,
      variation_label: variationIteration.variation_label,
    });
  };

  // Load cases from backend
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
      .catch(() => {});
  }, []);

  // Create Case
  const handleCreateCase = (newCase: CaseFile) => {
    if (permissionMode === 'read_only') return;

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
      .catch(() => {});

    triggerToast(`Created case file: ${newCase.case_number}`);
  };

  // Switch Case
  const handleSelectCase = (selectedCase: CaseFile) => {
    setActiveCase(selectedCase);
    handleLogAuditEvent('OPENED_CASE_FILE', `Switched to Case ${selectedCase.case_number}`, {
      case_number: selectedCase.case_number,
    });
    triggerToast(`Opened: ${selectedCase.case_number}`);
  };

  // If unauthenticated, show Institutional Permission Gateway
  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Once authenticated, show Modular Workspace
  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#18181B] text-white px-3.5 py-2 rounded text-xs font-mono shadow-lg flex items-center gap-2 border border-black">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      <MainWorkspace
        currentOfficer={currentOfficer}
        permissionMode={permissionMode}
        onSignOut={handleSignOut}
        activeCase={activeCase}
        cases={cases}
        onSelectCase={handleSelectCase}
        onCreateCase={handleCreateCase}
        iterations={iterations}
        currentIterationId={currentIterationId}
        onSelectIteration={setCurrentIterationId}
        messages={messages}
        onSendMessage={handleWitnessMessage}
        isLoading={isLoading}
        onUpdateLikeness={handleUpdateLikeness}
        onSelectVariation={handleSelectVariation}
        flaggedLeads={flaggedLeads}
        onFlagLead={handleFlagLead}
        auditLogs={auditLogs}
        onVerifyChain={handleVerifyChain}
        isAuditVerified={isAuditVerified}
        onExportPdf={handleExportPdf}
      />
    </>
  );
};

export default App;
