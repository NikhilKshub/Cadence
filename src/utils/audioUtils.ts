// Cadence — Audio utility functions
// Helpers for audio file handling, format detection, and metadata

import type { AudioFormat } from '../types/song';

/** Supported audio file extensions */
export const SUPPORTED_FORMATS: AudioFormat[] = ['mp3', 'flac', 'wav', 'ogg', 'aac', 'm4a'];

/** MIME types for supported audio formats */
export const FORMAT_MIME_TYPES: Record<AudioFormat, string> = {
  mp3: 'audio/mpeg',
  flac: 'audio/flac',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  aac: 'audio/aac',
  m4a: 'audio/mp4',
};

/**
 * Check if a file extension is a supported audio format
 */
export function isSupportedFormat(extension: string): boolean {
  const normalized = extension.toLowerCase().replace('.', '') as AudioFormat;
  return SUPPORTED_FORMATS.includes(normalized);
}

/**
 * Extract the file extension from a file path
 */
export function getFileExtension(filePath: string): string {
  const parts = filePath.split('.');
  return parts[parts.length - 1]?.toLowerCase() ?? '';
}

/**
 * Determine the AudioFormat from a file path
 */
export function getAudioFormat(filePath: string): AudioFormat | null {
  const ext = getFileExtension(filePath) as AudioFormat;
  return SUPPORTED_FORMATS.includes(ext) ? ext : null;
}

/**
 * Generate a Tauri asset URL for a local file path.
 * Used to load audio files and album art via Tauri's asset protocol.
 */
export function toAssetUrl(filePath: string): string {
  // Tauri 2.0 uses the asset protocol to serve local files
  return `asset://localhost/${encodeURIComponent(filePath)}`;
}
