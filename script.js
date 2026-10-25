// Road Dodge — a Car Dodge starter game
// The four pieces of a game, in plain terms:
//   Player: the teal car you steer.  World: the 400x600 road.
//   Rules: traffic moves down, speed rises, touching traffic ends the run.
//   Goal: survive, pass traffic, beat your best score.

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const bestEl = document.getElementById("best");
const finalScoreEl = document.getElementById("finalScore");
const finalBestEl = document.getElementById("finalBest");

const startScreen = document.getElementById("startScreen");
const pauseScreen = document.getElementById("pauseScreen");
const gameOverScreen = document.getElementById("gameOverScreen");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");
const soundBtn = document.getElementById("soundBtn");
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");

// ---- Game state ----
let running = false;
let paused = false;
let soundOn = true;
let score = 0;
let frame = 0;
let laneOffset = 0;
let playerX = 200;
let traffic = [];
let spawnTimer = 0;

const PLAYER_Y = 490;
const CAR_W = 52;
const CAR_H = 84;
const ROAD_LEFT = 48;
const ROAD_RIGHT = 352;

// Best score is remembered between visits (Feature 3, part 1)
let best = Number(localStorage.getItem("carDodgeHighScore")) || 0;
bestEl.textContent = best;

// ---- Sound: tiny Web Audio beeps, no audio files needed (Feature 3, part 2) ----
let audioCtx = null;
function beep(freq, ms) {
  if (!soundOn) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + ms / 1000);
    osc.stop(audioCtx.currentTime + ms / 1000);
  } catch (e) { /* sound is optional; the game still works without it */ }
}

// ---- Drawing ----
function drawCar(x, y, bodyColor, stripeColor) {
  // Wheels
  ctx.fillStyle = "#111827";
  ctx.fillRect(x - 28, y - 28, 10, 22);
  ctx.fillRect(x + 18, y - 28, 10, 22);
  ctx.fillRect(x - 28, y + 8, 10, 22);
  ctx.fillRect(x + 18, y + 8, 10, 22);
  // Body
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x - 26, y - 42, CAR_W, CAR_H);
  // Windshield + stripe
  ctx.fillStyle = "#bae6fd";
  ctx.fillRect(x - 18, y - 22, 36, 22);
  ctx.fillStyle = stripeColor;
  ctx.fillRect(x - 5, y - 42, 10, CAR_H);
}

function drawScene() {
  // Road
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(0, 0, 400, 600);
  // Grass shoulders
  ctx.fillStyle = "#14532d";
  ctx.fillRect(0, 0, ROAD_LEFT, 600);
  ctx.fillRect(ROAD_RIGHT, 0, 400 - ROAD_RIGHT, 600);
  // Edge lines
  ctx.fillStyle = "#facc15";
  ctx.fillRect(ROAD_LEFT - 4, 0, 4, 600);
  ctx.fillRect(ROAD_RIGHT, 0, 4, 600);
  // Moving dashed lane lines (Edit 3 in style: the road feels alive)
  ctx.fillStyle = "#e5e7eb";
  for (let y = -60 + laneOffset; y < 600; y += 120) {
    ctx.fillRect(147, y, 6, 60);
    ctx.fillRect(247, y, 6, 60);
  }
  // Traffic, then the player on top
  for (const car of traffic) drawCar(car.x, car.y, car.color, "#1f2937");
  drawCar(playerX, PLAYER_Y, "#14b8a6", "#facc15");
}

// ---- Rules ----
function getLevel() {
  return Math.floor(score / 250) + 1;
}

function spawnTraffic() {
  const lanes = [100, 200, 300];
  const lane = lanes[Math.floor(Math.random() * lanes.length)];
  const colors = ["#ef4444", "#f97316", "#a855f7", "#eab308"];
  traffic.push({
    x: lane,
    y: -90,
    color: colors[Math.floor(Math.random() * colors.length)],
    speed: 3 + getLevel() * 0.6 + Math.random()
  });
}

function update() {
  frame++;
  if (frame % 6 === 0) score++; // distance score: ~10 points per second
  laneOffset = (laneOffset + 3 + getLevel()) % 120;

  // Steering (keyboard flags are set below; touch buttons use the same flags)
  if (keys.left) playerX -= 6;
  if (keys.right) playerX += 6;
  playerX = Math.max(ROAD_LEFT + 30, Math.min(ROAD_RIGHT - 30, playerX));

  spawnTimer--;
  if (spawnTimer <= 0) {
    spawnTraffic();
    spawnTimer = Math.max(50, 95 - getLevel() * 6);
  }

  for (const car of traffic) car.y += car.speed;

  // Passed traffic = bonus points + a small tick sound
  const before = traffic.length;
  traffic = traffic.filter((car) => car.y < 620);
  if (traffic.length < before) { score += 25; beep(880, 60); }

  // Collision: rectangles overlap = crash
  for (const car of traffic) {
    const hitX = Math.abs(car.x - playerX) < 48;
    const hitY = Math.abs(car.y - PLAYER_Y) < 72;
    if (hitX && hitY) return gameOver();
  }

  scoreEl.textContent = score;
  levelEl.textContent = getLevel();
}

// ---- Flow: start / pause / game over ----
function showOnly(screen) {
  startScreen.classList.add("hidden");
  pauseScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  if (screen) screen.classList.remove("hidden");
}

function startGame() {
  running = true;
  paused = false;
  score = 0;
  frame = 0;
  traffic = [];
  playerX = 200;
  spawnTimer = 60;
  pauseBtn.textContent = "Pause";
  scoreEl.textContent = "0";
  levelEl.textContent = "1";
  showOnly(null);
  beep(660, 100);
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
  if (paused) showOnly(pauseScreen);
  else showOnly(null);
}

function gameOver() {
  running = false;
  beep(160, 300);
  if (score > best) {
    best = score;
    localStorage.setItem("carDodgeHighScore", best);
    bestEl.textContent = best;
  }
  finalScoreEl.textContent = score;
  finalBestEl.textContent = best;
  showOnly(gameOverScreen);
}

// ---- Controls ----
const keys = { left: false, right: false };

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
  if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
  if (e.key === "p" || e.key === "P") togglePause();
  if (e.key === " " && !running) startGame();
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
  if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
});

// Feature 1: Pause button (and Resume on the pause screen)
pauseBtn.addEventListener("click", togglePause);
resumeBtn.addEventListener("click", togglePause);

// Feature 2: on-screen touch buttons, using the same steering flags as the keyboard
function hold(button, key) {
  const on = (e) => { e.preventDefault(); keys[key] = true; };
  const off = () => { keys[key] = false; };
  button.addEventListener("mousedown", on);
  button.addEventListener("mouseup", off);
  button.addEventListener("mouseleave", off);
  button.addEventListener("touchstart", on, { passive: false });
  button.addEventListener("touchend", off);
  button.addEventListener("touchcancel", off);
}
hold(leftBtn, "left");
hold(rightBtn, "right");

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

soundBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  soundBtn.textContent = soundOn ? "Sound: On" : "Sound: Off";
});

// ---- Main loop: draw always, update only while playing ----
function loop() {
  if (running && !paused) update();
  drawScene();
  requestAnimationFrame(loop);
}
drawScene();
loop();
