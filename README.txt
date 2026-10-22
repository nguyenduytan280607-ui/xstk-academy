PHASE 20.3 - AI PRACTICE GENERATOR
Thay main.jsx và server.js tại thư mục gốc repository trên GitHub.
Vercel deploy frontend; Render deploy backend. Không cần thêm biến môi trường nếu GROQ_API_KEY đã hoạt động.
Mặc định: Chương 3, medium, mixed, 10 câu (5 trắc nghiệm, 5 tự luận).
API POST /api/practice/generate. Chấm tự luận tái sử dụng POST /api/grade.
Lưu ý: AI có thể tạo đáp án sai; cần kiểm tra thủ công. Lượt tạo 20 câu có thể chạm giới hạn token/quota.
