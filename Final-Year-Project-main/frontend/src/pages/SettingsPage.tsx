import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Eye, 
  Type, 
  ShieldCheck, 
  Trash2, 
  Check, 
  User as UserIcon,
  Sliders
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';

export const SettingsPage: React.FC = () => {
  const { 
    highContrast, 
    largeText, 
    reducedMotion, 
    toggleHighContrast, 
    toggleLargeText, 
    toggleReducedMotion 
  } = useAccessibility();

  const { user, updatePreferences, isAuthenticated } = useAuth();

  const [historyEnabled, setHistoryEnabled] = useState<boolean>(
    user?.historyRetentionEnabled ?? true
  );
  const [preferredMode, setPreferredMode] = useState<string>(
    user?.preferredMode ?? 'text'
  );
  const [name, setName] = useState<string>(user?.name ?? '');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [purgeSuccess, setPurgeSuccess] = useState<boolean>(false);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    try {
      await updatePreferences({
        name,
        preferredMode: preferredMode as any,
        historyRetentionEnabled: historyEnabled
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePurgeHistory = async () => {
    if (!window.confirm('Are you sure you want to permanently delete all translation history logs?')) return;
    try {
      await apiClient.clearHistory();
      setPurgeSuccess(true);
      setTimeout(() => setPurgeSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 text-[#E2E8F0]">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center space-x-2 text-[#14B8A6] font-semibold text-xs tracking-wider uppercase">
          <SettingsIcon className="w-4 h-4 text-[#22D3EE]" />
          <span>User & Display Preferences</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Accessibility & Account Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#94A3B8]">
          Customize high-contrast visual display, font scaling, motion preferences, and privacy retention rules.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Visual Accessibility Controls */}
        <div className="p-6 bg-[#0F172A] rounded-3xl border border-[#1E293B] shadow-xl space-y-5">
          <div className="flex items-center space-x-2 border-b pb-3 border-[#1E293B]">
            <Eye className="w-4 h-4 text-[#22D3EE]" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Visual & Motion Controls
            </h2>
          </div>

          <div className="space-y-4">
            {/* High Contrast */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0A0F1C] border border-[#1E293B]">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-white block">High Contrast Mode</span>
                <span className="text-[11px] text-[#94A3B8] block">Increases visual separation and edge sharpness</span>
              </div>
              <button
                type="button"
                onClick={toggleHighContrast}
                className={`w-12 h-6 rounded-full transition-colors relative ${highContrast ? 'bg-[#14B8A6]' : 'bg-[#1E293B]'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${highContrast ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Large Text */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0A0F1C] border border-[#1E293B]">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-white block">Large Text Scaling</span>
                <span className="text-[11px] text-[#94A3B8] block">Enlarges UI font sizes across all workspaces</span>
              </div>
              <button
                type="button"
                onClick={toggleLargeText}
                className={`w-12 h-6 rounded-full transition-colors relative ${largeText ? 'bg-[#14B8A6]' : 'bg-[#1E293B]'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${largeText ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Reduced Motion */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0A0F1C] border border-[#1E293B]">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-white block">Reduced Motion</span>
                <span className="text-[11px] text-[#94A3B8] block">Minimizes animations and transitions</span>
              </div>
              <button
                type="button"
                onClick={toggleReducedMotion}
                className={`w-12 h-6 rounded-full transition-colors relative ${reducedMotion ? 'bg-[#14B8A6]' : 'bg-[#1E293B]'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${reducedMotion ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Account & Privacy Controls */}
        <div className="p-6 bg-[#0F172A] rounded-3xl border border-[#1E293B] shadow-xl space-y-5">
          <div className="flex items-center space-x-2 border-b pb-3 border-[#1E293B]">
            <ShieldCheck className="w-4 h-4 text-[#14B8A6]" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Privacy & Retention Rules
            </h2>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-4 text-xs">
            {isAuthenticated ? (
              <>
                <div>
                  <label className="block font-semibold text-[#CBD5E1] mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#1E293B] bg-[#0A0F1C] text-[#E2E8F0] focus:border-[#14B8A6] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#CBD5E1] mb-1">
                    Default Input Workspace
                  </label>
                  <select
                    value={preferredMode}
                    onChange={(e) => setPreferredMode(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#1E293B] bg-[#0A0F1C] text-[#E2E8F0] focus:border-[#14B8A6] outline-none"
                  >
                    <option value="text">Text-to-Sign</option>
                    <option value="speech">Speech-to-Sign</option>
                    <option value="image">Image-to-Sign</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0A0F1C] border border-[#1E293B]">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-white block">Log Translation History</span>
                    <span className="text-[11px] text-[#94A3B8] block">Saves inputs and glosses to MongoDB Atlas</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={historyEnabled}
                    onChange={(e) => setHistoryEnabled(e.target.checked)}
                    className="w-4 h-4 text-[#14B8A6] rounded border-[#1E293B] bg-[#0A0F1C]"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#14B8A6] to-[#0D9488] hover:from-[#22D3EE] hover:to-[#14B8A6] text-white font-semibold flex items-center space-x-1.5 shadow-md shadow-teal-500/20 transition-all hover:scale-[1.02]"
                  >
                    {savedSuccess ? <Check className="w-3.5 h-3.5" /> : null}
                    <span>{savedSuccess ? 'Saved Preferences' : 'Save Preferences'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePurgeHistory}
                    className="text-red-400 hover:underline flex items-center space-x-1 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{purgeSuccess ? 'Purged!' : 'Purge All History'}</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="p-6 text-center text-[#94A3B8] space-y-2">
                <p>Sign in to configure personal retention schedules and database preferences.</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
