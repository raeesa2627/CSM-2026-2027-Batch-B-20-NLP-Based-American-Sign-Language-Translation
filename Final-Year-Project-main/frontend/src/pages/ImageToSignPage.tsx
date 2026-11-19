import React, { useState, useRef } from 'react';
import { 
  Image as ImageIcon, 
  UploadCloud, 
  Trash2, 
  Send, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  ShieldCheck,
  Eye
} from 'lucide-react';
import { apiClient } from '../services/api';
import { TranslationResult } from '../types';
import { SignSequenceViewer } from '../components/viewer/SignSequenceViewer';
import { ConfidenceCard } from '../components/viewer/ConfidenceCard';
import { FeedbackModal } from '../components/feedback/FeedbackModal';

export const ImageToSignPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [ocrEngineNotice, setOcrEngineNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = (file: File) => {
    setError(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError(`Unsupported file type: ${file.type}. Please upload JPG, PNG, or WebP.`);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit.');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setExtractedText('');
    setTranslationResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleOCRAndTranslate = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await apiClient.translateImage(selectedFile, 'rag_grounded');
      if (res.ocr_result) {
        setExtractedText(res.ocr_result.extracted_text || '');
        if (res.ocr_result.notice) {
          setOcrEngineNotice(res.ocr_result.notice);
        }
      }
      if (res.translation) {
        setTranslationResult(res.translation);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to extract text or translate image.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetranslateEditedText = async () => {
    if (!extractedText.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await apiClient.translateText(extractedText.trim(), 'rag_grounded');
      setTranslationResult(res);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Translation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 text-[#E2E8F0]">
      {/* Workspace Header */}
      <div className="space-y-1">
        <div className="flex items-center space-x-2 text-[#14B8A6] font-semibold text-xs tracking-wider uppercase">
          <ImageIcon className="w-4 h-4 text-[#22D3EE]" />
          <span>Core Feature C</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Image-to-Sign AI (OCR) Workspace
        </h1>
        <p className="text-xs sm:text-sm text-[#94A3B8]">
          Upload notices, documents, or signs containing English text to extract and synthesize verified ASL representations.
        </p>
      </div>

      {/* Scope Transparency Banner */}
      <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[#1E293B] text-xs text-[#94A3B8] flex items-start space-x-2.5">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#22D3EE]" />
        <span>
          <strong className="text-white">Linguistic Scope:</strong> This module extracts printed or handwritten text embedded within images (OCR). It does not classify human signers or bodily gestures from static photographs.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Upload & OCR Pane (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0F172A] rounded-2xl border border-[#1E293B] p-5 shadow-xl space-y-4">
            {/* Drag & Drop Zone */}
            {!previewUrl ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#1E293B] hover:border-[#14B8A6] rounded-2xl p-8 text-center cursor-pointer transition-all bg-[#0A0F1C] hover:bg-[#0A0F1C]/80 space-y-3 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#14B8A6]/10 border border-[#14B8A6]/20 text-[#22D3EE] mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white">
                    Click to browse or drag & drop image
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    Supports JPG, PNG, WebP (Up to 10MB)
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-[#1E293B] bg-[#0A0F1C] max-h-56 flex items-center justify-center">
                  <img
                    src={previewUrl}
                    alt="Uploaded preview"
                    className="max-h-56 w-full object-contain"
                  />
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      setExtractedText('');
                      setTranslationResult(null);
                    }}
                    title="Remove Image"
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-red-600 text-white transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-[11px] text-[#94A3B8] flex items-center justify-between">
                  <span className="truncate max-w-[200px]">{selectedFile?.name}</span>
                  <span>{selectedFile ? `${Math.round(selectedFile.size / 1024)} KB` : ''}</span>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            {/* OCR Extract & Translate Button */}
            {previewUrl && !extractedText && (
              <button
                type="button"
                onClick={handleOCRAndTranslate}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#14B8A6] to-[#0D9488] hover:from-[#22D3EE] hover:to-[#14B8A6] text-white font-semibold text-xs shadow-md shadow-teal-500/20 flex items-center justify-center space-x-2 transition-all hover:scale-[1.02]"
              >
                {isLoading ? <span>Running OCR Engine...</span> : <span>Extract Text & Translate to Signs</span>}
              </button>
            )}

            {/* Editable OCR Result Pane */}
            {extractedText && (
              <div className="space-y-2 pt-2 border-t border-[#1E293B]">
                <label className="text-xs font-bold uppercase tracking-wider text-[#CBD5E1] flex items-center justify-between">
                  <span>Extracted OCR Text (Editable)</span>
                  <span className="text-[10px] text-[#22D3EE] font-medium">Verify before translating</span>
                </label>
                <textarea
                  rows={3}
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#1E293B] bg-[#0A0F1C] text-[#E2E8F0] text-xs font-medium focus:border-[#14B8A6] outline-none"
                />
                <button
                  type="button"
                  onClick={handleRetranslateEditedText}
                  disabled={isLoading || !extractedText.trim()}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#14B8A6] to-[#0D9488] hover:from-[#22D3EE] hover:to-[#14B8A6] text-white font-semibold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-teal-500/20 transition-all hover:scale-[1.02]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Update ASL Translation</span>
                </button>
              </div>
            )}

            {ocrEngineNotice && (
              <p className="text-[10px] text-[#64748B] italic">
                {ocrEngineNotice}
              </p>
            )}
          </div>
        </div>

        {/* Right Output Pane (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Low-confidence / Artifact Warning Banner */}
          {translationResult && (translationResult.confidence?.clarification_needed || (translationResult.confidence?.ocr_quality !== null && (translationResult.confidence?.ocr_quality ?? 1) < 0.50)) && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800 text-xs text-amber-300 flex items-start space-x-2 animate-fade-in shadow-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div className="space-y-0.5">
                <strong className="block font-semibold">Low-Confidence OCR Result (Review Recommended):</strong>
                <span>
                  {translationResult.confidence?.clarification_prompt ||
                    `The extracted text '${extractedText}' may be an image, speech bubble, or border artifact. Please verify or correct the text in the editor on the left before reviewing ASL signs.`}
                </span>
              </div>
            </div>
          )}

          {translationResult ? (
            <div className="space-y-6 animate-fade-in">
              <SignSequenceViewer
                key={`image_${translationResult.request_id || translationResult.original_text}`}
                signs={translationResult.signs}
                aslGloss={translationResult.asl_gloss}
                originalText={translationResult.original_text}
                moduleId="image"
                onRequestFeedback={() => setFeedbackOpen(true)}
              />

              <ConfidenceCard
                confidence={translationResult.confidence}
                processingMethod={translationResult.processing_method}
                durationMs={translationResult.duration_ms}
                retrievalEvidence={translationResult.retrieval_evidence}
              />
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-[#0F172A] border border-dashed border-[#1E293B] text-[#94A3B8] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#14B8A6]/10 border border-[#14B8A6]/20 flex items-center justify-center mx-auto text-[#22D3EE]">
                <ImageIcon className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-white">Image Pipeline Ready</h4>
              <p className="text-xs max-w-sm mx-auto text-[#64748B]">
                Upload an image on the left to extract textual information and render an ASL sign sequence.
              </p>
            </div>
          )}
        </div>
      </div>

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
