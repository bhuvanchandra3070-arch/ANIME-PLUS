/* ==========================================================================
   ANIME.PLUS - WATCHLIST & HISTORY CONTROLLER (watchlist.js)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initWatchlistPage();
});

let currentTab = "watchlist";

function initWatchlistPage() {
  const tabs = document.querySelectorAll(".watchlist-tab-btn");
  if (tabs.length) {
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        currentTab = tab.getAttribute("data-tab");
        renderCurrentTabContent();
      });
    });
  }

  renderCurrentTabContent();
}

function renderCurrentTabContent() {
  const grid = document.getElementById("watchlistAnimeGrid");
  const countEl = document.getElementById("watchlistCountDisplay");
  if (!grid) return;

  if (currentTab === "watchlist") {
    const list = getWatchlist();
    if (countEl) countEl.textContent = `${list.length} Items`;

    if (list.length === 0) {
      grid.innerHTML = `
        <div class="empty-results-state">
          <div class="empty-icon">🔖</div>
          <h3>Your Watchlist is Empty</h3>
          <p>Explore our library and bookmark your favorite anime series to watch later.</p>
          <a href="browse.html" class="btn btn-primary">Browse Anime</a>
        </div>
      `;
    } else {
      grid.innerHTML = list.map(id => {
        const anime = getAnimeById(id);
        return createAnimeCardHTML(anime);
      }).join("");
    }
  } else if (currentTab === "history") {
    const history = getWatchHistory();
    if (countEl) countEl.textContent = `${history.length} Recently Watched`;

    if (history.length === 0) {
      grid.innerHTML = `
        <div class="empty-results-state">
          <div class="empty-icon">⏱️</div>
          <h3>No Watch History Yet</h3>
          <p>Episodes you watch will appear here so you can easily pick up where you left off.</p>
          <a href="browse.html" class="btn btn-primary">Discover Series</a>
        </div>
      `;
    } else {
      grid.innerHTML = history.map(item => {
        const anime = getAnimeById(item.animeId);
        return `
          <div class="anime-card" onclick="location.href='watch.html?id=${anime.id}&ep=${item.episodeNumber}'">
            <div class="anime-card-poster">
              <img src="${anime.poster}" alt="${anime.title}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='https://cdn.myanimelist.net/images/anime/1918/140924.jpg';">
              <div class="continue-progress-bar">
                <div class="continue-progress-fill" style="width: ${item.percentage}%"></div>
              </div>
              <div class="card-hover-overlay">
                <div class="card-hover-play">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
            </div>
            <div class="anime-card-info">
              <div class="anime-card-title">${anime.title}</div>
              <div class="anime-card-meta">
                <span style="color: var(--cr-orange); font-weight: 700;">Ep ${item.episodeNumber}</span>
                <span>•</span>
                <span>${item.formattedTime}</span>
              </div>
            </div>
          </div>
        `;
      }).join("");
    }
  }
}
