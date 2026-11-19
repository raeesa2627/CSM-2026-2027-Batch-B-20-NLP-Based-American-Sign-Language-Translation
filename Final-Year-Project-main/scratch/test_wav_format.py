import wave
import math
import struct
import subprocess
import tempfile
import os

temp = tempfile.gettempdir()
wav_path = os.path.join(temp, 'test_sine.wav').replace('\\', '/')
with wave.open(wav_path, 'wb') as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(16000)
    samples = [int(math.sin(2 * math.pi * 440 * i / 16000) * 10000) for i in range(16000)]
    wf.writeframes(struct.pack(f'<{len(samples)}h', *samples))

ps = f"""
Add-Type -AssemblyName System.Speech
$rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine
$rec.SetInputToWaveFile('{wav_path}')
$grammar = New-Object System.Speech.Recognition.DictationGrammar
$rec.LoadGrammar($grammar)
$result = $rec.Recognize([System.TimeSpan]::FromSeconds(2))
Write-Output "SUCCESS_16KHZ_WAV_PROCESSED"
$rec.Dispose()
"""

res = subprocess.run(['powershell', '-NoProfile', '-Command', ps], capture_output=True, text=True)
print('STDOUT:', res.stdout.strip())
print('STDERR:', res.stderr.strip())
if os.path.exists(wav_path):
    os.remove(wav_path)
