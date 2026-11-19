import sys
sys.path.insert(0, '.')
from app.speech.speech_engine import speech_engine
import subprocess
import tempfile
import os

p = os.path.join(tempfile.gettempdir(), 'test_speech_eng.wav').replace('\\', '/')
ps = f"""
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SetOutputToWaveFile('{p}')
$s.Speak('Where is the bathroom')
$s.Dispose()
"""
subprocess.run(['powershell', '-NoProfile', '-Command', ps], check=True)

with open(p, 'rb') as f:
    b = f.read()

res = speech_engine.transcribe_audio(b, 'test.wav')
print('SpeechEngine Result:', res)

if os.path.exists(p):
    os.remove(p)
