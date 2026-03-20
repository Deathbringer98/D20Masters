import { getAssetUrl } from "./utils";

export function createAudioAsset(fileName, volume) {
  const initialSrc = getAssetUrl(fileName);
  const audio = new Audio(initialSrc);
  audio.preload = "auto";
  audio.volume = volume;
  audio.setAttribute("data-src", initialSrc);
  return audio;
}

export function cleanupAudioAsset(audioRef) {
  if (!audioRef) return;
  audioRef.pause();
  audioRef.currentTime = 0;
}