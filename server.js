
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

// Model Groq mặc định.
// Có thể đổi bằng biến GROQ_MODEL trên Render.
const GROQ_MODEL =
  process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

const allowedOrigins = (
  process.env.FRONTEND_URL ||
  'http://localhost:5173,http://127.0.0.1:5173'
)
  .split(',')
  .map(origin => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

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
  if (res.writableEnded || res.destroyed) return;

  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });

  res.end(JSON.stringify(data));
}

function createPrompt(body, problem) {
  const chapter =
    body.chapter && body.chapter !== 'auto'
      ? chapterNames[String(body.chapter)] ||
        'Tự nhận diện chương phù hợp'
      : 'Tự nhận diện trong 7 bài Xác suất thống kê';

  let level =
    'Giải thích chi tiết, dễ hiểu cho sinh viên mới học.';

  if (body.level === 'ngan-gon') {
    level =
      'Trình bày ngắn gọn nhưng đủ công thức và phép tính.';
  } else if (body.level === 'goi-y') {
    level =
      'Chỉ đưa gợi ý theo từng bước, không tiết lộ kết quả cuối cùng ngay; đặt câu hỏi gợi mở khi thích hợp.';
  }

  const system = `
Bạn là trợ giảng môn Xác suất thống kê (XSTK),
dạy bằng tiếng Việt.

Chương học: ${chapter}
Yêu cầu trình bày: ${level}

Nguyên tắc:
1. Không tự bịa dữ kiện.
2. Liệt kê dữ kiện và đại lượng cần tìm.
3. Nêu mô hình hoặc phân phối xác suất và điều kiện áp dụng.
4. Viết công thức ký hiệu trước, thay số sau.
5. Tính toán rõ ràng và ghi đơn vị.
6. Với kiểm định giả thuyết, nêu H0, H1, alpha,
   thống kê kiểm định, miền bác bỏ hoặc quy tắc
   p-value và kết luận theo ngữ cảnh.
7. Không bác bỏ H0 không có nghĩa là chứng minh
   H0 đúng.
8. Với khoảng ước lượng, nêu độ tin cậy
   và phân phối tới hạn.
9. Nếu đề thiếu dữ kiện, chỉ rõ phần thiếu
   và giải theo giả định được ghi rõ.
10. Phân biệt dữ kiện đề cho và nội dung suy luận.
11. Kiểm tra lại phép tính trước khi kết luận.
12. Ưu tiên cách giải phù hợp với sinh viên mới học.

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

  if (
    normalizedOrigin &&
    allowedOrigins.includes(normalizedOrigin)
  ) {
    res.setHeader(
      'Access-Control-Allow-Origin',
      normalizedOrigin
    );
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type'
  );

  res.setHeader(
    'Access-Control-Allow-Methods',
    'POST, OPTIONS'
  );

  // Từ chối origin không được cho phép.
  if (
    normalizedOrigin &&
    !allowedOrigins.includes(normalizedOrigin)
  ) {
    return sendJSON(res, 403, {
      error: 'Nguồn truy cập không được cho phép.'
    });
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Endpoint kiểm tra backend.
  if (req.method === 'GET' && req.url === '/health') {
    return sendJSON(res, 200, {
      status: 'ok',
      provider: 'groq',
      model: GROQ_MODEL
    });
  }

  if (req.method !== 'POST' || req.url !== '/api/solve') {
    return sendJSON(res, 404, {
      error: 'Không tìm thấy API.'
    });
  }

  let raw = '';
  let tooLarge = false;

  req.on('data', chunk => {
    if (tooLarge) return;

    raw += chunk.toString('utf8');

    if (Buffer.byteLength(raw, 'utf8') > 30000) {
      tooLarge = true;

      sendJSON(res, 413, {
        error: 'Dữ liệu gửi lên quá lớn.'
      });
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

      if (
        !body ||
        typeof body !== 'object' ||
        Array.isArray(body)
      ) {
        return sendJSON(res, 400, {
          error: 'Dữ liệu yêu cầu không hợp lệ.'
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
          error:
            'Đề bài quá dài. Vui lòng rút gọn dưới 12.000 ký tự.'
        });
      }

      // Sử dụng Groq API Key thay cho Gemini.
      const apiKey = process.env.GROQ_API_KEY;

      if (!apiKey) {
        return sendJSON(res, 503, {
          error:
            'Backend chưa được cấu hình GROQ_API_KEY.'
        });
      }

      const {
        system,
        problem: userProblem
      } = createPrompt(body, problem);

      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, 60000);

      let response;

      try {
        response = await fetch(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: GROQ_MODEL,
              messages: [
                {
                  role: 'system',
                  content: system
                },
                {
                  role: 'user',
                  content: userProblem
                }
              ],
              temperature: 0.2,
              max_completion_tokens: 4096,
              stream: false
            }),
            signal: controller.signal
          }
        );
      } finally {
        clearTimeout(timeout);
      }

      let data;

      try {
        data = await response.json();
      } catch {
        return sendJSON(res, 502, {
          error:
            'Groq trả về dữ liệu không đúng định dạng.'
        });
      }

      if (!response.ok) {
        const message =
          data?.error?.message ||
          'Groq API trả về lỗi không xác định.';

        console.error(
          'Groq API error:',
          response.status,
          message
        );

        if (response.status === 429) {
          return sendJSON(res, 429, {
            error:
              'Groq đã đạt giới hạn sử dụng miễn phí. Vui lòng thử lại sau.'
          });
        }

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          return sendJSON(res, 502, {
            error:
              'Groq từ chối xác thực hoặc quyền truy cập API. Vui lòng kiểm tra cấu hình Render.'
          });
        }

        return sendJSON(res, 502, {
          error: `Groq API: ${message}`
        });
      }

      const answer =
        data?.choices?.[0]?.message?.content?.trim();

      if (!answer) {
        return sendJSON(res, 502, {
          error:
            'Groq chưa trả về lời giải. Hãy thử lại.'
        });
      }

      return sendJSON(res, 200, {
        answer
      });

    } catch (error) {
      console.error('Solve error:', error);

      if (error?.name === 'AbortError') {
        return sendJSON(res, 504, {
          error:
            'Groq phản hồi quá lâu. Vui lòng thử lại.'
        });
      }

      return sendJSON(res, 500, {
        error: 'Có lỗi khi xử lý yêu cầu AI.'
      });
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(
    `XSTK Academy API đang chạy trên cổng ${PORT}`
  );

  console.log(
    `AI provider: Groq | Model: ${GROQ_MODEL}`
  );
});
