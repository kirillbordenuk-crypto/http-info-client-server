const STORAGE_KEY = 'downloadedContentItems:v1';

const elements = {
  keywordForm: document.querySelector('#keywordForm'),
  keywordInput: document.querySelector('#keywordInput'),
  keywordsHint: document.querySelector('#keywordsHint'),
  urlList: document.querySelector('#urlList'),
  downloadStatus: document.querySelector('#downloadStatus'),
  progressBar: document.querySelector('#progressBar'),
  cancelButton: document.querySelector('#cancelButton'),
  refreshStorageButton: document.querySelector('#refreshStorageButton'),
  clearStorageButton: document.querySelector('#clearStorageButton'),
  savedList: document.querySelector('#savedList'),
  contentMeta: document.querySelector('#contentMeta'),
  contentViewer: document.querySelector('#contentViewer'),
  urlItemTemplate: document.querySelector('#urlItemTemplate'),
  savedItemTemplate: document.querySelector('#savedItemTemplate')
};

let activeController = null;

function setStatus(message, type = 'muted') {
  elements.downloadStatus.textContent = message;
  elements.downloadStatus.className = `status ${type}`;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'размер неизвестен';
  if (bytes === 0) return '0 Б';

  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

async function requestJson(url) {
  let response;

  try {
    response = await fetch(url);
  } catch {
    throw new Error('Сервер недоступен. Проверьте подключение или запустите Node.js сервер.');
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    throw new Error('Сервер вернул некорректный JSON.');
  }

  if (!response.ok) {
    throw new Error(data.error || `Ошибка HTTP ${response.status}.`);
  }

  return data;
}

function getSavedItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function saveItems(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      throw new Error('LocalStorage переполнен. Удалите старые материалы и повторите загрузку.');
    }
    throw new Error('Не удалось сохранить контент в LocalStorage.');
  }
}

function addSavedItem(item) {
  const items = getSavedItems();
  items.unshift(item);
  saveItems(items);
  renderSavedItems();
}

function deleteSavedItem(id) {
  const items = getSavedItems().filter((item) => item.id !== id);
  saveItems(items);
  renderSavedItems();
}

function renderUrlList(keyword, urls) {
  elements.urlList.innerHTML = '';

  urls.forEach((url) => {
    const node = elements.urlItemTemplate.content.cloneNode(true);
    const itemMain = node.querySelector('.item-main');
    const button = node.querySelector('.download-button');

    itemMain.innerHTML = `
      <div class="item-title">${url}</div>
      <div class="item-subtitle">Ключевое слово: ${keyword}</div>
    `;

    button.addEventListener('click', () => downloadContent(keyword, url));
    elements.urlList.append(node);
  });
}

function renderSavedItems() {
  const items = getSavedItems();
  elements.savedList.innerHTML = '';

  if (!items.length) {
    elements.savedList.innerHTML = '<p class="muted">В LocalStorage пока нет загруженного контента.</p>';
    return;
  }

  items.forEach((item) => {
    const node = elements.savedItemTemplate.content.cloneNode(true);
    const itemMain = node.querySelector('.item-main');
    const openButton = node.querySelector('.open-button');
    const deleteButton = node.querySelector('.delete-button');

    const date = new Date(item.downloadedAt).toLocaleString('ru-RU');
    itemMain.innerHTML = `
      <div class="item-title">${item.url}</div>
      <div class="item-subtitle">${item.keyword} · ${formatBytes(item.size)} · ${date}</div>
    `;

    openButton.addEventListener('click', () => showSavedContent(item.id));
    deleteButton.addEventListener('click', () => {
      if (confirm('Удалить этот материал из LocalStorage?')) {
        deleteSavedItem(item.id);
      }
    });

    elements.savedList.append(node);
  });
}

function showSavedContent(id) {
  const item = getSavedItems().find((savedItem) => savedItem.id === id);

  if (!item) {
    elements.contentMeta.textContent = 'Материал не найден в LocalStorage.';
    elements.contentViewer.textContent = '';
    return;
  }

  const date = new Date(item.downloadedAt).toLocaleString('ru-RU');
  elements.contentMeta.textContent = `${item.url} · ${item.contentType} · ${formatBytes(item.size)} · ${date}`;
  elements.contentViewer.textContent = item.text;
}

async function loadKeywordsHint() {
  try {
    const data = await requestJson('/api/keywords');
    elements.keywordsHint.textContent = `Доступные ключевые слова: ${data.keywords.join(', ')}`;
  } catch (error) {
    elements.keywordsHint.textContent = error.message;
  }
}

async function handleKeywordSubmit(event) {
  event.preventDefault();
  const keyword = elements.keywordInput.value.trim();
  elements.urlList.innerHTML = '';

  if (!keyword) {
    setStatus('Введите ключевое слово.', 'error');
    return;
  }

  try {
    const data = await requestJson(`/api/urls?keyword=${encodeURIComponent(keyword)}`);
    renderUrlList(data.keyword, data.urls);
    setStatus(`Найдено URL: ${data.urls.length}. Выберите один для загрузки.`, 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

async function downloadContent(keyword, url) {
  if (activeController) {
    activeController.abort();
  }

  activeController = new AbortController();
  elements.cancelButton.hidden = false;
  elements.progressBar.hidden = false;
  elements.progressBar.value = 0;
  elements.progressBar.removeAttribute('max');
  setStatus('Подключение к серверу...', 'muted');

  try {
    const response = await fetch(`/api/download?url=${encodeURIComponent(url)}`, {
      signal: activeController.signal
    });

    if (!response.ok) {
      let message = `Ошибка HTTP ${response.status}.`;
      try {
        const data = await response.json();
        message = data.error || message;
      } catch {
        // Ignore non-JSON error body.
      }
      throw new Error(message);
    }

    const total = Number(response.headers.get('content-length'));
    const hasTotal = Number.isFinite(total) && total > 0;
    const contentType = response.headers.get('content-type') || 'text/plain';
    const reader = response.body?.getReader();

    if (!reader) {
      throw new Error('Браузер не поддерживает потоковое чтение ответа.');
    }

    if (hasTotal) {
      elements.progressBar.max = total;
    }

    const decoder = new TextDecoder('utf-8');
    const chunks = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      received += value.byteLength;
      chunks.push(decoder.decode(value, { stream: true }));

      if (hasTotal) {
        elements.progressBar.value = received;
        const percent = Math.min(100, Math.round((received / total) * 100));
        setStatus(`Загружено ${formatBytes(received)} из ${formatBytes(total)} (${percent}%).`, 'muted');
      } else {
        setStatus(`Загружено ${formatBytes(received)}. Общий размер неизвестен.`, 'muted');
      }
    }

    chunks.push(decoder.decode());
    const text = chunks.join('');

    const item = {
      id: crypto.randomUUID(),
      keyword,
      url,
      contentType,
      size: received,
      text,
      downloadedAt: new Date().toISOString()
    };

    addSavedItem(item);
    showSavedContent(item.id);
    setStatus(`Готово. Сохранено в LocalStorage: ${formatBytes(received)}.`, 'success');
  } catch (error) {
    if (error.name === 'AbortError') {
      setStatus('Загрузка отменена пользователем.', 'error');
    } else {
      setStatus(error.message, 'error');
    }
  } finally {
    elements.cancelButton.hidden = true;
    activeController = null;
  }
}

elements.keywordForm.addEventListener('submit', handleKeywordSubmit);
elements.refreshStorageButton.addEventListener('click', renderSavedItems);
elements.clearStorageButton.addEventListener('click', () => {
  if (confirm('Полностью очистить список загруженного контента?')) {
    localStorage.removeItem(STORAGE_KEY);
    renderSavedItems();
    elements.contentMeta.textContent = 'Выберите сохранённый документ.';
    elements.contentViewer.textContent = '';
  }
});
elements.cancelButton.addEventListener('click', () => {
  if (activeController) {
    activeController.abort();
  }
});

loadKeywordsHint();
renderSavedItems();
