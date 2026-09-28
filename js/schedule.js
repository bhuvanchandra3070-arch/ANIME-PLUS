/* ==========================================================================
   ANIME.PLUS - SIMULCAST RELEASE SCHEDULE (schedule.js)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initSchedulePage();
});

const SCHEDULE_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SIMULCAST_SCHEDULE = {
  "Sunday": [
    { id: "one-piece", title: "One Piece", episode: "Episode 1101", time: "9:30 AM JST", badge: "NEW EPISODE" },
    { id: "demon-slayer", title: "Demon Slayer: Kimetsu no Yaiba", episode: "Episode 8", time: "11:15 PM JST", badge: "SIMULCAST" }
  ],
  "Monday": [
    { id: "bleach-tybw", title: "Bleach: Thousand-Year Blood War", episode: "Episode 28", time: "11:00 PM JST", badge: "PREMIERES" },
    { id: "blue-lock", title: "Blue Lock", episode: "Episode 15", time: "1:30 AM JST", badge: "SIMULCAST" }
  ],
  "Tuesday": [
    { id: "chainsaw-man", title: "Chainsaw Man", episode: "Episode 13", time: "12:00 AM JST", badge: "SIMULCAST" }
  ],
  "Wednesday": [
    { id: "frieren", title: "Frieren: Beyond Journey's End", episode: "Episode 29", time: "11:00 PM JST", badge: "SIMULCAST" }
  ],
  "Thursday": [
    { id: "jujutsu-kaisen", title: "Jujutsu Kaisen", episode: "Episode 48", time: "11:56 PM JST", badge: "SIMULCAST" }
  ],
  "Friday": [
    { id: "solo-leveling", title: "Solo Leveling", episode: "Episode 13", time: "12:00 AM JST", badge: "NEW SEASON" }
  ],
  "Saturday": [
    { id: "kaiju-no-8", title: "Kaiju No. 8", episode: "Episode 11", time: "11:00 PM JST", badge: "SIMULCAST" },
    { id: "my-hero-academia", title: "My Hero Academia", episode: "Episode 159", time: "5:30 PM JST", badge: "SIMULCAST" }
  ]
};

function initSchedulePage() {
  const navContainer = document.getElementById("scheduleDaysNav");
  const gridContainer = document.getElementById("scheduleGrid");
  if (!navContainer || !gridContainer) return;

  const todayIndex = new Date().getDay();
  let currentDay = SCHEDULE_DAYS[todayIndex];

  // Render Day Tabs
  navContainer.innerHTML = SCHEDULE_DAYS.map((day, idx) => `
    <button class="schedule-day-tab ${day === currentDay ? 'active' : ''}" data-day="${day}">
      <span class="schedule-day-name">${day.slice(0, 3)}</span>
      <span class="schedule-day-date">${idx === todayIndex ? 'TODAY' : day}</span>
    </button>
  `).join("");

  // Attach tab clicks
  navContainer.querySelectorAll(".schedule-day-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      navContainer.querySelectorAll(".schedule-day-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentDay = tab.getAttribute("data-day");
      renderScheduleForDay(currentDay, gridContainer);
    });
  });

  renderScheduleForDay(currentDay, gridContainer);
}

function renderScheduleForDay(day, container) {
  const items = SIMULCAST_SCHEDULE[day] || [];

  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-results-state">
        <div class="empty-icon">📅</div>
        <h3>No Simulcasts Scheduled</h3>
        <p>Check back tomorrow for more upcoming anime releases!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => {
    const anime = getAnimeById(item.id);
    return `
      <a href="watch.html?id=${anime.id}" class="schedule-card">
        <div class="schedule-card-thumb">
          <img src="${anime.poster}" alt="${anime.title}" loading="lazy" onerror="this.onerror=null; this.src='https://cdn.myanimelist.net/images/anime/1918/140924.jpg';">
        </div>
        <div class="schedule-card-info">
          <div class="schedule-time-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>${item.time}</span>
          </div>
          <h4 class="schedule-anime-title">${anime.title}</h4>
          <div class="schedule-ep-title">${item.episode}</div>
          <div class="schedule-meta-bar">
            <span class="badge badge-orange">${item.badge}</span>
            <span class="badge badge-sub">SUB</span>
            <span class="badge badge-dub">DUB</span>
          </div>
        </div>
      </a>
    `;
  }).join("");
}
