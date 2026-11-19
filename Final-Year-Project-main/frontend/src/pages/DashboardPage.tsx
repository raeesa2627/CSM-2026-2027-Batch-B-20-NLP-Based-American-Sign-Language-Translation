import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Mic, 
  Image as ImageIcon, 
  Bookmark, 
  Clock, 
  BarChart2, 
  ShieldCheck, 
  ArrowRight,
  User,
  Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { SavedPhrase, HistoryItem } from '../types';

export const DashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [phrases, setPhrases] = useState<SavedPhrase[]>([]);
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);
  const [systemHealth, setSystemHealth] = useState<string>('Online');

  useEffect(() => {
    if (isAuthenticated) {
      apiClient.getPhrases().then(setPhrases).catch(() => {});
      apiClient.getHistory(1, 5).then(res => setRecentHistory(res.data)).catch(() => {});
    }
  }, [isAuthenticated]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 text-[#E2E8F0]">
      {/* Welcome Banner */}
      <div className="p-6 rounded-3xl bg-[#0F172A] border border-[#1E293B] shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#22D3EE] bg-[#14B8A6]/15 border border-[#14B8A6]/30 px-2.5 py-0.5 rounded-full inline-block">
            Role: {user?.role || 'Guest'}
          </span>
          <h1 className="text-2xl font-extrabold text-white">
            Welcome, {user?.name || 'ASL Bridge User'}
          </h1>
          <p className="text-xs text-[#94A3B8]">
            Multimodal ASL translation platform ready. Preferred mode: <span className="font-semibold capitalize text-[#14B8A6]">{user?.preferredMode || 'Text'}</span>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/settings"
            className="px-3.5 py-2 rounded-xl border border-[#1E293B] bg-[#0A0F1C] text-xs font-semibold text-[#CBD5E1] hover:text-white hover:border-[#14B8A6]/40 flex items-center space-x-1.5 transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-[#14B8A6]" />
            <span>Preferences</span>
          </Link>
          <Link
            to="/text-to-sign"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#14B8A6] to-[#0D9488] hover:from-[#22D3EE] hover:to-[#14B8A6] text-white text-xs font-semibold shadow-md shadow-teal-500/20 flex items-center space-x-1.5 transition-all hover:scale-[1.02]"
          >
            <span>Start Translating</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Quick Launchers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/text-to-sign"
          className="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-[#14B8A6]/60 transition-all space-y-2 group shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-[#0A0F1C] border border-[#1E293B] text-[#14B8A6] flex items-center justify-center group-hover:scale-105 group-hover:text-[#22D3EE] transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">Text-to-Sign</h3>
          <p className="text-xs text-[#94A3B8]">Transform English text into Topic-Comment ASL glosses.</p>
        </Link>

        <Link
          to="/speech-to-sign"
          className="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-[#14B8A6]/60 transition-all space-y-2 group shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-[#0A0F1C] border border-[#1E293B] text-[#14B8A6] flex items-center justify-center group-hover:scale-105 group-hover:text-[#22D3EE] transition-transform">
            <Mic className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">Speech-to-Sign</h3>
          <p className="text-xs text-[#94A3B8]">Live microphone stream with acoustic confidence.</p>
        </Link>

        <Link
          to="/image-to-sign"
          className="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-[#14B8A6]/60 transition-all space-y-2 group shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-[#0A0F1C] border border-[#1E293B] text-[#14B8A6] flex items-center justify-center group-hover:scale-105 group-hover:text-[#22D3EE] transition-transform">
            <ImageIcon className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">Image-to-Sign (OCR)</h3>
          <p className="text-xs text-[#94A3B8]">Upload printed notices and receipts for sign translation.</p>
        </Link>
      </div>

      {/* 2-Column Section: Saved Phrases + Recent History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Saved Quick Phrases */}
        <div className="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B] space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b pb-2.5 border-[#1E293B]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#22D3EE] flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-[#14B8A6]" />
              Emergency & Saved Phrases ({phrases.length})
            </h3>
            <Link to="/phrases" className="text-xs text-[#14B8A6] font-semibold hover:text-[#22D3EE] transition-colors">
              View All
            </Link>
          </div>
          <div className="space-y-2">
            {phrases.slice(0, 4).map(p => (
              <div key={p.id} className="p-3 rounded-xl bg-[#0A0F1C] border border-[#1E293B] text-xs flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white">{p.englishText}</span>
                  <div className="font-mono text-[11px] text-[#22D3EE]">ASL: {p.aslGloss}</div>
                </div>
                <span className="text-[10px] uppercase font-bold text-[#94A3B8] px-2 py-0.5 rounded bg-[#131D31] border border-[#1E293B]">
                  {p.category}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Translation Activity */}
        <div className="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B] space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b pb-2.5 border-[#1E293B]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#22D3EE] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#14B8A6]" />
              Recent Translation Runs
            </h3>
            <Link to="/history" className="text-xs text-[#14B8A6] font-semibold hover:text-[#22D3EE] transition-colors">
              View History
            </Link>
          </div>
          <div className="space-y-2">
            {recentHistory.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#64748B]">
                No recent translation records logged.
              </div>
            ) : (
              recentHistory.map(h => (
                <div key={h.id} className="p-3 rounded-xl bg-[#0A0F1C] border border-[#1E293B] text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                    <span className="uppercase font-semibold text-[#14B8A6]">{h.inputType}</span>
                    <span>{new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="font-medium text-white truncate">&quot;{h.inputText}&quot;</div>
                  <div className="font-mono text-[11px] text-[#22D3EE]">ASL: {h.aslGloss}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
