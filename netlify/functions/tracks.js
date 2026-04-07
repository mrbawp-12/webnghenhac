const { getStore } = require("@netlify/blobs");

const store = getStore("tracks");
const STORE_KEY = "tracks";
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".webm"];

function formatName(fileName) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
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
    const fileName = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
    return formatName(fileName || url);
  } catch (_) {
    return formatName(url);
  }
}

async function readTracks() {
  const data = await store.get(STORE_KEY, { type: "json" });
  return Array.isArray(data) ? data : [];
}

async function writeTracks(tracks) {
  await store.set(STORE_KEY, tracks);
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
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

  const url = typeof payload.url === "string" ? payload.url.trim() : "";
  const name = typeof payload.name === "string" ? payload.name.trim() : "";

  if (!url) {
    return json(400, { error: "Thiếu URL" });
  }

  if (!/^https?:\/\//i.test(url) || !isAudioUrl(url)) {
    return json(400, { error: "URL phải là link file nhạc trực tiếp" });
  }

  const tracks = await readTracks();
  const normalizedUrl = new URL(url).href;

  if (tracks.some((track) => track.url === normalizedUrl)) {
    return json(200, tracks.find((track) => track.url === normalizedUrl));
  }

  const track = {
    name: name || guessNameFromUrl(normalizedUrl),
    url: normalizedUrl,
  };

  tracks.push(track);
  await writeTracks(tracks);

  return json(201, track);
};
