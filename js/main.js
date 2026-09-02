(() => {
  const root = document.documentElement;
  const video = document.querySelector("[data-video]");
  const frame = document.querySelector(".showreel__frame");
  const playbackBtn = document.querySelector("[data-playback]");
  const soundBtn = document.querySelector("[data-sound]");
  const soundLabel = document.querySelector("[data-sound-label]");
  const timecode = document.querySelector("[data-timecode]");
  const poster = document.querySelector("[data-poster]");
  const modal = document.querySelector("[data-modal]");
  const modalCard = modal?.querySelector(".modal__card");
  const openContactBtns = document.querySelectorAll("[data-open-contact]");
  const closeContactBtns = document.querySelectorAll("[data-close-contact]");
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

  const pad = (value) => String(value).padStart(2, "0");

  const renderTimecode = () => {
    if (!video || !timecode) return;
    const current = video.currentTime || 0;
    const mins = Math.floor(current / 60);
    const secs = Math.floor(current % 60);
    const frames = Math.floor((current % 1) * 24);
    timecode.textContent = `${pad(mins)}:${pad(secs)}:${pad(frames)}`;
  };

  let wantsSound = true;

  const syncPlaybackUi = () => {
    if (!video || !frame) return;
    const paused = video.paused;
    frame.setAttribute("data-paused", String(paused));
    playbackBtn?.setAttribute(
      "aria-label",
      paused ? "Reproducir showreel" : "Pausar showreel"
    );
    if (paused) root.style.setProperty("--loop-opacity", "1");
  };

  const syncSoundUi = () => {
    if (!video || !frame) return;
    frame.setAttribute("data-muted", String(!wantsSound));
    soundBtn?.classList.toggle("is-live", wantsSound);
    soundBtn?.setAttribute("aria-pressed", String(wantsSound));
    soundBtn?.setAttribute("aria-label", wantsSound ? "Silenciar" : "Activar sonido");
    if (soundLabel) soundLabel.textContent = wantsSound ? "Sonido activo" : "Audio";
  };

  const markReady = () => {
    frame?.classList.add("is-ready");
    poster?.setAttribute("aria-hidden", "true");
  };

  const setMuted = (muted) => {
    if (!video) return;
    video.muted = muted;
    video.defaultMuted = muted;
    if (muted) video.setAttribute("muted", "");
    else {
      video.removeAttribute("muted");
      video.volume = 1;
    }
    syncSoundUi();
  };

  const tryPlay = async () => {
    if (!video) return;

    if (wantsSound) {
      setMuted(false);
      try {
        await video.play();
        markReady();
        syncPlaybackUi();
        syncSoundUi();
        return;
      } catch {
        /* El navegador bloquea autoplay con sonido: el vídeo sigue, el audio se abre al primer gesto. */
      }
    }

    setMuted(true);
    try {
      await video.play();
      markReady();
    } catch {
      /* Autoplay bloqueado: el poster permanece visible. */
    }
    syncPlaybackUi();
    syncSoundUi();
  };

  const unlockSound = () => {
    if (!video || !wantsSound || !video.muted) return;
    setMuted(false);
    void video.play();
  };

  if (video) {
    video.playsInline = true;
    video.controls = false;
    video.volume = 1;
    setMuted(!wantsSound);

    if (video.readyState >= 2) {
      markReady();
      tryPlay();
    } else {
      video.addEventListener("canplay", () => {
        markReady();
        tryPlay();
      }, { once: true });
    }

    video.addEventListener("play", syncPlaybackUi);
    video.addEventListener("pause", syncPlaybackUi);
    video.addEventListener("volumechange", syncSoundUi);
    video.addEventListener("timeupdate", renderTimecode);
    video.addEventListener("error", () => {
      frame?.classList.remove("is-ready");
    });

    const unlockEvents = ["pointerdown", "keydown", "touchstart"];
    const onFirstGesture = () => {
      unlockSound();
      unlockEvents.forEach((type) => {
        window.removeEventListener(type, onFirstGesture, true);
      });
    };
    unlockEvents.forEach((type) => {
      window.addEventListener(type, onFirstGesture, { capture: true });
    });

    syncPlaybackUi();
    syncSoundUi();
    renderTimecode();
  }

  playbackBtn?.addEventListener("click", async () => {
    if (!video) return;

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
    if (!video) return;
    wantsSound = !wantsSound;
    setMuted(!wantsSound);
    if (wantsSound) void video.play();
  });

  if (video && !prefersReducedMotion) {
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
  }

  const copyTimeouts = new WeakMap();

  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const value = button.getAttribute("data-copy");
      if (!value) return;

      try {
        await navigator.clipboard.writeText(value);
      } catch {
        return;
      }

      const group = button.closest("[data-copy-group]");
      if (!group) return;
      group.classList.add("is-copied");

      const previous = copyTimeouts.get(group);
      if (previous) window.clearTimeout(previous);
      copyTimeouts.set(
        group,
        window.setTimeout(() => {
          group.classList.remove("is-copied");
        }, 2000)
      );
    });
  });

  let lastFocus = null;

  const openModal = () => {
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    modal.inert = false;
    modal.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => {
      modal.classList.add("is-open");
      document.body.classList.add("is-locked");
      modalCard?.focus();
    });
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.inert = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    window.setTimeout(() => {
      if (!modal.classList.contains("is-open")) modal.hidden = true;
    }, 380);
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  };

  openContactBtns.forEach((button) => {
    button.addEventListener("click", openModal);
  });

  closeContactBtns.forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal?.classList.contains("is-open")) {
      closeModal();
    }
  });
})();
