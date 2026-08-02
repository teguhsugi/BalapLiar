const STORAGE_KEY = 'quizGameData';
const DEFAULT_PLAYER_COUNT = 4;
const POINTS_TO_WIN = 15;
const CAR_EMOJIS = ['🏎️', '🚗', '🚙', '🚕', '🚘', '🚚'];

const KEYBOARD_MAP = {
  Digit1: { player: 0, label: 'A' },
  Digit2: { player: 0, label: 'B' },
  Digit3: { player: 0, label: 'C' },
  Digit4: { player: 0, label: 'D' },
  KeyQ: { player: 1, label: 'A' },
  KeyW: { player: 1, label: 'B' },
  KeyE: { player: 1, label: 'C' },
  KeyR: { player: 1, label: 'D' },
  KeyA: { player: 2, label: 'A' },
  KeyS: { player: 2, label: 'B' },
  KeyD: { player: 2, label: 'C' },
  KeyF: { player: 2, label: 'D' },
  KeyZ: { player: 3, label: 'A' },
  KeyX: { player: 3, label: 'B' },
  KeyC: { player: 3, label: 'C' },
  KeyV: { player: 3, label: 'D' },
  KeyT: { player: 4, label: 'A' },
  KeyY: { player: 4, label: 'B' },
  KeyU: { player: 4, label: 'C' },
  KeyI: { player: 4, label: 'D' },
  KeyG: { player: 5, label: 'A' },
  KeyH: { player: 5, label: 'B' },
  KeyJ: { player: 5, label: 'C' },
  KeyK: { player: 5, label: 'D' },
};

const state = {
  playerCount: DEFAULT_PLAYER_COUNT,
  questions: [],
  currentIndices: [],
  score: [],
  progress: [],
  answered: [],
  chosenAnswer: [],
  active: false,
};

const elements = {
  message: document.getElementById('message'),
  track: document.getElementById('track'),
  questionGrid: document.getElementById('question-grid'),
  resetButton: document.getElementById('reset-game'),
  popup: document.getElementById('winner-popup'),
  winnerText: document.getElementById('winner-text'),
  closePopup: document.getElementById('close-popup'),
  confettiContainer: document.getElementById('confetti-container'),
  questionText: [],
  answerAreas: [],
  cars: [],
  score: [],
};

function setMessage(text, type = 'info') {
  elements.message.textContent = text;
  elements.message.style.color = type === 'error' ? '#f87171' : type === 'success' ? '#86efac' : '#f8fafc';
}

function loadGameData() {
  const storedData = sessionStorage.getItem(STORAGE_KEY);
  if (!storedData) {
    setMessage('Data game tidak ditemukan. Kembali ke halaman setup.', 'error');
    return false;
  }

  try {
    const parsed = JSON.parse(storedData);
    state.questions = parsed.questions || [];
    state.playerCount = parsed.playerCount || DEFAULT_PLAYER_COUNT;
    state.playerCount = Math.min(Math.max(state.playerCount, 4), 6);

    if (!state.questions.length) {
      setMessage('Soal tidak tersedia. Kembali ke halaman setup.', 'error');
      return false;
    }

    initializeState(state.playerCount);
    return true;
  } catch (error) {
    setMessage('Gagal memuat data permainan. Kembali ke setup.', 'error');
    return false;
  }
}

function initializeState(playerCount) {
  state.playerCount = playerCount;
  state.currentIndices = Array.from({ length: playerCount }, (_, i) => i);
  state.score = Array.from({ length: playerCount }, () => 0);
  state.progress = Array.from({ length: playerCount }, () => 0);
  state.answered = Array.from({ length: playerCount }, () => false);
  state.chosenAnswer = Array.from({ length: playerCount }, () => '');
  state.active = false;
  elements.track.classList.toggle('compact-track', playerCount >= 5);
  buildGameBoard();
}

function buildGameBoard() {
  elements.track.innerHTML = '';
  elements.questionGrid.innerHTML = '';
  elements.questionText = [];
  elements.answerAreas = [];
  elements.cars = [];
  elements.score = [];

  for (let i = 0; i < state.playerCount; i += 1) {
    const lane = document.createElement('div');
    lane.className = `track-lane lane-${i}`;

    const label = document.createElement('div');
    label.className = 'lane-label';
    label.textContent = `${i + 1}`;

    const finish = document.createElement('div');
    finish.className = 'finish-line';

    const car = document.createElement('div');
    car.className = 'car';
    car.id = `car-${i}`;
    car.textContent = CAR_EMOJIS[i] || '🚗';

    lane.append(label, finish, car);
    elements.track.appendChild(lane);
    elements.cars.push(car);

    const panel = document.createElement('section');
    panel.className = 'player-panel';
    panel.id = `player-${i}`;

    const header = document.createElement('div');
    header.className = 'player-header';
    header.textContent = `Pemain ${i + 1}`;

    const questionCard = document.createElement('div');
    questionCard.className = 'question-card';

    const questionText = document.createElement('div');
    questionText.className = 'question-text';
    questionText.id = `question-${i}`;
    questionText.textContent = 'Memuat soal...';

    const answers = document.createElement('div');
    answers.className = 'answer-buttons';
    answers.id = `answers-${i}`;

    questionCard.append(questionText, answers);

    const meta = document.createElement('div');
    meta.className = 'player-meta';
    meta.innerHTML = `<span class="score">Skor: <strong id="score-${i}">0</strong></span>`;

    panel.append(header, questionCard, meta);
    elements.questionGrid.appendChild(panel);

    elements.questionText.push(questionText);
    elements.answerAreas.push(answers);
    elements.score.push(meta.querySelector('strong'));
  }
}

function moveCar(playerIndex, progressValue) {
  const maxPercent = 84;
  const percent = Math.min((progressValue / POINTS_TO_WIN) * maxPercent, maxPercent);
  elements.cars[playerIndex].style.left = `${Math.min(16 + percent, maxPercent)}%`;
}

function renderPlayers() {
  for (let playerIndex = 0; playerIndex < state.playerCount; playerIndex += 1) {
    const question = state.questions[state.currentIndices[playerIndex]];
    elements.questionText[playerIndex].textContent = question ? question.question : 'Tidak ada soal yang tersedia.';
    elements.answerAreas[playerIndex].innerHTML = '';

    if (!question) continue;

    question.options.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${option.label}. ${option.text}`;
      button.disabled = state.answered[playerIndex] || !state.active;

      if (state.answered[playerIndex]) {
        if (state.chosenAnswer[playerIndex] === option.label) {
          if (option.label === question.answer) {
            button.classList.add('correct');
          } else {
            button.classList.add('wrong');
          }
        }
      }

      button.addEventListener('click', () => handleAnswer(playerIndex, option.label));
      elements.answerAreas[playerIndex].appendChild(button);
    });
  }
}

function resetPlayerState(playerIndex) {
  state.answered[playerIndex] = false;
  state.chosenAnswer[playerIndex] = '';
}

function nextQuestion(playerIndex) {
  state.currentIndices[playerIndex] = (state.currentIndices[playerIndex] + 1) % state.questions.length;
  resetPlayerState(playerIndex);
  renderPlayers();
}

function handleAnswer(playerIndex, chosenLabel) {
  if (!state.active) {
    setMessage('Game belum dimulai.', 'error');
    return;
  }

  if (state.answered[playerIndex]) return;

  const question = state.questions[state.currentIndices[playerIndex]];
  if (!question) return;

  state.answered[playerIndex] = true;
  state.chosenAnswer[playerIndex] = chosenLabel;

  const correct = question.answer === chosenLabel;
  if (correct) {
    state.score[playerIndex] += 1;
    state.progress[playerIndex] += 1;
    elements.score[playerIndex].textContent = state.score[playerIndex];
    moveCar(playerIndex, state.progress[playerIndex]);
    setMessage(`Pemain ${playerIndex + 1} benar! Mobil maju.`, 'success');
  } else {
    setMessage(`Pemain ${playerIndex + 1} salah.`, 'error');
  }

  renderPlayers();

  if (state.score[playerIndex] >= POINTS_TO_WIN) {
    state.active = false;
    showWinner(playerIndex);
    return;
  }

  setTimeout(() => {
    if (!state.active) return;
    nextQuestion(playerIndex);
  }, 1200);
}

function clearConfetti() {
  elements.confettiContainer.innerHTML = '';
}

function createConfettiPiece(color, left) {
  const confetti = document.createElement('div');
  confetti.className = 'confetti-piece';
  confetti.style.background = color;
  confetti.style.left = `${left}%`;
  confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
  return confetti;
}

function launchConfetti() {
  clearConfetti();
  const colors = ['#f97316', '#22c55e', '#38bdf8', '#f43f5e', '#facc15', '#a855f7'];
  for (let i = 0; i < 30; i += 1) {
    const left = Math.random() * 100;
    const confetti = createConfettiPiece(colors[i % colors.length], left);
    elements.confettiContainer.appendChild(confetti);
    const delay = Math.random() * 0.5;
    confetti.style.animationDelay = `${delay}s`;
  }
}

function showWinner(playerIndex) {
  elements.winnerText.textContent = `Pemenangnya: Pemain ${playerIndex + 1}!`;
  elements.popup.classList.remove('hidden');
  launchConfetti();
}

function closeWinnerPopup() {
  elements.popup.classList.add('hidden');
  clearConfetti();
  window.location.href = 'index.html';
}

function initGame() {
  const loaded = loadGameData();
  if (!loaded) {
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1200);
    return;
  }

  state.active = true;
  elements.resetButton.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
  elements.closePopup.addEventListener('click', closeWinnerPopup);
  window.addEventListener('keydown', handleKeyboardAnswer);
  renderPlayers();
  setMessage('Game dimulai! Jawab soal untuk memajukan mobil.', 'success');
}

function handleKeyboardAnswer(event) {
  if (event.repeat) return;
  if (['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;

  const mapping = KEYBOARD_MAP[event.code];
  if (!mapping) return;

  if (mapping.player >= state.playerCount) return;
  handleAnswer(mapping.player, mapping.label);
}

initGame();
