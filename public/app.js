const socket = io();

function createBoardTargets() {
  const targets = {
    YES: { x: 14, y: 13 },
    NO: { x: 86, y: 13 },
    HELLO: { x: 18, y: 85 },
    GOODBYE: { x: 82, y: 85 }
  };

  const addRow = (tokens, startX, endX, yValues) => {
    const step = (endX - startX) / Math.max(tokens.length - 1, 1);

    tokens.forEach((token, index) => {
      targets[token] = {
        x: Number((startX + (step * index)).toFixed(2)),
        y: Array.isArray(yValues) ? yValues[index] : yValues
      };
    });
  };

  addRow("ABCDEFGHIJKLM".split(""), 12, 88, [34, 32.2, 30.8, 29.6, 28.6, 27.8, 27.4, 27.8, 28.6, 29.6, 30.8, 32.2, 34]);
  addRow("NOPQRSTUVWXYZ".split(""), 12, 88, [45, 46.2, 47.3, 48.2, 49, 49.4, 49.6, 49.4, 49, 48.2, 47.3, 46.2, 45]);
  addRow("1234567890".split(""), 24, 76, [62.2, 61.3, 60.6, 60.1, 59.8, 59.8, 60.1, 60.6, 61.3, 62.2]);

  return targets;
}

const BOARD_TARGETS = createBoardTargets();

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
const spiritCardElement = document.getElementById("spirit-card");
const spiritStatusElement = document.getElementById("spirit-status");
const hauntingLevelElement = document.getElementById("haunting-level");
const spiritAnswerElement = document.getElementById("spirit-answer");
const toggleSoundButton = document.getElementById("toggle-sound");
const whisperLineElement = document.getElementById("whisper-line");
const staticBurstElement = document.getElementById("static-burst");
const installCardElement = document.getElementById("install-card");
const installStatusElement = document.getElementById("install-status");
const installAppButton = document.getElementById("install-app");
const installHelpElement = document.getElementById("install-help");
const welcomeScreenElement = document.getElementById("welcome-screen");
const enterSiteButton = document.getElementById("enter-site");
const welcomeTitleElement = document.getElementById("welcome-title");
const welcomeCopyElement = document.getElementById("welcome-copy");
const welcomeFlashElement = document.getElementById("welcome-flash");
const welcomeStrobeElement = document.getElementById("welcome-strobe");
const welcomeOmenElement = document.getElementById("welcome-omen");
const welcomePlanchetteShadowElement = document.getElementById("welcome-planchette-shadow");

const NAME_STORAGE_KEY = "ouija-online-name";
const LOCAL_VEIL_VISITS_KEY = "ouija-online-veil-visits";
const LOCAL_ROOM_VISITS_KEY = "ouija-online-room-visits";
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
const HAUNT_REVEAL_SEQUENCE = ["left", "right", "left", "right"];
const SOUND_PROFILES = [
  {
    droneFrequency: 48,
    undertoneFrequency: 34,
    pulseFrequency: 88,
    noiseGain: 0.022,
    droneGain: 0.034,
    undertoneGain: 0.016,
    phraseDelay: [4300, 5000],
    whisperChance: 0.34,
    bassChance: 0.12,
    suspenseChance: 0.18,
    staticChance: 0.08,
    phrases: [
      [146.83, 174.61, 164.81, 130.81],
      [155.56, 185.0, 164.81, 146.83]
    ]
  },
  {
    droneFrequency: 52,
    undertoneFrequency: 39,
    pulseFrequency: 92,
    noiseGain: 0.026,
    droneGain: 0.038,
    undertoneGain: 0.018,
    phraseDelay: [4500, 5300],
    whisperChance: 0.42,
    bassChance: 0.18,
    suspenseChance: 0.24,
    staticChance: 0.12,
    phrases: [
      [146.83, 146.83, 196.0, 174.61],
      [130.81, 164.81, 174.61, 146.83],
      [155.56, 185.0, 174.61, 138.59]
    ]
  },
  {
    droneFrequency: 44,
    undertoneFrequency: 31,
    pulseFrequency: 80,
    noiseGain: 0.02,
    droneGain: 0.032,
    undertoneGain: 0.014,
    phraseDelay: [5200, 6100],
    whisperChance: 0.28,
    bassChance: 0.08,
    suspenseChance: 0.14,
    staticChance: 0.06,
    phrases: [
      [130.81, 155.56, 174.61, 123.47],
      [138.59, 164.81, 174.61, 146.83]
    ]
  },
  {
    droneFrequency: 56,
    undertoneFrequency: 42,
    pulseFrequency: 96,
    noiseGain: 0.029,
    droneGain: 0.04,
    undertoneGain: 0.02,
    phraseDelay: [4000, 4700],
    whisperChance: 0.5,
    bassChance: 0.22,
    suspenseChance: 0.28,
    staticChance: 0.14,
    phrases: [
      [164.81, 196.0, 174.61, 146.83],
      [146.83, 174.61, 155.56, 123.47],
      [174.61, 207.65, 185.0, 146.83]
    ]
  }
];
const RESTING_CURSOR = { x: 50, y: 70 };

let currentRoomId = "";
let desiredRoomId = "";
let isDragging = false;
let isSpiritMoving = false;
let latestCursor = { x: 50, y: 70 };
let currentSpiritState = {
  enabled: true,
  active: false,
  name: "The Veil",
  lastAnswer: "",
  mood: "watchful",
  hauntingLevel: "Veiled"
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
  loopTimer: null,
  effectTimer: null,
  profile: randomFrom(SOUND_PROFILES)
};
let welcomeTimers = [];
let welcomeClosing = false;
let welcomeTitleResetTimer = null;
let welcomeTypingRun = 0;
let hauntingRevealTimer = null;
let hauntingTapTimer = null;
let hauntingTapProgress = 0;

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

function getLocalVeilVisits() {
  return Number(localStorage.getItem(LOCAL_VEIL_VISITS_KEY) || "0");
}

function getLocalRoomVisits() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ROOM_VISITS_KEY) || "{}");
  } catch (_error) {
    return {};
  }
}

function getLocalRoomVisitCount(roomId) {
  const visits = getLocalRoomVisits();
  return Number(visits[roomId] || 0);
}

function recordLocalVeilVisit(roomId, name) {
  const safeRoomId = normalizeRoomId(roomId);
  const visits = getLocalRoomVisits();
  const total = getLocalVeilVisits() + 1;

  localStorage.setItem(LOCAL_VEIL_VISITS_KEY, String(total));

  if (safeRoomId) {
    visits[safeRoomId] = Number(visits[safeRoomId] || 0) + 1;
    localStorage.setItem(LOCAL_ROOM_VISITS_KEY, JSON.stringify(visits));
  }

  if (name) {
    saveName(name);
  }
}

function queueWelcomeTimer(callback, delay) {
  const timer = window.setTimeout(() => {
    welcomeTimers = welcomeTimers.filter((item) => item !== timer);
    callback();
  }, delay);

  welcomeTimers.push(timer);
}

function getHauntingMix(level = "Veiled") {
  switch (level) {
    case "Attached":
      return { boardLevel: "Attached", musicGain: 0.085, welcomeGain: 0.125 };
    case "Awake":
      return { boardLevel: "Awake", musicGain: 0.07, welcomeGain: 0.11 };
    case "Watching":
      return { boardLevel: "Watching", musicGain: 0.06, welcomeGain: 0.095 };
    default:
      return { boardLevel: "Veiled", musicGain: 0.05, welcomeGain: 0.085 };
  }
}

function revealHauntingLevel() {
  if (!hauntingLevelElement) {
    return;
  }

  hauntingLevelElement.classList.add("is-revealed");

  if (hauntingRevealTimer) {
    window.clearTimeout(hauntingRevealTimer);
  }

  hauntingRevealTimer = window.setTimeout(() => {
    hauntingLevelElement.classList.remove("is-revealed");
    hauntingRevealTimer = null;
  }, 5200);
}

function resetHauntingTapSequence() {
  hauntingTapProgress = 0;

  if (hauntingTapTimer) {
    window.clearTimeout(hauntingTapTimer);
    hauntingTapTimer = null;
  }
}

function scheduleHauntingTapReset() {
  if (hauntingTapTimer) {
    window.clearTimeout(hauntingTapTimer);
  }

  hauntingTapTimer = window.setTimeout(() => {
    resetHauntingTapSequence();
  }, 1450);
}

function getSpiritTapZone(event) {
  if (!spiritCardElement) {
    return "center";
  }

  const rect = spiritCardElement.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;

  if (x <= 0.36) {
    return "left";
  }

  if (x >= 0.64) {
    return "right";
  }

  return "center";
}

function registerHauntingTap(event) {
  if (!spiritCardElement) {
    return;
  }

  const zone = getSpiritTapZone(event);
  const expectedZone = HAUNT_REVEAL_SEQUENCE[hauntingTapProgress];

  if (zone === expectedZone) {
    hauntingTapProgress += 1;
    scheduleHauntingTapReset();

    if (hauntingTapProgress >= HAUNT_REVEAL_SEQUENCE.length) {
      resetHauntingTapSequence();
      spiritCardElement.classList.remove("is-sequence-hit");
      void spiritCardElement.offsetWidth;
      spiritCardElement.classList.add("is-sequence-hit");
      revealHauntingLevel();
      window.setTimeout(() => {
        spiritCardElement.classList.remove("is-sequence-hit");
      }, 520);
    }

    return;
  }

  hauntingTapProgress = zone === HAUNT_REVEAL_SEQUENCE[0] ? 1 : 0;

  if (hauntingTapProgress > 0) {
    scheduleHauntingTapReset();
  } else {
    resetHauntingTapSequence();
  }
}

function applyHauntingPresence() {
  const mix = getHauntingMix(currentSpiritState.hauntingLevel);

  boardElement.dataset.hauntLevel = mix.boardLevel;
  document.body.dataset.hauntLevel = mix.boardLevel;

  if (masterGain && audioContext && soundEnabled) {
    masterGain.gain.setTargetAtTime(mix.musicGain, audioContext.currentTime, 0.45);
  }

  if (audioContext && welcomeAudioState.started && welcomeAudioState.gain && welcomeScreenElement.classList.contains("is-hidden")) {
    const now = audioContext.currentTime;
    welcomeAudioState.gain.gain.cancelScheduledValues(now);
    welcomeAudioState.gain.gain.setValueAtTime(Math.max(welcomeAudioState.gain.gain.value, 0.0001), now);
    welcomeAudioState.gain.gain.linearRampToValueAtTime(mix.welcomeGain, now + 0.8);
  }
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

function setWelcomeShadowFigure(active) {
  if (!welcomeScreenElement) {
    return;
  }

  welcomeScreenElement.classList.toggle("has-shadow-figure", Boolean(active));
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
    updatePlanchette({ x: 50, y: 70 });
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

    queueWelcomeTimer(runScare, randomBetween(2000, 4400));
  };

  queueWelcomeTimer(runScare, randomBetween(1200, 2600));
}

function seedWelcomeScreen() {
  if (!welcomeTitleElement || !welcomeCopyElement) {
    return;
  }

  welcomeTitleElement.textContent = randomFrom(WELCOME_TITLES);
  setWelcomeCopyText(randomFrom(WELCOME_LINES));
  setWelcomeShadowFigure(Math.random() < 0.16);

  const savedName = getSavedName();
  const roomCount = getLocalRoomVisitCount(getWelcomeRoomCode());
  const totalVisits = getLocalVeilVisits();

  if ((roomCount > 0 || totalVisits > 1) && savedName && savedName !== "Guest") {
    if (Math.random() < 0.22) {
      queueWelcomeTimer(() => {
        if (welcomeClosing || welcomeScreenElement.classList.contains("is-hidden")) {
          return;
        }

        const previousTitle = welcomeTitleElement.textContent;
        welcomeScreenElement.classList.remove("is-jump");
        void welcomeScreenElement.offsetWidth;
        welcomeScreenElement.classList.add("is-jump");
        welcomeTitleElement.textContent = savedName.toUpperCase();
        flickerWelcomeTitle();
        flashWelcomeStrobe(Math.random() > 0.5 ? "red" : "white");
        flashWelcomeOmen(Math.random() > 0.6);
        typeWelcomeWhisper(`I KNOW ${savedName}`);

        queueWelcomeTimer(() => {
          if (!welcomeClosing && !welcomeScreenElement.classList.contains("is-hidden")) {
            welcomeTitleElement.textContent = previousTitle;
            welcomeScreenElement.classList.remove("is-jump");
          }
        }, 540);
      }, randomBetween(950, 1800));
    }

    queueWelcomeTimer(() => {
      if (welcomeClosing || welcomeScreenElement.classList.contains("is-hidden")) {
        return;
      }

      typeWelcomeWhisper(randomFrom([
        `I REMEMBER ${savedName}`,
        `WELCOME BACK ${savedName}`,
        "THE VEIL REMEMBERS YOU"
      ]));
      flashWelcomeStrobe(Math.random() > 0.5 ? "red" : "white");
    }, randomBetween(850, 1450));
  }

  scheduleWelcomeScares();
}

function dismissWelcomeScreen() {
  if (!welcomeScreenElement || welcomeClosing || welcomeScreenElement.classList.contains("is-hidden")) {
    return;
  }

  clearWelcomeTimers();
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

  if (audioContext && welcomeAudioState.started && welcomeAudioState.gain) {
    const mix = getHauntingMix(currentSpiritState.hauntingLevel);
    const now = audioContext.currentTime;
    welcomeAudioState.gain.gain.cancelScheduledValues(now);
    welcomeAudioState.gain.gain.setValueAtTime(Math.max(welcomeAudioState.gain.gain.value, 0.0001), now);
    welcomeAudioState.gain.gain.linearRampToValueAtTime(mix.welcomeGain, now + 0.8);
  }

  if (masterGain && audioContext) {
    masterGain.gain.setTargetAtTime(getHauntingMix(currentSpiritState.hauntingLevel).musicGain, audioContext.currentTime, 0.45);
  }

  queueWelcomeTimer(() => {
    boardElement.classList.remove("is-welcome-moving");
    welcomeScreenElement.classList.add("is-hidden");
    welcomeScreenElement.classList.remove("is-jump");
    welcomeScreenElement.classList.remove("has-shadow-figure");
    updatePlanchette({ x: 50, y: 70 });
    clearWelcomePlanchetteShadow();
  }, 420);
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isSafariBrowser() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /safari/.test(userAgent) && !/crios|fxios|edgios|opr\//.test(userAgent);
}

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean(window.navigator.standalone);
}

function setInstallHelp(text = "", visible = false) {
  if (!installHelpElement) {
    return;
  }

  installHelpElement.hidden = !visible;
  installHelpElement.textContent = visible ? text : "";
}

function updateInstallUi() {
  if (!installCardElement || !installStatusElement || !installAppButton) {
    return;
  }

  if (isStandaloneMode()) {
    installCardElement.hidden = true;
    return;
  }

  installCardElement.hidden = false;
  installAppButton.disabled = false;

  if (deferredInstallPrompt) {
    installStatusElement.textContent = "Install on this device for a full-screen board and faster relaunch.";
    installAppButton.textContent = "Install";
    setInstallHelp();
    return;
  }

  if (isIosDevice()) {
    if (isSafariBrowser()) {
      installStatusElement.textContent = "On iPhone or iPad, install works from Safari with Add to Home Screen.";
      installAppButton.textContent = "Show Steps";
      setInstallHelp("1. Tap Share in Safari.\n2. Choose Add to Home Screen.\n3. If shown, keep Open as Web App on.");
      return;
    }

    installStatusElement.textContent = "On iPhone, install only works from Safari, not Firefox or Chrome.";
    installAppButton.textContent = "Safari Only";
    setInstallHelp("Open this same link in Safari, then use Share > Add to Home Screen.");
    return;
  }

  installStatusElement.textContent = "Install is available in supported browsers once the app is recognized as installable.";
  installAppButton.textContent = "Install";
  setInstallHelp();
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
    if (isSafariBrowser()) {
      installStatusElement.textContent =
        "In Safari, tap Share, then Add to Home Screen to install Ouija Online.";
      setInstallHelp("1. Tap Share.\n2. Tap Add to Home Screen.\n3. Save it, then open it from the Home Screen.");
      setStatus("Safari on iPhone needs Share > Add to Home Screen for install.");
      return;
    }

    installStatusElement.textContent =
      "Open this page in Safari first. iPhone browsers cannot trigger install directly.";
    setInstallHelp("Copy this link into Safari, then use Share > Add to Home Screen.");
    setStatus("iPhone install only works from Safari.", true);
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

  const profile = welcomeAudioState.profile || randomFrom(SOUND_PROFILES);
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
  noiseGain.gain.value = profile.noiseGain;
  noiseSource.connect(noiseGain);
  noiseGain.connect(bandPass);

  drone.type = "triangle";
  drone.frequency.setValueAtTime(profile.droneFrequency, now);
  droneGain.gain.value = profile.droneGain;
  drone.connect(droneGain);
  droneGain.connect(lowPass);

  undertone.type = "sine";
  undertone.frequency.setValueAtTime(profile.undertoneFrequency, now);
  undertoneGain.gain.value = profile.undertoneGain;
  undertone.connect(undertoneGain);
  undertoneGain.connect(lowPass);

  pulse.type = "sine";
  pulse.frequency.setValueAtTime(profile.pulseFrequency, now);
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
    loopTimer: null,
    effectTimer: null,
    profile
  };

  soundEnabled = true;
  if (masterGain) {
    masterGain.gain.setTargetAtTime(0.085, audioContext.currentTime, 0.45);
  }
  toggleSoundButton.textContent = "Sound On";
  scheduleWelcomeMusicLoop(220);
  scheduleAmbientMusicEffects();
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

  const profile = welcomeAudioState.profile || randomFrom(SOUND_PROFILES);

  if (welcomeAudioState.loopTimer) {
    window.clearTimeout(welcomeAudioState.loopTimer);
    welcomeAudioState.loopTimer = null;
  }

  const startPhrase = () => {
    if (!audioContext || !welcomeAudioState.started || !welcomeAudioState.gain) {
      return;
    }

    const phrase = randomFrom(profile.phrases);
    const now = audioContext.currentTime + 0.05;

    phrase.forEach((frequency, index) => {
      const startAt = now + (index * 1.08);
      const duration = index === phrase.length - 1 ? 1.7 : 1.24;
      const gainScale = index === 0 ? 1.2 : 1;

      playWelcomeMusicNote(frequency, startAt, duration, gainScale);
    });

    if (Math.random() < profile.whisperChance) {
      window.setTimeout(() => {
        if (welcomeAudioState.started) {
          playWelcomeWhisperPulse();
        }
      }, randomBetween(700, 1300));
    }

    welcomeAudioState.loopTimer = window.setTimeout(() => {
      startPhrase();
    }, randomBetween(profile.phraseDelay[0], profile.phraseDelay[1]));
  };

  welcomeAudioState.loopTimer = window.setTimeout(() => {
    startPhrase();
  }, delayMs);
}

function scheduleAmbientMusicEffects() {
  if (!audioContext || !welcomeAudioState.started || !welcomeAudioState.gain) {
    return;
  }

  const profile = welcomeAudioState.profile || randomFrom(SOUND_PROFILES);

  if (welcomeAudioState.effectTimer) {
    window.clearTimeout(welcomeAudioState.effectTimer);
    welcomeAudioState.effectTimer = null;
  }

  const loopEffects = () => {
    if (!audioContext || !welcomeAudioState.started || !welcomeAudioState.gain) {
      return;
    }

    if (Math.random() < profile.whisperChance) {
      playWelcomeWhisperPulse();
    }

    if (Math.random() < profile.bassChance) {
      playWelcomeBassHit(0.8 + Math.random() * 0.45);
    }

    if (
      !welcomeScreenElement.classList.contains("is-hidden") &&
      Math.random() < (profile.suspenseChance || 0.18)
    ) {
      playWelcomeSuspenseRise(0.92 + (Math.random() * 0.3));
    } else if (
      welcomeScreenElement.classList.contains("is-hidden") &&
      Math.random() < ((profile.suspenseChance || 0.18) * 0.34)
    ) {
      playWelcomeSuspenseRise(0.72 + (Math.random() * 0.18));
    }

    if (!welcomeScreenElement.classList.contains("is-hidden") && Math.random() < profile.staticChance) {
      flashWelcomeStrobe(Math.random() > 0.45 ? "red" : "white");
    } else if (welcomeScreenElement.classList.contains("is-hidden") && Math.random() < profile.staticChance) {
      triggerStaticBurst(randomBetween(1, 2));
    }

    welcomeAudioState.effectTimer = window.setTimeout(loopEffects, randomBetween(4200, 9200));
  };

  welcomeAudioState.effectTimer = window.setTimeout(loopEffects, randomBetween(2600, 5200));
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

function playWelcomeSuspenseRise(intensity = 1) {
  if (!audioContext || !welcomeAudioState.started || !welcomeAudioState.gain) {
    return;
  }

  const now = audioContext.currentTime;
  const rise = audioContext.createOscillator();
  const shadow = audioContext.createOscillator();
  const riseGain = audioContext.createGain();
  const shadowGain = audioContext.createGain();
  const bandPass = audioContext.createBiquadFilter();
  const duration = 1.8 + (Math.random() * 0.8);
  const endAt = now + duration;

  bandPass.type = "bandpass";
  bandPass.frequency.setValueAtTime(540, now);
  bandPass.frequency.linearRampToValueAtTime(1100, endAt);
  bandPass.Q.value = 1.1;

  rise.type = "sawtooth";
  rise.frequency.setValueAtTime(78 * intensity, now);
  rise.frequency.exponentialRampToValueAtTime(182 * intensity, endAt);
  riseGain.gain.setValueAtTime(0.0001, now);
  riseGain.gain.linearRampToValueAtTime(0.016 * intensity, now + 0.55);
  riseGain.gain.linearRampToValueAtTime(0.028 * intensity, endAt - 0.18);
  riseGain.gain.exponentialRampToValueAtTime(0.0001, endAt);

  shadow.type = "triangle";
  shadow.frequency.setValueAtTime(46 * intensity, now);
  shadow.frequency.exponentialRampToValueAtTime(92 * intensity, endAt);
  shadowGain.gain.setValueAtTime(0.0001, now);
  shadowGain.gain.linearRampToValueAtTime(0.01 * intensity, now + 0.44);
  shadowGain.gain.exponentialRampToValueAtTime(0.0001, endAt);

  rise.connect(riseGain);
  shadow.connect(shadowGain);
  riseGain.connect(bandPass);
  shadowGain.connect(bandPass);
  bandPass.connect(welcomeAudioState.gain);

  rise.start(now);
  shadow.start(now);
  rise.stop(endAt + 0.06);
  shadow.stop(endAt + 0.06);
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

  if (welcomeAudioState.effectTimer) {
    window.clearTimeout(welcomeAudioState.effectTimer);
    welcomeAudioState.effectTimer = null;
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
      loopTimer: null,
      effectTimer: null,
      profile: randomFrom(SOUND_PROFILES)
    };
  }, 520);
}

function attemptAutoStartAudio() {
  startWelcomeAudio().catch(() => {
    // Browsers may still block audio until a user gesture.
  });
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
  const safeCursor = {
    x: Math.max(10, Math.min(90, Number(cursor?.x ?? RESTING_CURSOR.x))),
    y: Math.max(10, Math.min(88, Number(cursor?.y ?? RESTING_CURSOR.y)))
  };

  latestCursor = safeCursor;
  planchetteElement.style.left = `${safeCursor.x}%`;
  planchetteElement.style.top = `${safeCursor.y}%`;
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
  const isActive = Boolean(currentSpiritState.active);
  const lastAnswer = currentSpiritState.lastAnswer || "No reply yet.";

  toggleSpiritButton.textContent = "Always On";
  toggleSpiritButton.disabled = true;
  spiritStatusElement.textContent = isActive
    ? `${currentSpiritState.name} answers now.`
    : `${currentSpiritState.name} listens.`;
  if (hauntingLevelElement) {
    hauntingLevelElement.textContent = `Haunting level: ${currentSpiritState.hauntingLevel || "Veiled"}.`;
  }
  spiritAnswerElement.textContent = lastAnswer;
  applyHauntingPresence();
  setWhisperLine(
    isActive
      ? `${currentSpiritState.name} moves beneath your hands.`
      : `${currentSpiritState.name} waits in the static.`
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
    x: Math.max(10, Math.min(90, x)),
    y: Math.max(10, Math.min(88, y))
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
    masterGain.gain.setTargetAtTime(getHauntingMix(currentSpiritState.hauntingLevel).musicGain, audioContext.currentTime, 0.35);
    await startWelcomeAudio();
    toggleSoundButton.textContent = "Sound On";
    setStatus("Haunted score enabled.");
    return;
  }

  soundEnabled = false;

  if (masterGain && audioContext) {
    masterGain.gain.setTargetAtTime(0.0001, audioContext.currentTime, 0.2);
  }

  stopWelcomeAudio();
  toggleSoundButton.textContent = "Sound Off";
  setStatus("Haunted score muted.");
}

async function animateSpiritSequence({
  mode = "answer",
  answer,
  sequence,
  whisper,
  stepMs = 520,
  settleMs = 900,
  omenLevel = 1,
  restingCursor = RESTING_CURSOR
}) {
  const runId = ++spiritAnimationRun;
  isSpiritMoving = true;
  setHauntingVisuals(true);
  spiritStatusElement.textContent = mode === "prompt"
    ? `${currentSpiritState.name} is asking from the dark...`
    : `${currentSpiritState.name} is spelling out an answer...`;
  setWhisperLine(
    whisper || (mode === "prompt" ? "The board moves without your hands." : "A hush moves across the board.")
  );
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

  if (mode === "prompt") {
    questionDisplay.textContent = answer;
  }
  await wait(settleMs);

  if (runId !== spiritAnimationRun) {
    return;
  }

  updatePlanchette(restingCursor || RESTING_CURSOR);
  await wait(240);

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
  setStatus("The Veil is always listening in every room.");
});

toggleSoundButton.addEventListener("click", () => {
  toggleSound();
});

if (installAppButton) {
  installAppButton.addEventListener("click", () => {
    handleInstallClick();
  });
}

enterSiteButton.addEventListener("click", () => {
  dismissWelcomeScreen();
});

welcomeScreenElement.addEventListener("pointerdown", () => {
  attemptAutoStartAudio();
}, { once: true });

welcomeScreenElement.addEventListener("pointermove", () => {
  attemptAutoStartAudio();
}, { once: true });

if (spiritCardElement) {
  spiritCardElement.addEventListener("pointerup", registerHauntingTap);
}

document.addEventListener("touchstart", attemptAutoStartAudio, { once: true, passive: true });
document.addEventListener("pointerdown", attemptAutoStartAudio, { once: true });
document.addEventListener("click", attemptAutoStartAudio, { once: true });
window.addEventListener("focus", attemptAutoStartAudio, { once: true });
window.addEventListener("pageshow", attemptAutoStartAudio, { once: true });

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    attemptAutoStartAudio();
  }
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
  planchetteElement.classList.add("is-dragging");
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
  planchetteElement.classList.remove("is-dragging");
  planchetteElement.releasePointerCapture(event.pointerId);
});

planchetteElement.addEventListener("pointercancel", (event) => {
  isDragging = false;
  planchetteElement.classList.remove("is-dragging");
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
  recordLocalVeilVisit(state.roomId, nameInput.value.trim().slice(0, 18) || "Guest");
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
    attemptAutoStartAudio();
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
attemptAutoStartAudio();
updateInviteLink(roomInput.value);
updateSpiritUi(currentSpiritState);
updateInstallUi();
registerServiceWorker();
updatePlanchette(latestCursor);
