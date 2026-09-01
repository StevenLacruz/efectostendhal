(() => {
  const root = document.documentElement;
  const video = document.querySelector("[data-video]");
  const playbackBtn = document.querySelector("[data-playback]");
  const soundBtn = document.querySelector("[data-sound]");
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const setAppHeight = () => {
    const height = Math.round(window.visualViewport?.height ?? window.innerHeight);
    root.style.setProperty("--app-height", `${height}px`);
  };

  setAppHeight();
  window.addEventListener("resize", setAppHeight);
  window.visualViewport?.addEventListener("resize", setAppHeight);
  window.visualViewport?.addEventListener("scroll", setAppHeight);

  if (!video) return;

  video.playsInline = true;
  video.controls = false;
  video.muted = true;
  video.defaultMuted = true;
  video.setAttribute("muted", "");

  const syncPlaybackUi = () => {
    const paused = video.paused;
    video.closest(".showreel__frame")?.setAttribute("data-paused", String(paused));
    if (playbackBtn) {
      playbackBtn.setAttribute("aria-label", paused ? "Reproducir showreel" : "Pausar showreel");
    }
    if (paused) root.style.setProperty("--loop-opacity", "1");
  };

  const syncSoundUi = () => {
    const muted = video.muted;
    video.closest(".showreel__frame")?.setAttribute("data-muted", String(muted));
    if (soundBtn) {
      soundBtn.setAttribute("aria-pressed", String(!muted));
      soundBtn.setAttribute("aria-label", muted ? "Activar sonido" : "Silenciar");
    }
  };

  const tryPlay = async () => {
    try {
      await video.play();
    } catch {
      video.muted = true;
      video.defaultMuted = true;
      video.setAttribute("muted", "");
      try {
        await video.play();
      } catch {
        /* Autoplay bloqueado: el poster permanece visible. */
      }
    }
    syncPlaybackUi();
    syncSoundUi();
  };

  if (video.readyState >= 2) tryPlay();
  else video.addEventListener("canplay", tryPlay, { once: true });

  video.addEventListener("play", syncPlaybackUi);
  video.addEventListener("pause", syncPlaybackUi);
  video.addEventListener("volumechange", syncSoundUi);
  syncPlaybackUi();
  syncSoundUi();

  const setMuted = (muted) => {
    video.muted = muted;
    video.defaultMuted = muted;
    if (muted) video.setAttribute("muted", "");
    else {
      video.removeAttribute("muted");
      video.volume = 1;
    }
    syncSoundUi();
  };

  playbackBtn?.addEventListener("click", async () => {
    if (video.muted && !video.paused) {
      setMuted(false);
      void video.play();
      return;
    }

    if (video.paused) {
      try {
        await video.play();
      } catch {
        await tryPlay();
      }
    } else {
      video.pause();
    }
    syncPlaybackUi();
  });

  soundBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    setMuted(!video.muted);
    if (!video.muted) void video.play();
  });

  if (prefersReducedMotion) return;

  const fadeWindow = 0.4;
  const syncLoopFade = () => {
    if (video.paused) {
      root.style.setProperty("--loop-opacity", "1");
      return;
    }

    const duration = video.duration;
    if (!duration || Number.isNaN(duration)) return;

    const remaining = duration - video.currentTime;
    let opacity = 1;

    if (remaining < fadeWindow) {
      opacity = Math.max(remaining / fadeWindow, 0);
    } else if (video.currentTime < fadeWindow) {
      opacity = Math.min(video.currentTime / fadeWindow, 1);
    }

    root.style.setProperty("--loop-opacity", opacity.toFixed(3));
  };

  video.addEventListener("timeupdate", syncLoopFade);
})();
