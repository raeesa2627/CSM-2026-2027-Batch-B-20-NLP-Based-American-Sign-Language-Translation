import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Edit3, 
  ExternalLink,
  Filter
} from 'lucide-react';
import { apiClient } from '../services/api';
import { VocabularyItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export const AdminVocabularyPage: React.FC = () => {
  const [vocabList, setVocabList] = useState<VocabularyItem[]>([]);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);

  // New item form state
  const [englishTerm, setEnglishTerm] = useState('');
  const [aslGloss, setAslGloss] = useState('');
  const [category, setCategory] = useState('general');
  const [definition, setDefinition] = useState('');
  const [synonyms, setSynonyms] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('video');

  const { isAdmin, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAdmin) {
      loadAdminVocab();
    } else {
      setIsLoading(false);
    }
  }, [isAdmin]);

  const loadAdminVocab = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.getAdminVocabulary();
      setVocabList(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await apiClient.reviewAdminVocabulary(id, newStatus, 'Reviewed by Administrator');
      setVocabList(prev => prev.map(v => v.id === id ? { ...v, reviewStatus: newStatus as any } : v));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!englishTerm || !aslGloss) return;

    try {
      const synList = synonyms.split(',').map(s => s.trim()).filter(Boolean);
      const created = await apiClient.createAdminVocabulary({
        englishTerm,
        aslGloss,
        category,
        definition,
        synonyms: synList,
        media: {
          type: mediaType,
          url: mediaUrl,
          verified: true
        }
      });
      setVocabList(prev => [created, ...prev]);
      setIsAddingNew(false);
      // Reset form
      setEnglishTerm('');
      setAslGloss('');
      setDefinition('');
      setSynonyms('');
      setMediaUrl('');
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 text-center bg-[#0F172A] rounded-3xl border border-[#1E293B] space-y-4 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
          <Shield className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-[#E2E8F0]">Admin Privileges Required</h2>
        <p className="text-xs text-slate-400">
          The ASL Vocabulary Governance portal is restricted to authorized linguistic reviewers.
        </p>
        <Link
          to="/login"
          className="inline-block px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-[#0A0F1C] rounded-xl text-xs font-bold shadow-lg shadow-teal-500/20 hover:from-teal-400 hover:to-cyan-400 transition-all"
        >
          Sign In as Admin
        </Link>
      </div>
    );
  }

  const filtered = vocabList.filter(item => {
    const matchesStatus = statusFilter === 'all' || item.reviewStatus === statusFilter;
    const matchesSearch = item.englishTerm.toLowerCase().includes(search.toLowerCase()) ||
                          item.aslGloss.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold text-xs tracking-wider uppercase mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Administrator Governance Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#E2E8F0]">
            ASL Vocabulary & Media Review Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Audit catalog terms, approve educational sign references, flag inaccuracies, and manage media licenses.
          </p>
        </div>

        <button
          onClick={() => setIsAddingNew(!isAddingNew)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-[#0A0F1C] font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-teal-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New ASL Term</span>
        </button>
      </div>

      {/* Add New Term Form */}
      {isAddingNew && (
        <form onSubmit={handleCreateEntry} className="p-6 bg-[#0F172A] rounded-3xl border border-[#1E293B] space-y-4 shadow-xl text-xs">
          <h3 className="text-sm font-bold text-[#E2E8F0]">
            Create Verified ASL Vocabulary Record
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-300">English Term *</label>
              <input
                type="text"
                required
                value={englishTerm}
                onChange={e => setEnglishTerm(e.target.value)}
                placeholder="e.g. nurse"
                className="w-full p-2.5 rounded-xl border border-[#1E293B] bg-[#0A0F1C] text-[#E2E8F0] placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-300">ASL Gloss *</label>
              <input
                type="text"
                required
                value={aslGloss}
                onChange={e => setAslGloss(e.target.value)}
                placeholder="e.g. NURSE"
                className="w-full p-2.5 rounded-xl border border-[#1E293B] bg-[#0A0F1C] text-[#E2E8F0] placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-300">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#1E293B] bg-[#0A0F1C] text-[#E2E8F0] focus:outline-none focus:border-teal-500"
              >
                <option value="general">General</option>
                <option value="emergency">Emergency / Medical</option>
                <option value="greetings">Greetings</option>
                <option value="questions">Questions</option>
                <option value="education">Education</option>
                <option value="actions">Actions / Verbs</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-300">Definition / Articulation Description</label>
              <input
                type="text"
                value={definition}
                onChange={e => setDefinition(e.target.value)}
                placeholder="Handshape, movement, and location..."
                className="w-full p-2.5 rounded-xl border border-[#1E293B] bg-[#0A0F1C] text-[#E2E8F0] placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-300">English Synonyms (Comma separated)</label>
              <input
                type="text"
                value={synonyms}
                onChange={e => setSynonyms(e.target.value)}
                placeholder="caregiver, medic, hospital staff"
                className="w-full p-2.5 rounded-xl border border-[#1E293B] bg-[#0A0F1C] text-[#E2E8F0] placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-300">Educational Media Video/Image URL</label>
            <input
              type="url"
              value={mediaUrl}
              onChange={e => setMediaUrl(e.target.value)}
              placeholder="https://assets.aslbridge.org/signs/nurse.mp4"
              className="w-full p-2.5 rounded-xl border border-[#1E293B] bg-[#0A0F1C] text-[#E2E8F0] placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="px-4 py-2 border border-[#1E293B] text-slate-300 hover:bg-[#131D31] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-[#0A0F1C] rounded-xl font-bold shadow-md shadow-teal-500/20 transition-all"
            >
              Save Record
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0F172A] p-3 rounded-2xl border border-[#1E293B]">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by term or gloss..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#1E293B] bg-[#0A0F1C] text-[#E2E8F0] placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">Review Status:</span>
          {['all', 'approved', 'flagged', 'pending'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg capitalize font-medium transition-colors ${
                statusFilter === st 
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-[#0A0F1C] font-bold shadow-sm' 
                  : 'bg-[#131D31] border border-[#1E293B] text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Vocabulary Items Table */}
      <div className="bg-[#0F172A] rounded-2xl border border-[#1E293B] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#131D31] text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">ASL Gloss</th>
                <th className="py-3 px-4">English Term</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Media</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/70">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-[#131D31]/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-teal-400">
                    {item.aslGloss}
                  </td>
                  <td className="py-3 px-4 font-medium text-[#E2E8F0] capitalize">
                    {item.englishTerm}
                  </td>
                  <td className="py-3 px-4 text-slate-400 capitalize">
                    {item.category}
                  </td>
                  <td className="py-3 px-4">
                    {item.media?.url ? (
                      <a
                        href={item.media.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center space-x-1"
                      >
                        <span>{item.media.type}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-500">Fingerspell</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      item.reviewStatus === 'approved'
                        ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/60'
                        : item.reviewStatus === 'flagged'
                        ? 'bg-rose-950/40 text-rose-300 border border-rose-800/60'
                        : 'bg-amber-950/40 text-amber-300 border border-amber-800/60'
                    }`}>
                      {item.reviewStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5">
                    {item.reviewStatus !== 'approved' && (
                      <button
                        onClick={() => handleStatusChange(item.id, 'approved')}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors"
                      >
                        Approve
                      </button>
                    )}
                    {item.reviewStatus !== 'flagged' && (
                      <button
                        onClick={() => handleStatusChange(item.id, 'flagged')}
                        className="px-2.5 py-1 rounded bg-rose-950/40 border border-rose-800/50 text-rose-300 hover:bg-rose-900/50 text-xs transition-colors"
                      >
                        Flag
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
