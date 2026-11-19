import React, { useState, useEffect } from 'react';
import { 
  Bookmark, 
  Plus, 
  Trash2, 
  Star, 
  Play, 
  AlertCircle, 
  ShieldCheck, 
  HeartHandshake, 
  Heart,
  Stethoscope,
  HelpCircle
} from 'lucide-react';
import { apiClient } from '../services/api';
import { SavedPhrase, TranslationResult } from '../types';
import { SignSequenceViewer } from '../components/viewer/SignSequenceViewer';

export const PhrasesPage: React.FC = () => {
  const [phrases, setPhrases] = useState<SavedPhrase[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTranslation, setActiveTranslation] = useState<TranslationResult | null>(null);
  const [isLoadingSigns, setIsLoadingSigns] = useState<boolean>(false);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newEnglishText, setNewEnglishText] = useState<string>('');

  useEffect(() => {
    loadPhrases();
  }, []);

  const loadPhrases = async () => {
    try {
      const data = await apiClient.getPhrases();
      setPhrases(data);
    } catch (e) {
      console.warn('Could not load phrases:', e);
    }
  };

  const handlePlayPhrase = async (phrase: SavedPhrase) => {
    setIsLoadingSigns(true);
    try {
      const res = await apiClient.translateText(phrase.englishText, 'rag_grounded');
      setActiveTranslation(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSigns(false);
    }
  };

  const handleAddNewPhrase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnglishText.trim()) return;

    try {
      // First translate to generate ASL gloss
      const res = await apiClient.translateText(newEnglishText.trim(), 'rag_grounded');
      const created = await apiClient.createPhrase({
        englishText: res.original_text,
        aslGloss: res.asl_gloss,
        category: 'custom',
        isFavorite: true
      });
      setPhrases(prev => [created, ...prev]);
      setNewEnglishText('');
      setIsAddingNew(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePhrase = async (id: string) => {
    try {
      await apiClient.deletePhrase(id);
      setPhrases(prev => prev.filter(p => p.id !== id));
      if (activeTranslation?.original_text === phrases.find(p => p.id === id)?.englishText) {
        setActiveTranslation(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const categories = [
    { id: 'all', label: 'All Phrases' },
    { id: 'assistance', label: 'Assistance' },
    { id: 'medical', label: 'Medical / Emergency' },
    { id: 'questions', label: 'Inquiries' },
    { id: 'greetings', label: 'Greetings' },
    { id: 'custom', label: 'My Saved' }
  ];

  const filteredPhrases = selectedCategory === 'all'
    ? phrases
    : phrases.filter(p => p.category === selectedCategory);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 text-[#E2E8F0]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#14B8A6] font-semibold text-xs tracking-wider uppercase">
            <Bookmark className="w-4 h-4 text-[#22D3EE]" />
            <span>Emergency & Quick Library</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Emergency & Offline Quick Phrases
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8]">
            Pre-verified high-frequency accessibility phrases available instantly for critical medical, assistance, and daily interactions.
          </p>
        </div>

        <button
          onClick={() => setIsAddingNew(!isAddingNew)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#14B8A6] to-[#0D9488] hover:from-[#22D3EE] hover:to-[#14B8A6] text-white font-semibold text-xs flex items-center space-x-1.5 shadow-md shadow-teal-500/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Phrase</span>
        </button>
      </div>

      {/* Emergency Assurance Banner */}
      <div className="p-4 rounded-2xl bg-[#0F172A] border border-[#1E293B] text-xs text-[#94A3B8] flex items-start space-x-3 shadow-lg">
        <ShieldCheck className="w-5 h-5 text-[#14B8A6] shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold text-white block">Independent Offline & Emergency Availability:</strong>
          These essential phrases are stored locally and never depend on external paid APIs or network latency.
        </div>
      </div>

      {/* Add Custom Phrase Drawer */}
      {isAddingNew && (
        <form onSubmit={handleAddNewPhrase} className="p-5 rounded-2xl bg-[#0F172A] border border-[#14B8A6]/40 space-y-3 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#22D3EE]">
            Add New Quick Phrase
          </h3>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newEnglishText}
              onChange={(e) => setNewEnglishText(e.target.value)}
              placeholder="Enter English phrase (e.g., 'Where is the exit?')..."
              className="flex-1 p-2.5 rounded-xl border border-[#1E293B] bg-[#0A0F1C] text-[#E2E8F0] placeholder-[#64748B] text-xs font-medium focus:border-[#14B8A6] outline-none"
            />
            <button
              type="submit"
              disabled={!newEnglishText.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#14B8A6] to-[#0D9488] hover:from-[#22D3EE] hover:to-[#14B8A6] text-white font-semibold text-xs disabled:opacity-50 shadow-md shadow-teal-500/20 transition-all hover:scale-[1.02]"
            >
              Translate & Save
            </button>
          </div>
        </form>
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-xl font-medium transition-all ${
              selectedCategory === cat.id
                ? 'bg-[#14B8A6] text-[#0A0F1C] font-bold shadow-md shadow-teal-500/20'
                : 'bg-[#0F172A] border border-[#1E293B] text-[#94A3B8] hover:text-white hover:border-[#14B8A6]/40'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main Grid: Phrase Cards + Active Sign Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Phrases List (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          {filteredPhrases.length === 0 ? (
            <div className="p-8 text-center bg-[#0F172A] rounded-2xl border border-[#1E293B] text-xs text-[#64748B]">
              No phrases found in this category.
            </div>
          ) : (
            filteredPhrases.map((phrase) => {
              const isPlaying = activeTranslation?.original_text === phrase.englishText;
              return (
                <div
                  key={phrase.id}
                  className={`p-4 rounded-2xl bg-[#0F172A] border transition-all flex items-center justify-between gap-4 shadow-lg ${
                    isPlaying
                      ? 'border-[#14B8A6] ring-2 ring-teal-400/30'
                      : 'border-[#1E293B] hover:border-[#14B8A6]/50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#0A0F1C] text-[#22D3EE] border border-[#1E293B]">
                        {phrase.category}
                      </span>
                      {phrase.isFavorite && (
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-white">
                      {phrase.englishText}
                    </h4>
                    <p className="font-mono text-xs text-[#22D3EE]">
                      ASL: {phrase.aslGloss}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handlePlayPhrase(phrase)}
                      disabled={isLoadingSigns}
                      title="Play ASL Signs"
                      className="p-2.5 rounded-xl bg-[#14B8A6]/15 hover:bg-[#14B8A6] text-[#22D3EE] hover:text-[#0A0F1C] border border-[#14B8A6]/30 transition-all hover:scale-105"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                    {phrase.userId !== 'user-demo-001' && (
                      <button
                        onClick={() => handleDeletePhrase(phrase.id)}
                        title="Delete Phrase"
                        className="p-2.5 rounded-xl text-[#64748B] hover:text-red-400 hover:bg-red-950/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Sign Display (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {activeTranslation ? (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#22D3EE]">
                Playing Sign Sequence
              </h3>
              <SignSequenceViewer
                key={`phrase_${activeTranslation.request_id || activeTranslation.original_text}`}
                signs={activeTranslation.signs}
                aslGloss={activeTranslation.asl_gloss}
                originalText={activeTranslation.original_text}
                moduleId="phrase"
              />
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-[#0F172A] border border-dashed border-[#1E293B] text-[#94A3B8] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#14B8A6]/10 border border-[#14B8A6]/20 flex items-center justify-center mx-auto text-[#22D3EE]">
                <Play className="w-6 h-6 fill-current" />
              </div>
              <h4 className="text-sm font-semibold text-white">Select a Phrase to Sign</h4>
              <p className="text-xs max-w-sm mx-auto text-[#64748B]">
                Click the play button on any quick phrase on the left to render verified sign media and step through each sign.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
