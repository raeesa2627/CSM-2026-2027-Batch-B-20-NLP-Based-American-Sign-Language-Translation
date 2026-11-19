import os
import io
import sys
import re
import wave
import time
import math
import uuid
import struct
import logging
import tempfile
import subprocess
from typing import Dict, Any, Optional, List

logger = logging.getLogger("asl_bridge.speech")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

class SpeechEngine:
    """
    Enhanced Offline Speech Recognition Engine for ASL Bridge AI.
    Primary: OpenAI Whisper (base.en, configurable via WHISPER_MODEL) via faster-whisper (CPU int8 transformer).
    Features: Built-in Silero VAD, DC bias removal, dynamic peak normalization, word timestamps, true confidence calibration.
    Fallback: Native Windows SAPI 5.4.
    """

    def __init__(self):
        self.is_windows = sys.platform == "win32"
        self.model_name = os.getenv("WHISPER_MODEL", "base.en")
        self.whisper_model = None
        self._init_whisper()
        if not self.whisper_model and self.is_windows:
            self._check_windows_sapi()

    def _init_whisper(self):
        try:
            from faster_whisper import WhisperModel
            logger.info(f"[SpeechEngine] Loading faster-whisper neural model ({self.model_name}, int8 CPU)...")
            t0 = time.time()
            self.whisper_model = WhisperModel(self.model_name, device="cpu", compute_type="int8")
            logger.info(f"[SpeechEngine] faster-whisper ({self.model_name}) loaded in {time.time() - t0:.2f}s")
        except Exception as e:
            logger.warning(f"[SpeechEngine] Failed to initialize faster-whisper ({self.model_name}): {e}. Retrying with tiny.en fallback...")
            try:
                from faster_whisper import WhisperModel
                self.model_name = "tiny.en"
                self.whisper_model = WhisperModel("tiny.en", device="cpu", compute_type="int8")
                logger.info("[SpeechEngine] Fallback to faster-whisper tiny.en succeeded.")
            except Exception as e2:
                logger.error(f"[SpeechEngine] Failed to initialize faster-whisper fallback: {e2}")
                self.whisper_model = None

    def _check_windows_sapi(self):
        try:
            test_script = """
Add-Type -AssemblyName System.Speech
$rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine
Write-Output $rec.RecognizerInfo.Description
$rec.Dispose()
"""
            res = subprocess.run(
                ["powershell", "-NoProfile", "-Command", test_script],
                capture_output=True,
                text=True,
                timeout=5
            )
            if res.returncode == 0 and res.stdout.strip():
                logger.info(f"[SpeechEngine] Windows SAPI fallback available: {res.stdout.strip()}")
        except Exception as e:
            logger.warning(f"[SpeechEngine] Windows SAPI check notice: {e}")

    def inspect_audio(self, audio_bytes: bytes) -> Dict[str, Any]:
        """
        Inspect WAV header, sample rate, channels, duration, and signal energy.
        """
        try:
            with wave.open(io.BytesIO(audio_bytes), 'rb') as wf:
                channels = wf.getnchannels()
                sampwidth = wf.getsampwidth()
                framerate = wf.getframerate()
                nframes = wf.getnframes()
                duration_s = round(nframes / framerate, 2) if framerate > 0 else 0.0

                # Sample frames to compute RMS and check silence
                sample_frames = wf.readframes(min(nframes, framerate * 2))
                is_all_zero = True
                sum_sq = 0.0
                num_samples = 0

                if sampwidth == 2 and sample_frames:
                    fmt = f"<{len(sample_frames)//2}h"
                    ints = struct.unpack(fmt, sample_frames)
                    if any(v != 0 for v in ints):
                        is_all_zero = False
                    num_samples = len(ints)
                    sum_sq = sum((v / 32768.0) ** 2 for v in ints)

                rms = math.sqrt(sum_sq / num_samples) if num_samples > 0 else 0.0

                return {
                    "is_valid_wav": True,
                    "channels": channels,
                    "bits": sampwidth * 8,
                    "sample_rate": framerate,
                    "frames": nframes,
                    "duration_s": duration_s,
                    "is_all_zero": is_all_zero,
                    "rms_energy": round(rms, 4)
                }
        except Exception as e:
            return {
                "is_valid_wav": False,
                "error": str(e),
                "duration_s": 0.0,
                "is_all_zero": True,
                "rms_energy": 0.0
            }

    def preprocess_audio_bytes(self, audio_bytes: bytes) -> bytes:
        """
        Universal Audio Quality Enhancer:
        1. Decodes and resamples ANY incoming audio (WebM, stereo, 44.1kHz, 48kHz, 24-bit, etc.)
           into standard 16 kHz 16-bit mono PCM.
        2. Strips DC bias (centers waveform at 0.0).
        3. Gently normalizes peak speech levels to ~0.85 without digital clipping.
        """
        try:
            # Check if input is already valid 16kHz mono 16-bit WAV
            is_clean_16k_mono = False
            try:
                with wave.open(io.BytesIO(audio_bytes), 'rb') as wf:
                    if wf.getnchannels() == 1 and wf.getsampwidth() == 2 and wf.getframerate() == 16000:
                        is_clean_16k_mono = True
            except Exception:
                is_clean_16k_mono = False

            raw_wav_bytes = audio_bytes
            if not is_clean_16k_mono:
                try:
                    import av
                    container = av.open(io.BytesIO(audio_bytes))
                    resampler = av.AudioResampler(format='s16', layout='mono', rate=16000)
                    out_chunks = []
                    for frame in container.decode(audio=0):
                        for rf in resampler.resample(frame):
                            out_chunks.append(bytes(rf.planes[0]))
                    raw_pcm = b''.join(out_chunks)

                    out_buf = io.BytesIO()
                    with wave.open(out_buf, 'wb') as out_wf:
                        out_wf.setnchannels(1)
                        out_wf.setsampwidth(2)
                        out_wf.setframerate(16000)
                        out_wf.writeframes(raw_pcm)
                    raw_wav_bytes = out_buf.getvalue()
                except Exception as av_err:
                    logger.warning(f"[SpeechEngine] PyAV normalization notice: {av_err}")
                    raw_wav_bytes = audio_bytes

            # Now perform DC offset removal & peak gain normalization on 16kHz mono WAV
            with wave.open(io.BytesIO(raw_wav_bytes), 'rb') as wf:
                channels = wf.getnchannels()
                sampwidth = wf.getsampwidth()
                framerate = wf.getframerate()
                nframes = wf.getnframes()

                if sampwidth != 2 or channels != 1 or nframes == 0:
                    return raw_wav_bytes

                raw_frames = wf.readframes(nframes)
                samples = list(struct.unpack(f"<{nframes}h", raw_frames))

                # 1. DC bias removal
                mean_val = sum(samples) / len(samples)
                centered = [s - mean_val for s in samples]

                # 2. Peak normalization
                peak = max(abs(s) for s in centered) if centered else 0
                max_16bit = 32767.0
                peak_norm = peak / max_16bit

                gain = 1.0
                if 0.04 < peak_norm < 0.70:
                    gain = 0.85 / peak_norm
                elif peak_norm >= 0.98:
                    gain = 0.95 / peak_norm

                if gain != 1.0:
                    normalized = [int(max(-max_16bit, min(max_16bit, s * gain))) for s in centered]
                else:
                    normalized = [int(max(-max_16bit, min(max_16bit, s))) for s in centered]

                out_buf = io.BytesIO()
                with wave.open(out_buf, 'wb') as out_wf:
                    out_wf.setnchannels(1)
                    out_wf.setsampwidth(2)
                    out_wf.setframerate(framerate)
                    out_wf.writeframes(struct.pack(f"<{len(normalized)}h", *normalized))
                return out_buf.getvalue()

        except Exception as e:
            logger.warning(f"[SpeechEngine] Preprocessing notice: {e}, passing raw audio.")
            return audio_bytes

    def transcribe_audio(self, audio_bytes: bytes, filename: str = "audio.wav") -> Dict[str, Any]:
        """
        Transcribe uploaded audio bytes into English text and true confidence diagnostics.
        """
        t0 = time.time()
        if not audio_bytes or len(audio_bytes) < 44:
            return {
                "success": False,
                "transcript": "",
                "confidence": 0.0,
                "error": "Audio file is empty or corrupted (insufficient byte length).",
                "method": "offline"
            }

        audio_info = self.inspect_audio(audio_bytes)
        logger.info(f"[SpeechEngine] Processing audio: {len(audio_bytes)} bytes | {audio_info}")

        # Check for silent audio
        if audio_info.get("is_all_zero", False) and audio_info.get("duration_s", 0) > 0.3:
            return {
                "success": False,
                "transcript": "",
                "confidence": 0.0,
                "error": "The recorded audio contains only digital silence (zero signal). Please check your microphone input.",
                "duration_ms": int((time.time() - t0) * 1000),
                "method": "offline"
            }

        temp_path = None
        try:
            # Preprocess audio to normalize levels and remove DC bias
            processed_bytes = self.preprocess_audio_bytes(audio_bytes)

            temp_dir = tempfile.gettempdir()
            temp_path = os.path.join(temp_dir, f"asl_speech_{uuid.uuid4().hex[:10]}.wav")
            with open(temp_path, "wb") as f:
                f.write(processed_bytes)

            # Primary: Whisper neural engine
            if self.whisper_model is not None:
                return self._transcribe_whisper(temp_path, audio_info, t0)
            
            # Fallback: Windows SAPI
            if self.is_windows:
                return self._transcribe_sapi(temp_path, audio_info, t0)

            return {
                "success": False,
                "transcript": "",
                "confidence": 0.0,
                "error": "No speech recognition engine available on this platform.",
                "duration_ms": int((time.time() - t0) * 1000),
                "method": "unavailable"
            }

        except Exception as e:
            logger.error(f"[SpeechEngine] Transcription error: {e}", exc_info=True)
            return {
                "success": False,
                "transcript": "",
                "confidence": 0.0,
                "error": str(e),
                "duration_ms": int((time.time() - t0) * 1000),
                "method": "error"
            }
        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass

    def _transcribe_whisper(self, wav_path: str, audio_info: Dict[str, Any], t0: float) -> Dict[str, Any]:
        """
        Execute faster-whisper neural transcription with VAD, word-level confidence and domain prompting.
        """
        segments, info = self.whisper_model.transcribe(
            wav_path,
            beam_size=5,
            language="en",
            vad_filter=True,
            vad_parameters=dict(
                min_silence_duration_ms=300,
                speech_pad_ms=100,
                threshold=0.5
            ),
            initial_prompt="ASL sign communication. Clear English questions, greetings, everyday phrases.",
            condition_on_previous_text=False,
            repetition_penalty=1.2,
            no_repeat_ngram_size=3,
            word_timestamps=True,
            compression_ratio_threshold=2.4,
            no_speech_threshold=0.6
        )

        seg_list = list(segments)
        elapsed_ms = int((time.time() - t0) * 1000)

        if not seg_list:
            return {
                "success": True,
                "transcript": "",
                "confidence": 0.0,
                "acoustic_confidence": 0.0,
                "is_low_confidence": False,
                "engine": f"Whisper {self.model_name} (Enhanced Neural STT)",
                "method": "whisper_offline",
                "duration_ms": elapsed_ms,
                "audio_duration_s": float(audio_info.get("duration_s", 0.0)),
                "words": []
            }

        # Check if entire audio was classified as no-speech
        max_no_speech_prob = max((s.no_speech_prob for s in seg_list), default=0.0)
        if max_no_speech_prob > 0.75:
            logger.info(f"[SpeechEngine] Audio classified as non-speech (p={max_no_speech_prob:.2f})")

        words_data: List[Dict[str, Any]] = []
        all_word_probs: List[float] = []
        all_text_parts: List[str] = []
        logprob_sum = 0.0

        for seg in seg_list:
            text = seg.text.strip()
            if text:
                all_text_parts.append(text)
            logprob_sum += seg.avg_logprob

            if seg.words:
                for w in seg.words:
                    clean_w = w.word.strip()
                    if clean_w:
                        words_data.append({
                            "word": clean_w,
                            "start": round(float(w.start), 2),
                            "end": round(float(w.end), 2),
                            "confidence": round(float(w.probability), 3)
                        })
                        all_word_probs.append(float(w.probability))

        full_transcript = " ".join(all_text_parts).strip()
        # Clean duplicate punctuation artifacts if any
        full_transcript = re.sub(r"\s+([.,?!])", r"\1", full_transcript)
        full_transcript = re.sub(r"\.{2,}", ".", full_transcript)
        # Clean consecutive duplicate repeated words (e.g. "please. Please." -> "please.")
        full_transcript = re.sub(r'\b([a-zA-Z]+)([.?!,])?\s+\1\2?\b', r'\1\2', full_transcript, flags=re.IGNORECASE)
        full_transcript = full_transcript.strip()

        avg_logprob = logprob_sum / len(seg_list) if seg_list else -1.0
        # True acoustic probability from logprob: exp(avg_logprob)
        acoustic_confidence = round(max(0.0, min(1.0, math.exp(avg_logprob))), 3)

        # Word-level confidence: mean of word probabilities
        if all_word_probs:
            word_confidence = round(sum(all_word_probs) / len(all_word_probs), 2)
        else:
            word_confidence = round(acoustic_confidence, 2)

        # Identify low confidence words (< 0.50)
        low_confidence_words = [w["word"] for w in words_data if w["confidence"] < 0.50]
        is_low = bool(word_confidence < 0.60 or (len(words_data) > 0 and len(low_confidence_words) > (len(words_data) // 2)))

        return {
            "success": True,
            "transcript": full_transcript,
            "confidence": float(word_confidence),
            "acoustic_confidence": float(acoustic_confidence),
            "avg_logprob": float(round(avg_logprob, 3)),
            "is_low_confidence": is_low,
            "low_confidence_words": low_confidence_words,
            "engine": f"Whisper {self.model_name} (Enhanced Neural STT)",
            "method": "whisper_offline",
            "duration_ms": int(elapsed_ms),
            "audio_duration_s": float(audio_info.get("duration_s", 0.0)),
            "words": words_data
        }

    def _transcribe_sapi(self, wav_path: str, audio_info: Dict[str, Any], t0: float) -> Dict[str, Any]:
        """
        Fallback using Windows System.Speech.Recognition with honest confidence reporting.
        """
        normalized_path = wav_path.replace("\\", "/")
        ps_script = f"""
Add-Type -AssemblyName System.Speech
$rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine
try {{
    $rec.SetInputToWaveFile('{normalized_path}')
    $dictGrammar = New-Object System.Speech.Recognition.DictationGrammar
    $rec.LoadGrammar($dictGrammar)

    $segments = @()
    $confidenceSum = 0.0
    $count = 0

    while ($true) {{
        try {{
            $result = $rec.Recognize()
            if ($null -eq $result) {{ break }}
            if ($result.Text -and $result.Text.Trim().Length -gt 0) {{
                $segments += $result.Text.Trim()
                $confidenceSum += $result.Confidence
                $count++
            }}
        }} catch {{
            break
        }}
    }}

    $fullText = ($segments -join " ").Trim()
    $avgConfidence = if ($count -gt 0) {{ [math]::Round(($confidenceSum / $count), 3) }} else {{ 0.0 }}

    [PSCustomObject]@{{
        Success = $true
        Text = $fullText
        Confidence = $avgConfidence
        UtteranceCount = $count
    }} | ConvertTo-Json -Compress
}} catch {{
    [PSCustomObject]@{{
        Success = $false
        Error = $_.Exception.Message
        Text = ""
        Confidence = 0.0
        UtteranceCount = 0
    }} | ConvertTo-Json -Compress
}} finally {{
    $rec.Dispose()
}}
"""
        res = subprocess.run(
            ["powershell", "-NoProfile", "-Command", ps_script],
            capture_output=True,
            text=True,
            timeout=25
        )

        import json
        raw_out = res.stdout.strip()
        elapsed_ms = int((time.time() - t0) * 1000)

        if not raw_out:
            return {
                "success": False,
                "transcript": "",
                "confidence": 0.0,
                "error": "Windows speech recognizer returned no output.",
                "duration_ms": elapsed_ms,
                "method": "windows_sapi_legacy"
            }

        data = json.loads(raw_out)
        text = (data.get("Text") or "").strip()
        raw_conf = float(data.get("Confidence") or 0.0)

        is_low = bool(raw_conf < 0.60)
        return {
            "success": bool(data.get("Success", True)),
            "transcript": text,
            "confidence": float(raw_conf),
            "acoustic_confidence": float(raw_conf),
            "is_low_confidence": is_low,
            "low_confidence_words": [],
            "engine": "Windows SAPI 5.4 (Legacy)",
            "method": "windows_sapi_legacy",
            "duration_ms": int(elapsed_ms),
            "audio_duration_s": float(audio_info.get("duration_s", 0.0)),
            "words": []
        }

speech_engine = SpeechEngine()
