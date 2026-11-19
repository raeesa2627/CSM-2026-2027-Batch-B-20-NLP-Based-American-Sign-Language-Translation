/**
 * WAV Encoding and Audio Normalization Utilities for ASL Bridge AI.
 * Ensures consistent 16kHz 16-bit mono PCM encoding with dynamic range normalization.
 */

/**
 * Remove DC bias and gently normalize peak speech level to ~0.85 without clipping or amplifying noise.
 */
export function normalizeAudioSamples(samples: Float32Array): Float32Array {
  if (samples.length === 0) return samples;

  // 1. Calculate DC offset and peak amplitude
  let sum = 0.0;
  let peak = 0.0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i];
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }
  const mean = sum / samples.length;

  // 2. Determine gain factor
  // If peak is between 0.04 and 0.70 (typical quiet speech), normalize to 0.85
  // If peak is already loud (>0.85), clamp gain to 1.0 or scale down if clipping >0.98
  let gain = 1.0;
  if (peak > 0.04 && peak < 0.70) {
    gain = 0.85 / peak;
  } else if (peak >= 0.98) {
    gain = 0.95 / peak; // headroom to prevent digital clipping distortion
  }

  const normalized = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    // Remove DC offset and apply gain
    const val = (samples[i] - mean) * gain;
    normalized[i] = Math.max(-1.0, Math.min(1.0, val));
  }

  return normalized;
}

/**
 * Encode Float32 audio samples into standard 16-bit PCM mono WAV Blob.
 * Automatically normalizes levels and strips DC bias for maximum speech recognition accuracy.
 */
export function encodeWAV(samples: Float32Array, sampleRate: number = 16000, shouldNormalize: boolean = true): Blob {
  const processedSamples = shouldNormalize ? normalizeAudioSamples(samples) : samples;
  const buffer = new ArrayBuffer(44 + processedSamples.length * 2);
  const view = new DataView(buffer);

  // Helper to write ASCII strings
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + processedSamples.length * 2, true); // ChunkSize
  writeString(8, 'WAVE');

  // "fmt " sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true); // SampleRate (e.g. 16000 Hz)
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample (16 bits)

  // "data" sub-chunk
  writeString(36, 'data');
  view.setUint32(40, processedSamples.length * 2, true); // Subchunk2Size

  // Write PCM audio samples (16-bit signed integer)
  let offset = 44;
  for (let i = 0; i < processedSamples.length; i++, offset += 2) {
    const s = Math.max(-1.0, Math.min(1.0, processedSamples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

/**
 * Resample raw Float32Array audio data from sourceRate to targetRate using linear interpolation.
 */
export function resampleFloat32(channelData: Float32Array, sourceRate: number, targetRate: number = 16000): Float32Array {
  if (sourceRate === targetRate || channelData.length === 0) {
    return channelData;
  }

  const ratio = sourceRate / targetRate;
  const newLength = Math.max(1, Math.round(channelData.length / ratio));
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const originIdx = i * ratio;
    const low = Math.floor(originIdx);
    const high = Math.min(low + 1, channelData.length - 1);
    const weight = originIdx - low;
    result[i] = channelData[low] * (1 - weight) + channelData[high] * weight;
  }

  return result;
}

/**
 * Resample an AudioBuffer to target sample rate (16kHz mono).
 */
export function resampleAudio(audioBuffer: AudioBuffer, targetSampleRate: number = 16000): Float32Array {
  return resampleFloat32(audioBuffer.getChannelData(0), audioBuffer.sampleRate, targetSampleRate);
}
