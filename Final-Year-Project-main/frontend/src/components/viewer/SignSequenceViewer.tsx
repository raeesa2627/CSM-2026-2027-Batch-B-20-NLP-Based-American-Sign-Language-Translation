import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Copy, 
  Check, 
  ShieldCheck, 
  AlertTriangle, 
  Info, 
  Maximize2, 
  Volume2, 
  VolumeX,
  FastForward,
  Flag
} from 'lucide-react';
import { SignMedia } from '../../types';

interface SignSequenceViewerProps {
  signs: SignMedia[];
  aslGloss: string;
  originalText?: string;
  onRequestFeedback?: () => void;
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
  moduleId?: string;
}

export const SignSequenceViewer: React.FC<SignSequenceViewerProps> = ({
  signs,
  aslGloss,
  originalText,
  onRequestFeedback,
  currentIndex: externalIndex,
  onIndexChange,
  moduleId,
}) => {
  const [internalIndex, setInternalIndex] = useState<number>(0);
  const isControlled = typeof externalIndex === 'number' && typeof onIndexChange === 'function';
  const rawIndex = isControlled ? externalIndex : internalIndex;
  const currentIndex = (signs && signs.length > 0) ? Math.max(0, Math.min(rawIndex, signs.length - 1)) : 0;

  const updateIndex = (newIndex: number | ((prev: number) => number)) => {
    const computed = typeof newIndex === 'function' ? newIndex(currentIndex) : newIndex;
    const bounded = (signs && signs.length > 0) ? Math.max(0, Math.min(computed, signs.length - 1)) : 0;
    if (isControlled) {
      onIndexChange(bounded);
    } else {
      setInternalIndex(bounded);
    }
  };

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [copiedGloss, setCopiedGloss] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [selectedSignForDetails, setSelectedSignForDetails] = useState<SignMedia | null>(null);
  const [failedMedia, setFailedMedia] = useState<Record<number, boolean>>({});
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const [fingerspellMode, setFingerspellMode] = useState<Record<number, boolean>>({});

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Reset sequence index, playback, and failed media states when signs change
  useEffect(() => {
    updateIndex(0);
    setIsPlaying(false);
    setFailedMedia({});
    setFailedImages({});
    setFingerspellMode({});
  }, [signs]);

  const activeSign = signs[currentIndex] || null;
  const isDirectFingerspelled = Boolean(activeSign?.is_fingerspelled || activeSign?.gloss?.startsWith('FS:'));
  const isFingerspelled = isDirectFingerspelled || Boolean(fingerspellMode[currentIndex]);
  const isVideoCandidate = Boolean(activeSign?.media_url && activeSign.media_type === 'video' && activeSign.verified && !fingerspellMode[currentIndex]);
  const isVideoFailed = Boolean(failedMedia[currentIndex]);
  const isVideoActive = isVideoCandidate && !isVideoFailed;
  const isImageCandidate = Boolean(activeSign?.fallback_image && !failedImages[currentIndex]);

  const handleVideoError = (idx: number) => {
    setFailedMedia(prev => ({ ...prev, [idx]: true }));
  };

  const handleImageError = (idx: number) => {
    setFailedImages(prev => ({ ...prev, [idx]: true }));
  };

  // Auto-play next sign when video ends during sequence playback
  const handleVideoEnded = () => {
    if (isPlaying) {
      if (currentIndex < signs.length - 1) {
        updateIndex(prev => prev + 1);
      } else {
        setIsPlaying(false); // Finished sequence
      }
    }
  };

  // Timer-based fallback auto-advancement for static fallback cards, fingerspelling, or failed video media
  useEffect(() => {
    let timer: any;
    if (isPlaying && activeSign && !isVideoActive) {
      timer = setTimeout(() => {
        if (currentIndex < signs.length - 1) {
          updateIndex(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 1800 / playbackSpeed);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentIndex, activeSign, isVideoActive, playbackSpeed, signs.length]);

  // Adjust video playback speed and play/pause state
  useEffect(() => {
    if (videoRef.current && isVideoActive) {
      videoRef.current.playbackRate = playbackSpeed;
      if (isPlaying) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Auto-play prevented or interrupted
          });
        }
      } else {
        videoRef.current.pause();
      }
    }
  }, [playbackSpeed, currentIndex, isPlaying, isVideoActive]);

  const togglePlayPause = () => {
    if (!isPlaying && currentIndex === signs.length - 1) {
      updateIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleStepPrev = () => {
    setIsPlaying(false);
    updateIndex(prev => Math.max(0, prev - 1));
  };

  const handleStepNext = () => {
    setIsPlaying(false);
    updateIndex(prev => Math.min(signs.length - 1, prev + 1));
  };

  const handleCopyGloss = () => {
    navigator.clipboard.writeText(aslGloss);
    setCopiedGloss(true);
    setTimeout(() => setCopiedGloss(false), 2000);
  };

  const handleCopyText = () => {
    if (originalText) {
      navigator.clipboard.writeText(originalText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  if (!signs || signs.length === 0) {
    return (
      <div className="p-8 text-center bg-[#0F172A] rounded-2xl border border-[#1E293B]">
        <p className="text-sm text-[#94A3B8]">No sign sequence to display yet. Enter text, speech, or image to generate signs.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0F172A] rounded-2xl border border-[#1E293B] shadow-2xl overflow-hidden transition-all">
      {/* Top Gloss & Action Header */}
      <div className="p-4 bg-[#080C16] border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5 max-w-xl">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#14B8A6]/20 text-[#22D3EE] border border-[#14B8A6]/30">
              ASL Gloss Sequence
            </span>
            <span className="text-xs text-[#94A3B8]">
              Sign {currentIndex + 1} of {signs.length}
            </span>
          </div>
          <div className="text-base font-mono font-semibold text-[#22D3EE] tracking-wide flex items-center gap-2">
            <span>{aslGloss}</span>
            <button
              onClick={handleCopyGloss}
              title="Copy Gloss Sequence"
              className="p-1 hover:text-white rounded transition-colors"
            >
              {copiedGloss ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#64748B]" />}
            </button>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-2">
          {originalText && (
            <button
              onClick={handleCopyText}
              className="text-xs flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-[#1E293B] text-[#94A3B8] hover:text-white hover:bg-[#0A0F1C] transition-colors"
            >
              {copiedText ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>Copy Input</span>
            </button>
          )}
          {onRequestFeedback && (
            <button
              onClick={onRequestFeedback}
              className="text-xs flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 transition-colors"
            >
              <Flag className="w-3 h-3" />
              <span>Report Issue</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Video / Sign Presentation Stage */}
      <div className="relative bg-black flex flex-col items-center justify-center min-h-[360px] max-h-[480px] overflow-hidden p-6">
        {isVideoActive && activeSign?.media_url ? (
          <video
            ref={videoRef}
            key={`${activeSign?.gloss}_${activeSign?.source_token || ''}_${activeSign?.media_url || ''}_${currentIndex}`}
            src={activeSign.media_url}
            autoPlay={isPlaying}
            playsInline
            muted
            onEnded={handleVideoEnded}
            onError={() => handleVideoError(currentIndex)}
            className="w-full max-h-[420px] object-contain rounded-lg"
          />
        ) : fingerspellMode[currentIndex] && activeSign ? (
          /* Explicit Manual Alphabet Fingerspelling (User Toggled) */
          <div className="flex flex-col items-center justify-center text-center text-white space-y-3 py-6 px-4 max-w-lg w-full animate-fade-in">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#14B8A6]/15 text-[#22D3EE] border border-[#14B8A6]/30 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-teal-400" />
                Manual Alphabet Fingerspelling
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Spelling sequence for <span className="font-mono font-bold text-teal-300">'{activeSign.gloss.replace('FS:', '')}'</span>
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 max-w-md my-3">
              {activeSign.gloss.replace('FS:', '').split('').map((rawChar, idx) => {
                const char = rawChar.toUpperCase();
                const isAlpha = /^[A-Z]$/.test(char);
                return (
                  <div
                    key={idx}
                    className="w-16 h-24 rounded-xl bg-[#0F172A] border-2 border-teal-500/70 shadow-lg flex flex-col items-center justify-between p-1.5 transition-transform hover:scale-105"
                  >
                    {isAlpha ? (
                      <div className="w-12 h-14 flex items-center justify-center overflow-hidden">
                        <img
                          src={`/media/asl/alphabet/${char}.svg`}
                          alt={`ASL letter ${char}`}
                          className="w-full h-full object-contain filter invert brightness-90"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-14 flex items-center justify-center font-mono font-bold text-xl text-teal-300">
                        {char}
                      </div>
                    )}
                    <div className="w-full text-center border-t border-slate-800 pt-0.5">
                      <span className="font-mono font-bold text-sm text-teal-300 leading-none">{char}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setFingerspellMode(prev => ({ ...prev, [currentIndex]: false }))}
              className="px-3.5 py-1.5 rounded-xl bg-[#0F172A] hover:bg-[#131D31] text-teal-300 border border-[#1E293B] text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Back to Fallback Card</span>
            </button>
          </div>
        ) : (
          /* Exact Fallback Card for Words Without Videos */
          <div className="flex flex-col items-center justify-center p-8 text-center w-full max-w-lg min-h-[300px] animate-fade-in space-y-4">
            {/* Subtle Teal Accent Badge */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#14B8A6]/10 border border-[#14B8A6]/30 text-teal-400 text-xs font-semibold tracking-wider uppercase shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] animate-pulse" />
              <span>Sign Video Unavailable</span>
            </div>

            {/* Exact Word in Centered, High-Contrast White Typography */}
            <div className="py-2">
              <h2 className="text-5xl sm:text-7xl font-extrabold tracking-widest text-white uppercase font-mono drop-shadow-lg">
                {(activeSign?.source_token || activeSign?.gloss || '').replace(/^FS:/, '').toUpperCase()}
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[#14B8A6] to-transparent mx-auto mt-4 rounded-full shadow-[0_0_12px_rgba(20,184,166,0.6)]" />
            </div>

            {/* Category / Meaning Note */}
            <div className="space-y-1.5 text-xs text-[#94A3B8]">
              {activeSign?.definition && (
                <p className="max-w-md text-slate-300 text-xs italic px-4 leading-relaxed">
                  &ldquo;{activeSign.definition}&rdquo;
                </p>
              )}
              <div className="flex items-center justify-center gap-3 pt-1 text-[11px] text-slate-400">
                <span>Category: <strong className="text-slate-200 capitalize">{activeSign?.category || 'General'}</strong></span>
                {activeSign?.non_manual_signal && activeSign.non_manual_signal !== 'neutral' && (
                  <span>• NMS: <strong className="text-teal-300 capitalize">{activeSign.non_manual_signal.replace('_', ' ')}</strong></span>
                )}
              </div>
            </div>

            {/* Optional Manual Alphabet Fingerspelling button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setFingerspellMode(prev => ({ ...prev, [currentIndex]: true }))}
                className="px-3.5 py-1.5 rounded-xl bg-[#0F172A] hover:bg-[#131D31] text-teal-300 border border-[#1E293B] hover:border-[#14B8A6]/40 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-teal-400" />
                <span>Spell with Manual Alphabet</span>
              </button>
            </div>
          </div>
        )}

        {/* Current Sign Overlay Card */}
        {activeSign && (
          <div className="absolute bottom-4 left-4 right-4 bg-[#080C16]/90 backdrop-blur-md border border-[#1E293B] p-3 rounded-xl flex items-center justify-between text-white shadow-lg">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-base font-bold text-white tracking-wide">
                  {activeSign.gloss}
                </span>
                {activeSign.source_token && activeSign.source_token.toUpperCase() !== activeSign.gloss.toUpperCase() && (
                  <span className="text-[10px] text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700/60 font-mono">
                    synonym: &quot;{activeSign.source_token}&quot;
                  </span>
                )}
                {isFingerspelled ? (
                  <span className="flex items-center text-[10px] text-amber-300 font-medium bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-600/70">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Fingerspelling
                  </span>
                ) : isVideoActive ? (
                  <span className="flex items-center text-[10px] text-emerald-400 font-medium bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-700">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Verified Video
                  </span>
                ) : (
                  <span className="flex items-center text-[10px] text-teal-300 font-medium bg-teal-950/80 px-2 py-0.5 rounded-full border border-teal-700/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mr-1.5 animate-pulse" /> Text Fallback Card
                  </span>
                )}
                {activeSign.non_manual_signal && (
                  <span className="text-[10px] text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                    NMS: {activeSign.non_manual_signal.replace('_', ' ')}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Category: <span className="capitalize text-slate-300">{activeSign.category || 'General'}</span> • Source: {activeSign.source || 'Open Educational Catalog'}
              </div>
            </div>

            <button
              onClick={() => setSelectedSignForDetails(activeSign)}
              title="View Linguistic Details"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Playback Controls Toolbar */}
      <div className="p-4 bg-[#0F172A] border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-4">
        {/* Play / Step Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleStepPrev}
            disabled={currentIndex === 0}
            title="Previous Sign"
            className="p-2 rounded-lg text-[#CBD5E1] hover:text-white hover:bg-[#1E293B] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={togglePlayPause}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#14B8A6] to-[#0D9488] hover:from-[#22D3EE] hover:to-[#14B8A6] text-white font-semibold text-xs flex items-center space-x-2 shadow-md shadow-teal-500/20 transition-all hover:scale-[1.02]"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>{currentIndex === signs.length - 1 ? 'Replay Sequence' : 'Play Sequence'}</span>
              </>
            )}
          </button>

          <button
            onClick={handleStepNext}
            disabled={currentIndex === signs.length - 1}
            title="Next Sign"
            className="p-2 rounded-lg text-[#CBD5E1] hover:text-white hover:bg-[#1E293B] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              updateIndex(0);
            }}
            title="Reset to Start"
            className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Playback Speed Toggles */}
        <div className="flex items-center space-x-1 bg-[#0A0F1C] border border-[#1E293B] p-1 rounded-xl text-xs font-semibold">
          {[0.5, 0.75, 1.0].map((speed) => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                playbackSpeed === speed
                  ? 'bg-[#14B8A6] text-[#0A0F1C] font-bold shadow-xs'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Timeline of Signs */}
      <div className="p-4 bg-[#0A0F1C] border-t border-[#1E293B]">
        <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]"></span>
          <span>Sign Timeline Waveform</span>
        </h5>
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin">
          {signs.map((sign, index) => {
            const isSelected = index === currentIndex;
            const itemDirectFingerspelled = Boolean(sign.is_fingerspelled || sign.gloss.startsWith('FS:'));
            const itemFingerspelled = itemDirectFingerspelled || Boolean(fingerspellMode[index]);
            const itemVideoFailed = Boolean(failedMedia[index]);
            const itemHasWorkingVideo = Boolean(sign.media_url && sign.media_type === 'video' && sign.verified && !itemVideoFailed && !fingerspellMode[index]);

            return (
              <button
                key={sign.gloss + index}
                onClick={() => {
                  setIsPlaying(false);
                  updateIndex(index);
                }}
                className={`flex-shrink-0 px-3.5 py-2.5 rounded-xl text-left border transition-all ${
                  isSelected
                    ? 'bg-[#14B8A6] text-[#0A0F1C] border-[#14B8A6] font-bold shadow-lg shadow-teal-500/20 ring-2 ring-teal-400/40 scale-105'
                    : 'bg-[#0F172A] text-[#CBD5E1] border-[#1E293B] hover:border-[#14B8A6]/50'
                }`}
              >
                <div className="font-mono text-xs font-bold leading-tight flex items-center space-x-1.5">
                  <span>{sign.gloss}</span>
                  {itemFingerspelled ? (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-sans font-semibold ${isSelected ? 'bg-black/20 text-[#0A0F1C]' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                      FS
                    </span>
                  ) : itemHasWorkingVideo ? (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-sans font-semibold ${isSelected ? 'bg-black/20 text-[#0A0F1C]' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                      Video
                    </span>
                  ) : (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-sans font-semibold ${isSelected ? 'bg-black/20 text-[#0A0F1C]' : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'}`}>
                      Card
                    </span>
                  )}
                </div>
                {sign.source_token && sign.source_token.toUpperCase() !== sign.gloss.toUpperCase() ? (
                  <div className={`text-[10px] mt-0.5 font-mono truncate max-w-[90px] ${isSelected ? 'text-black/80' : 'text-amber-400'}`}>
                    &quot;{sign.source_token}&quot;
                  </div>
                ) : (
                  <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-black/70' : 'text-[#64748B]'}`}>
                    Sign #{index + 1}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Linguistic Detail Modal */}
      {selectedSignForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-[#E2E8F0]">
            <div className="flex items-center justify-between border-b pb-3 border-[#1E293B]">
              <h4 className="font-mono text-lg font-bold text-teal-400">
                Linguistic Card: {selectedSignForDetails.gloss}
              </h4>
              <button
                onClick={() => setSelectedSignForDetails(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              {selectedSignForDetails.source_token && selectedSignForDetails.source_token.toUpperCase() !== selectedSignForDetails.gloss.toUpperCase() && (
                <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/60 text-amber-200">
                  <strong className="block font-semibold">Lexical Synonym Mapping:</strong>
                  <span>
                    Input word <strong>&quot;{selectedSignForDetails.source_token}&quot;</strong> was matched to canonical ASL sign <strong>{selectedSignForDetails.gloss}</strong> via documented vocabulary synonym mapping.
                  </span>
                </div>
              )}
              {selectedSignForDetails.definition && (
                <div>
                  <strong className="text-slate-900 dark:text-white block font-semibold">Linguistic Definition & Handshape:</strong>
                  <span>{selectedSignForDetails.definition}</span>
                </div>
              )}
              <div>
                <strong className="text-slate-900 dark:text-white block font-semibold">Category:</strong>
                <span className="capitalize">{selectedSignForDetails.category || 'General Conversation'}</span>
              </div>
              <div>
                <strong className="text-slate-900 dark:text-white block font-semibold">Verification & Media Status:</strong>
                {selectedSignForDetails.is_fingerspelled || selectedSignForDetails.gloss.startsWith('FS:') ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    ⚠ Manual alphabet spelling sequence (Lexical term not cataloged in standard video lexicon)
                  </span>
                ) : selectedSignForDetails.verified && selectedSignForDetails.media_url ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Verified in curated educational ASL database (Video stream)
                  </span>
                ) : (
                  <span className="text-cyan-600 dark:text-cyan-400 font-medium">
                    ℹ Linguistic concept representation (Recorded video pending verification / network stream unavailable)
                  </span>
                )}
              </div>
              {selectedSignForDetails.non_manual_signal && (
                <div>
                  <strong className="text-slate-900 dark:text-white block font-semibold">Non-Manual Marker (NMS):</strong>
                  <span>{selectedSignForDetails.non_manual_signal.replace('_', ' ')}</span>
                </div>
              )}
              <div>
                <strong className="text-slate-900 dark:text-white block font-semibold">Attribution & License:</strong>
                <span>{selectedSignForDetails.source || 'WLASL / ASL-LEX 2.0'} ({selectedSignForDetails.license || 'CC BY-NC-SA 4.0'})</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedSignForDetails(null)}
              className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold rounded-xl text-xs hover:bg-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
