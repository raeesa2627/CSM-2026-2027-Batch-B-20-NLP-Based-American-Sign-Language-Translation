import subprocess
import json
import os
import tempfile
import time

def transcribe_wav_with_windows(wav_path: str) -> dict:
    t0 = time.time()
    ps_script = f"""
Add-Type -AssemblyName System.Speech
$rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine
try {{
    $rec.SetInputToWaveFile("{wav_path.replace('\\', '/')}")
    $grammar = New-Object System.Speech.Recognition.DictationGrammar
    $rec.LoadGrammar($grammar)
    $result = $rec.Recognize([System.TimeSpan]::FromSeconds(15))
    if ($result -and $result.Text) {{
        [PSCustomObject]@{{
            Success = $true
            Text = $result.Text
            Confidence = [math]::Round($result.Confidence, 3)
        }} | ConvertTo-Json -Compress
    }} else {{
        [PSCustomObject]@{{
            Success = $true
            Text = ""
            Confidence = 0.0
        }} | ConvertTo-Json -Compress
    }}
}} catch {{
    [PSCustomObject]@{{
        Success = $false
        Error = $_.Exception.Message
        Text = ""
        Confidence = 0.0
    }} | ConvertTo-Json -Compress
}} finally {{
    $rec.Dispose()
}}
"""
    res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], capture_output=True, text=True)
    elapsed = time.time() - t0
    stdout = res.stdout.strip()
    try:
        data = json.loads(stdout)
        data["elapsed_s"] = round(elapsed, 3)
        return data
    except Exception as e:
        return {"Success": False, "Error": f"JSON parse error: {e}, Raw: {stdout}", "elapsed_s": round(elapsed, 3)}

def create_synthetic_test_wav(text: str, out_wav: str):
    ps_synth = f"""
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SetOutputToWaveFile("{out_wav.replace('\\', '/')}")
$synth.Speak("{text}")
$synth.Dispose()
"""
    subprocess.run(["powershell", "-NoProfile", "-Command", ps_synth], check=True)

if __name__ == "__main__":
    temp_dir = tempfile.gettempdir()
    test_wav = os.path.join(temp_dir, "test_stt_sample.wav")
    
    print("1. Creating test WAV with speech: 'Where is the bathroom'...")
    create_synthetic_test_wav("Where is the bathroom", test_wav)
    print("   Created:", test_wav, os.path.getsize(test_wav), "bytes")
    
    print("2. Transcribing with Windows Speech Recognition...")
    result = transcribe_wav_with_windows(test_wav)
    print("   Result:", json.dumps(result, indent=2))
    
    if os.path.exists(test_wav):
        os.remove(test_wav)
