const { getStore } = require("@netlify/blobs");

const tracksStore = getStore("tracks", { consistency: "strong" });
const uploadsStore = getStore("uploads", { consistency: "strong" });
const TRACKS_KEY = "tracks";
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".webm"];

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}

function formatName(fileName) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
}

function isSoundCloudUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith("soundcloud.com") || host === "snd.sc" || host === "on.soundcloud.com";
  } catch (_) {
    return false;
  }
}

function isAudioUrl(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return AUDIO_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  } catch (_) {
    return false;
  }
}

function guessNameFromUrl(url) {
  try {
    const parsed = new URL(url);
    const fileName = decodeURIComponent(parsed.pathname.split("/").pop() || "");
    if (fileName) return formatName(fileName);
    return formatName(parsed.hostname.replace(/^www\./, ""));
  } catch (_) {
    return formatName(url);
  }
}

async function readTracks() {
  const data = await tracksStore.get(TRACKS_KEY, { type: "json" });
  return Array.isArray(data) ? data : [];
}

async function writeTracks(tracks) {
  await tracksStore.setJSON(TRACKS_KEY, tracks);
}

function normalizeTrack(track) {
  if (!track || typeof track !== "object") return null;

  const url = typeof track.url === "string" ? track.url.trim() : "";
  if (!url) return null;

  const type = track.type || (isSoundCloudUrl(url) ? "soundcloud" : url.includes("/api/media") ? "upload" : "local");
  const name = typeof track.name === "string" && track.name ? track.name : guessNameFromUrl(url);

  return {
    type,
    name,
    url,
    mediaKey: typeof track.mediaKey === "string" ? track.mediaKey : undefined,
    mimeType: typeof track.mimeType === "string" ? track.mimeType : undefined,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "GET") {
    return json(200, await readTracks());
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (_) {
    return json(400, { error: "Body không hợp lệ" });
  }

  const tracks = await readTracks();

  if (payload.type === "upload") {
    const data = typeof payload.data === "string" ? payload.data.trim() : "";
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    const mimeType = typeof payload.mimeType === "string" && payload.mimeType ? payload.mimeType : "audio/mpeg";

    if (!data) {
      return json(400, { error: "Thiếu dữ liệu file" });
    }

    const mediaKey = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const buffer = Buffer.from(data, "base64");

    await uploadsStore.set(mediaKey, buffer, {
      metadata: { name: name || guessNameFromUrl(name || mediaKey), mimeType },
    });

    const track = normalizeTrack({
      type: "upload",
      name: name || guessNameFromUrl(mediaKey),
      mediaKey,
      mimeType,
      url: `/api/media?key=${encodeURIComponent(mediaKey)}`,
    });

    tracks.push(track);
    await writeTracks(tracks);
    return json(201, track);
  }

  const url = typeof payload.url === "string" ? payload.url.trim() : "";
  const name = typeof payload.name === "string" ? payload.name.trim() : "";

  if (!url) {
    return json(400, { error: "Thiếu URL" });
  }

  const normalizedUrl = new URL(url, "https://example.com").href;
  const isSoundCloud = isSoundCloudUrl(normalizedUrl);

  if (!isSoundCloud && !isAudioUrl(normalizedUrl)) {
    return json(400, { error: "URL phải là link SoundCloud hoặc file nhạc trực tiếp" });
  }

  if (tracks.some((track) => track.url === normalizedUrl)) {
    return json(200, tracks.find((track) => track.url === normalizedUrl));
  }

  const track = normalizeTrack({
    type: isSoundCloud ? "soundcloud" : "local",
    name: name || guessNameFromUrl(normalizedUrl),
    url: normalizedUrl,
  });

  tracks.push(track);
  await writeTracks(tracks);

  return json(201, track);
};
