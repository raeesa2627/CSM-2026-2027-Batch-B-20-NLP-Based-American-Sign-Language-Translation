import pytest
import io
import wave
import struct
import math
import subprocess
import os
from fastapi.testclient import TestClient
from app.main import app
from app.speech.speech_engine import speech_engine

client = TestClient(app)

def create_synthetic_wav(freq: int = 440, duration_s: float = 0.5, sample_rate: int = 16000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        n_samples = int(duration_s * sample_rate)
        samples = [int(math.sin(2 * math.pi * freq * i / sample_rate) * 8000) for i in range(n_samples)]
        wf.writeframes(struct.pack(f'<{len(samples)}h', *samples))
    return buf.getvalue()

def generate_tts_wav(text: str, wav_path: str):
    clean_path = wav_path.replace("\\", "/")
    ps = f"""
Add-Type -AssemblyName System.Speech
$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speak.SetOutputToWaveFile('{clean_path}', [System.Speech.AudioFormat.SpeechAudioFormatInfo]::new(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono))
$speak.Speak('{text}')
$speak.Dispose()
"""
    subprocess.run(["powershell", "-NoProfile", "-Command", ps], capture_output=True, text=True)

def test_speech_engine_health():
    res = client.get("/ai/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["components"]["speech_engine"] == "ready"

def test_speech_engine_empty_audio():
    res = speech_engine.transcribe_audio(b"")
    assert res["success"] is False
    assert "empty" in res["error"].lower()

def test_speech_transcribe_endpoint_empty():
    res = client.post("/ai/speech/transcribe", files={"audio": ("empty.wav", b"", "audio/wav")})
    assert res.status_code == 400

def test_speech_transcribe_synthetic_audio():
    wav_bytes = create_synthetic_wav(440, 0.5)
    res = client.post("/ai/speech/transcribe", files={"audio": ("test.wav", wav_bytes, "audio/wav")})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "transcript" in data
    assert "confidence" in data
    assert data["method"] in ["whisper_offline", "windows_sapi_legacy"]

def test_speech_accuracy_target_sentence():
    """Verify exact transcription accuracy for 'Hello, how are you? What is your name?'"""
    wav_path = os.path.abspath("test_target_phrase.wav")
    try:
        generate_tts_wav("Hello, how are you? What is your name?", wav_path)
        with open(wav_path, "rb") as f:
            wav_bytes = f.read()

        res = client.post("/ai/speech/transcribe", files={"audio": ("phrase.wav", wav_bytes, "audio/wav")})
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True

        clean_transcript = data["transcript"].lower().replace(",", "").replace("?", "").strip()
        expected = "hello how are you what is your name"
        assert clean_transcript == expected, f"Expected '{expected}', got '{clean_transcript}'"

        # Check truthful confidence
        assert data["confidence"] >= 0.70, f"Expected high word confidence, got {data['confidence']}"
        assert data["is_low_confidence"] is False
        assert data["method"] == "whisper_offline"
    finally:
        if os.path.exists(wav_path):
            os.remove(wav_path)
