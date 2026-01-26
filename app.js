// ============================================
// Rummy Score Keeper - Main Application
// ============================================

// --- State ---
let currentPage = 'home';
let expandedPlayerId = null;
let longPressTimer = null;

// --- Default Settings ---
const DEFAULT_SETTINGS = {
  dropScore: 25,
  middleDropScore: 50,
  maxScorePerGame: 80,
  maxGameScore: 101
};

// --- Storage Keys ---
const STORAGE_KEYS = {
  settings: 'rummy_settings',
  players: 'rummy_players',
  activeGame: 'rummy_active_game',
  gameHistory: 'rummy_game_history'
};

// --- Storage Migration (from old "match" keys to new "game" keys) ---
function migrateStorage() {
  // Migrate active game
  const oldActiveGame = localStorage.getItem('rummy_active_match');
  if (oldActiveGame && !localStorage.getItem(STORAGE_KEYS.activeGame)) {
    const data = JSON.parse(oldActiveGame);
    // Migrate maxMatchScore to maxGameScore in settings
    if (data.settings && data.settings.maxMatchScore !== undefined) {
      data.settings.maxGameScore = data.settings.maxMatchScore;
      delete data.settings.maxMatchScore;
    }
    localStorage.setItem(STORAGE_KEYS.activeGame, JSON.stringify(data));
    localStorage.removeItem('rummy_active_match');
  }

  // Migrate game history
  const oldHistory = localStorage.getItem('rummy_match_history');
  if (oldHistory && !localStorage.getItem(STORAGE_KEYS.gameHistory)) {
    const history = JSON.parse(oldHistory);
    // Migrate maxMatchScore to maxGameScore in each game's settings
    history.forEach(game => {
      if (game.settings && game.settings.maxMatchScore !== undefined) {
        game.settings.maxGameScore = game.settings.maxMatchScore;
        delete game.settings.maxMatchScore;
      }
    });
    localStorage.setItem(STORAGE_KEYS.gameHistory, JSON.stringify(history));
    localStorage.removeItem('rummy_match_history');
  }

  // Migrate settings
  const settings = localStorage.getItem(STORAGE_KEYS.settings);
  if (settings) {
    const data = JSON.parse(settings);
    if (data.maxMatchScore !== undefined) {
      data.maxGameScore = data.maxMatchScore;
      delete data.maxMatchScore;
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(data));
    }
  }
}

// --- Storage Helpers ---
function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function load(key, defaultValue = null) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
}

// --- Data Access ---
function getSettings() {
  return load(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
}

function saveSettings(settings) {
  save(STORAGE_KEYS.settings, settings);
}

function getPlayers() {
  return load(STORAGE_KEYS.players, []);
}

function savePlayers(players) {
  save(STORAGE_KEYS.players, players);
}

function getActiveGame() {
  return load(STORAGE_KEYS.activeGame, null);
}

function saveActiveGame(game) {
  save(STORAGE_KEYS.activeGame, game);
}

function clearActiveGame() {
  localStorage.removeItem(STORAGE_KEYS.activeGame);
}

function getGameHistory() {
  return load(STORAGE_KEYS.gameHistory, []);
}

function saveGameHistory(history) {
  save(STORAGE_KEYS.gameHistory, history);
}

// --- ID Generator ---
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// --- Navigation ---
function navigateTo(page) {
  currentPage = page;

  // Update nav buttons
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });

  // Update page title
  const titles = {
    home: 'Rummy Score',
    game: 'Game',
    history: 'History',
    settings: 'Settings'
  };
  document.getElementById('page-title').textContent = titles[page] || 'Rummy Score';

  // Render page
  renderPage(page);
}

function renderPage(page) {
  const content = document.getElementById('main-content');

  switch (page) {
    case 'home':
      renderHomePage(content);
      break;
    case 'game':
      renderGamePage(content);
      break;
    case 'history':
      renderHistoryPage(content);
      break;
    case 'settings':
      renderSettingsPage(content);
      break;
  }
}

// --- Home Page ---
function renderHomePage(container) {
  const activeGame = getActiveGame();

  if (activeGame) {
    // Show active game summary
    const playerNames = activeGame.players.map(p => p.name).join(', ');
    const activePlayers = activeGame.players.filter(p => !p.isOut).length;
    const roundCount = activeGame.rounds.length;

    container.innerHTML = `
      <div class="page">
        <div class="game-summary">
          <div class="game-summary-title">Game in Progress</div>
          <div class="game-summary-players">${playerNames}</div>
          <div class="game-summary-stats">
            <div class="game-summary-stat">
              <div class="game-summary-stat-value">${roundCount}</div>
              <div class="game-summary-stat-label">Rounds</div>
            </div>
            <div class="game-summary-stat">
              <div class="game-summary-stat-value">${activePlayers}</div>
              <div class="game-summary-stat-label">Active</div>
            </div>
          </div>
          <button class="btn btn-continue" onclick="navigateTo('game')">Continue Game</button>
        </div>
      </div>
    `;
  } else {
    // Show start new game
    container.innerHTML = `
      <div class="page">
        <div class="home-hero">
          <h2 class="home-hero-title">Rummy Score Keeper</h2>
          <p class="home-hero-subtitle">Track your 13-card Rummy games</p>
          <button class="btn btn-primary btn-large btn-full" onclick="showNewGameSetup()">
            Start New Game
          </button>
        </div>
      </div>
    `;
  }
}

// --- Game Page ---
function renderGamePage(container) {
  const activeGame = getActiveGame();

  if (!activeGame) {
    container.innerHTML = `
      <div class="page">
        <div class="empty-state">
          <div class="empty-state-text">No active game</div>
          <button class="btn btn-primary" onclick="showNewGameSetup()">Start New Game</button>
        </div>
      </div>
    `;
    return;
  }

  renderScoreboard(container, activeGame);
}

function renderScoreboard(container, game) {
  // Sort players by score (lowest first = winning)
  const sortedPlayers = [...game.players].sort((a, b) => a.totalScore - b.totalScore);

  let playersHtml = sortedPlayers.map((player, index) => {
    const rank = index + 1;
    const isOut = player.isOut;
    const margin = game.settings.maxGameScore - player.totalScore;
    const isWarning = !isOut && margin <= game.settings.dropScore;
    const isExpanded = expandedPlayerId === player.id;

    let statusClass = '';
    if (isOut) statusClass = 'player-out';
    else if (isWarning) statusClass = 'player-warning';

    // Build round history for this player
    let roundsHtml = '';
    const reentryRounds = player.reentryRounds || [];
    if (isExpanded && game.rounds.length > 0) {
      roundsHtml = `
        <div class="player-rounds">
          ${game.rounds.map((round, i) => {
            const score = round.scores[player.id];
            if (score === undefined) return '';
            const isReentry = reentryRounds.includes(round.roundNumber);
            let scoreClass = score === 0 ? 'round-win' : '';
            if (isReentry) scoreClass = 'round-reentry';
            return `
              <div class="round-row ${isReentry ? 'reentry-row' : ''}"
                   onmousedown="startLongPress(${i}, '${player.id}')"
                   onmouseup="cancelLongPress()"
                   onmouseleave="cancelLongPress()"
                   ontouchstart="startLongPress(${i}, '${player.id}')"
                   ontouchend="cancelLongPress()">
                <span class="round-num">R${round.roundNumber}</span>
                <span class="round-score ${scoreClass}">${score}</span>
                ${isReentry ? '<span class="reentry-badge">RE</span>' : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    return `
      <div class="player-card ${statusClass} ${isExpanded ? 'expanded' : ''}"
           data-player-id="${player.id}"
           onclick="togglePlayerExpand('${player.id}')">
        <div class="player-card-main">
          <div class="player-rank">${isOut ? 'OUT' : rank}</div>
          <div class="player-info">
            <div class="player-name">${player.name}</div>
            ${!isOut ? `<div class="player-margin">${margin} left</div>` : ''}
          </div>
          <div class="player-score">${player.totalScore}</div>
          <div class="expand-icon">${isExpanded ? '▲' : '▼'}</div>
        </div>
        ${roundsHtml}
      </div>
    `;
  }).join('');

  const activePlayers = game.players.filter(p => !p.isOut);
  const isGameOver = activePlayers.length <= 1;

  container.innerHTML = `
    <div class="page">
      <div class="section-header">Round ${game.rounds.length + 1}</div>
      <div class="players-list">
        ${playersHtml}
      </div>
      ${isGameOver ? `
        <div class="game-over">
          <h3>Game Complete!</h3>
          <p>${activePlayers[0]?.name || 'No one'} wins!</p>
          <button class="btn btn-primary btn-full mt-16" onclick="endGame()">End Game</button>
        </div>
      ` : `
        <button class="btn btn-primary btn-full btn-large mt-16" onclick="showScoreEntry()">
          Add Round Scores
        </button>
        <button class="btn btn-secondary btn-full mt-16" onclick="abandonGame()">
          End Game Early
        </button>
      `}
    </div>
  `;
}

function togglePlayerExpand(playerId) {
  expandedPlayerId = expandedPlayerId === playerId ? null : playerId;
  const game = getActiveGame();
  if (game) {
    renderScoreboard(document.getElementById('main-content'), game);
  }
}

function startLongPress(roundIndex, playerId) {
  longPressTimer = setTimeout(() => {
    haptic();
    editRoundScore(roundIndex, playerId);
  }, 500);
}

function cancelLongPress() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

async function editRoundScore(roundIndex, playerId) {
  const game = getActiveGame();
  if (!game) return;

  const round = game.rounds[roundIndex];
  const player = game.players.find(p => p.id === playerId);
  if (!round || !player) return;

  const currentScore = round.scores[playerId];
  const newScore = await showNumberPrompt(
    'Edit Score',
    `${player.name}'s score for Round ${round.roundNumber}:`,
    currentScore.toString()
  );

  if (newScore === null) return; // Cancelled

  const parsed = parseInt(newScore);
  if (isNaN(parsed) || parsed < 0) {
    showToast('Please enter a valid score', 'error');
    return;
  }

  if (parsed > game.settings.maxScorePerGame) {
    showToast(`Score cannot exceed ${game.settings.maxScorePerGame}`, 'error');
    return;
  }

  // Update the round score
  const oldScore = round.scores[playerId];
  round.scores[playerId] = parsed;

  // Recalculate player's total
  player.totalScore = player.totalScore - oldScore + parsed;

  // Check if player status changed
  if (player.totalScore >= game.settings.maxGameScore && !player.isOut) {
    player.isOut = true;
    checkReentry(game, player);
  } else if (player.totalScore < game.settings.maxGameScore && player.isOut) {
    // Player came back under the limit due to edit
    player.isOut = false;
  }

  saveActiveGame(game);
  showToast('Score updated', 'success');
  renderScoreboard(document.getElementById('main-content'), game);
}

// --- History Page ---
function renderHistoryPage(container) {
  const history = getGameHistory();

  if (history.length === 0) {
    container.innerHTML = `
      <div class="page">
        <div class="empty-state">
          <div class="empty-state-text">No game history yet</div>
        </div>
      </div>
    `;
    return;
  }

  const historyHtml = history.map((game, index) => {
    const date = new Date(game.completedAt).toLocaleDateString();
    const playerNames = game.players.map(p => p.name).join(', ');

    return `
      <div class="card history-card" onclick="showGameDetails(${index})">
        <div class="list-item-title">${game.winner?.name || 'Unknown'} won</div>
        <div class="list-item-subtitle">${playerNames}</div>
        <div class="list-item-subtitle">${date} · ${game.rounds.length} rounds</div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="page">
      <div class="section-header">Past Games</div>
      ${historyHtml}
      ${history.length > 0 ? `
        <button class="btn btn-danger btn-full mt-16" onclick="clearHistory()">Clear All History</button>
      ` : ''}
    </div>
  `;
}

function showGameDetails(gameIndex) {
  const history = getGameHistory();
  const game = history[gameIndex];
  if (!game) return;

  const container = document.getElementById('main-content');
  const date = new Date(game.completedAt).toLocaleDateString();

  // Sort players by final score
  const sortedPlayers = [...game.players].sort((a, b) => a.totalScore - b.totalScore);

  // Build scorecard table
  let tableHtml = `
    <div class="scorecard">
      <div class="scorecard-header">
        <div class="scorecard-cell scorecard-round">Round</div>
        ${sortedPlayers.map(p => `<div class="scorecard-cell">${p.name}</div>`).join('')}
      </div>
      ${game.rounds.map(round => `
        <div class="scorecard-row">
          <div class="scorecard-cell scorecard-round">${round.roundNumber}</div>
          ${sortedPlayers.map(p => {
            const score = round.scores[p.id];
            const reentryRounds = p.reentryRounds || [];
            const isReentry = reentryRounds.includes(round.roundNumber);
            let cellClass = score === 0 ? 'score-win' : '';
            if (isReentry) cellClass = 'score-reentry';
            return `<div class="scorecard-cell ${cellClass}">${score !== undefined ? score : '-'}${isReentry ? ' ↩' : ''}</div>`;
          }).join('')}
        </div>
      `).join('')}
      <div class="scorecard-row scorecard-total">
        <div class="scorecard-cell scorecard-round">Total</div>
        ${sortedPlayers.map(p => `<div class="scorecard-cell">${p.totalScore}</div>`).join('')}
      </div>
    </div>
  `;

  container.innerHTML = `
    <div class="page">
      <div class="game-detail-header">
        <h2>${game.winner?.name || 'Unknown'} Won!</h2>
        <p class="text-muted">${date} · ${game.rounds.length} rounds</p>
      </div>
      ${tableHtml}
      <button class="btn btn-secondary btn-full mt-16" onclick="renderHistoryPage(document.getElementById('main-content'))">Back to History</button>
      <button class="btn btn-danger btn-full mt-16" onclick="deleteGame(${gameIndex})">Delete This Game</button>
    </div>
  `;
}

function deleteGame(gameIndex) {
  const history = getGameHistory();
  history.splice(gameIndex, 1);
  saveGameHistory(history);
  haptic();
  showToast('Game deleted', 'success');
  renderHistoryPage(document.getElementById('main-content'));
}

async function clearHistory() {
  const confirmed = await showConfirm(
    'Clear History',
    'Are you sure you want to delete all game history? This cannot be undone.',
    'Delete All',
    true
  );
  if (confirmed) {
    saveGameHistory([]);
    haptic();
    showToast('History cleared', 'success');
    renderHistoryPage(document.getElementById('main-content'));
  }
}

// --- Settings Page ---
function renderSettingsPage(container) {
  const settings = getSettings();
  const players = getPlayers();

  const playersHtml = players.length === 0
    ? '<div class="text-muted">No players added yet</div>'
    : players.map(player => `
        <div class="list-item">
          <div class="list-item-content" onclick="showPlayerStats('${player.id}')">
            <div class="list-item-title">${player.name}</div>
            <div class="list-item-subtitle">Tap for stats</div>
          </div>
          <div class="list-item-actions">
            <button class="icon-btn" onclick="event.stopPropagation(); editPlayer('${player.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="icon-btn" onclick="event.stopPropagation(); deletePlayer('${player.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `).join('');

  container.innerHTML = `
    <div class="page">
      <div class="section-header">Game Defaults</div>
      <div class="card">
        <div class="input-group">
          <label class="input-label">Drop Score</label>
          <input type="number" class="input" id="setting-drop" value="${settings.dropScore}">
        </div>
        <div class="input-group">
          <label class="input-label">Middle Drop Score</label>
          <input type="number" class="input" id="setting-middle-drop" value="${settings.middleDropScore}">
        </div>
        <div class="input-group">
          <label class="input-label">Max Score Per Round</label>
          <input type="number" class="input" id="setting-max-round" value="${settings.maxScorePerGame}">
        </div>
        <div class="input-group">
          <label class="input-label">Max Game Score (Out)</label>
          <input type="number" class="input" id="setting-max-game" value="${settings.maxGameScore}">
        </div>
        <button class="btn btn-primary btn-full" onclick="saveSettingsFromForm()">Save Settings</button>
      </div>

      <div class="section-header">Players</div>
      <div class="players-section">
        ${playersHtml}
        <button class="btn btn-secondary btn-full mt-16" onclick="showAddPlayer()">Add Player</button>
      </div>
    </div>
  `;
}

function saveSettingsFromForm() {
  const settings = {
    dropScore: parseInt(document.getElementById('setting-drop').value) || 25,
    middleDropScore: parseInt(document.getElementById('setting-middle-drop').value) || 50,
    maxScorePerGame: parseInt(document.getElementById('setting-max-round').value) || 80,
    maxGameScore: parseInt(document.getElementById('setting-max-game').value) || 101
  };
  saveSettings(settings);
  haptic();
  showToast('Settings saved', 'success');
  renderSettingsPage(document.getElementById('main-content'));
}

// --- Player Management ---
async function showAddPlayer() {
  const name = await showPrompt('Add Player', 'Enter player name:', '', 'Player name');
  if (name && name.trim()) {
    const players = getPlayers();
    players.push({
      id: generateId(),
      name: name.trim(),
      createdAt: Date.now()
    });
    savePlayers(players);
    showToast('Player added', 'success');
    renderSettingsPage(document.getElementById('main-content'));
  }
}

function showPlayerStats(playerId) {
  const players = getPlayers();
  const player = players.find(p => p.id === playerId);
  if (!player) return;

  const history = getGameHistory();

  // Calculate stats
  let gamesPlayed = 0;
  let wins = 0;
  let totalFinalScore = 0;
  let drops = 0;
  let middleDrops = 0;
  let reentries = 0;

  history.forEach(game => {
    const gamePlayer = game.players.find(p => p.id === playerId);
    if (!gamePlayer) return;

    gamesPlayed++;
    totalFinalScore += gamePlayer.totalScore;

    if (game.winner?.id === playerId) {
      wins++;
    }

    // Count re-entries
    if (gamePlayer.reentryRounds) {
      reentries += gamePlayer.reentryRounds.length;
    }

    // Count drops in this game
    game.rounds.forEach(round => {
      const score = round.scores[playerId];
      if (score === game.settings.dropScore) drops++;
      if (score === game.settings.middleDropScore) middleDrops++;
    });
  });

  const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
  const avgScore = gamesPlayed > 0 ? Math.round(totalFinalScore / gamesPlayed) : 0;

  const container = document.getElementById('main-content');
  container.innerHTML = `
    <div class="page">
      <div class="stats-header">
        <h2>${player.name}</h2>
        <p class="text-muted">Player Statistics</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${gamesPlayed}</div>
          <div class="stat-label">Games Played</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${wins}</div>
          <div class="stat-label">Wins</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${winRate}%</div>
          <div class="stat-label">Win Rate</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${avgScore}</div>
          <div class="stat-label">Avg Score</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${drops}</div>
          <div class="stat-label">Drops</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${middleDrops}</div>
          <div class="stat-label">Middle Drops</div>
        </div>
        <div class="stat-card">
          <div class="stat-value stat-reentry">${reentries}</div>
          <div class="stat-label">Re-entries</div>
        </div>
      </div>

      <button class="btn btn-secondary btn-full mt-16" onclick="renderSettingsPage(document.getElementById('main-content'))">Back to Settings</button>
    </div>
  `;
}

async function editPlayer(playerId) {
  const players = getPlayers();
  const player = players.find(p => p.id === playerId);
  if (!player) return;

  const newName = await showPrompt('Edit Player', 'Player name:', player.name);
  if (newName && newName.trim()) {
    player.name = newName.trim();
    savePlayers(players);
    showToast('Player updated', 'success');
    renderSettingsPage(document.getElementById('main-content'));
  }
}

function deletePlayer(playerId) {
  const players = getPlayers();
  const index = players.findIndex(p => p.id === playerId);
  if (index !== -1) {
    players.splice(index, 1);
    savePlayers(players);
    showToast('Player deleted', 'success');
    renderSettingsPage(document.getElementById('main-content'));
  }
}

// --- New Game Setup ---
async function showNewGameSetup() {
  const activeGame = getActiveGame();
  if (activeGame) {
    showToast('Please end the current game first', 'error');
    navigateTo('game');
    return;
  }

  const players = getPlayers();
  const settings = getSettings();

  if (players.length < 2) {
    showToast('Add at least 2 players in Settings first', 'error');
    navigateTo('settings');
    return;
  }

  const container = document.getElementById('main-content');

  const playersHtml = players.map(player => `
    <label class="player-checkbox">
      <input type="checkbox" value="${player.id}" class="player-select-cb">
      <span class="player-checkbox-name">${player.name}</span>
    </label>
  `).join('');

  container.innerHTML = `
    <div class="page">
      <div class="section-header">Select Players</div>
      <div class="card">
        <div class="player-checkboxes">
          ${playersHtml}
        </div>
      </div>

      <div class="section-header">Game Settings</div>
      <div class="card">
        <div class="input-group">
          <label class="input-label">Drop Score</label>
          <input type="number" class="input" id="game-drop" value="${settings.dropScore}">
        </div>
        <div class="input-group">
          <label class="input-label">Middle Drop Score</label>
          <input type="number" class="input" id="game-middle-drop" value="${settings.middleDropScore}">
        </div>
        <div class="input-group">
          <label class="input-label">Max Score Per Round</label>
          <input type="number" class="input" id="game-max-round" value="${settings.maxScorePerGame}">
        </div>
        <div class="input-group">
          <label class="input-label">Max Game Score</label>
          <input type="number" class="input" id="game-max-score" value="${settings.maxGameScore}">
        </div>
      </div>

      <button class="btn btn-primary btn-full btn-large" onclick="startGame()">Start Game</button>
      <button class="btn btn-secondary btn-full mt-16" onclick="navigateTo('home')">Cancel</button>
    </div>
  `;
}

function startGame() {
  const checkboxes = document.querySelectorAll('.player-select-cb:checked');
  const selectedIds = Array.from(checkboxes).map(cb => cb.value);

  if (selectedIds.length < 2) {
    showToast('Select at least 2 players', 'error');
    return;
  }

  const allPlayers = getPlayers();
  const gamePlayers = selectedIds.map(id => {
    const player = allPlayers.find(p => p.id === id);
    return {
      id: player.id,
      name: player.name,
      totalScore: 0,
      isOut: false,
      canReenter: true,
      reentryRounds: []
    };
  });

  const game = {
    id: generateId(),
    players: gamePlayers,
    settings: {
      dropScore: parseInt(document.getElementById('game-drop').value) || 25,
      middleDropScore: parseInt(document.getElementById('game-middle-drop').value) || 50,
      maxScorePerGame: parseInt(document.getElementById('game-max-round').value) || 80,
      maxGameScore: parseInt(document.getElementById('game-max-score').value) || 101
    },
    rounds: [],
    status: 'active',
    createdAt: Date.now()
  };

  saveActiveGame(game);
  haptic();
  showToast('Game started!', 'success');
  navigateTo('game');
}

// --- Score Entry ---
function showScoreEntry() {
  const game = getActiveGame();
  if (!game) return;

  const container = document.getElementById('main-content');
  const activePlayers = game.players.filter(p => !p.isOut);

  const playersHtml = activePlayers.map(player => {
    const margin = game.settings.maxGameScore - player.totalScore;
    const canDrop = margin > game.settings.dropScore;
    const canMiddleDrop = margin > game.settings.middleDropScore;

    return `
      <div class="score-entry-player" data-player-id="${player.id}">
        <div class="score-entry-header">
          <span class="score-entry-name">${player.name}</span>
          <span class="score-entry-total">(${player.totalScore})</span>
        </div>
        <div class="score-entry-buttons">
          <button class="btn-score btn-winner" onclick="setScore('${player.id}', 0)">Win (0)</button>
          ${canDrop ? `<button class="btn-score btn-drop" onclick="setScore('${player.id}', ${game.settings.dropScore})">Drop</button>` : ''}
          ${canMiddleDrop ? `<button class="btn-score btn-mdrop" onclick="setScore('${player.id}', ${game.settings.middleDropScore})">M-Drop</button>` : ''}
        </div>
        <input type="number" class="input score-input" id="score-${player.id}"
               placeholder="Enter score" min="0" max="${game.settings.maxScorePerGame}">
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="page">
      <div class="section-header">Round ${game.rounds.length + 1} Scores</div>
      <div class="score-entry-list">
        ${playersHtml}
      </div>
      <button class="btn btn-primary btn-full btn-large mt-16" onclick="submitScores()">Submit Scores</button>
      <button class="btn btn-secondary btn-full mt-16" onclick="renderGamePage(document.getElementById('main-content'))">Cancel</button>
    </div>
  `;
}

function setScore(playerId, score) {
  document.getElementById(`score-${playerId}`).value = score;
  haptic();
}

async function submitScores() {
  const game = getActiveGame();
  if (!game) return;

  const activePlayers = game.players.filter(p => !p.isOut);
  const scores = {};
  let hasWinner = false;

  for (const player of activePlayers) {
    const input = document.getElementById(`score-${player.id}`);
    const score = parseInt(input.value);

    if (isNaN(score) || score < 0) {
      showToast(`Enter a valid score for ${player.name}`, 'error');
      return;
    }

    if (score > game.settings.maxScorePerGame) {
      showToast(`${player.name}'s score cannot exceed ${game.settings.maxScorePerGame}`, 'error');
      return;
    }

    if (score === 0) hasWinner = true;
    scores[player.id] = score;
  }

  if (!hasWinner) {
    showToast('One player must have score 0 (round winner)', 'error');
    return;
  }

  // Add round
  game.rounds.push({
    roundNumber: game.rounds.length + 1,
    scores: scores,
    timestamp: Date.now()
  });

  // Update totals and check for out players
  for (const player of game.players) {
    if (scores[player.id] !== undefined) {
      player.totalScore += scores[player.id];

      if (player.totalScore >= game.settings.maxGameScore) {
        player.isOut = true;
        // Check for re-entry eligibility
        await checkReentry(game, player);
      }
    }
  }

  saveActiveGame(game);
  haptic();
  showToast('Round saved', 'success');
  navigateTo('game');
}

async function checkReentry(game, outPlayer) {
  const activePlayers = game.players.filter(p => !p.isOut && p.id !== outPlayer.id);
  if (activePlayers.length === 0) return;

  // Find next highest score among active players
  const sortedActive = activePlayers.sort((a, b) => b.totalScore - a.totalScore);
  const nextHighest = sortedActive[0];

  const margin = game.settings.maxGameScore - nextHighest.totalScore;
  const canReenter = margin > game.settings.dropScore;

  if (canReenter && outPlayer.canReenter) {
    const reenter = await showConfirm(
      `${outPlayer.name} is Out!`,
      `Re-entry available. Take ${nextHighest.name}'s score (${nextHighest.totalScore})?`,
      'Re-enter'
    );
    if (reenter) {
      outPlayer.totalScore = nextHighest.totalScore;
      outPlayer.isOut = false;
      outPlayer.canReenter = false; // Only one re-entry allowed
      // Track which round this re-entry happened
      outPlayer.reentryRounds = outPlayer.reentryRounds || [];
      outPlayer.reentryRounds.push(game.rounds.length); // Current round number
      saveActiveGame(game);
      showToast(`${outPlayer.name} re-entered`, 'success');
    }
  }
}

function endGame() {
  const game = getActiveGame();
  if (!game) return;

  const activePlayers = game.players.filter(p => !p.isOut);
  game.winner = activePlayers[0] || null;
  game.status = 'completed';
  game.completedAt = Date.now();

  // Save to history
  const history = getGameHistory();
  history.unshift(game);
  saveGameHistory(history);

  // Clear active game
  clearActiveGame();
  haptic();
  navigateTo('home');
}

async function abandonGame() {
  const confirmed = await showConfirm(
    'End Game Early?',
    'Current standings will be saved to history.',
    'End Game',
    true
  );

  if (!confirmed) return;

  const game = getActiveGame();
  if (!game) return;

  // Winner is player with lowest score
  const sortedPlayers = [...game.players].sort((a, b) => a.totalScore - b.totalScore);
  game.winner = sortedPlayers[0] || null;
  game.status = 'abandoned';
  game.completedAt = Date.now();

  // Save to history
  const history = getGameHistory();
  history.unshift(game);
  saveGameHistory(history);

  // Clear active game
  clearActiveGame();
  haptic();
  showToast('Game ended', 'success');
  navigateTo('home');
}

// --- Haptic Feedback ---
function haptic() {
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }
}

// --- Toast Notifications ---
function showToast(message, type = 'default', duration = 2500) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

// --- Modal System ---
let modalResolve = null;

function showModal(title, body, buttons, inputConfig = null) {
  return new Promise(resolve => {
    modalResolve = resolve;

    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const actionsEl = document.getElementById('modal-actions');

    titleEl.textContent = title;

    if (inputConfig) {
      bodyEl.innerHTML = `
        <div>${body}</div>
        <input type="${inputConfig.type || 'text'}" class="input" id="modal-input"
               value="${inputConfig.value || ''}" placeholder="${inputConfig.placeholder || ''}">
      `;
    } else {
      bodyEl.textContent = body;
    }

    actionsEl.innerHTML = buttons.map((btn, i) => `
      <button class="btn ${btn.danger ? 'btn-danger-text' : ''}" onclick="closeModal(${i})">${btn.label}</button>
    `).join('');

    overlay.classList.remove('hidden');

    // Focus input if present
    if (inputConfig) {
      setTimeout(() => {
        const input = document.getElementById('modal-input');
        input.focus();
        input.select();
      }, 100);
    }
  });
}

function closeModal(buttonIndex) {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('hidden');

  const input = document.getElementById('modal-input');
  const inputValue = input ? input.value : null;

  if (modalResolve) {
    modalResolve({ buttonIndex, inputValue });
    modalResolve = null;
  }
}

// Convenience wrappers
async function showAlert(title, message) {
  await showModal(title, message, [{ label: 'OK' }]);
}

async function showConfirm(title, message, confirmLabel = 'Confirm', isDanger = false) {
  const result = await showModal(title, message, [
    { label: 'Cancel' },
    { label: confirmLabel, danger: isDanger }
  ]);
  return result.buttonIndex === 1;
}

async function showPrompt(title, message, defaultValue = '', placeholder = '') {
  const result = await showModal(title, message, [
    { label: 'Cancel' },
    { label: 'OK' }
  ], { value: defaultValue, placeholder, type: 'text' });

  return result.buttonIndex === 1 ? result.inputValue : null;
}

async function showNumberPrompt(title, message, defaultValue = '', placeholder = '') {
  const result = await showModal(title, message, [
    { label: 'Cancel' },
    { label: 'OK' }
  ], { value: defaultValue, placeholder, type: 'number' });

  return result.buttonIndex === 1 ? result.inputValue : null;
}

// --- Initialize ---
function init() {
  // Run storage migration first
  migrateStorage();

  // Set up navigation
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });

  // Check for active game and navigate accordingly
  const activeGame = getActiveGame();
  if (activeGame) {
    navigateTo('game');
  } else {
    navigateTo('home');
  }
}

// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
