const audioPlayer = document.getElementById("audioPlayer");
const soundcloudShell = document.getElementById("soundcloudShell");
const soundcloudPlayer = document.getElementById("soundcloudPlayer");
const playlistEl = document.getElementById("playlist");
const currentTitle = document.getElementById("currentTitle");
const currentMeta = document.getElementById("currentMeta");
const countText = document.getElementById("countText");
const prevBtn = document.getElementById("prevBtn");
const playBtn = document.getElementById("playBtn");
const randomBtn = document.getElementById("randomBtn");
const nextBtn = document.getElementById("nextBtn");
const addForm = document.getElementById("addForm");
const songUrlInput = document.getElementById("songUrlInput");
const addStatus = document.getElementById("addStatus");
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");

let tracks = [];
let currentIndex = -1;
let soundcloudWidget = null;
let soundcloudScriptPromise = null;
let activeSoundcloudUrl = "";

const TRACKS_MANIFEST = "songs.json";
const TRACKS_API = "/api/tracks";
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".webm"];

function formatName(fileName) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
}

function isAudioFile(fileName) {
  const lower = fileName.toLowerCase();
  return AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function isSoundCloudUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith("soundcloud.com") || host === "snd.sc" || host === "on.soundcloud.com";
  } catch (_) {
    return false;
  }
}

function isPlayableTrack(track) {
  if (!track || typeof track !== "object") return false;
  if (track.type === "soundcloud") return true;

  const url = typeof track.url === "string" ? track.url.split("?")[0] : "";
  return isAudioFile(url) || url.includes("/api/media");
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

  const type = item.type || (isSoundCloudUrl(url) ? "soundcloud" : url.includes("/api/media") ? "upload" : "local");
  const fileName = typeof item.fileName === "string" ? item.fileName : "";
  const name = typeof item.name === "string" && item.name ? item.name : formatName(fileName || guessNameFromUrl(url));

  return {
    ...item,
    type,
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

function setPlayerMode(mode) {
  const isSoundCloud = mode === "soundcloud";
  audioPlayer.hidden = isSoundCloud;
  soundcloudShell.hidden = !isSoundCloud;
}

function soundcloudEmbedUrl(trackUrl) {
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(trackUrl)}&color=%237c3aed&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&visual=true`;
}

function loadSoundCloudScript() {
  if (window.SC?.Widget) return Promise.resolve();
  if (soundcloudScriptPromise) return soundcloudScriptPromise;

  soundcloudScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://w.soundcloud.com/player/api.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Không tải được SoundCloud player"));
    document.head.appendChild(script);
  });

  return soundcloudScriptPromise;
}

function bindSoundCloudEvents(widget) {
  const events = window.SC?.Widget?.Events;
  if (!widget || !events) return;

  widget.bind(events.PLAY, () => renderPlaylist());
  widget.bind(events.PAUSE, () => renderPlaylist());
  widget.bind(events.FINISH, () => nextTrack());
}

async function createSoundCloudWidget(track) {
  await loadSoundCloudScript();

  return new Promise((resolve) => {
    const embedUrl = soundcloudEmbedUrl(track.url);
    activeSoundcloudUrl = track.url;
    soundcloudPlayer.onload = () => {
      soundcloudWidget = window.SC.Widget(soundcloudPlayer);
      bindSoundCloudEvents(soundcloudWidget);
      resolve(soundcloudWidget);
    };
    soundcloudPlayer.src = embedUrl;
  });
}

function pauseActivePlayback() {
  if (soundcloudWidget && currentTrack()?.type === "soundcloud") {
    soundcloudWidget.pause();
    return;
  }

  audioPlayer.pause();
}

function currentTrack() {
  return currentIndex >= 0 ? tracks[currentIndex] : null;
}

async function loadTracks() {
  let manifestTracks = [];
  let apiTracks = [];

  try {
    const manifestResponse = await fetch(TRACKS_MANIFEST, { cache: "no-store" });
    if (manifestResponse.ok) {
      manifestTracks = normalizeTracks(await manifestResponse.json());
    }
  } catch (_) {
    manifestTracks = [];
  }

  try {
    const response = await fetch(TRACKS_API, { cache: "no-store" });
    if (response.ok) {
      apiTracks = normalizeTracks(await response.json());
    }
  } catch (_) {
    apiTracks = [];
  }

  tracks = dedupeTracks([...manifestTracks, ...apiTracks]);

  if (!tracks.length) {
    const response = await fetch("songs/");
    if (!response.ok) throw new Error("Không đọc được danh sách bài hát");

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const links = Array.from(doc.querySelectorAll("a[href]"));

    tracks = dedupeTracks(
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

  currentIndex = -1;
  updateNowPlaying();
  renderPlaylist();
}

async function addTrack(url) {
  const response = await fetch(TRACKS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Không lưu được link nhạc");
  }

  return normalizeTrack(await response.json());
}

async function uploadFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  const response = await fetch(TRACKS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "upload",
      name: file.name,
      mimeType: file.type || "audio/mpeg",
      data: btoa(binary),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Không tải được file nhạc");
  }

  return normalizeTrack(await response.json());
}

function renderPlaylist() {
  playlistEl.innerHTML = "";
  countText.textContent = `${tracks.length} bài`;

  if (!tracks.length) {
    const empty = document.createElement("li");
    empty.innerHTML = "<div><strong>Chưa có bài hát</strong><small>Dán link SoundCloud hoặc kéo file vào khung thêm bài hát</small></div>";
    empty.style.cursor = "default";
    playlistEl.appendChild(empty);
    return;
  }

  tracks.forEach((track, index) => {
    const li = document.createElement("li");
    li.className = index === currentIndex ? "active" : "";
    const label =
      track.type === "soundcloud"
        ? index === currentIndex
          ? "Đang phát"
          : "SoundCloud"
        : track.type === "upload"
          ? index === currentIndex
            ? "Đang phát"
            : "Đã tải lên"
          : index === currentIndex
            ? "Đang phát"
            : "Nhấn để nghe";
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

function updateNowPlaying() {
  const track = currentTrack();

  if (!track) {
    currentTitle.textContent = "Chưa có bài nào";
    currentMeta.textContent = "Thêm link SoundCloud hoặc kéo file nhạc vào khung bên trên";
    return;
  }

  currentTitle.textContent = track.name;
  currentMeta.textContent = `${currentIndex + 1}/${tracks.length}`;
}

async function playTrack(index) {
  if (!tracks[index]) return;

  currentIndex = index;
  const track = tracks[index];

  if (track.type === "soundcloud") {
    audioPlayer.pause();
    setPlayerMode("soundcloud");
    if (soundcloudWidget) {
      soundcloudWidget.pause();
    }
    if (activeSoundcloudUrl !== track.url) {
      await createSoundCloudWidget(track);
    } else if (soundcloudWidget) {
      soundcloudWidget.play();
    }
  } else {
    if (soundcloudWidget) {
      soundcloudWidget.pause();
    }
    setPlayerMode("audio");
    soundcloudWidget = null;
    activeSoundcloudUrl = "";
    soundcloudPlayer.removeAttribute("src");
    audioPlayer.src = track.url;
    audioPlayer.play().catch(() => {});
  }

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

  const track = currentTrack();
  if (!track) return;

  if (track.type === "soundcloud") {
    if (soundcloudWidget) {
      soundcloudWidget.isPaused((paused) => {
        if (paused) {
          soundcloudWidget.play();
        } else {
          soundcloudWidget.pause();
        }
      });
    }
    return;
  }

  if (audioPlayer.paused) {
    audioPlayer.play().catch(() => {});
  } else {
    audioPlayer.pause();
  }
}

audioPlayer.addEventListener("ended", nextTrack);
audioPlayer.addEventListener("play", renderPlaylist);
audioPlayer.addEventListener("pause", renderPlaylist);

prevBtn.addEventListener("click", prevTrack);
nextBtn.addEventListener("click", nextTrack);
playBtn.addEventListener("click", togglePlay);
randomBtn.addEventListener("click", randomTrack);

addForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = songUrlInput.value.trim();

  if (!url) return;

  addStatus.textContent = "Đang lưu link...";
  addForm.querySelector("button").disabled = true;

  try {
    const track = await addTrack(url);
    tracks = dedupeTracks([...tracks, track]);
    renderPlaylist();
    addForm.reset();
    addStatus.textContent = "Đã thêm link vào danh sách.";
  } catch (error) {
    addStatus.textContent = error.message;
  } finally {
    addForm.querySelector("button").disabled = false;
  }
});

async function handleFileUpload(file) {
  if (!file) return;

  if (!file.type.startsWith("audio/") && !isAudioFile(file.name)) {
    addStatus.textContent = "Chỉ nhận file âm thanh.";
    return;
  }

  addStatus.textContent = "Đang tải file lên Netlify...";
  try {
    const track = await uploadFile(file);
    tracks = dedupeTracks([...tracks, track]);
    renderPlaylist();
    addStatus.textContent = "Đã tải file lên và thêm vào danh sách.";
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

loadTracks().catch(() => {
  tracks = [];
  updateNowPlaying();
  renderPlaylist();
});
