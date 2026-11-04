const socket = io();

const tg = window.Telegram?.WebApp;

tg?.ready();
tg?.expand();

const $ = id => document.getElementById(id);

let room = null;
let myId = null;
let myColor = null;
let myTurn = false;

const colors = ["red", "green", "yellow", "blue"];

const path = [];

for (let c = 1; c <= 6; c++) {
  path.push([0, c]);
}

for (let r = 1; r <= 6; r++) {
  path.push([r, 7]);
}

for (let c = 6; c >= 1; c--) {
  path.push([7, c]);
}

for (let r = 6; r >= 1; r--) {
  path.push([r, 0]);
}


// PLAYER NAME

function nickname() {
  return $("name").value.trim() ||
    tg?.initDataUnsafe?.user?.first_name ||
    "Player";
}

function showError(message) {
  $("error").textContent = message || "";
}


// CREATE ROOM

$("create").onclick = () => {

  showError("");

  socket.emit(
    "room:create",
    {
      name: nickname(),
      maxPlayers: $("capacity").value
    },
    enter
  );

};


// JOIN ROOM

$("join").onclick = () => {

  showError("");

  socket.emit(
    "room:join",
    {
      name: nickname(),
      code: $("roomCode").value.trim()
    },
    enter
  );

};


// ENTER GAME

function enter(data) {

  if (data.error) {
    showError(data.error);
    return;
  }

  room = data.room;
  myId = data.playerId;

  $("lobby").classList.add("hidden");
  $("game").classList.remove("hidden");

  render();
}


// ROOM UPDATE

socket.on("room:update", data => {

  if (room && room.code === data.code) {

    room = data;

    render();
  }

});


// DICE ROLL

$("roll").onclick = () => {

  socket.emit("game:roll", result => {

    if (result?.error) {

      $("hint").textContent = result.error;

    } else {

      $("hint").textContent =
        `You rolled ${result.value}. Select a pawn.`;

    }

  });

};


// LEAVE VIEW

$("leave").onclick = () => {

  room = null;

  $("game").classList.add("hidden");
  $("lobby").classList.remove("hidden");

};


// NOTIFICATION

socket.on("notice", message => {

  $("hint").textContent = message;

});


// RENDER GAME

function render() {

  if (!room) return;

  $("code").textContent = room.code;

  $("status").textContent =
    room.status === "waiting"
      ? "Waiting for players"
      : room.status === "finished"
        ? `Winner: ${room.winner}`
        : "Live Game";

  $("players").innerHTML =
    room.players.map((p, i) => {

      return `
        <span class="player ${p.color}
          ${i === room.current ? "active" : ""}">
          ${escapeHTML(p.name)} · ${p.color}
        </span>
      `;

    }).join("");


  const me = room.players.find(p => p.id === myId);

  myColor = me?.color;

  myTurn = room.players[room.current]?.id === myId;

  $("roll").disabled =
    !myTurn ||
    room.dice !== null ||
    room.status !== "playing";

  $("dice").textContent = room.dice ?? "🎲";


  if (room.status === "waiting") {

    $("hint").textContent =
      `Share room code ${room.code} with a friend.`;

  } else if (room.status === "finished") {

    $("hint").textContent =
      `${room.winner} won the game!`;

  } else if (myTurn) {

    $("hint").textContent =
      room.dice === null
        ? "Your turn — roll the dice."
        : "Choose one of your pawns.";

  } else {

    $("hint").textContent =
      `Waiting for ${room.players[room.current]?.name}...`;

  }

  drawBoard();

}


// ESCAPE HTML

function escapeHTML(text) {

  return String(text).replace(/[&<>"']/g, char => {

    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return map[char];

  });

}


// DRAW BOARD

function drawBoard() {

  const board = $("board");

  board.innerHTML = "";

  const posMap = new Map();


  room.players.forEach(player => {

    room.pawns[player.color].forEach((progress, index) => {

      if (progress < 0 || progress >= 57) return;

      let key;

      if (progress < 52) {

        const offset =
          colors.indexOf(player.color) * 13;

        const xy =
          path[(progress + offset) % 52];

        key = xy.join(",");

      } else {

        key = `home-${player.color}-${progress}`;

      }

      if (!posMap.has(key)) {
        posMap.set(key, []);
      }

      posMap.get(key).push({
        player,
        index
      });

    });

  });


  for (let r = 0; r < 8; r++) {

    for (let c = 0; c < 8; c++) {

      const cell = document.createElement("div");

      cell.className = "cell";

      const key = `${r},${c}`;

      const isTrack =
        path.some(x => x[0] === r && x[1] === c);

      if (isTrack) {

        const occupants = posMap.get(key) || [];

        if (occupants.length) {

          const { player, index } = occupants[0];

          const pawn = document.createElement("button");

          pawn.className = `pawn ${player.color}`;

          pawn.textContent =
            occupants.length > 1
              ? occupants.length
              : index + 1;

          pawn.onclick = () => movePawn(player, index);

          cell.appendChild(pawn);

        }

      } else if (
        (r === 0 && c === 0) ||
        (r === 0 && c === 7) ||
        (r === 7 && c === 0) ||
        (r === 7 && c === 7)
      ) {

        cell.classList.add("yard");
        cell.textContent = "🏠";

      } else if (r === 3 && c === 3) {

        cell.textContent = "🏁";

      }

      board.appendChild(cell);

    }

  }

}


// MOVE PAWN

function movePawn(player, index) {

  if (!myTurn) return;

  if (player.id !== myId) return;

  if (room.dice === null) return;

  socket.emit(
    "game:move",
    { pawn: index },
    result => {

      if (result?.error) {

        $("hint").textContent = result.error;

      }

    }
  );

}
