const SCROLL_EXPAND_CONFIG = {
  /* How many pixels of scrolling the full animation spans.
       Lower = faster expansion, higher = slower.               */
  scrollDuration: 600,

  /* Extra scroll offset (px) after #rightImage leaves the
       viewport center before animation begins.                 */
  scrollOffset: 100,

  /* Peak lateral (horizontal) curve offset in pixels.
       Positive = curves right, negative = curves left.
       0 = straight-line path.                                  */
  curvePeak: 80,

  /* Easing functions (t goes from 0 → 1).
       These shape the path the image takes.
       ------------------------------------------------
       Presets you can swap in:
         linear:      t => t
         easeIn:      t => t * t
         easeOut:     t => t * (2 - t)
         easeInOut:   t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t
         easeInCubic: t => t * t * t
         easeOutCubic:t => (--t)*t*t+1
         snap:        t => { const s = 1.70158; return t*t*((s+1)*t - s); }
       ------------------------------------------------        */

  // Horizontal position easing (controls the curve shape)
  easingX: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t), // easeInOut

  // Vertical position easing
  easingY: (t) => t * (2 - t), // easeOut

  // Size / scale easing
  easingSize: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t), // easeInOut

  // Border-radius easing
  easingRadius: (t) => t * (2 - t), // easeOut
};

/* ==========================================================
   Implementation — you shouldn't need to touch this unless
   you want to change the core behaviour.
   ========================================================== */

(function () {
  "use strict";

  const CFG = SCROLL_EXPAND_CONFIG;

  // Clamp helper
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  // Lerp helper
  const lerp = (a, b, t) => a + (b - a) * t;

  let rightImage, fullSizeImage, clone;
  let startRect, endRect;
  let animStart, animEnd;
  let ticking = false;
  let lastProgress = -1;
  let resizeTimer;

  function init() {
    rightImage = document.getElementById("rightImage");
    fullSizeImage = document.querySelector(".fullSizeImage");

    if (!rightImage || !fullSizeImage) return;

    // Create fixed-position clone for the animation
    clone = rightImage.cloneNode(true);
    clone.removeAttribute("id");
    clone.style.cssText = `
            position: fixed;
            pointer-events: none;
            will-change: transform, width, height, border-radius;
            display: none;
            object-fit: cover;
            margin: 0;
        `;
    document.body.appendChild(clone);

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    // Run once on load in case already scrolled
    onScroll();
  }

  /* Measure source & target positions relative to the document */
  function measure() {
    const scrollY = window.scrollY;

    const rRect = rightImage.getBoundingClientRect();
    startRect = {
      top: rRect.top + scrollY,
      left: rRect.left,
      width: rRect.width,
      height: rRect.height,
    };

    const fRect = fullSizeImage.getBoundingClientRect();
    endRect = {
      top: fRect.top + scrollY,
      left: fRect.left,
      width: fRect.width,
      height: fRect.height,
    };

    // Animation scroll zone
    // Start when the bottom of #rightImage reaches the viewport center
    // Math.max ensures the animation never starts before scroll = 0
    animStart = Math.max(
      0,
      startRect.top +
        startRect.height -
        window.innerHeight / 2 +
        CFG.scrollOffset,
    );

    animEnd = animStart + CFG.scrollDuration;

    // Re-apply current state
    applyProgress(lastProgress >= 0 ? lastProgress : -1);
  }

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Temporarily reset everything so measurements are clean
      rightImage.style.opacity = "";
      fullSizeImage.style.opacity = "";
      clone.style.display = "none";
      lastProgress = -1;
      measure();
      onScroll();
    }, 100);
  }

  function onScroll() {
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

    // Skip if nothing changed
    if (progress === lastProgress) return;
    lastProgress = progress;

    applyProgress(progress);
  }

  function applyProgress(progress) {
    if (progress <= 0) {
      // Before animation — show original, hide clone & target
      rightImage.style.opacity = "1";
      fullSizeImage.style.opacity = "0";
      fullSizeImage.style.height = "0";
      fullSizeImage.style.margin = "0";
      fullSizeImage.style.overflow = "hidden";
      clone.style.display = "none";
      return;
    }

    if (progress >= 1) {
      // After animation — show fullSizeImage, hide original & clone
      rightImage.style.opacity = "0";
      fullSizeImage.style.opacity = "1";
      fullSizeImage.style.height = "";
      fullSizeImage.style.margin = "";
      fullSizeImage.style.overflow = "";
      clone.style.display = "none";
      return;
    }

    // Mid-animation — hide original & target, show clone
    rightImage.style.opacity = "0";
    fullSizeImage.style.opacity = "0";
    fullSizeImage.style.height = "0";
    fullSizeImage.style.margin = "0";
    fullSizeImage.style.overflow = "hidden";
    clone.style.display = "block";

    // Apply individual easings
    const tX = CFG.easingX(progress);
    const tY = CFG.easingY(progress);
    const tSize = CFG.easingSize(progress);
    const tRadius = CFG.easingRadius(progress);

    // Calculate current viewport-relative positions
    const scrollY = window.scrollY;
    const fromTop = startRect.top - scrollY;
    const fromLeft = startRect.left;
    const toTop = endRect.top - scrollY;
    const toLeft = endRect.left;

    // Interpolate
    const currentTop = lerp(fromTop, toTop, tY);
    const currentLeft = lerp(fromLeft, toLeft, tX);
    const currentWidth = lerp(startRect.width, endRect.width, tSize);
    const currentHeight = lerp(startRect.height, endRect.height, tSize);

    // Curved path offset — sine wave peaks at progress=0.5
    const curveOffset = CFG.curvePeak * Math.sin(progress * Math.PI);

    // Border radius: nameImage starts at 30px, fullSizeImage also 30px
    // but we can interpolate if they differ
    const startRadius = 30; // from --primaryBorderRadius
    const endRadius = 30;
    const currentRadius = lerp(startRadius, endRadius, tRadius);

    // Apply styles to clone
    clone.style.top = currentTop + "px";
    clone.style.left = currentLeft + curveOffset + "px";
    clone.style.width = currentWidth + "px";
    clone.style.height = currentHeight + "px";
    clone.style.borderRadius = currentRadius + "px";
  }

  // Boot
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
