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
  maxMatchScore: 101
};

// --- Storage Keys ---
const STORAGE_KEYS = {
  settings: 'rummy_settings',
  players: 'rummy_players',
  activeMatch: 'rummy_active_match',
  matchHistory: 'rummy_match_history'
};

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

function getActiveMatch() {
  return load(STORAGE_KEYS.activeMatch, null);
}

function saveActiveMatch(match) {
  save(STORAGE_KEYS.activeMatch, match);
}

function clearActiveMatch() {
  localStorage.removeItem(STORAGE_KEYS.activeMatch);
}

function getMatchHistory() {
  return load(STORAGE_KEYS.matchHistory, []);
}

function saveMatchHistory(history) {
  save(STORAGE_KEYS.matchHistory, history);
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
    match: 'Match',
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
    case 'match':
      renderMatchPage(content);
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
  const activeMatch = getActiveMatch();

  if (activeMatch) {
    // Show active match summary
    const playerNames = activeMatch.players.map(p => p.name).join(', ');
    const activePlayers = activeMatch.players.filter(p => !p.isOut).length;
    const roundCount = activeMatch.rounds.length;

    container.innerHTML = `
      <div class="page">
        <div class="match-summary">
          <div class="match-summary-title">Match in Progress</div>
          <div class="match-summary-players">${playerNames}</div>
          <div class="match-summary-stats">
            <div class="match-summary-stat">
              <div class="match-summary-stat-value">${roundCount}</div>
              <div class="match-summary-stat-label">Rounds</div>
            </div>
            <div class="match-summary-stat">
              <div class="match-summary-stat-value">${activePlayers}</div>
              <div class="match-summary-stat-label">Active</div>
            </div>
          </div>
          <button class="btn btn-continue" onclick="navigateTo('match')">Continue Match</button>
        </div>
      </div>
    `;
  } else {
    // Show start new match
    container.innerHTML = `
      <div class="page">
        <div class="home-hero">
          <h2 class="home-hero-title">Rummy Score Keeper</h2>
          <p class="home-hero-subtitle">Track your 13-card Rummy games</p>
          <button class="btn btn-primary btn-large btn-full" onclick="showNewMatchSetup()">
            Start New Match
          </button>
        </div>
      </div>
    `;
  }
}

// --- Match Page ---
function renderMatchPage(container) {
  const activeMatch = getActiveMatch();

  if (!activeMatch) {
    container.innerHTML = `
      <div class="page">
        <div class="empty-state">
          <div class="empty-state-text">No active match</div>
          <button class="btn btn-primary" onclick="showNewMatchSetup()">Start New Match</button>
        </div>
      </div>
    `;
    return;
  }

  renderScoreboard(container, activeMatch);
}

function renderScoreboard(container, match) {
  // Sort players by score (lowest first = winning)
  const sortedPlayers = [...match.players].sort((a, b) => a.totalScore - b.totalScore);

  let playersHtml = sortedPlayers.map((player, index) => {
    const rank = index + 1;
    const isOut = player.isOut;
    const margin = match.settings.maxMatchScore - player.totalScore;
    const isWarning = !isOut && margin <= match.settings.dropScore;
    const isExpanded = expandedPlayerId === player.id;

    let statusClass = '';
    if (isOut) statusClass = 'player-out';
    else if (isWarning) statusClass = 'player-warning';

    // Build round history for this player
    let roundsHtml = '';
    const reentryRounds = player.reentryRounds || [];
    if (isExpanded && match.rounds.length > 0) {
      roundsHtml = `
        <div class="player-rounds">
          ${match.rounds.map((round, i) => {
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

  const activePlayers = match.players.filter(p => !p.isOut);
  const isMatchOver = activePlayers.length <= 1;

  container.innerHTML = `
    <div class="page">
      <div class="section-header">Round ${match.rounds.length + 1}</div>
      <div class="players-list">
        ${playersHtml}
      </div>
      ${isMatchOver ? `
        <div class="match-over">
          <h3>Match Complete!</h3>
          <p>${activePlayers[0]?.name || 'No one'} wins!</p>
          <button class="btn btn-primary btn-full mt-16" onclick="endMatch()">End Match</button>
        </div>
      ` : `
        <button class="btn btn-primary btn-full btn-large mt-16" onclick="showScoreEntry()">
          Add Round Scores
        </button>
        <button class="btn btn-secondary btn-full mt-16" onclick="abandonMatch()">
          End Match Early
        </button>
      `}
    </div>
  `;
}

function togglePlayerExpand(playerId) {
  expandedPlayerId = expandedPlayerId === playerId ? null : playerId;
  const match = getActiveMatch();
  if (match) {
    renderScoreboard(document.getElementById('main-content'), match);
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
  const match = getActiveMatch();
  if (!match) return;

  const round = match.rounds[roundIndex];
  const player = match.players.find(p => p.id === playerId);
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

  if (parsed > match.settings.maxScorePerGame) {
    showToast(`Score cannot exceed ${match.settings.maxScorePerGame}`, 'error');
    return;
  }

  // Update the round score
  const oldScore = round.scores[playerId];
  round.scores[playerId] = parsed;

  // Recalculate player's total
  player.totalScore = player.totalScore - oldScore + parsed;

  // Check if player status changed
  if (player.totalScore >= match.settings.maxMatchScore && !player.isOut) {
    player.isOut = true;
    checkReentry(match, player);
  } else if (player.totalScore < match.settings.maxMatchScore && player.isOut) {
    // Player came back under the limit due to edit
    player.isOut = false;
  }

  saveActiveMatch(match);
  showToast('Score updated', 'success');
  renderScoreboard(document.getElementById('main-content'), match);
}

// --- History Page ---
function renderHistoryPage(container) {
  const history = getMatchHistory();

  if (history.length === 0) {
    container.innerHTML = `
      <div class="page">
        <div class="empty-state">
          <div class="empty-state-text">No match history yet</div>
        </div>
      </div>
    `;
    return;
  }

  const historyHtml = history.map((match, index) => {
    const date = new Date(match.completedAt).toLocaleDateString();
    const playerNames = match.players.map(p => p.name).join(', ');

    return `
      <div class="card history-card" onclick="showMatchDetails(${index})">
        <div class="list-item-title">${match.winner?.name || 'Unknown'} won</div>
        <div class="list-item-subtitle">${playerNames}</div>
        <div class="list-item-subtitle">${date} · ${match.rounds.length} rounds</div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="page">
      <div class="section-header">Past Matches</div>
      ${historyHtml}
      ${history.length > 0 ? `
        <button class="btn btn-danger btn-full mt-16" onclick="clearHistory()">Clear All History</button>
      ` : ''}
    </div>
  `;
}

function showMatchDetails(matchIndex) {
  const history = getMatchHistory();
  const match = history[matchIndex];
  if (!match) return;

  const container = document.getElementById('main-content');
  const date = new Date(match.completedAt).toLocaleDateString();

  // Sort players by final score
  const sortedPlayers = [...match.players].sort((a, b) => a.totalScore - b.totalScore);

  // Build scorecard table
  let tableHtml = `
    <div class="scorecard">
      <div class="scorecard-header">
        <div class="scorecard-cell scorecard-round">Round</div>
        ${sortedPlayers.map(p => `<div class="scorecard-cell">${p.name}</div>`).join('')}
      </div>
      ${match.rounds.map(round => `
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
      <div class="match-detail-header">
        <h2>${match.winner?.name || 'Unknown'} Won!</h2>
        <p class="text-muted">${date} · ${match.rounds.length} rounds</p>
      </div>
      ${tableHtml}
      <button class="btn btn-secondary btn-full mt-16" onclick="renderHistoryPage(document.getElementById('main-content'))">Back to History</button>
      <button class="btn btn-danger btn-full mt-16" onclick="deleteMatch(${matchIndex})">Delete This Match</button>
    </div>
  `;
}

function deleteMatch(matchIndex) {
  const history = getMatchHistory();
  history.splice(matchIndex, 1);
  saveMatchHistory(history);
  haptic();
  showToast('Match deleted', 'success');
  renderHistoryPage(document.getElementById('main-content'));
}

async function clearHistory() {
  const confirmed = await showConfirm(
    'Clear History',
    'Are you sure you want to delete all match history? This cannot be undone.',
    'Delete All',
    true
  );
  if (confirmed) {
    saveMatchHistory([]);
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
          <input type="number" class="input" id="setting-max-game" value="${settings.maxScorePerGame}">
        </div>
        <div class="input-group">
          <label class="input-label">Max Match Score (Out)</label>
          <input type="number" class="input" id="setting-max-match" value="${settings.maxMatchScore}">
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
    maxScorePerGame: parseInt(document.getElementById('setting-max-game').value) || 80,
    maxMatchScore: parseInt(document.getElementById('setting-max-match').value) || 101
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

  const history = getMatchHistory();

  // Calculate stats
  let matchesPlayed = 0;
  let wins = 0;
  let totalFinalScore = 0;
  let drops = 0;
  let middleDrops = 0;
  let reentries = 0;

  history.forEach(match => {
    const matchPlayer = match.players.find(p => p.id === playerId);
    if (!matchPlayer) return;

    matchesPlayed++;
    totalFinalScore += matchPlayer.totalScore;

    if (match.winner?.id === playerId) {
      wins++;
    }

    // Count re-entries
    if (matchPlayer.reentryRounds) {
      reentries += matchPlayer.reentryRounds.length;
    }

    // Count drops in this match
    match.rounds.forEach(round => {
      const score = round.scores[playerId];
      if (score === match.settings.dropScore) drops++;
      if (score === match.settings.middleDropScore) middleDrops++;
    });
  });

  const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;
  const avgScore = matchesPlayed > 0 ? Math.round(totalFinalScore / matchesPlayed) : 0;

  const container = document.getElementById('main-content');
  container.innerHTML = `
    <div class="page">
      <div class="stats-header">
        <h2>${player.name}</h2>
        <p class="text-muted">Player Statistics</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${matchesPlayed}</div>
          <div class="stat-label">Matches Played</div>
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

// --- New Match Setup ---
async function showNewMatchSetup() {
  const activeMatch = getActiveMatch();
  if (activeMatch) {
    showToast('Please end the current match first', 'error');
    navigateTo('match');
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

      <div class="section-header">Match Settings</div>
      <div class="card">
        <div class="input-group">
          <label class="input-label">Drop Score</label>
          <input type="number" class="input" id="match-drop" value="${settings.dropScore}">
        </div>
        <div class="input-group">
          <label class="input-label">Middle Drop Score</label>
          <input type="number" class="input" id="match-middle-drop" value="${settings.middleDropScore}">
        </div>
        <div class="input-group">
          <label class="input-label">Max Score Per Round</label>
          <input type="number" class="input" id="match-max-game" value="${settings.maxScorePerGame}">
        </div>
        <div class="input-group">
          <label class="input-label">Max Match Score</label>
          <input type="number" class="input" id="match-max-match" value="${settings.maxMatchScore}">
        </div>
      </div>

      <button class="btn btn-primary btn-full btn-large" onclick="startMatch()">Start Match</button>
      <button class="btn btn-secondary btn-full mt-16" onclick="navigateTo('home')">Cancel</button>
    </div>
  `;
}

function startMatch() {
  const checkboxes = document.querySelectorAll('.player-select-cb:checked');
  const selectedIds = Array.from(checkboxes).map(cb => cb.value);

  if (selectedIds.length < 2) {
    showToast('Select at least 2 players', 'error');
    return;
  }

  const allPlayers = getPlayers();
  const matchPlayers = selectedIds.map(id => {
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

  const match = {
    id: generateId(),
    players: matchPlayers,
    settings: {
      dropScore: parseInt(document.getElementById('match-drop').value) || 25,
      middleDropScore: parseInt(document.getElementById('match-middle-drop').value) || 50,
      maxScorePerGame: parseInt(document.getElementById('match-max-game').value) || 80,
      maxMatchScore: parseInt(document.getElementById('match-max-match').value) || 101
    },
    rounds: [],
    status: 'active',
    createdAt: Date.now()
  };

  saveActiveMatch(match);
  haptic();
  showToast('Match started!', 'success');
  navigateTo('match');
}

// --- Score Entry ---
function showScoreEntry() {
  const match = getActiveMatch();
  if (!match) return;

  const container = document.getElementById('main-content');
  const activePlayers = match.players.filter(p => !p.isOut);

  const playersHtml = activePlayers.map(player => {
    const margin = match.settings.maxMatchScore - player.totalScore;
    const canDrop = margin > match.settings.dropScore;
    const canMiddleDrop = margin > match.settings.middleDropScore;

    return `
      <div class="score-entry-player" data-player-id="${player.id}">
        <div class="score-entry-header">
          <span class="score-entry-name">${player.name}</span>
          <span class="score-entry-total">(${player.totalScore})</span>
        </div>
        <div class="score-entry-buttons">
          <button class="btn-score btn-winner" onclick="setScore('${player.id}', 0)">Win (0)</button>
          ${canDrop ? `<button class="btn-score btn-drop" onclick="setScore('${player.id}', ${match.settings.dropScore})">Drop</button>` : ''}
          ${canMiddleDrop ? `<button class="btn-score btn-mdrop" onclick="setScore('${player.id}', ${match.settings.middleDropScore})">M-Drop</button>` : ''}
        </div>
        <input type="number" class="input score-input" id="score-${player.id}"
               placeholder="Enter score" min="0" max="${match.settings.maxScorePerGame}">
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="page">
      <div class="section-header">Round ${match.rounds.length + 1} Scores</div>
      <div class="score-entry-list">
        ${playersHtml}
      </div>
      <button class="btn btn-primary btn-full btn-large mt-16" onclick="submitScores()">Submit Scores</button>
      <button class="btn btn-secondary btn-full mt-16" onclick="renderMatchPage(document.getElementById('main-content'))">Cancel</button>
    </div>
  `;
}

function setScore(playerId, score) {
  document.getElementById(`score-${playerId}`).value = score;
  haptic();
}

async function submitScores() {
  const match = getActiveMatch();
  if (!match) return;

  const activePlayers = match.players.filter(p => !p.isOut);
  const scores = {};
  let hasWinner = false;

  for (const player of activePlayers) {
    const input = document.getElementById(`score-${player.id}`);
    const score = parseInt(input.value);

    if (isNaN(score) || score < 0) {
      showToast(`Enter a valid score for ${player.name}`, 'error');
      return;
    }

    if (score > match.settings.maxScorePerGame) {
      showToast(`${player.name}'s score cannot exceed ${match.settings.maxScorePerGame}`, 'error');
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
  match.rounds.push({
    roundNumber: match.rounds.length + 1,
    scores: scores,
    timestamp: Date.now()
  });

  // Update totals and check for out players
  for (const player of match.players) {
    if (scores[player.id] !== undefined) {
      player.totalScore += scores[player.id];

      if (player.totalScore >= match.settings.maxMatchScore) {
        player.isOut = true;
        // Check for re-entry eligibility
        await checkReentry(match, player);
      }
    }
  }

  saveActiveMatch(match);
  haptic();
  showToast('Round saved', 'success');
  navigateTo('match');
}

async function checkReentry(match, outPlayer) {
  const activePlayers = match.players.filter(p => !p.isOut && p.id !== outPlayer.id);
  if (activePlayers.length === 0) return;

  // Find next highest score among active players
  const sortedActive = activePlayers.sort((a, b) => b.totalScore - a.totalScore);
  const nextHighest = sortedActive[0];

  const margin = match.settings.maxMatchScore - nextHighest.totalScore;
  const canReenter = margin > match.settings.dropScore;

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
      outPlayer.reentryRounds.push(match.rounds.length); // Current round number
      saveActiveMatch(match);
      showToast(`${outPlayer.name} re-entered`, 'success');
    }
  }
}

function endMatch() {
  const match = getActiveMatch();
  if (!match) return;

  const activePlayers = match.players.filter(p => !p.isOut);
  match.winner = activePlayers[0] || null;
  match.status = 'completed';
  match.completedAt = Date.now();

  // Save to history
  const history = getMatchHistory();
  history.unshift(match);
  saveMatchHistory(history);

  // Clear active match
  clearActiveMatch();
  haptic();
  navigateTo('home');
}

async function abandonMatch() {
  const confirmed = await showConfirm(
    'End Match Early?',
    'Current standings will be saved to history.',
    'End Match',
    true
  );

  if (!confirmed) return;

  const match = getActiveMatch();
  if (!match) return;

  // Winner is player with lowest score
  const sortedPlayers = [...match.players].sort((a, b) => a.totalScore - b.totalScore);
  match.winner = sortedPlayers[0] || null;
  match.status = 'abandoned';
  match.completedAt = Date.now();

  // Save to history
  const history = getMatchHistory();
  history.unshift(match);
  saveMatchHistory(history);

  // Clear active match
  clearActiveMatch();
  haptic();
  showToast('Match ended', 'success');
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
  // Set up navigation
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });

  // Check for active match and navigate accordingly
  const activeMatch = getActiveMatch();
  if (activeMatch) {
    navigateTo('match');
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
