import React, { useState } from 'react';
import { Shield, ChevronRight, Key, Eye, EyeOff } from 'lucide-react';
import { OfficerProfile, PermissionMode } from '../../types/forensic';
import { DEMO_OFFICERS } from '../../data/mockForensicData';
import { ForensicLoginScanner } from '../ui/ForensicAnimations';

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
  const [password, setPassword] = useState('forensic2026');
  const [showPassword, setShowPassword] = useState(false);
  const [permissionMode, setPermissionMode] = useState<PermissionMode>('read_write');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeNumber.trim() || !fullName.trim()) {
      setError('Please enter both Badge Number and Officer Name.');
      return;
    }

    if (!password.trim()) {
      setError('Authentication failed: Security Passkey required for terminal entry.');
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
    setPassword('forensic2026');
    setError(null);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-12 bg-[#F5F5F2] font-sans text-[#18181B]">
      <div className="w-full max-w-[1080px] flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16">
        {/* Left Side: ONLY the Huge Biometric Face Scanner */}
        <div className="flex-shrink-0 flex items-center justify-center">
          <ForensicLoginScanner />
        </div>

        {/* Right Side: Official Officer Authentication Gateway Card */}
        <div className="w-full max-w-[540px] bg-white border border-[#E4E4E0] rounded-md shadow-xs p-6 sm:p-8 flex flex-col justify-between">
          <div>
            {/* Form Header */}
            <div className="border-b border-[#E4E4E0] pb-4 mb-5">
              <div className="flex items-center gap-2 mb-1.5 text-[#52525B]">
                <Shield className="w-3.5 h-3.5 text-[#18181B]" strokeWidth={1.5} />
                <span className="font-mono text-[11px] font-semibold tracking-wider uppercase text-[#18181B]">
                  Department of Police & Forensic Sciences
                </span>
              </div>
              <h1 className="text-lg font-bold tracking-tight text-[#18181B]">
                OFFICER AUTHENTICATION GATEWAY
              </h1>
              <p className="text-xs text-[#52525B] mt-0.5">
                Authorized Law Enforcement Terminal — Biometric Case Portal
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-xs text-red-800 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Access Mode / Security Clearance Selector */}
              <div>
                <label className="block text-[11px] font-medium text-[#52525B] mb-1.5 uppercase font-mono tracking-wider">
                  Access Mode / Security Clearance
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPermissionMode('read_write')}
                    className={`p-2.5 rounded border text-left transition-all ${
                      permissionMode === 'read_write'
                        ? 'border-[#18181B] bg-[#F9F9F8] ring-1 ring-[#18181B]'
                        : 'border-[#E4E4E0] bg-white hover:border-[#D4D4D0]'
                    }`}
                  >
                    <div className="text-xs font-bold font-mono tracking-wider text-[#18181B] uppercase">
                      Read & Write
                    </div>
                    <div className="text-[10px] text-[#52525B] mt-0.5">
                      Full Investigator Access
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPermissionMode('read_only')}
                    className={`p-2.5 rounded border text-left transition-all ${
                      permissionMode === 'read_only'
                        ? 'border-[#18181B] bg-[#F9F9F8] ring-1 ring-[#18181B]'
                        : 'border-[#E4E4E0] bg-white hover:border-[#D4D4D0]'
                    }`}
                  >
                    <div className="text-xs font-bold font-mono tracking-wider text-[#18181B] uppercase">
                      Read Only
                    </div>
                    <div className="text-[10px] text-[#52525B] mt-0.5">
                      Supervisor / Court Review
                    </div>
                  </button>
                </div>
              </div>

              {/* Officer Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1 uppercase font-mono tracking-wider">
                    Badge Number
                  </label>
                  <input
                    type="text"
                    value={badgeNumber}
                    onChange={e => setBadgeNumber(e.target.value)}
                    placeholder="e.g. KA-4091"
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E4E4E0] rounded focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] font-mono text-[#18181B] outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1 uppercase font-mono tracking-wider">
                    Officer Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Vikram Rao"
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E4E4E0] rounded focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] text-[#18181B] outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#52525B] mb-1 uppercase font-mono tracking-wider">
                  Assigned Unit / Department
                </label>
                <select
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E4E4E0] rounded focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] text-[#18181B] outline-none transition-colors"
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Security Passkey Field (Mandatory for all modes) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-[#52525B] uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <Key className="w-3 h-3 text-[#18181B]" />
                    <span>Security Passkey</span>
                  </label>
                  <span className="text-[10px] font-mono text-[#71717A]">
                    Demo: forensic2026
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter security passkey..."
                    required
                    className="w-full pl-3 pr-10 py-2 text-xs bg-white border border-[#E4E4E0] rounded focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] font-mono text-[#18181B] outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#18181B] transition-colors p-1 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full mt-2 py-2.5 px-4 rounded bg-[#18181B] hover:bg-[#27272A] text-white text-xs font-mono font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99]"
              >
                <span>AUTHENTICATE & ACCESS TERMINAL</span>
                <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </form>
          </div>

          {/* Quick-fill Presets */}
          <div className="mt-5 pt-3.5 border-t border-[#E4E4E0]">
            <p className="text-[10px] font-mono text-[#71717A] uppercase tracking-wider mb-1.5">
              Quick-Fill Authorized Profiles:
            </p>
            <div className="space-y-1">
              {DEMO_OFFICERS.map(officer => (
                <button
                  key={officer.officer_id}
                  type="button"
                  onClick={() => handleSelectPreset(officer)}
                  className="w-full text-left px-2.5 py-1.5 rounded border border-[#E4E4E0] hover:bg-[#F9F9F8] hover:border-[#D4D4D0] transition-colors flex items-center justify-between text-xs font-mono text-[#52525B]"
                >
                  <span>
                    <strong className="text-[#18181B]">{officer.badge_number}</strong> — {officer.full_name}
                  </span>
                  <span className="text-[10px] text-[#71717A] truncate max-w-[180px]">
                    {officer.department}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
