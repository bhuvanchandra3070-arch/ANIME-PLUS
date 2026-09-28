/* ==========================================================================
   ANIME.PLUS - LIVE WALLPAPER ENGINE (live-wallpaper.js)
   ========================================================================== */

(function () {
  'use strict';

  // Default Anime Live Wallpaper Presets
  const WALLPAPER_PRESETS = [
    {
      id: "preset-cyberpunk",
      title: "Cyberpunk Tokyo",
      url: "https://images.alphacoders.com/134/thumb-1920-1349079.png",
      type: "image"
    },
    {
      id: "preset-sakura",
      title: "Cherry Blossom",
      url: "https://images.alphacoders.com/133/1331828.jpeg",
      type: "image"
    },
    {
      id: "preset-solo",
      title: "Solo Leveling (Live Video)",
      url: "img/banners/live-banners/sbanner.mp4",
      type: "video"
    },
    {
      id: "preset-demon",
      title: "Mugen Train",
      url: "https://images.alphacoders.com/110/1107567.jpg",
      type: "image"
    },
    {
      id: "preset-weathering",
      title: "Weathering With You",
      url: "https://images.alphacoders.com/102/1024345.jpg",
      type: "image"
    },
    {
      id: "preset-yourname",
      title: "Your Name Comet",
      url: "https://images.alphacoders.com/743/743372.jpg",
      type: "image"
    }
  ];

  // Engine state defaults
  let activeWallpaper = {
    url: "https://images.alphacoders.com/134/thumb-1920-1349079.png",
    type: "image",
    brightness: 65,
    blur: 0,
    particles: true
  };

  let particleCanvas = null;
  let particleCtx = null;
  let particleAnimationId = null;
  let particlesArray = [];

  document.addEventListener("DOMContentLoaded", () => {
    loadSavedWallpaper();
    initWallpaperContainer();
    initWallpaperModal();
    if (activeWallpaper.particles) {
      initParticles();
    }
  });

  function loadSavedWallpaper() {
    try {
      const saved = localStorage.getItem("animeplus_live_wallpaper");
      if (saved) {
        activeWallpaper = { ...activeWallpaper, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.log("Error reading wallpaper storage", e);
    }
  }

  function saveWallpaper() {
    try {
      localStorage.setItem("animeplus_live_wallpaper", JSON.stringify(activeWallpaper));
    } catch (e) {
      console.log("Error saving wallpaper", e);
    }
  }

  function initWallpaperContainer() {
    let container = document.getElementById("liveWallpaperContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "liveWallpaperContainer";
      document.body.prepend(container);
    }
    renderActiveWallpaper();
  }

  function renderActiveWallpaper() {
    const container = document.getElementById("liveWallpaperContainer");
    if (!container) return;

    // Clear old elements (except particle canvas)
    container.querySelectorAll(".wallpaper-media-img, .wallpaper-media-video, .wallpaper-overlay-dim").forEach(el => el.remove());

    const isVideo = activeWallpaper.type === "video" || activeWallpaper.url.match(/\.(mp4|webm|ogv)$/i);

    if (isVideo) {
      const video = document.createElement("video");
      video.className = "wallpaper-media-video";
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.src = activeWallpaper.url;
      video.style.filter = `brightness(${activeWallpaper.brightness / 100}) blur(${activeWallpaper.blur}px)`;
      container.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.className = "wallpaper-media-img";
      img.src = activeWallpaper.url;
      img.alt = "Live Wallpaper";
      img.style.filter = `brightness(${activeWallpaper.brightness / 100}) blur(${activeWallpaper.blur}px)`;
      container.appendChild(img);
    }

    const overlay = document.createElement("div");
    overlay.className = "wallpaper-overlay-dim";
    container.appendChild(overlay);
  }

  /* ==========================================================================
     PARTICLE EFFECT OVERLAY
     ========================================================================== */

  function initParticles() {
    const container = document.getElementById("liveWallpaperContainer");
    if (!container) return;

    if (!particleCanvas) {
      particleCanvas = document.createElement("canvas");
      particleCanvas.id = "wallpaperParticlesCanvas";
      container.appendChild(particleCanvas);
    }

    particleCtx = particleCanvas.getContext("2d");
    resizeParticleCanvas();
    window.addEventListener("resize", resizeParticleCanvas);

    // Create 45 ambient floating particles
    particlesArray = [];
    for (let i = 0; i < 45; i++) {
      particlesArray.push({
        x: Math.random() * particleCanvas.width,
        y: Math.random() * particleCanvas.height,
        radius: Math.random() * 2.5 + 0.5,
        color: Math.random() > 0.5 ? "rgba(255, 100, 10, " : "rgba(255, 42, 84, ",
        opacity: Math.random() * 0.6 + 0.2,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.6) * 0.6
      });
    }

    if (particleAnimationId) cancelAnimationFrame(particleAnimationId);
    animateParticles();
  }

  function resizeParticleCanvas() {
    if (!particleCanvas) return;
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
  }

  function animateParticles() {
    if (!activeWallpaper.particles || !particleCtx) return;

    particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

    particlesArray.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;

      if (p.y < 0) p.y = particleCanvas.height;
      if (p.x < 0) p.x = particleCanvas.width;
      if (p.x > particleCanvas.width) p.x = 0;

      particleCtx.beginPath();
      particleCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      particleCtx.fillStyle = p.color + p.opacity + ")";
      particleCtx.shadowBlur = 10;
      particleCtx.shadowColor = "#FF640A";
      particleCtx.fill();
    });

    particleAnimationId = requestAnimationFrame(animateParticles);
  }

  /* ==========================================================================
     MODAL CONTROLLER & PASTE URL INPUT
     ========================================================================== */

  function initWallpaperModal() {
    if (document.getElementById("wallpaperModal")) return;

    const modal = document.createElement("div");
    modal.className = "wallpaper-modal-backdrop";
    modal.id = "wallpaperModal";

    modal.innerHTML = `
      <div class="wallpaper-modal-box">
        <div class="wallpaper-modal-header">
          <h3>🎨 Custom <span>Live Wallpaper</span></h3>
          <button class="wallpaper-modal-close" onclick="LiveWallpaperEngine.closeModal()">✕</button>
        </div>
        <div class="wallpaper-modal-body">
          
          <!-- Paste Link Section -->
          <div class="wallpaper-input-section">
            <div class="wallpaper-input-label">
              <span>🔗 Paste Image or Video URL</span>
            </div>
            <p style="font-size: 0.8125rem; color: var(--cr-text-secondary); margin-bottom: 0.5rem;">
              Paste any direct image link (.jpg, .png, .gif, .webp) or MP4 video URL to apply as your live wallpaper:
            </p>
            <div class="wallpaper-url-box">
              <input type="text" id="wallpaperUrlInput" class="wallpaper-url-input" placeholder="https://example.com/anime-wallpaper.jpg" value="${escapeHtml(activeWallpaper.url)}">
              <button class="wallpaper-apply-btn" onclick="LiveWallpaperEngine.applyFromInput()">Apply Wallpaper</button>
            </div>
          </div>

          <!-- Preset Thumbnails Grid -->
          <div>
            <div class="wallpaper-input-label" style="margin-bottom: 0.75rem;">
              <span>⭐ Featured Anime Live Wallpaper Presets</span>
            </div>
            <div class="wallpaper-presets-grid" id="wallpaperPresetsGrid">
              ${WALLPAPER_PRESETS.map(p => `
                <div class="wallpaper-preset-card ${p.url === activeWallpaper.url ? 'active' : ''}" data-url="${p.url}" data-type="${p.type}">
                  <img src="${p.url}" alt="${p.title}">
                  <span>${p.title}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Adjustment Sliders -->
          <div class="wallpaper-controls-group">
            <div class="wallpaper-control-item">
              <label>
                <span>Brightness</span>
                <span id="brightnessVal">${activeWallpaper.brightness}%</span>
              </label>
              <input type="range" min="20" max="100" value="${activeWallpaper.brightness}" class="wallpaper-slider" id="wallpaperBrightnessSlider">
            </div>

            <div class="wallpaper-control-item">
              <label>
                <span>Blur Blur Depth</span>
                <span id="blurVal">${activeWallpaper.blur}px</span>
              </label>
              <input type="range" min="0" max="12" value="${activeWallpaper.blur}" class="wallpaper-slider" id="wallpaperBlurSlider">
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.5rem; border-top: 1px solid var(--cr-border);">
            <button class="wallpaper-toggle-btn ${activeWallpaper.particles ? 'active' : ''}" id="particlesToggleBtn">
              ✨ Floating Particles: ${activeWallpaper.particles ? 'ON' : 'OFF'}
            </button>
            <button class="btn btn-secondary btn-sm" onclick="LiveWallpaperEngine.resetDefault()">Reset Default</button>
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Bind Presets Clicks
    modal.querySelectorAll(".wallpaper-preset-card").forEach(card => {
      card.addEventListener("click", () => {
        modal.querySelectorAll(".wallpaper-preset-card").forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        const url = card.getAttribute("data-url");
        const type = card.getAttribute("data-type");
        const input = document.getElementById("wallpaperUrlInput");
        if (input) input.value = url;
        setWallpaper(url, type);
      });
    });

    // Bind Brightness Slider
    const bSlider = document.getElementById("wallpaperBrightnessSlider");
    const bVal = document.getElementById("brightnessVal");
    if (bSlider) {
      bSlider.addEventListener("input", (e) => {
        activeWallpaper.brightness = parseInt(e.target.value, 10);
        if (bVal) bVal.textContent = `${activeWallpaper.brightness}%`;
        updateMediaFilters();
        saveWallpaper();
      });
    }

    // Bind Blur Slider
    const blurSlider = document.getElementById("wallpaperBlurSlider");
    const blurVal = document.getElementById("blurVal");
    if (blurSlider) {
      blurSlider.addEventListener("input", (e) => {
        activeWallpaper.blur = parseInt(e.target.value, 10);
        if (blurVal) blurVal.textContent = `${activeWallpaper.blur}px`;
        updateMediaFilters();
        saveWallpaper();
      });
    }

    // Bind Particles Toggle
    const particlesBtn = document.getElementById("particlesToggleBtn");
    if (particlesBtn) {
      particlesBtn.addEventListener("click", () => {
        activeWallpaper.particles = !activeWallpaper.particles;
        particlesBtn.classList.toggle("active", activeWallpaper.particles);
        particlesBtn.textContent = `✨ Floating Particles: ${activeWallpaper.particles ? 'ON' : 'OFF'}`;
        saveWallpaper();

        if (activeWallpaper.particles) {
          initParticles();
        } else if (particleCanvas) {
          particleCanvas.remove();
          particleCanvas = null;
        }
      });
    }

    // Close on Outside Click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }

  function updateMediaFilters() {
    const media = document.querySelector("#liveWallpaperContainer .wallpaper-media-img, #liveWallpaperContainer .wallpaper-media-video");
    if (media) {
      media.style.filter = `brightness(${activeWallpaper.brightness / 100}) blur(${activeWallpaper.blur}px)`;
    }
  }

  function setWallpaper(url, type) {
    if (!url) return;
    activeWallpaper.url = url;
    activeWallpaper.type = type || (url.match(/\.(mp4|webm|ogv)$/i) ? "video" : "image");
    saveWallpaper();
    renderActiveWallpaper();
    if (typeof showToast === "function") {
      showToast("Live Wallpaper Applied Successfully!", "success");
    }
  }

  function openModal() {
    const modal = document.getElementById("wallpaperModal");
    if (!modal) {
      initWallpaperModal();
    }
    const targetModal = document.getElementById("wallpaperModal");
    if (targetModal) targetModal.classList.add("active");
  }

  function closeModal() {
    const modal = document.getElementById("wallpaperModal");
    if (modal) modal.classList.remove("active");
  }

  function applyFromInput() {
    const input = document.getElementById("wallpaperUrlInput");
    if (input && input.value.trim()) {
      const url = input.value.trim();
      setWallpaper(url);
    }
  }

  function resetDefault() {
    activeWallpaper.url = "https://images.alphacoders.com/134/thumb-1920-1349079.png";
    activeWallpaper.type = "image";
    activeWallpaper.brightness = 65;
    activeWallpaper.blur = 0;
    activeWallpaper.particles = true;

    const input = document.getElementById("wallpaperUrlInput");
    if (input) input.value = activeWallpaper.url;

    saveWallpaper();
    renderActiveWallpaper();
    initParticles();
    closeModal();
    if (typeof showToast === "function") {
      showToast("Reset to Default Cyberpunk Wallpaper", "info");
    }
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Global Engine Exposure
  window.LiveWallpaperEngine = {
    openModal: openModal,
    closeModal: closeModal,
    applyFromInput: applyFromInput,
    setWallpaper: setWallpaper,
    resetDefault: resetDefault
  };

})();
