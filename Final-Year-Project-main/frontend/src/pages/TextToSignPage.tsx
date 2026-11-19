import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Sparkles, 
  Trash2, 
  Send, 
  Bookmark, 
  Check, 
  Layers, 
  Info,
  Clock,
  ArrowRight
} from 'lucide-react';
import { apiClient } from '../services/api';
import { TranslationResult } from '../types';
import { SignSequenceViewer } from '../components/viewer/SignSequenceViewer';
import { ConfidenceCard } from '../components/viewer/ConfidenceCard';
import { FeedbackModal } from '../components/feedback/FeedbackModal';
import { motion } from 'framer-motion';
import { VERIFIED_EXAMPLES } from '../data/verifiedPhrases';
import { useTranslationWorkspace } from '../context/TranslationWorkspaceContext';

export const TextToSignPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const {
    inputText,
    strategy,
    translationResult,
    currentSignIndex,
    setInputText,
    setStrategy,
    setTranslation,
    setSignIndex,
  } = useTranslationWorkspace('text');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPhraseSuccess, setSavedPhraseSuccess] = useState<boolean>(false);
  const [feedbackOpen, setFeedbackOpen] = useState<boolean>(false);

  // Auto-load sample phrase from URL query if provided
  useEffect(() => {
    const sample = searchParams.get('sample');
    if (sample && sample.trim()) {
      setInputText(sample.trim());
      handleTranslate(sample.trim());
    }
  }, [searchParams]);

  const handleTranslate = async (textToRun?: string) => {
    const text = textToRun || inputText;
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await apiClient.translateText(text.trim(), strategy);
      setTranslation(res);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect to translation pipeline.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToPhrases = async () => {
    if (!translationResult) return;
    try {
      await apiClient.createPhrase({
        englishText: translationResult.original_text,
        aslGloss: translationResult.asl_gloss,
        category: 'custom',
        isFavorite: true
      });
      setSavedPhraseSuccess(true);
      setTimeout(() => setSavedPhraseSuccess(false), 2000);
    } catch (err) {
      // Non-blocking if guest
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 text-[#E2E8F0]">
      {/* Workspace Header */}
      <div className="space-y-1">
        <div className="flex items-center space-x-2 text-[#14B8A6] font-semibold text-xs tracking-wider uppercase">
          <Sparkles className="w-4 h-4 text-[#22D3EE]" />
          <span>Core Feature A</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Text-to-Sign AI Workspace
        </h1>
        <p className="text-xs sm:text-sm text-[#94A3B8]">
          Transform English prose into syntactically restructured ASL glosses aligned with verified educational sign media.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Input Pane (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0F172A] rounded-2xl border border-[#1E293B] p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="english-input" className="text-xs font-bold uppercase tracking-wider text-[#CBD5E1]">
                English Input Text
              </label>
              <span className="text-xs text-[#64748B]">
                {inputText.length}/1000 characters
              </span>
            </div>

            <textarea
              id="english-input"
              rows={4}
              maxLength={1000}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type English sentences here..."
              className="w-full p-3.5 rounded-xl border border-[#1E293B] bg-[#0A0F1C] text-[#E2E8F0] placeholder-[#64748B] text-sm focus:border-[#14B8A6] focus:ring-1 focus:ring-[#14B8A6] outline-none transition-colors"
            />

            {/* Translation Strategy Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#CBD5E1] flex items-center justify-between">
                <span>Translation Pipeline Strategy:</span>
                <span className="text-[10px] text-[#22D3EE] font-bold uppercase">
                  {strategy === 'rag_grounded' ? 'Research System C' : strategy === 'rule_nlp' ? 'Baseline B' : 'Baseline A'}
                </span>
              </label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#1E293B] bg-[#0A0F1C] text-[#E2E8F0] text-xs font-medium focus:border-[#14B8A6] outline-none"
              >
                <option value="rag_grounded">System C: Context-Aware NLP + RAG Grounding (Recommended)</option>
                <option value="rule_nlp">Baseline B: Context-Aware Rule NLP (No RAG)</option>
                <option value="baseline_lexical">Baseline A: Word-to-Sign Dictionary Lookup</option>
              </select>
            </div>

            {/* Controls Toolbar */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setInputText('')}
                className="text-xs flex items-center space-x-1 text-[#64748B] hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>

              <button
                type="button"
                onClick={() => handleTranslate()}
                disabled={isLoading || !inputText.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#14B8A6] to-[#0D9488] hover:from-[#22D3EE] hover:to-[#14B8A6] disabled:opacity-50 text-white font-semibold text-xs flex items-center space-x-2 shadow-md shadow-teal-500/20 transition-all hover:scale-[1.02]"
              >
                {isLoading ? (
                  <span>Processing NLP...</span>
                ) : (
                  <>
                    <span>Translate to ASL</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Approved Example Sentences (30) */}
          <div className="p-4 rounded-2xl bg-[#0F172A] border border-[#1E293B] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#14B8A6]" />
                <span>Approved Example Phrases (30)</span>
              </h3>
              <span className="text-[10px] text-teal-400 font-mono font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20">
                100% Verified
              </span>
            </div>
            <p className="text-[11px] text-[#94A3B8]">
              Select any sentence to run immediate ASL translation:
            </p>
            <div className="max-h-80 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
              {VERIFIED_EXAMPLES.map((example, idx) => {
                const isCurrent = inputText.trim() === example.text;
                return (
                  <button
                    key={example.id}
                    onClick={() => {
                      setInputText(example.text);
                      handleTranslate(example.text);
                    }}
                    className={`w-full text-left text-xs p-2.5 rounded-xl border transition-all flex items-center justify-between group ${
                      isCurrent
                        ? 'bg-teal-950/40 border-[#14B8A6] text-white shadow-sm ring-1 ring-[#14B8A6]/40'
                        : 'bg-[#0A0F1C] hover:border-[#14B8A6]/50 border-[#1E293B] text-[#CBD5E1] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isCurrent ? 'bg-[#14B8A6] text-[#0A0F1C] font-bold' : 'bg-[#1E293B] text-[#94A3B8]'}`}>
                        {idx + 1}
                      </span>
                      <span className="truncate font-medium">{example.text}</span>
                    </div>
                    <ArrowRight className={`w-3.5 h-3.5 shrink-0 ml-2 transition-transform ${isCurrent ? 'text-teal-400 translate-x-0.5' : 'text-[#64748B] group-hover:text-[#22D3EE]'}`} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Output Pane (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs">
              {error}
            </div>
          )}

          {translationResult ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] as const }}
              className="space-y-6"
            >
              {/* Media Sequence Viewer */}
              <SignSequenceViewer
                key={`text_${translationResult.request_id || translationResult.original_text}`}
                signs={translationResult.signs}
                aslGloss={translationResult.asl_gloss}
                originalText={translationResult.original_text}
                currentIndex={currentSignIndex}
                onIndexChange={setSignIndex}
                moduleId="text"
                onRequestFeedback={() => setFeedbackOpen(true)}
              />

              {/* Linguistic Decomposition Card */}
              <div className="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B] space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b pb-2.5 border-[#1E293B]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#22D3EE]">
                    Linguistic Pipeline Breakdown
                  </h4>
                  <button
                    onClick={handleSaveToPhrases}
                    className="text-xs flex items-center space-x-1.5 text-[#14B8A6] hover:text-[#22D3EE] font-semibold transition-colors"
                  >
                    {savedPhraseSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Bookmark className="w-3.5 h-3.5" />}
                    <span>{savedPhraseSuccess ? 'Saved!' : 'Save Phrase'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#64748B] font-medium block">Normalized English:</span>
                    <span className="text-[#E2E8F0] font-mono">
                      {translationResult.normalized_text}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] font-medium block">Extracted Keywords:</span>
                    <span className="text-[#E2E8F0]">
                      {translationResult.keywords.join(', ') || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] font-medium block">Processing Method:</span>
                    <span className="text-[#14B8A6] font-semibold">
                      {translationResult.processing_method}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] font-medium block">Missing / Unsupported Terms:</span>
                    <span className="text-amber-400 font-medium">
                      {translationResult.missing_vocabulary.length > 0
                        ? translationResult.missing_vocabulary.join(', ')
                        : 'None (Full catalog coverage)'}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-[#64748B] italic pt-1 border-t border-[#1E293B]">
                  Notice: {translationResult.limitations_notice}
                </div>
              </div>

              {/* Confidence Diagnostics Card */}
              <ConfidenceCard
                confidence={translationResult.confidence}
                processingMethod={translationResult.processing_method}
                durationMs={translationResult.duration_ms}
                retrievalEvidence={translationResult.retrieval_evidence}
              />
            </motion.div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-[#0F172A] border border-dashed border-[#1E293B] text-[#94A3B8] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#14B8A6]/10 border border-[#14B8A6]/20 flex items-center justify-center mx-auto text-[#22D3EE]">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-white">Ready to Translate</h4>
              <p className="text-xs max-w-sm mx-auto text-[#64748B]">
                Enter an English phrase or select an example above to generate an ASL gloss sequence and sign media playback.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        requestId={translationResult?.request_id}
        inputText={translationResult?.original_text}
        aslGloss={translationResult?.asl_gloss}
      />
    </div>
  );
};
