# XSTK Academy

Website học Xác suất thống kê bằng tiếng Việt, tổ chức theo 7 bài PDF người học cung cấp. Gồm lộ trình 7 chương, thư viện bài học, theo dõi tiến độ, quiz, câu sai cần ôn, sổ tay công thức và trang giải bài tập từng bước bằng AI.

## Chạy website

Yêu cầu Node.js 20+.

```bash
npm install
npm run dev:all
```

Mở URL Vite hiển thị trong terminal (thường là `http://localhost:5173`). Lệnh `dev:all` chạy frontend và API server cùng lúc.

## Bật trợ giảng AI

1. Sao chép `.env.example` thành `.env`.
2. Thay `your_api_key_here` bằng API key của bạn; có thể thay `OPENAI_MODEL` nếu tài khoản hỗ trợ model khác.
3. Khởi động lại `npm run dev:all`.

API key chỉ được đọc ở máy chủ Node, không đưa vào mã React/frontend và không chia sẻ file `.env`. Sử dụng API có thể phát sinh phí theo tài khoản OpenAI. Nếu chưa cấu hình key, phần học bài và quiz vẫn dùng được; trang giải bài sẽ báo hướng dẫn cấu hình.

## Kiểm tra bản build

```bash
npm run build
npm run preview
```

## Cấu trúc

- `src/main.jsx`: giao diện React, điều hướng và tương tác.
- `src/data.js`: 7 chương, chủ đề bài học, công thức, ghi chú, ví dụ và quiz.
- `src/styles.css`: giao diện responsive.
- `server.js`: API giải bài, giữ API key ở server.
- `vite.config.js`: chuyển tiếp `/api` tới máy chủ giải bài.

## Lưu ý nội dung

Website đã tổ chức lại 7 chương theo tài liệu học tập và bổ sung phần diễn giải, ví dụ minh họa. Các ví dụ bổ sung là nội dung hỗ trợ học, không phải trích nguyên văn PDF. Một số công thức có nhiều quy ước ký hiệu hoặc điều kiện áp dụng; khi làm bài theo lớp, ưu tiên ký hiệu và giả thiết cụ thể trong tài liệu/giảng viên cung cấp.
