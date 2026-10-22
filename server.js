
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// XSTK Academy - Backend Phase 20.3
// Node.js 18+ | Groq AI

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

const GROQ_MODEL =
  process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

const GROQ_VISION_MODEL =
  process.env.GROQ_VISION_MODEL ||
  'meta-llama/llama-4-scout-17b-16e-instruct';

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const chapterNames = {
  '1': 'Bài 1: Xác suất và công thức tính xác suất',
  '2': 'Bài 2: Biến ngẫu nhiên',
  '3': 'Bài 3: Các phân phối xác suất thông dụng',
  '4': 'Bài 4: Mẫu ngẫu nhiên và các số đặc trưng mẫu',
  '5': 'Bài 5: Ước lượng khoảng',
  '6': 'Bài 6: Kiểm định giả thiết trong thống kê',
  '7': 'Bài 7: So sánh các tham số'
};

const allowedOrigins = (
  process.env.FRONTEND_URL ||
  'http://localhost:5173,http://127.0.0.1:5173'
)
  .split(',')
  .map(origin => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

function sendJSON(res, status, data) {
  if (res.writableEnded || res.destroyed) return;

  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });

  res.end(JSON.stringify(data));
}

function validateImages(value) {
  if (value == null) return [];

  if (!Array.isArray(value) || value.length > MAX_IMAGES) {
    throw new Error('Chỉ hỗ trợ tối đa 3 ảnh/trang PDF.');
  }

  return value.map((item, index) => {
    if (typeof item !== 'string') {
      throw new Error(`Ảnh ${index + 1} không hợp lệ.`);
    }

    const match =
      /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/
        .exec(item);

    if (!match) {
      throw new Error(
        `Ảnh ${index + 1} phải là JPG, PNG hoặc WebP dạng base64.`
      );
    }

    const bytes = Buffer.byteLength(match[2], 'base64');

    if (bytes < 1 || bytes > MAX_IMAGE_BYTES) {
      throw new Error(
        `Ảnh ${index + 1} vượt giới hạn 4 MB.`
      );
    }

    return item;
  });
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
      'Chỉ đưa gợi ý từng bước, không tiết lộ kết quả cuối cùng ngay.';
  }

  const system = `
Bạn là trợ giảng môn Xác suất Thống kê,
giảng dạy bằng tiếng Việt.

Chương học: ${chapter}
Yêu cầu trình bày: ${level}

Nguyên tắc:
1. Không tự bịa dữ kiện.
2. Liệt kê dữ kiện và đại lượng cần tìm.
3. Nêu mô hình hoặc phân phối xác suất.
4. Viết công thức trước, thay số sau.
5. Tính toán rõ ràng và ghi đơn vị.
6. Với kiểm định, nêu H0, H1, alpha,
   thống kê kiểm định và kết luận.
7. Với ước lượng, nêu độ tin cậy
   và phân phối tới hạn.
8. Nếu đề thiếu dữ kiện, nói rõ.
9. Kiểm tra lại phép tính trước khi kết luận.
10. Giải thích dễ hiểu cho sinh viên mới học.

Định dạng:
- Nhận diện đề
- Dữ kiện
- Công thức
- Giải từng bước
- Kết luận
- Lưu ý nếu cần
`;

  return { system, problem };
}

async function callGroq({
  system,
  userContent,
  model = GROQ_MODEL,
  maxTokens = 4096,
  timeoutMs = 60000
}) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    const error = new Error('Backend chưa cấu hình GROQ_API_KEY.');
    error.status = 503;
    throw error;
  }

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

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
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userContent }
          ],
          temperature: 0.2,
          max_completion_tokens: maxTokens,
          stream: false
        }),
        signal: controller.signal
      }
    );
  } finally {
    clearTimeout(timeout);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.error(
      'Groq error:',
      response.status,
      data?.error?.message
    );

    const error = new Error(
      response.status === 429
        ? 'Groq đã đạt giới hạn sử dụng. Hãy thử lại sau.'
        : response.status === 401 || response.status === 403
          ? 'Groq từ chối quyền truy cập. Kiểm tra API key.'
          : data?.error?.message ||
            'Groq không xử lý được yêu cầu.'
    );

    error.status = response.status === 429 ? 429 : 502;
    throw error;
  }

  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    const error = new Error(
      'AI không trả về nội dung hợp lệ.'
    );
    error.status = 502;
    throw error;
  }

  return content.trim();
}

// PHASE 20.3 - TẠO BỘ ĐỀ AI

async function generatePractice(body) {
  const chapter = String(body.chapter ?? '3');
  const difficulty = String(body.difficulty ?? 'medium');
  const requestedType = String(body.type ?? 'mixed');
  const type = requestedType === 'mcq' ? 'multiple' : requestedType;
  const count = Number(body.count ?? 10);

  if (
    !chapterNames[chapter] ||
    !['easy', 'medium', 'hard'].includes(difficulty) ||
    !['multiple', 'essay', 'mixed'].includes(type) ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 20
  ) {
    const error = new Error(
      'Cấu hình bộ đề không hợp lệ.'
    );
    error.status = 400;
    throw error;
  }

  const multipleCount =
    type === 'multiple'
      ? count
      : type === 'essay'
        ? 0
        : Math.ceil(count / 2);

  const essayCount = count - multipleCount;

  const difficultyName = {
    easy: 'dễ',
    medium: 'trung bình',
    hard: 'khó'
  }[difficulty];

  const system = `
Bạn là giảng viên đại học môn Xác suất Thống kê.

Hãy tạo một bộ đề luyện tập bằng tiếng Việt.

CHỦ ĐỀ: ${chapterNames[chapter]}
ĐỘ KHÓ: ${difficultyName}
TỔNG SỐ CÂU: ${count}
SỐ CÂU TRẮC NGHIỆM: ${multipleCount}
SỐ CÂU TỰ LUẬN: ${essayCount}

Yêu cầu:
1. Các câu thuộc đúng chương đã chọn.
2. Mỗi câu có đủ dữ kiện.
3. Không tạo câu hỏi mơ hồ.
4. Phân bố các dạng bài đa dạng.
5. Kiểm tra phép tính và đáp án.
6. Không tiết lộ đáp án ngay trong đề.
7. Chỉ xuất JSON hợp lệ, không Markdown.
8. Tạo đúng số lượng từng loại câu.

Định dạng JSON bắt buộc:

{
  "questions": [
    {
      "id": "q1",
      "type": "multiple",
      "prompt": "Nội dung câu hỏi",
      "options": [
        "Lựa chọn A",
        "Lựa chọn B",
        "Lựa chọn C",
        "Lựa chọn D"
      ],
      "correctIndex": 0,
      "explanation": "Giải thích chi tiết"
    },
    {
      "id": "q2",
      "type": "essay",
      "prompt": "Nội dung câu tự luận",
      "options": [],
      "correctIndex": null,
      "explanation": "Lời giải tham khảo"
    }
  ]
}

Quy tắc:
- type chỉ được là multiple hoặc essay.
- Trắc nghiệm có đúng 4 lựa chọn.
- correctIndex là số nguyên từ 0 đến 3.
- Tự luận có lời giải rõ công thức và phép tính.
- ID duy nhất từ q1 đến q${count}.
- Không có văn bản ngoài JSON.
`;

  const content = await callGroq({
    system,
    userContent:
      'Hãy tạo bộ đề theo đúng cấu hình và chỉ trả về JSON.',
    maxTokens: 8192,
    timeoutMs: 90000
  });

  let parsed;

  try {
    const clean = content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');

    parsed = JSON.parse(clean);
  } catch {
    const error = new Error(
      'AI trả về JSON không hợp lệ. Hãy tạo lại bộ đề.'
    );
    error.status = 502;
    throw error;
  }

  const questions = parsed?.questions;

  if (
    !Array.isArray(questions) ||
    questions.length !== count
  ) {
    const error = new Error(
      'AI tạo thiếu câu hỏi. Hãy thử lại.'
    );
    error.status = 502;
    throw error;
  }

  const valid = questions.every(q => {
    if (
      !q ||
      typeof q.id !== 'string' ||
      !q.id.trim() ||
      typeof q.prompt !== 'string' ||
      !q.prompt.trim() ||
      typeof q.explanation !== 'string' ||
      !q.explanation.trim()
    ) {
      return false;
    }

    if (q.type === 'multiple') {
      return (
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        q.options.every(
          o => typeof o === 'string' && o.trim()
        ) &&
        Number.isInteger(q.correctIndex) &&
        q.correctIndex >= 0 &&
        q.correctIndex <= 3
      );
    }

    if (q.type === 'essay') {
      return (
        Array.isArray(q.options) &&
        q.options.length === 0 &&
        q.correctIndex === null
      );
    }

    return false;
  });

  const actualMultiple = questions.filter(
    q => q.type === 'multiple'
  ).length;

  const uniqueIds =
    new Set(questions.map(q => q.id)).size === count;

  if (
    !valid ||
    !uniqueIds ||
    actualMultiple !== multipleCount
  ) {
    const error = new Error(
      'Bộ đề chưa đúng cấu trúc. Hãy thử tạo lại.'
    );
    error.status = 502;
    throw error;
  }

  return { questions };
}

// PHASE 20.1 + 20.2 - GIẢI VÀ CHẤM BÀI

async function solveOrGrade(body, grading) {
  const images = validateImages(body.images);

  const problem =
    typeof body.problem === 'string'
      ? body.problem.trim()
      : '';

  const studentAnswer =
    typeof body.studentAnswer === 'string'
      ? body.studentAnswer.trim()
      : '';

  if (grading) {
    if (!problem || (!studentAnswer && !images.length)) {
      const error = new Error(
        'Chấm bài cần có đề bài và bài làm.'
      );
      error.status = 400;
      throw error;
    }

    if (studentAnswer.length > 16000) {
      const error = new Error(
        'Bài làm quá dài, tối đa 16.000 ký tự.'
      );
      error.status = 413;
      throw error;
    }
  }

  if (!problem && !images.length) {
    const error = new Error('Vui lòng nhập đề bài.');
    error.status = 400;
    throw error;
  }

  if (problem.length > 12000) {
    const error = new Error(
      'Đề bài quá dài, tối đa 12.000 ký tự.'
    );
    error.status = 413;
    throw error;
  }

  const { system } = createPrompt(body, problem);

  const gradingSystem = grading
    ? `${system}

Bạn đang CHẤM BÀI của sinh viên.

Chấm theo thang điểm 10:

1. Nhận diện dữ kiện và yêu cầu: 2 điểm.
2. Phương pháp và điều kiện áp dụng: 2 điểm.
3. Công thức: 2 điểm.
4. Thay số và tính toán: 3 điểm.
5. Kết luận: 1 điểm.

Quy định:
- Tính lời giải độc lập trước khi chấm.
- Không tự bịa bước làm của sinh viên.
- Chỉ cho điểm các bước có bằng chứng.
- Điểm từng tiêu chí không vượt mức tối đa.
- Tổng điểm phải bằng tổng điểm thành phần.
- Nếu ảnh không đọc rõ, không đoán.
- Nếu không đủ dữ liệu, không cho điểm.
- Ghi nhận phương pháp khác nếu vẫn đúng.
- Điểm AI chỉ có tính tham khảo.

Trình bày:
## Điểm tổng: x/10
## Bảng tiêu chí
## Các bước làm đúng
## Các lỗi cần sửa
## Lời giải tham khảo
## Gợi ý cải thiện
`
    : system;

  const gradingText = grading
    ? `ĐỀ BÀI:
${problem}

BÀI LÀM SINH VIÊN:
${studentAnswer || '[Bài làm trong ảnh đính kèm]'}

Hãy chấm theo rubric và giải thích từng lỗi.`
    : problem;

  const hasImages = images.length > 0;

  const userContent = hasImages
    ? [
        {
          type: 'text',
          text: `${gradingText || 'Hãy đọc đề bài và giải.'}

Đọc chính xác nội dung trong ảnh trước khi xử lý.
Nếu không đọc rõ, hãy nói rõ chỗ bị thiếu.
Không bịa dữ kiện.`
        },
        ...images.map(url => ({
          type: 'image_url',
          image_url: { url }
        }))
      ]
    : gradingText;

  const answer = await callGroq({
    system: gradingSystem,
    userContent,
    model: hasImages ? GROQ_VISION_MODEL : GROQ_MODEL,
    maxTokens: 4096,
    timeoutMs: 60000
  });

  return { answer };
}

// SERVER

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  const normalizedOrigin =
    origin?.trim().replace(/\/$/, '');

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

  const pathname = new URL(
    req.url || '/',
    'http://localhost'
  ).pathname;

  if (req.method === 'GET' && pathname === '/health') {
    return sendJSON(res, 200, {
      status: 'ok',
      provider: 'groq',
      model: GROQ_MODEL,
      visionModel: GROQ_VISION_MODEL,
      features: ['solve', 'grade', 'practice']
    });
  }

  const allowedPaths = [
    '/api/solve',
    '/api/grade',
    '/api/practice/generate'
  ];

  if (
    req.method !== 'POST' ||
    !allowedPaths.includes(pathname)
  ) {
    return sendJSON(res, 404, {
      error: 'Không tìm thấy API.'
    });
  }

  let raw = '';
  let tooLarge = false;

  req.on('data', chunk => {
    if (tooLarge) return;

    raw += chunk.toString('utf8');

    if (
      Buffer.byteLength(raw, 'utf8') >
      20 * 1024 * 1024
    ) {
      tooLarge = true;

      return sendJSON(res, 413, {
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
          error: 'Dữ liệu JSON không hợp lệ.'
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

      let result;

      if (pathname === '/api/practice/generate') {
        result = await generatePractice(body);
      } else if (pathname === '/api/grade') {
        result = await solveOrGrade(body, true);
      } else {
        result = await solveOrGrade(body, false);
      }

      return sendJSON(res, 200, result);

    } catch (error) {
      console.error('API error:', error);

      if (error?.name === 'AbortError') {
        return sendJSON(res, 504, {
          error: 'AI phản hồi quá lâu. Hãy thử lại.'
        });
      }

      return sendJSON(
        res,
        error?.status || 500,
        {
          error:
            error?.status
              ? error.message
              : 'Có lỗi khi xử lý yêu cầu AI.'
        }
      );
    }
  });

  req.on('error', error => {
    console.error('Request error:', error);

    sendJSON(res, 400, {
      error: 'Không đọc được dữ liệu yêu cầu.'
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(
    `XSTK Academy API đang chạy trên cổng ${PORT}`
  );

  console.log(
    `Groq Text: ${GROQ_MODEL}`
  );

  console.log(
    `Groq Vision: ${GROQ_VISION_MODEL}`
  );
});
