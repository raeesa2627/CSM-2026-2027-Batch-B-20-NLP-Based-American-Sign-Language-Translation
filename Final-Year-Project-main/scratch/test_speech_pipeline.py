import urllib.request
import json
import os
import tempfile
import subprocess

def test_speech_to_sign_pipeline():
    print("--- Testing Complete Speech-to-Sign Pipeline ---")
    # 1. Synthesize audio
    temp = tempfile.gettempdir()
    wav_path = os.path.join(temp, "e2e_pipeline_test.wav").replace("\\", "/")
    
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

    # 2. Transcribe via POST /api/translate/transcribe-speech
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
        stt = res.get("data", {})
        transcript = stt.get("transcript")
        conf = stt.get("confidence")
        print(f"Transcribed Text: '{transcript}' (Confidence: {conf})")
        assert transcript is not None and len(transcript) > 0

    # 3. Translate transcript via POST /api/translate/speech
    trans_body = json.dumps({
        "transcript": transcript,
        "audioConfidence": conf,
        "strategy": "rag_grounded"
    }).encode("utf-8")

    req2 = urllib.request.Request(
        "http://localhost:5000/api/translate/speech",
        data=trans_body,
        headers={"Content-Type": "application/json"}
    )

    with urllib.request.urlopen(req2) as resp2:
        res2 = json.loads(resp2.read().decode('utf-8'))
        translation = res2.get("data", {})
        print("Translation Result:")
        print("  - ASL Gloss:", translation.get("asl_gloss"))
        print("  - Processing Method:", translation.get("processing_method"))
        print("  - Speech Confidence:", translation.get("confidence", {}).get("speech_confidence"))
        print("  - Signs:", [s.get("gloss") for s in translation.get("signs", [])])
        assert translation.get("asl_gloss") is not None
        assert len(translation.get("signs", [])) > 0
        print("Pipeline Verification Succeeded!")

    if os.path.exists(wav_path):
        os.remove(wav_path)

if __name__ == "__main__":
    test_speech_to_sign_pipeline()
