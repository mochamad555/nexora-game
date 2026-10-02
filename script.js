const startScreen = document.getElementById('start-screen');
const gameShell = document.getElementById('game-shell');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const pauseBtn = document.getElementById('pause-btn');

const hpFill = document.getElementById('hp-fill');
const coinCountEl = document.getElementById('coin-count');
const levelCountEl = document.getElementById('level-count');
const messageOverlay = document.getElementById('message-overlay');
const mapEl = document.getElementById('map');
const coinLayer = document.getElementById('coin-layer');
const enemyLayer = document.getElementById('enemy-layer');
const playerEl = document.getElementById('player');

const LEVELS = [
  {
    coins: [
      { x: 200, y: 140 },
      { x: 360, y: 320 },
      { x: 540, y: 180 },
      { x: 730, y: 360 },
      { x: 820, y: 120 }
    ],
    enemies: [
      { x: 260, y: 100, w: 28, h: 28, speed: 90, dir: 1, axis: 'x', range: 120 },
      { x: 620, y: 240, w: 28, h: 28, speed: 100, dir: -1, axis: 'y', range: 140 }
    ]
  },
  {
    coins: [
      { x: 140, y: 250 },
      { x: 310, y: 120 },
      { x: 500, y: 310 },
      { x: 660, y: 170 },
      { x: 790, y: 260 },
      { x: 840, y: 110 }
    ],
    enemies: [
      { x: 180, y: 140, w: 28, h: 28, speed: 95, dir: 1, axis: 'x', range: 150 },
      { x: 430, y: 330, w: 28, h: 28, speed: 110, dir: -1, axis: 'y', range: 150 },
      { x: 700, y: 120, w: 28, h: 28, speed: 120, dir: 1, axis: 'x', range: 130 }
    ]
  },
  {
    coins: [
      { x: 150, y: 120 },
      { x: 260, y: 350 },
      { x: 420, y: 180 },
      { x: 590, y: 280 },
      { x: 740, y: 140 },
      { x: 830, y: 360 },
      { x: 500, y: 420 }
    ],
    enemies: [
      { x: 210, y: 110, w: 28, h: 28, speed: 100, dir: 1, axis: 'x', range: 160 },
      { x: 360, y: 240, w: 28, h: 28, speed: 110, dir: -1, axis: 'y', range: 150 },
      { x: 650, y: 200, w: 28, h: 28, speed: 125, dir: 1, axis: 'x', range: 170 },
      { x: 780, y: 350, w: 28, h: 28, speed: 130, dir: -1, axis: 'y', range: 140 }
    ]
  }
];

const MAP_WIDTH = 960;
const MAP_HEIGHT = 540;
const PLAYER_SIZE = 28;
const PLAYER_SPEED = 210;
const MAX_HP = 3;

const state = {
  started: false,
  paused: false,
  levelIndex: 0,
  totalLevels: LEVELS.length,
  hp: MAX_HP,
  collectedCoins: 0,
  coins: [],
  enemies: [],
  keys: {},
  player: { x: 80, y: 80, w: PLAYER_SIZE, h: PLAYER_SIZE },
  invulnerableTimer: 0,
  transitionLock: false,
  gameOver: false
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function showMessage(text, keepVisible = false) {
  messageOverlay.textContent = text;
  if (keepVisible) {
    messageOverlay.classList.remove('hidden');
  } else {
    messageOverlay.classList.remove('hidden');
    setTimeout(() => {
      messageOverlay.classList.add('hidden');
    }, 800);
  }
}

function hideMessage() {
  messageOverlay.classList.add('hidden');
}

function updateHUD() {
  const hpPercent = (state.hp / MAX_HP) * 100;
  hpFill.style.width = `${hpPercent}%`;
  coinCountEl.textContent = String(state.collectedCoins);
  levelCountEl.textContent = String(state.levelIndex + 1);
}

function createCoinElement(coin) {
  const el = document.createElement('div');
  el.className = 'entity coin';
  el.style.left = `${coin.x}px`;
  el.style.top = `${coin.y}px`;
  return el;
}

function createEnemyElement(enemy) {
  const el = document.createElement('div');
  el.className = 'entity enemy';
  el.style.left = `${enemy.x}px`;
  el.style.top = `${enemy.y}px`;
  return el;
}

function resetPlayer() {
  state.player.x = 50;
  state.player.y = 50;
  playerEl.style.left = `${state.player.x}px`;
  playerEl.style.top = `${state.player.y}px`;
}

function loadLevel() {
  coinLayer.innerHTML = '';
  enemyLayer.innerHTML = '';

  const currentLevel = LEVELS[state.levelIndex];
  state.coins = currentLevel.coins.map((coin, index) => ({
    ...coin,
    id: index,
    collected: false,
    radius: 10,
    el: createCoinElement(coin)
  }));

  state.enemies = currentLevel.enemies.map((enemy) => ({
    ...enemy,
    startX: enemy.x,
    startY: enemy.y,
    dir: enemy.dir,
    el: createEnemyElement(enemy)
  }));

  state.coins.forEach((coin) => coinLayer.appendChild(coin.el));
  state.enemies.forEach((enemy) => enemyLayer.appendChild(enemy.el));

  resetPlayer();
  state.invulnerableTimer = 0;
  state.transitionLock = false;
  updateHUD();
}

function collectCoins() {
  let collectedThisLevel = 0;

  state.coins.forEach((coin) => {
    if (coin.collected) {
      collectedThisLevel += 1;
      return;
    }

    const dx = coin.x - (state.player.x + state.player.w / 2);
    const dy = coin.y - (state.player.y + state.player.h / 2);
    const distance = Math.hypot(dx, dy);

    if (distance < 20) {
      coin.collected = true;
      coin.el.classList.add('hidden');
      state.collectedCoins += 1;
      collectedThisLevel += 1;
    }
  });

  if (collectedThisLevel === state.coins.length) {
    checkLevelProgress();
  }

  updateHUD();
}

function checkLevelProgress() {
  if (state.transitionLock) return;

  if (state.levelIndex === LEVELS.length - 1) {
    state.transitionLock = true;
    state.gameOver = true;
    state.started = false;
    showMessage('YOU WIN', true);
    return;
  }

  state.transitionLock = true;
  showMessage('LEVEL CLEAR', true);
  setTimeout(() => {
    state.levelIndex += 1;
    state.collectedCoins = 0;
    loadLevel();
    hideMessage();
  }, 1200);
}

function handlePlayerDamage() {
  if (state.invulnerableTimer > 0 || state.gameOver) return;

  state.hp -= 1;
  state.invulnerableTimer = 1.1;

  if (state.hp <= 0) {
    state.hp = 0;
    state.gameOver = true;
    state.started = false;
    showMessage('GAME OVER', true);
    updateHUD();
    return;
  }

  updateHUD();
}

function playerCollisionWithEnemy(enemy) {
  const playerLeft = state.player.x;
  const playerRight = state.player.x + state.player.w;
  const playerTop = state.player.y;
  const playerBottom = state.player.y + state.player.h;

  const enemyLeft = enemy.x;
  const enemyRight = enemy.x + enemy.w;
  const enemyTop = enemy.y;
  const enemyBottom = enemy.y + enemy.h;

  return (
    playerRight > enemyLeft &&
    playerLeft < enemyRight &&
    playerBottom > enemyTop &&
    playerTop < enemyBottom
  );
}

function moveEnemies(dt) {
  state.enemies.forEach((enemy) => {
    if (enemy.axis === 'x') {
      enemy.x += enemy.speed * enemy.dir * dt;
      if (Math.abs(enemy.x - enemy.startX) >= enemy.range) {
        enemy.dir *= -1;
      }
    } else {
      enemy.y += enemy.speed * enemy.dir * dt;
      if (Math.abs(enemy.y - enemy.startY) >= enemy.range) {
        enemy.dir *= -1;
      }
    }

    enemy.x = clamp(enemy.x, 0, MAP_WIDTH - enemy.w);
    enemy.y = clamp(enemy.y, 0, MAP_HEIGHT - enemy.h);
    enemy.el.style.left = `${enemy.x}px`;
    enemy.el.style.top = `${enemy.y}px`;

    if (playerCollisionWithEnemy(enemy)) {
      handlePlayerDamage();
    }
  });
}

function updatePlayer(dt) {
  let moveX = 0;
  let moveY = 0;

  if (state.keys['w'] || state.keys['arrowup']) moveY -= 1;
  if (state.keys['s'] || state.keys['arrowdown']) moveY += 1;
  if (state.keys['a'] || state.keys['arrowleft']) moveX -= 1;
  if (state.keys['d'] || state.keys['arrowright']) moveX += 1;

  if (moveX !== 0 || moveY !== 0) {
    const len = Math.hypot(moveX, moveY) || 1;
    moveX = (moveX / len) * PLAYER_SPEED * dt;
    moveY = (moveY / len) * PLAYER_SPEED * dt;

    state.player.x = clamp(state.player.x + moveX, 0, MAP_WIDTH - state.player.w);
    state.player.y = clamp(state.player.y + moveY, 0, MAP_HEIGHT - state.player.h);
  }

  playerEl.style.left = `${state.player.x}px`;
  playerEl.style.top = `${state.player.y}px`;
}

function update(dt) {
  if (!state.started || state.paused || state.gameOver) return;

  updatePlayer(dt);
  collectCoins();
  moveEnemies(dt);

  if (state.invulnerableTimer > 0) {
    state.invulnerableTimer = Math.max(0, state.invulnerableTimer - dt);
    playerEl.style.opacity = state.invulnerableTimer > 0 ? '0.6' : '1';
  }
}

function startGame() {
  state.started = true;
  state.paused = false;
  state.gameOver = false;
  state.levelIndex = 0;
  state.hp = MAX_HP;
  state.collectedCoins = 0;
  startScreen.classList.remove('active');
  gameShell.classList.remove('hidden');
  hideMessage();
  loadLevel();
  updateHUD();
}

function togglePause() {
  if (!state.started || state.gameOver) return;
  state.paused = !state.paused;

  if (state.paused) {
    showMessage('PAUSED', true);
    pauseBtn.textContent = 'Resume';
  } else {
    hideMessage();
    pauseBtn.textContent = 'Pause';
  }
}

function restartGame() {
  state.started = true;
  state.paused = false;
  state.gameOver = false;
  state.levelIndex = 0;
  state.hp = MAX_HP;
  state.collectedCoins = 0;
  pauseBtn.textContent = 'Pause';
  hideMessage();
  loadLevel();
  updateHUD();
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);
pauseBtn.addEventListener('click', togglePause);

document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  state.keys[key] = true;

  if (key === ' ') {
    event.preventDefault();
    togglePause();
  }
});

document.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  state.keys[key] = false;
});

let lastTime = 0;
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000 || 0, 0.033);
  lastTime = timestamp;

  update(dt);
  requestAnimationFrame(gameLoop);
}

startScreen.classList.add('active');
gameShell.classList.add('hidden');
updateHUD();
requestAnimationFrame(gameLoop);
