import subprocess
import os

ps_script = """
Add-Type -AssemblyName System.Speech

$temp = [System.IO.Path]::GetTempPath()
$wav = [System.IO.Path]::Combine($temp, "hint_test.wav")

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SetOutputToWaveFile($wav)
$synth.Speak("Need doctor")
$synth.Dispose()

$rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine
$rec.SetInputToWaveFile($wav)

# Grammar with dictation
$dict = New-Object System.Speech.Recognition.DictationGrammar
$dict.Name = "Dictation"
$rec.LoadGrammar($dict)

# Grammar with ASL vocabulary phrases
$choices = New-Object System.Speech.Recognition.Choices
$phrases = @(
    "hello what your name",
    "my name",
    "how you today",
    "happy today",
    "you my friend",
    "my family good",
    "love my family",
    "like book",
    "want buy book",
    "where bathroom",
    "need water now",
    "please help",
    "want food",
    "food good",
    "have car",
    "come my house",
    "want go",
    "go school today",
    "my student",
    "my teacher good",
    "want learn",
    "need help",
    "where hospital",
    "need doctor",
    "sorry",
    "please stop now",
    "understand you",
    "no understand",
    "thank you help",
    "see you tomorrow"
)
$choices.Add($phrases)
$gb = New-Object System.Speech.Recognition.GrammarBuilder
$gb.Append($choices)
$vocabGrammar = New-Object System.Speech.Recognition.Grammar($gb)
$vocabGrammar.Name = "ASL_Phrases"
$vocabGrammar.Weight = 1.0
$dict.Weight = 0.5
$rec.LoadGrammar($vocabGrammar)

$res = $rec.Recognize([System.TimeSpan]::FromSeconds(10))
if ($res) {
    Write-Output "Grammar matched: $($res.Grammar.Name)"
    Write-Output "Text: $($res.Text)"
    Write-Output "Confidence: $($res.Confidence)"
} else {
    Write-Output "No match"
}
$rec.Dispose()
Remove-Item $wav -ErrorAction SilentlyContinue
"""

res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], capture_output=True, text=True)
print("STDOUT:", res.stdout.strip())
print("STDERR:", res.stderr.strip())
