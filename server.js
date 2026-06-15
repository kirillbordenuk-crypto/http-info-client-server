const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const keywordUrlMap = {
  javascript: [
    'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    'https://www.w3.org/wiki/JavaScript_best_practices',
    'https://www.ecma-international.org/publications-and-standards/standards/ecma-262/'
  ],
  nodejs: [
    'https://nodejs.org/en',
    'https://nodejs.org/api/',
    'https://expressjs.com/'
  ],
  html: [
    'https://developer.mozilla.org/en-US/docs/Web/HTML',
    'https://html.spec.whatwg.org/',
    'https://www.w3.org/TR/html52/'
  ],
  css: [
    'https://developer.mozilla.org/en-US/docs/Web/CSS',
    'https://www.w3.org/Style/CSS/',
    'https://web.dev/learn/css/'
  ],
  test: [
    'https://www.example.com/',
    'https://jsonplaceholder.typicode.com/posts/1',
    'https://jsonplaceholder.typicode.com/users/1'
  ]
};

const allowedUrls = new Set(Object.values(keywordUrlMap).flat());

app.use(express.json());
app.use(express.static(__dirname));

function normalizeKeyword(value) {
  return String(value || '').trim().toLowerCase();
}

function isAllowedHttpUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) && allowedUrls.has(parsed.toString());
  } catch {
    return false;
  }
}

app.get('/api/keywords', (_req, res) => {
  res.json({ keywords: Object.keys(keywordUrlMap) });
});

app.get('/api/urls', (req, res) => {
  const keyword = normalizeKeyword(req.query.keyword);

  if (!keyword) {
    return res.status(400).json({ error: 'Введите ключевое слово.' });
  }

  const urls = keywordUrlMap[keyword];

  if (!urls) {
    return res.status(404).json({
      error: `Для ключевого слова "${keyword}" URL не найдены.`,
      availableKeywords: Object.keys(keywordUrlMap)
    });
  }

  res.json({ keyword, urls });
});

app.get('/api/download', async (req, res) => {
  const url = String(req.query.url || '').trim();

  if (!isAllowedHttpUrl(url)) {
    return res.status(400).json({
      error: 'URL запрещён или отсутствует в серверном списке. Загрузка разрешена только для URL, выданных сервером.'
    });
  }

  let upstreamResponse;

  try {
    upstreamResponse = await fetch(url, {
      headers: {
        'Accept-Encoding': 'identity',
        'User-Agent': 'HTTP-Info-Collector/1.0 (+student-project)'
      },
      redirect: 'follow'
    });
  } catch (error) {
    return res.status(502).json({
      error: 'Не удалось подключиться к удалённому сайту.',
      details: error.message
    });
  }

  if (!upstreamResponse.ok || !upstreamResponse.body) {
    return res.status(502).json({
      error: 'Удалённый сайт вернул ошибку.',
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText
    });
  }

  const contentType = upstreamResponse.headers.get('content-type') || 'text/plain; charset=utf-8';
  const contentLength = upstreamResponse.headers.get('content-length');

  res.status(200);
  res.setHeader('Content-Type', contentType);
  res.setHeader('X-Source-Url', encodeURIComponent(url));
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, X-Source-Url, Content-Type');

  if (contentLength) {
    res.setHeader('Content-Length', contentLength);
  }

  const reader = upstreamResponse.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (res.destroyed) {
        await reader.cancel();
        return;
      }

      res.write(Buffer.from(value));
    }

    res.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Ошибка при передаче данных клиенту.', details: error.message });
    } else {
      res.destroy(error);
    }
  }
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Маршрут не найден.' });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Внутренняя ошибка сервера.', details: error.message });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running: http://localhost:${PORT}`);
  });
}

module.exports = app;
