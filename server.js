require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { Telegraf, Markup } = require("telegraf");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = new Map();

const COLORS = ["red", "green", "yellow", "blue"];

function makeRoom(code, maxPlayers) {
  return {
    code,
    maxPlayers,
    players: [],
    current: 0,
    dice: null,
    status: "waiting",
    winner: null,

    pawns: {
      red: [-1, -1, -1, -1],
      green: [-1, -1, -1, -1],
      yellow: [-1, -1, -1, -1],
      blue: [-1, -1, -1, -1]
    }
  };
}

function publicRoom(room) {
  return {
    code: room.code,
    maxPlayers: room.maxPlayers,
    players: room.players,
    current: room.current,
    dice: room.dice,
    status: room.status,
    winner: room.winner,
    pawns: room.pawns
  };
}

function emitRoom(room) {
  io.to(room.code).emit("room:update", publicRoom(room));
}

function nextTurn(room) {
  room.current =
    (room.current + 1) % room.players.length;

  room.dice = null;
}

function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

// CREATE AND JOIN ROOM

io.on("connection", socket => {

  socket.on("room:create", ({ name, maxPlayers }, cb = () => {}) => {

    maxPlayers = Number(maxPlayers);

    if (![2, 4].includes(maxPlayers)) {
      return cb({ error: "Choose 2 or 4 players." });
    }

    const code = crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase();

    const room = makeRoom(code, maxPlayers);

    room.players.push({
      id: socket.id,
      name: String(name || "Player").slice(0, 18),
      color: COLORS[0],
      points: 0
    });

    rooms.set(code, room);

    socket.join(code);

    cb({
      room: publicRoom(room),
      playerId: socket.id
    });

    emitRoom(room);
  });


  socket.on("room:join", ({ code, name }, cb = () => {}) => {

    const room = rooms.get(
      String(code || "").toUpperCase()
    );

    if (!room) {
      return cb({ error: "Room not found." });
    }

    if (
      room.status !== "waiting" ||
      room.players.length >= room.maxPlayers
    ) {
      return cb({ error: "Room is full." });
    }

    const color = COLORS[room.players.length];

    room.players.push({
      id: socket.id,
      name: String(name || "Player").slice(0, 18),
      color,
      points: 0
    });

    socket.join(room.code);

    if (room.players.length === room.maxPlayers) {
      room.status = "playing";
    }

    cb({
      room: publicRoom(room),
      playerId: socket.id
    });

    emitRoom(room);
  });


  // ROLL DICE

  socket.on("game:roll", cb => {

    const room = [...rooms.values()].find(r =>
      r.players.some(p => p.id === socket.id)
    );

    if (!room) {
      return cb?.({ error: "Join a room first." });
    }

    if (room.status !== "playing") {
      return cb?.({ error: "Waiting for players." });
    }

    if (room.players[room.current].id !== socket.id) {
      return cb?.({ error: "Not your turn." });
    }

    if (room.dice !== null) {
      return cb?.({ error: "Move a pawn first." });
    }

    room.dice = rollDice();

    cb?.({ value: room.dice });

    emitRoom(room);
  });


  // MOVE PAWN

  socket.on("game:move", ({ pawn }, cb = () => {}) => {

    const room = [...rooms.values()].find(r =>
      r.players.some(p => p.id === socket.id)
    );

    if (!room || room.status !== "playing") {
      return cb({ error: "Game is not active." });
    }

    const player = room.players[room.current];

    if (player.id !== socket.id) {
      return cb({ error: "Not your turn." });
    }

    if (room.dice === null) {
      return cb({ error: "Roll the dice first." });
    }

    pawn = Number(pawn);

    if (
      !Number.isInteger(pawn) ||
      pawn < 0 ||
      pawn > 3
    ) {
      return cb({ error: "Invalid pawn." });
    }

    const positions = room.pawns[player.color];

    const old = positions[pawn];
    const roll = room.dice;

    if (old === -1 && roll !== 6) {
      return cb({ error: "You need a 6 to start." });
    }

    if (old + roll > 57) {
      return cb({ error: "You need an exact roll." });
    }

    positions[pawn] = old === -1 ? 0 : old + roll;

    const finished = positions.every(p => p === 57);

    if (finished) {

      room.status = "finished";
      room.winner = player.name;

      player.points += 100;

    } else if (roll !== 6) {

      nextTurn(room);

    } else {

      room.dice = null;

    }

    cb({ ok: true });

    emitRoom(room);
  });


  // DISCONNECT

  socket.on("disconnect", () => {

    for (const room of rooms.values()) {

      const player = room.players.find(
        p => p.id === socket.id
      );

      if (player) {
        io.to(room.code).emit(
          "notice",
          `${player.name} disconnected.`
        );
      }
    }
  });

});


// TELEGRAM BOT

if (process.env.BOT_TOKEN) {

  const bot = new Telegraf(process.env.BOT_TOKEN);

  bot.start(ctx => {

    const url = process.env.WEB_APP_URL;

    if (!url || url.includes("your-domain")) {
      return ctx.reply(
        "Ludo Game is not deployed yet."
      );
    }

    return ctx.reply(
      "Welcome to Ludo Arena! 🎲",
      Markup.inlineKeyboard([
        Markup.button.webApp("🎮 Play Ludo", url)
      ])
    );
  });

  bot.launch()
    .then(() => console.log("Telegram Bot Started"))
    .catch(err => console.error(err.message));

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}


// START SERVER

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Ludo Server Running on ${PORT}`);
});
