const socket = io();

const BOARD_TARGETS = {
  YES: { x: 17, y: 11 },
  NO: { x: 83, y: 11 },
  HELLO: { x: 25, y: 86 },
  GOODBYE: { x: 75, y: 86 },
  A: { x: 10, y: 32 },
  B: { x: 16, y: 31 },
  C: { x: 22, y: 30 },
  D: { x: 28, y: 29 },
  E: { x: 34, y: 28 },
  F: { x: 40, y: 27 },
  G: { x: 46, y: 26 },
  H: { x: 52, y: 26 },
  I: { x: 58, y: 27 },
  J: { x: 64, y: 28 },
  K: { x: 70, y: 29 },
  L: { x: 76, y: 30 },
  M: { x: 82, y: 31 },
  N: { x: 12, y: 42 },
  O: { x: 18, y: 41 },
  P: { x: 24, y: 40 },
  Q: { x: 30, y: 39 },
  R: { x: 36, y: 38 },
  S: { x: 42, y: 37 },
  T: { x: 48, y: 36 },
  U: { x: 54, y: 36 },
  V: { x: 60, y: 37 },
  W: { x: 66, y: 38 },
  X: { x: 72, y: 39 },
  Y: { x: 78, y: 40 },
  Z: { x: 84, y: 41 },
  1: { x: 20, y: 58 },
  2: { x: 27, y: 57 },
  3: { x: 34, y: 56 },
  4: { x: 41, y: 55 },
  5: { x: 48, y: 54 },
  6: { x: 55, y: 55 },
  7: { x: 62, y: 56 },
  8: { x: 69, y: 57 },
  9: { x: 76, y: 58 },
  0: { x: 83, y: 59 }
};

const joinForm = document.getElementById("join-form");
const questionForm = document.getElementById("question-form");
const nameInput = document.getElementById("name-input");
const roomInput = document.getElementById("room-input");
const questionInput = document.getElementById("question-input");
const questionDisplay = document.getElementById("question-display");
const roomCodeDisplay = document.getElementById("room-code-display");
const connectionStatus = document.getElementById("connection-status");
const playersElement = document.getElementById("players");
const historyElement = document.getElementById("history");
const boardElement = document.getElementById("board");
const planchetteElement = document.getElementById("planchette");
const recordGoodbyeButton = document.getElementById("record-goodbye");
const generateRoomButton = document.getElementById("generate-room");
const inviteLinkInput = document.getElementById("invite-link");
const copyInviteButton = document.getElementById("copy-invite");
const toggleSpiritButton = document.getElementById("toggle-spirit");
const spiritStatusElement = document.getElementById("spirit-status");
const spiritAnswerElement = document.getElementById("spirit-answer");
const toggleSoundButton = document.getElementById("toggle-sound");
const whisperLineElement = document.getElementById("whisper-line");
const staticBurstElement = document.getElementById("static-burst");
const installCardElement = document.getElementById("install-card");
const installStatusElement = document.getElementById("install-status");
const installAppButton = document.getElementById("install-app");
const welcomeScreenElement = document.getElementById("welcome-screen");
const enterSiteButton = document.getElementById("enter-site");

const NAME_STORAGE_KEY = "ouija-online-name";

let currentRoomId = "";
let desiredRoomId = "";
let isDragging = false;
let isSpiritMoving = false;
let latestCursor = { x: 50, y: 72 };
let currentSpiritState = {
  enabled: false,
  active: false,
  name: "The Veil",
  lastAnswer: ""
};
let spiritAnimationRun = 0;
let soundEnabled = false;
let audioContext = null;
let masterGain = null;
let droneNodes = [];
let noiseBuffer = null;
let deferredInstallPrompt = null;

function setStatus(text, isError = false) {
  connectionStatus.textContent = text;
  connectionStatus.classList.toggle("is-error", isError);
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function dismissWelcomeScreen() {
  if (!welcomeScreenElement) {
    return;
  }

  welcomeScreenElement.classList.add("is-hidden");
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean(window.navigator.standalone);
}

function updateInstallUi() {
  if (!installCardElement || !installStatusElement || !installAppButton) {
    return;
  }

  if (isStandaloneMode()) {
    installStatusElement.textContent = "Installed. Open it from your home screen or desktop like an app.";
    installAppButton.textContent = "Installed";
    installAppButton.disabled = true;
    return;
  }

  installAppButton.disabled = false;

  if (deferredInstallPrompt) {
    installStatusElement.textContent = "Install on this device for a full-screen board and faster relaunch.";
    installAppButton.textContent = "Install";
    return;
  }

  if (isIosDevice()) {
    installStatusElement.textContent = "On iPhone or iPad, use Safari Share and choose Add to Home Screen.";
    installAppButton.textContent = "Show Steps";
    return;
  }

  installStatusElement.textContent = "Install is available in supported browsers once the app is recognized as installable.";
  installAppButton.textContent = "Install";
}

async function handleInstallClick() {
  if (isStandaloneMode()) {
    return;
  }

  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;

    deferredInstallPrompt = null;
    updateInstallUi();
    setStatus(
      choice.outcome === "accepted"
        ? "App install started."
        : "Install prompt dismissed."
    );
    return;
  }

  if (isIosDevice()) {
    installStatusElement.textContent =
      "In Safari, tap Share, then Add to Home Screen to install Ouija Online.";
    setStatus("Use Safari Share > Add to Home Screen to install on iPhone or iPad.");
    return;
  }

  setStatus("Install will appear in browsers that support PWA installation.", true);
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("/service-worker.js");
  } catch (_error) {
    setStatus("Offline install features could not be fully registered in this browser.", true);
  }
}

function normalizeRoomId(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

function generateRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buffer = new Uint32Array(6);
  crypto.getRandomValues(buffer);

  return Array.from(buffer, (value) => alphabet[value % alphabet.length]).join("");
}

function buildInviteLink(roomId) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", roomId);
  return url.toString();
}

function syncUrlRoom(roomId) {
  const url = new URL(window.location.href);

  if (roomId) {
    url.searchParams.set("room", roomId);
  } else {
    url.searchParams.delete("room");
  }

  window.history.replaceState({}, "", url);
}

function updateInviteLink(roomId) {
  if (!roomId) {
    inviteLinkInput.value = "Create or join a room to share an invite link";
    copyInviteButton.disabled = true;
    return;
  }

  inviteLinkInput.value = buildInviteLink(roomId);
  copyInviteButton.disabled = false;
}

function getSavedName() {
  return localStorage.getItem(NAME_STORAGE_KEY) || "Guest";
}

function saveName(name) {
  localStorage.setItem(NAME_STORAGE_KEY, name || "Guest");
}

function joinCurrentRoom() {
  const roomId = normalizeRoomId(roomInput.value);
  const name = nameInput.value.trim().slice(0, 18) || "Guest";

  if (!roomId) {
    setStatus("Enter a room code with letters or numbers.", true);
    return;
  }

  roomInput.value = roomId;
  desiredRoomId = roomId;
  saveName(name);
  socket.emit("room:join", { roomId, name });
  syncUrlRoom(roomId);
  updateInviteLink(roomId);
}

function renderPlayers(players) {
  playersElement.innerHTML = "";

  players.forEach((player) => {
    const chip = document.createElement("div");
    chip.className = "player-chip";

    if (player.kind === "spirit") {
      chip.classList.add("is-spirit");
    }

    chip.textContent = player.name;
    playersElement.appendChild(chip);
  });
}

function renderHistory(entries) {
  historyElement.innerHTML = "";

  [...entries].reverse().forEach((entry) => {
    const element = document.createElement("div");
    element.className = "history-entry";
    element.textContent = entry;
    historyElement.appendChild(element);
  });
}

function updatePlanchette(cursor) {
  latestCursor = cursor;
  planchetteElement.style.left = `${cursor.x}%`;
  planchetteElement.style.top = `${cursor.y}%`;
}

function setHauntingVisuals(active) {
  boardElement.classList.toggle("is-haunted", active);
  planchetteElement.classList.toggle("is-spirit-moving", active);
}

function setWhisperLine(text) {
  whisperLineElement.textContent = text || "The board is still.";
}

function updateSpiritUi(spirit) {
  currentSpiritState = spirit || currentSpiritState;
  const isEnabled = Boolean(currentSpiritState.enabled);
  const isActive = Boolean(currentSpiritState.active);
  const lastAnswer = currentSpiritState.lastAnswer || "No reply yet.";

  toggleSpiritButton.textContent = isEnabled ? "Dismiss" : "Summon";
  spiritStatusElement.textContent = isEnabled
    ? isActive
      ? `${currentSpiritState.name} is moving through the board.`
      : `${currentSpiritState.name} is waiting for the next question.`
    : "Summon a fictional presence for eerie solo replies.";
  spiritAnswerElement.textContent = lastAnswer;
  setWhisperLine(
    isEnabled
      ? isActive
        ? `${currentSpiritState.name} moves beneath your hands.`
        : `${currentSpiritState.name} waits in the static.`
      : "The board is still."
  );

  if (!isActive && !isSpiritMoving) {
    setHauntingVisuals(false);
    boardElement.classList.remove("is-whispering");
  }
}

function toBoardPercentages(clientX, clientY) {
  const rect = boardElement.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 100;
  const y = ((clientY - rect.top) / rect.height) * 100;

  return {
    x: Math.max(4, Math.min(96, x)),
    y: Math.max(8, Math.min(92, y))
  };
}

function emitCursorFromPointer(event) {
  const cursor = toBoardPercentages(event.clientX, event.clientY);
  updatePlanchette(cursor);
  socket.emit("cursor:move", cursor);
}

async function ensureAudio() {
  if (!audioContext) {
    const Context = window.AudioContext || window.webkitAudioContext;

    if (!Context) {
      setStatus("This browser does not support Web Audio for the ambient effects.", true);
      return false;
    }

    audioContext = new Context();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(audioContext.destination);
    noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 1.5, audioContext.sampleRate);

    const channel = noiseBuffer.getChannelData(0);

    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = (Math.random() * 2 - 1) * 0.35;
    }

    const lowPass = audioContext.createBiquadFilter();
    lowPass.type = "lowpass";
    lowPass.frequency.value = 900;
    lowPass.Q.value = 0.7;
    lowPass.connect(masterGain);

    [46, 63].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = index === 0 ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.value = index === 0 ? 0.03 : 0.016;
      oscillator.connect(gain);
      gain.connect(lowPass);
      oscillator.start();
      droneNodes.push({ oscillator, gain });
    });
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  return true;
}

function playSpiritTone(token) {
  if (!soundEnabled || !audioContext || !masterGain) {
    return;
  }

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const tokenValue = String(token).charCodeAt(0) || 65;

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(220 + ((tokenValue % 12) * 18), now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.035, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start(now);
  oscillator.stop(now + 0.42);
}

function playWhisperBurst(omenLevel = 1) {
  if (!soundEnabled || !audioContext || !masterGain || !noiseBuffer) {
    return;
  }

  const now = audioContext.currentTime;
  const source = audioContext.createBufferSource();
  const bandPass = audioContext.createBiquadFilter();
  const whisperGain = audioContext.createGain();
  const tone = audioContext.createOscillator();
  const toneGain = audioContext.createGain();

  source.buffer = noiseBuffer;
  bandPass.type = "bandpass";
  bandPass.frequency.value = 900 + (omenLevel * 180);
  bandPass.Q.value = 0.8 + (omenLevel * 0.2);

  whisperGain.gain.setValueAtTime(0.0001, now);
  whisperGain.gain.exponentialRampToValueAtTime(0.02 + (omenLevel * 0.008), now + 0.05);
  whisperGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

  tone.type = "sawtooth";
  tone.frequency.setValueAtTime(160 + (omenLevel * 35), now);
  tone.frequency.linearRampToValueAtTime(110 + (omenLevel * 18), now + 0.6);
  toneGain.gain.setValueAtTime(0.0001, now);
  toneGain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
  toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);

  source.connect(bandPass);
  bandPass.connect(whisperGain);
  whisperGain.connect(masterGain);
  tone.connect(toneGain);
  toneGain.connect(masterGain);

  source.start(now);
  source.stop(now + 0.62);
  tone.start(now);
  tone.stop(now + 0.62);
}

function triggerStaticBurst(omenLevel = 1) {
  staticBurstElement.classList.remove("is-active");
  boardElement.classList.add("is-whispering");
  void staticBurstElement.offsetWidth;
  staticBurstElement.style.opacity = String(0.4 + (omenLevel * 0.12));
  staticBurstElement.classList.add("is-active");
  window.setTimeout(() => {
    staticBurstElement.classList.remove("is-active");
    staticBurstElement.style.opacity = "";
    boardElement.classList.remove("is-whispering");
  }, 260);
}

async function toggleSound() {
  if (!soundEnabled) {
    const ready = await ensureAudio();

    if (!ready || !masterGain) {
      return;
    }

    soundEnabled = true;
    masterGain.gain.setTargetAtTime(0.12, audioContext.currentTime, 0.35);
    toggleSoundButton.textContent = "Sound On";
    setStatus("Ambient sound enabled.");
    return;
  }

  soundEnabled = false;

  if (masterGain && audioContext) {
    masterGain.gain.setTargetAtTime(0.0001, audioContext.currentTime, 0.2);
  }

  toggleSoundButton.textContent = "Sound Off";
  setStatus("Ambient sound muted.");
}

async function animateSpiritSequence({
  answer,
  sequence,
  whisper,
  stepMs = 520,
  settleMs = 900,
  omenLevel = 1
}) {
  const runId = ++spiritAnimationRun;
  isSpiritMoving = true;
  setHauntingVisuals(true);
  spiritStatusElement.textContent = `${currentSpiritState.name} is spelling out an answer...`;
  setWhisperLine(whisper || "A hush moves across the board.");
  triggerStaticBurst(omenLevel);
  playWhisperBurst(omenLevel);

  for (const token of sequence) {
    if (runId !== spiritAnimationRun) {
      return;
    }

    const target = BOARD_TARGETS[token];

    if (target) {
      updatePlanchette(target);
    }

    playSpiritTone(token);
    if (Math.random() > 0.45) {
      triggerStaticBurst(omenLevel);
    }
    await wait(stepMs);
  }

  if (runId !== spiritAnimationRun) {
    return;
  }

  questionDisplay.textContent = answer;
  await wait(settleMs);

  if (runId !== spiritAnimationRun) {
    return;
  }

  isSpiritMoving = false;
  setWhisperLine(whisper || answer);

  if (!currentSpiritState.active) {
    setHauntingVisuals(false);
  }
}

joinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  joinCurrentRoom();
});

questionForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const question = questionInput.value.trim();

  if (!question) {
    return;
  }

  socket.emit("room:question", { question });
  questionInput.value = "";
});

recordGoodbyeButton.addEventListener("click", () => {
  socket.emit("history:add", { text: "GOODBYE" });
});

generateRoomButton.addEventListener("click", () => {
  const roomId = generateRoomCode();
  roomInput.value = roomId;
  desiredRoomId = roomId;
  syncUrlRoom(roomId);
  updateInviteLink(roomId);
  setStatus(`Invite code ${roomId} is ready to share.`);
});

copyInviteButton.addEventListener("click", async () => {
  const roomId = currentRoomId || normalizeRoomId(roomInput.value);

  if (!roomId) {
    setStatus("Create or join a room before copying an invite link.", true);
    return;
  }

  const inviteLink = buildInviteLink(roomId);

  try {
    await navigator.clipboard.writeText(inviteLink);
    copyInviteButton.textContent = "Copied";
    setStatus(`Invite link copied for room ${roomId}.`);
    window.setTimeout(() => {
      copyInviteButton.textContent = "Copy Link";
    }, 1400);
  } catch (_error) {
    inviteLinkInput.focus();
    inviteLinkInput.select();
    setStatus("Clipboard access failed, but the invite link is selected for copy.", true);
  }
});

toggleSpiritButton.addEventListener("click", () => {
  if (!currentRoomId) {
    setStatus("Join a room before summoning the solo presence.", true);
    return;
  }

  socket.emit("spirit:toggle", { enabled: !currentSpiritState.enabled });
});

toggleSoundButton.addEventListener("click", () => {
  toggleSound();
});

installAppButton.addEventListener("click", () => {
  handleInstallClick();
});

enterSiteButton.addEventListener("click", () => {
  dismissWelcomeScreen();
});

roomInput.addEventListener("input", () => {
  const roomId = normalizeRoomId(roomInput.value);
  roomInput.value = roomId;
  updateInviteLink(roomId || currentRoomId);
});

nameInput.addEventListener("change", () => {
  const name = nameInput.value.trim().slice(0, 18) || "Guest";
  nameInput.value = name;
  saveName(name);
});

planchetteElement.addEventListener("pointerdown", (event) => {
  if (!currentRoomId) {
    setStatus("Join a room before touching the board.", true);
    return;
  }

  if (currentSpiritState.active || isSpiritMoving) {
    setStatus("The planchette is already moving on its own.");
    return;
  }

  isDragging = true;
  planchetteElement.setPointerCapture(event.pointerId);
  emitCursorFromPointer(event);
});

planchetteElement.addEventListener("pointermove", (event) => {
  if (!isDragging) {
    return;
  }

  emitCursorFromPointer(event);
});

planchetteElement.addEventListener("pointerup", (event) => {
  isDragging = false;
  planchetteElement.releasePointerCapture(event.pointerId);
});

planchetteElement.addEventListener("pointercancel", (event) => {
  isDragging = false;
  planchetteElement.releasePointerCapture(event.pointerId);
});

socket.on("connect", () => {
  if (desiredRoomId) {
    socket.emit("room:join", {
      roomId: desiredRoomId,
      name: nameInput.value.trim().slice(0, 18) || "Guest"
    });
    setStatus(`Joining room ${desiredRoomId}...`);
    return;
  }

  setStatus("Connected. Enter a room.");
});

socket.on("disconnect", () => {
  setStatus("Connection lost. Refresh to reconnect.", true);
});

socket.on("room:error", (message) => {
  setStatus(message, true);
});

socket.on("room:joined", (state) => {
  currentRoomId = state.roomId;
  desiredRoomId = state.roomId;
  roomInput.value = state.roomId;
  roomCodeDisplay.textContent = state.roomId;
  questionDisplay.textContent = state.question;
  renderPlayers(state.players);
  renderHistory(state.history);
  updatePlanchette(state.cursor);
  syncUrlRoom(state.roomId);
  updateInviteLink(state.roomId);
  updateSpiritUi(state.spirit);
  setStatus(`Connected to room ${state.roomId}`);
});

socket.on("room:update", (state) => {
  currentRoomId = state.roomId;
  desiredRoomId = state.roomId;
  roomInput.value = state.roomId;
  roomCodeDisplay.textContent = state.roomId;
  questionDisplay.textContent = state.question;
  renderPlayers(state.players);
  renderHistory(state.history);

  if (!isSpiritMoving) {
    updatePlanchette(state.cursor);
  }

  updateInviteLink(state.roomId);
  updateSpiritUi(state.spirit);
});

socket.on("cursor:update", (cursor) => {
  if (!isDragging && !isSpiritMoving) {
    updatePlanchette(cursor);
  }
});

socket.on("spirit:sequence", async (payload) => {
  await animateSpiritSequence(payload);
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallUi();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  updateInstallUi();
  setStatus("Ouija Online was installed on this device.");
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    dismissWelcomeScreen();
  }
});

const roomFromUrl = normalizeRoomId(new URLSearchParams(window.location.search).get("room"));

nameInput.value = getSavedName();
roomInput.value = roomFromUrl || generateRoomCode();
desiredRoomId = roomFromUrl;
updateInviteLink(roomInput.value);
updateSpiritUi(currentSpiritState);
updateInstallUi();
registerServiceWorker();
updatePlanchette(latestCursor);
