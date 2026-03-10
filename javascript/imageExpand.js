window.addEventListener("DOMContentLoaded", () => {
  const image = document.getElementById("welcomeImage");
  const scrollContainer = document.getElementById("welcome");

  if (!image || !scrollContainer) return;

  // Force the image to be centered in the viewport and cover it.
  // These inline styles override any absolute positioning so the image
  // stays centered even while scrolling.
  image.style.position = "fixed";
  image.style.top = "50%";
  image.style.left = "50%";
  image.style.transformOrigin = "center center";
  image.style.width = "100vw";
  image.style.height = "100vw";
  image.style.objectFit = "cover";
  image.style.zIndex = "2";
  image.style.willChange = "transform, border-radius";

  // Animation state for smooth interpolation
  let targetScale = 0.5;
  let currentScale = targetScale;
  let targetRadius = 30;
  let currentRadius = targetRadius;
  let ticking = false;

  function updateTargetsFromScroll() {
    const rect = scrollContainer.getBoundingClientRect();
    const scrollPercent = Math.min(Math.max(-rect.top / rect.height, 0), 1);

    // Scale interpolates from 0.5 -> 1.0
    targetScale = 0.3 + scrollPercent * 0.7;

    // Border radius interpolates from 30px -> 0px
    targetRadius = 30 - scrollPercent * 30;

    if (!ticking) {
      requestAnimationFrame(animate);
      ticking = true;
    }
  }

  // Smoothly lerp current values toward targets for a polished effect
  function animate() {
    const ease = 0.12; // smaller = smoother/slower
    currentScale += (targetScale - currentScale) * ease;
    currentRadius += (targetRadius - currentRadius) * ease;

    // Apply centered transform so it expands from the center
    image.style.transform = `translate(-50%, -50%) scale(${currentScale})`;
    image.style.borderRadius = `${currentRadius}px`;

    // If not yet near the target, keep animating
    if (
      Math.abs(currentScale - targetScale) > 0.001 ||
      Math.abs(currentRadius - targetRadius) > 0.5
    ) {
      requestAnimationFrame(animate);
    } else {
      // Snap to target to avoid tiny residual differences
      currentScale = targetScale;
      currentRadius = targetRadius;
      image.style.transform = `translate(-50%, -50%) scale(${currentScale})`;
      image.style.borderRadius = `${Math.round(currentRadius)}px`;
      ticking = false;
    }
  }

  // Use passive scroll listener for performance and update targets on scroll
  window.addEventListener("scroll", updateTargetsFromScroll, { passive: true });

  // Initialize on load
  updateTargetsFromScroll();
});
