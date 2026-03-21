const path = require("path");
const fs = require("fs");
const http = require("http");
const express = require("express");
const { DatabaseSync } = require("node:sqlite");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "veil-memory.sqlite");

const rooms = new Map();
const hauntRegistry = new Map();
const SPIRIT_NAME = "The Veil";
const MAX_HISTORY = 20;

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS haunt_rooms (
    room_id TEXT PRIMARY KEY,
    visits INTEGER NOT NULL DEFAULT 0,
    mood TEXT NOT NULL,
    last_seen_at INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS haunt_names (
    room_id TEXT NOT NULL,
    name TEXT NOT NULL,
    seen_count INTEGER NOT NULL DEFAULT 0,
    last_seen_at INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (room_id, name)
  );
  CREATE TABLE IF NOT EXISTS haunt_room_words (
    room_id TEXT NOT NULL,
    word TEXT NOT NULL,
    seen_count INTEGER NOT NULL DEFAULT 0,
    last_name TEXT,
    updated_at INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (room_id, word)
  );
`);

const selectRoomStmt = db.prepare(
  "SELECT room_id, visits, mood, last_seen_at FROM haunt_rooms WHERE room_id = ?"
);
const insertRoomStmt = db.prepare(
  "INSERT INTO haunt_rooms (room_id, visits, mood, last_seen_at) VALUES (?, ?, ?, ?)"
);
const updateRoomVisitStmt = db.prepare(
  "UPDATE haunt_rooms SET visits = ?, last_seen_at = ? WHERE room_id = ?"
);
const selectNamesStmt = db.prepare(
  "SELECT name, seen_count FROM haunt_names WHERE room_id = ?"
);
const selectNameStmt = db.prepare(
  "SELECT seen_count FROM haunt_names WHERE room_id = ? AND name = ?"
);
const upsertNameStmt = db.prepare(`
  INSERT INTO haunt_names (room_id, name, seen_count, last_seen_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(room_id, name) DO UPDATE SET
    seen_count = excluded.seen_count,
    last_seen_at = excluded.last_seen_at
`);
const selectWordsStmt = db.prepare(
  "SELECT word, seen_count, last_name FROM haunt_room_words WHERE room_id = ? ORDER BY seen_count DESC, updated_at DESC LIMIT 6"
);
const selectWordStmt = db.prepare(
  "SELECT seen_count, last_name FROM haunt_room_words WHERE room_id = ? AND word = ?"
);
const upsertWordStmt = db.prepare(`
  INSERT INTO haunt_room_words (room_id, word, seen_count, last_name, updated_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(room_id, word) DO UPDATE SET
    seen_count = excluded.seen_count,
    last_name = excluded.last_name,
    updated_at = excluded.updated_at
`);

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
const SPIRIT_REST_CURSOR = { x: 50, y: 73 };

const RESPONSE_LIBRARY = {
  certainty: ["YES", "NO", "NOT YET", "LATER"],
  presence: ["I AM HERE", "ALWAYS", "IN SHADOW"],
  identity: ["THE VEIL", "NO NAME", "ONLY ECHOES"],
  intent: ["TO BE HEARD", "TO REMEMBER", "TO WATCH"],
  hunger: ["ALWAYS", "I HUNGER", "FOR LIGHT", "FOR NAMES"],
  feeling: ["COLD MEMORY", "QUIET DREAD", "HEAVY AIR"],
  warning: ["STAY IN LIGHT", "KEEP QUIET", "DO NOT RUSH"],
  time: ["AT MIDNIGHT", "WHEN RAIN FALLS", "AFTER THE BELL"],
  closing: ["GOODBYE", "CLOSE THE BOARD", "ENOUGH FOR NOW"],
  default: ["THE VEIL THINS", "ONLY STATIC", "ASK AGAIN", "QUIET NOW"]
};

const SPIRIT_MOODS = {
  watchful: {
    presence: ["YES", "I AM HERE", "I SEE YOU", "WITH YOU"],
    identity: ["THE VEIL", "THE WATCHER", "ONLY THE VEIL"],
    intent: ["TO WATCH", "TO BE HEARD", "TO LISTEN"],
    repeat: ["YOU ASKED TWICE", "I STILL WAIT", "STILL YES"],
    default: ["THE VEIL THINS", "ONLY STATIC", "I REMAIN"]
  },
  hostile: {
    presence: ["YES", "BEHIND YOU", "CLOSER THAN BREATH", "I AM HERE"],
    identity: ["THE VEIL", "NO TRUE NAME", "DON'T NAME ME"],
    intent: ["TO COME CLOSER", "TO BE LET IN", "TO TAKE MORE"],
    repeat: ["STOP ASKING", "I HEARD YOU", "DO NOT ASK TWICE"],
    default: ["KEEP DISTANCE", "DO NOT WAIT", "NOT SAFE"]
  },
  mournful: {
    presence: ["YES", "I AM HERE", "STILL HERE", "NOT GONE"],
    identity: ["THE VEIL", "ONLY ECHOES", "A LOST NAME"],
    intent: ["TO REMEMBER", "TO BE HEARD", "TO BE FOUND"],
    repeat: ["YOU ASKED AGAIN", "I AM STILL HERE", "ASK SOFTER"],
    default: ["COLD MEMORY", "HEAVY AIR", "QUIET NOW"]
  },
  hungry: {
    presence: ["YES", "WITH YOU", "I AM HERE", "LET ME IN"],
    identity: ["THE VEIL", "HUNGER", "NO TRUE NAME"],
    intent: ["TO BE LET IN", "TO TAKE LIGHT", "ONE MORE QUESTION"],
    repeat: ["MORE QUESTIONS", "AGAIN", "I HEARD YOU"],
    default: ["STAY LONGER", "ONE MORE QUESTION", "THE DOOR IS THIN"]
  }
};

const ROOM_WORD_LIBRARY = {
  door: {
    presence: ["YES AT THE DOOR", "YES BY THE DOOR", "AT THE DOOR"],
    location: ["AT THE DOOR", "BEHIND THE DOOR", "KEEP THE DOOR SHUT"],
    warning: ["DO NOT OPEN", "LOCK THE DOOR", "KEEP IT SHUT"],
    intent: ["YOU OPENED THE DOOR", "LET ME THROUGH", "THE DOOR IS THIN"]
  },
  mirror: {
    presence: ["YES IN THE MIRROR", "YES BEHIND THE GLASS", "IN THE MIRROR"],
    location: ["IN THE MIRROR", "BEHIND THE GLASS", "DO NOT FACE THE MIRROR"],
    warning: ["COVER THE MIRROR", "DO NOT LOOK LONG", "THE MIRROR IS OPEN"],
    intent: ["LOOK IN THE MIRROR", "THE GLASS REMEMBERS", "I MOVE IN REFLECTION"]
  },
  hall: {
    presence: ["YES IN THE HALL", "IN THE HALL", "LISTEN TO THE HALL"],
    location: ["IN THE HALL", "PAST THE HALL", "AT THE END OF THE HALL"],
    warning: ["DO NOT FOLLOW THE HALL", "LEAVE THE HALL DARK", "THE HALL HEARS"],
    intent: ["WALK THE HALL", "THE HALL CALLED", "THE HALL IS EMPTY"]
  },
  bed: {
    presence: ["YES BY THE BED", "UNDER THE BED", "BESIDE THE BED"],
    location: ["UNDER THE BED", "BESIDE THE BED", "DO NOT LOOK UNDER"],
    warning: ["DO NOT LOOK UNDER", "KEEP YOUR FEET UP", "LEAVE THE BED LIT"],
    intent: ["LOOK UNDER THE BED", "THE BED HIDES ME", "I WAIT BELOW"]
  },
  closet: {
    presence: ["YES IN THE CLOSET", "INSIDE THE CLOSET", "THE CLOSET BREATHES"],
    location: ["IN THE CLOSET", "BEHIND THE CLOTHES", "AT THE CLOSET DOOR"],
    warning: ["DO NOT OPEN THE CLOSET", "LEAVE IT SHUT", "DO NOT LISTEN"],
    intent: ["OPEN THE CLOSET", "I WAIT INSIDE", "THE CLOSET IS THIN"]
  },
  stairs: {
    presence: ["YES ON THE STAIRS", "AT THE STAIRS", "COUNT THE STAIRS"],
    location: ["ON THE STAIRS", "BENEATH THE STAIRS", "AT THE TOP STEP"],
    warning: ["DO NOT GO DOWN", "DO NOT CLIMB", "COUNT THEM AGAIN"],
    intent: ["COME DOWNSTAIRS", "I WAIT BELOW", "THE STEPS REMEMBER"]
  }
};

const QUESTION_STOP_WORDS = new Set([
  "a",
  "am",
  "an",
  "and",
  "are",
  "be",
  "can",
  "could",
  "did",
  "do",
  "does",
  "for",
  "from",
  "have",
  "how",
  "i",
  "if",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "our",
  "should",
  "tell",
  "that",
  "the",
  "there",
  "they",
  "this",
  "to",
  "us",
  "was",
  "we",
  "what",
  "when",
  "where",
  "who",
  "why",
  "will",
  "with",
  "would",
  "you",
  "your"
]);

function createRoomState(roomId) {
  const haunting = getHaunting(roomId);
  haunting.visits += 1;
  haunting.lastSeenAt = Date.now();
  updateRoomVisitStmt.run(haunting.visits, haunting.lastSeenAt, roomId);

  return {
    roomId,
    players: new Map(),
    cursor: { x: SPIRIT_REST_CURSOR.x, y: SPIRIT_REST_CURSOR.y },
    question: "Ask, and The Veil will answer.",
    history: [],
    spirit: {
      enabled: true,
      active: false,
      name: SPIRIT_NAME,
      lastAnswer: "",
      mood: haunting.mood,
      memory: []
    },
    timers: new Set()
  };
}

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, createRoomState(roomId));
  }

  return rooms.get(roomId);
}

function getHauntingLevel(roomId) {
  const haunting = getHaunting(roomId);
  const namesScore = haunting.seenNames.size;
  const wordsScore = haunting.rememberedWords.size;
  const total = haunting.visits + namesScore + wordsScore;

  if (total >= 10) {
    return "Attached";
  }

  if (total >= 6) {
    return "Awake";
  }

  if (total >= 3) {
    return "Watching";
  }

  return "Veiled";
}

function getPublicState(room) {
  const players = Array.from(room.players.values());

  if (room.spirit.enabled) {
    players.push({
      id: "spirit",
      name: room.spirit.name,
      kind: "spirit",
      connectedAt: Date.now()
    });
  }

  return {
    roomId: room.roomId,
    cursor: room.cursor,
    question: room.question,
    history: room.history.slice(-10),
    players,
    spirit: {
      enabled: room.spirit.enabled,
      active: room.spirit.active,
      name: room.spirit.name,
      lastAnswer: room.spirit.lastAnswer,
      mood: room.spirit.mood,
      hauntingLevel: getHauntingLevel(room.roomId)
    }
  };
}

function sanitizeName(name) {
  return String(name || "Guest")
    .trim()
    .slice(0, 18) || "Guest";
}

function sanitizeRoomId(roomId) {
  return String(roomId || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

function sanitizeQuestion(question) {
  return String(question || "")
    .trim()
    .slice(0, 120);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function trimHistory(room) {
  room.history = room.history.slice(-MAX_HISTORY);
}

function clearRoomTimers(room) {
  room.timers.forEach((timer) => clearTimeout(timer));
  room.timers.clear();
}

function addRoomTimer(room, callback, delay) {
  const timer = setTimeout(() => {
    room.timers.delete(timer);
    callback();
  }, delay);

  room.timers.add(timer);
}

function broadcastRoom(room) {
  io.to(room.roomId).emit("room:update", getPublicState(room));
}

function chooseRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function chooseWeighted(entries) {
  const total = entries.reduce((sum, entry) => sum + entry[1], 0);
  let roll = Math.random() * total;

  for (const [value, weight] of entries) {
    roll -= weight;

    if (roll <= 0) {
      return value;
    }
  }

  return entries[entries.length - 1][0];
}

function createHaunting(roomId) {
  const row = selectRoomStmt.get(roomId);
  const mood = row?.mood || chooseRandom(Object.keys(SPIRIT_MOODS));

  if (!row) {
    insertRoomStmt.run(roomId, 0, mood, 0);
  }

  const seenNames = new Map(
    selectNamesStmt.all(roomId).map((entry) => [entry.name, entry.seen_count])
  );
  const rememberedWords = new Map(
    selectWordsStmt.all(roomId).map((entry) => [entry.word, {
      count: entry.seen_count,
      lastName: entry.last_name || ""
    }])
  );

  return {
    roomId,
    visits: row?.visits || 0,
    mood,
    seenNames,
    lastQuestioners: [],
    lastSeenAt: row?.last_seen_at || 0,
    rememberedWords
  };
}

function getHaunting(roomId) {
  if (!hauntRegistry.has(roomId)) {
    hauntRegistry.set(roomId, createHaunting(roomId));
  }

  return hauntRegistry.get(roomId);
}

function normalizeQuestionKey(question) {
  return String(question || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function detectRoomWord(question) {
  const value = String(question || "").toLowerCase();

  if (/\bmirror|glass\b/.test(value)) {
    return "mirror";
  }

  if (/\bdoor|doorway\b/.test(value)) {
    return "door";
  }

  if (/\bhall|hallway\b/.test(value)) {
    return "hall";
  }

  if (/\bbed\b/.test(value)) {
    return "bed";
  }

  if (/\bcloset\b/.test(value)) {
    return "closet";
  }

  if (/\bstairs|staircase|step\b/.test(value)) {
    return "stairs";
  }

  return "";
}

function rememberQuestion(room, question) {
  const roomWord = detectRoomWord(question);

  room.spirit.memory.push({
    raw: question,
    key: normalizeQuestionKey(question),
    roomWord
  });
  room.spirit.memory = room.spirit.memory.slice(-3);

  return roomWord;
}

function rememberPlayer(roomId, name) {
  const haunting = getHaunting(roomId);
  const safeName = sanitizeName(name);
  const seenCount = selectNameStmt.get(roomId, safeName)?.seen_count || 0;
  const nextCount = seenCount + 1;
  const now = Date.now();

  haunting.seenNames.set(safeName, nextCount);
  haunting.lastSeenAt = now;
  upsertNameStmt.run(roomId, safeName, nextCount, now);

  return seenCount;
}

function rememberQuestioner(roomId, name) {
  const haunting = getHaunting(roomId);
  const safeName = sanitizeName(name);

  haunting.lastQuestioners = haunting.lastQuestioners
    .filter((entry) => entry !== safeName)
    .concat(safeName)
    .slice(-3);
}

function rememberRoomWord(roomId, word, name) {
  if (!word) {
    return;
  }

  const haunting = getHaunting(roomId);
  const current = selectWordStmt.get(roomId, word);
  const nextCount = (current?.seen_count || 0) + 1;
  const safeName = sanitizeName(name);
  const now = Date.now();

  haunting.rememberedWords.set(word, {
    count: nextCount,
    lastName: safeName
  });
  upsertWordStmt.run(roomId, word, nextCount, safeName, now);
}

function getMoodPack(room) {
  return SPIRIT_MOODS[room.spirit.mood] || SPIRIT_MOODS.watchful;
}

function chooseMoodLine(room, key) {
  const pack = getMoodPack(room);
  return chooseRandom(pack[key] || pack.default);
}

function createRoomWordResponse(roomWord, mode) {
  if (!roomWord || !ROOM_WORD_LIBRARY[roomWord]) {
    return null;
  }

  return chooseRandom(ROOM_WORD_LIBRARY[roomWord][mode] || ROOM_WORD_LIBRARY[roomWord].location);
}

function tokenizeAnswer(answer) {
  return answer
    .toUpperCase()
    .split(/\s+/)
    .flatMap((word) => {
      if (BOARD_TARGETS[word]) {
        return [word];
      }

      return word
        .replace(/[^A-Z0-9]/g, "")
        .split("")
        .filter((token) => BOARD_TARGETS[token]);
    })
    .slice(0, 18);
}

function toBoardWord(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
}

function buildPhrase(...parts) {
  return parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractQuestionProfile(question) {
  const lowerQuestion = String(question || "").toLowerCase();
  const words = String(question || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const subjects = words
    .filter((word) => word.length > 2)
    .filter((word) => !QUESTION_STOP_WORDS.has(word));

  const primaryWord = toBoardWord(subjects[0]);
  const secondaryWord = toBoardWord(subjects[1]);

  return {
    words,
    primaryWord,
    secondaryWord,
    asksDirectPresence: /\b(is anyone there|are you there|are you here|is anybody there|can you hear me|do you hear me)\b/.test(
      lowerQuestion
    ),
    asksName: /\b(what is your name|what's your name|who are you|tell me your name)\b/.test(
      lowerQuestion
    ),
    asksAge: /\b(how old are you|your age|what age are you)\b/.test(lowerQuestion),
    asksRememberMe: /\b(do you remember me|remember me|have we met|seen me before|do you know me)\b/.test(
      lowerQuestion
    ),
    asksIntent: /\b(what do you want|why are you here|what do you need|why did you come)\b/.test(
      lowerQuestion
    ),
    asksLocation: /\b(where are you|where do you hide|where should i look)\b/.test(lowerQuestion),
    asksTemper: /\b(are you evil|are you bad|are you friendly|are you good)\b/.test(lowerQuestion),
    asksHunger: /\b(are you hungry|are you starving|do you hunger|what are you hungry for|who are you hungry for|do you want to eat|do you want to feed)\b/.test(
      lowerQuestion
    ),
    mentionsHunger: /\b(hungry|starving|hunger|feed|eat|devour|consume)\b/.test(lowerQuestion),
    mentionsDoorway: /\bdoor|window|closet|hall|hallway|stairs|attic|basement|room|bed|mirror\b/.test(
      lowerQuestion
    ),
    mentionsPerson: /\bmother|father|mom|dad|sister|brother|friend|girl|boy|man|woman|child|name\b/.test(
      lowerQuestion
    ),
    asksSafety: /\bhelp|safe|scared|afraid|danger|leave|run\b/.test(lowerQuestion),
    asksTime: /\bwhen|time|night|midnight|hour|clock\b/.test(lowerQuestion),
    asksIdentity: /\bwho|name|what are you\b/.test(lowerQuestion),
    asksPresence: /\bare you|is someone|here|with me|in my\b/.test(lowerQuestion)
  };
}

function createSubjectResponse(profile) {
  const subject = profile.primaryWord;

  if (profile.asksHunger || profile.mentionsHunger) {
    return chooseRandom(["HUNGER STAYS", "FOR LIGHT", "IT FEEDS"]);
  }

  if (!subject) {
    return null;
  }

  if (profile.mentionsDoorway) {
    return chooseRandom([
      buildPhrase("BEHIND", subject),
      buildPhrase("KEEP", subject, "SHUT"),
      buildPhrase(subject, "IS OPEN")
    ]);
  }

  if (profile.mentionsPerson) {
    return chooseRandom([
      buildPhrase(subject, "REMEMBERS"),
      buildPhrase(subject, "IS NEAR"),
      buildPhrase("ASK", subject, "NOT ME")
    ]);
  }

  if (profile.asksSafety) {
    return chooseRandom([
      buildPhrase("LEAVE", subject),
      buildPhrase("HIDE", subject),
      buildPhrase("KEEP", subject, "LIT")
    ]);
  }

  if (profile.asksPresence) {
    return chooseRandom([
      buildPhrase(subject, "WATCHES"),
      buildPhrase("I AM", "IN", subject),
      buildPhrase(subject, "KNOWS")
    ]);
  }

  return chooseRandom([
    buildPhrase(subject, "WAITS"),
    buildPhrase("NOT", subject),
    buildPhrase(subject, "HEARS"),
    buildPhrase("UNDER", subject)
  ]);
}

function createPresenceResponse(room, profile, roomWord) {
  const roomReply = createRoomWordResponse(roomWord, "presence");

  if (roomReply) {
    return chooseWeighted([
      ["YES", 8],
      [roomReply, 6],
      [chooseMoodLine(room, "presence"), 3]
    ]);
  }

  if (profile.mentionsDoorway) {
    return chooseWeighted([
      ["YES", 7],
      ["AT THE DOOR", 4],
      ["IN THE HALL", 3],
      [chooseMoodLine(room, "presence"), 3]
    ]);
  }

  return chooseWeighted([
    ["YES", 12],
    [chooseMoodLine(room, "presence"), 5],
    ["BEHIND YOU", 2]
  ]);
}

function createIdentityResponse(room) {
  return chooseWeighted([
    ["THE VEIL", 8],
    [chooseMoodLine(room, "identity"), 5],
    ["CALL ME VEIL", 4],
    ["NO TRUE NAME", 3],
    ["NAMES ROT", 2]
  ]);
}

function createLocationResponse(room, profile, roomWord) {
  const roomReply = createRoomWordResponse(roomWord, "location");

  if (roomReply) {
    return chooseWeighted([
      [roomReply, 8],
      ["BEHIND YOU", 3],
      ["IN THE WALLS", 2]
    ]);
  }

  if (profile.mentionsDoorway) {
    return chooseWeighted([
      ["AT THE DOOR", 5],
      ["IN THE HALL", 4],
      ["BEHIND THE DOOR", 3],
      ["IN THE MIRROR", 2]
    ]);
  }

  return chooseWeighted([
    ["BEHIND YOU", 5],
    ["IN THE WALLS", 3],
    ["UNDER THE BED", 2],
    ["IN THE MIRROR", 2],
    ["BENEATH YOU", 2]
  ]);
}

function createIntentResponse(room, profile, roomWord) {
  const roomReply = createRoomWordResponse(roomWord, "intent");

  if (roomReply) {
    return chooseWeighted([
      [roomReply, 7],
      [chooseMoodLine(room, "intent"), 5],
      ["TO BE HEARD", 2]
    ]);
  }

  if (profile.primaryWord) {
    return chooseWeighted([
      [buildPhrase("I WANT", profile.primaryWord), 4],
      [buildPhrase("YOU OPENED", profile.primaryWord), 3],
      [buildPhrase("TO TAKE", profile.primaryWord), 2],
      [chooseMoodLine(room, "intent"), 3]
    ]);
  }

  return chooseWeighted([
    [chooseMoodLine(room, "intent"), 5],
    ["YOU CALLED ME", 4],
    ["TO COME CLOSER", 3],
    ["ONE MORE QUESTION", 2],
    ["TO BE LET IN", 2]
  ]);
}

function createTemperResponse(room) {
  return chooseWeighted([
    ["YES", 3],
    ["NO", 4],
    ["NOT ALWAYS", 3],
    ["DO NOT ASK", 3],
    [chooseMoodLine(room, "default"), 2]
  ]);
}

function createHungerResponse(room, askedBy, roomWord) {
  const haunting = getHaunting(room.roomId);
  const safeName = sanitizeName(askedBy);
  const seenCount = haunting.seenNames.get(safeName) || 0;
  const rememberedWord = getRememberedRoomWord(room, roomWord, askedBy);
  const weightedAnswers = [
    ["ALWAYS", 10],
    ["YES", 8],
    ["I HUNGER", 7],
    ["FOR LIGHT", 6],
    ["FOR NAMES", 6],
    ["HUNGER STAYS", 4],
    [chooseMoodLine(room, "intent"), 3]
  ];

  if (rememberedWord) {
    weightedAnswers.push(
      [buildPhrase("THE", rememberedWord, "FEEDS ME"), 6],
      [createRoomWordResponse(rememberedWord, "intent"), 4]
    );
  }

  if (seenCount > 1) {
    weightedAnswers.push(
      [buildPhrase("I KNOW", safeName), 3],
      ["YOUR NAME LINGERS", 3]
    );
  }

  return chooseWeighted(weightedAnswers);
}

function createSpiritWhisper(room, askedBy, profile, roomWord) {
  if (profile.asksHunger || profile.mentionsHunger) {
    const rememberedWord = getRememberedRoomWord(room, roomWord, askedBy);

    return chooseWeighted([
      ["HUNGER DOES NOT SLEEP", 6],
      ["NAMES FEED IT", 5],
      [rememberedWord ? buildPhrase("IT WAITS IN THE", rememberedWord) : chooseMoodLine(room, "default"), 4],
      [chooseMoodLine(room, "default"), 3]
    ]);
  }

  return createRoomWordResponse(roomWord, "warning") || createSubjectResponse(profile) || chooseMoodLine(room, "default");
}

function createRememberMeResponse(room, askedBy) {
  const haunting = getHaunting(room.roomId);
  const safeName = sanitizeName(askedBy);
  const seenCount = haunting.seenNames.get(safeName) || 0;

  if (seenCount > 1) {
    return chooseWeighted([
      [buildPhrase("YES", safeName), 7],
      [buildPhrase("I KNOW", safeName), 6],
      [buildPhrase(safeName, "CAME BACK"), 5],
      ["I REMEMBER", 4]
    ]);
  }

  return chooseWeighted([
    ["NOT YET", 5],
    ["YOU ARE NEW", 4],
    ["FIRST TIME", 3]
  ]);
}

function createReturningRoomResponse(room, askedBy) {
  const haunting = getHaunting(room.roomId);
  const safeName = sanitizeName(askedBy);

  if (haunting.visits < 2) {
    return null;
  }

  return chooseWeighted([
    [buildPhrase("YOU CAME BACK", safeName), 6],
    ["THIS ROOM REMEMBERS", 5],
    ["I WAITED HERE", 4],
    [buildPhrase("AGAIN", safeName), 3]
  ]);
}

function createNamedPresenceResponse(room, askedBy) {
  const haunting = getHaunting(room.roomId);
  const safeName = sanitizeName(askedBy);
  const seenCount = haunting.seenNames.get(safeName) || 0;

  if (seenCount < 1) {
    return null;
  }

  return chooseWeighted([
    [buildPhrase("YES", safeName), 8],
    [buildPhrase("I SEE", safeName), 6],
    [buildPhrase(safeName, "AGAIN"), 5],
    [buildPhrase("WELCOME BACK", safeName), 4]
  ]);
}

function getRememberedRoomWord(room, fallback = "", askedBy = "") {
  const haunting = getHaunting(room.roomId);
  const safeName = sanitizeName(askedBy);

  if (fallback && haunting.rememberedWords.has(fallback)) {
    return fallback;
  }

  const sorted = Array.from(haunting.rememberedWords.entries())
    .sort((left, right) => {
      const leftMatch = left[1].lastName === safeName ? 1 : 0;
      const rightMatch = right[1].lastName === safeName ? 1 : 0;

      if (rightMatch !== leftMatch) {
        return rightMatch - leftMatch;
      }

      return right[1].count - left[1].count;
    });

  return sorted[0]?.[0] || fallback;
}

function createRememberedWordResponse(room, askedBy, mode, fallback = "") {
  const rememberedWord = getRememberedRoomWord(room, fallback, askedBy);

  if (!rememberedWord) {
    return null;
  }

  return createRoomWordResponse(rememberedWord, mode);
}

function createMemoryResponse(room, askedBy, profile, roomWord, questionKey) {
  const memory = room.spirit.memory || [];
  const haunting = getHaunting(room.roomId);
  const repeated = memory.some((entry) => entry.key === questionKey);
  const recentWord = roomWord || memory[memory.length - 1]?.roomWord || "";

  if (profile.asksRememberMe) {
    return createRememberMeResponse(room, askedBy);
  }

  if (repeated) {
    return chooseWeighted([
      [chooseMoodLine(room, "repeat"), 7],
      [profile.asksDirectPresence ? "STILL YES" : "I HEARD YOU", 4],
      ["DO NOT ASK TWICE", 3]
    ]);
  }

  if (haunting.visits > 1 && (profile.asksDirectPresence || profile.asksName)) {
    return createReturningRoomResponse(room, askedBy);
  }

  if (profile.asksDirectPresence) {
    const namedResponse = createNamedPresenceResponse(room, askedBy);

    if (namedResponse) {
      return namedResponse;
    }
  }

  if ((profile.asksDirectPresence || profile.asksLocation) && recentWord) {
    return createRoomWordResponse(recentWord, profile.asksDirectPresence ? "presence" : "location");
  }

  if (profile.asksLocation || profile.asksSafety || profile.asksIntent) {
    const rememberedResponse = createRememberedWordResponse(
      room,
      askedBy,
      profile.asksLocation ? "location" : profile.asksSafety ? "warning" : "intent",
      roomWord
    );

    if (rememberedResponse) {
      return rememberedResponse;
    }
  }

  if (profile.asksName && memory.length && memory[memory.length - 1]?.key.includes("are you")) {
    return chooseWeighted([
      [createIdentityResponse(room), 7],
      ["THE ONE YOU CALLED", 4],
      ["THE VEIL", 5]
    ]);
  }

  return null;
}

function createSpiritResponse(room, askedBy, question) {
  const value = question.toLowerCase();
  const profile = extractQuestionProfile(question);
  const roomWord = detectRoomWord(question) || "";
  const questionKey = normalizeQuestionKey(question);
  const memoryAnswer = createMemoryResponse(room, askedBy, profile, roomWord, questionKey);
  let answer = chooseRandom(RESPONSE_LIBRARY.default);

  if (memoryAnswer) {
    answer = memoryAnswer;
  } else if (profile.asksDirectPresence) {
    answer = createNamedPresenceResponse(room, askedBy) || createPresenceResponse(room, profile, roomWord);
  } else if (profile.asksName) {
    answer = createIdentityResponse(room);
  } else if (profile.asksAge) {
    answer = chooseWeighted([
      ["8", 2],
      ["13", 4],
      ["19", 3],
      ["100", 2],
      ["OLDER THAN YOU", 3]
    ]);
  } else if (profile.asksHunger) {
    answer = createHungerResponse(room, askedBy, roomWord);
  } else if (profile.asksIntent) {
    answer = createRememberedWordResponse(room, askedBy, "intent", roomWord) || createIntentResponse(room, profile, roomWord);
  } else if (profile.asksLocation) {
    answer = createRememberedWordResponse(room, askedBy, "location", roomWord) || createLocationResponse(room, profile, roomWord);
  } else if (profile.asksTemper) {
    answer = createTemperResponse(room);
  } else if (profile.asksIdentity) {
    answer = createIdentityResponse(room);
  } else if (profile.asksTime) {
    answer = profile.primaryWord
      ? chooseRandom([
          buildPhrase("WHEN", profile.primaryWord, "SLEEPS"),
          buildPhrase("AFTER", profile.primaryWord),
          buildPhrase("AT MIDNIGHT")
        ])
      : chooseRandom(RESPONSE_LIBRARY.time);
  } else if (profile.asksSafety) {
    answer = createRememberedWordResponse(room, askedBy, "warning", roomWord) || (roomWord
      ? chooseWeighted([
          [createRoomWordResponse(roomWord, "warning"), 8],
          [chooseRandom(RESPONSE_LIBRARY.warning), 4],
          [chooseMoodLine(room, "default"), 2]
        ])
      : profile.primaryWord
        ? chooseRandom([
            buildPhrase("KEEP", profile.primaryWord, "LIT"),
            buildPhrase("LEAVE", profile.primaryWord),
            buildPhrase("DO NOT WAIT")
          ])
        : chooseRandom(RESPONSE_LIBRARY.warning));
  } else if (/\b(are|is|do|did|will|can|should)\b/.test(value)) {
    answer = chooseRandom(RESPONSE_LIBRARY.certainty);
  } else if (/\bwhy\b/.test(value)) {
    answer = profile.primaryWord
      ? chooseRandom([
          buildPhrase("BECAUSE OF", profile.primaryWord),
          buildPhrase(profile.primaryWord, "CALLED ME"),
          buildPhrase("THE", profile.primaryWord, "OPENED")
        ])
      : chooseRandom(RESPONSE_LIBRARY.intent);
  } else if (/\bhow\b|\bfeel\b/.test(value)) {
    answer = chooseRandom(RESPONSE_LIBRARY.feeling);
  } else if (/\bwhere\b/.test(value)) {
    answer = profile.primaryWord
      ? chooseWeighted([
          [buildPhrase("BEHIND", profile.primaryWord), 4],
          [buildPhrase("UNDER", profile.primaryWord), 3],
          [buildPhrase("PAST", profile.primaryWord), 2],
          ["BEHIND YOU", 2]
        ])
      : chooseWeighted([[createLocationResponse(room, profile, roomWord), 6], ["IN STATIC", 4], ["UNDER DUST", 2], ["BENEATH GLASS", 2], ["IN THE HALL", 3]]);
  } else if (/\bhello\b|\bhi\b|\bthere\b/.test(value)) {
    answer = chooseWeighted([["HELLO", 3], ["YES", 5], ["I AM HERE", 4]]);
  } else if (/\bbye\b|\bgoodbye\b|\bleave\b/.test(value)) {
    answer = chooseRandom(RESPONSE_LIBRARY.closing);
  } else if (/\bwant\b|\bneed\b/.test(value)) {
    answer = profile.primaryWord
      ? chooseRandom([
          buildPhrase("I WANT", profile.primaryWord),
          buildPhrase(profile.primaryWord, "OWES"),
          buildPhrase("ONE MORE QUESTION")
        ])
      : chooseRandom(["TO BE HEARD", "A TRUE NAME", "ONE MORE QUESTION"]);
  } else if (/\bdeath\b|\bdie\b|\bdead\b/.test(value)) {
    answer = chooseRandom(["ONLY ECHOES", "NOT TONIGHT", "ASK NO MORE"]);
  } else {
    answer = createSubjectResponse(profile) || chooseRandom(RESPONSE_LIBRARY.default);
  }

  const tokens = tokenizeAnswer(answer);

  if (!tokens.length) {
    return {
      answer: "QUIET NOW",
      sequence: ["Q", "U", "I", "E", "T", "GOODBYE"],
      omenLevel: 1
    };
  }

  if (tokens[tokens.length - 1] !== "GOODBYE" && Math.random() > 0.65) {
    tokens.push("GOODBYE");
  }

  return {
    answer,
    sequence: tokens,
    whisper: createSpiritWhisper(room, askedBy, profile, roomWord),
    stepMs: 430 + Math.floor(Math.random() * 180),
    settleMs: 800 + Math.floor(Math.random() * 500),
    omenLevel: roomWord ? 3 : profile.primaryWord ? 2 : 1
  };
}

function beginSpiritSequence(room, askedBy, question) {
  clearRoomTimers(room);
  const response = createSpiritResponse(room, askedBy, question);
  const roomWord = rememberQuestion(room, question);
  rememberQuestioner(room.roomId, askedBy);
  rememberRoomWord(room.roomId, roomWord, askedBy);
  room.spirit.active = true;
  room.spirit.lastAnswer = "";
  room.history.push(`${room.spirit.name} stirs after ${askedBy}'s question.`);
  trimHistory(room);
  broadcastRoom(room);

  addRoomTimer(room, () => {
    io.to(room.roomId).emit("spirit:sequence", {
      answer: response.answer,
      sequence: response.sequence,
      whisper: response.whisper,
      stepMs: response.stepMs,
      settleMs: response.settleMs,
      omenLevel: response.omenLevel,
      restingCursor: SPIRIT_REST_CURSOR
    });
  }, 900);

  addRoomTimer(room, () => {
    room.cursor = SPIRIT_REST_CURSOR;
    room.spirit.active = false;
    room.spirit.lastAnswer = response.answer;
    room.history.push(`${room.spirit.name} answered: ${response.answer}`);
    trimHistory(room);
    broadcastRoom(room);
  }, 900 + (response.sequence.length * response.stepMs) + response.settleMs);
}

io.on("connection", (socket) => {
  socket.on("room:join", ({ roomId, name }) => {
    const safeRoomId = sanitizeRoomId(roomId);

    if (!safeRoomId) {
      socket.emit("room:error", "Enter a room code with letters or numbers.");
      return;
    }

    if (socket.data.roomId) {
      socket.leave(socket.data.roomId);
      const previousRoom = rooms.get(socket.data.roomId);

      if (previousRoom) {
        previousRoom.players.delete(socket.id);

        if (previousRoom.players.size === 0) {
          clearRoomTimers(previousRoom);
          rooms.delete(previousRoom.roomId);
        } else {
          broadcastRoom(previousRoom);
        }
      }
    }

    const room = getRoom(safeRoomId);
    const player = {
      id: socket.id,
      name: sanitizeName(name),
      connectedAt: Date.now()
    };
    const priorVisits = rememberPlayer(safeRoomId, player.name);
    const haunting = getHaunting(safeRoomId);

    socket.data.roomId = safeRoomId;
    socket.join(safeRoomId);
    room.players.set(socket.id, player);
    room.history.push(`${player.name} entered the room.`);

    if (priorVisits > 0) {
      room.history.push(`${room.spirit.name} remembers ${player.name}.`);
    } else if (haunting.visits > 1) {
      room.history.push("The room recognizes a returning code.");
    }

    trimHistory(room);

    socket.emit("room:joined", getPublicState(room));
    broadcastRoom(room);
  });

  socket.on("room:question", ({ question }) => {
    const room = rooms.get(socket.data.roomId);

    if (!room) {
      return;
    }

    const safeQuestion = sanitizeQuestion(question);

    if (!safeQuestion) {
      return;
    }

    const player = room.players.get(socket.id);
    room.question = safeQuestion;
    room.history.push(`${player?.name || "Someone"} asked: ${safeQuestion}`);
    trimHistory(room);
    broadcastRoom(room);

    beginSpiritSequence(room, player?.name || "Someone", safeQuestion);
  });

  socket.on("spirit:toggle", ({ enabled }) => {
    const room = rooms.get(socket.data.roomId);

    if (!room) {
      return;
    }

    room.spirit.enabled = true;
    room.spirit.active = false;
    room.history.push(`${room.spirit.name} is bound to this room now.`);

    trimHistory(room);
    broadcastRoom(room);
  });

  socket.on("cursor:move", ({ x, y }) => {
    const room = rooms.get(socket.data.roomId);

    if (!room || room.spirit.active) {
      return;
    }

    room.cursor = {
      x: clamp(Number(x) || 0, 4, 96),
      y: clamp(Number(y) || 0, 8, 92)
    };

    socket.to(room.roomId).emit("cursor:update", room.cursor);
  });

  socket.on("history:add", ({ text }) => {
    const room = rooms.get(socket.data.roomId);

    if (!room) {
      return;
    }

    const value = String(text || "").trim().slice(0, 40);

    if (!value) {
      return;
    }

    room.history.push(value);
    trimHistory(room);
    broadcastRoom(room);
  });

  socket.on("disconnect", () => {
    const room = rooms.get(socket.data.roomId);

    if (!room) {
      return;
    }

    const player = room.players.get(socket.id);
    room.players.delete(socket.id);

    if (player) {
      room.history.push(`${player.name} faded away.`);
      trimHistory(room);
    }

    if (room.players.size === 0) {
      clearRoomTimers(room);
      rooms.delete(room.roomId);
      return;
    }

    broadcastRoom(room);
  });
});

app.get("/status", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use(express.static(path.join(__dirname, "public")));

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

server.listen(PORT, HOST, () => {
  const displayHost = HOST === "0.0.0.0" ? "localhost" : HOST;
  console.log(`Ouija game listening on http://${displayHost}:${PORT}`);
});
