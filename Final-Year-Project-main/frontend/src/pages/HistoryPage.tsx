import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Trash2, 
  Search, 
  Sparkles, 
  Mic, 
  Image as ImageIcon, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { apiClient } from '../services/api';
import { HistoryItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadHistory();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.getHistory(1, 50);
      setHistory(res.data);
    } catch (e) {
      console.warn('Could not load history:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await apiClient.deleteHistoryItem(id);
      setHistory(prev => prev.filter(h => h.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to permanently purge all your translation history?')) return;
    try {
      await apiClient.clearHistory();
      setHistory([]);
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = history.filter(h =>
    h.inputText.toLowerCase().includes(search.toLowerCase()) ||
    h.aslGloss.toLowerCase().includes(search.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 text-center bg-[#0F172A] rounded-3xl border border-[#1E293B] space-y-4 shadow-2xl text-[#E2E8F0]">
        <div className="w-12 h-12 rounded-2xl bg-[#14B8A6]/10 border border-[#14B8A6]/20 flex items-center justify-center mx-auto text-[#22D3EE]">
          <Clock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Translation History</h2>
        <p className="text-xs text-[#94A3B8]">
          Sign in to view, search, and manage your past multimodal translations with complete privacy controls.
        </p>
        <Link
          to="/login"
          className="inline-block px-6 py-2.5 bg-gradient-to-r from-[#14B8A6] to-[#0D9488] hover:from-[#22D3EE] hover:to-[#14B8A6] text-white rounded-xl text-xs font-semibold shadow-md shadow-teal-500/20 transition-all hover:scale-[1.02]"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 text-[#E2E8F0]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#14B8A6] font-semibold text-xs tracking-wider uppercase">
            <Clock className="w-4 h-4 text-[#22D3EE]" />
            <span>Audit & Activity Log</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Translation History
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8]">
            View your translation logs persisted securely in MongoDB Atlas. You retain full control to delete individual entries or purge all records.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-4 py-2 rounded-xl border border-red-500/30 bg-red-950/20 text-red-300 hover:bg-red-950/40 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge All History</span>
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by input text or generated ASL gloss..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#1E293B] bg-[#0F172A] text-[#E2E8F0] placeholder-[#64748B] text-xs font-medium focus:border-[#14B8A6] outline-none"
        />
      </div>

      {/* History Items List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[#94A3B8]">Loading history logs from MongoDB Atlas...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#0F172A] border border-dashed border-[#1E293B] text-[#94A3B8] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#14B8A6]/10 border border-[#14B8A6]/20 flex items-center justify-center mx-auto text-[#22D3EE]">
              <Clock className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-white">No History Records Found</h4>
            <p className="text-xs text-[#64748B]">Your translations will appear here once saved.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-[#0F172A] border border-[#1E293B] flex items-center justify-between gap-4 shadow-lg hover:border-[#14B8A6]/40 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-[10px] text-[#64748B]">
                  <span className="flex items-center font-semibold text-[#14B8A6] uppercase">
                    {item.inputType === 'speech' ? (
                      <Mic className="w-3 h-3 mr-1" />
                    ) : item.inputType === 'image' ? (
                      <ImageIcon className="w-3 h-3 mr-1" />
                    ) : (
                      <Sparkles className="w-3 h-3 mr-1" />
                    )}
                    {item.inputType}
                  </span>
                  <span>• {new Date(item.createdAt).toLocaleString()}</span>
                  <span>• Coverage: {Math.round(item.coverage * 100)}%</span>
                  <span>• {item.durationMs}ms</span>
                </div>
                <h4 className="text-xs sm:text-sm font-semibold text-white">
                  &quot;{item.inputText}&quot;
                </h4>
                <div className="font-mono text-xs text-[#22D3EE]">
                  ASL: {item.aslGloss}
                </div>
              </div>

              <button
                onClick={() => handleDeleteItem(item.id)}
                title="Delete item"
                className="p-2 text-[#64748B] hover:text-red-400 rounded-lg hover:bg-red-950/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
