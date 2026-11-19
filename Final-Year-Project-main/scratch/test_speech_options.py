import subprocess
import os

def test_synthesis_and_recognition():
    ps_script = """
Add-Type -AssemblyName System.Speech

# 1. Synthesize audio to WAV
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$wavPath = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "asl_test_speech.wav")
$synth.SetOutputToWaveFile($wavPath)
$synth.Speak("Hello what is your name")
$synth.Dispose()

Write-Output "WAV created at $wavPath (Size: $((Get-Item $wavPath).Length) bytes)"

# 2. Recognize audio from WAV
$rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine
$rec.SetInputToWaveFile($wavPath)
$grammar = New-Object System.Speech.Recognition.DictationGrammar
$rec.LoadGrammar($grammar)

$result = $rec.Recognize((New-Object System.TimeSpan(0, 0, 10)))
if ($result) {
    Write-Output "RECOGNIZED_TEXT: $($result.Text)"
    Write-Output "CONFIDENCE: $($result.Confidence)"
} else {
    Write-Output "RECOGNIZED_TEXT: NONE"
}
$rec.Dispose()
Remove-Item $wavPath -ErrorAction SilentlyContinue
"""
    res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], capture_output=True, text=True)
    print("STDOUT:\n", res.stdout.strip())
    print("STDERR:\n", res.stderr.strip())

if __name__ == "__main__":
    test_synthesis_and_recognition()
