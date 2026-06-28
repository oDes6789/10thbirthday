# Đốm Lửa — Flame Embers

Ứng dụng web tương tác mừng **sinh nhật 10 tuổi Edutalk**: hàng nghìn ngọn lửa shader trên bầu trời đêm, mỗi người tham gia thắp một ngọn lửa mang tên và lời chúc của mình.

## Tính năng

- **Hiệu ứng lửa WebGL** — 1050 ngọn lửa shader (Three.js + bloom), chuyển động tự nhiên
- **Phòng multiplayer** — tham gia bằng tên, gửi lời chúc, xem ngọn lửa của người khác theo thời gian thực
- **Bảng điều chỉnh** — preset, tinh chỉnh màu sắc / chuyển động / bloom, lưu cài đặt vào `localStorage`
- **Màn chiếu (preview)** — chế độ xem chỉ đọc cho màn hình lớn, không cần đăng nhập
- **Trang admin** — chỉnh hiệu ứng lửa, không có giao diện phòng

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Frontend | Vite, Three.js, lil-gui |
| Backend | Node.js, WebSocket (`ws`) |
| Shader | GLSL tùy chỉnh |

## Cấu trúc thư mục

```
├── index.html          # Trang chính — tham gia phòng, thắp lửa
├── admin.html          # Trang admin — chỉnh hiệu ứng
├── preview.html        # Màn chiếu — xem toàn bộ phòng
├── src/
│   ├── main.js         # Entry trang chính
│   ├── admin.js        # Entry trang admin
│   ├── preview.js      # Entry màn chiếu
│   ├── flameScene.js   # Scene Three.js, 1050 ngọn lửa
│   ├── flameControls.js
│   ├── multiplayer/    # WebSocket client & UI phòng
│   └── shaders/
├── server/
│   └── index.js        # WebSocket room server (port 3001)
└── dist/               # Build production
```

## Yêu cầu

- Node.js 18 trở lên
- npm

## Cài đặt

```bash
npm install
```

## Chạy development

Chạy đồng thời Vite dev server và WebSocket room server:

```bash
npm run dev
```

| Trang | URL |
|---|---|
| Trang chính | http://localhost:5173/ |
| Admin | http://localhost:5173/admin.html |
| Màn chiếu | http://localhost:5173/preview.html |

Chỉ chạy frontend hoặc backend riêng:

```bash
npm run dev:web    # Vite only
npm run dev:room   # WebSocket server only (port 3001)
```

## Build & deploy

```bash
npm run build      # Xuất ra thư mục dist/
npm run preview    # Xem bản build local
```

Trong production, cần chạy room server riêng:

```bash
npm run start:room
# hoặc
PORT=3001 node server/index.js
```

Endpoint health check: `GET http://localhost:3001/health`

## Cách sử dụng

### Người tham gia (trang chính)

1. Mở trang chính, nhập tên hiển thị
2. Nhấn **Thắp ngọn lửa của tôi** — ngọn lửa của bạn xuất hiện trên màn hình
3. Viết lời chúc (tối đa 120 ký tự) — hiển thị trên ngọn lửa của bạn
4. Nhấn **H** hoặc nút 🔥 để mở bảng điều chỉnh hiệu ứng lửa

### Màn chiếu

Mở `preview.html` trên màn hình lớn. Trang tự kết nối WebSocket ở chế độ xem (`watch`) và hiển thị toàn bộ ngọn lửa đang hoạt động.

### Admin

Mở `admin.html` để tinh chỉnh preset và tham số shader mà không cần tham gia phòng.

## Giới hạn

- Tối đa **1050** ngọn lửa đồng thời
- Tên hiển thị: tối đa 32 ký tự
- Lời chúc: tối đa 120 ký tự

## Biến môi trường

| Biến | Mặc định | Mô tả |
|---|---|---|
| `PORT` | `3001` | Cổng WebSocket room server |

## License

Private — dự án nội bộ Edutalk.
