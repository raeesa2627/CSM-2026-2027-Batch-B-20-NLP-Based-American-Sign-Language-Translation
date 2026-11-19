import urllib.request
import json
import os
import tempfile
import subprocess

def test_health():
    print("--- 1. Testing AI Service Health ---")
    req = urllib.request.Request("http://localhost:8000/ai/health")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print("AI Service Health:", json.dumps(data, indent=2))
        assert data.get("status") == "healthy"
        assert data.get("components", {}).get("speech_engine") == "ready"

    print("\n--- 2. Testing Backend Health ---")
    req = urllib.request.Request("http://localhost:5000/api/health")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print("Backend Health:", json.dumps(data, indent=2))
        assert data.get("status") in ["healthy", "ok"]
        assert data.get("aiService") == "reachable"

    print("\n--- 3. Testing Frontend Dev Server ---")
    req = urllib.request.Request("http://localhost:5173/speech-to-sign")
    with urllib.request.urlopen(req) as resp:
        print(f"Frontend Status: {resp.status}")
        assert resp.status == 200

def test_transcribe_endpoint_end_to_end():
    print("\n--- 4. Testing Speech Transcription via Backend Gateway ---")
    # Generate test WAV
    temp = tempfile.gettempdir()
    wav_path = os.path.join(temp, "e2e_speech_test.wav").replace("\\", "/")
    
    ps = f"""
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SetOutputToWaveFile('{wav_path}')
$s.Speak('Where is the bathroom')
$s.Dispose()
"""
    subprocess.run(["powershell", "-NoProfile", "-Command", ps], check=True)
    
    with open(wav_path, "rb") as f:
        wav_bytes = f.read()

    # Form multipart/form-data
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="audio"; filename="recording.wav"\r\n'
        f"Content-Type: audio/wav\r\n\r\n"
    ).encode("utf-8") + wav_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req = urllib.request.Request(
        "http://localhost:5000/api/translate/transcribe-speech",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )

    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print("Transcription Response from Backend Gateway:")
        print(json.dumps(res, indent=2))
        assert res.get("success") is True
        stt = res.get("data", {})
        assert stt.get("success") is True
        assert "bathroom" in stt.get("transcript", "").lower()
        print("Verified: Backend Gateway successfully transcribed audio via Windows native speech engine!")

    if os.path.exists(wav_path):
        os.remove(wav_path)

if __name__ == "__main__":
    test_health()
    test_transcribe_endpoint_end_to_end()
