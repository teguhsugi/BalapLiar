const SHEET_BASE_URL = 'https://docs.google.com/spreadsheets/d';
const DEFAULT_SHEET_NAME = 'Sheet1';
const PLAYER_COUNT = 4;
const BANK_KEY = 'quizSheetBank';

const elements = {
  message: document.getElementById('message'),
  sheetId: document.getElementById('sheet-id'),
  sheetName: document.getElementById('sheet-name'),
  playerCount: document.getElementById('player-count'),
  loadButton: document.getElementById('load-sheet'),
  startButton: document.getElementById('start-game'),
  bankTitle: document.getElementById('bank-title'),
  bankInput: document.getElementById('bank-input'),
  addBankButton: document.getElementById('add-bank-link'),
  bankList: document.getElementById('bank-list'),
  summary: document.getElementById('sheet-summary'),
};

function setMessage(text, type = 'info') {
  elements.message.textContent = text;
  elements.message.style.color = type === 'error' ? '#f87171' : type === 'success' ? '#86efac' : '#f8fafc';
}

function getSheetUrl(sheetId, sheetName) {
  return `${SHEET_BASE_URL}/${sheetId}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&headers=1&tqx=out:json`;
}

async function loadSheetData(sheetId, sheetName) {
  const response = await fetch(getSheetUrl(sheetId, sheetName));
  const text = await response.text();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace < 0 || lastBrace < 0) {
    throw new Error('Tidak dapat membaca respon Google Sheets. Pastikan sheet sudah dipublikasikan.');
  }

  const json = JSON.parse(text.substring(firstBrace, lastBrace + 1));
  const table = json.table;

  const cols = table.cols.map(col =>
    (col.label || '')
      .split(' ')[0]
      .trim()
      .toLowerCase()
  );

  return table.rows.map(row => {
    const item = {};
    cols.forEach((col, index) => {
      item[col] = row.c[index]?.v ?? '';
    });
    return item;
  });
}

function normalizeQuestions(rawQuestions) {
  const getValue = (item, keys) => {
    for (const key of keys) {
      const value = item[key];
      if (value != null && value.toString().trim() !== '') {
        return value.toString().trim();
      }
    }
    return '';
  };

  const normalizeAnswer = (value) => {
    const raw = value.toString().trim().toUpperCase();
    if (['1', '2', '3', '4'].includes(raw)) {
      return ['A', 'B', 'C', 'D'][Number(raw) - 1];
    }
    const letter = raw.match(/[A-D]/i)?.[0];
    return letter ? letter.toUpperCase() : '';
  };

  return rawQuestions
    .map((item) => {
      const question = getValue(item, ['question', 'soal', 'pertanyaan']);
      const answer = normalizeAnswer(getValue(item, ['answer', 'jawaban', 'kunci']));

      const optionKeys = [
        ['a', 'optiona', 'option a', 'pilihana', 'pilihan a'],
        ['b', 'optionb', 'option b', 'pilihanb', 'pilihan b'],
        ['c', 'optionc', 'option c', 'pilihanc', 'pilihan c'],
        ['d', 'optiond', 'option d', 'pilihand', 'pilihan d'],
      ];

      const options = optionKeys.map((keys, index) => ({
        label: ['A', 'B', 'C', 'D'][index],
        text: getValue(item, keys) || `Pilihan ${['A', 'B', 'C', 'D'][index]}`,
      }));

      return { question, options, answer };
    })
    .filter((item) => item.question && ['A', 'B', 'C', 'D'].includes(item.answer));
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function saveGameData(normalizedQuestions, playerCount) {
  sessionStorage.setItem('quizGameData', JSON.stringify({ questions: normalizedQuestions, playerCount }));
}

function saveBankItems(items) {
  localStorage.setItem(BANK_KEY, JSON.stringify(items));
}

function loadBankItems() {
  try {
    const stored = JSON.parse(localStorage.getItem(BANK_KEY)) || [];
    return stored.map((item) => {
      if (typeof item === 'string') {
        return { title: '', value: item };
      }
      return {
        title: item.title || '',
        value: item.value || '',
      };
    });
  } catch (error) {
    return [];
  }
}

function getSheetId(value) {
  const trimmed = value.toString().trim();
  const match = trimmed.match(/[-\w]{25,}/);
  if (!match) {
    return trimmed;
  }
  return match[0];
}

function renderBankList() {
  const items = loadBankItems();
  if (!items.length) {
    elements.bankList.innerHTML = '<p class="bank-empty">Belum ada bank sheet. Tambahkan link/ID di atas.</p>';
    return;
  }

  elements.bankList.innerHTML = items
    .map((item, index) => {
      const sheetId = getSheetId(item.value);
      const title = item.title || `Sheet ${index + 1}`;
      const shortId = `${sheetId.slice(0, 6)}...${sheetId.slice(-6)}`;
      return `
        <div class="bank-item" data-index="${index}" data-id="${sheetId}">
          <div class="bank-item-main">
            <div class="bank-item-title">${title}</div>
            <div class="bank-item-meta">ID: ${shortId}</div>
          </div>
          <div class="bank-item-actions">
            <button type="button" class="copy-link">Copy ID</button>
            <button type="button" class="use-link">Pakai</button>
            <button type="button" class="delete-link">Hapus</button>
          </div>
        </div>
      `;
    })
    .join('');
}

function addBankLink() {
  const title = elements.bankTitle.value.trim();
  const inputValue = elements.bankInput.value.trim();
  if (!inputValue) {
    setMessage('Masukkan URL atau ID terlebih dahulu.', 'error');
    return;
  }

  const sheetId = getSheetId(inputValue);
  if (!sheetId) {
    setMessage('ID Google Sheet tidak valid.', 'error');
    return;
  }

  const items = loadBankItems();
  if (items.some((item) => item.value === inputValue || getSheetId(item.value) === sheetId)) {
    setMessage('Link bank sudah ada.', 'info');
    elements.bankInput.value = '';
    elements.bankTitle.value = '';
    return;
  }

  const newItem = {
    title: title || `Sheet ${items.length + 1}`,
    value: inputValue,
  };

  items.unshift(newItem);
  saveBankItems(items.slice(0, 20));
  elements.bankInput.value = '';
  elements.bankTitle.value = '';
  renderBankList();
  setMessage('Link Google Sheet ditambahkan ke bank.', 'success');
}

function handleBankListClick(event) {
  const button = event.target.closest('button');
  if (!button) return;

  const item = button.closest('.bank-item');
  const sheetId = item?.dataset?.id;
  const index = Number(item?.dataset?.index);
  if (!sheetId) return;

  if (button.classList.contains('copy-link')) {
    navigator.clipboard.writeText(sheetId)
      .then(() => setMessage(`ID berhasil disalin: ${sheetId}`, 'success'))
      .catch(() => setMessage('Gagal menyalin ID. Coba lagi.', 'error'));
    return;
  }

  if (button.classList.contains('use-link')) {
    elements.sheetId.value = sheetId;
    setMessage('ID sheet diisi dari bank.', 'success');
    return;
  }

  if (button.classList.contains('delete-link')) {
    const items = loadBankItems();
    items.splice(index, 1);
    saveBankItems(items);
    renderBankList();
    setMessage('Bank sheet dihapus.', 'success');
  }
}

function updateSheetSummary(questions, playerCount) {
  elements.summary.innerHTML = `
    <p>Soal berhasil dimuat: <strong>${questions.length}</strong></p>
    <p>Mode: <strong>${playerCount}</strong> pemain</p>
    <p>Setelah klik <strong>Start Game</strong>, halaman akan pindah ke permainan.</p>
  `;
}

async function loadQuestions() {
  const sheetId = elements.sheetId.value.trim();
  const sheetName = elements.sheetName.value.trim() || DEFAULT_SHEET_NAME;
  const playerCount = Math.min(Math.max(Number(elements.playerCount.value), 4), 6);

  if (!sheetId) {
    setMessage('Sheet ID tidak boleh kosong.', 'error');
    return;
  }

  elements.loadButton.disabled = true;
  setMessage('Memuat soal...', 'info');

  try {
    const raw = await loadSheetData(sheetId, sheetName);
    const normalized = normalizeQuestions(raw);

    if (normalized.length < playerCount) {
      throw new Error(`Hanya terbaca ${normalized.length} soal. Butuh minimal ${playerCount} soal.`);
    }

    saveGameData(shuffle(normalized), playerCount);
    updateSheetSummary(normalized, playerCount);
    elements.startButton.disabled = false;
    setMessage('Soal siap. Klik Start Game untuk masuk ke game.', 'success');
  } catch (error) {
    setMessage(error.message || 'Terjadi kesalahan saat memuat soal.', 'error');
    elements.startButton.disabled = true;
    elements.summary.textContent = '';
  } finally {
    elements.loadButton.disabled = false;
  }
}

function startGame() {
  if (!sessionStorage.getItem('quizGameData')) {
    setMessage('Muat soal terlebih dahulu sebelum mulai game.', 'error');
    return;
  }
  window.location.href = 'game.html';
}

function init() {
  elements.loadButton.addEventListener('click', loadQuestions);
  elements.startButton.addEventListener('click', startGame);
  elements.addBankButton.addEventListener('click', addBankLink);
  elements.bankList.addEventListener('click', handleBankListClick);
  elements.startButton.disabled = true;

  renderBankList();
  setMessage('Masukkan ID Google Sheet lalu klik Muat Soal.', 'info');
}

init();
