
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Đọc file .env khi chạy trên máy cá nhân.
// Trên Render, biến môi trường được cấu hình trong Dashboard.
const root = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(root, '.env');

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);

    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

const PORT = Number(process.env.PORT || process.env.API_PORT || 8787);

const allowedOrigins = (
  process.env.FRONTEND_URL ||
  'http://localhost:5173,http://127.0.0.1:5173'
)
  .split(',')
  .map(origin => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

const chapterNames = {
  '1': 'Bài 1: Xác suất và công thức tính xác suất',
  '2': 'Bài 2: Biến ngẫu nhiên',
  '3': 'Bài 3: Các phân phối xác suất thông dụng',
  '4': 'Bài 4: Mẫu ngẫu nhiên và các số đặc trưng mẫu',
  '5': 'Bài 5: Ước lượng khoảng',
  '6': 'Bài 6: Kiểm định giả thiết trong thống kê',
  '7': 'Bài 7: So sánh các tham số'
};

function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8'
  });

  res.end(JSON.stringify(data));
}

function createPrompt(body, problem) {
  const chapter =
    body.chapter && body.chapter !== 'auto'
      ? chapterNames[String(body.chapter)] ||
        'Tự nhận diện chương phù hợp'
      : 'Tự nhận diện trong 7 bài Xác suất thống kê';

  let level = 'Giải thích chi tiết, dễ hiểu cho sinh viên mới học.';

  if (body.level === 'ngan-gon') {
    level = 'Trình bày ngắn gọn nhưng đủ công thức và phép tính.';
  } else if (body.level === 'goi-y') {
    level =
      'Chỉ đưa gợi ý theo từng bước, không tiết lộ kết quả cuối cùng ngay; đặt câu hỏi gợi mở khi thích hợp.';
  }

  const system = `
Bạn là trợ giảng môn Xác suất thống kê (XSTK), dạy bằng tiếng Việt.

Chương học: ${chapter}
Yêu cầu trình bày: ${level}

Nguyên tắc:
1. Không tự bịa dữ kiện.
2. Liệt kê dữ kiện và đại lượng cần tìm.
3. Nêu mô hình hoặc phân phối xác suất và điều kiện áp dụng.
4. Viết công thức ký hiệu trước, thay số sau.
5. Tính toán rõ ràng và ghi đơn vị.
6. Với kiểm định giả thuyết, nêu H0, H1, alpha, thống kê kiểm định,
   miền bác bỏ hoặc quy tắc p-value và kết luận theo ngữ cảnh.
7. Không bác bỏ H0 không có nghĩa là chứng minh H0 đúng.
8. Với khoảng ước lượng, nêu độ tin cậy và phân phối tới hạn.
9. Nếu đề thiếu dữ kiện, chỉ rõ phần thiếu và giải theo giả định
   được ghi rõ.
10. Phân biệt dữ kiện đề cho và nội dung suy luận.

Định dạng lời giải:
- Nhận diện đề
- Dữ kiện
- Công thức
- Giải từng bước
- Kết luận
- Lưu ý (nếu cần)
`;

  return {
    system,
    problem
  };
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const normalizedOrigin = origin?.trim().replace(/\/$/, '');

  if (normalizedOrigin && allowedOrigins.includes(normalizedOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', normalizedOrigin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.method !== 'POST' || req.url !== '/api/solve') {
    return sendJSON(res, 404, {
      error: 'Không tìm thấy API.'
    });
  }

  let raw = '';
  let tooLarge = false;

  req.on('data', chunk => {
    raw += chunk;

    if (raw.length > 30000) {
      tooLarge = true;
      req.destroy();
    }
  });

  req.on('end', async () => {
    if (tooLarge) return;

    try {
      let body;

      try {
        body = JSON.parse(raw || '{}');
      } catch {
        return sendJSON(res, 400, {
          error: 'Dữ liệu gửi lên không đúng định dạng JSON.'
        });
      }

      const problem = String(body.problem || '').trim();

      if (!problem) {
        return sendJSON(res, 400, {
          error: 'Vui lòng nhập đề bài.'
        });
      }

      if (problem.length > 12000) {
        return sendJSON(res, 413, {
          error: 'Đề bài quá dài. Vui lòng rút gọn dưới 12.000 ký tự.'
        });
      }

      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return sendJSON(res, 503, {
          error: 'Backend chưa được cấu hình GEMINI_API_KEY.'
        });
      }

      const { system, problem: userProblem } = createPrompt(
        body,
        problem
      );

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      let response;

      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [
                  { text: system }
                ]
              },
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: userProblem }
                  ]
                }
              ],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 4096
              }
            }),
            signal: controller.signal
          }
        );
      } finally {
        clearTimeout(timeout);
      }

      const data = await response.json();

      if (!response.ok) {
        const message =
          data?.error?.message ||
          'Gemini API trả về lỗi không xác định.';

        console.error('Gemini API error:', response.status, message);

        return sendJSON(
          res,
          response.status === 429 ? 429 : 502,
          {
            error:
              response.status === 429
                ? 'Gemini đã đạt giới hạn lượt sử dụng. Vui lòng thử lại sau.'
                : `Gemini API: ${message}`
          }
        );
      }

      const answer = (data?.candidates?.[0]?.content?.parts || [])
        .filter(part => typeof part.text === 'string')
        .map(part => part.text)
        .join('\n')
        .trim();

      if (!answer) {
        return sendJSON(res, 502, {
          error: 'Gemini chưa trả về lời giải. Hãy thử lại.'
        });
      }

      return sendJSON(res, 200, {
        answer
      });

    } catch (error) {
      console.error('Solve error:', error);

      if (error?.name === 'AbortError') {
        return sendJSON(res, 504, {
          error: 'Gemini phản hồi quá lâu. Vui lòng thử lại.'
        });
      }

      return sendJSON(res, 500, {
        error: 'Có lỗi khi xử lý yêu cầu AI.'
      });
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`XSTK Academy API đang chạy trên cổng ${PORT}`);
  console.log(`Gemini model: ${GEMINI_MODEL}`);
});
