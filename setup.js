const SHEET_BASE_URL = 'https://docs.google.com/spreadsheets/d';
const DEFAULT_SHEET_NAME = 'Sheet1';
const PLAYER_COUNT = 4;
const SHEET_CONFIG_KEY = 'quizSheetConfig';

const elements = {
  message: document.getElementById('message'),
  sheetId: document.getElementById('sheet-id'),
  sheetName: document.getElementById('sheet-name'),
  sheetInputWrapper: document.getElementById('sheet-input-wrapper'),
  savedSheetPanel: document.getElementById('saved-sheet-panel'),
  playerCount: document.getElementById('player-count'),
  loadButton: document.getElementById('load-sheet'),
  startButton: document.getElementById('start-game'),
  editButton: document.getElementById('edit-sheet'),
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

function saveSheetConfig(sheetId, sheetName) {
  localStorage.setItem(SHEET_CONFIG_KEY, JSON.stringify({ sheetId, sheetName }));
}

function loadSheetConfig() {
  try {
    return JSON.parse(localStorage.getItem(SHEET_CONFIG_KEY));
  } catch (error) {
    return null;
  }
}

function showSavedSheetConfig(config) {
  if (!config) return;

  elements.sheetId.value = config.sheetId;
  elements.sheetName.value = config.sheetName;
  elements.savedSheetPanel.innerHTML = `
    <p>Sheet tersimpan:&nbsp;<strong>${config.sheetId}</strong></p>
    <p>Sheet name:&nbsp;<strong>${config.sheetName}</strong></p>
    <p>Klik <strong>Muat Soal</strong> untuk pakai lagi, atau Ubah Sheet untuk ganti.</p>
  `;
  elements.savedSheetPanel.classList.remove('hidden');
  elements.editButton.classList.remove('hidden');
  elements.sheetInputWrapper.classList.add('hidden');
}

function hideSavedSheetConfig() {
  elements.savedSheetPanel.classList.add('hidden');
  elements.editButton.classList.add('hidden');
  elements.sheetInputWrapper.classList.remove('hidden');
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
    saveSheetConfig(sheetId, sheetName);
    showSavedSheetConfig({ sheetId, sheetName });
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
  elements.editButton.addEventListener('click', hideSavedSheetConfig);
  elements.startButton.disabled = true;

  const savedConfig = loadSheetConfig();
  if (savedConfig && savedConfig.sheetId && savedConfig.sheetName) {
    showSavedSheetConfig(savedConfig);
    setMessage('Sheet terakhir siap dipakai. Klik Muat Soal untuk memuat kembali.', 'info');
  } else {
    setMessage('Masukkan ID Google Sheet lalu klik Muat Soal.', 'info');
  }
}

init();
