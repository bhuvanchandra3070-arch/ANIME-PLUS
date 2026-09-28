/* ==========================================================================
   CRUNCHYHUB - BROWSE, FILTER & MAL API SEARCH (browse.js)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initBrowsePage();
});

let currentGenre = "all";
let currentAudio = "all";
let currentSort = "popular";
let searchQuery = "";

function initBrowsePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const genreParam = urlParams.get("genre");
  const queryParam = urlParams.get("q");

  if (genreParam) currentGenre = genreParam.toLowerCase();
  if (queryParam) searchQuery = queryParam.trim();

  setupFilterControls();
  renderAnimeGrid();
}

function setupFilterControls() {
  const searchInput = document.getElementById("browseSearchInput");
  const genreChips = document.querySelectorAll(".genre-chip");
  const audioSelect = document.getElementById("audioFilterSelect");
  const sortSelect = document.getElementById("sortFilterSelect");

  if (searchInput) {
    if (searchQuery) searchInput.value = searchQuery;
    searchInput.addEventListener("input", debounce((e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderAnimeGrid();
    }, 250));
  }

  if (genreChips.length) {
    genreChips.forEach(chip => {
      const g = chip.getAttribute("data-genre").toLowerCase();
      if (g === currentGenre) chip.classList.add("active");
      else chip.classList.remove("active");

      chip.addEventListener("click", () => {
        genreChips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        currentGenre = chip.getAttribute("data-genre").toLowerCase();
        renderAnimeGrid();
      });
    });
  }

  if (audioSelect) {
    audioSelect.addEventListener("change", (e) => {
      currentAudio = e.target.value;
      renderAnimeGrid();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      renderAnimeGrid();
    });
  }
}

function renderAnimeGrid() {
  const grid = document.getElementById("browseAnimeGrid");
  const countEl = document.getElementById("resultsCountDisplay");
  if (!grid) return;

  let results = [...CRUNCHY_ANIME_DATABASE];

  // 1. Genre Filter
  if (currentGenre !== "all") {
    results = results.filter(anime => 
      anime.genres.some(g => g.toLowerCase() === currentGenre)
    );
  }

  // 2. Audio Filter
  if (currentAudio !== "all") {
    results = results.filter(anime => anime.audio.includes(currentAudio));
  }

  // 3. Search Query Filter
  if (searchQuery) {
    results = results.filter(anime => 
      anime.title.toLowerCase().includes(searchQuery) ||
      anime.japaneseTitle.toLowerCase().includes(searchQuery) ||
      anime.genres.some(g => g.toLowerCase().includes(searchQuery))
    );
  }

  // 4. Sort
  if (currentSort === "popular") {
    results.sort((a, b) => (a.rank || 99) - (b.rank || 99));
  } else if (currentSort === "rating") {
    results.sort((a, b) => b.rating - a.rating);
  } else if (currentSort === "newest") {
    results.sort((a, b) => b.year - a.year);
  } else if (currentSort === "alpha") {
    results.sort((a, b) => a.title.localeCompare(b.title));
  }

  if (countEl) {
    countEl.textContent = `${results.length} Series`;
  }

  if (results.length === 0) {
    // If no local results, offer Jikan live search
    grid.innerHTML = `
      <div class="empty-results-state">
        <div class="empty-icon">📺</div>
        <h3>No local results for "${escapeHtml(searchQuery || currentGenre)}"</h3>
        <p>Would you like to search the global MyAnimeList database live?</p>
        <button class="btn btn-primary" onclick="searchLiveMAL('${escapeHtml(searchQuery)}')">
          Search Global Anime Database
        </button>
      </div>
    `;
  } else {
    grid.innerHTML = results.map(anime => createAnimeCardHTML(anime)).join("");
  }
  if (window.Anime3DEngine) {
    window.Anime3DEngine.init();
  }
}

// Optional Live MAL (Jikan) API Fallback
async function searchLiveMAL(query) {
  const grid = document.getElementById("browseAnimeGrid");
  if (!grid || !query) return;

  grid.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
      <div class="player-loader active" style="position: relative; margin: 0 auto 1rem;"></div>
      <p style="color: var(--cr-text-secondary);">Searching global anime archives...</p>
    </div>
  `;

  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=12&sfw=true`);
    const data = await res.json();

    if (data.data && data.data.length > 0) {
      grid.innerHTML = data.data.map(item => `
        <div class="anime-card" onclick="location.href='watch.html?id=solo-leveling'">
          <div class="anime-card-poster">
            <img src="${item.images.jpg.large_image_url || item.images.jpg.image_url}" alt="${item.title}" loading="lazy">
            <span class="badge badge-orange card-badge-top-left">${item.type || 'TV'}</span>
            <div class="card-hover-overlay">
              <div class="card-hover-play">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
          </div>
          <div class="anime-card-info">
            <div class="anime-card-title">${item.title}</div>
            <div class="anime-card-meta">
              <span class="badge badge-rating">★ ${item.score || '8.5'}</span>
              <span class="anime-card-audio">
                <span class="badge badge-sub">SUB</span>
              </span>
            </div>
          </div>
        </div>
      `).join("");
    } else {
      grid.innerHTML = `<div class="empty-results-state"><h3>No results found globally.</h3></div>`;
    }
  } catch (err) {
    grid.innerHTML = `<div class="empty-results-state"><h3>Unable to connect to live database.</h3></div>`;
  }
}

function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
