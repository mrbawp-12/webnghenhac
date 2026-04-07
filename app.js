const audioPlayer = document.getElementById("audioPlayer");
const playlistEl = document.getElementById("playlist");
const currentTitle = document.getElementById("currentTitle");
const currentMeta = document.getElementById("currentMeta");
const countText = document.getElementById("countText");
const prevBtn = document.getElementById("prevBtn");
const playBtn = document.getElementById("playBtn");
const randomBtn = document.getElementById("randomBtn");
const nextBtn = document.getElementById("nextBtn");

let tracks = [];
let currentIndex = -1;

const TRACKS_MANIFEST = "songs.json";
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".webm"];

function formatName(fileName) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
}

function isAudioFile(fileName) {
  const lower = fileName.toLowerCase();
  return AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function normalizeTracks(data) {
  if (!Array.isArray(data)) return [];

  return data
    .map((item) => {
      if (typeof item === "string") {
        return {
          name: formatName(item),
          url: new URL(`songs/${encodeURI(item)}`, window.location.href).href,
        };
      }

      if (!item || typeof item !== "object") return null;

      const fileName = typeof item.fileName === "string" ? item.fileName : "";
      const url = typeof item.url === "string" && item.url ? new URL(item.url, window.location.href).href : "";
      const name = typeof item.name === "string" && item.name ? item.name : formatName(fileName || url.split("/").pop() || "");

      if (!url) return null;
      return { name, url };
    })
    .filter((track) => track && isAudioFile(track.url.split("?")[0]));
}

async function loadTracks() {
  try {
    const manifestResponse = await fetch(TRACKS_MANIFEST, { cache: "no-store" });
    if (manifestResponse.ok) {
      tracks = normalizeTracks(await manifestResponse.json());
    }
  } catch (_) {
    tracks = [];
  }

  if (!tracks.length) {
    const response = await fetch("songs/");
    if (!response.ok) throw new Error("Không đọc được danh sách bài hát");

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const links = Array.from(doc.querySelectorAll("a[href]"));

    tracks = links
      .map((link) => {
        const href = link.getAttribute("href") || "";
        if (!href || href === "../" || href.startsWith("?")) return null;

        const fileUrl = new URL(href, new URL("songs/", window.location.href));
        const fileName = decodeURIComponent(fileUrl.pathname.split("/").pop() || "");
        if (!isAudioFile(fileName)) return null;

        return {
          name: formatName(fileName),
          url: fileUrl.href,
        };
      })
      .filter(Boolean);
  }

  currentIndex = -1;
  updateNowPlaying();
  renderPlaylist();
}

function renderPlaylist() {
  playlistEl.innerHTML = "";
  countText.textContent = `${tracks.length} bài`;

  if (!tracks.length) {
    const empty = document.createElement("li");
    empty.innerHTML = "<div><strong>Chưa có bài hát</strong><small>Thêm file nhạc vào thư mục songs/</small></div>";
    empty.style.cursor = "default";
    playlistEl.appendChild(empty);
    return;
  }

  tracks.forEach((track, index) => {
    const li = document.createElement("li");
    li.className = index === currentIndex ? "active" : "";
    li.innerHTML = `
      <div>
        <strong>${track.name}</strong>
        <small>${index === currentIndex ? "Đang phát" : "Nhấn để nghe"}</small>
      </div>
      <small>${index + 1}</small>
    `;
    li.addEventListener("click", () => playTrack(index));
    playlistEl.appendChild(li);
  });
}

function updateNowPlaying() {
  if (currentIndex < 0 || !tracks[currentIndex]) {
    currentTitle.textContent = "Chưa có bài nào";
    currentMeta.textContent = "Thêm file vào thư mục songs/ để hiện danh sách";
    return;
  }

  const track = tracks[currentIndex];
  currentTitle.textContent = track.name;
  currentMeta.textContent = `${currentIndex + 1}/${tracks.length}`;
}

function playTrack(index) {
  if (!tracks[index]) return;

  currentIndex = index;
  audioPlayer.src = tracks[index].url;
  audioPlayer.play().catch(() => {});
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