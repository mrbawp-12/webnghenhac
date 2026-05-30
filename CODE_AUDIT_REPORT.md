# Báo cáo audit source code - Web Nghe Nhạc

Ngày audit: 2026-05-30

## 1. Phạm vi đã kiểm tra

Đã duyệt toàn bộ source code và cấu hình trong `D:\webnghenhac`:

- `index.html`
- `styles.css`
- `app.js`
- `build.js`
- `package.json`
- `README.md`
- `netlify.toml`
- `songs.json`
- `songs-data.js`
- `netlify/functions/tracks.js`
- `netlify/functions/media.js`
- `songs/`: 48 file `.mp3`

Ghi chú: các file `.mp3` là binary media nên chỉ kiểm tra ở mức tồn tại, tên file, mapping với manifest và URL encode. Không phân tích nội dung âm thanh.

## 2. Tổng quan dự án

Đây là một web nghe nhạc đơn giản chạy bằng HTML/CSS/JavaScript thuần. Ứng dụng hiển thị danh sách bài hát từ thư mục `songs/`, phát nhạc bằng thẻ `<audio>`, hỗ trợ chuyển bài, bài trước, phát ngẫu nhiên và tự động phát bài kế tiếp. Dự án có thêm Netlify Functions để lưu bài upload vào Netlify Blobs và trả media qua `/api/media`.

Không có framework backend kiểu Spring/Nest/Express, nên dự án không có `class`, `interface`, `controller`, `service`, `repository`, `entity` theo nghĩa truyền thống. Vai trò tương đương:

- Controller/API handler: `netlify/functions/tracks.js`, `netlify/functions/media.js`
- Service nhẹ: các hàm xử lý track trong `app.js` và `tracks.js`
- Repository/storage: Netlify Blobs thông qua `tracksStore`, `uploadsStore`
- Entity/data model: object `track` gồm `type`, `name`, `url`, `fileName`, `mediaKey`, `mimeType`

## 3. Cấu trúc thư mục

```text
D:\webnghenhac
|-- index.html                  # Khung HTML chính
|-- styles.css                  # Giao diện player/playlist/drop zone
|-- app.js                      # Toàn bộ logic phía browser
|-- build.js                    # Sinh songs.json và songs-data.js từ thư mục songs/
|-- package.json                # Script build và dependency @netlify/blobs
|-- README.md                   # Hướng dẫn dùng
|-- netlify.toml                # Build config và redirect API
|-- songs.json                  # Manifest JSON 48 bài hát
|-- songs-data.js               # Manifest nhúng vào window.__SONGS_MANIFEST__
|-- songs/
|   |-- 48 file mp3             # Media tĩnh
|-- netlify/
|   |-- functions/
|       |-- tracks.js           # GET/POST danh sách track, upload blob
|       |-- media.js            # Stream blob upload ra browser
```

## 4. Chức năng từng file và hàm chính

### `index.html`

- Dòng 1-8: khai báo HTML, UTF-8, viewport, title, CSS.
- Dòng 10-17: hero giới thiệu.
- Dòng 19-31: khối kéo thả/chọn file upload.
- Dòng 33-48: player chính với `<audio>` và nút điều khiển.
- Dòng 50-56: playlist.
- Dòng 59-60: nạp `songs-data.js` trước rồi `app.js`.

### `styles.css`

- Dòng 1-10: biến màu.
- Dòng 16-32: layout body/app.
- Dòng 34-50: style card/hero.
- Dòng 92-118: drop zone.
- Dòng 126-145: audio và button.
- Dòng 151-190: playlist.
- Dòng 192-206: responsive mobile.

### `build.js`

- `isAudioFile(fileName)` dòng 10-13: lọc extension âm thanh.
- `formatName(fileName)` dòng 15-17: bỏ đuôi file và thay `-`, `_` bằng khoảng trắng.
- Dòng 19-27: đọc `songs/`, tạo mảng track, sort theo tiếng Việt.
- Dòng 29-30: ghi `songs.json` và `songs-data.js`.

### `app.js`

- Dòng 1-12: lấy DOM element.
- Dòng 14-21: state và constant.
- `formatName` dòng 23-25: format tên bài.
- `isAudioFile` dòng 27-30: kiểm tra extension.
- `isPlayableTrack` dòng 32-38: lọc track có thể phát.
- `guessNameFromUrl` dòng 40-51: đoán tên từ URL.
- `normalizeTrack` dòng 53-76: chuẩn hóa string/object thành track.
- `normalizeTracks` dòng 78-81: chuẩn hóa danh sách.
- `dedupeTracks` dòng 83-90: loại trùng URL.
- `getEmbeddedTracks` dòng 92-94: đọc manifest nhúng.
- `readCachedTracks` dòng 96-103: đọc cache localStorage.
- `saveCachedTracks` dòng 105-109: lưu cache localStorage.
- `rememberCurrentTrackUrl` dòng 111-119: nhớ bài đang phát.
- `restoreCurrentIndex` dòng 121-129: khôi phục index.
- `currentTrack` dòng 131-133: lấy track hiện tại.
- `updateNowPlaying` dòng 135-146: cập nhật tiêu đề/meta.
- `renderPlaylist` dòng 148-174: render danh sách.
- `loadTracks` dòng 176-235: tải manifest, API, thử parse directory listing, merge/dedupe.
- `uploadFile` dòng 237-253: POST file lên `/api/tracks`.
- `playTrack` dòng 255-264: set src và phát.
- `nextTrack`, `randomTrack`, `prevTrack` dòng 266-291: điều hướng.
- `togglePlay` dòng 293-301: play/pause.
- `handleFileUpload` dòng 303-322: validate file rồi upload.
- Dòng 324-370: event listener và khởi động.

### `netlify/functions/tracks.js`

- `json` dòng 8-14: tạo response JSON.
- `getHeader` dòng 16-20: đọc header case-insensitive.
- `safeDecode` dòng 22-28: decode header an toàn.
- `formatName` dòng 30-32: format tên.
- `isSoundCloudUrl` dòng 34-41: nhận diện SoundCloud.
- `isAudioUrl` dòng 43-50: nhận diện URL file audio.
- `guessNameFromUrl` dòng 52-61: đoán tên từ URL.
- `readTracks` dòng 63-66: đọc danh sách từ Netlify Blobs.
- `writeTracks` dòng 68-70: ghi danh sách.
- `normalizeTrack` dòng 72-88: chuẩn hóa track API.
- `exports.handler` dòng 90-196:
  - GET: trả danh sách track.
  - POST non-JSON: nhận raw file, lưu blob, append track.
  - POST JSON `type=upload`: nhận base64, lưu blob.
  - POST JSON `url`: nhận URL audio hoặc SoundCloud.

### `netlify/functions/media.js`

- `response` dòng 5-12: tạo binary response base64.
- `exports.handler` dòng 14-33: nhận `key`, đọc blob upload, trả dữ liệu media.

### `songs.json` và `songs-data.js`

- Cùng chứa 48 track, khớp 48 file trong `songs/`.
- Kiểm tra tự động: `missing=0`, `extra=0`, `badUrls=0`.

## 5. Luồng hoạt động end-to-end

```text
Build/deploy
---------
songs/*.mp3
    |
    v
node build.js
    |
    +--> songs.json
    +--> songs-data.js
    |
    v
Netlify/GitHub Pages publish static files

Load app
--------
Browser -> index.html
        -> styles.css
        -> songs-data.js
        -> app.js
             |
             v
          loadTracks()
             |
             +--> read window.__SONGS_MANIFEST__
             +--> fetch songs.json
             +--> fetch /api/tracks
             +--> try fetch songs/ directory listing
             |
             v
          merge + dedupe + renderPlaylist()

Play
----
User click playlist item
    |
    v
playTrack(index)
    |
    +--> currentIndex = index
    +--> localStorage currentTrackUrl
    +--> audioPlayer.src = track.url
    +--> audioPlayer.play()

Upload on Netlify
-----------------
User drop file
    |
    v
handleFileUpload()
    |
    v
POST /api/tracks
    |
    v
tracks.js stores binary in uploadsStore
    |
    v
tracks.js appends track into tracksStore
    |
    v
Browser plays /api/media?key=...
    |
    v
media.js reads uploadsStore and returns base64 audio response
```

## 6. Kết quả kiểm tra build/compile

Đã chạy:

```text
node --check app.js                         OK
node --check build.js                       OK
node --check netlify/functions/tracks.js    OK
node --check netlify/functions/media.js     OK
JSON.parse(songs.json)                      OK
node build.js                               OK khi chạy ngoài sandbox
```

Lưu ý môi trường local hiện chưa có `node_modules`, nên `require("@netlify/blobs")` fail nếu chạy function trực tiếp trước `npm install`. Đây là vấn đề setup local, không phải syntax error.

## 7. Danh sách lỗi và cách sửa

### E01 - API upload public, không auth, ai cũng có thể ghi dữ liệu

- File: `netlify/functions/tracks.js`
- Dòng: 90-196
- Mức độ: High
- Nguyên nhân: mọi request POST đều có thể thêm track hoặc upload blob. Dễ bị spam, tốn dung lượng/cost, phá playlist chung.
- Cách sửa: yêu cầu token admin cho mọi POST.

```js
function unauthorized() {
  return json(401, { error: "Unauthorized" });
}

function assertAdmin(event) {
  const expected = process.env.TRACKS_ADMIN_TOKEN;
  if (!expected) return false;
  const auth = getHeader(event.headers, "authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token && token === expected;
}

exports.handler = async (event) => {
  if (event.httpMethod === "GET") {
    return json(200, await readTracks());
  }
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }
  if (!assertAdmin(event)) return unauthorized();

  // giữ nguyên phần xử lý POST hiện tại sau dòng này
};
```

### E02 - Không giới hạn kích thước upload, dễ DoS bộ nhớ/storage

- File: `netlify/functions/tracks.js`
- Dòng: 106-107, 149
- Mức độ: High
- Nguyên nhân: đọc toàn bộ body vào `Buffer` mà không kiểm tra size.
- Cách sửa: chặn trước theo `content-length`, chặn sau khi tạo buffer.

```js
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function rejectLargeBody(event) {
  const raw = getHeader(event.headers, "content-length");
  const size = Number(raw || 0);
  return Number.isFinite(size) && size > MAX_UPLOAD_BYTES;
}

function assertUploadSize(buffer) {
  return buffer.length > 0 && buffer.length <= MAX_UPLOAD_BYTES;
}

// Trong handler POST, trước khi đọc body:
if (rejectLargeBody(event)) {
  return json(413, { error: "File vượt quá 25MB" });
}

// Sau Buffer.from(...):
if (!assertUploadSize(buffer)) {
  return json(400, { error: "File rỗng hoặc vượt quá 25MB" });
}
```

### E03 - Không validate MIME/extension ở server, có thể lưu và trả nội dung không phải audio

- File: `netlify/functions/tracks.js`, `netlify/functions/media.js`
- Dòng: `tracks.js` 100-117, 139-165; `media.js` 26-31
- Mức độ: High
- Nguyên nhân: client có validate, nhưng server tin header/payload. Attacker có thể upload HTML/JS với MIME độc hại; `media.js` trả lại đúng `content-type`.
- Cách sửa: server chỉ nhận audio MIME hoặc extension hợp lệ, khi trả media thêm `nosniff`.

```js
function isAudioMime(mimeType) {
  return /^audio\/[a-z0-9.+-]+$/i.test(mimeType);
}

function assertAudioUpload(fileName, mimeType) {
  return isAudioMime(mimeType) || isAudioFile(fileName);
}

// Trong tracks.js trước uploadsStore.set(...)
if (!assertAudioUpload(fileName, mimeType)) {
  return json(415, { error: "Chỉ nhận file âm thanh" });
}

// Trong media.js response headers:
return response(200, base64, {
  "content-type": isAudioMime(mimeType) ? mimeType : "audio/mpeg",
  "x-content-type-options": "nosniff",
  "cache-control": "public, max-age=31536000, immutable",
});
```

### E04 - XSS khi render playlist bằng `innerHTML` với dữ liệu không tin cậy

- File: `app.js`
- Dòng: 149, 154, 164-170
- Mức độ: High
- Nguyên nhân: `track.name` có thể đến từ API/localStorage. Render bằng template `innerHTML` cho phép chèn HTML/script event handler.
- Cách sửa: tạo DOM node và dùng `textContent`.

```js
function renderPlaylistItem(track, index, label) {
  const li = document.createElement("li");
  li.className = index === currentIndex ? "active" : "";

  const wrapper = document.createElement("div");
  const title = document.createElement("strong");
  const subtitle = document.createElement("small");
  const order = document.createElement("small");

  title.textContent = track.name;
  subtitle.textContent = label;
  order.textContent = String(index + 1);

  wrapper.append(title, subtitle);
  li.append(wrapper, order);
  li.addEventListener("click", () => playTrack(index));
  return li;
}

function renderPlaylist() {
  playlistEl.replaceChildren();
  countText.textContent = `${tracks.length} bài`;

  if (!tracks.length) {
    const empty = document.createElement("li");
    const wrapper = document.createElement("div");
    const title = document.createElement("strong");
    const subtitle = document.createElement("small");
    title.textContent = "Chưa có bài hát";
    subtitle.textContent = "Kéo file nhạc vào khung bên trên để thêm vào danh sách";
    wrapper.append(title, subtitle);
    empty.appendChild(wrapper);
    empty.style.cursor = "default";
    playlistEl.appendChild(empty);
    return;
  }

  tracks.forEach((track, index) => {
    const label = track.type === "upload"
      ? (index === currentIndex ? "Đang phát" : "Vừa thêm")
      : (index === currentIndex ? "Đang phát" : "Nhấn để nghe");
    playlistEl.appendChild(renderPlaylistItem(track, index, label));
  });
}
```

### E05 - Server nhận SoundCloud URL nhưng client lại lọc bỏ, tính năng không hoạt động

- File: `netlify/functions/tracks.js`, `app.js`
- Dòng: `tracks.js` 34-41, 175-180; `app.js` 32-38
- Mức độ: Medium
- Nguyên nhân: API cho phép SoundCloud, nhưng `<audio>` không phát trang SoundCloud và `isPlayableTrack` không chấp nhận URL SoundCloud.
- Cách sửa đơn giản: bỏ hỗ trợ SoundCloud ở API cho đến khi có embed player riêng.

```js
const url = typeof payload.url === "string" ? payload.url.trim() : "";
const name = typeof payload.name === "string" ? payload.name.trim() : "";

if (!url) {
  return json(400, { error: "Thiếu URL" });
}

const normalizedUrl = new URL(url).href;

if (!isAudioUrl(normalizedUrl)) {
  return json(400, { error: "URL phải là link file nhạc trực tiếp" });
}

const track = normalizeTrack({
  type: "local",
  name: name || guessNameFromUrl(normalizedUrl),
  url: normalizedUrl,
});
```

### E06 - Drag/drop upload không hoạt động trên GitHub Pages

- File: `app.js`, `README.md`
- Dòng: `app.js` 18, 237-253, 303-321; `README.md` phần link GitHub Pages
- Mức độ: Medium
- Nguyên nhân: `TRACKS_API = "/api/tracks"` chỉ tồn tại trên Netlify. Link GitHub Pages không có Netlify Functions, upload sẽ fail.
- Cách sửa: phát hiện API không có và fallback phát local bằng `URL.createObjectURL`, hoặc ghi rõ tính năng upload-lưu chỉ hỗ trợ Netlify.

```js
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

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Không tải được file nhạc");
    }

    return normalizeTrack(await response.json());
  } catch (error) {
    return normalizeTrack({
      type: "upload",
      name: formatName(file.name),
      fileName: file.name,
      url: URL.createObjectURL(file),
      transient: true,
    });
  }
}
```

### E07 - Khôi phục bài hiện tại nhưng không set `audioPlayer.src`

- File: `app.js`
- Dòng: 232-233, 293-301
- Mức độ: Medium
- Nguyên nhân: `currentIndex` được khôi phục từ localStorage, UI hiện bài đang chọn, nhưng audio chưa có `src`; nút play/pause có thể không phát bài đó.
- Cách sửa: set `src` sau khi restore và cho `togglePlay` phát bài đầu tiên nếu chưa chọn.

```js
function syncAudioSource() {
  const track = currentTrack();
  if (track && audioPlayer.src !== track.url) {
    audioPlayer.src = track.url;
  }
}

function togglePlay() {
  if (!tracks.length) return;
  if (currentIndex < 0) {
    playTrack(0);
    return;
  }
  syncAudioSource();
  if (audioPlayer.paused) {
    audioPlayer.play().catch(() => {});
  } else {
    audioPlayer.pause();
  }
}

// Sau restoreCurrentIndex(tracks):
currentIndex = restoreCurrentIndex(tracks);
syncAudioSource();
```

### E08 - Race condition khi nhiều người upload cùng lúc

- File: `netlify/functions/tracks.js`
- Dòng: 99, 127-128, 163-164, 192-193
- Mức độ: Medium
- Nguyên nhân: mỗi request đọc toàn bộ danh sách, push, rồi ghi đè toàn bộ. Hai request đồng thời có thể làm mất track của nhau.
- Cách sửa: lưu mỗi track ở một blob riêng, GET list bằng prefix thay vì ghi một mảng chung.

```js
const TRACK_PREFIX = "track/";

async function readTracks() {
  const listed = await tracksStore.list({ prefix: TRACK_PREFIX });
  const items = await Promise.all(
    listed.blobs.map((blob) => tracksStore.get(blob.key, { type: "json" })),
  );
  return items.filter(Boolean);
}

async function writeTrack(track) {
  const id = track.mediaKey || Buffer.from(track.url).toString("base64url");
  await tracksStore.setJSON(`${TRACK_PREFIX}${id}`, track);
}

// Thay tracks.push(track); await writeTracks(tracks);
await writeTrack(track);
```

### E09 - `media.js` không giới hạn HTTP method

- File: `netlify/functions/media.js`
- Dòng: 14-33
- Mức độ: Low
- Nguyên nhân: POST/PUT/DELETE vẫn có thể nhận media nếu có key.
- Cách sửa:

```js
exports.handler = async (event) => {
  if (event.httpMethod !== "GET" && event.httpMethod !== "HEAD") {
    return response(405, Buffer.from("Method not allowed").toString("base64"), {
      "content-type": "text/plain; charset=utf-8",
      "allow": "GET, HEAD",
    });
  }
  // giữ nguyên phần xử lý key hiện tại
};
```

### E10 - Thiếu lockfile, test/lint script và CI signal

- File: `package.json`
- Dòng: 1-8
- Mức độ: Low
- Nguyên nhân: chỉ có script build; không có `package-lock.json`, lint, test, format. Khó đảm bảo dependency tái lập và khó phát hiện regression.
- Cách sửa:

```json
{
  "name": "web-nghe-nhac",
  "private": true,
  "version": "1.0.0",
  "scripts": {
    "build": "node build.js",
    "check": "node --check app.js && node --check build.js && node --check netlify/functions/tracks.js && node --check netlify/functions/media.js",
    "verify": "npm run build && npm run check"
  },
  "dependencies": {
    "@netlify/blobs": "^8.0.0"
  }
}
```

## 8. Đánh giá chất lượng dự án

- Kiến trúc: đơn giản, dễ hiểu, phù hợp dự án nhỏ. Tuy nhiên mọi logic frontend nằm trong một file `app.js`, API handler kiêm cả validate, storage và response.
- Tính mở rộng: trung bình thấp. Khi thêm auth, xóa bài, sửa metadata, phân trang, search, playlist riêng user, code hiện tại sẽ khó mở rộng.
- Khả năng bảo trì: trung bình. Hàm nhỏ và dễ đọc, nhưng thiếu test, thiếu module hóa, thiếu schema track dùng chung giữa client/server.
- Hiệu năng: ổn với 48 bài manifest. Rủi ro lớn nằm ở upload không giới hạn kích thước, render lại toàn playlist mỗi lần state đổi, và lưu track list bằng một blob chung.
- Bảo mật: cần cải thiện. Lỗi chính là public write API, thiếu server-side validation, XSS qua `innerHTML`, thiếu giới hạn upload.
- Clean Code/SOLID: với project nhỏ không cần áp dụng nặng, nhưng đang vi phạm Single Responsibility ở `app.js` và `tracks.js`.

## 9. Cải tiến đề xuất

1. Thêm auth cho POST `/api/tracks`.
2. Validate upload ở server: MIME, extension, kích thước, method.
3. Thay mọi render dữ liệu động bằng `textContent`.
4. Tách `app.js` thành các module: `track-normalizer`, `storage`, `api-client`, `player`, `playlist-view`.
5. Dùng IndexedDB nếu muốn lưu file local thật sự ở browser khi không có Netlify API.
6. Bỏ SoundCloud URL hoặc làm embed player riêng.
7. Lưu track trên Netlify Blobs theo từng key để tránh lost update.
8. Thêm `package-lock.json`, `npm run check`, basic tests cho normalize/dedupe/validate.
9. Thêm README phân biệt rõ Netlify và GitHub Pages: GitHub Pages chỉ phát file tĩnh, không upload lên cloud.
10. Thêm CSP header trong Netlify để giảm rủi ro XSS.

## 10. Thứ tự refactor nên thực hiện

```text
Phase 1 - Fix rủi ro cao
  1. Sửa renderPlaylist không dùng innerHTML.
  2. Thêm auth, validate MIME, validate size cho tracks.js.
  3. Thêm nosniff và method check cho media.js.

Phase 2 - Sửa logic/deployment
  4. Sửa restore current track và togglePlay.
  5. Quyết định bỏ hoặc hỗ trợ đúng SoundCloud.
  6. Làm fallback rõ ràng cho GitHub Pages.

Phase 3 - Nâng chất lượng
  7. Tách module app.js.
  8. Thêm script check/test và lockfile.
  9. Đổi storage track list sang per-track blob.
```

