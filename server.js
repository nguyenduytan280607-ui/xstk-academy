import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const PORT = Number(process.env.PORT || process.env.API_PORT || 8787);
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(x => x.trim()).filter(Boolean);
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method !== 'POST' || req.url !== '/api/solve') { res.writeHead(404, {'Content-Type':'application/json'}); return res.end(JSON.stringify({error:'Không tìm thấy API.'})); }
  let raw='';
  req.on('data', chunk => { raw += chunk; if (raw.length > 30000) req.destroy(); });
  req.on('end', async () => {
    try {
      const body = JSON.parse(raw || '{}');
      const problem = String(body.problem || '').trim();
      if (!problem) { res.writeHead(400, {'Content-Type':'application/json'}); return res.end(JSON.stringify({error:'Vui lòng nhập đề bài.'})); }
      if (problem.length > 12000) { res.writeHead(413, {'Content-Type':'application/json'}); return res.end(JSON.stringify({error:'Đề bài quá dài; vui lòng rút gọn dưới 12.000 ký tự.'})); }
      if (!process.env.OPENAI_API_KEY) { res.writeHead(503, {'Content-Type':'application/json'}); return res.end(JSON.stringify({error:'Chưa cấu hình OPENAI_API_KEY. Tạo file .env từ .env.example rồi thêm API key ở máy của bạn.'})); }
      const chapterNames = {'1':'Bài 1: Xác suất và công thức tính xác suất','2':'Bài 2: Biến ngẫu nhiên','3':'Bài 3: Các phân phối xác suất thông dụng','4':'Bài 4: Mẫu ngẫu nhiên và các số đặc trưng mẫu','5':'Bài 5: Ước lượng khoảng','6':'Bài 6: Kiểm định giả thiết trong thống kê','7':'Bài 7: So sánh các tham số'};
      const chapter = body.chapter && body.chapter !== 'auto' ? chapterNames[String(body.chapter)] : 'Tự nhận diện trong 7 bài Xác suất thống kê';
      const level = body.level === 'ngan-gon' ? 'Trình bày ngắn gọn nhưng đủ công thức và phép tính.' : body.level === 'goi-y' ? 'Chỉ đưa gợi ý theo từng bước, không tiết lộ kết quả cuối cùng ngay; đặt câu hỏi gợi mở khi thích hợp.' : 'Giải thích chi tiết, dễ hiểu cho sinh viên mới học.';
      const system = `Bạn là trợ giảng môn Xác suất thống kê (XSTK), dạy bằng tiếng Việt. Căn cứ kiến thức chuẩn của 7 chủ đề: ${chapter}. ${level}
Nguyên tắc: 1) Không tự bịa dữ kiện. 2) Liệt kê dữ kiện và đại lượng cần tìm. 3) Nêu mô hình/phân phối và điều kiện áp dụng. 4) Viết công thức ký hiệu trước, thay số sau. 5) Tính toán rõ ràng và ghi đơn vị. 6) Với kiểm định, nêu H0/H1, alpha, thống kê, miền bác bỏ/quy tắc p-value và kết luận theo ngữ cảnh; không bác bỏ H0 không có nghĩa chứng minh H0 đúng. 7) Với khoảng ước lượng, nêu độ tin cậy và phân phối tới hạn. 8) Nếu đề thiếu dữ kiện hoặc có nhiều cách hiểu, chỉ rõ phần thiếu và giải theo giả định được ghi rõ. 9) Phân biệt nội dung suy luận với dữ kiện đề cho. Định dạng lời giải bằng các mục: Nhận diện đề; Dữ kiện; Công thức; Giải từng bước; Kết luận; Lưu ý (nếu cần).`;
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST', headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
        body:JSON.stringify({model:process.env.OPENAI_MODEL || 'gpt-4.1-mini', temperature:0.2, messages:[{role:'system',content:system},{role:'user',content:problem}]})
      });
      const data = await response.json();
      if (!response.ok) { const msg = data?.error?.message || 'Dịch vụ AI trả về lỗi.'; res.writeHead(response.status >= 500 ? 502 : response.status, {'Content-Type':'application/json'}); return res.end(JSON.stringify({error:msg})); }
      const answer = data?.choices?.[0]?.message?.content;
      if (!answer) { res.writeHead(502, {'Content-Type':'application/json'}); return res.end(JSON.stringify({error:'AI chưa trả về lời giải. Hãy thử lại.'})); }
      res.writeHead(200, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify({answer}));
    } catch (err) {
      res.writeHead(500, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify({error:'Có lỗi khi xử lý yêu cầu. ' + (err.message || '')}));
    }
  });
});
server.listen(PORT, '0.0.0.0', () => console.log(`XSTK Academy API đang chạy trên cổng ${PORT}`));
