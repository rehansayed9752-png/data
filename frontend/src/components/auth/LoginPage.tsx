import React, { useState } from 'react';
import { Shield, Lock, FileText, CheckCircle2, ChevronRight, User } from 'lucide-react';
import { OfficerProfile, PermissionMode } from '../../types/forensic';
import { DEMO_OFFICERS } from '../../data/mockForensicData';

interface LoginPageProps {
  onLogin: (officer: OfficerProfile, permissionMode: PermissionMode) => void;
}

const DEPARTMENTS = [
  'CID Crime Branch, Bengaluru City',
  'Forensic Science Laboratory (FSL)',
  'Central Investigation Range',
  'State Intelligence Department',
  'Special Task Force (Forensic Division)',
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [badgeNumber, setBadgeNumber] = useState('KA-4091');
  const [fullName, setFullName] = useState('Det. Vikram Rao');
  const [department, setDepartment] = useState('CID Crime Branch, Bengaluru City');
  const [permissionMode, setPermissionMode] = useState<PermissionMode>('read_write');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeNumber.trim() || !fullName.trim()) {
      setError('Please enter both Badge Number and Officer Name.');
      return;
    }

    const matchedOfficer = DEMO_OFFICERS.find(
      o => o.badge_number.toLowerCase() === badgeNumber.trim().toLowerCase()
    );

    const officer: OfficerProfile = matchedOfficer || {
      officer_id: `off-${badgeNumber.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      badge_number: badgeNumber.trim().toUpperCase(),
      full_name: fullName.trim(),
      rank: permissionMode === 'read_only' ? 'Audit Inspector' : 'Investigating Officer',
      department,
      role: permissionMode === 'read_only' ? 'supervisor' : 'investigator',
      avatar_initials: fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'OF',
    };

    onLogin(officer, permissionMode);
  };

  const handleSelectPreset = (officer: OfficerProfile) => {
    setBadgeNumber(officer.badge_number);
    setFullName(officer.full_name);
    setDepartment(officer.department);
    setError(null);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#F5F5F2] font-sans text-[#18181B]">
      <div className="w-full max-w-[560px] bg-white border border-[#E4E4E0] rounded-md shadow-xs p-8 sm:p-10">
        {/* Institutional Header */}
        <div className="border-b border-[#E4E4E0] pb-6 mb-6">
          <div className="flex items-center gap-2 mb-2 text-[#52525B]">
            <Shield className="w-4 h-4 text-[#18181B]" strokeWidth={1.5} />
            <span className="font-mono text-xs font-semibold tracking-wider uppercase text-[#18181B]">
              Department of Police & Forensic Sciences
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#18181B]">
            FORENSIC COMPOSITE & EVIDENCE SYSTEM
          </h1>
          <p className="text-xs text-[#52525B] mt-1">
            Authorized Law Enforcement Terminal — Case & Audit Portal
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded bg-red-50 border border-red-200 text-xs text-red-800 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Officer Credentials */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#52525B] mb-1.5 uppercase font-mono tracking-wider">
                  Badge Number
                </label>
                <input
                  type="text"
                  value={badgeNumber}
                  onChange={e => setBadgeNumber(e.target.value)}
                  placeholder="e.g. KA-4091"
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E4E4E0] rounded focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] font-mono text-[#18181B] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#52525B] mb-1.5 uppercase font-mono tracking-wider">
                  Officer Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Vikram Rao"
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E4E4E0] rounded focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] text-[#18181B] outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#52525B] mb-1.5 uppercase font-mono tracking-wider">
                Assigned Unit / Department
              </label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E4E4E0] rounded focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] text-[#18181B] outline-none transition-colors"
              >
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Explicit Access Permission Selector */}
          <div className="pt-2">
            <label className="block text-xs font-medium text-[#52525B] mb-2 uppercase font-mono tracking-wider">
              Terminal Access Permission Mode
            </label>

            <div className="space-y-2.5">
              {/* Option A: READ & WRITE */}
              <label
                className={`flex items-start gap-3.5 p-3.5 rounded border cursor-pointer transition-all ${
                  permissionMode === 'read_write'
                    ? 'border-[#18181B] bg-[#F9F9F8] ring-1 ring-[#18181B]'
                    : 'border-[#E4E4E0] bg-white hover:border-[#D4D4D0]'
                }`}
              >
                <input
                  type="radio"
                  name="permissionMode"
                  value="read_write"
                  checked={permissionMode === 'read_write'}
                  onChange={() => setPermissionMode('read_write')}
                  className="mt-0.5 accent-[#18181B]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono tracking-wider text-[#18181B] uppercase">
                      Read & Write
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#18181B] text-white font-medium">
                      Full Investigator Access
                    </span>
                  </div>
                  <p className="text-xs text-[#52525B] mt-1 leading-relaxed">
                    Create cases, record witness interviews, generate and refine composite sketches, run database comparisons, and export dossiers.
                  </p>
                </div>
              </label>

              {/* Option B: READ ONLY */}
              <label
                className={`flex items-start gap-3.5 p-3.5 rounded border cursor-pointer transition-all ${
                  permissionMode === 'read_only'
                    ? 'border-[#18181B] bg-[#F9F9F8] ring-1 ring-[#18181B]'
                    : 'border-[#E4E4E0] bg-white hover:border-[#D4D4D0]'
                }`}
              >
                <input
                  type="radio"
                  name="permissionMode"
                  value="read_only"
                  checked={permissionMode === 'read_only'}
                  onChange={() => setPermissionMode('read_only')}
                  className="mt-0.5 accent-[#18181B]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono tracking-wider text-[#18181B] uppercase">
                      Read Only
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#52525B] text-white font-medium">
                      Supervisor / Court Review Access
                    </span>
                  </div>
                  <p className="text-xs text-[#52525B] mt-1 leading-relaxed">
                    View existing cases, inspect sketch iterations with the magnifying loupe, verify SHA-256 audit logs, and download reports. Sketch modification is disabled.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded bg-[#18181B] hover:bg-[#27272A] text-white text-sm font-semibold tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99]"
          >
            <span>Enter Terminal</span>
            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </form>

        {/* Quick-fill Presets */}
        <div className="mt-8 pt-6 border-t border-[#E4E4E0]">
          <p className="text-[11px] font-mono text-[#71717A] uppercase tracking-wider mb-2.5">
            Quick-Fill Authorized Profiles:
          </p>
          <div className="space-y-1.5">
            {DEMO_OFFICERS.map(officer => (
              <button
                key={officer.officer_id}
                type="button"
                onClick={() => handleSelectPreset(officer)}
                className="w-full text-left px-3 py-1.5 rounded border border-[#E4E4E0] hover:bg-[#F9F9F8] hover:border-[#D4D4D0] transition-colors flex items-center justify-between text-xs font-mono text-[#52525B]"
              >
                <span>
                  <strong className="text-[#18181B]">{officer.badge_number}</strong> — {officer.full_name}
                </span>
                <span className="text-[10px] text-[#71717A] truncate max-w-[200px]">
                  {officer.department}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
