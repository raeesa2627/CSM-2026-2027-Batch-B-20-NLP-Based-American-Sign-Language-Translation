import os
import io
import wave
import struct
import math
import re
import subprocess
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.speech.speech_engine import speech_engine

client = TestClient(app)

TARGET_PHRASES = [
    ("P1_Greeting", "Hi, nice to meet you."),
    ("P2_Inquiry", "Hello, how are you today?"),
    ("P3_Request", "I need some water, please."),
    ("P4_Emergency", "Where is the hospital?"),
    ("P5_Gratitude", "Thank you for helping me.")
]

def generate_tts_wav(text: str, wav_path: str, rate: int = 0, sample_rate: int = 16000, channels: int = 1):
    clean_path = wav_path.replace(os.sep, "/")
    escaped = text.replace('"', '`"')
    ps = f"""
Add-Type -AssemblyName System.Speech
$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speak.Rate = {rate}
$speak.SetOutputToWaveFile('{clean_path}', [System.Speech.AudioFormat.SpeechAudioFormatInfo]::new({sample_rate}, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono))
$speak.Speak('{escaped}')
$speak.Dispose()
"""
    res = subprocess.run(["powershell", "-NoProfile", "-Command", ps], capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"TTS synthesis failed: {res.stderr}")

def normalize_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def levenshtein(seq1, seq2):
    size_x = len(seq1) + 1
    size_y = len(seq2) + 1
    matrix = [[0] * size_y for _ in range(size_x)]
    for x in range(size_x):
        matrix[x][0] = x
    for y in range(size_y):
        matrix[0][y] = y
    for x in range(1, size_x):
        for y in range(1, size_y):
            if seq1[x-1] == seq2[y-1]:
                matrix[x][y] = matrix[x-1][y-1]
            else:
                matrix[x][y] = min(matrix[x-1][y] + 1, matrix[x-1][y-1] + 1, matrix[x][y-1] + 1)
    return matrix[size_x - 1][size_y - 1]

def calculate_wer(ref: str, hyp: str) -> float:
    ref_words = normalize_text(ref).split()
    hyp_words = normalize_text(hyp).split()
    if not ref_words:
        return 0.0 if not hyp_words else 1.0
    return levenshtein(ref_words, hyp_words) / len(ref_words)

def test_five_core_conversational_phrases():
    """
    Test real acoustic speech recognition accuracy across the 5 target sentences:
    - 'Hi, nice to meet you.'
    - 'Hello, how are you today?'
    - 'I need some water, please.'
    - 'Where is the hospital?'
    - 'Thank you for helping me.'
    """
    total_wer = 0.0
    results = []

    for item_id, ref_text in TARGET_PHRASES:
        wav_path = os.path.abspath(f"test_conv_{item_id}.wav")
        try:
            generate_tts_wav(ref_text, wav_path)
            with open(wav_path, "rb") as f:
                wav_bytes = f.read()

            res = client.post("/ai/speech/transcribe", files={"audio": ("speech.wav", wav_bytes, "audio/wav")})
            assert res.status_code == 200
            data = res.json()
            assert data["success"] is True

            hyp_text = data["transcript"]
            wer = calculate_wer(ref_text, hyp_text)
            total_wer += wer
            results.append((ref_text, hyp_text, wer, data["confidence"]))

            # Each sentence must have WER <= 10%
            assert wer <= 0.10, f"High WER ({wer*100:.1f}%) on '{ref_text}': got '{hyp_text}'"
            assert data["confidence"] >= 0.70

        finally:
            if os.path.exists(wav_path):
                os.remove(wav_path)

    avg_wer = total_wer / len(TARGET_PHRASES)
    print(f"\n[Conversation Accuracy Regression] Avg WER: {avg_wer*100:.2f}% across {len(TARGET_PHRASES)} phrases")
    for ref, hyp, wer, conf in results:
        print(f"  Ref: '{ref}' -> Hyp: '{hyp}' (WER: {wer*100:.1f}%, Conf: {conf:.2f})")
    assert avg_wer <= 0.02, f"Average WER ({avg_wer*100:.2f}%) exceeds 2% threshold"

def test_audio_preprocessing_stereo_resampling():
    """Verify that stereo 44.1kHz audio is automatically downmixed and resampled to 16kHz mono."""
    # Generate 44.1kHz stereo synthetic audio with speech-like tone
    sample_rate = 44100
    n_samples = int(sample_rate * 0.5)
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wf:
        wf.setnchannels(2) # Stereo
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        samples = []
        for i in range(n_samples):
            s = int(math.sin(2 * math.pi * 300 * i / sample_rate) * 12000)
            samples.extend([s, s]) # Left and Right
        wf.writeframes(struct.pack(f'<{len(samples)}h', *samples))

    stereo_bytes = buf.getvalue()
    processed_bytes = speech_engine.preprocess_audio_bytes(stereo_bytes)

    with wave.open(io.BytesIO(processed_bytes), 'rb') as wf:
        assert wf.getnchannels() == 1, "Must be downmixed to mono"
        assert wf.getframerate() == 16000, "Must be resampled to 16kHz"
        assert wf.getsampwidth() == 2, "Must be 16-bit PCM"

def test_audio_preprocessing_peak_normalization():
    """Verify that quiet audio (e.g. peak amplitude 0.10) is normalized to ~0.85 without digital clipping."""
    sample_rate = 16000
    n_samples = int(sample_rate * 0.4)
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        # Low amplitude peak ~3276 (peak_norm = 0.10)
        samples = [int(math.sin(2 * math.pi * 400 * i / sample_rate) * 3200) for i in range(n_samples)]
        wf.writeframes(struct.pack(f'<{len(samples)}h', *samples))

    quiet_bytes = buf.getvalue()
    normalized_bytes = speech_engine.preprocess_audio_bytes(quiet_bytes)

    with wave.open(io.BytesIO(normalized_bytes), 'rb') as wf:
        nframes = wf.getnframes()
        frames = wf.readframes(nframes)
        samples = struct.unpack(f'<{nframes}h', frames)
        peak = max(abs(s) for s in samples)
        peak_norm = peak / 32767.0
        # Peak should be normalized into 0.75 - 0.90 range
        assert 0.75 <= peak_norm <= 0.92, f"Expected normalized peak ~0.85, got {peak_norm:.2f}"

def test_api_error_handling_empty_and_silent():
    """Verify that empty, corrupted, or silent audio produces clear informative errors."""
    # 1. Empty upload -> 400
    res_empty = client.post("/ai/speech/transcribe", files={"audio": ("empty.wav", b"", "audio/wav")})
    assert res_empty.status_code == 400

    # 2. Digital silence -> graceful error notice
    silence_buf = io.BytesIO()
    with wave.open(silence_buf, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        wf.writeframes(b'\x00\x00' * 16000) # 1.0s zero frames
    res_silence = client.post("/ai/speech/transcribe", files={"audio": ("silence.wav", silence_buf.getvalue(), "audio/wav")})
    assert res_silence.status_code == 200
    data = res_silence.json()
    assert data["success"] is False
    assert "silence" in data["error"].lower()
