/* ==========================================================================
   ANIME.PLUS - MAIN APP CONTROLLER & SPOTLIGHT (app.js)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initSearchAutocomplete();
  initSpotlightHero();
  initCarousels();
  initPWAInstallPrompt();
  updateWatchlistBadge();
  updateAuthUI();
});

/* ==========================================================================
   NAVBAR & SCROLL BEHAVIOR
   ========================================================================== */
function initNavbar() {
  const navbar = document.querySelector(".cr-navbar");
  if (navbar) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 20) {
        navbar.classList.add("scrolled");
      } else {
        navbar.classList.remove("scrolled");
      }
    });
  }

  // Touch and click toggle for user profile dropdown
  const avatarBtn = document.getElementById("userAvatarBtn");
  const userWrapper = document.querySelector(".user-menu-wrapper");
  const userDropdown = document.querySelector(".user-dropdown");
  if (avatarBtn && userWrapper) {
    avatarBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      userWrapper.classList.toggle("active");
      if (userDropdown) userDropdown.classList.toggle("show");
    });
    document.addEventListener("click", (e) => {
      if (!userWrapper.contains(e.target)) {
        userWrapper.classList.remove("active");
        if (userDropdown) userDropdown.classList.remove("show");
      }
    });
  }
}

/* ==========================================================================
   INSTANT SEARCH AUTOCOMPLETE
   ========================================================================== */
function initSearchAutocomplete() {
  const searchInput = document.getElementById("navSearchInput");
  const resultsDropdown = document.getElementById("searchResultsDropdown");
  const clearBtn = document.getElementById("navSearchClear");

  if (!searchInput || !resultsDropdown) return;

  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();
    if (!query) {
      resultsDropdown.classList.remove("active");
      resultsDropdown.innerHTML = "";
      return;
    }

    const matches = CRUNCHY_ANIME_DATABASE.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.japaneseTitle.toLowerCase().includes(query) ||
      item.genres.some(g => g.toLowerCase().includes(query))
    ).slice(0, 6);

    if (matches.length === 0) {
      resultsDropdown.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--cr-text-secondary); font-size: 0.875rem;">
          No anime found for "<b>${escapeHtml(query)}</b>"
        </div>
      `;
    } else {
      resultsDropdown.innerHTML = matches.map(anime => `
        <a href="watch.html?id=${anime.id}" class="search-result-item">
          <img src="${anime.poster}" alt="${anime.title}" class="search-result-thumb">
          <div class="search-result-info">
            <div class="search-result-title">${anime.title}</div>
            <div class="search-result-meta">
              <span class="badge badge-orange">${anime.rating} ★</span>
              <span>${anime.season}</span>
              <span class="badge badge-sub">SUB</span>
              <span class="badge badge-dub">DUB</span>
            </div>
          </div>
        </a>
      `).join("");
    }
    resultsDropdown.classList.add("active");
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      resultsDropdown.classList.remove("active");
      resultsDropdown.innerHTML = "";
      searchInput.focus();
    });
  }

  // Close dropdown on outside click
  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !resultsDropdown.contains(e.target)) {
      resultsDropdown.classList.remove("active");
    }
  });
}

/* ==========================================================================
   SPOTLIGHT HERO CAROUSEL
   ========================================================================== */
let currentHeroIndex = 0;
let heroTimer = null;
const HERO_DURATION = 6500;

function initSpotlightHero() {
  const heroContainer = document.getElementById("heroSpotlight");
  if (!heroContainer) return;

  const spotlightAnime = CRUNCHY_ANIME_DATABASE.slice(0, 5);
  renderHeroSlides(spotlightAnime, heroContainer);
  startHeroAutoPlay(spotlightAnime.length);

  const prevBtn = heroContainer.querySelector(".hero-arrow-prev");
  const nextBtn = heroContainer.querySelector(".hero-arrow-next");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      changeHeroSlide((currentHeroIndex - 1 + spotlightAnime.length) % spotlightAnime.length);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      changeHeroSlide((currentHeroIndex + 1) % spotlightAnime.length);
    });
  }
}

function renderHeroSlides(animeList, container) {
  const track = container.querySelector(".hero-slider-track");
  const thumbsBar = container.querySelector(".hero-thumbnails-bar");

  if (!track || !thumbsBar) return;

  track.innerHTML = animeList.map((anime, index) => {
    const isVideoBanner = anime.banner && anime.banner.toLowerCase().endsWith('.mp4');
    const backdropHTML = isVideoBanner
      ? `<video src="${anime.banner}" class="hero-backdrop" ${index === 0 ? 'autoplay' : ''} loop muted playsinline preload="metadata"></video>`
      : `<img src="${(anime.banner && !anime.banner.toLowerCase().endsWith('.mp4')) ? anime.banner : anime.poster}" alt="${anime.title}" class="hero-backdrop" loading="${index === 0 ? 'eager' : 'lazy'}">`;

    return `
    <div class="hero-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
      ${backdropHTML}
      <div class="hero-gradient-overlay"></div>
      <div class="container hero-content-wrapper">
        <div class="hero-info">
          <div class="hero-tags">
            <span class="badge badge-orange">${anime.badge}</span>
            <span class="badge badge-sub">SUB</span>
            <span class="badge badge-dub">DUB</span>
            <span class="badge badge-rating">★ ${anime.rating}</span>
          </div>
          <h1 class="hero-title">${anime.title}</h1>
          <div class="hero-meta">
            <span class="hero-meta-item">${anime.season}</span>
            <span class="hero-meta-dot"></span>
            <span class="hero-meta-item">${anime.genres.slice(0, 3).join(", ")}</span>
            <span class="hero-meta-dot"></span>
            <span class="hero-meta-item">${anime.ageRating}</span>
          </div>
          <p class="hero-synopsis">${anime.synopsis}</p>
          <div class="hero-actions">
            <a href="watch.html?id=${anime.id}" class="btn btn-primary btn-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              Start Watching S1 E1
            </a>
            <button class="btn btn-secondary btn-lg" onclick="openTrailerById('${anime.id}')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              <span>Watch Trailer</span>
            </button>
            <button class="btn btn-secondary btn-lg watchlist-toggle-btn" data-id="${anime.id}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              <span>+ Add to Watchlist</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  }).join("");

  thumbsBar.innerHTML = animeList.map((anime, index) => `
    <button class="hero-thumb-btn ${index === 0 ? 'active' : ''}" data-index="${index}" aria-label="${anime.title}">
      <img src="${anime.poster}" alt="${anime.title}">
      <div class="thumb-progress"></div>
    </button>
  `).join("");

  // Attach thumbnail clicks
  thumbsBar.querySelectorAll(".hero-thumb-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.getAttribute("data-index"), 10);
      changeHeroSlide(idx);
    });
  });

  // Attach Watchlist button triggers
  container.querySelectorAll(".watchlist-toggle-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const animeId = btn.getAttribute("data-id");
      toggleWatchlist(animeId, btn);
    });
  });

  // Play initial video if first slide has a live video banner
  const initialSlide = container.querySelector(".hero-slide.active");
  if (initialSlide) {
    const initialVid = initialSlide.querySelector("video");
    if (initialVid) {
      initialVid.play().catch(e => console.log("Initial video play error:", e));
    }
  }
}

function changeHeroSlide(index) {
  const slides = document.querySelectorAll(".hero-slide");
  const thumbs = document.querySelectorAll(".hero-thumb-btn");
  if (!slides.length) return;

  slides.forEach(s => {
    s.classList.remove("active");
    const vid = s.querySelector("video");
    if (vid) vid.pause();
  });
  thumbs.forEach(t => t.classList.remove("active"));

  currentHeroIndex = index;
  const activeSlide = slides[currentHeroIndex];
  activeSlide.classList.add("active");
  thumbs[currentHeroIndex].classList.add("active");

  const activeVideo = activeSlide.querySelector("video");
  if (activeVideo) {
    activeVideo.currentTime = 0;
    const playPromise = activeVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch(e => console.log("Hero video play error:", e));
    }
  }

  startHeroAutoPlay(slides.length);
}

function startHeroAutoPlay(totalSlides) {
  if (heroTimer) clearInterval(heroTimer);
  heroTimer = setInterval(() => {
    changeHeroSlide((currentHeroIndex + 1) % totalSlides);
  }, HERO_DURATION);
}

/* ==========================================================================
   CAROUSEL RENDERING & HORIZONTAL SCROLL
   ========================================================================== */
function initCarousels() {
  renderTop10Carousel();
  renderContinueWatchingCarousel();
  renderSimulcastCarousel();
  renderEpisodesCarousel();
  renderCategorizedCarousels();
  setupCarouselScrollButtons();
  if (window.Anime3DEngine) {
    window.Anime3DEngine.init();
  }
}

function renderTop10Carousel() {
  const top10Container = document.getElementById("top10Track");
  if (!top10Container) return;

  const top10List = getTop10Anime();
  top10Container.innerHTML = top10List.map(anime => `
    <div class="top10-card anime-card-3d" onclick="location.href='watch.html?id=${anime.id}'">
      <div class="top10-rank-number">${anime.rank}</div>
      <div class="anime-card-poster">
        <img src="${anime.poster}" alt="${anime.title}" loading="lazy" onerror="this.onerror=null; this.src='https://cdn.myanimelist.net/images/anime/1918/140924.jpg';">
        <div class="card-3d-glare"></div>
        <div class="card-hover-overlay">
          <div class="card-hover-play">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      </div>
    </div>
  `).join("");
}

function renderContinueWatchingCarousel() {
  const continueContainer = document.getElementById("continueTrack");
  const continueSection = document.getElementById("continueSection");
  if (!continueContainer || !continueSection) return;

  const history = getWatchHistory();
  if (history.length === 0) {
    // Show top 3 default starter items if no history
    const sampleHistory = [
      { id: "solo-leveling", ep: "S1 E3", progress: 70, timeLeft: "7m left" },
      { id: "jujutsu-kaisen", ep: "S2 E2", progress: 45, timeLeft: "13m left" },
      { id: "demon-slayer", ep: "S4 E1", progress: 85, timeLeft: "6m left" }
    ];
    continueContainer.innerHTML = sampleHistory.map(item => {
      const anime = getAnimeById(item.id);
      const thumb = anime.banner && !anime.banner.endsWith('.mp4') ? anime.banner : anime.poster;
      return `
        <div class="continue-card episode-card-3d" onclick="location.href='watch.html?id=${anime.id}'">
          <div class="continue-thumb">
            <img src="${thumb}" alt="${escapeHtml(anime.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='https://cdn.myanimelist.net/images/anime/1918/140924.jpg';">
            <div class="card-3d-glare"></div>
            <div class="continue-progress-bar">
              <div class="continue-progress-fill" style="width: ${item.progress}%"></div>
            </div>
            <div class="card-hover-overlay">
              <div class="card-hover-play">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
          </div>
          <div class="continue-card-info">
            <div class="continue-card-series">${escapeHtml(anime.title)}</div>
            <div class="continue-card-episode">
              <span>${item.ep}</span>
              <span class="continue-time-left">${item.timeLeft}</span>
            </div>
          </div>
        </div>
      `;
    }).join("");
    continueSection.style.display = "block";
  } else {
    continueContainer.innerHTML = history.map(item => {
      const anime = getAnimeById(item.animeId);
      const thumb = anime.banner && !anime.banner.endsWith('.mp4') ? anime.banner : anime.poster;
      return `
        <div class="continue-card episode-card-3d" onclick="location.href='watch.html?id=${anime.id}'">
          <div class="continue-thumb">
            <img src="${thumb}" alt="${escapeHtml(anime.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='https://cdn.myanimelist.net/images/anime/1918/140924.jpg';">
            <div class="card-3d-glare"></div>
            <div class="continue-progress-bar">
              <div class="continue-progress-fill" style="width: ${item.percentage}%"></div>
            </div>
            <div class="card-hover-overlay">
              <div class="card-hover-play">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
          </div>
          <div class="continue-card-info">
            <div class="continue-card-series">${escapeHtml(anime.title)}</div>
            <div class="continue-card-episode">
              <span>Episode ${item.episodeNumber}</span>
              <span class="continue-time-left">${item.formattedTime}</span>
            </div>
          </div>
        </div>
      `;
    }).join("");
    continueSection.style.display = "block";
  }
}

function renderSimulcastCarousel() {
  const simulcastContainer = document.getElementById("simulcastTrack");
  if (!simulcastContainer) return;

  const simulcasts = getSimulcastAnime();
  simulcastContainer.innerHTML = simulcasts.map(anime => createAnimeCardHTML(anime)).join("");
}

function renderEpisodesCarousel() {
  const epContainer = document.getElementById("latestEpisodesTrack");
  if (!epContainer) return;

  const latestEps = typeof getLatestEpisodes === "function" ? getLatestEpisodes() : [];
  epContainer.innerHTML = latestEps.map(ep => createEpisodeCardHTML(ep)).join("");
}

function renderCategorizedCarousels() {
  const actionContainer = document.getElementById("actionTrack");
  const shonenContainer = document.getElementById("shonenTrack");
  const moviesContainer = document.getElementById("moviesTrack");

  if (actionContainer) {
    actionContainer.innerHTML = getAnimeByGenre("Action").slice(0, 8).map(createAnimeCardHTML).join("");
  }
  if (shonenContainer) {
    shonenContainer.innerHTML = getAnimeByGenre("Shonen").slice(0, 8).map(createAnimeCardHTML).join("");
  }
  if (moviesContainer) {
    const moviesList = typeof getMovies === "function" ? getMovies() : getAnimeByGenre("Movie");
    moviesContainer.innerHTML = moviesList.map(createMovieCardHTML).join("");
  }
}

function createAnimeCardHTML(anime) {
  return `
    <div class="anime-card anime-card-3d" onclick="location.href='watch.html?id=${anime.id}'">
      <div class="anime-card-poster">
        <img src="${anime.poster}" alt="${escapeHtml(anime.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='https://cdn.myanimelist.net/images/anime/1918/140924.jpg';">
        <div class="card-3d-glare"></div>
        <span class="badge badge-orange card-badge-top-left">${anime.badge || 'HD'}</span>
        <div class="card-hover-overlay">
          <div class="card-hover-play">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      </div>
      <div class="anime-card-info">
        <div class="anime-card-title">${escapeHtml(anime.title)}</div>
        <div class="anime-card-meta">
          <span class="badge badge-rating">★ ${anime.rating}</span>
          <span class="anime-card-audio">
            <span class="badge badge-sub">SUB</span>
            <span class="badge badge-dub">DUB</span>
          </span>
        </div>
      </div>
    </div>
  `;
}

function createMovieCardHTML(anime) {
  const duration = (anime.seasons && anime.seasons[0] && anime.seasons[0].episodes[0] && anime.seasons[0].episodes[0].duration) || "Full Movie";
  return `
    <div class="movie-card-3d anime-card-3d" onclick="location.href='watch.html?id=${anime.id}'">
      <div class="movie-poster">
        <img src="${anime.poster}" alt="${escapeHtml(anime.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='https://cdn.myanimelist.net/images/anime/1918/140924.jpg';">
        <div class="card-3d-glare"></div>
        <span class="badge badge-orange card-badge-top-left">${anime.badge || 'MOVIE'}</span>
        <span class="movie-card-duration-badge">⏱ ${duration}</span>
        <div class="card-hover-overlay">
          <div class="card-hover-play">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      </div>
      <div class="anime-card-info">
        <div class="anime-card-title">${escapeHtml(anime.title)}</div>
        <div class="anime-card-meta">
          <span class="badge badge-rating">★ ${anime.rating}</span>
          <span style="color: var(--cr-text-secondary);">${anime.year} • 4K HD</span>
        </div>
      </div>
    </div>
  `;
}

function createEpisodeCardHTML(ep) {
  return `
    <div class="episode-card-3d" onclick="location.href='watch.html?id=${ep.animeId}'">
      <div class="episode-thumb">
        <img src="${ep.thumbnail}" alt="${escapeHtml(ep.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='https://cdn.myanimelist.net/images/anime/1918/140924.jpg';">
        <div class="card-3d-glare"></div>
        <span class="episode-badge-num">EP ${ep.episodeNumber}</span>
        <div class="card-hover-overlay">
          <div class="card-hover-play">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      </div>
      <div class="episode-card-info">
        <div class="episode-series-name">${ep.animeTitle}</div>
        <div class="episode-ep-title">${ep.title}</div>
      </div>
    </div>
  `;
}

function setupCarouselScrollButtons() {
  document.querySelectorAll(".carousel-wrapper").forEach(wrapper => {
    const track = wrapper.querySelector(".carousel-track");
    const prevBtn = wrapper.querySelector(".carousel-btn-prev");
    const nextBtn = wrapper.querySelector(".carousel-btn-next");

    if (!track) return;

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        track.scrollBy({ left: -450, behavior: "smooth" });
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        track.scrollBy({ left: 450, behavior: "smooth" });
      });
    }
  });
}

/* ==========================================================================
   WATCHLIST UTILITIES
   ========================================================================== */
function getWatchlist() {
  try {
    return JSON.parse(localStorage.getItem("animeplus_watchlist") || localStorage.getItem("crunchy_watchlist") || "[]");
  } catch (e) {
    return [];
  }
}

function toggleWatchlist(animeId, btnElement) {
  let list = getWatchlist();
  const index = list.indexOf(animeId);
  const anime = getAnimeById(animeId);

  if (index > -1) {
    list.splice(index, 1);
    showToast(`Removed "${anime ? anime.title : 'Anime'}" from Watchlist`);
    if (btnElement) {
      const span = btnElement.querySelector("span");
      if (span) span.textContent = "+ Add to Watchlist";
    }
  } else {
    list.push(animeId);
    showToast(`Added "${anime ? anime.title : 'Anime'}" to Watchlist!`, "success");
    if (btnElement) {
      const span = btnElement.querySelector("span");
      if (span) span.textContent = "✓ In Watchlist";
    }
  }

  localStorage.setItem("animeplus_watchlist", JSON.stringify(list));
  updateWatchlistBadge();
}

function updateWatchlistBadge() {
  const count = getWatchlist().length;
  document.querySelectorAll(".nav-badge-count, .mobile-nav-badge").forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? "flex" : "none";
  });
}

function getWatchHistory() {
  try {
    return JSON.parse(localStorage.getItem("animeplus_history") || localStorage.getItem("crunchy_history") || "[]");
  } catch (e) {
    return [];
  }
}

/* ==========================================================================
   TOAST NOTIFICATIONS
   ========================================================================== */
function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type === "success" ? "toast-success" : type === "error" ? "toast-error" : ""}`;
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      ${type === "success" 
        ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>' 
        : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'}
    </svg>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/* ==========================================================================
   PWA APP INSTALL PROMPT & APP CONVERTER
   ========================================================================== */
let deferredPrompt = null;

function initPWAInstallPrompt() {
  const banner = document.getElementById("pwaInstallBanner");
  const installBtn = document.getElementById("pwaInstallBtn");
  const dismissBtn = document.getElementById("pwaDismissBtn");

  // Capture beforeinstallprompt event (Chrome, Edge, Android)
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (banner && !sessionStorage.getItem("pwa_dismissed")) {
      banner.classList.add("active");
    }
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    if (banner) banner.classList.remove("active");
    showToast("🎉 ANIME.PLUS App successfully installed!", "success");
  });

  if (installBtn) {
    installBtn.addEventListener("click", () => triggerAppInstall());
  }

  if (dismissBtn) {
    dismissBtn.addEventListener("click", () => {
      if (banner) banner.classList.remove("active");
      sessionStorage.setItem("pwa_dismissed", "true");
    });
  }

  // Hook up any .btn-install-nav or navInstallBtn on any page
  document.querySelectorAll(".btn-install-nav, #navInstallBtn, .app-badge-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      triggerAppInstall();
    });
  });

  // Auto-register service worker across all pages
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(err => {
      console.warn("ServiceWorker registration notice:", err);
    });
  }
}

// Universal Install Trigger for Desktop, Android, and iOS
async function triggerAppInstall() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) {
    showToast("✓ ANIME.PLUS App is already installed and active!", "info");
    return;
  }

  // 1. Android / Chrome / Edge native prompt
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      showToast("Installing ANIME.PLUS App...", "success");
    }
    deferredPrompt = null;
    const banner = document.getElementById("pwaInstallBanner");
    if (banner) banner.classList.remove("active");
    return;
  }

  // 2. iOS Safari instructions
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIOS) {
    showIOSInstallModal();
    return;
  }

  // 3. Fallback for desktop Chrome or browsers where prompt was already dismissed
  showToast("To install: Click the ⊕ Install icon in your browser address bar or menu (⋮) -> 'Install ANIME.PLUS'", "info");
}

function showIOSInstallModal() {
  let modal = document.getElementById("iosInstallModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "iosInstallModal";
    modal.className = "ios-install-backdrop";
    modal.innerHTML = `
      <div class="ios-install-sheet">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="img/icon-192.png" alt="App Icon" style="width: 44px; height: 44px; border-radius: 10px;">
            <div>
              <h3 style="font-size: 1.125rem; font-weight: 800;">Install ANIME.PLUS</h3>
              <p style="font-size: 0.75rem; color: var(--cr-text-secondary);">Full-screen streaming app for iPhone & iPad</p>
            </div>
          </div>
          <button style="background: none; border: none; color: #FFF; font-size: 1.25rem; cursor: pointer;" onclick="closeIOSInstallModal()">✕</button>
        </div>

        <div class="ios-step">
          <div class="ios-step-num">1</div>
          <div>Tap the <strong>Share</strong> button <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> in Safari's bottom toolbar.</div>
        </div>

        <div class="ios-step">
          <div class="ios-step-num">2</div>
          <div>Scroll down and tap <strong>Add to Home Screen ⊞</strong>.</div>
        </div>

        <div class="ios-step">
          <div class="ios-step-num">3</div>
          <div>Tap <strong>Add</strong> in the top right to install the app!</div>
        </div>

        <button class="btn btn-primary btn-block" style="margin-top: 1.25rem; width: 100%;" onclick="closeIOSInstallModal()">Got it!</button>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeIOSInstallModal();
    });
  }

  modal.classList.add("active");
}

function closeIOSInstallModal() {
  const modal = document.getElementById("iosInstallModal");
  if (modal) modal.classList.remove("active");
}

window.triggerAppInstall = triggerAppInstall;
window.closeIOSInstallModal = closeIOSInstallModal;

/* ==========================================================================
   USER AUTH STATE IN UI
   ========================================================================== */
function updateAuthUI() {
  const currentUser = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  const userMenuBtn = document.getElementById("userAvatarBtn");
  const userNameEl = document.getElementById("dropdownUserName");
  const userTierEl = document.getElementById("dropdownUserTier");
  const logoutLink = document.querySelector(".logout-link");
  const navAuthButtons = document.getElementById("navAuthButtons");

  if (currentUser) {
    if (navAuthButtons) navAuthButtons.style.display = "none";
    if (userMenuBtn) {
      userMenuBtn.style.display = "flex";
      const avatarImg = userMenuBtn.querySelector("img");
      if (avatarImg) avatarImg.src = currentUser.avatar || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=120&auto=format&fit=crop&q=80";
    }
    if (userNameEl) userNameEl.textContent = currentUser.name || "AnimeFan";
    if (userTierEl) userTierEl.textContent = currentUser.tier || "MEGA FAN VIP";
    if (logoutLink) {
      logoutLink.textContent = "Sign Out";
      logoutLink.setAttribute("href", "#");
      logoutLink.onclick = (e) => {
        e.preventDefault();
        if (typeof logoutUser === "function") logoutUser();
      };
    }
  } else {
    if (navAuthButtons) navAuthButtons.style.display = "flex";
    if (userNameEl) userNameEl.textContent = "Guest Visitor";
    if (userTierEl) userTierEl.textContent = "SIGN IN TO UNLOCK HD";
    if (logoutLink) {
      logoutLink.textContent = "Sign In / Register";
      logoutLink.setAttribute("href", "login.html");
      logoutLink.onclick = null;
    }
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function openTrailerById(animeId) {
  const anime = (typeof getAnimeById === "function") ? getAnimeById(animeId) : null;
  if (anime) {
    openTrailerModal(anime.title, anime.trailerUrl || anime.videoUrl);
  }
}

/* ==========================================================================
   UNIVERSAL TRAILER MODAL CONTROLLER
   ========================================================================== */
function openTrailerModal(title, videoUrl) {
  let modal = document.getElementById("trailerModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "trailerModal";
    modal.className = "trailer-modal-backdrop";
    modal.innerHTML = `
      <div class="trailer-modal-box">
        <div class="trailer-modal-header">
          <div class="trailer-modal-title" id="modalTitle">Official Trailer</div>
          <button class="trailer-modal-close" onclick="closeTrailerModal()">✕</button>
        </div>
        <div class="trailer-video-wrapper" id="modalVideoContainer"></div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeTrailerModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("active")) {
        closeTrailerModal();
      }
    });
  }

  const modalTitle = document.getElementById("modalTitle");
  const videoContainer = document.getElementById("modalVideoContainer");

  if (modal && videoContainer) {
    if (modalTitle) modalTitle.textContent = `${title} — Official Trailer`;
    
    const targetUrl = videoUrl || "https://www.youtube.com/embed/91tAkyZ_Vak";
    const isYouTube = targetUrl.includes("youtube.com") || targetUrl.includes("youtu.be");
    
    if (isYouTube) {
      let embedUrl = targetUrl;
      if (!embedUrl.includes("/embed/")) {
        const videoId = embedUrl.includes("v=") 
          ? embedUrl.split("v=")[1].split("&")[0] 
          : embedUrl.split("/").pop();
        embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
      } else if (!embedUrl.includes("autoplay=1")) {
        embedUrl += (embedUrl.includes("?") ? "&" : "?") + "autoplay=1";
      }
      videoContainer.innerHTML = `<iframe id="modalIframePlayer" src="${embedUrl}" title="${escapeHtml(title)} Trailer" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe>`;
    } else {
      videoContainer.innerHTML = `<video id="modalVideoPlayer" controls playsinline autoplay src="${targetUrl}"></video>`;
      const localVideo = document.getElementById("modalVideoPlayer");
      if (localVideo) {
        localVideo.onerror = () => {
          console.warn("Local video file unavailable, switching to online trailer fallback.");
          const fallbackEmbed = "https://www.youtube.com/embed/M_OauHnAFc8?autoplay=1";
          videoContainer.innerHTML = `<iframe id="modalIframePlayer" src="${fallbackEmbed}" title="${escapeHtml(title)} Trailer" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe>`;
        };
      }
    }
    
    modal.classList.add("active");
  }
}

function closeTrailerModal() {
  const modal = document.getElementById("trailerModal");
  if (modal) {
    modal.classList.remove("active");
    const container = document.getElementById("modalVideoContainer");
    if (container) container.innerHTML = "";
  }
}

window.openTrailerById = openTrailerById;
window.openTrailerModal = openTrailerModal;
window.closeTrailerModal = closeTrailerModal;
