# Web Nghe Nhac

Trang web nghe nhạc đơn giản chạy trực tiếp trong trình duyệt.

## Cách dùng

1. Bỏ file nhạc vào thư mục `songs/`.
2. Chạy `node build.js` để tạo `songs.json`.
3. Mở `index.html` bằng trình duyệt, hoặc chạy một local server.
4. Danh sách sẽ tự hiện, bấm vào bài nào để phát bài đó.
5. Nhạc sẽ tự phát bài tiếp theo khi bài hiện tại kết thúc.

## Link mở trang

Nếu chạy local server ở cổng `8000`, link sẽ là:

`http://localhost:8000`

## Chạy local server

```bash
python -m http.server 8000
```

## Deploy Netlify

Netlify sẽ tự chạy `node build.js` trước khi deploy để tạo danh sách bài hát từ thư mục `songs/`.
