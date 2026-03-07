const SCROLL_EXPAND_CONFIG = {
  // Lower = faster expansion, higher = slower.
  scrollDuration: 700,

  scrollOffset: 0,

  /* Peak lateral (horizontal) curve offset in pixels.
       Positive = curves right, negative = curves left.
       0 = straight-line path. */
  curvePeak: 20,

  // Horizontal position easing
  easingX: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Vertical position easing
  easingY: (t) => t * (2 - t),

  // Size / scale easing
  easingSize: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Border-radius easing
  easingRadius: (t) => t * (2 - t),
};

(function () {
  "use strict";

  const CFG = SCROLL_EXPAND_CONFIG;

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const lerp = (a, b, t) => a + (b - a) * t;

  let welcomeImage;
  let fullSizeImage;
  let bottomImage;
  let firstName;
  let lastName;
  let clone;

  let startRect;
  let endRect;
  let animStart = 0;
  let animEnd = 1;
  let ticking = false;
  let lastProgress = -1;
  let resizeTimer = null;
  let measured = false;

  function init() {
    welcomeImage = document.getElementById("welcomeImage");
    fullSizeImage = document.querySelector(".fullSizeImage");
    bottomImage = document.querySelector(".imageContainer");
    firstName = document.getElementById("firstName");
    lastName = document.getElementById("lastName");

    if (!welcomeImage || !fullSizeImage || !bottomImage) return;

    createClone();
    prepareElements();
    waitForImages()
      .then(() => {
        measured = true;
        measure();
        onScroll();
      })
      .catch(() => {
        measured = true;
        measure();
        onScroll();
      });

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("load", () => {
      measured = true;
      measure();
      onScroll();
    });
  }

  function createClone() {
    if (clone) clone.remove();

    clone = welcomeImage.cloneNode(true);
    clone.removeAttribute("id");
    clone.setAttribute("aria-hidden", "true");
    clone.style.cssText = `
      position: fixed;
      pointer-events: none;
      display: none;
      object-fit: cover;
      margin: 0;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      z-index: 2;
      will-change: top, left, width, height, border-radius, opacity;
      border-radius: 30px;
    `;
    document.body.appendChild(clone);
  }

  function prepareElements() {
    fullSizeImage.style.opacity = "0";
    fullSizeImage.style.visibility = "hidden";
    bottomImage.style.opacity = "0";
    bottomImage.style.transition = "opacity 180ms ease";
    welcomeImage.style.willChange = "opacity";
    fullSizeImage.style.willChange = "opacity";
  }

  function waitForImages() {
    const images = [welcomeImage, fullSizeImage];

    return Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalWidth > 0) {
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          const done = () => {
            img.removeEventListener("load", done);
            img.removeEventListener("error", done);
            resolve();
          };

          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });
      }),
    );
  }

  function getRectInDocument(element) {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
    };
  }

  function measure() {
    if (!welcomeImage || !fullSizeImage) return;

    resetMeasuredStyles();

    startRect = getRectInDocument(welcomeImage);
    endRect = getRectInDocument(fullSizeImage);

    if (
      !startRect.width ||
      !startRect.height ||
      !endRect.width ||
      !endRect.height
    ) {
      return;
    }

    animStart = Math.max(
      0,
      startRect.top +
        startRect.height -
        window.innerHeight / 2 +
        CFG.scrollOffset,
    );

    animEnd = animStart + Math.max(CFG.scrollDuration, 1);

    applyProgress(lastProgress >= 0 ? lastProgress : 0);
  }

  function resetMeasuredStyles() {
    welcomeImage.style.opacity = "";
    fullSizeImage.style.opacity = "";
    fullSizeImage.style.visibility = "";
    fullSizeImage.style.height = "";
    fullSizeImage.style.marginTop = "";
    fullSizeImage.style.marginBottom = "";
    fullSizeImage.style.overflow = "";
    bottomImage.style.opacity = "";
    clone.style.display = "none";
  }

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      measure();
      onScroll();
    }, 100);
  }

  function onScroll() {
    if (!measured || !startRect || !endRect) return;

    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  function update() {
    ticking = false;

    const scrollY = window.scrollY;
    const raw = (scrollY - animStart) / (animEnd - animStart);
    const progress = clamp(raw, 0, 1);

    if (progress === lastProgress) return;
    lastProgress = progress;

    applyProgress(progress);
  }

  function hideTargetArea() {
    fullSizeImage.style.opacity = "0";
    fullSizeImage.style.visibility = "hidden";
    bottomImage.style.opacity = "0";
  }

  function showTargetArea() {
    fullSizeImage.style.opacity = "1";
    fullSizeImage.style.visibility = "visible";
    bottomImage.style.opacity = "1";
  }

  function getTextCoverOpacity(progress) {
    if (progress <= 0.08) return 0;
    if (progress >= 0.22) return 1;
    return (progress - 0.08) / 0.14;
  }

  function applyProgress(progress) {
    if (!clone || !startRect || !endRect) return;

    if (progress <= 0) {
      welcomeImage.style.opacity = "1";
      showWelcomeText();
      hideTargetArea();
      clone.style.display = "none";
      return;
    }

    if (progress >= 1) {
      welcomeImage.style.opacity = "0";
      hideWelcomeTextCover();
      showTargetArea();
      clone.style.display = "none";
      return;
    }

    welcomeImage.style.opacity = "0";
    hideTargetArea();
    clone.style.display = "block";

    const tX = CFG.easingX(progress);
    const tY = CFG.easingY(progress);
    const tSize = CFG.easingSize(progress);
    const tRadius = CFG.easingRadius(progress);

    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    const fromTop = startRect.top - scrollY;
    const fromLeft = startRect.left - scrollX;
    const toTop = endRect.top - scrollY;
    const toLeft = endRect.left - scrollX;

    const currentTop = lerp(fromTop, toTop, tY);
    const currentLeft = lerp(fromLeft, toLeft, tX);
    const currentWidth = lerp(startRect.width, endRect.width, tSize);
    const currentHeight = lerp(startRect.height, endRect.height, tSize);
    const curveOffset = CFG.curvePeak * Math.sin(progress * Math.PI);

    const startTopLeftRadius = 30;
    const startTopRightRadius = 30;
    const startBottomRightRadius = 30;
    const startBottomLeftRadius = 30;

    const endTopLeftRadius = endRect.height / 2;
    const endTopRightRadius = endRect.height / 2;
    const endBottomRightRadius = 30;
    const endBottomLeftRadius = 30;

    const currentTopLeftRadius = lerp(
      startTopLeftRadius,
      endTopLeftRadius,
      tRadius,
    );
    const currentTopRightRadius = lerp(
      startTopRightRadius,
      endTopRightRadius,
      tRadius,
    );
    const currentBottomRightRadius = lerp(
      startBottomRightRadius,
      endBottomRightRadius,
      tRadius,
    );
    const currentBottomLeftRadius = lerp(
      startBottomLeftRadius,
      endBottomLeftRadius,
      tRadius,
    );

    clone.style.top = `${currentTop}px`;
    clone.style.left = `${currentLeft + curveOffset}px`;
    clone.style.width = `${currentWidth}px`;
    clone.style.height = `${currentHeight}px`;
    clone.style.borderTopLeftRadius = `${currentTopLeftRadius}px`;
    clone.style.borderTopRightRadius = `${currentTopRightRadius}px`;
    clone.style.borderBottomRightRadius = `${currentBottomRightRadius}px`;
    clone.style.borderBottomLeftRadius = `${currentBottomLeftRadius}px`;
    clone.style.opacity = "1";

    updateWelcomeTextCover(progress);
  }

  function showWelcomeText() {
    if (firstName) firstName.style.opacity = "1";
    if (lastName) lastName.style.opacity = "1";
  }

  function hideWelcomeTextCover() {
    if (firstName) firstName.style.opacity = "1";
    if (lastName) lastName.style.opacity = "1";
  }

  function updateWelcomeTextCover(progress) {
    const fade = getTextCoverOpacity(progress);

    if (firstName) {
      firstName.style.opacity = `${1 - fade}`;
    }

    if (lastName) {
      lastName.style.opacity = `${1 - fade}`;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
