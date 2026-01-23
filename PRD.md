# Rummy Score Keeper - Product Requirements Document

## Overview
A single-user web application for tracking Rummy game scores. The app runs entirely in the browser with no backend, using browser storage (localStorage) for data persistence.

---

## Features

### 1. Settings Screen

#### 1.1 Game Defaults
| Setting | Description | Default Value |
|---------|-------------|---------------|
| Drop Score | Points assigned when a player drops before playing any turn | 25 |
| Middle Drop Score | Points for dropping after playing at least one turn | 50 |
| Max Score Per Game | Maximum score a player can have in a single round | 80 |
| Max Match Score | Score limit to exit the match (player is "out") | 101 |

#### 1.2 Global Player List
- Add new players (name required)
- Edit player names
- Delete players (with confirmation)
- Players persist across matches
- Quick-select players when starting a new game

---

### 2. Game Play

#### 2.1 Start a Match
- Select players from global player list (or add new ones)
- Minimum 2 players, no maximum
- Option to use default settings or customize for this match
- Game variant: 13-card Rummy

#### 2.2 Score Entry
- Enter scores for each player after every round
- Round number auto-increments
- Input validation against max score per game
- Winner of round gets 0 points (or configurable)

#### 2.3 Scoreboard View
- **By Round**: Table showing each round's scores for all players
- **Running Total**: Current cumulative score for each player
- Visual indicator for players approaching max match score
- Highlight players who are "out" (exceeded max match score)
- Match continues until only one player remains (the winner)
- No joint winners - last player standing wins

#### 2.4 Score Editing
- Edit any previously entered score (for corrections)
- Edit history/audit trail (optional)
- Recalculates all totals automatically

---

### 3. Drop and Out Rules

#### 3.1 Drop Eligibility
A player can drop (early exit from a round) **only if**:
- (Max Match Score - Current Score) > Drop Score
- Example: With score 75, margin is 101 - 75 = 26. Since 26 > 25, player CAN drop.
- Example: With score 76, margin is 101 - 76 = 25. Since 25 is NOT > 25, player CANNOT drop.

#### 3.2 Player Out
A player is **out** when their current score reaches or exceeds max match score (101).

#### 3.3 Re-entry Rule
A player who is out can re-enter **only if**:
- The player with the next highest score still has a drop chance
- Drop chance exists when: (Max Match Score - Next Highest Score) > Drop Score
- Re-entering player takes the score of the next highest player

**Example (Re-entry allowed):**
- Max Match Score: 101, Drop Score: 25
- Player A is out with 105 points
- Player B (next highest) has 70 points
- Player B's margin: 101 - 70 = 31
- Since 31 > 25, Player B has a drop chance, so Player A CAN re-enter
- Player A re-enters with score = 70

**Example (Re-entry NOT allowed):**
- Player A is out with 110 points
- Player B (next highest) has 76 points
- Player B's margin: 101 - 76 = 25
- Since 25 is NOT > 25, Player B has no drop chance, so Player A CANNOT re-enter

---

### 4. Match History

#### 4.1 Match List
- List of all completed matches
- Show date, players, winner
- Sort by date (newest first)

#### 4.2 Match Details
- View complete scorecard of any past match
- Round-by-round breakdown
- Final standings

#### 4.3 Data Management
- Delete individual match history
- Clear all history (with confirmation)
- Export match data (optional - JSON format)

#### 4.4 Player Statistics
- Total matches played
- Wins / Win rate
- Average score per match
- Total drops / middle drops

---

## Design Specification

### Visual Style
- **Theme**: Clean & Minimal - white/light background, subtle shadows, generous whitespace
- **Accent Color**: Blue (#2563eb or similar)
- **Typography**: System fonts, clear hierarchy, readable scores
- **Animations**: Subtle transitions, gentle fades, micro-interactions for polish

### Layout
- **Primary Device**: Phone (portrait orientation)
- **Optimized For**: 4-6 players
- **Navigation**: Fixed bottom bar with 4 tabs (Home, Match, History, Settings)
- **Scoreboard**: Vertical list of player cards

### Navigation & App Launch
- **On Launch**: If active match exists, go directly to scoreboard; otherwise show home
- **Bottom Tabs**:
  1. Home - Quick actions, active match summary
  2. Match - Active scoreboard (or prompt to start)
  3. History - Past matches
  4. Settings - Defaults and player management

### Key Design Principles (Things to Avoid)
- No cluttered UI - keep screens focused
- No lag - instant responses, smooth animations
- Minimize taps - streamlined flows for common actions

---

## Screens

### 1. Home Screen
- If match active: Show match summary card with "Continue" button prominent
- If no match: Large "Start New Match" button
- Quick stats preview (optional)

### 2. New Match Setup
- Select players from global list (checkboxes) or add new
- Show/edit match settings (pre-filled with defaults)
- "Start Match" button

### 3. Active Match (Scoreboard)
- **Player Cards** (vertical list):
  - Player name + rank (1st, 2nd, 3rd...)
  - Current total score (large)
  - Visual warning color when approaching 101
  - Out players: greyed out, kept in list
  - Tap to expand: shows round-by-round breakdown
  - Long-press on a round score to edit
- **Add Round Button**: Fixed at bottom or floating
- **Re-entry**: Auto-prompt when player goes out (if eligible)

### 4. Score Entry Screen
- All players shown at once
- "Select Winner" button → tapped player gets 0
- Quick buttons per player: "Drop" (25), "M-Drop" (50)
- Number input for custom scores
- Validation against max score per game (80)
- Submit button to save round

### 5. Match History
- Card list: each card shows date, players, winner
- Tap card to view full scorecard (screenshot-ready)
- Delete option (no confirmation needed for individual)
- Clear all requires confirmation

### 6. Settings
- **Game Defaults** section: edit drop score, middle drop, max per game, max match
- **Player Management** section:
  - List of all players
  - Add player (name field + save)
  - Edit name (tap to edit)
  - Delete player (swipe or tap delete icon, no confirmation)

### 7. Player Statistics (accessed from Settings or History)
- Total matches played
- Wins / Win rate percentage
- Average final score
- Total drops / middle drops

---

## Interactions & Feedback

### Haptic Feedback (Mobile)
- Vibrate on: score submit, player goes out, match ends

### Confirmations Required
- Ending a match mid-game
- Clearing all match history
- NOT required for: player management, individual history delete

### Notifications
- Visual highlight only when player goes out
- Auto-prompt for re-entry if eligible

### Auto-save
- Save to localStorage after every action
- Seamless resume on browser close/reopen

---

## Sharing & Export
- Screenshot-ready scoreboard layout (clean, no UI chrome)
- Optimized for sharing via screenshot

---

---

## Technical Requirements

- **Storage**: localStorage (auto-save after every action)
- **Tech Stack**: Vanilla HTML, CSS, JavaScript (no frameworks, no build step)
- **PWA**: Progressive Web App with:
  - manifest.json for "Add to Home Screen"
  - Service worker for offline support
  - App icon (simple design)
- **Responsive**: Mobile-first, portrait phone optimized
- **Offline**: Fully functional without internet
- **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **Performance**:
  - Instant interactions (no perceptible lag)
  - Smooth 60fps animations
  - Minimal DOM updates
- **Deployment**: Static files - can be hosted anywhere or opened locally
  - index.html
  - style.css
  - app.js
  - manifest.json
  - sw.js (service worker)
  - icon.png

---

## Data Models

### Player
```
{
  id: string,
  name: string,
  createdAt: timestamp
}
```

### Match
```
{
  id: string,
  players: [playerId, ...],
  settings: {
    dropScore: number,
    middleDropScore: number,
    maxScorePerGame: number,
    maxMatchScore: number
  },
  rounds: [
    {
      roundNumber: number,
      scores: { playerId: score, ... },
      timestamp: timestamp
    }
  ],
  status: 'active' | 'completed',
  winner: playerId | null,
  createdAt: timestamp,
  completedAt: timestamp | null
}
```

### Settings
```
{
  defaults: {
    dropScore: number,
    middleDropScore: number,
    maxScorePerGame: number,
    maxMatchScore: number
  }
}
```

---

## Resolved

All questions resolved. PRD is complete.

---

## Future Enhancements (Out of Scope for v1)

- Cloud sync across devices
- Multiplayer (shared game room)
- Leaderboards across all players
- Dark mode / custom themes
- Game timer per round
- Undo last action
- Multiple game variants (21-card, etc.)
- Share as text/JSON export
