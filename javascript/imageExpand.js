/*
  falconbird18.github.io/javascript/imageExpand.js

  Simplified hero intro sequence:
  - Locks native scrolling while the intro is active
  - Wheel / touch / keyboard drive a virtual progress value from 0..1
  - Hero image scales up while the title text slides toward center
  - Completing the intro reveals page content
  - Returning to the actual top of the page re-activates the hero cleanly
  - Reverse playback is intentionally removed to avoid glitchy state conflicts
*/

document.addEventListener("DOMContentLoaded", () => {
  const hero = document.getElementById("welcome");
  const image = document.getElementById("welcomeImage");
  const firstName = document.getElementById("firstName");
  const lastName = document.getElementById("lastName");

  if (!hero || !image) return;

  const hasText = !!(firstName && lastName);
  const root = document.documentElement;
  const body = document.body;

  const previousHtmlOverflow = root.style.overflow || "";
  const previousBodyOverflow = body.style.overflow || "";

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const mix = (start, end, amount) => start + (end - start) * amount;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const START_SCALE = 0.36;
  const END_SCALE = 1;
  const START_RADIUS = 28;
  const END_RADIUS = 0;
  const LERP = 0.14;
  const WHEEL_SENSITIVITY = 1 / 900;
  const TOUCH_SENSITIVITY = 1 / 420;
  const COMPLETE_EPSILON = 0.001;
  const REACTIVATE_AT_TOP = 2;

  let rafId = null;
  let progress = 0;
  let progressTarget = 0;
  let introActive = true;
  let transitionRunning = false;
  let touchStartY = null;
  let firstDeltaX = 0;
  let lastDeltaX = 0;

  function lockScroll() {
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
  }

  function unlockScroll() {
    root.style.overflow = previousHtmlOverflow;
    body.style.overflow = previousBodyOverflow;
  }

  function getRevealScrollTarget() {
    return hero.offsetHeight || window.innerHeight;
  }

  function computeTextDeltas() {
    if (!hasText) {
      firstDeltaX = 0;
      lastDeltaX = 0;
      return;
    }

    const centerX = window.innerWidth / 2;
    const firstRect = firstName.getBoundingClientRect();
    const lastRect = lastName.getBoundingClientRect();

    firstDeltaX = centerX - (firstRect.left + firstRect.width / 2);
    lastDeltaX = centerX - (lastRect.left + lastRect.width / 2);
  }

  function setInteractiveStyles() {
    Object.assign(image.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      width: "100vw",
      height: "100vh",
      objectFit: "cover",
      transformOrigin: "center center",
      zIndex: "20",
      transition: "none",
      willChange: "transform, opacity, border-radius, filter, box-shadow",
      backfaceVisibility: "hidden",
      pointerEvents: "none",
      display: "",
    });

    if (hasText) {
      [firstName, lastName].forEach((el) => {
        Object.assign(el.style, {
          position: "fixed",
          zIndex: "30",
          transition: "none",
          willChange: "transform, opacity, filter, letter-spacing",
          backfaceVisibility: "hidden",
          display: "",
          pointerEvents: "none",
        });
      });
    }
  }

  function clearHeroInlineStyles() {
    [
      "position",
      "top",
      "left",
      "width",
      "height",
      "objectFit",
      "transformOrigin",
      "zIndex",
      "transition",
      "willChange",
      "backfaceVisibility",
      "pointerEvents",
      "display",
      "transform",
      "opacity",
      "borderRadius",
      "filter",
      "boxShadow",
      "letterSpacing",
    ].forEach((prop) => {
      image.style[prop] = "";
    });

    if (hasText) {
      [firstName, lastName].forEach((el) => {
        [
          "position",
          "zIndex",
          "transition",
          "willChange",
          "backfaceVisibility",
          "pointerEvents",
          "display",
          "transform",
          "opacity",
          "filter",
          "letterSpacing",
        ].forEach((prop) => {
          el.style[prop] = "";
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
    const imageOpacity = mix(0.8, 1, imageEase);
    const imageBlur = mix(8, 0, imageEase);
    const imageBrightness = mix(0.9, 1, imageEase);
    const imageSaturate = mix(0.94, 1, imageEase);
    const imageShadow = mix(34, 8, imageEase);

    image.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(4)})`;
    image.style.borderRadius = `${radius.toFixed(2)}px`;
    image.style.opacity = imageOpacity.toFixed(3);
    image.style.filter = `blur(${imageBlur.toFixed(2)}px) brightness(${imageBrightness.toFixed(3)}) saturate(${imageSaturate.toFixed(3)})`;
    image.style.boxShadow = `0 24px ${imageShadow.toFixed(2)}px rgba(0, 0, 0, 0.24)`;

    if (!hasText) return;

    const firstX = firstDeltaX * textEase;
    const lastX = lastDeltaX * textEase;
    const textOpacity = mix(1, 0.86, p);
    const textBlur = mix(0, 1.2, p);
    const spacing = mix(0, 2, p);
    const firstY = mix(0, 6, p);
    const lastY = mix(0, -6, p);

    firstName.style.transform = `translate3d(${firstX.toFixed(2)}px, ${firstY.toFixed(2)}px, 0)`;
    lastName.style.transform = `translate3d(${lastX.toFixed(2)}px, ${lastY.toFixed(2)}px, 0)`;

    firstName.style.opacity = textOpacity.toFixed(3);
    lastName.style.opacity = textOpacity.toFixed(3);

    firstName.style.filter = `blur(${textBlur.toFixed(2)}px)`;
    lastName.style.filter = `blur(${textBlur.toFixed(2)}px)`;

    firstName.style.letterSpacing = `${spacing.toFixed(2)}px`;
    lastName.style.letterSpacing = `${spacing.toFixed(2)}px`;
  }

  function startLoop() {
    if (rafId === null) {
      rafId = requestAnimationFrame(tick);
    }
  }

  function tick() {
    rafId = null;

    progress += (progressTarget - progress) * LERP;

    if (Math.abs(progressTarget - progress) < 0.0008) {
      progress = progressTarget;
    }

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
    const background =
      window.getComputedStyle(body).backgroundColor || "#ffffff";

    overlay.id = "heroCircleCover";
    Object.assign(overlay.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      width: `${diameter}px`,
      height: `${diameter}px`,
      marginLeft: `${-diameter / 2}px`,
      marginTop: `${-diameter / 2}px`,
      borderRadius: "50%",
      background,
      zIndex: "40",
      pointerEvents: "none",
      willChange: "transform, opacity",
      backfaceVisibility: "hidden",
      transform: "scale(0.001)",
      transition: "transform 650ms cubic-bezier(.22,.86,.24,1)",
    });

    return overlay;
  }

  function completeIntro() {
    transitionRunning = true;
    introActive = false;

    const overlay = createCircleOverlay();
    body.appendChild(overlay);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.transform = "scale(1)";
      });
    });

    overlay.addEventListener(
      "transitionend",
      () => {
        image.style.display = "none";
        if (hasText) {
          firstName.style.display = "none";
          lastName.style.display = "none";
        }

        unlockScroll();
        transitionRunning = false;

        const targetY = getRevealScrollTarget();
        window.scrollTo({ top: targetY, behavior: "smooth" });

        overlay.style.transition = "opacity 380ms ease";
        overlay.style.opacity = "1";

        setTimeout(() => {
          overlay.style.opacity = "0";
          setTimeout(() => {
            overlay.remove();
          }, 400);
        }, 120);
      },
      { once: true },
    );
  }

  function reactivateIntroFromTop() {
    if (introActive || transitionRunning) return;
    if ((window.scrollY || window.pageYOffset || 0) > REACTIVATE_AT_TOP) return;

    transitionRunning = true;
    lockScroll();

    progress = 0;
    progressTarget = 0;

    setInteractiveStyles();
    computeTextDeltas();
    applyVisualState(0);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        introActive = true;
        transitionRunning = false;
      });
    });
  }

  function adjustProgress(delta) {
    if (!introActive || transitionRunning) return;

    progressTarget = clamp(progressTarget + delta, 0, 1);
    startLoop();
  }

  function onWheel(event) {
    if (!introActive) return;
    event.preventDefault();
    adjustProgress(event.deltaY * WHEEL_SENSITIVITY);
  }

  function onTouchStart(event) {
    if (!event.touches || !event.touches.length) return;
    touchStartY = event.touches[0].clientY;
  }

  function onTouchMove(event) {
    if (!introActive) return;
    if (!event.touches || !event.touches.length) return;
    if (touchStartY === null) {
      touchStartY = event.touches[0].clientY;
      return;
    }

    const currentY = event.touches[0].clientY;
    const delta = touchStartY - currentY;

    event.preventDefault();
    adjustProgress(delta * TOUCH_SENSITIVITY);

    touchStartY = currentY;
  }

  function onTouchEnd() {
    touchStartY = null;
  }

  function onKeyDown(event) {
    if (!introActive || transitionRunning) return;

    if (
      event.key === "ArrowDown" ||
      event.key === "PageDown" ||
      event.key === " "
    ) {
      event.preventDefault();
      progressTarget = 1;
      startLoop();
      return;
    }

    if (event.key === "ArrowUp" || event.key === "PageUp") {
      event.preventDefault();
      adjustProgress(-0.16);
    }
  }

  function onResize() {
    if (!introActive) return;
    computeTextDeltas();
    applyVisualState(progress);
  }

  function onScroll() {
    if ((window.scrollY || window.pageYOffset || 0) <= REACTIVATE_AT_TOP) {
      reactivateIntroFromTop();
    }
  }

  setInteractiveStyles();
  computeTextDeltas();
  applyVisualState(0);
  lockScroll();

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("touchstart", onTouchStart, { passive: false });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", onTouchEnd, { passive: false });
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", onResize);
  window.addEventListener("scroll", onScroll, { passive: true });

  startLoop();
});
