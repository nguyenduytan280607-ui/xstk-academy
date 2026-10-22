
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

// Model dùng riêng cho ảnh. Có thể đổi trên Render nếu Groq thay danh sách model.
const GROQ_VISION_MODEL =
  process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function validateImages(value) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > MAX_IMAGES) {
    throw new Error('Chỉ hỗ trợ tối đa 3 ảnh/trang PDF.');
  }
  return value.map((item, index) => {
    if (typeof item !== 'string') throw new Error(`Ảnh ${index + 1} không hợp lệ.`);
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(item);
    if (!match) throw new Error(`Ảnh ${index + 1} phải là JPG, PNG hoặc WebP dạng base64.`);
    const bytes = Buffer.byteLength(match[2], 'base64');
    if (bytes < 1 || bytes > MAX_IMAGE_BYTES) {
      throw new Error(`Ảnh ${index + 1} vượt giới hạn 4 MB sau chuyển đổi.`);
    }
    return item;
  });
}

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
  '5': 'Ước lượng khoảng',
  '6': 'Kiểm định giả thiết trong thống kê',
  '7': 'So sánh các tham số'
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
      model: GROQ_MODEL,
      visionModel: GROQ_VISION_MODEL
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

    if (Buffer.byteLength(raw, 'utf8') > 20 * 1024 * 1024) {
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

      let images;
      try {
        images = validateImages(body.images);
      } catch (error) {
        return sendJSON(res, 400, { error: error.message });
      }

      const problem = typeof body.problem === 'string' ? body.problem.trim() : '';

      if (!problem && images.length === 0) {
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

      const hasImages = images.length > 0;
      const userContent = hasImages
        ? [
            { type: 'text', text: `${userProblem || 'Hãy đọc đề bài và giải từng bước.'}\n\nTrước khi giải, hãy chép lại nội dung đề đọc được từ ảnh. Nếu chữ không rõ, nói rõ chỗ không đọc được, tuyệt đối không bịa số liệu.` },
            ...images.map(url => ({ type: 'image_url', image_url: { url } }))
          ]
        : userProblem;

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
              model: hasImages ? GROQ_VISION_MODEL : GROQ_MODEL,
              messages: [
                {
                  role: 'system',
                  content: system
                },
                {
                  role: 'user',
                  content: userContent
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

        if (hasImages && response.status === 400) {
          return sendJSON(res, 502, {
            error: `Model đọc ảnh không xử lý được yêu cầu: ${message}. Hãy kiểm tra GROQ_VISION_MODEL trên Render hoặc thử ảnh nhỏ hơn.`
          });
        }

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
    `AI provider: Groq | Text: ${GROQ_MODEL} | Vision: ${GROQ_VISION_MODEL}`
  );
});
