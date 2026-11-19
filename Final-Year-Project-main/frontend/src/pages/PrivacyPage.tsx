import React from 'react';
import { ShieldCheck, Lock, EyeOff, Trash2, Database, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-semibold text-xs tracking-wider uppercase">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Ethics & Data Governance</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#E2E8F0]">
          Privacy, Security & Data Sovereignty Policy
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          How ASL Bridge AI protects personal communication, handles audio and image inputs, and upholds Deaf community privacy standards.
        </p>
      </div>

      {/* Core Privacy Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] space-y-3 shadow-md hover:border-teal-500/30 transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <EyeOff className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#E2E8F0]">Zero Audio Hoarding</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Spoken microphone audio is processed strictly in-memory during speech recognition. The system does not write raw audio files or voice recordings to disk or external servers.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] space-y-3 shadow-md hover:border-teal-500/30 transition-all">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#E2E8F0]">Ephemeral Image Processing</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Uploaded images for OCR are processed in-memory to extract text. Image files are not retained in persistent object storage or used to train external models.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] space-y-3 shadow-md hover:border-teal-500/30 transition-all">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#E2E8F0]">Opt-In Translation History</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            History logging is optional and configurable per user. You can disable logging at any time in Settings, which prevents new translations from being stored.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] space-y-3 shadow-md hover:border-teal-500/30 transition-all">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <Trash2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#E2E8F0]">Instant Data Purge</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Users have unilateral authority to delete individual translation items or purge their entire history log instantly from both the UI and database.
          </p>
        </div>
      </div>

      {/* Ethical High-Stakes Usage Disclaimer */}
      <div className="p-6 rounded-3xl bg-amber-950/20 border border-amber-800/40 space-y-2 text-xs text-amber-200/90 shadow-lg">
        <h4 className="font-bold flex items-center gap-2 text-sm text-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          Responsible Assistive Technology Notice
        </h4>
        <p className="leading-relaxed text-slate-300">
          ASL Bridge AI is an engineering research platform designed to reduce informal communication barriers. <strong className="text-amber-200">It is never a substitute for qualified human American Sign Language interpreters in legal proceedings, medical diagnosis, mental health therapy, or life-safety situations.</strong> Critical scenarios must always be mediated by RID-certified human ASL interpreters.
        </p>
      </div>
    </div>
  );
};
