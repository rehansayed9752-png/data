import React from 'react';
import {
  Shield,
  Users,
  Clock,
  Sparkles,
  GitBranch,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Lock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  CaseFile,
  OfficerProfile,
  SketchIteration,
  MugshotRecord,
  WitnessSession,
} from '../../types/forensic';
import { MOCK_WITNESS_SESSIONS } from '../../data/mockForensicData';

interface InvestigationDashboardProps {
  caseFile: CaseFile;
  currentOfficer: OfficerProfile;
  currentIteration: SketchIteration;
  flaggedLeads: MugshotRecord[];
  onOpenMatchModal: () => void;
  onNavigateToStudio: () => void;
  isAuditVerified: boolean;
}

export const InvestigationDashboard: React.FC<InvestigationDashboardProps> = ({
  caseFile,
  currentOfficer,
  currentIteration,
  flaggedLeads,
  onOpenMatchModal,
  onNavigateToStudio,
  isAuditVerified,
}) => {
  return (
    <div className="flex-1 p-4 max-w-7xl mx-auto w-full space-y-4 overflow-y-auto">
      {/* Top Banner: Incident & Investigation Overview */}
      <div className="p-4 bg-gradient-to-r from-[#111520] via-[#141926] to-[#10141f] border border-white/[0.09] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-mono text-amber-400 font-semibold mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>ACTIVE INVESTIGATION CASE DOSSIER</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-300">ID: {caseFile.case_number}</span>
          </div>
          <h1 className="text-lg font-display font-bold text-zinc-100 mb-1">
            {caseFile.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 font-mono">
            <span>Location: {caseFile.incident_location}</span>
            <span>•</span>
            <span>Incident Date: {caseFile.incident_date}</span>
            <span>•</span>
            <span className="text-zinc-300">
              Lead Officer: <strong className="text-zinc-100">{currentOfficer.full_name} ({currentOfficer.badge_number})</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onNavigateToStudio}
            className="flex items-center space-x-1.5 px-3 py-2 rounded bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors"
          >
            <span>Open Studio Canvas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-[#111520] border border-white/[0.08] rounded-lg">
          <div className="text-[10px] font-mono uppercase text-zinc-400 mb-1 flex items-center justify-between">
            <span>Witness Likeness</span>
            <TrendingUp className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="text-xl font-display font-bold text-emerald-400">
            {currentIteration.witness_likeness_score} <span className="text-xs text-zinc-400">/ 10</span>
          </div>
          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
            Confidence: {currentIteration.confidence_rating.toUpperCase()}
          </div>
        </div>

        <div className="p-3 bg-[#111520] border border-white/[0.08] rounded-lg">
          <div className="text-[10px] font-mono uppercase text-zinc-400 mb-1 flex items-center justify-between">
            <span>Current Iteration</span>
            <GitBranch className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="text-xl font-display font-bold text-zinc-100">
            #{currentIteration.iteration_number}
          </div>
          <div className="text-[10px] text-cyan-400 font-mono mt-0.5">
            Identity Anchored ({caseFile.case_seed})
          </div>
        </div>

        <div className="p-3 bg-[#111520] border border-white/[0.08] rounded-lg">
          <div className="text-[10px] font-mono uppercase text-zinc-400 mb-1 flex items-center justify-between">
            <span>Chain of Custody</span>
            <FileCheck2 className="w-3 h-3 text-amber-400" />
          </div>
          <div className="text-base font-display font-bold text-amber-400">
            {isAuditVerified ? 'VERIFIED' : 'ACTIVE'}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
            0 Alterations Detected
          </div>
        </div>

        <div className="p-3 bg-[#111520] border border-white/[0.08] rounded-lg">
          <div className="text-[10px] font-mono uppercase text-zinc-400 mb-1 flex items-center justify-between">
            <span>Top Suspect Match</span>
            <Search className="w-3 h-3 text-indigo-400" />
          </div>
          <div className="text-xl font-display font-bold text-indigo-300">
            {flaggedLeads.length > 0 ? `${flaggedLeads[0].similarity_score}%` : '89.4%'}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
            Investigative Lead
          </div>
        </div>
      </div>

      {/* Middle Grid: Multi-Witness Fusion & Timeline Reconstruction */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Collaborative Witness Fusion (Phase 11) - 7 cols */}
        <div className="lg:col-span-7 bg-[#0f121a] border border-white/[0.08] rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/[0.06]">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-display font-bold text-zinc-200 uppercase tracking-wider">
                  Collaborative Multi-Witness Fusion (Phase 11)
                </h2>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/30">
                Consensus Rate: 88%
              </span>
            </div>

            <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
              Maintains independent witness testimony branches without silent averaging. Points of agreement reinforce facial structure; points of divergence generate comparative variations.
            </p>

            <div className="space-y-2.5 mb-4">
              {MOCK_WITNESS_SESSIONS.map(session => (
                <div
                  key={session.witness_id}
                  className="p-3 bg-[#141824] border border-white/[0.07] rounded-lg flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">
                      {session.alias}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                      {session.relation_to_crime} • Likeness: {session.likeness_score}/10
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-emerald-400">
                      {session.agreement_rate}% Alignment
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {session.statements_count} Statements
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Trait Agreement Table */}
            <div className="bg-[#121622] border border-white/[0.06] rounded-lg p-3 text-xs font-mono">
              <div className="text-[10px] uppercase text-zinc-400 font-semibold mb-2">
                Anatomical Concurrence Breakdown:
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center justify-between p-1.5 bg-black/30 rounded border border-white/[0.04]">
                  <span className="text-zinc-300">Jawline Contour:</span>
                  <span className="text-emerald-400 font-semibold">100% Agree (Square)</span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-black/30 rounded border border-white/[0.04]">
                  <span className="text-zinc-300">Cheek Scar:</span>
                  <span className="text-emerald-400 font-semibold">100% Agree (Diagonal)</span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-black/30 rounded border border-white/[0.04]">
                  <span className="text-zinc-300">Eye Hooding:</span>
                  <span className="text-amber-400 font-semibold">80% Concurrence</span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-black/30 rounded border border-white/[0.04]">
                  <span className="text-zinc-300">Facial Hair:</span>
                  <span className="text-cyan-400 font-semibold">Consensus Formed</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 font-mono">
              Officer Confirmation Required for Official Fusion Merge
            </span>
            <button
              onClick={() => alert('Witness Consensus Merged and logged to immutable audit ledger.')}
              className="px-3 py-1.5 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 text-xs font-medium transition-colors"
            >
              Approve Weighted Consensus
            </button>
          </div>
        </div>

        {/* Right: Suspect Search & Safe AI Shield - 5 cols */}
        <div className="lg:col-span-5 space-y-4">
          {/* Law Enforcement Suspect Leads Card */}
          <div className="bg-[#0f121a] border border-white/[0.08] rounded-xl p-4">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/[0.06]">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-indigo-400" />
                <h2 className="text-xs font-display font-bold text-zinc-200 uppercase tracking-wider">
                  Partial Suspect Search Leads
                </h2>
              </div>
              <button
                onClick={onOpenMatchModal}
                className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 underline"
              >
                View Top 5 Matches
              </button>
            </div>

            <div className="space-y-2 mb-3">
              <div className="p-2.5 bg-[#141824] border border-white/[0.07] rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-zinc-200">
                    Dinesh "Nagar" Kumar
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    CR-BLR-2024-819 • Armed Vault Robbery
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-emerald-400">
                    89.4% Match
                  </div>
                  <span className="px-1.5 py-0.2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] rounded font-mono">
                    FLAGGED LEAD
                  </span>
                </div>
              </div>
            </div>

            <div className="p-2 bg-zinc-900/80 border border-white/[0.06] rounded text-[10.5px] text-zinc-400 italic">
              "Investigative lead only. Similarity scores are ranked hypotheses based on Facenet512 vector cosine distance and do not constitute legal identification."
            </div>
          </div>

          {/* Ethical Safe-AI Shield Status Widget (Phase 2) */}
          <div className="bg-[#0f121a] border border-white/[0.08] rounded-xl p-4">
            <div className="flex items-center space-x-2 pb-2 mb-2 border-b border-white/[0.06]">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-display font-bold text-zinc-200 uppercase tracking-wider">
                Ethical Safe-AI Policy Shield
              </h2>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-zinc-300">
                <span>Public Figure / Celebrity Guard:</span>
                <span className="text-emerald-400 font-bold">ACTIVE (0 Bypasses)</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span>Unauthorized Biometric Filter:</span>
                <span className="text-emerald-400 font-bold">ENFORCED</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span>Role-Based Custody Permissions:</span>
                <span className="text-emerald-400 font-bold">LOCKED ({currentOfficer.badge_number})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
