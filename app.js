const audioPlayer = document.getElementById("audioPlayer");
const playlistEl = document.getElementById("playlist");
const currentTitle = document.getElementById("currentTitle");
const currentMeta = document.getElementById("currentMeta");
const countText = document.getElementById("countText");
const prevBtn = document.getElementById("prevBtn");
const playBtn = document.getElementById("playBtn");
const randomBtn = document.getElementById("randomBtn");
const nextBtn = document.getElementById("nextBtn");
const addStatus = document.getElementById("addStatus");
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const searchInput = document.getElementById("searchInput");

let tracks = [];
let currentIndex = -1;
let searchQuery = "";

const TRACKS_MANIFEST = "songs.json";
const TRACKS_API = "/api/tracks";
const TRACKS_CACHE_KEY = "web-nghe-nhac.tracks";
const CURRENT_TRACK_KEY = "web-nghe-nhac.currentTrackUrl";
const LOCAL_DB_NAME = "web-nghe-nhac";
const LOCAL_DB_VERSION = 1;
const LOCAL_TRACKS_STORE = "localTracks";
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".webm"];

function formatName(fileName) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
}

function isAudioFile(fileName) {
  const lower = fileName.toLowerCase();
  return AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function openLocalTracksDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("Trình duyệt không hỗ trợ lưu file nhạc."));
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
    request.onerror = () => reject(request.error || new Error("Không mở được bộ nhớ nhạc."));
  });
}

function localTrackRecordToTrack(record) {
  const file = record.file;
  if (!file) return null;
  return {
    type: "upload",
    source: "indexeddb",
    localId: record.id,
    name: record.name || formatName(record.fileName || "Bài hát đã thêm"),
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
      request.onerror = () => reject(request.error || new Error("Không đọc được nhạc đã lưu."));
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

    const short = parsed.hostname.replace(/^www\./, "");
    return formatName(short);
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

function getFilteredTrackEntries() {
  const terms = normalizeSearchText(searchQuery).split(/\s+/).filter(Boolean);
  return tracks
    .map((track, index) => ({ track, index }))
    .filter(({ track }) => {
      if (!terms.length) return true;
      const name = normalizeSearchText(track.name);
      return terms.every((term) => name.includes(term));
    });
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

function currentTrack() {
  return currentIndex >= 0 ? tracks[currentIndex] : null;
}

function updateNowPlaying() {
  const track = currentTrack();

  if (!track) {
    currentTitle.textContent = "Chưa có bài nào";
    currentMeta.textContent = "Hãy kéo một file nhạc vào khung bên trên để bắt đầu.";
    return;
  }

  currentTitle.textContent = track.name;
  currentMeta.textContent = `${currentIndex + 1}/${tracks.length}`;
}

function appendPlaylistText(parent, titleText, subtitleText) {
  const wrapper = document.createElement("div");
  const title = document.createElement("strong");
  const subtitle = document.createElement("small");

  title.textContent = titleText;
  subtitle.textContent = subtitleText;
  wrapper.append(title, subtitle);
  parent.appendChild(wrapper);
}

function renderPlaylist() {
  playlistEl.replaceChildren();
  const visibleEntries = getFilteredTrackEntries();
  countText.textContent = searchQuery ? `${visibleEntries.length}/${tracks.length} bài` : `${tracks.length} bài`;

  if (!tracks.length) {
    const empty = document.createElement("li");
    appendPlaylistText(empty, "Chưa có bài hát", "Kéo file nhạc vào khung bên trên để thêm vào danh sách");
    empty.style.cursor = "default";
    playlistEl.appendChild(empty);
    return;
  }

  if (!visibleEntries.length) {
    const empty = document.createElement("li");
    appendPlaylistText(empty, "Không tìm thấy bài hát", "Thử nhập tên hoặc vài từ khác trong tên bài hát");
    empty.style.cursor = "default";
    playlistEl.appendChild(empty);
    return;
  }

  visibleEntries.forEach(({ track, index }) => {
    const li = document.createElement("li");
    const order = document.createElement("small");
    const label = track.type === "upload" ? (index === currentIndex ? "Đang phát" : "Đã thêm") : index === currentIndex ? "Đang phát" : "Nhấn để nghe";

    li.className = index === currentIndex ? "active" : "";
    appendPlaylistText(li, track.name, label);
    order.textContent = String(index + 1);
    li.appendChild(order);
    li.addEventListener("click", () => playTrack(index));
    playlistEl.appendChild(li);
  });
}

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
  currentIndex = restoreCurrentIndex(tracks);
  if (currentIndex >= 0) {
    audioPlayer.src = tracks[currentIndex].url;
  }
  updateNowPlaying();
  renderPlaylist();
}

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
  } catch (_) {
    // Static hosting such as GitHub Pages does not have /api/tracks.
  }

  return {
    storage: "browser",
    track: await saveLocalUploadedTrack(file),
  };
}

async function playTrack(index) {
  if (!tracks[index]) return;

  currentIndex = index;
  rememberCurrentTrack(tracks[index]);
  audioPlayer.src = tracks[index].url;
  await audioPlayer.play().catch(() => {});
  updateNowPlaying();
  renderPlaylist();
}

function nextTrack() {
  if (!tracks.length) return;
  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % tracks.length;
  playTrack(nextIndex);
}

function randomTrack() {
  if (!tracks.length) return;
  if (tracks.length === 1) {
    playTrack(0);
    return;
  }

  let randomIndex = currentIndex;
  while (randomIndex === currentIndex) {
    randomIndex = Math.floor(Math.random() * tracks.length);
  }

  playTrack(randomIndex);
}

function prevTrack() {
  if (!tracks.length) return;
  const prevIndex = currentIndex <= 0 ? tracks.length - 1 : currentIndex - 1;
  playTrack(prevIndex);
}

function togglePlay() {
  if (!tracks.length) return;

  if (currentIndex < 0) {
    playTrack(0);
    return;
  }

  if (!audioPlayer.src) {
    audioPlayer.src = tracks[currentIndex].url;
  }

  if (audioPlayer.paused) {
    audioPlayer.play().catch(() => {});
  } else {
    audioPlayer.pause();
  }
}

async function handleFileUpload(file) {
  if (!file) return;

  if (!file.type.startsWith("audio/") && !isAudioFile(file.name)) {
    addStatus.textContent = "Chỉ nhận file âm thanh.";
    return;
  }

  addStatus.textContent = "Đang lưu file...";

  try {
    const { track, storage } = await uploadFile(file);
    if (!track) throw new Error("Không tạo được bài hát từ file đã chọn.");

    searchQuery = "";
    searchInput.value = "";
    tracks = dedupeTracks([...tracks, track]);
    saveCachedTracks(tracks);
    addStatus.textContent = storage === "cloud" ? "Thêm thành công. File đã được lưu online." : "Thêm thành công. File đã được lưu trong trình duyệt này.";
    await playTrack(tracks.findIndex((item) => trackStorageKey(item) === trackStorageKey(track)));
  } catch (error) {
    addStatus.textContent = error.message || "Không lưu được file nhạc.";
  }
}

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener("change", async () => {
  const [file] = fileInput.files || [];
  await handleFileUpload(file);
  fileInput.value = "";
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
  });
});

dropZone.addEventListener("drop", async (event) => {
  const [file] = event.dataTransfer?.files || [];
  await handleFileUpload(file);
});

audioPlayer.addEventListener("ended", nextTrack);
audioPlayer.addEventListener("play", renderPlaylist);
audioPlayer.addEventListener("pause", renderPlaylist);

prevBtn.addEventListener("click", prevTrack);
nextBtn.addEventListener("click", nextTrack);
playBtn.addEventListener("click", togglePlay);
randomBtn.addEventListener("click", randomTrack);
searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value;
  renderPlaylist();
});

loadTracks().catch(() => {
  tracks = [];
  updateNowPlaying();
  renderPlaylist();
});