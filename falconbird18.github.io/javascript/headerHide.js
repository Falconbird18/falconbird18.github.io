// Header hide/show for specific sections
(function() {
    'use strict';

    const header = document.querySelector('header');
    const mobileMenu = document.querySelector('nav.menu');
    const gallerySection = document.querySelector('#gallery');

    if (!header || !gallerySection) return;

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1 // Trigger when 10% of the section is visible
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Hide header when gallery is in view
                header.classList.add('hidden');
                if (mobileMenu) mobileMenu.classList.add('hidden');
            } else {
                // Show header when gallery is not in view
                header.classList.remove('hidden');
                if (mobileMenu) mobileMenu.classList.remove('hidden');
            }
        });
    }, observerOptions);

    observer.observe(gallerySection);
})();