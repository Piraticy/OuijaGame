const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const rooms = new Map();
const SPIRIT_NAME = "The Veil";
const MAX_HISTORY = 20;

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

const RESPONSE_LIBRARY = {
  certainty: ["YES", "NO", "NOT YET", "LATER"],
  presence: ["I AM HERE", "ALWAYS", "IN SHADOW"],
  identity: ["THE VEIL", "NO NAME", "ONLY ECHOES"],
  intent: ["TO BE HEARD", "TO REMEMBER", "TO WATCH"],
  feeling: ["COLD MEMORY", "QUIET DREAD", "HEAVY AIR"],
  warning: ["STAY IN LIGHT", "KEEP QUIET", "DO NOT RUSH"],
  time: ["AT MIDNIGHT", "WHEN RAIN FALLS", "AFTER THE BELL"],
  closing: ["GOODBYE", "CLOSE THE BOARD", "ENOUGH FOR NOW"],
  default: ["THE VEIL THINS", "ONLY STATIC", "ASK AGAIN", "QUIET NOW"]
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
  return {
    roomId,
    players: new Map(),
    cursor: { x: 50, y: 72 },
    question: "Ask, and The Veil will answer.",
    history: [],
    spirit: {
      enabled: true,
      active: false,
      name: SPIRIT_NAME,
      lastAnswer: ""
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
      lastAnswer: room.spirit.lastAnswer
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
    mentionsDoorway: /\bdoor|window|closet|hall|hallway|stairs|attic|basement|room|bed|mirror\b/.test(
      question.toLowerCase()
    ),
    mentionsPerson: /\bmother|father|mom|dad|sister|brother|friend|girl|boy|man|woman|child|name\b/.test(
      question.toLowerCase()
    ),
    asksSafety: /\bhelp|safe|scared|afraid|danger|leave|run\b/.test(question.toLowerCase()),
    asksTime: /\bwhen|time|night|midnight|hour|clock\b/.test(question.toLowerCase()),
    asksIdentity: /\bwho|name|what are you\b/.test(question.toLowerCase()),
    asksPresence: /\bare you|is someone|here|with me|in my\b/.test(question.toLowerCase())
  };
}

function createSubjectResponse(profile) {
  const subject = profile.primaryWord;

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

function createSpiritResponse(question) {
  const value = question.toLowerCase();
  const profile = extractQuestionProfile(question);
  let answer = chooseRandom(RESPONSE_LIBRARY.default);

  if (profile.asksIdentity) {
    answer = profile.primaryWord
      ? chooseRandom([
          buildPhrase("THE", profile.primaryWord, "KNOWS"),
          buildPhrase("NO", profile.primaryWord),
          buildPhrase(profile.primaryWord, "HAS A NAME")
        ])
      : chooseRandom(RESPONSE_LIBRARY.identity);
  } else if (profile.asksTime) {
    answer = profile.primaryWord
      ? chooseRandom([
          buildPhrase("WHEN", profile.primaryWord, "SLEEPS"),
          buildPhrase("AFTER", profile.primaryWord),
          buildPhrase("AT MIDNIGHT")
        ])
      : chooseRandom(RESPONSE_LIBRARY.time);
  } else if (profile.asksSafety) {
    answer = profile.primaryWord
      ? chooseRandom([
          buildPhrase("KEEP", profile.primaryWord, "LIT"),
          buildPhrase("LEAVE", profile.primaryWord),
          buildPhrase("DO NOT WAIT")
        ])
      : chooseRandom(RESPONSE_LIBRARY.warning);
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
      ? chooseRandom([
          buildPhrase("BEHIND", profile.primaryWord),
          buildPhrase("UNDER", profile.primaryWord),
          buildPhrase("PAST", profile.primaryWord)
        ])
      : chooseRandom(["IN STATIC", "UNDER DUST", "BENEATH GLASS"]);
  } else if (/\bhello\b|\bhi\b|\bthere\b/.test(value)) {
    answer = chooseRandom(["HELLO", "YES", "I AM HERE"]);
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
    whisper: createSubjectResponse(profile) || chooseRandom(RESPONSE_LIBRARY.default),
    stepMs: 430 + Math.floor(Math.random() * 180),
    settleMs: 800 + Math.floor(Math.random() * 500),
    omenLevel: profile.primaryWord ? 2 : 1
  };
}

function beginSpiritSequence(room, askedBy, question) {
  clearRoomTimers(room);

  const response = createSpiritResponse(question);
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
      omenLevel: response.omenLevel
    });
  }, 900);

  addRoomTimer(room, () => {
    const finalToken = response.sequence[response.sequence.length - 1];

    if (finalToken && BOARD_TARGETS[finalToken]) {
      room.cursor = BOARD_TARGETS[finalToken];
    }

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

    socket.data.roomId = safeRoomId;
    socket.join(safeRoomId);
    room.players.set(socket.id, player);
    room.history.push(`${player.name} entered the room.`);
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
