document.addEventListener("DOMContentLoaded", () => {
  const hero = document.getElementById("welcome");
  const image = document.getElementById("welcomeImage");
  const firstName = document.getElementById("firstName");
  const lastName = document.getElementById("lastName");
  const backgroundImg = document.getElementById("welcomeBackground");

  if (!hero || !image) return;

  const hasText = !!(firstName && lastName);
  const root = document.documentElement;
  const body = document.body;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const mix = (start, end, amount) => start + (end - start) * amount;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const START_SCALE = 0.4;
  const END_SCALE = 1;
  // 75 * 0.4 = 30; looks like 30px of border radius
  const START_RADIUS = 75;
  const END_RADIUS = 0;
  const LERP = 0.16;
  const WHEEL_SENSITIVITY = 1 / 520;
  const TOUCH_SENSITIVITY = 1 / 380;
  const COMPLETE_EPSILON = 0.001;
  const REACTIVATE_AT_TOP = 40;
  const OVERLAY_HIDE_OFFSET = 50;

  let rafId = null;
  let progress = 0;
  let progressTarget = 0;
  let introActive = true;
  let transitionRunning = false;
  let touchStartY = null;
  let savedScrollY = 0;
  let circleOverlay = null;
  let revealScrollDistance = window.innerHeight;
  let firstDeltaX = 0;
  let lastDeltaX = 0;

  // ── SCROLL LOCKING ──
  function lockScroll() {
    savedScrollY = window.pageYOffset || 0;
    body.style.position = "fixed";
    body.style.top = `-${savedScrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    root.style.overflow = "hidden";
  }

  function unlockScroll() {
    body.style.position = "";
    body.style.top = "";
    body.style.width = "";
    body.style.overflow = "";
    root.style.overflow = "";
    window.scrollTo(0, savedScrollY);
  }

  function hideCircleOverlay() {
    if (!circleOverlay) return;
    circleOverlay.style.opacity = "0";
    setTimeout(() => {
      circleOverlay.style.visibility = "hidden";
    }, 350);
  }

  function showCircleOverlay() {
    if (!circleOverlay) return;
    circleOverlay.style.opacity = "1";
    circleOverlay.style.visibility = "visible";
  }

  function syncCircleOverlayVisibility() {
    if (!circleOverlay) return;
    if (introActive || transitionRunning) {
      showCircleOverlay();
      return;
    }
    const scrollY = window.scrollY || 0;
    if (scrollY > getRevealScrollTarget() + OVERLAY_HIDE_OFFSET) {
      hideCircleOverlay();
    } else {
      showCircleOverlay();
    }
  }

  function updateHeroMetrics() {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const maxSize = Math.max(vw, vh);
    revealScrollDistance = Math.max(vh, Math.ceil(maxSize * END_SCALE));
    hero.style.minHeight = `${revealScrollDistance}px`;
  }

  function getRevealScrollTarget() {
    return revealScrollDistance;
  }

  function computeTextDeltas() {
    if (!hasText) return;
    const centerX = window.innerWidth / 2;
    const firstRect = firstName.getBoundingClientRect();
    const lastRect = lastName.getBoundingClientRect();
    firstDeltaX = centerX - (firstRect.left + firstRect.width / 2);
    lastDeltaX = centerX - (lastRect.left + lastRect.width / 2);
  }

  function setInteractiveStyles() {
    const squareSize = `${Math.max(window.innerWidth, window.innerHeight)}px`;

    Object.assign(image.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      width: squareSize,
      height: squareSize,
      objectFit: "cover",
      transformOrigin: "center center",
      zIndex: "2",
      transition: "none",
      willChange: "transform, opacity, border-radius",
      pointerEvents: "none",
      display: "block",
    });

    if (hasText) {
      [firstName, lastName].forEach((el) => {
        Object.assign(el.style, {
          position: "fixed",
          zIndex: "3",
          transition: "none",
          willChange: "transform",
          pointerEvents: "none",
          display: "block",
        });
      });
    }
  }

  function applyVisualState(rawProgress) {
    const p = clamp(rawProgress, 0, 1);
    const imageEase = easeOutCubic(p);
    const textEase = easeInOutCubic(p);

    const scale = mix(START_SCALE, END_SCALE, imageEase);
    const radius = mix(START_RADIUS, END_RADIUS, imageEase);

    image.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(4)})`;
    image.style.borderRadius = `${radius.toFixed(2)}px`;

    if (!hasText) return;

    const firstX = firstDeltaX * textEase;
    const lastX = lastDeltaX * textEase;
    const firstY = mix(0, 6, p);
    const lastY = mix(0, -6, p);

    firstName.style.transform = `translate3d(${firstX.toFixed(2)}px, ${firstY.toFixed(2)}px, 0)`;
    lastName.style.transform = `translate3d(${lastX.toFixed(2)}px, ${lastY.toFixed(2)}px, 0)`;
  }

  function showIntroElements() {
    image.style.display = "block";
    if (hasText) {
      firstName.style.display = "block";
      lastName.style.display = "block";
    }
    if (backgroundImg) backgroundImg.style.opacity = "0.3";
  }

  function hideIntroElements() {
    image.style.display = "none";
    if (hasText) {
      firstName.style.display = "none";
      lastName.style.display = "none";
    }
    if (backgroundImg) backgroundImg.style.opacity = "0";
  }

  function startLoop() {
    if (rafId === null) rafId = requestAnimationFrame(tick);
  }

  function tick() {
    rafId = null;
    progress += (progressTarget - progress) * LERP;
    if (Math.abs(progressTarget - progress) < 0.0008) progress = progressTarget;

    applyVisualState(progress);

    if (
      introActive &&
      progressTarget >= 1 &&
      progress >= 1 - COMPLETE_EPSILON &&
      !transitionRunning
    ) {
      completeIntro();
      return;
    }

    if (Math.abs(progressTarget - progress) > 0.0008) {
      rafId = requestAnimationFrame(tick);
    }
  }

  function createCircleOverlay() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const radius = Math.sqrt((vw / 2) ** 2 + (vh / 2) ** 2);
    const diameter = Math.ceil(radius * 2);

    const overlay = document.createElement("div");
    overlay.id = "heroCircleCover";
    Object.assign(overlay.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      width: `${diameter}px`,
      height: `${diameter}px`,
      marginLeft: `-${diameter / 2}px`,
      marginTop: `-${diameter / 2}px`,
      borderRadius: "50%",
      background: "hsl(326, 25%, 80%)",
      zIndex: "2",
      pointerEvents: "none",
      transform: "scale(0.001)",
      opacity: "1",
      visibility: "visible",
      transition:
        "transform 650ms cubic-bezier(.22,.86,.24,1), opacity 300ms ease",
    });
    return overlay;
  }

  function ensureCircleOverlay() {
    if (circleOverlay?.isConnected) return circleOverlay;
    circleOverlay = createCircleOverlay();
    body.appendChild(circleOverlay);
    return circleOverlay;
  }

  function beginInteractiveIntroState() {
    lockScroll();
    updateHeroMetrics();
    showIntroElements();
    setInteractiveStyles();
    computeTextDeltas();
    progress = 0;
    progressTarget = 0;
    applyVisualState(0);

    const overlay = ensureCircleOverlay();
    overlay.style.transform = "scale(0.001)";
    overlay.style.opacity = "1";
    overlay.style.visibility = "visible";
  }

  function completeIntro() {
    if (transitionRunning) return;
    transitionRunning = true;
    introActive = false;

    const overlay = ensureCircleOverlay();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.transform = "scale(1)";
      });
    });

    overlay.addEventListener(
      "transitionend",
      () => {
        hideIntroElements(); // hides image, text, AND background
        hero.style.minHeight = "100vh";

        unlockScroll();
        transitionRunning = false;

        window.scrollTo({ top: getRevealScrollTarget(), behavior: "instant" });
        setTimeout(syncCircleOverlayVisibility, 80);
      },
      { once: true },
    );
  }

  function reactivateIntroFromTop() {
    if (introActive || transitionRunning) return;
    if ((window.scrollY || 0) > REACTIVATE_AT_TOP) return;

    transitionRunning = true;
    beginInteractiveIntroState();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        introActive = true;
        transitionRunning = false;
        syncCircleOverlayVisibility();
        startLoop();
      });
    });
  }

  function adjustProgress(delta) {
    if (transitionRunning || !introActive) return;
    progressTarget = clamp(progressTarget + delta, 0, 1);
    startLoop();
  }

  // ── EVENTS ──
  function onWheel(e) {
    if (introActive) {
      e.preventDefault();
      adjustProgress(e.deltaY * WHEEL_SENSITIVITY);
    }
  }

  function onTouchStart(e) {
    if (e.touches?.length) touchStartY = e.touches[0].clientY;
  }

  function onTouchMove(e) {
    if (!e.touches?.length || touchStartY === null) return;
    const delta = touchStartY - e.touches[0].clientY;

    if (introActive) {
      e.preventDefault();
      adjustProgress(delta * TOUCH_SENSITIVITY);
    }
    touchStartY = e.touches[0].clientY;
  }

  function onKeyDown(e) {
    if (transitionRunning || !introActive) return;
    if (["ArrowDown", "PageDown", " "].includes(e.key)) {
      e.preventDefault();
      progressTarget = 1;
      startLoop();
    } else if (["ArrowUp", "PageUp"].includes(e.key)) {
      e.preventDefault();
      adjustProgress(-0.22);
    }
  }

  function onResize() {
    updateHeroMetrics();
    if (circleOverlay) {
      const newOverlay = createCircleOverlay();
      const oldTransform = circleOverlay.style.transform;
      circleOverlay.replaceWith(newOverlay);
      circleOverlay = newOverlay;
      circleOverlay.style.transform = oldTransform || "scale(0.001)";
    }
    if (introActive) {
      setInteractiveStyles();
      computeTextDeltas();
      applyVisualState(progress);
    }
    syncCircleOverlayVisibility();
  }

  function onScroll() {
    syncCircleOverlayVisibility();
    if ((window.scrollY || 0) <= REACTIVATE_AT_TOP) {
      reactivateIntroFromTop();
    }
  }

  // ── INIT ──
  updateHeroMetrics();
  beginInteractiveIntroState();
  startLoop();

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("touchstart", onTouchStart, { passive: false });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", () => {
    touchStartY = null;
  });
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", onResize);
  window.addEventListener("scroll", onScroll, { passive: true });
});
