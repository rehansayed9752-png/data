import React, { useState } from 'react';
import {
  FileCheck2,
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
  CheckCircle2,
} from 'lucide-react';
import { AuditLogEntry, AuditActionType, OfficerRole } from '../../types/forensic';
import { computeAuditRowHash } from '../../utils/crypto';

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
    await new Promise(r => setTimeout(r, 600)); // Visual crypto verification feedback
    await onVerifyChain();
    setIsVerifying(false);
  };

  const getActionBadgeColor = (action: AuditActionType) => {
    switch (action) {
      case 'USER_LOGIN':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'CREATED_CASE_FILE':
      case 'OPENED_CASE_FILE':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'GENERATED_INITIAL_SKETCH':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'REFINED_FACIAL_FEATURE':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'UPDATED_LIKENESS_SCORE':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'EXECUTED_MUGSHOT_SEARCH':
      case 'FLAGGED_SUSPECT_MATCH':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30';
      case 'EXPORTED_HIGH_RES_SKETCH':
      case 'EXPORTED_CASE_DOSSIER_PDF':
        return 'text-amber-300 bg-amber-500/15 border-amber-400/40';
      case 'VERIFIED_AUDIT_CHAIN':
        return 'text-emerald-300 bg-emerald-500/15 border-emerald-400/40';
      default:
        return 'text-zinc-400 bg-zinc-800 border-white/[0.08]';
    }
  };

  const latestHash = auditLogs.length > 0 ? auditLogs[auditLogs.length - 1].row_hash : '';

  return (
    <div className="flex-1 p-4 max-w-7xl mx-auto w-full space-y-4 overflow-y-auto">
      {/* Top Header & Integrity Verification Banner */}
      <div className="p-4 bg-gradient-to-r from-[#0f121a] via-[#141926] to-[#0d1017] border border-white/[0.09] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-mono text-amber-400 font-semibold mb-1">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>IMMUTABLE EVIDENCE LEDGER // SHA-256 HASH CHAIN OF CUSTODY</span>
          </div>
          <h1 className="text-lg font-display font-bold text-zinc-100">
            Chain of Custody & Tamper-Evident Access Audit
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Every forensic interaction is cryptographically hashed with its preceding block. Zero silent deletions or alterations permitted.
          </p>
        </div>

        {/* Verification Trigger Button */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleTriggerVerification}
            disabled={isVerifying}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Verifying Hashes...' : 'Verify SHA-256 Chain Integrity'}</span>
          </button>
        </div>
      </div>

      {/* Verification Status Banner */}
      {isVerified && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg flex items-center justify-between text-xs text-emerald-200 animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="font-bold text-emerald-300">CRYPTOGRAPHIC CHAIN VERIFIED: </span>
              {auditLogs.length} Records recomputed with zero tampering detected. All SHA-256 digest links match.
            </div>
          </div>
          <div className="font-mono text-[10px] text-emerald-400">
            LATEST BLOCK: {latestHash.slice(0, 16)}...
          </div>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-[#111520] border border-white/[0.08] rounded-lg">
          <div className="text-[10px] font-mono uppercase text-zinc-400 mb-1">
            Total Audited Actions
          </div>
          <div className="text-xl font-display font-bold text-zinc-100">
            {auditLogs.length}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono">
            100% Case Coverage
          </div>
        </div>

        <div className="p-3 bg-[#111520] border border-white/[0.08] rounded-lg">
          <div className="text-[10px] font-mono uppercase text-zinc-400 mb-1">
            Active Officer Badges
          </div>
          <div className="text-xl font-display font-bold text-zinc-100">
            3
          </div>
          <div className="text-[10px] text-zinc-400 font-mono">
            KA-4091, KA-1182, KA-0045
          </div>
        </div>

        <div className="p-3 bg-[#111520] border border-white/[0.08] rounded-lg">
          <div className="text-[10px] font-mono uppercase text-zinc-400 mb-1">
            Genesis Hash
          </div>
          <div className="text-xs font-mono font-bold text-zinc-400 truncate">
            0000000000000000...
          </div>
          <div className="text-[10px] text-emerald-400 font-mono">
            Chain Genesis Anchor
          </div>
        </div>

        <div className="p-3 bg-[#111520] border border-white/[0.08] rounded-lg">
          <div className="text-[10px] font-mono uppercase text-zinc-400 mb-1">
            Latest Chain Digest
          </div>
          <div className="text-xs font-mono font-bold text-amber-400 truncate">
            {latestHash.slice(0, 20)}...
          </div>
          <div className="text-[10px] text-zinc-400 font-mono">
            Court Admissible
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 bg-[#0d1017] border border-white/[0.08] rounded-lg flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          <div className="flex items-center space-x-1 text-zinc-400">
            <Filter className="w-3 h-3" />
            <span>Filters:</span>
          </div>

          {/* Case filter */}
          <select
            value={selectedCase}
            onChange={e => setSelectedCase(e.target.value)}
            className="bg-[#141824] border border-white/[0.09] rounded px-2 py-1 text-zinc-200 focus:outline-none"
          >
            <option value="ALL">All Cases</option>
            <option value="case-2026-0891">CASE-2026-0891 (MG Road)</option>
            <option value="case-2026-0742">CASE-2026-0742 (Indiranagar)</option>
          </select>

          {/* Officer filter */}
          <select
            value={selectedOfficer}
            onChange={e => setSelectedOfficer(e.target.value)}
            className="bg-[#141824] border border-white/[0.09] rounded px-2 py-1 text-zinc-200 focus:outline-none"
          >
            <option value="ALL">All Officers</option>
            <option value="KA-4091">Det. Vikram Rao (KA-4091)</option>
            <option value="KA-1182">Analyst Priya Nair (KA-1182)</option>
            <option value="KA-0045">Supt. Arjun Mehta (KA-0045)</option>
          </select>

          {/* Action filter */}
          <select
            value={selectedAction}
            onChange={e => setSelectedAction(e.target.value)}
            className="bg-[#141824] border border-white/[0.09] rounded px-2 py-1 text-zinc-200 focus:outline-none"
          >
            <option value="ALL">All Action Types</option>
            <option value="REFINED_FACIAL_FEATURE">REFINED_FACIAL_FEATURE</option>
            <option value="GENERATED_INITIAL_SKETCH">GENERATED_INITIAL_SKETCH</option>
            <option value="OPENED_CASE_FILE">OPENED_CASE_FILE</option>
            <option value="UPDATED_LIKENESS_SCORE">UPDATED_LIKENESS_SCORE</option>
            <option value="EXECUTED_MUGSHOT_SEARCH">EXECUTED_MUGSHOT_SEARCH</option>
            <option value="FLAGGED_SUSPECT_MATCH">FLAGGED_SUSPECT_MATCH</option>
            <option value="VERIFIED_AUDIT_CHAIN">VERIFIED_AUDIT_CHAIN</option>
          </select>
        </div>

        <div className="text-zinc-400">
          Showing {filteredLogs.length} of {auditLogs.length} entries
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-[#0b0e15] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#121622] border-b border-white/[0.08] text-[10.5px] font-mono uppercase text-zinc-400">
                <th className="py-2.5 px-3 w-12">Seq</th>
                <th className="py-2.5 px-3">Timestamp (IST)</th>
                <th className="py-2.5 px-3">Officer</th>
                <th className="py-2.5 px-3">Action Type</th>
                <th className="py-2.5 px-3">Resource Target</th>
                <th className="py-2.5 px-3">IP Address</th>
                <th className="py-2.5 px-3">SHA-256 Digest</th>
                <th className="py-2.5 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] font-sans">
              {filteredLogs.map(entry => {
                const isExpanded = expandedSeqId === entry.seq_id;
                return (
                  <React.Fragment key={entry.seq_id}>
                    <tr className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                        #{entry.seq_id}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-zinc-300 text-[11px] whitespace-nowrap">
                        {entry.timestamp.replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-zinc-200">
                          {entry.officer_name}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400">
                          {entry.badge_number} • {entry.officer_role}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${getActionBadgeColor(
                            entry.action_type
                          )}`}
                        >
                          {entry.action_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-300 max-w-[200px] truncate">
                        {entry.resource_target}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10.5px] text-zinc-400">
                        {entry.ip_address}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10.5px]">
                        <div className="flex items-center space-x-1">
                          <span className="text-zinc-400 hover:text-amber-300 transition-colors cursor-pointer" title={entry.row_hash}>
                            {entry.row_hash.slice(0, 10)}...{entry.row_hash.slice(-4)}
                          </span>
                          <button
                            onClick={() => handleCopy(entry.row_hash)}
                            className="text-zinc-500 hover:text-white p-0.5"
                            title="Copy full SHA-256 hash"
                          >
                            {copiedHash === entry.row_hash ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setExpandedSeqId(isExpanded ? null : entry.seq_id)}
                          className="px-2 py-1 bg-[#141824] hover:bg-[#1a2030] border border-white/[0.08] rounded text-[11px] text-zinc-300 font-mono transition-colors"
                        >
                          {isExpanded ? 'Hide' : 'Inspect'}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable JSON details drawer */}
                    {isExpanded && (
                      <tr className="bg-[#0e111a] border-y border-white/[0.08]">
                        <td colSpan={8} className="p-3">
                          <div className="p-3 bg-[#080a0f] border border-white/[0.07] rounded-lg text-xs font-mono">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06] text-[11px]">
                              <div className="text-amber-400 font-semibold">
                                Cryptographic Link Payload Details:
                              </div>
                              <div className="text-zinc-400">
                                Prev Hash: <span className="text-zinc-300">{entry.prev_hash}</span>
                              </div>
                            </div>

                            <pre className="text-zinc-300 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(entry.details_json, null, 2)}
                            </pre>
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
    </div>
  );
};
