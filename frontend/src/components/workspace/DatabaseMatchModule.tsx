import React, { useState } from 'react';
import { Search, UserCheck, Shield, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { CaseFile, SketchIteration, MugshotRecord, PermissionMode } from '../../types/forensic';
import { MUGSHOT_DATABASE } from '../../data/mockForensicData';
import { apiClient } from '../../api/client';

interface DatabaseMatchModuleProps {
  caseFile: CaseFile;
  currentIteration: SketchIteration;
  flaggedLeads: MugshotRecord[];
  onFlagLead: (suspect: MugshotRecord) => void;
  permissionMode: PermissionMode;
}

export const DatabaseMatchModule: React.FC<DatabaseMatchModuleProps> = ({
  caseFile,
  currentIteration,
  flaggedLeads,
  onFlagLead,
  permissionMode,
}) => {
  const isReadOnly = permissionMode === 'read_only';
  const [isSearching, setIsSearching] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  // Top 5 records from database
  const matches = MUGSHOT_DATABASE.slice(0, 5).filter(
    m =>
      m.full_name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      m.record_code.toLowerCase().includes(filterQuery.toLowerCase()) ||
      m.matched_attributes.some(a => a.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  const handleRunSearch = () => {
    setIsSearching(true);
    apiClient
      .runMugshotMatch(caseFile.id, currentIteration.id)
      .catch(() => {})
      .finally(() => {
        setIsSearching(false);
      });
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-[#F5F5F2] font-sans text-[#18181B]">
      {/* LEFT PANE (340px width): Current Composite & Search Controls */}
      <div className="w-full lg:w-[340px] flex-shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-[#E4E4E0] bg-white p-5 space-y-5 overflow-y-auto">
        <div>
          <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-[#18181B]">
            Query Composite
          </h2>
          <p className="text-xs text-[#52525B] mt-0.5">
            Matching against CUFS / LFW criminal archives
          </p>
        </div>

        {/* Active Sketch Preview Card */}
        <div className="p-3 bg-[#FAF9F5] border border-[#E4E4E0] rounded space-y-3">
          <div className="w-full aspect-square bg-white rounded border border-[#E4E4E0] overflow-hidden flex items-center justify-center">
            <img
              src={currentIteration.image_url}
              alt="Query suspect sketch"
              className="w-full h-full object-contain filter contrast-[1.05]"
            />
          </div>

          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between text-[#52525B]">
              <span>Case Number:</span>
              <strong className="text-[#18181B]">{caseFile.case_number}</strong>
            </div>
            <div className="flex justify-between text-[#52525B]">
              <span>Iteration:</span>
              <strong className="text-[#18181B]">#{currentIteration.iteration_number}</strong>
            </div>
            <div className="flex justify-between text-[#52525B]">
              <span>Likeness Score:</span>
              <strong className="text-[#18181B]">{currentIteration.witness_likeness_score}/10</strong>
            </div>
            <div className="flex justify-between text-[#52525B]">
              <span>Algorithm:</span>
              <span className="text-[#18181B]">OpenCV Cosine (14-Point)</span>
            </div>
          </div>
        </div>

        {/* Search Action */}
        <div>
          <button
            type="button"
            disabled={isSearching}
            onClick={handleRunSearch}
            className="w-full py-2.5 px-4 rounded bg-[#18181B] hover:bg-[#27272A] text-white text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Search className="w-4 h-4" strokeWidth={1.5} />
            <span>{isSearching ? 'Comparing Vectors...' : 'Run Similarity Search'}</span>
          </button>

          {isReadOnly && (
            <p className="text-[11px] text-[#71717A] mt-2 text-center">
              Read-Only Mode: Viewing archived comparison scores.
            </p>
          )}
        </div>

        {/* Flagged Leads Summary */}
        <div className="pt-4 border-t border-[#E4E4E0]">
          <p className="text-xs font-mono font-semibold uppercase text-[#52525B] mb-2">
            Flagged Leads ({flaggedLeads.length})
          </p>
          {flaggedLeads.length === 0 ? (
            <p className="text-xs text-[#71717A]">No suspect leads attached to this case yet.</p>
          ) : (
            <div className="space-y-1.5">
              {flaggedLeads.map(lead => (
                <div
                  key={lead.id}
                  className="p-2 rounded border border-[#E4E4E0] bg-[#FAFAFA] flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-semibold text-[#18181B]">{lead.full_name}</p>
                    <p className="text-[10px] font-mono text-[#52525B]">{lead.record_code}</p>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#18181B]">
                    {lead.similarity_score}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANE: Structured Table of Top 5 Matching Records */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white p-5">
        {/* Top Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E4E4E0]">
          <div>
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-[#18181B]">
              Top Ranked Database Matches
            </h2>
            <p className="text-xs text-[#52525B] mt-0.5">
              Ranked by craniometric feature cosine similarity
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              placeholder="Filter matches by name, code, or trait..."
              className="px-3 py-1.5 text-xs bg-[#F9F9F8] border border-[#E4E4E0] rounded w-64 focus:border-[#18181B] text-[#18181B] outline-none"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="flex-1 overflow-y-auto mt-4">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E4E4E0] text-[10px] font-mono text-[#71717A] uppercase">
                <th className="py-2.5 px-3">Mugshot</th>
                <th className="py-2.5 px-3">Record ID</th>
                <th className="py-2.5 px-3">Full Name</th>
                <th className="py-2.5 px-3">Age / Height</th>
                <th className="py-2.5 px-3">Prior Offenses</th>
                <th className="py-2.5 px-3">Matched Traits</th>
                <th className="py-2.5 px-3">Similarity</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E0]">
              {matches.map(record => {
                const isAttached = flaggedLeads.some(l => l.id === record.id);
                return (
                  <tr key={record.id} className="hover:bg-[#F9F9F8] transition-colors">
                    {/* Photo */}
                    <td className="py-2.5 px-3">
                      <div className="w-10 h-12 rounded border border-[#E4E4E0] bg-[#FAF9F5] overflow-hidden">
                        <img
                          src={record.image_url}
                          alt={record.full_name}
                          className="w-full h-full object-cover filter contrast-[1.05]"
                        />
                      </div>
                    </td>

                    {/* Record ID */}
                    <td className="py-2.5 px-3 font-mono font-medium text-[#18181B]">
                      {record.record_code}
                    </td>

                    {/* Name */}
                    <td className="py-2.5 px-3 font-semibold text-[#18181B]">
                      {record.full_name}
                    </td>

                    {/* Age / Height */}
                    <td className="py-2.5 px-3 text-[#52525B]">
                      {record.age} yrs • {record.height_cm} cm
                    </td>

                    {/* Prior Offenses */}
                    <td className="py-2.5 px-3 text-[#52525B] max-w-[160px] truncate">
                      {record.prior_offenses.join(', ')}
                    </td>

                    {/* Matched Traits */}
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {record.matched_attributes.slice(0, 2).map(attr => (
                          <span
                            key={attr}
                            className="px-1.5 py-0.2 rounded bg-[#F4F4F5] text-[#52525B] text-[9px] font-mono"
                          >
                            {attr}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Similarity Progress */}
                    <td className="py-2.5 px-3">
                      <div className="space-y-1 w-24">
                        <div className="flex justify-between font-mono text-[10px] font-bold text-[#18181B]">
                          <span>{record.similarity_score}%</span>
                        </div>
                        <div className="w-full bg-[#E4E4E0] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#18181B] h-full rounded-full"
                            style={{ width: `${record.similarity_score}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => onFlagLead(record)}
                        className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                          isAttached
                            ? 'bg-[#18181B] text-white border-[#18181B]'
                            : 'bg-white border-[#E4E4E0] hover:border-[#18181B] text-[#18181B]'
                        } ${isReadOnly ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {isAttached ? 'Attached' : 'Attach to Case'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
