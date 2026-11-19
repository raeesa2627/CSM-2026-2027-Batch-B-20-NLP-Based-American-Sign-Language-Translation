import React from 'react';
import { ShieldCheck, AlertCircle, Sparkles, HelpCircle, FileSearch, Mic, Image } from 'lucide-react';
import { ConfidenceMetrics } from '../../types';

interface ConfidenceCardProps {
  confidence: ConfidenceMetrics;
  processingMethod?: string;
  durationMs?: number;
  retrievalEvidence?: string[];
}

export const ConfidenceCard: React.FC<ConfidenceCardProps> = ({
  confidence,
  processingMethod,
  durationMs,
  retrievalEvidence
}) => {
  const getBadgeColor = (label: string) => {
    if (label.includes('Verified')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (label.includes('Partial')) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    return 'bg-[#14B8A6]/15 text-[#22D3EE] border-[#14B8A6]/30';
  };

  return (
    <div className="bg-[#0F172A] rounded-2xl border border-[#1E293B] p-5 shadow-lg space-y-4">
      {/* Header and Classification Label */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-[#1E293B]">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#22D3EE]">
            AI Transparency & Confidence Diagnostics
          </h4>
          <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border mt-1.5 ${getBadgeColor(confidence.overall_label)}`}>
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            {confidence.overall_label}
          </span>
        </div>
        {durationMs !== undefined && (
          <span className="text-xs text-[#94A3B8] font-mono bg-[#0A0F1C] px-2.5 py-1 rounded-lg border border-[#1E293B]">
            Latency: {durationMs}ms
          </span>
        )}
      </div>

      {/* Disaggregated Quality Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Vocabulary Coverage */}
        <div className="p-3.5 rounded-xl bg-[#0A0F1C] border border-[#1E293B]">
          <div className="text-[11px] text-[#94A3B8] font-medium">Vocabulary Coverage</div>
          <div className="text-lg font-bold text-white mt-0.5">
            {Math.round(confidence.vocabulary_coverage * 100)}%
          </div>
          <div className="text-[10px] text-[#64748B] mt-0.5">Verified sign assets</div>
        </div>

        {/* Model Alignment Confidence */}
        <div className="p-3.5 rounded-xl bg-[#0A0F1C] border border-[#1E293B]">
          <div className="text-[11px] text-[#94A3B8] font-medium">Syntactic Alignment</div>
          <div className="text-lg font-bold text-white mt-0.5">
            {confidence.model_confidence ? `${Math.round(confidence.model_confidence * 100)}%` : 'Rule Grounded'}
          </div>
          <div className="text-[10px] text-[#64748B] mt-0.5">Grammar consistency</div>
        </div>

        {/* Retrieval Relevance */}
        <div className="p-3.5 rounded-xl bg-[#0A0F1C] border border-[#1E293B]">
          <div className="text-[11px] text-[#94A3B8] font-medium">RAG Relevance</div>
          <div className="text-lg font-bold text-white mt-0.5">
            {confidence.retrieval_relevance ? `${Math.round(confidence.retrieval_relevance * 100)}%` : 'Exact Lookup'}
          </div>
          <div className="text-[10px] text-[#64748B] mt-0.5">Vector similarity</div>
        </div>

        {/* Speech Confidence (if provided) */}
        {confidence.speech_confidence !== null && confidence.speech_confidence !== undefined && (
          <div className="p-3.5 rounded-xl bg-[#0A0F1C] border border-[#1E293B]">
            <div className="text-[11px] text-[#94A3B8] font-medium flex items-center gap-1">
              <Mic className="w-3 h-3 text-[#14B8A6]" /> Speech Audio
            </div>
            <div className="text-lg font-bold text-white mt-0.5">
              {Math.round(confidence.speech_confidence * 100)}%
            </div>
            <div className="text-[10px] text-[#64748B] mt-0.5">Acoustic clarity</div>
          </div>
        )}

        {/* OCR Quality (if provided) */}
        {confidence.ocr_quality !== null && confidence.ocr_quality !== undefined && (
          <div className="p-3.5 rounded-xl bg-[#0A0F1C] border border-[#1E293B]">
            <div className="text-[11px] text-[#94A3B8] font-medium flex items-center gap-1">
              <Image className="w-3 h-3 text-[#22D3EE]" /> OCR Extraction
            </div>
            <div className="text-lg font-bold text-white mt-0.5">
              {Math.round(confidence.ocr_quality * 100)}%
            </div>
            <div className="text-[10px] text-[#64748B] mt-0.5">Character confidence</div>
          </div>
        )}
      </div>

      {/* Clarification prompt if ambiguous */}
      {confidence.clarification_needed && confidence.clarification_prompt && (
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800 text-xs text-amber-300 flex items-start space-x-2">
          <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <strong className="font-semibold block">Clarification Suggested:</strong>
            {confidence.clarification_prompt}
          </div>
        </div>
      )}

      {/* RAG Evidence Provenance */}
      {retrievalEvidence && retrievalEvidence.length > 0 && (
        <div className="pt-2">
          <div className="text-[11px] font-semibold text-[#94A3B8] mb-1 flex items-center gap-1">
            <FileSearch className="w-3 h-3 text-[#14B8A6]" /> Grounded Knowledge Evidence IDs:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {retrievalEvidence.map((id) => (
              <span
                key={id}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0A0F1C] text-[#22D3EE] border border-[#1E293B]"
              >
                {id}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
