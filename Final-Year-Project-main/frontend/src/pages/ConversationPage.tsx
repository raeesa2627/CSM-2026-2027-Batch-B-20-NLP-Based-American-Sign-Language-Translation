import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Mic, 
  Square,
  Trash2, 
  Maximize2, 
  Minimize2, 
  User, 
  Sparkles, 
  Bookmark, 
  Check, 
  Volume2,
  VolumeX,
  AlertTriangle,
  Loader2,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Ear,
  Hand
} from 'lucide-react';
import { apiClient } from '../services/api';
import { TranslationResult } from '../types';
import { SignSequenceViewer } from '../components/viewer/SignSequenceViewer';
import { ConfidenceCard } from '../components/viewer/ConfidenceCard';
import { encodeWAV, resampleFloat32 } from '../utils/wavEncoder';

export interface ChatMessage {
  id: string;
  sender: 'hearing' | 'deaf';
  text: string;
  timestamp: string;
  translation?: TranslationResult;
  translationError?: boolean;
}

const STORAGE_KEY = 'asl_conversation_messages';

export const ConversationPage: React.FC = () => {
  // 1. Initial State: Load from localStorage without fake/mock messages
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved conversation messages', e);
    }
    return [];
  });

  const [inputText, setInputText] = useState<string>('');
  const [activeParty, setActiveParty] = useState<'hearing' | 'deaf'>('hearing');
  const [activeViewingTranslation, setActiveViewingTranslation] = useState<TranslationResult | null>(null);
  const [largeDisplayMessage, setLargeDisplayMessage] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);

  // Audio Recording State for Hearing Speaker
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Audio Playback / TTS State for Deaf Interlocutor Messages
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Saved Phrases Feedback
  const [savedPhraseIds, setSavedPhraseIds] = useState<Record<string, boolean>>({});
  const [savingPhraseId, setSavingPhraseId] = useState<string | null>(null);

  // DOM Refs
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 2. Persist messages across refresh and navigation
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to save conversation messages to localStorage', e);
    }
  }, [messages]);

  // Restore latest translation when page reloads with existing messages
  useEffect(() => {
    if (!activeViewingTranslation && messages.length > 0) {
      const lastWithTrans = [...messages].reverse().find(m => m.translation);
      if (lastWithTrans && lastWithTrans.translation) {
        setActiveViewingTranslation(lastWithTrans.translation);
      }
    }
  }, [messages, activeViewingTranslation]);

  // Auto-scroll to bottom of chat stream on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTranslating, isRecording]);

  // Keyboard listener for Escape key to close fullscreen modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && largeDisplayMessage) {
        setLargeDisplayMessage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [largeDisplayMessage]);

  // Cleanup media recording tracks on unmount
  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 3. Audio Recording Methods for Hearing Interlocutor
  const startVoiceRecording = async () => {
    setAudioError(null);
    mediaChunksRef.current = [];
    pcmChunksRef.current = [];
    isRecordingRef.current = true;
    setIsRecording(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
        }
      });
      mediaStreamRef.current = stream;

      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        const processor = ctx.createScriptProcessor(4096, 1, 1);
        scriptProcessorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (!isRecordingRef.current) return;
          const input = e.inputBuffer.getChannelData(0);
          pcmChunksRef.current.push(new Float32Array(input));
        };

        // Connect through a zero-gain dummy node so audio NEVER feeds back into laptop speakers
        const dummyGain = ctx.createGain();
        dummyGain.gain.value = 0.0;
        source.connect(processor);
        processor.connect(dummyGain);
        dummyGain.connect(ctx.destination);

        // Volume meter animation loop measuring true RMS volume
        const timeDomainData = new Uint8Array(analyser.frequencyBinCount);
        const updateVolumeMeter = () => {
          if (!isRecordingRef.current) {
            setAudioLevel(0);
            return;
          }
          analyser.getByteTimeDomainData(timeDomainData);
          let sumSquares = 0.0;
          for (let i = 0; i < timeDomainData.length; i++) {
            const norm = (timeDomainData[i] - 128) / 128.0;
            sumSquares += norm * norm;
          }
          const rms = Math.sqrt(sumSquares / timeDomainData.length);
          const level = Math.min(100, Math.round(rms * 320));
          setAudioLevel(level);
          animationFrameRef.current = requestAnimationFrame(updateVolumeMeter);
        };
        updateVolumeMeter();
      } catch (e) {
        console.warn('AudioContext / Analyser init notice', e);
      }

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          mediaChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
    } catch (err: any) {
      console.error('Failed to access microphone', err);
      isRecordingRef.current = false;
      setIsRecording(false);
      setAudioError(err.message || 'Microphone access denied or unavailable.');
    }
  };

  const stopVoiceRecording = async () => {
    if (!isRecordingRef.current && !isRecording) return;
    isRecordingRef.current = false;
    setIsRecording(false);
    setIsTranscribingAudio(true);
    setAudioLevel(0);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setAudioError(null);

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        await new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
          try { recorder.stop(); } catch (e) { resolve(); }
          setTimeout(resolve, 200);
        });
      } catch (e) {}
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    if (scriptProcessorRef.current) {
      try { scriptProcessorRef.current.disconnect(); } catch (e) {}
      scriptProcessorRef.current = null;
    }
    const audioCtx = audioContextRef.current;
    const fallbackSampleRate = audioCtx ? audioCtx.sampleRate : 48000;
    if (audioCtx) {
      try { audioCtx.close(); } catch (e) {}
      audioContextRef.current = null;
    }

    try {
      let finalSamples: Float32Array | null = null;
      let actualSourceRate = fallbackSampleRate;
      const mediaChunks = mediaChunksRef.current;

      if (mediaChunks.length > 0) {
        try {
          const recordedBlob = new Blob(mediaChunks, { type: mediaChunks[0].type || 'audio/webm' });
          const arrayBuf = await recordedBlob.arrayBuffer();
          if (arrayBuf.byteLength > 500) {
            const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const decodedBuffer = await tempCtx.decodeAudioData(arrayBuf);
            finalSamples = decodedBuffer.getChannelData(0);
            actualSourceRate = decodedBuffer.sampleRate; // CRITICAL: capture true decoded sample rate
            tempCtx.close().catch(() => {});
          }
        } catch (decodeErr) {
          console.warn('decodeAudioData notice, falling back to PCM chunks', decodeErr);
        }
      }

      if (!finalSamples || finalSamples.length === 0) {
        let totalLen = 0;
        for (const c of pcmChunksRef.current) totalLen += c.length;
        if (totalLen > 0) {
          finalSamples = new Float32Array(totalLen);
          let offset = 0;
          for (const c of pcmChunksRef.current) {
            finalSamples.set(c, offset);
            offset += c.length;
          }
          actualSourceRate = fallbackSampleRate;
        }
      }

      if (!finalSamples || finalSamples.length < 800) {
        setAudioError('No audible speech detected. Please speak closer to the microphone and try again.');
        setIsTranscribingAudio(false);
        return;
      }

      const resampled = resampleFloat32(finalSamples, actualSourceRate, 16000);
      const wavBlob = encodeWAV(resampled, 16000, true);

      const res = await apiClient.transcribeAudio(wavBlob);
      if (res && res.success && res.transcript && res.transcript.trim()) {
        const text = res.transcript.trim();
        setInputText(prev => prev ? `${prev} ${text}` : text);
      } else {
        setAudioError(res?.error || 'Could not recognize speech. Please verify microphone or type directly.');
      }
    } catch (e: any) {
      console.error('Audio transcription error:', e);
      setAudioError(e.message || 'Speech recognition service error.');
    } finally {
      setIsTranscribingAudio(false);
    }
  };

  // 4. Send Message Handler
  const handleSendMessage = async () => {
    if (!inputText.trim() || isTranslating) return;

    const text = inputText.trim();
    setInputText('');
    setAudioError(null);

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: activeParty,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);

    // Automatically translate hearing speech/text into ASL for the Deaf interlocutor
    if (activeParty === 'hearing') {
      setIsTranslating(true);
      setPendingMessageId(newMsg.id);
      try {
        const res = await apiClient.translateText(text, 'rag_grounded');
        newMsg.translation = res;
        setActiveViewingTranslation(res);
        setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, translation: res, translationError: false } : m));
      } catch (e: any) {
        console.error('Sign translation failed:', e);
        setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, translationError: true } : m));
      } finally {
        setIsTranslating(false);
        setPendingMessageId(null);
      }
    }
  };

  // 5. Retry Translation Handler
  const handleRetryTranslation = async (msg: ChatMessage) => {
    setIsTranslating(true);
    setPendingMessageId(msg.id);
    try {
      const res = await apiClient.translateText(msg.text, 'rag_grounded');
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, translation: res, translationError: false } : m));
      setActiveViewingTranslation(res);
    } catch (e: any) {
      console.error('Retry translation failed:', e);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, translationError: true } : m));
    } finally {
      setIsTranslating(false);
      setPendingMessageId(null);
    }
  };

  // 6. Text-to-Speech (TTS) for Deaf Interlocutor Messages
  const handleSpeakText = (text: string, msgId: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    if (speakingMessageId === msgId) {
      setSpeakingMessageId(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // 7. Save Phrase to Personal Library
  const handleBookmarkPhrase = async (msg: ChatMessage) => {
    if (!msg.translation) return;
    setSavingPhraseId(msg.id);
    try {
      await apiClient.createPhrase({
        englishText: msg.text,
        aslGloss: msg.translation.asl_gloss,
        category: 'conversational',
        isFavorite: false
      });
      setSavedPhraseIds(prev => ({ ...prev, [msg.id]: true }));
    } catch (err: any) {
      console.warn('Failed to bookmark phrase to backend:', err);
      // Retain visual confirmation locally
      setSavedPhraseIds(prev => ({ ...prev, [msg.id]: true }));
    } finally {
      setSavingPhraseId(null);
    }
  };

  // Clear Dialogue Handler
  const handleClearDialogue = () => {
    setMessages([]);
    setActiveViewingTranslation(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Context-Sensitive Quick Presets
  const hearingPresets = [
    "Hello, nice to meet you",
    "How can I help you today?",
    "Please take your time",
    "Let me write that down"
  ];

  const deafPresets = [
    "Yes, thank you",
    "Can you please repeat?",
    "I understand",
    "Please write it down",
    "I need an ASL interpreter",
    "Where is the restroom?"
  ];

  const activePresets = activeParty === 'hearing' ? hearingPresets : deafPresets;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 text-[#E2E8F0]">
      {/* Workspace Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#14B8A6] font-semibold text-xs tracking-wider uppercase">
            <MessageSquare className="w-4 h-4 text-[#22D3EE]" />
            <span>Shared Interlocutor Workspace</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Two-Way Interlocutor Conversation
          </h1>
          <p className="text-xs text-[#94A3B8]">
            Facilitates direct face-to-face dialogue between Deaf ASL signers and hearing non-signers with automated sign synthesis and audio readout.
          </p>
        </div>

        {messages.length > 0 && (
          <button
            id="clear-dialogue-btn"
            onClick={handleClearDialogue}
            className="text-xs text-[#94A3B8] hover:text-red-400 flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-[#1E293B] bg-[#0F172A] hover:bg-red-500/10 hover:border-red-500/30 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Dialogue</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chat Stream (7 cols) */}
        <div className="lg:col-span-7 bg-[#0F172A] rounded-2xl border border-[#1E293B] shadow-xl flex flex-col h-[600px] overflow-hidden">
          {/* Active Speaker Toggle */}
          <div className="p-3 bg-[#080C16] border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#CBD5E1] flex items-center space-x-1.5">
              <span>Active Speaker Role:</span>
            </span>
            <div className="flex items-center space-x-1 bg-[#0A0F1C] p-1 rounded-xl border border-[#1E293B] text-xs">
              <button
                id="role-toggle-hearing"
                onClick={() => setActiveParty('hearing')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  activeParty === 'hearing'
                    ? 'bg-[#14B8A6] text-[#0A0F1C] font-bold shadow-xs'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <Ear className="w-3.5 h-3.5" />
                <span>Hearing Interlocutor</span>
              </button>
              <button
                id="role-toggle-deaf"
                onClick={() => setActiveParty('deaf')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  activeParty === 'deaf'
                    ? 'bg-[#14B8A6] text-[#0A0F1C] font-bold shadow-xs'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <Hand className="w-3.5 h-3.5" />
                <span>Deaf Participant</span>
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              /* Informative Empty State */
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#14B8A6]/10 border border-[#14B8A6]/20 flex items-center justify-center text-[#22D3EE]">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-sm font-bold text-white">No messages in dialogue yet</h3>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    Begin a conversation between hearing and deaf participants. Select a role above, then speak or type.
                  </p>
                </div>
                <div className="pt-2 w-full max-w-md space-y-2">
                  <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                    Suggested Conversation Starters:
                  </span>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {[
                      "Hello, nice to meet you",
                      "How can I help you today?",
                      "I am an ASL signer",
                      "Can you please assist me?"
                    ].map((phrase, idx) => (
                      <button
                        key={idx}
                        id={`starter-phrase-${idx}`}
                        onClick={() => setInputText(phrase)}
                        className="text-xs px-3 py-1.5 rounded-xl bg-[#0A0F1C] border border-[#1E293B] text-[#CBD5E1] hover:border-[#14B8A6]/60 hover:text-white transition-colors"
                      >
                        {phrase}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isHearing = msg.sender === 'hearing';
                const isSelected = activeViewingTranslation && msg.translation?.request_id === activeViewingTranslation.request_id;
                const isPending = isTranslating && pendingMessageId === msg.id;
                const isSpeaking = speakingMessageId === msg.id;
                const isSaved = savedPhraseIds[msg.id];

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isHearing ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center space-x-1.5 text-[10px] text-[#64748B] mb-1 px-1">
                      <span>{isHearing ? 'Hearing Speaker' : 'Deaf Interlocutor'}</span>
                      <span>• {msg.timestamp}</span>
                    </div>
                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl text-xs space-y-2 shadow-md transition-all ${
                        isHearing
                          ? `bg-[#1E293B] text-white rounded-tl-xs ${
                              isSelected
                                ? 'border-2 border-[#22D3EE] shadow-cyan-900/20'
                                : 'border border-[#334155]'
                            }`
                          : 'bg-gradient-to-r from-[#14B8A6] to-[#0D9488] text-white rounded-tr-xs'
                      }`}
                    >
                      <p className="font-medium text-sm leading-relaxed">{msg.text}</p>

                      {/* Footer Actions / Translation Status */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-white/15 text-[10px]">
                        {isHearing ? (
                          isPending ? (
                            <span className="flex items-center space-x-1 text-teal-300 font-medium">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Synthesizing ASL signs...</span>
                            </span>
                          ) : msg.translation ? (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setActiveViewingTranslation(msg.translation!)}
                                className={`font-mono font-bold flex items-center space-x-1 ${
                                  isSelected ? 'text-[#22D3EE] underline' : 'text-[#67E8F9] hover:underline'
                                }`}
                              >
                                <Sparkles className="w-3 h-3 text-[#22D3EE]" />
                                <span>Sign: {msg.translation.asl_gloss}</span>
                              </button>
                              <button
                                onClick={() => handleBookmarkPhrase(msg)}
                                title={isSaved ? "Saved to phrases" : "Save to phrases"}
                                className="p-0.5 text-slate-300 hover:text-white transition-colors"
                              >
                                {isSaved ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Bookmark className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : msg.translationError ? (
                            <button
                              onClick={() => handleRetryTranslation(msg)}
                              className="text-amber-300 hover:text-amber-200 flex items-center space-x-1 underline"
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              <span>Translation failed • Retry</span>
                            </button>
                          ) : (
                            <span className="opacity-70">Direct Text</span>
                          )
                        ) : (
                          /* Deaf Participant Message Options */
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleSpeakText(msg.text, msg.id)}
                              title={isSpeaking ? "Stop speaking" : "Speak message aloud to hearing speaker"}
                              className={`flex items-center space-x-1 px-1.5 py-0.5 rounded-md transition-colors ${
                                isSpeaking ? 'bg-white text-teal-900 font-bold' : 'hover:bg-white/20 text-white'
                              }`}
                            >
                              {isSpeaking ? (
                                <>
                                  <VolumeX className="w-3 h-3 animate-pulse text-teal-900" />
                                  <span>Speaking...</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3 h-3" />
                                  <span>Speak aloud</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {/* Fullscreen High-Contrast Button */}
                        <button
                          onClick={() => setLargeDisplayMessage(msg.text)}
                          title="Show Fullscreen High-Contrast"
                          className="opacity-75 hover:opacity-100 p-0.5 text-white transition-opacity ml-2"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Audio Error Alert if any */}
          {audioError && (
            <div className="mx-3 mb-1 p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="flex-1">{audioError}</span>
              <button
                onClick={() => setAudioError(null)}
                className="text-amber-400 hover:text-white text-xs underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Input & Quick Presets Footer */}
          <div className="p-3 bg-[#080C16] border-t border-[#1E293B] space-y-2">
            <div className="flex items-center space-x-1 overflow-x-auto text-[11px] pb-1 scrollbar-thin">
              {activePresets.map((phrase, idx) => (
                <button
                  key={idx}
                  id={`quick-reply-${idx}`}
                  onClick={() => setInputText(phrase)}
                  className="whitespace-nowrap px-3 py-1 rounded-full bg-[#0A0F1C] border border-[#1E293B] text-[#CBD5E1] hover:border-[#14B8A6]/50 hover:text-white transition-colors"
                >
                  {phrase}
                </button>
              ))}
            </div>

            {/* Live Audio Level Meter when recording */}
            {isRecording && (
              <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs animate-fade-in">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span className="font-semibold text-[11px] uppercase tracking-wide">Recording Voice...</span>
                <div className="flex-1 h-2 bg-[#0A0F1C] rounded-full overflow-hidden border border-[#1E293B]">
                  <div
                    className="h-full bg-gradient-to-r from-teal-400 via-amber-400 to-rose-500 transition-all duration-75"
                    style={{ width: `${Math.max(4, audioLevel)}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-slate-400 shrink-0">{audioLevel}%</span>
              </div>
            )}

            <div className="flex items-center space-x-2">
              {/* Voice Input Button for Hearing Interlocutor */}
              {activeParty === 'hearing' && (
                <button
                  id="conversation-mic-btn"
                  onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                  disabled={isTranscribingAudio || isTranslating}
                  title={isRecording ? "Stop recording speech" : "Speak message via microphone"}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-center shrink-0 ${
                    isRecording
                      ? 'bg-rose-600 text-white border-rose-500 animate-pulse shadow-md shadow-rose-900/50'
                      : 'bg-[#0A0F1C] text-[#22D3EE] border-[#1E293B] hover:border-[#14B8A6] hover:bg-[#14B8A6]/10'
                  }`}
                >
                  {isTranscribingAudio ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#22D3EE]" />
                  ) : isRecording ? (
                    <Square className="w-4 h-4 fill-white" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              )}

              <input
                id="conversation-input"
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isRecording && handleSendMessage()}
                placeholder={
                  isRecording 
                    ? 'Listening... Speak clearly into microphone...' 
                    : isTranscribingAudio 
                    ? 'Transcribing speech with Whisper...' 
                    : `Type message as ${activeParty === 'hearing' ? 'Hearing Interlocutor' : 'Deaf Participant'}...`
                }
                className="flex-1 p-2.5 rounded-xl border border-[#1E293B] bg-[#0A0F1C] text-[#E2E8F0] placeholder-[#64748B] text-xs font-medium focus:border-[#14B8A6] outline-none transition-colors"
              />

              <button
                id="conversation-send-btn"
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isTranslating || isRecording}
                className="p-2.5 rounded-xl bg-gradient-to-r from-[#14B8A6] to-[#0D9488] hover:from-[#22D3EE] hover:to-[#14B8A6] text-white disabled:opacity-40 shadow-md shadow-teal-500/20 transition-all hover:scale-[1.02] shrink-0"
              >
                {isTranslating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Sign Display (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {isTranslating && !activeViewingTranslation ? (
            /* Loading State while initial translation processes */
            <div className="p-8 text-center rounded-2xl bg-[#0F172A] border border-[#1E293B] text-teal-400 space-y-3 animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#22D3EE]" />
              <h4 className="text-sm font-semibold text-white">Synthesizing ASL Signs...</h4>
              <p className="text-xs text-[#94A3B8]">
                Applying topic-comment syntactic transfer and retrieving verified sign videos.
              </p>
            </div>
          ) : activeViewingTranslation ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#22D3EE] flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>Active Utterance Signs</span>
                </h3>
                <span className="text-[11px] font-mono text-[#94A3B8] bg-[#0A0F1C] px-2 py-0.5 rounded-md border border-[#1E293B]">
                  {activeViewingTranslation.signs.length} sign{activeViewingTranslation.signs.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Main Sign Video Sequence Viewer */}
              <SignSequenceViewer
                key={`conv_${activeViewingTranslation.request_id || activeViewingTranslation.original_text}`}
                signs={activeViewingTranslation.signs}
                aslGloss={activeViewingTranslation.asl_gloss}
                originalText={activeViewingTranslation.original_text}
                moduleId="conversation"
              />

              {/* AI Transparency Diagnostics */}
              <ConfidenceCard
                confidence={activeViewingTranslation.confidence}
                processingMethod={activeViewingTranslation.processing_method}
                durationMs={activeViewingTranslation.duration_ms}
                retrievalEvidence={activeViewingTranslation.retrieval_evidence}
              />
            </div>
          ) : (
            <div className="p-10 text-center rounded-2xl bg-[#0F172A] border border-dashed border-[#1E293B] text-[#94A3B8] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#14B8A6]/10 border border-[#14B8A6]/20 flex items-center justify-center mx-auto text-[#22D3EE]">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-white">ASL Visual Output Pane</h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                When the hearing participant speaks or sends a message, verified sign videos, syntactic glosses, and transparency diagnostics render here for the Deaf participant.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Large-Text High-Contrast Fullscreen Modal */}
      {largeDisplayMessage && (
        <div 
          id="fullscreen-display-modal"
          className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-8 text-white animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              High-Contrast Large-Format Communication Mode
            </span>
            <button
              id="close-fullscreen-btn"
              onClick={() => setLargeDisplayMessage(null)}
              className="p-3 bg-white/20 hover:bg-white/30 rounded-2xl text-white transition-colors"
              title="Close Fullscreen (Esc)"
            >
              <Minimize2 className="w-7 h-7" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center text-center px-4">
            <p className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-snug select-text">
              {largeDisplayMessage}
            </p>
          </div>
          <div className="text-center text-slate-500 text-xs">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Esc</kbd> or click the minimize button to exit
          </div>
        </div>
      )}
    </div>
  );
};
