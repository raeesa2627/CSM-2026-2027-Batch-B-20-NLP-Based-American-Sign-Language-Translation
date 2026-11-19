import os
import io
import re
import wave
import struct
import math
import time
import subprocess
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def generate_tts_wav(text: str, wav_path: str, rate: int = 0):
    clean_path = wav_path.replace("\\", "/")
    escaped = text.replace('"', '`"')
    ps = f"""
Add-Type -AssemblyName System.Speech
$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speak.Rate = {rate}
$speak.SetOutputToWaveFile('{clean_path}', [System.Speech.AudioFormat.SpeechAudioFormatInfo]::new(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono))
$speak.Speak('{escaped}')
$speak.Dispose()
"""
    res = subprocess.run(["powershell", "-NoProfile", "-Command", ps], capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"TTS synthesis failed: {res.stderr}")

def levenshtein_distance(seq1, seq2):
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

def normalize_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def calculate_wer_cer(ref: str, hyp: str):
    ref_norm = normalize_text(ref)
    hyp_norm = normalize_text(hyp)
    ref_words = ref_norm.split()
    hyp_words = hyp_norm.split()
    wer = levenshtein_distance(ref_words, hyp_words) / max(1, len(ref_words))
    cer = levenshtein_distance(ref_norm, hyp_norm) / max(1, len(ref_norm))
    return wer, cer

BENCHMARK_SUITE = [
    ("B1_Greeting_Question", "Hello, how are you? What is your name?", 0),
    ("B2_Compound_Sentence", "I need water now, and my family wants to buy food today.", 0),
    ("B3_Emergency_Pause", "Where is the hospital? Please help, I need a doctor now.", -1),
    ("B4_Education_Statement", "My teacher is very good and the students want to learn.", 0),
    ("B5_Fast_Speech_Imperative", "I do not understand what you want, please stop and help me.", 1),
    ("B6_Short_Courtesy", "Thank you. See you tomorrow.", 0)
]

def test_speech_benchmark_accuracy():
    """
    Benchmark test verifying high transcription accuracy across conversational, question,
    and emergency sentences with WER <= 5% and CER <= 3%.
    """
    total_wer = 0.0
    total_cer = 0.0
    latencies = []

    for item_id, ref_text, rate in BENCHMARK_SUITE:
        wav_file = os.path.abspath(f"bench_{item_id}.wav")
        try:
            generate_tts_wav(ref_text, wav_file, rate=rate)
            with open(wav_file, "rb") as f:
                wav_bytes = f.read()

            t0 = time.time()
            res = client.post("/ai/speech/transcribe", files={"audio": ("speech.wav", wav_bytes, "audio/wav")})
            latency = time.time() - t0
            latencies.append(latency)

            assert res.status_code == 200
            data = res.json()
            assert data["success"] is True

            hyp_text = data["transcript"]
            wer, cer = calculate_wer_cer(ref_text, hyp_text)
            total_wer += wer
            total_cer += cer

            # Individual utterance check: WER should be <= 15% even under variations
            assert wer <= 0.15, f"[{item_id}] High WER ({wer*100:.1f}%): Ref='{ref_text}' vs Hyp='{hyp_text}'"
            assert data["confidence"] >= 0.70

        finally:
            if os.path.exists(wav_file):
                os.remove(wav_file)

    avg_wer = total_wer / len(BENCHMARK_SUITE)
    avg_cer = total_cer / len(BENCHMARK_SUITE)
    avg_latency = sum(latencies) / len(latencies)

    print(f"\n[SPEECH BENCHMARK] Avg WER: {avg_wer*100:.2f}% | Avg CER: {avg_cer*100:.2f}% | Avg Latency: {avg_latency:.2f}s")
    assert avg_wer <= 0.05, f"Average WER ({avg_wer*100:.2f}%) exceeds target of 5%"
    assert avg_cer <= 0.03, f"Average CER ({avg_cer*100:.2f}%) exceeds target of 3%"
    assert avg_latency <= 3.5, f"Average latency ({avg_latency:.2f}s) exceeds target"
