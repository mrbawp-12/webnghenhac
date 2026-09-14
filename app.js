/**
 * Web Nghe Nhạc - Core Application Logic
 */

// DOM Elements
const audioPlayer = document.getElementById("audioPlayer");
const playlistEl = document.getElementById("playlist");
const currentTitle = document.getElementById("currentTitle");
const currentMeta = document.getElementById("currentMeta");
const trackBadge = document.getElementById("trackBadge");
const countText = document.getElementById("countText");
const favCountEl = document.getElementById("favCount");
const uploadCountEl = document.getElementById("uploadCount");

// Player Controls
const playBtn = document.getElementById("playBtn");
const playIcon = document.getElementById("playIcon");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const repeatBtn = document.getElementById("repeatBtn");
const repeatIcon = document.getElementById("repeatIcon");

// Progress & Time
const progressFill = document.getElementById("progressFill");
const seekSlider = document.getElementById("seekSlider");
const currentTimeEl = document.getElementById("currentTime");
const totalDurationEl = document.getElementById("totalDuration");

// Volume & Speed
const volumeSlider = document.getElementById("volumeSlider");
const muteBtn = document.getElementById("muteBtn");
const volumeIcon = document.getElementById("volumeIcon");
const speedSelect = document.getElementById("speedSelect");

// Visuals
const vinylDisc = document.getElementById("vinylDisc");
const waveVisualizer = document.getElementById("waveVisualizer");

// Upload & Drop
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const addStatus = document.getElementById("addStatus");

// Search & Tabs
const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const tabButtons = document.querySelectorAll(".tab-btn");

// Theme & Modal
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeIcon = document.getElementById("themeIcon");
const shortcutsBtn = document.getElementById("shortcutsBtn");
const shortcutsModal = document.getElementById("shortcutsModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const toastContainer = document.getElementById("toastContainer");

// Storage Constants
const TRACKS_MANIFEST = "songs.json";
const TRACKS_API = "/api/tracks";
const TRACKS_CACHE_KEY = "web-nghe-nhac.tracks";
const CURRENT_TRACK_KEY = "web-nghe-nhac.currentTrackUrl";
const FAVORITES_KEY = "web-nghe-nhac.favorites";
const THEME_KEY = "web-nghe-nhac.theme";
const VOLUME_KEY = "web-nghe-nhac.volume";
const LOCAL_DB_NAME = "web-nghe-nhac";
const LOCAL_DB_VERSION = 1;
const LOCAL_TRACKS_STORE = "localTracks";
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".webm"];

// Application State
let tracks = [];
let currentIndex = -1;
let searchQuery = "";
let currentTab = "all"; // 'all' | 'favorites' | 'uploads'
let isShuffle = false;
let repeatMode = "off"; // 'off' | 'all' | 'one'
let favorites = new Set();
let isSeeking = false;
let lastVolume = 0.8;

// SVG Icons Constants
const ICONS = {
  play: '<path d="M8 5v14l11-7z"></path>',
  pause: '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path>',
  volumeHigh: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>',
  volumeLow: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>',
  volumeMute: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>',
  sun: '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>',
  repeatOff: '<polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>',
  repeatOne: '<polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path><text x="12" y="15" font-size="9" font-weight="bold" fill="currentColor" text-anchor="middle">1</text>',
};

// ==========================================
// Helper Functions
// ==========================================

function formatName(fileName) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
}

function isAudioFile(fileName) {
  const lower = fileName.toLowerCase();
  return AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// ==========================================
// IndexedDB Local Storage
// ==========================================

function openLocalTracksDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("Trình duyệt không hỗ trợ IndexedDB."));
      return;
    }

    const request = indexedDB.open(LOCAL_DB_NAME, LOCAL_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LOCAL_TRACKS_STORE)) {
        db.createObjectStore(LOCAL_TRACKS_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Không mở được cơ sở dữ liệu."));
  });
}

function localTrackRecordToTrack(record) {
  const file = record.file;
  if (!file) return null;
  return {
    type: "upload",
    source: "indexeddb",
    localId: record.id,
    name: record.name || formatName(record.fileName || "Bài hát"),
    fileName: record.fileName || file?.name || "",
    mimeType: record.mimeType || file?.type || "audio/mpeg",
    url: URL.createObjectURL(file),
  };
}

async function loadLocalUploadedTracks() {
  let db;
  try {
    db = await openLocalTracksDb();
    return await new Promise((resolve, reject) => {
      const request = db.transaction(LOCAL_TRACKS_STORE, "readonly").objectStore(LOCAL_TRACKS_STORE).getAll();
      request.onsuccess = () => resolve((request.result || []).map(localTrackRecordToTrack).filter(Boolean));
      request.onerror = () => reject(request.error || new Error("Không đọc được nhạc cục bộ."));
    });
  } catch (_) {
    return [];
  } finally {
    db?.close();
  }
}

async function saveLocalUploadedTrack(file) {
  let db;
  try {
    db = await openLocalTracksDb();
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const record = {
      id,
      file,
      fileName: file.name,
      name: formatName(file.name),
      mimeType: file.type || "audio/mpeg",
      createdAt: Date.now(),
    };

    await new Promise((resolve, reject) => {
      const request = db.transaction(LOCAL_TRACKS_STORE, "readwrite").objectStore(LOCAL_TRACKS_STORE).put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error("Không lưu được file nhạc."));
    });

    return localTrackRecordToTrack(record);
  } finally {
    db?.close();
  }
}

async function deleteLocalUploadedTrack(localId) {
  let db;
  try {
    db = await openLocalTracksDb();
    await new Promise((resolve, reject) => {
      const request = db.transaction(LOCAL_TRACKS_STORE, "readwrite").objectStore(LOCAL_TRACKS_STORE).delete(localId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error("Không thể xoá file."));
    });
    return true;
  } catch (_) {
    return false;
  } finally {
    db?.close();
  }
}

// ==========================================
// Track Normalization & Cache
// ==========================================

function isPlayableTrack(track) {
  if (!track || typeof track !== "object") return false;
  if (track.type === "upload") return true;
  const url = typeof track.url === "string" ? track.url.split("?")[0] : "";
  return isAudioFile(url) || url.includes("/api/media") || url.includes("/songs/") || url.includes("songs/");
}

function guessNameFromUrl(url) {
  try {
    const parsed = new URL(url, window.location.href);
    const lastPart = decodeURIComponent(parsed.pathname.split("/").pop() || "");
    if (lastPart) return formatName(lastPart);
    return formatName(parsed.hostname.replace(/^www\./, ""));
  } catch (_) {
    return formatName(url);
  }
}

function normalizeTrack(item) {
  if (typeof item === "string") {
    return {
      type: "local",
      name: formatName(item),
      url: new URL(`songs/${encodeURIComponent(item)}`, window.location.href).href,
    };
  }

  if (!item || typeof item !== "object") return null;

  const url = typeof item.url === "string" && item.url ? new URL(item.url, window.location.href).href : "";
  if (!url) return null;

  const fileName = typeof item.fileName === "string" ? item.fileName : "";
  const name = typeof item.name === "string" && item.name ? item.name : formatName(fileName || guessNameFromUrl(url));

  return {
    ...item,
    type: item.type || (url.includes("/api/media") ? "upload" : "local"),
    name,
    url,
  };
}

function normalizeTracks(data) {
  if (!Array.isArray(data)) return [];
  return data.map(normalizeTrack).filter((track) => track && isPlayableTrack(track));
}

function trackStorageKey(track) {
  if (track?.localId) return `local:${track.localId}`;
  return track?.url || "";
}

function dedupeTracks(items) {
  const seen = new Set();
  return items.filter((track) => {
    const key = trackStorageKey(track);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function serializableTrack(track) {
  if (track.source === "indexeddb" || track.url?.startsWith("blob:")) return null;
  return track;
}

function getEmbeddedTracks() {
  return Array.isArray(window.__SONGS_MANIFEST__) ? normalizeTracks(window.__SONGS_MANIFEST__) : [];
}

function readCachedTracks() {
  try {
    const cached = localStorage.getItem(TRACKS_CACHE_KEY);
    return cached ? normalizeTracks(JSON.parse(cached)) : [];
  } catch (_) {
    return [];
  }
}

function saveCachedTracks(nextTracks) {
  try {
    localStorage.setItem(TRACKS_CACHE_KEY, JSON.stringify(nextTracks.map(serializableTrack).filter(Boolean)));
  } catch (_) {}
}

function rememberCurrentTrack(track) {
  try {
    const key = trackStorageKey(track);
    if (key) {
      localStorage.setItem(CURRENT_TRACK_KEY, key);
    } else {
      localStorage.removeItem(CURRENT_TRACK_KEY);
    }
  } catch (_) {}
}

function restoreCurrentIndex(list) {
  try {
    const currentKey = localStorage.getItem(CURRENT_TRACK_KEY);
    if (!currentKey) return -1;
    return list.findIndex((track) => trackStorageKey(track) === currentKey || track.url === currentKey);
  } catch (_) {
    return -1;
  }
}

// ==========================================
// Favorites Management
// ==========================================

function loadFavorites() {
  try {
    const fav = localStorage.getItem(FAVORITES_KEY);
    favorites = new Set(fav ? JSON.parse(fav) : []);
  } catch (_) {
    favorites = new Set();
  }
  updateTabCounts();
}

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
  } catch (_) {}
  updateTabCounts();
}

function toggleFavorite(trackKey, event) {
  if (event) event.stopPropagation();
  if (favorites.has(trackKey)) {
    favorites.delete(trackKey);
    showToast("Đã bỏ khỏi danh sách yêu thích");
  } else {
    favorites.add(trackKey);
    showToast("Đã thêm vào danh sách yêu thích ❤️");
  }
  saveFavorites();
  renderPlaylist();
}

function updateTabCounts() {
  const favCount = tracks.filter((t) => favorites.has(trackStorageKey(t))).length;
  const uploadCount = tracks.filter((t) => t.type === "upload").length;
  favCountEl.textContent = String(favCount);
  uploadCountEl.textContent = String(uploadCount);
}

// ==========================================
// Filtering & Playlist Rendering
// ==========================================

function getFilteredTrackEntries() {
  const terms = normalizeSearchText(searchQuery).split(/\s+/).filter(Boolean);

  return tracks
    .map((track, index) => ({ track, index }))
    .filter(({ track }) => {
      // Tab filter
      const key = trackStorageKey(track);
      if (currentTab === "favorites" && !favorites.has(key)) return false;
      if (currentTab === "uploads" && track.type !== "upload") return false;

      // Search filter
      if (!terms.length) return true;
      const normalizedName = normalizeSearchText(track.name);
      return terms.every((term) => normalizedName.includes(term));
    });
}

function highlightMatch(text, query) {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const q = normalizeSearchText(query);
  if (!q) return escaped;

  // Simple safe highlight
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return escaped.replace(regex, "<mark>$1</mark>");
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderPlaylist() {
  playlistEl.replaceChildren();
  const visibleEntries = getFilteredTrackEntries();
  const isPlaying = !audioPlayer.paused && !audioPlayer.ended && audioPlayer.currentTime > 0;

  countText.textContent = searchQuery || currentTab !== "all" ? `${visibleEntries.length}/${tracks.length} bài` : `${tracks.length} bài`;

  if (!tracks.length) {
    const empty = document.createElement("li");
    empty.className = "empty-playlist";
    empty.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M9 18V5l12-2v13"></path>
        <circle cx="6" cy="18" r="3"></circle>
        <circle cx="18" cy="16" r="3"></circle>
      </svg>
      <strong>Chưa có bài hát nào</strong>
      <small>Hãy kéo thả file nhạc vào khung bên trái để bắt đầu</small>
    `;
    playlistEl.appendChild(empty);
    return;
  }

  if (!visibleEntries.length) {
    const empty = document.createElement("li");
    empty.className = "empty-playlist";
    empty.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <strong>Không tìm thấy bài hát phù hợp</strong>
      <small>Thử tìm từ khóa khác hoặc chuyển sang tab "Tất cả"</small>
    `;
    playlistEl.appendChild(empty);
    return;
  }

  visibleEntries.forEach(({ track, index }) => {
    const key = trackStorageKey(track);
    const isCurrent = index === currentIndex;
    const isFav = favorites.has(key);

    const li = document.createElement("li");
    li.className = `playlist-item ${isCurrent ? "active" : ""} ${isCurrent && isPlaying ? "is-playing" : ""}`;

    // Left info
    const leftDiv = document.createElement("div");
    leftDiv.className = "track-left";

    // Index or Equalizer
    const indexIcon = document.createElement("div");
    indexIcon.className = "track-index-icon";
    indexIcon.innerHTML = `
      <span class="track-num">${index + 1}</span>
      <div class="mini-equalizer">
        <div class="mini-eq-bar"></div>
        <div class="mini-eq-bar"></div>
        <div class="mini-eq-bar"></div>
      </div>
    `;

    // Title and Tags
    const infoText = document.createElement("div");
    infoText.className = "track-info-text";

    const nameSpan = document.createElement("div");
    nameSpan.className = "track-name";
    nameSpan.innerHTML = highlightMatch(track.name, searchQuery);

    const tagsSpan = document.createElement("div");
    tagsSpan.className = "track-tags";
    const tagText = track.type === "upload" ? "Đã tải lên" : "Thư viện";
    tagsSpan.innerHTML = `<span class="badge" style="padding: 1px 6px; font-size: 0.7rem;">${tagText}</span>`;

    infoText.append(nameSpan, tagsSpan);
    leftDiv.append(indexIcon, infoText);

    // Right Actions (Favorite & Delete)
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "track-actions";

    // Favorite Button
    const favBtn = document.createElement("button");
    favBtn.className = `action-icon-btn fav-btn ${isFav ? "is-fav" : ""}`;
    favBtn.title = isFav ? "Bỏ yêu thích" : "Yêu thích";
    favBtn.innerHTML = isFav
      ? `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
    favBtn.addEventListener("click", (e) => toggleFavorite(key, e));
    actionsDiv.appendChild(favBtn);

    // Delete button (for local IndexedDB uploads)
    if (track.source === "indexeddb" && track.localId) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "action-icon-btn delete-btn";
      deleteBtn.title = "Xoá bài hát này";
      deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
      deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (confirm(`Bạn có chắc muốn xoá bài "${track.name}" khỏi thiết bị?`)) {
          await deleteLocalTrack(index, track);
        }
      });
      actionsDiv.appendChild(deleteBtn);
    }

    li.append(leftDiv, actionsDiv);
    li.addEventListener("click", () => playTrack(index));
    playlistEl.appendChild(li);
  });
}

async function deleteLocalTrack(index, track) {
  if (track.url?.startsWith("blob:")) {
    URL.revokeObjectURL(track.url);
  }
  await deleteLocalUploadedTrack(track.localId);

  tracks.splice(index, 1);
  saveCachedTracks(tracks);

  if (currentIndex === index) {
    if (tracks.length > 0) {
      playTrack(Math.min(index, tracks.length - 1));
    } else {
      audioPlayer.pause();
      audioPlayer.src = "";
      currentIndex = -1;
      updateNowPlaying();
    }
  } else if (currentIndex > index) {
    currentIndex--;
  }

  showToast("Đã xoá bài hát thành công");
  updateTabCounts();
  renderPlaylist();
}

// ==========================================
// Player Logic & MediaSession
// ==========================================

function currentTrack() {
  return currentIndex >= 0 && currentIndex < tracks.length ? tracks[currentIndex] : null;
}

function updateNowPlaying() {
  const track = currentTrack();

  if (!track) {
    currentTitle.textContent = "Chưa chọn bài nào";
    currentMeta.textContent = "Chọn một bài hát để phát";
    trackBadge.style.display = "none";
    currentTimeEl.textContent = "00:00";
    totalDurationEl.textContent = "00:00";
    progressFill.style.width = "0%";
    seekSlider.value = "0";
    document.title = "Web Nghe Nhạc";
    return;
  }

  currentTitle.textContent = track.name;
  currentMeta.textContent = `Bài ${currentIndex + 1} / ${tracks.length}`;
  trackBadge.style.display = "inline-block";
  trackBadge.textContent = track.type === "upload" ? "Đã tải lên" : "Thư viện";
  document.title = `▶ ${track.name} - Web Nghe Nhạc`;

  // MediaSession API Integration
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name,
      artist: "Web Nghe Nhạc",
      album: track.type === "upload" ? "Nhạc cá nhân" : "Tuyển tập",
      artwork: [
        { src: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎵</text></svg>", sizes: "96x96", type: "image/svg+xml" },
      ],
    });
  }
}

async function playTrack(index) {
  if (index < 0 || index >= tracks.length) return;

  currentIndex = index;
  const track = tracks[index];
  rememberCurrentTrack(track);

  if (audioPlayer.src !== track.url) {
    audioPlayer.src = track.url;
  }

  audioPlayer.playbackRate = parseFloat(speedSelect.value) || 1.0;

  try {
    await audioPlayer.play();
  } catch (_) {
    // Autoplay restrictions handle
  }

  updateNowPlaying();
  renderPlaylist();
}

function togglePlay() {
  if (!tracks.length) return;

  if (currentIndex < 0) {
    playTrack(0);
    return;
  }

  if (audioPlayer.paused) {
    audioPlayer.play().catch(() => {});
  } else {
    audioPlayer.pause();
  }
}

function nextTrack() {
  if (!tracks.length) return;

  if (isShuffle) {
    playRandomTrack();
    return;
  }

  const nextIndex = (currentIndex + 1) % tracks.length;
  playTrack(nextIndex);
}

function prevTrack() {
  if (!tracks.length) return;

  if (audioPlayer.currentTime > 3) {
    audioPlayer.currentTime = 0;
    return;
  }

  if (isShuffle) {
    playRandomTrack();
    return;
  }

  const prevIndex = currentIndex <= 0 ? tracks.length - 1 : currentIndex - 1;
  playTrack(prevIndex);
}

function playRandomTrack() {
  if (!tracks.length) return;
  if (tracks.length === 1) {
    playTrack(0);
    return;
  }

  let nextIndex;
  do {
    nextIndex = Math.floor(Math.random() * tracks.length);
  } while (nextIndex === currentIndex && tracks.length > 1);

  playTrack(nextIndex);
}

function toggleShuffle() {
  isShuffle = !isShuffle;
  shuffleBtn.classList.toggle("active", isShuffle);
  showToast(isShuffle ? "Bật chế độ phát ngẫu nhiên" : "Tắt phát ngẫu nhiên");
}

function toggleRepeat() {
  if (repeatMode === "off") {
    repeatMode = "all";
    repeatBtn.classList.add("active");
    repeatBtn.title = "Lặp lại danh sách (L)";
    repeatIcon.innerHTML = ICONS.repeatOff;
    showToast("Lặp lại: Toàn bộ danh sách 🔁");
  } else if (repeatMode === "all") {
    repeatMode = "one";
    repeatBtn.classList.add("active");
    repeatBtn.title = "Lặp lại 1 bài (L)";
    repeatIcon.innerHTML = ICONS.repeatOne;
    showToast("Lặp lại: Bài hát hiện tại 🔂");
  } else {
    repeatMode = "off";
    repeatBtn.classList.remove("active");
    repeatBtn.title = "Chế độ lặp lại (L)";
    repeatIcon.innerHTML = ICONS.repeatOff;
    showToast("Tắt chế độ lặp lại");
  }
}

function updateVisualState(isPlaying) {
  if (isPlaying) {
    vinylDisc.classList.add("playing");
    waveVisualizer.classList.add("playing");
    playIcon.innerHTML = ICONS.pause;
    playBtn.title = "Tạm dừng (Space)";
  } else {
    vinylDisc.classList.remove("playing");
    waveVisualizer.classList.remove("playing");
    playIcon.innerHTML = ICONS.play;
    playBtn.title = "Phát (Space)";
  }
  renderPlaylist();
}

// ==========================================
// Volume & Progress Handlers
// ==========================================

function updateVolumeIcon(vol) {
  if (vol === 0 || audioPlayer.muted) {
    volumeIcon.innerHTML = ICONS.volumeMute;
  } else if (vol < 0.5) {
    volumeIcon.innerHTML = ICONS.volumeLow;
  } else {
    volumeIcon.innerHTML = ICONS.volumeHigh;
  }
}

function setVolume(val) {
  const vol = Math.max(0, Math.min(1, val));
  audioPlayer.volume = vol;
  audioPlayer.muted = false;
  volumeSlider.value = vol;
  localStorage.setItem(VOLUME_KEY, String(vol));
  updateVolumeIcon(vol);
}

function toggleMute() {
  if (audioPlayer.muted || audioPlayer.volume === 0) {
    audioPlayer.muted = false;
    audioPlayer.volume = lastVolume || 0.8;
    volumeSlider.value = audioPlayer.volume;
  } else {
    lastVolume = audioPlayer.volume;
    audioPlayer.muted = true;
    volumeSlider.value = 0;
  }
  updateVolumeIcon(audioPlayer.muted ? 0 : audioPlayer.volume);
}

// Progress Seek
seekSlider.addEventListener("input", () => {
  isSeeking = true;
  const pct = seekSlider.value;
  progressFill.style.width = `${pct}%`;
  if (audioPlayer.duration) {
    currentTimeEl.textContent = formatTime((pct / 100) * audioPlayer.duration);
  }
});

seekSlider.addEventListener("change", () => {
  if (audioPlayer.duration) {
    audioPlayer.currentTime = (seekSlider.value / 100) * audioPlayer.duration;
  }
  isSeeking = false;
});

volumeSlider.addEventListener("input", (e) => {
  setVolume(parseFloat(e.target.value));
});

muteBtn.addEventListener("click", toggleMute);

speedSelect.addEventListener("change", (e) => {
  audioPlayer.playbackRate = parseFloat(e.target.value);
  showToast(`Tốc độ phát: ${e.target.value}x`);
});

// Audio Events
audioPlayer.addEventListener("timeupdate", () => {
  if (isSeeking) return;
  const current = audioPlayer.currentTime;
  const total = audioPlayer.duration || 0;
  currentTimeEl.textContent = formatTime(current);

  if (total > 0) {
    totalDurationEl.textContent = formatTime(total);
    const pct = (current / total) * 100;
    progressFill.style.width = `${pct}%`;
    seekSlider.value = String(pct);
  }
});

audioPlayer.addEventListener("loadedmetadata", () => {
  totalDurationEl.textContent = formatTime(audioPlayer.duration || 0);
});

audioPlayer.addEventListener("ended", () => {
  if (repeatMode === "one") {
    audioPlayer.currentTime = 0;
    audioPlayer.play().catch(() => {});
  } else if (repeatMode === "all" || currentIndex < tracks.length - 1 || isShuffle) {
    nextTrack();
  } else {
    updateVisualState(false);
  }
});

audioPlayer.addEventListener("play", () => updateVisualState(true));
audioPlayer.addEventListener("pause", () => updateVisualState(false));

// ==========================================
// File Upload & Drag-Drop
// ==========================================

async function uploadFile(file) {
  try {
    const response = await fetch(TRACKS_API, {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": encodeURIComponent(file.name),
      },
      body: file,
    });

    if (response.ok) {
      return {
        storage: "cloud",
        track: normalizeTrack(await response.json()),
      };
    }
  } catch (_) {}

  // Fallback to IndexedDB browser storage
  return {
    storage: "browser",
    track: await saveLocalUploadedTrack(file),
  };
}

async function handleFileUpload(files) {
  if (!files || !files.length) return;

  const validFiles = Array.from(files).filter((file) => file.type.startsWith("audio/") || isAudioFile(file.name));

  if (!validFiles.length) {
    addStatus.textContent = "Chỉ chấp nhận các file âm thanh (.mp3, .wav, .m4a, .flac, ...).";
    showToast("File không hợp lệ", "error");
    return;
  }

  addStatus.textContent = `Đang xử lý ${validFiles.length} file...`;

  let lastTrack = null;
  for (const file of validFiles) {
    try {
      const { track } = await uploadFile(file);
      if (track) {
        tracks = dedupeTracks([...tracks, track]);
        lastTrack = track;
      }
    } catch (e) {
      console.error(e);
    }
  }

  saveCachedTracks(tracks);
  updateTabCounts();
  addStatus.textContent = `Đã thêm thành công ${validFiles.length} bài hát!`;
  showToast(`Đã thêm thành công ${validFiles.length} bài hát 🎉`);

  if (lastTrack) {
    searchQuery = "";
    searchInput.value = "";
    clearSearchBtn.style.display = "none";
    const playIdx = tracks.findIndex((item) => trackStorageKey(item) === trackStorageKey(lastTrack));
    if (playIdx >= 0) playTrack(playIdx);
  }
}

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener("change", async () => {
  await handleFileUpload(fileInput.files);
  fileInput.value = "";
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
  });
});

dropZone.addEventListener("drop", async (e) => {
  await handleFileUpload(e.dataTransfer?.files);
});

// ==========================================
// Tabs & Search
// ==========================================

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentTab = btn.dataset.tab;
    renderPlaylist();
  });
});

searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value.trim();
  clearSearchBtn.style.display = searchQuery ? "grid" : "none";
  renderPlaylist();
});

clearSearchBtn.addEventListener("click", () => {
  searchInput.value = "";
  searchQuery = "";
  clearSearchBtn.style.display = "none";
  searchInput.focus();
  renderPlaylist();
});

// ==========================================
// Theme & Shortcuts
// ==========================================

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  themeIcon.innerHTML = theme === "light" ? ICONS.moon : ICONS.sun;
}

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  applyTheme(savedTheme);
}

themeToggleBtn.addEventListener("click", () => {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(newTheme);
  showToast(newTheme === "dark" ? "Đã bật giao diện Tối 🌙" : "Đã bật giao diện Sáng ☀️");
});

// Shortcuts Modal
shortcutsBtn.addEventListener("click", () => shortcutsModal.classList.add("open"));
closeModalBtn.addEventListener("click", () => shortcutsModal.classList.remove("open"));
shortcutsModal.addEventListener("click", (e) => {
  if (e.target === shortcutsModal) shortcutsModal.classList.remove("open");
});

// Keyboard Listeners
window.addEventListener("keydown", (e) => {
  // If user is typing in search input, don't trigger shortcuts
  if (document.activeElement === searchInput || document.activeElement === fileInput) {
    if (e.key === "Escape") {
      searchInput.blur();
    }
    return;
  }

  if (e.key === "Escape" && shortcutsModal.classList.contains("open")) {
    shortcutsModal.classList.remove("open");
    return;
  }

  if (e.code === "Space") {
    e.preventDefault();
    togglePlay();
  } else if (e.code === "ArrowLeft") {
    e.preventDefault();
    audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 5);
  } else if (e.code === "ArrowRight") {
    e.preventDefault();
    audioPlayer.currentTime = Math.min(audioPlayer.duration || Infinity, audioPlayer.currentTime + 5);
  } else if (e.code === "ArrowUp") {
    e.preventDefault();
    setVolume(audioPlayer.volume + 0.05);
  } else if (e.code === "ArrowDown") {
    e.preventDefault();
    setVolume(audioPlayer.volume - 0.05);
  } else if (e.key.toLowerCase() === "m") {
    e.preventDefault();
    toggleMute();
  } else if (e.key.toLowerCase() === "s") {
    e.preventDefault();
    toggleShuffle();
  } else if (e.key.toLowerCase() === "l") {
    e.preventDefault();
    toggleRepeat();
  }
});

// MediaSession Controls Handlers
if ("mediaSession" in navigator) {
  navigator.mediaSession.setActionHandler("play", () => audioPlayer.play());
  navigator.mediaSession.setActionHandler("pause", () => audioPlayer.pause());
  navigator.mediaSession.setActionHandler("previoustrack", prevTrack);
  navigator.mediaSession.setActionHandler("nexttrack", nextTrack);
  navigator.mediaSession.setActionHandler("seekto", (details) => {
    if (details.seekTime && audioPlayer.duration) {
      audioPlayer.currentTime = details.seekTime;
    }
  });
}

// ==========================================
// App Initialization
// ==========================================

playBtn.addEventListener("click", togglePlay);
prevBtn.addEventListener("click", prevTrack);
nextBtn.addEventListener("click", nextTrack);
shuffleBtn.addEventListener("click", toggleShuffle);
repeatBtn.addEventListener("click", toggleRepeat);

async function loadTracks() {
  let manifestTracks = getEmbeddedTracks();
  let apiTracks = [];
  let folderTracks = [];
  const localUploadedTracks = await loadLocalUploadedTracks();

  try {
    const manifestResponse = await fetch(TRACKS_MANIFEST, { cache: "no-store" });
    if (manifestResponse.ok) {
      manifestTracks = dedupeTracks([...manifestTracks, ...normalizeTracks(await manifestResponse.json())]);
    }
  } catch (_) {
    manifestTracks = manifestTracks.length ? manifestTracks : readCachedTracks();
  }

  try {
    const response = await fetch(TRACKS_API, { cache: "no-store" });
    if (response.ok) {
      apiTracks = normalizeTracks(await response.json());
    }
  } catch (_) {
    apiTracks = [];
  }

  try {
    const response = await fetch("songs/", { cache: "no-store" });
    if (response.ok) {
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const links = Array.from(doc.querySelectorAll("a[href]"));

      folderTracks = dedupeTracks(
        links
          .map((link) => {
            const href = link.getAttribute("href") || "";
            if (!href || href === "../" || href.startsWith("?")) return null;

            const fileUrl = new URL(href, new URL("songs/", window.location.href));
            const fileName = decodeURIComponent(fileUrl.pathname.split("/").pop() || "");
            if (!isAudioFile(fileName)) return null;

            return {
              type: "local",
              name: formatName(fileName),
              url: fileUrl.href,
            };
          })
          .filter(Boolean),
      );
    }
  } catch (_) {
    folderTracks = [];
  }

  const combinedTracks = dedupeTracks([...manifestTracks, ...folderTracks, ...apiTracks, ...localUploadedTracks]);
  tracks = combinedTracks.length ? combinedTracks : readCachedTracks();
  saveCachedTracks(tracks);

  // Restore volume
  const savedVol = localStorage.getItem(VOLUME_KEY);
  if (savedVol !== null) {
    setVolume(parseFloat(savedVol));
  } else {
    setVolume(0.8);
  }

  loadFavorites();

  currentIndex = restoreCurrentIndex(tracks);
  if (currentIndex >= 0 && tracks[currentIndex]) {
    audioPlayer.src = tracks[currentIndex].url;
  }

  updateNowPlaying();
  renderPlaylist();
}

// Initial Run
initTheme();
loadTracks().catch((err) => {
  console.error("Lỗi khởi tạo:", err);
  tracks = [];
  updateNowPlaying();
  renderPlaylist();
});