"use client";

/**
 * 리치 BGM. 리치가 새로 선언될 때마다 두 곡을 번갈아 재생하고(한 곡은 끝나면 같은 곡을
 * 바로 반복), 리치가 모두 사라지거나 국이 끝나면 멈춘다.
 *
 * 브라우저 오토플레이 정책상 재생은 반드시 사용자 제스처(리치 버튼 탭) 안에서 시작해야
 * 하므로 이 모듈은 상태 변화에 반응하지 않고, 호출하는 쪽에서 명시적으로 부른다.
 */
const TRACKS = ["/bgm/riichi-1.mp3", "/bgm/riichi-2.mp3"];

let audio: HTMLAudioElement | null = null;
let nextTrack = 0;

function ensureAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio();
    audio.loop = true;
    audio.preload = "auto";
  }
  return audio;
}

/** 새 리치 선언: 다음 곡으로 바꿔서 처음부터 재생한다. */
export function playNextRiichiBgm(): void {
  const a = ensureAudio();
  if (!a) return;
  const src = TRACKS[nextTrack % TRACKS.length];
  nextTrack = (nextTrack + 1) % TRACKS.length;
  try {
    a.pause();
    a.src = src;
    a.currentTime = 0;
    void a.play().catch(() => {
      // 오토플레이 차단 등 — 소리 없이 진행
    });
  } catch {
    // ignore
  }
}

export function stopRiichiBgm(): void {
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch {
    // ignore
  }
}

export function isRiichiBgmPlaying(): boolean {
  return !!audio && !audio.paused;
}
