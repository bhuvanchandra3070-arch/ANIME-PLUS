/* ==========================================================================
   ANIME.PLUS - 3D INTERACTIVE TILT ENGINE (anime-3d.js)
   ========================================================================== */

(function () {
  'use strict';

  function init3DTilt() {
    const cards = document.querySelectorAll('.anime-card, .anime-card-3d, .movie-card-3d, .top10-card, .episode-card-3d');
    cards.forEach(card => {
      if (card.dataset.tiltInitialized) return;
      card.dataset.tiltInitialized = 'true';

      // Ensure card has poster or thumb element for 3D depth
      const poster = card.querySelector('.anime-card-poster, .movie-poster, .continue-thumb, .episode-thumb');
      
      // Inject specular glare overlay if missing
      if (poster && !poster.querySelector('.card-3d-glare')) {
        const glare = document.createElement('div');
        glare.className = 'card-3d-glare';
        poster.appendChild(glare);
      }

      let animationFrameId = null;

      // Mouse Move Listener with RAF throttling
      card.addEventListener('mousemove', (e) => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(() => handleMove(e, card));
      });

      card.addEventListener('mouseenter', (e) => handleEnter(e, card));
      card.addEventListener('mouseleave', (e) => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        handleLeave(e, card);
      });

      // Touch events for mobile 3D tilt preview
      card.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
          animationFrameId = requestAnimationFrame(() => handleMove(e.touches[0], card));
        }
      }, { passive: true });

      card.addEventListener('touchend', () => handleLeave(null, card));
    });
  }

  function handleEnter(e, card) {
    card.style.transition = 'transform 0.15s cubic-bezier(0.2, 0, 0.2, 1), box-shadow 0.25s ease';
    card.classList.add('is-hovered-3d');
  }

  function handleMove(e, card) {
    const rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const width = rect.width;
    const height = rect.height;

    // Calculate normalized pointer offset (0 to 1) from card center
    const mouseX = Math.max(0, Math.min(1, (e.clientX - rect.left) / width));
    const mouseY = Math.max(0, Math.min(1, (e.clientY - rect.top) / height));

    const maxRotation = 14; // Max degrees of tilt
    const rotateX = ((0.5 - mouseY) * maxRotation).toFixed(2);
    const rotateY = ((mouseX - 0.5) * maxRotation).toFixed(2);

    // Dynamic 3D transform with depth lift
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px) scale3d(1.03, 1.03, 1.03)`;

    // Update specular glare reflection position dynamically
    const glare = card.querySelector('.card-3d-glare');
    if (glare) {
      glare.style.background = `radial-gradient(circle at ${mouseX * 100}% ${mouseY * 100}%, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.05) 50%, transparent 80%)`;
      glare.style.opacity = '1';
    }

    // Dynamic directional 3D shadow based on tilt angle
    const shadowX = (mouseX - 0.5) * -18;
    const shadowY = (mouseY - 0.5) * 26 + 14;
    card.style.boxShadow = `${shadowX}px ${shadowY}px 28px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 100, 10, 0.3)`;
  }

  function handleLeave(e, card) {
    card.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.4s ease';
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)';
    card.style.boxShadow = '';
    card.classList.remove('is-hovered-3d');

    const glare = card.querySelector('.card-3d-glare');
    if (glare) {
      glare.style.opacity = '0';
    }
  }

  // Global exposure and auto-observer for dynamically added cards
  window.Anime3DEngine = {
    init: init3DTilt,
    bindAll: init3DTilt
  };

  document.addEventListener('DOMContentLoaded', () => {
    init3DTilt();
    // Re-bind after dynamically rendering content
    const observer = new MutationObserver(() => init3DTilt());
    observer.observe(document.body, { childList: true, subtree: true });
  });

})();

