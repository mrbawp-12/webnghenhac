const fs = require("fs");
const path = require("path");

const rootDir = __dirname;
const songsDir = path.join(rootDir, "songs");
const manifestPath = path.join(rootDir, "songs.json");
const audioExtensions = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".webm"];

function isAudioFile(fileName) {
  const lower = fileName.toLowerCase();
  return audioExtensions.some((ext) => lower.endsWith(ext));
}

function formatName(fileName) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
}

const tracks = fs
  .readdirSync(songsDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && isAudioFile(entry.name))
  .map((entry) => ({
    name: formatName(entry.name),
    fileName: entry.name,
    url: `songs/${encodeURI(entry.name)}`,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, "vi"));

fs.writeFileSync(manifestPath, `${JSON.stringify(tracks, null, 2)}\n`, "utf8");