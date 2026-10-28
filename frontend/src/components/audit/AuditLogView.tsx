import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Lock,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import { AuditLogEntry, AuditActionType } from '../../types/forensic';
import { panelRise } from '../../styles/tokens';

interface AuditLogViewProps {
  auditLogs: AuditLogEntry[];
  onVerifyChain: () => Promise<boolean>;
  isVerified: boolean;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  auditLogs,
  onVerifyChain,
  isVerified,
}) => {
  const [selectedCase, setSelectedCase] = useState<string>('ALL');
  const [selectedOfficer, setSelectedOfficer] = useState<string>('ALL');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [expandedSeqId, setExpandedSeqId] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Filter logs
  const filteredLogs = auditLogs.filter(entry => {
    if (selectedCase !== 'ALL' && entry.case_id !== selectedCase) return false;
    if (selectedOfficer !== 'ALL' && entry.badge_number !== selectedOfficer) return false;
    if (selectedAction !== 'ALL' && entry.action_type !== selectedAction) return false;
    return true;
  });

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleTriggerVerification = async () => {
    setIsVerifying(true);
    await new Promise(r => setTimeout(r, 600));
    await onVerifyChain();
    setIsVerifying(false);
  };

  const latestHash = auditLogs.length > 0 ? auditLogs[auditLogs.length - 1].row_hash : '';

  return (
    <motion.div
      variants={panelRise}
      initial="hidden"
      animate="visible"
      className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full space-y-4 overflow-y-auto font-sans"
    >
      {/* Top Header & Integrity Verification Banner */}
      <div className="p-4 md:p-5 bg-surface-card border border-line-subtle rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-mono text-ink-muted mb-1.5">
            <Lock className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
            <span className="uppercase tracking-wider font-medium text-ink-heading">Chain of Custody Ledger</span>
            <span className="text-ink-faint">/</span>
            <span className="text-accent font-mono text-xs">SHA-256</span>
          </div>
          <h1 className="text-xl font-serif font-semibold text-ink-heading mb-1">
            Tamper-Evident Forensic Access Audit
          </h1>
          <p className="text-xs text-ink-muted">
            Every evidentiary modification is cryptographically linked with its preceding block. Zero silent deletions permitted.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleTriggerVerification}
            disabled={isVerifying}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-md font-semibold text-xs transition-colors shadow-xs active:scale-[0.98] ${
              isVerified
                ? 'bg-surface-elevated hover:bg-surface-base text-ink-heading border border-line-medium'
                : 'bg-accent hover:bg-accent-hover text-surface-base'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            <span>{isVerifying ? 'Verifying Hash Chain...' : 'Verify Cryptographic Chain'}</span>
          </button>
        </div>
      </div>

      {/* Summary Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-surface-card border border-line-subtle rounded-xl">
          <div className="text-[10.5px] font-mono uppercase text-ink-faint mb-1">
            Ledger Depth
          </div>
          <div className="text-xl font-serif font-bold text-ink-heading">
            {auditLogs.length} Events
          </div>
          <div className="text-[10.5px] text-ink-muted font-mono mt-0.5">
            Sequence #1 to #{auditLogs.length}
          </div>
        </div>

        <div className="p-3.5 bg-surface-card border border-line-subtle rounded-xl">
          <div className="text-[10.5px] font-mono uppercase text-ink-faint mb-1">
            Integrity Status
          </div>
          <div className="text-xl font-serif font-bold text-ink-heading flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${isVerified ? 'bg-accent' : 'bg-red-500'}`}></span>
            <span>{isVerified ? 'Cryptographically Sealed' : 'Tamper Detected'}</span>
          </div>
          <div className="text-[10.5px] text-ink-muted font-mono mt-0.5">
            Zero broken links
          </div>
        </div>

        <div className="p-3.5 bg-surface-card border border-line-subtle rounded-xl">
          <div className="text-[10.5px] font-mono uppercase text-ink-faint mb-1">
            Latest Anchor Hash
          </div>
          <div className="text-xs font-mono text-ink-body truncate">
            {latestHash.slice(0, 16)}...{latestHash.slice(-8)}
          </div>
          <div className="text-[10.5px] text-ink-muted font-mono mt-1">
            Locked on HQ Intranet
          </div>
        </div>
      </div>

      {/* Ledger Table Container */}
      <div className="bg-surface-card border border-line-subtle rounded-xl overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-line-subtle flex items-center justify-between gap-3 flex-wrap text-xs">
          <div className="text-ink-heading font-medium">
            Immutable Audit Trail ({filteredLogs.length} matching events)
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2">
            <select
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value)}
              className="bg-surface-base border border-line-subtle rounded px-2.5 py-1 text-xs text-ink-body focus:outline-none focus:border-accent"
            >
              <option value="ALL">All Event Types</option>
              <option value="GENERATED_INITIAL_SKETCH">Initial Sketch</option>
              <option value="REFINED_FACIAL_FEATURE">Refined Feature</option>
              <option value="UPDATED_LIKENESS_SCORE">Likeness Score</option>
              <option value="EXPORTED_CASE_DOSSIER_PDF">Exported PDF</option>
              <option value="VERIFIED_AUDIT_CHAIN">Chain Verification</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-surface-base border-b border-line-subtle text-[10.5px] font-mono uppercase text-ink-faint">
              <tr>
                <th className="py-2.5 px-4 w-12">Seq</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Officer / Badge</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Target Resource</th>
                <th className="py-2.5 px-4">Row SHA-256 Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {filteredLogs.map(entry => {
                const isExpanded = expandedSeqId === entry.seq_id;
                return (
                  <React.Fragment key={entry.seq_id}>
                    <tr
                      onClick={() => setExpandedSeqId(isExpanded ? null : entry.seq_id)}
                      className="hover:bg-surface-elevated/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-2.5 px-4 font-mono text-ink-muted">
                        #{entry.seq_id}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-ink-muted text-[11px] whitespace-nowrap">
                        {entry.timestamp.replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="font-medium text-ink-heading">{entry.officer_name}</span>
                        <span className="text-ink-faint font-mono text-[10.5px] ml-1.5">({entry.badge_number})</span>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-surface-elevated text-ink-body border border-line-subtle text-[10.5px] font-mono">
                          {entry.action_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-ink-body max-w-xs truncate">
                        {entry.resource_target}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-ink-muted whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="truncate max-w-[120px]">
                            {entry.row_hash.slice(0, 12)}...
                          </span>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleCopy(entry.row_hash);
                            }}
                            className="p-1 hover:text-ink-heading text-ink-faint rounded"
                            title="Copy full SHA-256 hash"
                          >
                            {copiedHash === entry.row_hash ? (
                              <Check className="w-3 h-3 text-accent" strokeWidth={2} />
                            ) : (
                              <Copy className="w-3 h-3" strokeWidth={1.5} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-surface-base">
                        <td colSpan={6} className="p-4 text-xs font-mono text-ink-muted">
                          <div className="space-y-2">
                            <div>
                              <strong className="text-ink-heading">Previous Hash:</strong>{' '}
                              <span className="text-ink-faint">{entry.prev_hash}</span>
                            </div>
                            <div>
                              <strong className="text-ink-heading">Current Hash:</strong>{' '}
                              <span className="text-accent">{entry.row_hash}</span>
                            </div>
                            <div>
                              <strong className="text-ink-heading">Structured Payload:</strong>
                              <pre className="mt-1 p-2 bg-surface-card rounded border border-line-subtle text-[11px] text-ink-body overflow-x-auto">
                                {JSON.stringify(entry.details_json, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
