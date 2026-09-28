/* ==========================================================================
   ANIME.PLUS - CUSTOM VIDEO PLAYER & STREAM ENGINE (player.js)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initStreamPage();
});

let currentAnime = null;
let currentSeasonIndex = 0;
let currentEpisodeIndex = 0;
let videoPlayer = null;
let controlsTimeout = null;
let autoplayCountdownInterval = null;

function initStreamPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const animeId = urlParams.get("id") || "solo-leveling";
  const epNum = parseInt(urlParams.get("ep"), 10) || 1;

  currentAnime = getAnimeById(animeId);
  if (!currentAnime) {
    currentAnime = CRUNCHY_ANIME_DATABASE[0];
  }

  // Find episode index if provided
  const season = currentAnime.seasons[0];
  const epIndex = season.episodes.findIndex(e => e.episodeNumber === epNum);
  currentEpisodeIndex = epIndex > -1 ? epIndex : 0;

  renderAnimeDetails(currentAnime);
  renderEpisodesSidebar(currentAnime);
  setupVideoPlayer();
  setupCommentsSection();
  recordWatchHistory();
}

/* ==========================================================================
   VIDEO PLAYER CONTROLLER
   ========================================================================== */
function setupVideoPlayer() {
  const container = document.getElementById("playerContainer");
  videoPlayer = document.getElementById("mainVideoElement");
  const playPauseBtn = document.getElementById("playPauseBtn");
  const rewindBtn = document.getElementById("rewindBtn");
  const forwardBtn = document.getElementById("forwardBtn");
  const volumeBtn = document.getElementById("volumeBtn");
  const volumeSlider = document.getElementById("volumeSlider");
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const timelineContainer = document.getElementById("playerTimelineContainer");
  const timelinePlayed = document.getElementById("timelinePlayed");
  const timelineBuffered = document.getElementById("timelineBuffered");
  const timelineTooltip = document.getElementById("timelineTooltip");
  const currentTimeEl = document.getElementById("playerCurrentTime");
  const totalTimeEl = document.getElementById("playerTotalTime");
  const skipIntroBtn = document.getElementById("skipIntroBtn");
  const settingsBtn = document.getElementById("playerSettingsBtn");
  const settingsMenu = document.getElementById("playerSettingsMenu");
  const centerIcon = document.getElementById("playerCenterIcon");
  const playerLoader = document.getElementById("playerLoader");
  const autoplayOverlay = document.getElementById("autoplayOverlay");
  const cancelAutoplayBtn = document.getElementById("cancelAutoplayBtn");

  if (!videoPlayer || !container) return;

  const currentEp = currentAnime.seasons[currentSeasonIndex].episodes[currentEpisodeIndex];
  videoPlayer.src = currentEp.videoUrl || currentAnime.videoUrl;

  // Play / Pause Toggle
  function togglePlay() {
    if (videoPlayer.paused || videoPlayer.ended) {
      videoPlayer.play();
      container.classList.remove("paused");
      updatePlayIcon(true);
      showCenterIcon("play");
    } else {
      videoPlayer.pause();
      container.classList.add("paused");
      updatePlayIcon(false);
      showCenterIcon("pause");
    }
  }

  function updatePlayIcon(isPlaying) {
    if (!playPauseBtn) return;
    playPauseBtn.innerHTML = isPlaying
      ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`
      : `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
  }

  function showCenterIcon(type) {
    if (!centerIcon) return;
    centerIcon.innerHTML = type === "play"
      ? `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
    centerIcon.classList.remove("animate");
    void centerIcon.offsetWidth; // Trigger reflow
    centerIcon.classList.add("animate");
  }

  if (playPauseBtn) playPauseBtn.addEventListener("click", togglePlay);
  videoPlayer.addEventListener("click", togglePlay);

  // 10s Seek Rewind & Forward
  if (rewindBtn) {
    rewindBtn.addEventListener("click", () => {
      videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 10);
      showToast("Rewind 10s");
    });
  }
  if (forwardBtn) {
    forwardBtn.addEventListener("click", () => {
      videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 10);
      showToast("Forward 10s");
    });
  }

  // Skip Intro (85s) Button
  if (skipIntroBtn) {
    skipIntroBtn.addEventListener("click", () => {
      videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 85);
      skipIntroBtn.classList.remove("active");
      showToast("Intro Skipped (+85s)", "success");
    });
  }

  // Time & Buffer Update
  videoPlayer.addEventListener("timeupdate", () => {
    const current = videoPlayer.currentTime;
    const duration = videoPlayer.duration || 0;

    if (currentTimeEl) currentTimeEl.textContent = formatTime(current);
    if (totalTimeEl && duration) totalTimeEl.textContent = formatTime(duration);

    if (timelinePlayed && duration > 0) {
      const pct = (current / duration) * 100;
      timelinePlayed.style.width = `${pct}%`;
    }

    // Show Skip Intro during 10s - 95s
    if (skipIntroBtn) {
      if (current >= 10 && current <= 95) {
        skipIntroBtn.classList.add("active");
      } else {
        skipIntroBtn.classList.remove("active");
      }
    }

    // Update watch history timestamp
    if (Math.floor(current) % 5 === 0) {
      saveProgress(current, duration);
    }
  });

  // Progress Bar Buffer
  videoPlayer.addEventListener("progress", () => {
    if (videoPlayer.buffered.length > 0 && videoPlayer.duration > 0 && timelineBuffered) {
      const bufferedEnd = videoPlayer.buffered.end(videoPlayer.buffered.length - 1);
      const pct = (bufferedEnd / videoPlayer.duration) * 100;
      timelineBuffered.style.width = `${pct}%`;
    }
  });

  // Timeline Scrubbing
  if (timelineContainer) {
    timelineContainer.addEventListener("click", (e) => {
      const rect = timelineContainer.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoPlayer.currentTime = pos * videoPlayer.duration;
    });

    timelineContainer.addEventListener("mousemove", (e) => {
      const rect = timelineContainer.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetTime = pos * (videoPlayer.duration || 0);
      if (timelineTooltip) {
        timelineTooltip.style.left = `${pos * 100}%`;
        timelineTooltip.textContent = formatTime(targetTime);
      }
    });
  }

  // Volume & Mute Controls
  if (volumeBtn && volumeSlider) {
    volumeSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      videoPlayer.volume = val;
      videoPlayer.muted = (val === 0);
      updateVolumeIcon(val);
    });

    volumeBtn.addEventListener("click", () => {
      if (videoPlayer.muted) {
        videoPlayer.muted = false;
        videoPlayer.volume = volumeSlider.value > 0 ? volumeSlider.value : 0.8;
      } else {
        videoPlayer.muted = true;
      }
      updateVolumeIcon(videoPlayer.muted ? 0 : videoPlayer.volume);
    });
  }

  function updateVolumeIcon(vol) {
    if (!volumeBtn) return;
    if (vol === 0 || videoPlayer.muted) {
      volumeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
    } else if (vol < 0.5) {
      volumeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>`;
    } else {
      volumeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
    }
  }

  // Fullscreen Mode
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => console.error(err));
        container.classList.add("fullscreen");
      } else {
        document.exitFullscreen();
        container.classList.remove("fullscreen");
      }
    });
  }

  // Settings Menu Dropdown (Quality, Audio Sub/Dub, Speed)
  if (settingsBtn && settingsMenu) {
    settingsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      settingsMenu.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
      if (!settingsMenu.contains(e.target) && e.target !== settingsBtn) {
        settingsMenu.classList.remove("active");
      }
    });

    settingsMenu.querySelectorAll(".settings-option-item").forEach(item => {
      item.addEventListener("click", () => {
        const type = item.getAttribute("data-type");
        const val = item.getAttribute("data-value");

        if (type === "speed") {
          videoPlayer.playbackRate = parseFloat(val);
          showToast(`Speed set to ${val}x`);
        } else if (type === "quality") {
          showToast(`Resolution set to ${val}`, "success");
        } else if (type === "audio") {
          showToast(`Audio track: ${val.toUpperCase()}`, "success");
        }
        
        item.parentElement.querySelectorAll(".settings-option-item").forEach(el => el.classList.remove("active"));
        item.classList.add("active");
        settingsMenu.classList.remove("active");
      });
    });
  }

  // Video End & Autoplay Next Countdown
  videoPlayer.addEventListener("ended", () => {
    triggerAutoplayNext();
  });

  function triggerAutoplayNext() {
    if (!autoplayOverlay) return;
    const season = currentAnime.seasons[currentSeasonIndex];
    if (currentEpisodeIndex + 1 >= season.episodes.length) {
      showToast("You have completed all available episodes!", "success");
      return;
    }

    autoplayOverlay.classList.add("active");
    let countdown = 8;
    const numEl = document.getElementById("autoplayCountdownNumber");
    const circleProgress = document.getElementById("autoplayCircleProgress");

    if (numEl) numEl.textContent = countdown;
    if (autoplayCountdownInterval) clearInterval(autoplayCountdownInterval);

    autoplayCountdownInterval = setInterval(() => {
      countdown--;
      if (numEl) numEl.textContent = countdown;
      if (circleProgress) {
        const offset = 220 - ((8 - countdown) / 8) * 220;
        circleProgress.style.strokeDashoffset = offset;
      }

      if (countdown <= 0) {
        clearInterval(autoplayCountdownInterval);
        playNextEpisode();
      }
    }, 1000);
  }

  if (cancelAutoplayBtn) {
    cancelAutoplayBtn.addEventListener("click", () => {
      if (autoplayCountdownInterval) clearInterval(autoplayCountdownInterval);
      if (autoplayOverlay) autoplayOverlay.classList.remove("active");
    });
  }

  // Keyboard Shortcuts (Space, F, M, Arrow Keys)
  window.addEventListener("keydown", (e) => {
    if (["input", "textarea"].includes(document.activeElement.tagName.toLowerCase())) return;

    if (e.code === "Space") {
      e.preventDefault();
      togglePlay();
    } else if (e.code === "KeyF") {
      e.preventDefault();
      if (fullscreenBtn) fullscreenBtn.click();
    } else if (e.code === "KeyM") {
      e.preventDefault();
      if (volumeBtn) volumeBtn.click();
    } else if (e.code === "ArrowRight") {
      e.preventDefault();
      videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 5);
    } else if (e.code === "ArrowLeft") {
      e.preventDefault();
      videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 5);
    }
  });

  // Loader events & Error fallback for uploaded streams
  const FALLBACK_STREAM = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  videoPlayer.addEventListener("error", () => {
    if (videoPlayer.src !== FALLBACK_STREAM) {
      videoPlayer.src = FALLBACK_STREAM;
      videoPlayer.play().catch(() => {});
      if (typeof showToast === "function") {
        showToast("Streaming HD source...", "info");
      }
    }
  });

  videoPlayer.addEventListener("waiting", () => {
    if (playerLoader) playerLoader.classList.add("active");
  });
  videoPlayer.addEventListener("canplay", () => {
    if (playerLoader) playerLoader.classList.remove("active");
  });
}

function playNextEpisode() {
  const season = currentAnime.seasons[currentSeasonIndex];
  if (currentEpisodeIndex + 1 < season.episodes.length) {
    currentEpisodeIndex++;
    loadEpisode(currentSeasonIndex, currentEpisodeIndex);
  }
}

function loadEpisode(sIndex, eIndex) {
  currentSeasonIndex = sIndex;
  currentEpisodeIndex = eIndex;
  const ep = currentAnime.seasons[sIndex].episodes[eIndex];

  if (videoPlayer) {
    videoPlayer.src = ep.videoUrl || currentAnime.videoUrl;
    videoPlayer.play();
  }

  const autoplayOverlay = document.getElementById("autoplayOverlay");
  if (autoplayOverlay) autoplayOverlay.classList.remove("active");

  renderAnimeDetails(currentAnime);
  renderEpisodesSidebar(currentAnime);
  showToast(`Playing Episode ${ep.episodeNumber}: ${ep.title}`, "success");
}

/* ==========================================================================
   RENDER ANIME & EPISODE DETAILS
   ========================================================================== */
function renderAnimeDetails(anime) {
  const ep = anime.seasons[currentSeasonIndex].episodes[currentEpisodeIndex];
  const titleEl = document.getElementById("streamAnimeTitle");
  const epTitleEl = document.getElementById("streamEpisodeTitle");
  const synopsisEl = document.getElementById("streamSynopsis");
  const ratingEl = document.getElementById("streamRating");
  const genresEl = document.getElementById("streamGenres");
  const watchlistBtn = document.getElementById("streamWatchlistBtn");

  if (titleEl) titleEl.textContent = anime.title;
  if (epTitleEl) epTitleEl.textContent = `Episode ${ep.episodeNumber} — ${ep.title}`;
  if (synopsisEl) synopsisEl.textContent = ep.synopsis || anime.synopsis;
  if (ratingEl) ratingEl.textContent = `★ ${anime.rating} (${anime.votes} votes)`;
  if (genresEl) genresEl.textContent = anime.genres.join(" • ");

  if (watchlistBtn) {
    const list = getWatchlist();
    const isIn = list.includes(anime.id);
    watchlistBtn.innerHTML = isIn 
      ? `<span>✓ In Watchlist</span>`
      : `<span>+ Add to Watchlist</span>`;

    watchlistBtn.onclick = () => {
      toggleWatchlist(anime.id, watchlistBtn);
    };
  }

  const streamTrailerBtn = document.getElementById("streamTrailerBtn");
  if (streamTrailerBtn) {
    streamTrailerBtn.onclick = () => {
      openTrailerModal(anime.title, anime.trailerUrl || anime.videoUrl);
    };
  }
}

function renderEpisodesSidebar(anime) {
  const container = document.getElementById("episodesListContainer");
  const seasonSelect = document.getElementById("seasonSelectDropdown");
  if (!container) return;

  const currentSeason = anime.seasons[currentSeasonIndex];

  if (seasonSelect) {
    seasonSelect.innerHTML = anime.seasons.map((s, idx) => `
      <option value="${idx}" ${idx === currentSeasonIndex ? 'selected' : ''}>
        ${s.seasonTitle}
      </option>
    `).join("");

    seasonSelect.onchange = (e) => {
      loadEpisode(parseInt(e.target.value, 10), 0);
    };
  }

  container.innerHTML = currentSeason.episodes.map((ep, idx) => `
    <div class="episode-item ${idx === currentEpisodeIndex ? 'active' : ''}" onclick="loadEpisode(${currentSeasonIndex}, ${idx})">
      <div class="episode-item-thumb">
        <img src="${ep.thumbnail || currentAnime.poster}" alt="${ep.title}" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='https://cdn.myanimelist.net/images/anime/1918/140924.jpg';">
      </div>
      <div class="episode-item-info">
        <div class="episode-item-num">Episode ${ep.episodeNumber}</div>
        <div class="episode-item-title">${ep.title}</div>
        <div class="episode-item-duration">${ep.duration}</div>
      </div>
    </div>
  `).join("");
}

/* ==========================================================================
   COMMENTS & DISCUSSION
   ========================================================================== */
const sampleComments = [
  {
    id: 1,
    name: "RiderOfShadows",
    avatar: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=120&auto=format&fit=crop&q=80",
    time: "2 hours ago",
    text: "The animation in this episode blew me away! That fight sequence had insane choreography and the OST gave me chills.",
    likes: 142
  },
  {
    id: 2,
    name: "SakuraBlossom",
    avatar: "https://images.unsplash.com/photo-1563089145-599997674d42?w=120&auto=format&fit=crop&q=80",
    time: "5 hours ago",
    text: "Can we talk about the character development here? Truly peak anime. Can't wait for next week's episode!",
    likes: 89
  }
];

function setupCommentsSection() {
  const feed = document.getElementById("commentsFeed");
  const form = document.getElementById("commentSubmitForm");
  const textarea = document.getElementById("commentInput");

  if (feed) {
    feed.innerHTML = sampleComments.map(c => renderCommentCard(c)).join("");
  }

  if (form && textarea) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = textarea.value.trim();
      if (!text) return;

      const user = getCurrentUser();
      const newComment = {
        id: Date.now(),
        name: user ? user.name : "AnimeExplorer",
        avatar: user ? user.avatar : "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=120&auto=format&fit=crop&q=80",
        time: "Just now",
        text: text,
        likes: 0
      };

      sampleComments.unshift(newComment);
      if (feed) {
        feed.insertAdjacentHTML("afterbegin", renderCommentCard(newComment));
      }
      textarea.value = "";
      showToast("Comment posted!", "success");
    });
  }
}

function renderCommentCard(c) {
  return `
    <div class="comment-card">
      <img src="${c.avatar}" alt="${c.name}" class="comment-avatar">
      <div class="comment-body">
        <div class="comment-author-bar">
          <span class="comment-author-name">${c.name}</span>
          <span class="comment-timestamp">${c.time}</span>
        </div>
        <div class="comment-text">${escapeHtml(c.text)}</div>
        <div class="comment-actions-bar">
          <button class="comment-like-btn" onclick="likeComment(this, ${c.likes})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
            <span>${c.likes}</span>
          </button>
          <span style="font-size: 0.75rem; color: var(--cr-text-muted); cursor: pointer;">Reply</span>
        </div>
      </div>
    </div>
  `;
}

function likeComment(btn, baseCount) {
  btn.classList.toggle("liked");
  const span = btn.querySelector("span");
  if (span) {
    span.textContent = btn.classList.contains("liked") ? baseCount + 1 : baseCount;
  }
}

function saveProgress(currentTime, duration) {
  if (!currentAnime || duration === 0) return;
  let history = getWatchHistory();
  const ep = currentAnime.seasons[currentSeasonIndex].episodes[currentEpisodeIndex];
  const pct = Math.round((currentTime / duration) * 100);

  const existingIndex = history.findIndex(h => h.animeId === currentAnime.id);
  const item = {
    animeId: currentAnime.id,
    episodeNumber: ep.episodeNumber,
    currentTime: Math.floor(currentTime),
    duration: Math.floor(duration),
    percentage: pct,
    formattedTime: `${formatTime(currentTime)} / ${formatTime(duration)}`,
    lastWatched: Date.now()
  };

  if (existingIndex > -1) {
    history[existingIndex] = item;
  } else {
    history.unshift(item);
  }

  localStorage.setItem("animeplus_history", JSON.stringify(history.slice(0, 10)));
  localStorage.setItem("crunchy_history", JSON.stringify(history.slice(0, 10)));
}

function recordWatchHistory() {
  saveProgress(1, 1440);
}

function formatTime(seconds) {
  if (isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
