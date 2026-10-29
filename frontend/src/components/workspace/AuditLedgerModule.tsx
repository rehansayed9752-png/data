import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Hash, Filter, ChevronRight, ChevronDown, CheckCircle2 } from 'lucide-react';
import { AuditLogEntry, PermissionMode } from '../../types/forensic';

interface AuditLedgerModuleProps {
  auditLogs: AuditLogEntry[];
  onVerifyChain: () => Promise<boolean>;
  isVerified: boolean;
  activeCaseId: string;
}

export const AuditLedgerModule: React.FC<AuditLedgerModuleProps> = ({
  auditLogs,
  onVerifyChain,
  isVerified,
  activeCaseId,
}) => {
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterOfficer, setFilterOfficer] = useState<string>('');
  const [filterCase, setFilterCase] = useState<string>('');
  const [filterMode, setFilterMode] = useState<string>('all');
  const [expandedSeqId, setExpandedSeqId] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const activeCaseCount = auditLogs.filter(e => e.case_id === activeCaseId).length;

  const filteredLogs = auditLogs.filter(entry => {
    if (filterAction !== 'all' && entry.action_type !== filterAction) return false;
    if (filterOfficer && !entry.badge_number.toLowerCase().includes(filterOfficer.toLowerCase())) return false;
    if (filterCase && !entry.case_id.toLowerCase().includes(filterCase.toLowerCase())) return false;
    if (filterMode !== 'all') {
      const mode = entry.access_mode || (entry.details_json?.access_mode as PermissionMode) || 'read_write';
      if (mode !== filterMode) return false;
    }
    return true;
  });

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      await onVerifyChain();
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white font-sans text-[#18181B] p-5 space-y-4">
      {/* Top Header & Metrics Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E4E4E0]">
        <div>
          <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-[#18181B]">
            Tamper-Evident SHA-256 Custody Ledger
          </h2>
          <p className="text-xs text-[#52525B] mt-0.5">
            Cryptographically chained transaction log for court-admissible evidence
          </p>
        </div>

        {/* Summary Metric Boxes */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3 py-1.5 rounded border border-[#E4E4E0] bg-[#FAF9F5] font-mono text-xs">
            <span className="text-[#71717A] text-[10px] uppercase block">Total Chain Events</span>
            <strong className="text-[#18181B] text-sm">{auditLogs.length}</strong>
          </div>

          <div className="px-3 py-1.5 rounded border border-[#E4E4E0] bg-[#FAF9F5] font-mono text-xs">
            <span className="text-[#71717A] text-[10px] uppercase block">Active Case Events</span>
            <strong className="text-[#18181B] text-sm">{activeCaseCount}</strong>
          </div>

          <div className="px-3 py-1.5 rounded border border-[#E4E4E0] bg-[#FAF9F5] font-mono text-xs flex items-center gap-2">
            <div>
              <span className="text-[#71717A] text-[10px] uppercase block">Chain Integrity</span>
              <strong className={isVerified ? 'text-emerald-700 text-sm' : 'text-red-700 text-sm'}>
                {isVerified ? 'VERIFIED' : 'INTEGRITY ERROR'}
              </strong>
            </div>
            <button
              type="button"
              disabled={isVerifying}
              onClick={handleVerify}
              className="ml-2 px-2.5 py-1 rounded bg-[#18181B] hover:bg-[#27272A] text-white text-[11px] font-sans font-medium transition-colors cursor-pointer"
            >
              {isVerifying ? 'Verifying...' : 'Verify Hash Chain'}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-[#FAF9F5] p-3 rounded border border-[#E4E4E0] text-xs">
        <div>
          <label className="block text-[10px] font-mono text-[#71717A] uppercase mb-1">Action Type:</label>
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="w-full px-2 py-1 bg-white border border-[#E4E4E0] rounded text-xs font-mono text-[#18181B] outline-none"
          >
            <option value="all">All Actions</option>
            <option value="USER_LOGIN">USER_LOGIN</option>
            <option value="CREATED_CASE_FILE">CREATED_CASE_FILE</option>
            <option value="OPENED_CASE_FILE">OPENED_CASE_FILE</option>
            <option value="REFINED_FACIAL_FEATURE">REFINED_FACIAL_FEATURE</option>
            <option value="UPDATED_LIKENESS_SCORE">UPDATED_LIKENESS_SCORE</option>
            <option value="FLAGGED_SUSPECT_MATCH">FLAGGED_SUSPECT_MATCH</option>
            <option value="EXPORTED_CASE_DOSSIER_PDF">EXPORTED_CASE_DOSSIER_PDF</option>
            <option value="VERIFIED_AUDIT_CHAIN">VERIFIED_AUDIT_CHAIN</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-mono text-[#71717A] uppercase mb-1">Filter Case ID:</label>
          <input
            type="text"
            value={filterCase}
            onChange={e => setFilterCase(e.target.value)}
            placeholder="e.g. CASE-2026-0891"
            className="w-full px-2 py-1 bg-white border border-[#E4E4E0] rounded text-xs font-mono text-[#18181B] outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-mono text-[#71717A] uppercase mb-1">Officer Badge:</label>
          <input
            type="text"
            value={filterOfficer}
            onChange={e => setFilterOfficer(e.target.value)}
            placeholder="e.g. KA-4091"
            className="w-full px-2 py-1 bg-white border border-[#E4E4E0] rounded text-xs font-mono text-[#18181B] outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-mono text-[#71717A] uppercase mb-1">Access Mode:</label>
          <select
            value={filterMode}
            onChange={e => setFilterMode(e.target.value)}
            className="w-full px-2 py-1 bg-white border border-[#E4E4E0] rounded text-xs font-mono text-[#18181B] outline-none"
          >
            <option value="all">All Modes</option>
            <option value="read_write">Read & Write</option>
            <option value="read_only">Read Only</option>
          </select>
        </div>
      </div>

      {/* High-Density Institutional Audit Table */}
      <div className="flex-1 overflow-y-auto border border-[#E4E4E0] rounded">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-[#FAF9F5] border-b border-[#E4E4E0] sticky top-0 z-10 text-[10px] font-mono text-[#71717A] uppercase">
            <tr>
              <th className="py-2 px-3 w-12">Seq #</th>
              <th className="py-2 px-3">UTC Timestamp</th>
              <th className="py-2 px-3">Officer Badge</th>
              <th className="py-2 px-3">Access Mode</th>
              <th className="py-2 px-3">Action</th>
              <th className="py-2 px-3">Case ID</th>
              <th className="py-2 px-3 font-mono">Row Hash (SHA-256)</th>
              <th className="py-2 px-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4E4E0] font-mono text-[11px]">
            {filteredLogs.map(entry => {
              const isExpanded = expandedSeqId === entry.seq_id;
              const mode = entry.access_mode || (entry.details_json?.access_mode as PermissionMode) || 'read_write';

              return (
                <React.Fragment key={entry.seq_id}>
                  <tr
                    onClick={() => setExpandedSeqId(isExpanded ? null : entry.seq_id)}
                    className="hover:bg-[#F9F9F8] cursor-pointer transition-colors"
                  >
                    <td className="py-2 px-3 font-bold text-[#18181B]">{entry.seq_id}</td>
                    <td className="py-2 px-3 text-[#52525B]">
                      {new Date(entry.timestamp).toISOString().replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="py-2 px-3 font-semibold text-[#18181B]">{entry.badge_number}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-semibold ${
                          mode === 'read_only'
                            ? 'bg-[#F4F4F5] text-[#52525B] border border-[#E4E4E0]'
                            : 'bg-[#18181B] text-white'
                        }`}
                      >
                        {mode === 'read_only' ? 'READ-ONLY' : 'R/W'}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-sans font-semibold text-[#18181B]">
                      {entry.action_type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2 px-3 text-[#52525B]">{entry.case_id}</td>
                    <td className="py-2 px-3 text-[#71717A] text-[10px] max-w-[200px] truncate" title={entry.row_hash}>
                      {entry.row_hash.slice(0, 16)}...
                    </td>
                    <td className="py-2 px-2 text-[#71717A]">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </td>
                  </tr>

                  {/* Expanded JSON Detail Drawer */}
                  {isExpanded && (
                    <tr className="bg-[#FAF9F5]">
                      <td colSpan={8} className="p-4 border-t border-[#E4E4E0] text-xs font-mono">
                        <div className="space-y-2">
                          <div className="flex justify-between text-[11px] text-[#52525B] border-b border-[#E4E4E0] pb-1.5">
                            <span>Resource Target: <strong>{entry.resource_target}</strong></span>
                            <span>Officer: <strong>{entry.officer_name} ({entry.officer_role})</strong></span>
                            <span>IP: <strong>{entry.ip_address}</strong></span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-[10px]">
                            <div>
                              <span className="text-[#71717A] uppercase block mb-1">Previous Hash:</span>
                              <p className="bg-white p-2 rounded border border-[#E4E4E0] break-all">{entry.prev_hash}</p>
                            </div>
                            <div>
                              <span className="text-[#71717A] uppercase block mb-1">Row SHA-256 Digest:</span>
                              <p className="bg-white p-2 rounded border border-[#E4E4E0] break-all text-[#18181B] font-bold">
                                {entry.row_hash}
                              </p>
                            </div>
                          </div>

                          <div className="mt-2">
                            <span className="text-[#71717A] uppercase text-[10px] block mb-1">Payload Transaction Details:</span>
                            <pre className="p-3 bg-white border border-[#E4E4E0] rounded text-[11px] overflow-x-auto text-[#18181B]">
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
  );
};
