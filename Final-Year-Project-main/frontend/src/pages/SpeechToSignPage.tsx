import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Send, 
  RotateCcw, 
  AlertCircle, 
  Volume2, 
  Sparkles,
  Activity,
  Cpu,
  Loader2
} from 'lucide-react';
import { apiClient } from '../services/api';
import { TranslationResult } from '../types';
import { SignSequenceViewer } from '../components/viewer/SignSequenceViewer';
import { ConfidenceCard } from '../components/viewer/ConfidenceCard';
import { FeedbackModal } from '../components/feedback/FeedbackModal';
import { VERIFIED_EXAMPLES } from '../data/verifiedPhrases';
import { encodeWAV, resampleFloat32 } from '../utils/wavEncoder';
import { useTranslationWorkspace } from '../context/TranslationWorkspaceContext';

export const SpeechToSignPage: React.FC = () => {
  const {
    translationResult,
    currentSignIndex,
    setTranslation,
    setSignIndex,
  } = useTranslationWorkspace('speech');

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'requesting' | 'granted' | 'denied'>('unknown');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const [audioConfidence, setAudioConfidence] = useState<number | null>(null);
  const [acousticConfidence, setAcousticConfidence] = useState<number | null>(null);
  const [isLowConfidence, setIsLowConfidence] = useState<boolean>(false);
  const [lowConfidenceWords, setLowConfidenceWords] = useState<string[]>([]);
  const [engineName, setEngineName] = useState<string | null>(null);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [engineStatusNotice, setEngineStatusNotice] = useState<string | null>(null);
  const [transcriptionMethod, setTranscriptionMethod] = useState<'cloud_web_speech' | 'whisper_offline' | 'windows_offline' | 'manual' | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedbackOpen, setFeedbackOpen] = useState<boolean>(false);

  // References
  const isRecordingRef = useRef<boolean>(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const cloudTranscriptReceivedRef = useRef<boolean>(false);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Check microphone permissions on mount
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as any }).then(res => {
        if (res.state === 'granted') setPermissionStatus('granted');
        else if (res.state === 'denied') setPermissionStatus('denied');
        res.onchange = () => {
          if (res.state === 'granted') setPermissionStatus('granted');
          else if (res.state === 'denied') setPermissionStatus('denied');
        };
      }).catch(() => {});
    }

    return () => {
      cleanupAudioResources();
    };
  }, []);

  const cleanupAudioResources = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
      mediaRecorderRef.current = null;
    }
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch (e) {}
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  /**
   * Starts microphone capture with AudioContext, active Volume Meter, and MediaRecorder.
   */
  const startRecordingSession = async (): Promise<boolean> => {
    try {
      setPermissionStatus('requesting');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      mediaStreamRef.current = stream;
      setPermissionStatus('granted');

      // 1. Initialize AudioContext and ENSURE it is running (not suspended)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      // CRITICAL: Browsers start AudioContext in 'suspended' state unless explicitly resumed!
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // 2. Set up AnalyserNode for accurate live voice volume meter
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      // 3. Set up parallel PCM chunk collector (ScriptProcessorNode)
      pcmChunksRef.current = [];
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        if (!isRecordingRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        pcmChunksRef.current.push(new Float32Array(inputData));
      };

      // Connect to zero-gain dummy node so processor runs without speaker feedback
      const dummyGain = ctx.createGain();
      dummyGain.gain.value = 0.0;
      source.connect(processor);
      processor.connect(dummyGain);
      dummyGain.connect(ctx.destination);

      // 4. Live volume meter animation loop measuring true RMS volume
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
        // Scale RMS to 0 - 100% visibly reacting to speech
        const level = Math.min(100, Math.round(rms * 320));
        setAudioLevel(level);

        animationFrameRef.current = requestAnimationFrame(updateVolumeMeter);
      };
      updateVolumeMeter();

      // 5. Initialize MediaRecorder for robust C++ browser audio capture
      mediaChunksRef.current = [];
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
      recorder.start(100); // 100ms chunks

      return true;
    } catch (err: any) {
      console.error('Microphone recording error:', err);
      setPermissionStatus('denied');
      setRecognitionError('Microphone access could not be acquired: ' + (err.message || 'Permission denied'));
      return false;
    }
  };

  /**
   * Main Toggle for Speech Recording.
   */
  const toggleRecording = async () => {
    if (isTranscribing) return; // Prevent duplicate clicks during transcribing
    setRecognitionError(null);

    if (isRecording) {
      // STOP RECORDING
      setIsRecording(false);
      isRecordingRef.current = false;
      setAudioLevel(0);

      // Stop browser Web Speech API if active
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
      }

      // Stop MediaRecorder and collect final chunk
      const recorder = mediaRecorderRef.current;
      const mediaChunks = [...mediaChunksRef.current];
      const pcmChunks = [...pcmChunksRef.current];
      const audioCtx = audioContextRef.current;
      const sourceSampleRate = audioCtx ? audioCtx.sampleRate : 44100;

      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch (e) {}
      }

      cleanupAudioResources();

      // If Web Speech API already provided a valid final transcript, use it
      if (cloudTranscriptReceivedRef.current && transcript.trim()) {
        setTranscriptionMethod('cloud_web_speech');
        setEngineStatusNotice('Transcript generated via Web Speech API.');
        return;
      }

      // Otherwise, process through Windows Native Offline Speech Engine
      await processAudioForWindowsSTT(mediaChunks, pcmChunks, sourceSampleRate);

    } else {
      // START RECORDING
      cloudTranscriptReceivedRef.current = false;
      const ok = await startRecordingSession();
      if (!ok) return;

      setIsRecording(true);
      isRecordingRef.current = true;
      setInterimText('');
      setEngineStatusNotice('Microphone active. Listening for speech input...');

      // Attempt Web Speech API in parallel for real-time live preview
      startBrowserRecognition();
    }
  };

  /**
   * Browser SpeechRecognition for live previews when connectivity is available.
   */
  const startBrowserRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setEngineStatusNotice('Listening... (Whisper Neural STT offline active)');
      setTranscriptionMethod('whisper_offline');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTxt = '';
        let interimTxt = '';
        let confSum = 0;
        let count = 0;

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTxt += res[0].transcript + ' ';
            if (res[0].confidence) {
              confSum += res[0].confidence;
              count++;
            }
          } else {
            interimTxt += res[0].transcript;
          }
        }

        if (finalTxt.trim()) {
          cloudTranscriptReceivedRef.current = true;
          setTranscript(prev => (prev ? `${prev} ${finalTxt.trim()}` : finalTxt.trim()));
          setTranscriptionMethod('cloud_web_speech');
        }
        setInterimText(interimTxt);

        if (count > 0) {
          setAudioConfidence(Math.round((confSum / count) * 100) / 100);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[Web Speech API Notice]', event.error);
        if (event.error === 'network') {
          // Cloud endpoint unreachable: informative note
          setEngineStatusNotice('Listening... (Recording audio for Offline Whisper Neural STT)');
          setTranscriptionMethod('whisper_offline');
        } else if (event.error === 'not-allowed') {
          setPermissionStatus('denied');
          setRecognitionError('Microphone permission was denied.');
        }
      };

      recognition.onend = () => {
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('SpeechRecognition initialization note:', err);
      setEngineStatusNotice('Listening... (Recording audio for Offline Whisper Neural STT)');
      setTranscriptionMethod('whisper_offline');
    }
  };

  /**
   * Prepares audio into 16kHz mono WAV and sends to local Windows Speech Engine.
   */
  const processAudioForWindowsSTT = async (
    mediaChunks: Blob[], 
    pcmChunks: Float32Array[], 
    sourceSampleRate: number
  ) => {
    setIsTranscribing(true);
    setEngineStatusNotice('Transcribing audio via local Windows Speech Recognition engine...');

    try {
      let finalSamples: Float32Array | null = null;

      // Method A: Decode MediaRecorder Blob via Web Audio decodeAudioData
      if (mediaChunks.length > 0) {
        try {
          const recordedBlob = new Blob(mediaChunks, { type: mediaChunks[0].type || 'audio/webm' });
          const arrayBuf = await recordedBlob.arrayBuffer();
          if (arrayBuf.byteLength > 500) {
            const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const decodedBuffer = await tempCtx.decodeAudioData(arrayBuf);
            finalSamples = decodedBuffer.getChannelData(0);
            sourceSampleRate = decodedBuffer.sampleRate;
            tempCtx.close().catch(() => {});
          }
        } catch (decodeErr) {
          console.warn('decodeAudioData notice, falling back to PCM buffer:', decodeErr);
        }
      }

      // Method B: Fallback to direct PCM chunks if decodeAudioData did not produce samples
      if (!finalSamples || finalSamples.length === 0) {
        let totalLen = 0;
        for (const c of pcmChunks) totalLen += c.length;

        if (totalLen > 0) {
          finalSamples = new Float32Array(totalLen);
          let offset = 0;
          for (const c of pcmChunks) {
            finalSamples.set(c, offset);
            offset += c.length;
          }
        }
      }

      if (!finalSamples || finalSamples.length < 800) {
        setIsTranscribing(false);
        setEngineStatusNotice('No audible voice recorded. Please speak into your microphone and try again.');
        return;
      }

      // Resample to 16kHz mono and encode to standard 16-bit PCM WAV
      const resampled = resampleFloat32(finalSamples, sourceSampleRate, 16000);
      const wavBlob = encodeWAV(resampled, 16000);

      // Upload WAV Blob to backend gateway
      const res = await apiClient.transcribeAudio(wavBlob);

      if (res && res.success && res.transcript && res.transcript.trim()) {
        const text = res.transcript.trim();
        setTranscript(text);
        setInterimText('');
        setAudioConfidence(res.confidence ?? 0.85);
        setAcousticConfidence(res.acoustic_confidence ?? null);
        setIsLowConfidence(Boolean(res.is_low_confidence));
        setLowConfidenceWords(res.low_confidence_words || []);
        setEngineName(res.engine || 'Whisper tiny.en');

        const isWhisper = res.method === 'whisper_offline';
        setTranscriptionMethod(isWhisper ? 'whisper_offline' : 'windows_offline');

        const confPct = Math.round((res.confidence ?? 0.85) * 100);
        if (res.is_low_confidence) {
          setEngineStatusNotice(`Transcribed with low confidence (${confPct}% word confidence). Please verify or edit your text.`);
        } else {
          setEngineStatusNotice(`Transcribed via ${res.engine || 'Offline Neural STT'} (${confPct}% word confidence).`);
        }
      } else if (res && !res.success && res.error) {
        setRecognitionError(res.error);
        setEngineStatusNotice(res.error);
      } else {
        if (!transcript.trim()) {
          setEngineStatusNotice('No speech could be recognized from the recording. You can speak again or type in the transcript editor.');
        }
      }
    } catch (err: any) {
      console.error('Windows speech transcription error:', err);
      const errMsg = err.response?.data?.error || err.message || 'Failed to process audio.';
      setRecognitionError('Speech recognition notice: ' + errMsg);
      setEngineStatusNotice('Could not transcribe audio automatically. You can type or edit your text manually.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSimulateVoice = (samplePhrase: string) => {
    setTranscript(samplePhrase);
    setInterimText('');
    setAudioConfidence(0.96);
    setRecognitionError(null);
    setEngineStatusNotice('Verified sample transcript loaded.');
    setTranscriptionMethod('manual');
  };

  const handleTranslate = async () => {
    const fullText = (transcript + (interimText ? ' ' + interimText : '')).trim();
    if (!fullText) return;

    setIsLoading(true);
    setRecognitionError(null);

    try {
      const res = await apiClient.translateSpeech(fullText, audioConfidence || 0.92);
      setTranslation(res);
    } catch (err: any) {
      setRecognitionError(err.response?.data?.error || 'Failed to process speech translation.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 text-[#E2E8F0]">
      {/* Workspace Header */}
      <div className="space-y-1">
        <div className="flex items-center space-x-2 text-[#14B8A6] font-semibold text-xs tracking-wider uppercase">
          <Mic className="w-4 h-4 text-[#22D3EE]" />
          <span>Core Feature B</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Live Speech-to-Sign AI Workspace
        </h1>
        <p className="text-xs sm:text-sm text-[#94A3B8]">
          Capture live acoustic voice through your microphone, inspect real-time speech diagnostics, and translate into verified ASL sign sequences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Speech Control Pane (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0F172A] rounded-2xl border border-[#1E293B] p-6 shadow-xl text-center space-y-5">
            {/* Status Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                isRecording 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                  : isTranscribing
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 animate-pulse'
                  : permissionStatus === 'granted'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : permissionStatus === 'denied'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'bg-[#0A0F1C] border border-[#1E293B] text-[#94A3B8]'
              }`}>
                {isTranscribing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Activity className="w-3.5 h-3.5" />
                )}
                <span>
                  {isRecording 
                    ? 'Listening / Recording' 
                    : isTranscribing
                    ? 'Transcribing Voice Input...'
                    : permissionStatus === 'granted' 
                    ? 'Mic Ready' 
                    : permissionStatus === 'denied' 
                    ? 'Mic Denied' 
                    : 'Mic Idle'}
                </span>
              </span>

              {transcriptionMethod === 'whisper_offline' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                  <Cpu className="w-3 h-3 text-[#22D3EE]" />
                  <span>Whisper Offline AI</span>
                </span>
              )}

              {transcriptionMethod === 'windows_offline' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                  <Cpu className="w-3 h-3 text-[#22D3EE]" />
                  <span>Windows Offline Engine</span>
                </span>
              )}

              {transcriptionMethod === 'cloud_web_speech' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>Web Speech API</span>
                </span>
              )}
            </div>

            {/* Pulsing Mic Visualizer Button */}
            <div className="relative inline-flex items-center justify-center my-2">
              {isRecording && (
                <div 
                  className="absolute inset-0 rounded-full bg-red-500/20 animate-ping transition-all"
                  style={{ transform: `scale(${1 + audioLevel / 100})` }}
                />
              )}
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isTranscribing}
                className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all shadow-xl disabled:opacity-50 ${
                  isRecording
                    ? 'bg-red-500 text-white ring-4 ring-red-500/30'
                    : isTranscribing
                    ? 'bg-teal-700 text-white cursor-wait'
                    : 'bg-gradient-to-r from-[#14B8A6] to-[#0D9488] hover:from-[#22D3EE] hover:to-[#14B8A6] text-white shadow-teal-500/30 hover:scale-105'
                }`}
              >
                {isTranscribing ? (
                  <Loader2 className="w-10 h-10 animate-spin" />
                ) : isRecording ? (
                  <MicOff className="w-10 h-10" />
                ) : (
                  <Mic className="w-10 h-10" />
                )}
              </button>
            </div>

            {/* Live Volume Meter */}
            {isRecording && (
              <div className="space-y-1.5 max-w-xs mx-auto animate-fade-in">
                <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                  <span>Microphone Signal Level:</span>
                  <span className="font-mono font-semibold text-[#22D3EE]">{audioLevel}%</span>
                </div>
                <div className="w-full bg-[#0A0F1C] border border-[#1E293B] rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-[#14B8A6] via-[#22D3EE] to-emerald-400 h-2.5 rounded-full transition-all duration-75"
                    style={{ width: `${Math.max(4, audioLevel)}%` }}
                  />
                </div>
              </div>
            )}

            <div>
              <div className="text-sm font-bold text-white flex items-center justify-center gap-2">
                {isRecording ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span>Listening to Voice Input...</span>
                  </>
                ) : isTranscribing ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
                    <span>Processing Speech Audio...</span>
                  </>
                ) : (
                  <span>Click Microphone to Speak</span>
                )}
              </div>
              <p className="text-xs text-[#94A3B8] mt-1">
                {isRecording 
                  ? 'Speak clearly into your microphone, then click again when finished' 
                  : isTranscribing
                  ? 'Transcribing audio via local offline recognition engine...'
                  : 'Audio is processed in-memory and never permanently stored'}
              </p>
            </div>

            {/* Editable Transcript Display */}
            <div className="text-left space-y-1.5">
              <label htmlFor="speech-transcript-box" className="text-xs font-bold uppercase tracking-wider text-[#CBD5E1] flex items-center justify-between">
                <span>Recognized Speech Transcript</span>
                <div className="flex items-center gap-2">
                  {isLowConfidence && (
                    <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                      ⚠️ Low Confidence
                    </span>
                  )}
                  {audioConfidence !== null && (
                    <span className={`text-[10px] font-mono font-semibold ${isLowConfidence ? 'text-amber-300' : 'text-[#22D3EE]'}`}>
                      Word Confidence: {Math.round(audioConfidence * 100)}%
                    </span>
                  )}
                </div>
              </label>
              <textarea
                id="speech-transcript-box"
                rows={3}
                value={transcript + (interimText ? ` [${interimText}]` : '')}
                onChange={(e) => {
                  setTranscript(e.target.value);
                  setIsLowConfidence(false);
                }}
                placeholder="Spoken words will appear here. You can also edit or type directly..."
                className="w-full p-3 rounded-xl border border-[#1E293B] bg-[#0A0F1C] text-[#E2E8F0] placeholder-[#64748B] text-xs font-medium focus:border-[#14B8A6] outline-none transition-colors"
              />
              {lowConfidenceWords.length > 0 && isLowConfidence && (
                <p className="text-[11px] text-amber-400/90">
                  Uncertain words detected: <span className="font-semibold underline">{lowConfidenceWords.join(', ')}</span>. Please verify or edit before translating.
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  setTranscript('');
                  setInterimText('');
                  setAudioConfidence(null);
                  setAcousticConfidence(null);
                  setIsLowConfidence(false);
                  setLowConfidenceWords([]);
                  setEngineName(null);
                  setRecognitionError(null);
                  setEngineStatusNotice(null);
                  setTranscriptionMethod(null);
                }}
                className="text-xs text-[#64748B] hover:text-white flex items-center space-x-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={handleTranslate}
                disabled={isLoading || !transcript.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#14B8A6] to-[#0D9488] hover:from-[#22D3EE] hover:to-[#14B8A6] disabled:opacity-50 text-white font-semibold text-xs flex items-center space-x-2 shadow-md shadow-teal-500/20 transition-all hover:scale-[1.02]"
              >
                {isLoading ? (
                  <span>Translating NLP...</span>
                ) : (
                  <>
                    <span>Translate Speech</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Voice Simulation / Fallbacks */}
          <div className="p-4 rounded-2xl bg-[#0F172A] border border-[#1E293B] space-y-2">
            <h4 className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider">
              Verified Speech Sample Transcripts
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {VERIFIED_EXAMPLES.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSimulateVoice(item.text)}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-[#0A0F1C] border border-[#1E293B] hover:border-[#14B8A6]/50 text-[#CBD5E1] hover:text-white transition-all"
                >
                  &quot;{item.text}&quot;
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Output Pane (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Active Engine Diagnostic Notice */}
          {engineStatusNotice && (
            <div className="p-4 rounded-xl bg-teal-950/30 border border-teal-800/60 text-teal-300 text-xs flex items-start space-x-2.5 animate-fade-in shadow-xs">
              <Cpu className="w-4 h-4 shrink-0 mt-0.5 text-teal-400" />
              <div className="space-y-1">
                <span className="font-bold block">Speech Recognition Status:</span>
                <span>{engineStatusNotice}</span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {recognitionError && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-start space-x-2 animate-fade-in shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{recognitionError}</span>
            </div>
          )}

          {translationResult ? (
            <div className="space-y-6 animate-fade-in">
              <SignSequenceViewer
                key={`speech_${translationResult.request_id || translationResult.original_text}`}
                signs={translationResult.signs}
                aslGloss={translationResult.asl_gloss}
                originalText={translationResult.original_text}
                currentIndex={currentSignIndex}
                onIndexChange={setSignIndex}
                moduleId="speech"
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
                <Volume2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-white">Speech Stream Ready</h4>
              <p className="text-xs max-w-sm mx-auto text-[#64748B]">
                Record your voice or click a test phrase on the left to generate an authentic sign sequence.
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
