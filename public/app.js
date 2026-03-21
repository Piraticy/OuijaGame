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
const welcomeTitleElement = document.getElementById("welcome-title");
const welcomeCopyElement = document.getElementById("welcome-copy");
const welcomeFlashElement = document.getElementById("welcome-flash");
const welcomeStrobeElement = document.getElementById("welcome-strobe");
const welcomeOmenElement = document.getElementById("welcome-omen");
const welcomePlanchetteShadowElement = document.getElementById("welcome-planchette-shadow");

const NAME_STORAGE_KEY = "ouija-online-name";
const WELCOME_TITLES = [
  "It heard you.",
  "It woke up.",
  "It is waiting.",
  "Do not blink."
];
const WELCOME_LINES = [
  "Press enter.",
  "Do not ask twice.",
  "Keep the lights low.",
  "Something moved."
];
const WELCOME_WARNINGS = [
  "DON'T LOOK",
  "STAY STILL",
  "IT SEES",
  "TURN BACK",
  "TOO LATE",
  "NOT ALONE"
];
const WELCOME_BOARD_OMENS = [
  { x: 48, y: 68 },
  { x: 54, y: 66 },
  { x: 46, y: 64 },
  { x: 58, y: 62 },
  { x: 42, y: 60 }
];

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
let welcomeAudioState = {
  started: false,
  gain: null,
  nodes: [],
  loopTimer: null
};
let welcomeTimers = [];
let welcomeClosing = false;
let welcomeTitleResetTimer = null;
let welcomeTypingRun = 0;

function setStatus(text, isError = false) {
  connectionStatus.textContent = text;
  connectionStatus.classList.toggle("is-error", isError);
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function queueWelcomeTimer(callback, delay) {
  const timer = window.setTimeout(() => {
    welcomeTimers = welcomeTimers.filter((item) => item !== timer);
    callback();
  }, delay);

  welcomeTimers.push(timer);
}

function clearWelcomeTimers() {
  welcomeTimers.forEach((timer) => window.clearTimeout(timer));
  welcomeTimers = [];
  welcomeTypingRun += 1;

  if (welcomeTitleResetTimer) {
    window.clearTimeout(welcomeTitleResetTimer);
    welcomeTitleResetTimer = null;
  }
}

function setWelcomeCopyText(text) {
  if (!welcomeCopyElement) {
    return;
  }

  const value = String(text || "");
  welcomeCopyElement.textContent = value;
  welcomeCopyElement.dataset.text = value;
}

function distortWelcomeCopy() {
  if (!welcomeCopyElement || welcomeClosing) {
    return;
  }

  welcomeCopyElement.classList.add("is-distorted");

  queueWelcomeTimer(() => {
    if (!welcomeCopyElement) {
      return;
    }

    welcomeCopyElement.classList.remove("is-distorted");
  }, 170);
}

function flashWelcomeOverlay() {
  if (!welcomeFlashElement) {
    return;
  }

  welcomeFlashElement.classList.remove("is-active");
  void welcomeFlashElement.offsetWidth;
  welcomeFlashElement.classList.add("is-active");
}

function flashWelcomeStrobe(color = "white") {
  if (!welcomeStrobeElement || welcomeClosing) {
    return;
  }

  welcomeStrobeElement.classList.remove("is-active", "is-white", "is-red");
  welcomeStrobeElement.classList.add(color === "red" ? "is-red" : "is-white");
  void welcomeStrobeElement.offsetWidth;
  welcomeStrobeElement.classList.add("is-active");
}

function flickerWelcomeTitle() {
  if (!welcomeTitleElement || welcomeClosing) {
    return;
  }

  welcomeTitleElement.classList.remove("is-flicker");
  void welcomeTitleElement.offsetWidth;
  welcomeTitleElement.classList.add("is-flicker");
}

function flashWelcomeOmen(inverted = false) {
  if (!welcomeOmenElement || welcomeClosing) {
    return;
  }

  if (welcomeScreenElement) {
    welcomeScreenElement.classList.remove("is-shaking");
    void welcomeScreenElement.offsetWidth;
    welcomeScreenElement.classList.add("is-shaking");
  }

  welcomeOmenElement.classList.toggle("is-inverted", inverted);
  welcomeOmenElement.classList.remove("is-active");
  void welcomeOmenElement.offsetWidth;
  welcomeOmenElement.classList.add("is-active");
  flashWelcomeStrobe(inverted ? "white" : "red");
  playWelcomeBassHit(inverted ? 1.15 : 1);

  queueWelcomeTimer(() => {
    welcomeScreenElement?.classList.remove("is-shaking");
    welcomeOmenElement.classList.remove("is-inverted");
  }, 60);
}

function warnWelcomeTitle() {
  if (!welcomeTitleElement || welcomeClosing) {
    return;
  }

  const previousText = welcomeTitleElement.textContent;
  welcomeTitleElement.textContent = randomFrom(WELCOME_WARNINGS);
  flickerWelcomeTitle();
  distortWelcomeCopy();

  if (welcomeTitleResetTimer) {
    window.clearTimeout(welcomeTitleResetTimer);
  }

  welcomeTitleResetTimer = window.setTimeout(() => {
    welcomeTitleElement.textContent = previousText;
  }, randomBetween(260, 620));
}

function pulseWelcomeLine() {
  if (!welcomeCopyElement || welcomeClosing) {
    return;
  }

  setWelcomeCopyText(randomFrom(WELCOME_LINES));
  welcomeCopyElement.classList.add("is-pulsing");
  distortWelcomeCopy();
  playWelcomeWhisperPulse();

  queueWelcomeTimer(() => {
    welcomeCopyElement.classList.remove("is-pulsing");
  }, 220);
}

function typeWelcomeWhisper(text) {
  if (!welcomeCopyElement || welcomeClosing) {
    return;
  }

  const runId = ++welcomeTypingRun;
  const value = String(text || randomFrom(WELCOME_LINES)).toUpperCase();

  setWelcomeCopyText("");
  welcomeCopyElement.classList.add("is-pulsing");
  welcomeCopyElement.classList.add("is-distorted");
  playWelcomeWhisperPulse();

  Array.from(value).forEach((character, index) => {
    queueWelcomeTimer(() => {
      if (runId !== welcomeTypingRun || !welcomeCopyElement) {
        return;
      }

      setWelcomeCopyText((welcomeCopyElement.textContent || "") + character);

      if (character !== " " && Math.random() > 0.62) {
        playWelcomeWhisperPulse();
      }
    }, 26 * index + randomBetween(8, 34));
  });

  queueWelcomeTimer(() => {
    if (runId !== welcomeTypingRun || !welcomeCopyElement) {
      return;
    }

    welcomeCopyElement.classList.remove("is-pulsing");
    welcomeCopyElement.classList.remove("is-distorted");
  }, (26 * value.length) + 260);
}

function getWelcomeRoomCode() {
  return (roomInput?.value || desiredRoomId || "SEANCE").trim().toUpperCase();
}

function moveWelcomePlanchetteShadow(target) {
  if (!welcomePlanchetteShadowElement || welcomeClosing) {
    return;
  }

  welcomePlanchetteShadowElement.style.left = `${target.x}%`;
  welcomePlanchetteShadowElement.style.top = `${target.y}%`;
  welcomePlanchetteShadowElement.classList.add("is-active");
}

function clearWelcomePlanchetteShadow() {
  if (!welcomePlanchetteShadowElement) {
    return;
  }

  welcomePlanchetteShadowElement.classList.remove("is-active");
  welcomePlanchetteShadowElement.style.left = "50%";
  welcomePlanchetteShadowElement.style.top = "72%";
}

function fakeBoardMovement() {
  if (!welcomeScreenElement || welcomeScreenElement.classList.contains("is-hidden") || welcomeClosing) {
    return;
  }

  const omenPoint = randomFrom(WELCOME_BOARD_OMENS);
  const shadowPoint = {
    x: Math.max(8, Math.min(92, omenPoint.x + randomBetween(-10, 12))),
    y: Math.max(14, Math.min(84, omenPoint.y + randomBetween(-8, 10)))
  };

  updatePlanchette(omenPoint);
  boardElement.classList.add("is-welcome-moving");
  welcomeScreenElement.classList.add("is-board-omen");
  moveWelcomePlanchetteShadow(shadowPoint);
  distortWelcomeCopy();
  playWelcomeWhisperPulse();

  queueWelcomeTimer(() => {
    boardElement.classList.remove("is-welcome-moving");
    welcomeScreenElement.classList.remove("is-board-omen");
    updatePlanchette({ x: 50, y: 72 });
    clearWelcomePlanchetteShadow();
  }, 360);
}

function scheduleWelcomeScares() {
  clearWelcomeTimers();

  const runScare = () => {
    if (!welcomeScreenElement || welcomeScreenElement.classList.contains("is-hidden") || welcomeClosing) {
      return;
    }

    const roll = Math.random();

    if (roll < 0.18) {
      flickerWelcomeTitle();
    } else if (roll < 0.34) {
      warnWelcomeTitle();
    } else if (roll < 0.5) {
      pulseWelcomeLine();
    } else if (roll < 0.66) {
      typeWelcomeWhisper(randomFrom([
        "it is near",
        "do not turn",
        "it knows",
        "keep still"
      ]));
    } else if (roll < 0.78) {
      typeWelcomeWhisper(`ROOM ${getWelcomeRoomCode()}`);
      flashWelcomeStrobe(Math.random() > 0.5 ? "red" : "white");
    } else if (roll < 0.88) {
      fakeBoardMovement();
    } else {
      flickerWelcomeTitle();
      flashWelcomeOverlay();
      flashWelcomeOmen(Math.random() > 0.5);
      warnWelcomeTitle();
      typeWelcomeWhisper(randomFrom([
        "do not look back",
        "it is behind you",
        `I KNOW ${getWelcomeRoomCode()}`,
        "say goodbye now"
      ]));
      fakeBoardMovement();
    }

    queueWelcomeTimer(runScare, randomBetween(1200, 3200));
  };

  queueWelcomeTimer(runScare, randomBetween(700, 1800));
}

function seedWelcomeScreen() {
  if (!welcomeTitleElement || !welcomeCopyElement) {
    return;
  }

  welcomeTitleElement.textContent = randomFrom(WELCOME_TITLES);
  setWelcomeCopyText(randomFrom(WELCOME_LINES));
  scheduleWelcomeScares();
}

function dismissWelcomeScreen() {
  if (!welcomeScreenElement || welcomeClosing || welcomeScreenElement.classList.contains("is-hidden")) {
    stopWelcomeAudio();
    return;
  }

  clearWelcomeTimers();
  stopWelcomeAudio();
  flashWelcomeOverlay();
  flashWelcomeOmen(true);
  warnWelcomeTitle();
  typeWelcomeWhisper(`GOODBYE ${getWelcomeRoomCode()}`);
  updatePlanchette(BOARD_TARGETS.GOODBYE);
  moveWelcomePlanchetteShadow({
    x: Math.max(8, Math.min(92, BOARD_TARGETS.GOODBYE.x - 11)),
    y: Math.max(14, Math.min(84, BOARD_TARGETS.GOODBYE.y - 8))
  });
  boardElement.classList.add("is-welcome-moving");
  welcomeScreenElement.classList.add("is-jump");
  welcomeClosing = true;

  queueWelcomeTimer(() => {
    boardElement.classList.remove("is-welcome-moving");
    welcomeScreenElement.classList.add("is-hidden");
    welcomeScreenElement.classList.remove("is-jump");
    updatePlanchette({ x: 50, y: 72 });
    clearWelcomePlanchetteShadow();
  }, 420);
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

async function startWelcomeAudio() {
  if (welcomeAudioState.started) {
    return;
  }

  const ready = await ensureAudio();

  if (!ready || !audioContext) {
    return;
  }

  const gain = audioContext.createGain();
  const lowPass = audioContext.createBiquadFilter();
  const bandPass = audioContext.createBiquadFilter();
  const noiseSource = audioContext.createBufferSource();
  const noiseGain = audioContext.createGain();
  const drone = audioContext.createOscillator();
  const droneGain = audioContext.createGain();
  const undertone = audioContext.createOscillator();
  const undertoneGain = audioContext.createGain();
  const pulse = audioContext.createOscillator();
  const pulseGain = audioContext.createGain();
  const now = audioContext.currentTime;

  gain.gain.setValueAtTime(0.0001, now);
  gain.connect(audioContext.destination);

  lowPass.type = "lowpass";
  lowPass.frequency.value = 520;
  lowPass.Q.value = 0.5;
  lowPass.connect(gain);

  bandPass.type = "bandpass";
  bandPass.frequency.value = 720;
  bandPass.Q.value = 0.9;
  bandPass.connect(lowPass);

  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;
  noiseGain.gain.value = 0.026;
  noiseSource.connect(noiseGain);
  noiseGain.connect(bandPass);

  drone.type = "triangle";
  drone.frequency.setValueAtTime(52, now);
  droneGain.gain.value = 0.038;
  drone.connect(droneGain);
  droneGain.connect(lowPass);

  undertone.type = "sine";
  undertone.frequency.setValueAtTime(39, now);
  undertoneGain.gain.value = 0.018;
  undertone.connect(undertoneGain);
  undertoneGain.connect(lowPass);

  pulse.type = "sine";
  pulse.frequency.setValueAtTime(92, now);
  pulseGain.gain.setValueAtTime(0.0001, now);
  pulseGain.gain.linearRampToValueAtTime(0.016, now + 1.4);
  pulseGain.gain.linearRampToValueAtTime(0.0001, now + 4.8);
  pulse.connect(pulseGain);
  pulseGain.connect(lowPass);

  gain.gain.linearRampToValueAtTime(0.2, now + 1.1);

  noiseSource.start(now);
  drone.start(now);
  undertone.start(now);
  pulse.start(now);

  welcomeAudioState = {
    started: true,
    gain,
    nodes: [noiseSource, drone, undertone, pulse],
    loopTimer: null
  };

  scheduleWelcomeMusicLoop(220);
}

function playWelcomeMusicNote(frequency, startAt, duration, gainScale = 1) {
  if (!audioContext || !welcomeAudioState.started || !welcomeAudioState.gain) {
    return;
  }

  const voice = audioContext.createOscillator();
  const shadow = audioContext.createOscillator();
  const noteFilter = audioContext.createBiquadFilter();
  const voiceGain = audioContext.createGain();
  const shadowGain = audioContext.createGain();
  const endAt = startAt + duration;

  noteFilter.type = "lowpass";
  noteFilter.frequency.setValueAtTime(780, startAt);
  noteFilter.Q.value = 0.5;

  voice.type = "triangle";
  voice.frequency.setValueAtTime(frequency, startAt);
  voice.frequency.linearRampToValueAtTime(Math.max(48, frequency * 0.965), endAt);

  shadow.type = "sine";
  shadow.frequency.setValueAtTime(frequency * 0.5, startAt);
  shadow.frequency.linearRampToValueAtTime(Math.max(28, frequency * 0.48), endAt);

  voiceGain.gain.setValueAtTime(0.0001, startAt);
  voiceGain.gain.linearRampToValueAtTime(0.03 * gainScale, startAt + 0.22);
  voiceGain.gain.linearRampToValueAtTime(0.018 * gainScale, startAt + (duration * 0.62));
  voiceGain.gain.exponentialRampToValueAtTime(0.0001, endAt);

  shadowGain.gain.setValueAtTime(0.0001, startAt);
  shadowGain.gain.linearRampToValueAtTime(0.02 * gainScale, startAt + 0.18);
  shadowGain.gain.exponentialRampToValueAtTime(0.0001, endAt);

  voice.connect(voiceGain);
  shadow.connect(shadowGain);
  voiceGain.connect(noteFilter);
  shadowGain.connect(noteFilter);
  noteFilter.connect(welcomeAudioState.gain);

  voice.start(startAt);
  shadow.start(startAt);
  voice.stop(endAt + 0.08);
  shadow.stop(endAt + 0.08);
}

function scheduleWelcomeMusicLoop(delayMs = 0) {
  if (!audioContext || !welcomeAudioState.started || !welcomeAudioState.gain) {
    return;
  }

  if (welcomeAudioState.loopTimer) {
    window.clearTimeout(welcomeAudioState.loopTimer);
    welcomeAudioState.loopTimer = null;
  }

  const phrases = [
    [146.83, 174.61, 164.81, 130.81],
    [146.83, 146.83, 196.0, 174.61],
    [130.81, 164.81, 174.61, 146.83],
    [155.56, 185.0, 174.61, 138.59]
  ];

  const startPhrase = () => {
    if (!audioContext || !welcomeAudioState.started || !welcomeAudioState.gain) {
      return;
    }

    const phrase = randomFrom(phrases);
    const now = audioContext.currentTime + 0.05;

    phrase.forEach((frequency, index) => {
      const startAt = now + (index * 1.08);
      const duration = index === phrase.length - 1 ? 1.7 : 1.24;
      const gainScale = index === 0 ? 1.2 : 1;

      playWelcomeMusicNote(frequency, startAt, duration, gainScale);
    });

    if (Math.random() > 0.58) {
      window.setTimeout(() => {
        if (welcomeAudioState.started && !welcomeClosing) {
          playWelcomeWhisperPulse();
        }
      }, 900);
    }

    welcomeAudioState.loopTimer = window.setTimeout(() => {
      startPhrase();
    }, 4700);
  };

  welcomeAudioState.loopTimer = window.setTimeout(() => {
    startPhrase();
  }, delayMs);
}

function playWelcomeBassHit(intensity = 1) {
  if (!audioContext || !welcomeAudioState.started || !welcomeAudioState.gain) {
    return;
  }

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(58 * intensity, now);
  oscillator.frequency.exponentialRampToValueAtTime(34, now + 0.36);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

  oscillator.connect(gain);
  gain.connect(welcomeAudioState.gain);
  oscillator.start(now);
  oscillator.stop(now + 0.44);
}

function playWelcomeWhisperPulse() {
  if (!audioContext || !welcomeAudioState.started || !welcomeAudioState.gain || !noiseBuffer) {
    return;
  }

  const now = audioContext.currentTime;
  const source = audioContext.createBufferSource();
  const bandPass = audioContext.createBiquadFilter();
  const pulseGain = audioContext.createGain();
  const oscillator = audioContext.createOscillator();
  const oscillatorGain = audioContext.createGain();

  source.buffer = noiseBuffer;
  bandPass.type = "bandpass";
  bandPass.frequency.value = randomBetween(620, 980);
  bandPass.Q.value = 1.4;
  pulseGain.gain.setValueAtTime(0.0001, now);
  pulseGain.gain.exponentialRampToValueAtTime(0.013, now + 0.03);
  pulseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

  oscillator.type = Math.random() > 0.5 ? "sine" : "triangle";
  oscillator.frequency.setValueAtTime(randomBetween(180, 260), now);
  oscillator.frequency.linearRampToValueAtTime(randomBetween(120, 170), now + 0.4);
  oscillatorGain.gain.setValueAtTime(0.0001, now);
  oscillatorGain.gain.exponentialRampToValueAtTime(0.008, now + 0.04);
  oscillatorGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

  source.connect(bandPass);
  bandPass.connect(pulseGain);
  pulseGain.connect(welcomeAudioState.gain);
  oscillator.connect(oscillatorGain);
  oscillatorGain.connect(welcomeAudioState.gain);

  source.start(now);
  source.stop(now + 0.44);
  oscillator.start(now);
  oscillator.stop(now + 0.44);
}

function stopWelcomeAudio() {
  if (!audioContext || !welcomeAudioState.started || !welcomeAudioState.gain) {
    return;
  }

  const now = audioContext.currentTime;
  const gain = welcomeAudioState.gain;

  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

  if (welcomeAudioState.loopTimer) {
    window.clearTimeout(welcomeAudioState.loopTimer);
    welcomeAudioState.loopTimer = null;
  }

  window.setTimeout(() => {
    welcomeAudioState.nodes.forEach((node) => {
      try {
        node.stop?.();
      } catch (_error) {
        // Ignore nodes that were already stopped.
      }
      node.disconnect?.();
    });

    gain.disconnect?.();
    welcomeAudioState = {
      started: false,
      gain: null,
      nodes: [],
      loopTimer: null
    };
  }, 520);
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

welcomeScreenElement.addEventListener("pointerdown", () => {
  startWelcomeAudio();
}, { once: true });

welcomeScreenElement.addEventListener("pointermove", () => {
  startWelcomeAudio();
}, { once: true });

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
  if (!welcomeScreenElement.classList.contains("is-hidden")) {
    startWelcomeAudio();
  }

  if (event.key === "Enter" && !welcomeScreenElement.classList.contains("is-hidden")) {
    dismissWelcomeScreen();
    return;
  }

  if (event.key === "Escape") {
    dismissWelcomeScreen();
  }
});

const roomFromUrl = normalizeRoomId(new URLSearchParams(window.location.search).get("room"));

nameInput.value = getSavedName();
roomInput.value = roomFromUrl || generateRoomCode();
desiredRoomId = roomFromUrl;
seedWelcomeScreen();
updateInviteLink(roomInput.value);
updateSpiritUi(currentSpiritState);
updateInstallUi();
registerServiceWorker();
updatePlanchette(latestCursor);
