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

let tracks = [];
let currentIndex = -1;

const TRACKS_MANIFEST = "songs.json";
const TRACKS_API = "/api/tracks";
const TRACKS_CACHE_KEY = "web-nghe-nhac.tracks";
const CURRENT_TRACK_KEY = "web-nghe-nhac.currentTrackUrl";
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".webm"];

function formatName(fileName) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
}

function isAudioFile(fileName) {
  const lower = fileName.toLowerCase();
  return AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext));
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

function dedupeTracks(items) {
  const seen = new Set();
  return items.filter((track) => {
    if (!track?.url || seen.has(track.url)) return false;
    seen.add(track.url);
    return true;
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
    localStorage.setItem(TRACKS_CACHE_KEY, JSON.stringify(nextTracks));
  } catch (_) {}
}

function rememberCurrentTrackUrl(url) {
  try {
    if (url) {
      localStorage.setItem(CURRENT_TRACK_KEY, url);
    } else {
      localStorage.removeItem(CURRENT_TRACK_KEY);
    }
  } catch (_) {}
}

function restoreCurrentIndex(list) {
  try {
    const currentUrl = localStorage.getItem(CURRENT_TRACK_KEY);
    if (!currentUrl) return -1;
    return list.findIndex((track) => track.url === currentUrl);
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

function renderPlaylist() {
  playlistEl.innerHTML = "";
  countText.textContent = `${tracks.length} bài`;

  if (!tracks.length) {
    const empty = document.createElement("li");
    empty.innerHTML = "<div><strong>Chưa có bài hát</strong><small>Kéo file nhạc vào khung bên trên để thêm vào danh sách</small></div>";
    empty.style.cursor = "default";
    playlistEl.appendChild(empty);
    return;
  }

  tracks.forEach((track, index) => {
    const li = document.createElement("li");
    li.className = index === currentIndex ? "active" : "";
    const label = track.type === "upload" ? (index === currentIndex ? "Đang phát" : "Vừa thêm") : index === currentIndex ? "Đang phát" : "Nhấn để nghe";
    li.innerHTML = `
      <div>
        <strong>${track.name}</strong>
        <small>${label}</small>
      </div>
      <small>${index + 1}</small>
    `;
    li.addEventListener("click", () => playTrack(index));
    playlistEl.appendChild(li);
  });
}

async function loadTracks() {
  let manifestTracks = getEmbeddedTracks();
  let apiTracks = [];
  let folderTracks = [];

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

  const combinedTracks = dedupeTracks([...manifestTracks, ...folderTracks, ...apiTracks]);
  tracks = combinedTracks.length ? combinedTracks : readCachedTracks();
  saveCachedTracks(tracks);
  currentIndex = restoreCurrentIndex(tracks);
  updateNowPlaying();
  renderPlaylist();
}

async function uploadFile(file) {
  const response = await fetch(TRACKS_API, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-File-Name": encodeURIComponent(file.name),
    },
    body: file,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Không tải được file nhạc");
  }

  return normalizeTrack(await response.json());
}

async function playTrack(index) {
  if (!tracks[index]) return;

  currentIndex = index;
  rememberCurrentTrackUrl(tracks[index].url);
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
    const track = await uploadFile(file);
    tracks = dedupeTracks([...tracks, track]);
    saveCachedTracks(tracks);
    addStatus.textContent = "Đã lưu file vào danh sách.";
    await playTrack(tracks.findIndex((item) => item.url === track.url));
  } catch (error) {
    addStatus.textContent = error.message;
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

loadTracks().catch(() => {
  tracks = [];
  updateNowPlaying();
  renderPlaylist();
});