import React, { useState } from 'react';
import { Flag, X, Check } from 'lucide-react';
import { apiClient } from '../../services/api';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId?: string;
  inputText?: string;
  aslGloss?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  requestId,
  inputText = '',
  aslGloss = ''
}) => {
  const [category, setCategory] = useState<string>('inaccurate_gloss');
  const [comments, setComments] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient.submitFeedback({
        requestId,
        inputText,
        aslGloss,
        issueCategory: category,
        comments
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in text-[#E2E8F0]">
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#94A3B8] hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-[#22D3EE] mb-2">
          <Flag className="w-5 h-5 text-[#14B8A6]" />
          <h3 className="text-base font-bold text-white">
            Report Linguistic or Media Inaccuracy
          </h3>
        </div>
        <p className="text-xs text-[#94A3B8] mb-4">
          Help our research team improve ASL translation fidelity by flagging incorrect glosses or missing vocabulary.
        </p>

        {submitted ? (
          <div className="p-6 text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 mx-auto rounded-full flex items-center justify-center border border-emerald-500/30">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Thank You!</h4>
            <p className="text-xs text-[#94A3B8]">Your feedback has been routed to the ASL Review Queue.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block font-semibold text-[#CBD5E1] mb-1">
                Issue Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#1E293B] bg-[#0A0F1C] text-[#E2E8F0] focus:border-[#14B8A6] outline-none"
              >
                <option value="inaccurate_gloss">Inaccurate ASL Gloss Sequence</option>
                <option value="missing_sign">Missing or Untranslated Sign</option>
                <option value="grammar_error">Grammar / Non-Manual Marker Error</option>
                <option value="inappropriate_media">Broken or Inaccurate Sign Media</option>
                <option value="other">Other Linguistic Feedback</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#CBD5E1] mb-1">
                Linguistic Comments or Suggested Correction
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Describe how the sign or gloss should be corrected..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-[#1E293B] bg-[#0A0F1C] text-[#E2E8F0] placeholder-[#64748B] focus:border-[#14B8A6] outline-none"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-[#0A0F1C] border border-[#1E293B] font-mono text-[11px] text-[#94A3B8]">
              <div>Input: {inputText || 'N/A'}</div>
              <div>Gloss: {aslGloss || 'N/A'}</div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#1E293B] text-[#94A3B8] hover:text-white hover:bg-[#0A0F1C] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#14B8A6] to-[#0D9488] hover:from-[#22D3EE] hover:to-[#14B8A6] text-white font-semibold disabled:opacity-50 shadow-md shadow-teal-500/20 transition-all hover:scale-[1.02]"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
