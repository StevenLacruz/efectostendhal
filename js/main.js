(() => {
  const root = document.documentElement;
  const video = document.querySelector("[data-video]");
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

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.controls = false;
  video.setAttribute("muted", "");

  const tryPlay = async () => {
    try {
      await video.play();
    } catch {
      video.muted = true;
      try {
        await video.play();
      } catch {
        /* Autoplay bloqueado: el poster permanece visible. */
      }
    }
  };

  if (video.readyState >= 2) tryPlay();
  else video.addEventListener("canplay", tryPlay, { once: true });

  if (prefersReducedMotion) return;

  const fadeWindow = 0.4;
  const syncLoopFade = () => {
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
