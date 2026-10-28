import React from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  GitBranch,
  Search,
  Lock,
  ArrowRight,
  TrendingUp,
  MapPin,
} from 'lucide-react';
import {
  CaseFile,
  OfficerProfile,
  SketchIteration,
  MugshotRecord,
} from '../../types/forensic';
import { MOCK_WITNESS_SESSIONS } from '../../data/mockForensicData';
import { panelRise } from '../../styles/tokens';

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
    <motion.div
      variants={panelRise}
      initial="hidden"
      animate="visible"
      className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full space-y-4 overflow-y-auto font-sans"
    >
      {/* Top Banner: Incident & Investigation Overview */}
      <div className="p-4 md:p-5 bg-surface-card border border-line-subtle rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-mono text-ink-muted mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
            <span className="uppercase tracking-wider font-medium text-ink-heading">Active Case File</span>
            <span className="text-ink-faint">/</span>
            <span className="text-accent font-semibold">{caseFile.case_number}</span>
          </div>
          <h1 className="text-xl font-serif font-semibold text-ink-heading mb-1.5">
            {caseFile.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
            <span className="flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-ink-faint" strokeWidth={1.5} />
              <span>{caseFile.incident_location}</span>
            </span>
            <span>•</span>
            <span>Incident Date: {caseFile.incident_date}</span>
            <span>•</span>
            <span>
              Lead: <strong className="text-ink-body font-medium">{currentOfficer.full_name} ({currentOfficer.badge_number})</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={onNavigateToStudio}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-md bg-accent hover:bg-accent-hover text-surface-base font-semibold text-xs transition-colors shadow-xs active:scale-[0.98]"
          >
            <span>Open Studio</span>
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 bg-surface-card border border-line-subtle rounded-xl">
          <div className="text-[10.5px] font-mono uppercase text-ink-faint mb-1.5 flex items-center justify-between">
            <span>Likeness Score</span>
            <TrendingUp className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
          </div>
          <div className="text-2xl font-serif font-bold text-ink-heading">
            {currentIteration.witness_likeness_score} <span className="text-xs font-sans text-ink-muted font-normal">/ 10</span>
          </div>
          <div className="text-[10.5px] text-ink-muted font-mono mt-1">
            Confidence: {currentIteration.confidence_rating.toUpperCase()}
          </div>
        </div>

        <div className="p-3.5 bg-surface-card border border-line-subtle rounded-xl">
          <div className="text-[10.5px] font-mono uppercase text-ink-faint mb-1.5 flex items-center justify-between">
            <span>Iteration</span>
            <GitBranch className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.5} />
          </div>
          <div className="text-2xl font-serif font-bold text-ink-heading">
            #{currentIteration.iteration_number}
          </div>
          <div className="text-[10.5px] text-ink-muted font-mono mt-1">
            Latency: {currentIteration.latency_ms}ms
          </div>
        </div>

        <div className="p-3.5 bg-surface-card border border-line-subtle rounded-xl">
          <div className="text-[10.5px] font-mono uppercase text-ink-faint mb-1.5 flex items-center justify-between">
            <span>Model Engine</span>
            <span className="w-2 h-2 rounded-full bg-accent"></span>
          </div>
          <div className="text-base font-serif font-semibold text-ink-heading truncate">
            Gemini 2.5 Flash
          </div>
          <div className="text-[10.5px] text-ink-muted font-mono mt-1 truncate">
            Seed #{caseFile.case_seed}
          </div>
        </div>

        <div className="p-3.5 bg-surface-card border border-line-subtle rounded-xl">
          <div className="text-[10.5px] font-mono uppercase text-ink-faint mb-1.5 flex items-center justify-between">
            <span>Audit Integrity</span>
            <Lock className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
          </div>
          <div className="text-base font-serif font-semibold text-ink-heading flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-accent"></span>
            <span>{isAuditVerified ? 'Valid SHA-256' : 'Unverified'}</span>
          </div>
          <div className="text-[10.5px] text-ink-muted font-mono mt-1">
            Cryptographic chain intact
          </div>
        </div>
      </div>

      {/* Main Content Grid: Multi-Witness Fusion & Suspect Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Multi-Witness Cross-Corroboration (7 cols) */}
        <div className="lg:col-span-7 bg-surface-card border border-line-subtle rounded-xl p-4 md:p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-line-subtle mb-3.5">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-accent" strokeWidth={1.5} />
              <h2 className="font-serif font-semibold text-sm text-ink-heading">
                Witness Testimony Corroboration
              </h2>
            </div>
            <span className="text-[11px] font-mono text-ink-muted">
              {MOCK_WITNESS_SESSIONS.length} Sessions Documented
            </span>
          </div>

          <div className="space-y-3">
            {MOCK_WITNESS_SESSIONS.map(session => (
              <div
                key={session.witness_id}
                className="p-3.5 bg-surface-base border border-line-subtle rounded-lg text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-ink-heading">
                      {session.alias}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-surface-elevated text-[10px] font-mono text-accent">
                      {session.agreement_rate}% Correlation
                    </span>
                  </div>
                  <span className="text-[10.5px] font-mono text-ink-faint">
                    {session.last_active}
                  </span>
                </div>

                <p className="text-xs text-ink-muted leading-relaxed">
                  {session.relation_to_crime}
                </p>

                <div className="pt-2 border-t border-line-subtle flex items-center justify-between text-[11px] text-ink-muted">
                  <span>Witness likeness agreement: <strong className="text-ink-heading font-medium">{session.likeness_score}/10</strong></span>
                  <span className="font-mono text-ink-faint">{session.statements_count} statements logged</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Flagged Suspect Leads (5 cols) */}
        <div className="lg:col-span-5 bg-surface-card border border-line-subtle rounded-xl p-4 md:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-line-subtle mb-3.5">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-accent" strokeWidth={1.5} />
                <h2 className="font-serif font-semibold text-sm text-ink-heading">
                  Flagged Suspect Matches
                </h2>
              </div>
              <button
                type="button"
                onClick={onOpenMatchModal}
                className="text-xs text-accent hover:underline font-medium"
              >
                Search Database →
              </button>
            </div>

            {flaggedLeads.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-muted">
                No suspect leads flagged yet for this case. Open the database search to compare embeddings.
              </div>
            ) : (
              <div className="space-y-3">
                {flaggedLeads.map(lead => (
                  <div
                    key={lead.id}
                    className="p-3 bg-surface-base border border-line-subtle rounded-lg flex space-x-3"
                  >
                    <div className="w-14 h-16 bg-surface-card rounded border border-line-subtle overflow-hidden flex-shrink-0">
                      <img
                        src={lead.image_url}
                        alt={lead.full_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-ink-heading text-xs truncate">
                          {lead.full_name}
                        </span>
                        <span className="text-xs font-mono text-accent font-semibold">
                          {lead.similarity_score}% Match
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-ink-faint">
                        {lead.record_code} • Age {lead.age}
                      </div>
                      <div className="text-[11px] text-ink-muted line-clamp-1">
                        {lead.matched_attributes.join(', ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-line-subtle mt-4">
            <button
              type="button"
              onClick={onOpenMatchModal}
              className="w-full py-2 rounded-md bg-surface-elevated hover:bg-surface-base border border-line-medium text-ink-body text-xs font-medium transition-colors text-center"
            >
              Run Vector Database Search
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
