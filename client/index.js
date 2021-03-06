const loc = window.location;
let serverURL;
if (loc.protocol === "https:") {
    serverURL = "wss:";
} else {
    serverURL = "ws:";
}
serverURL += "//" + loc.host + "/ws";

const socket = new WebSocket(serverURL);

const board = document.getElementById("board");
const ctx = board.getContext("2d");
const moveIndicator = document.getElementById("move_indicator");
const moveCtx = moveIndicator.getContext("2d");
const p1PointerCtx = document.getElementById("p1_indicator").getContext("2d");
const p2PointerCtx = document.getElementById("p2_indicator").getContext("2d");

let gridNum = 19;
let gridSize = board.width / gridNum;
// game state
let player = null;
let name = null;
let game = null;

const placePieceAudio = new Audio('static/place_piece.wav');
const winAudio = new Audio('static/win.mp3');


function recalculateGrid(gridNumber) {
    gridNum = gridNumber;
    gridSize = board.width / gridNum;
    clearBoard();
}

/**
 * Return board coordinates coresponding to x,y relative to board canvas
 * @param x
 * @param y
 * @returns {{r: number, c: number}}
 */
function getRowCol(x, y) {
    return {
        r: Math.round(y / gridSize),
        c: Math.round(x / gridSize)
    };
}

function getXY(r, c) {
    return {
        x: (c) * gridSize,
        y: (r) * gridSize,
    };
}

function clearBoard() {
    // grid size in canvas units; square grid
    // clear grid
    ctx.clearRect(0, 0, board.width, board.height);
    moveCtx.clearRect(0, 0, board.width, board.height);

    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "grey";
    for (let w = gridSize; w < board.width; w += gridSize) {
        ctx.beginPath();
        ctx.moveTo(w, 0);
        ctx.lineTo(w, board.height);
        ctx.stroke();
    }
    for (let h = gridSize; h < board.height; h += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(board.width, h);
        ctx.stroke();
    }
    ctx.restore();
}

// current game information
const playerOne = document.getElementById("p1");
const playerTwo = document.getElementById("p2");

function updatePlayerTurn(playerTurn) {
    if (playerTurn === 1) {
        // next to getMove
        playerOne.className = "active_move";
        playerTwo.className = "";
    } else if (playerTurn === 2) {
        playerTwo.className = "active_move";
        playerOne.className = "";
    }
}

function placePiece(player, {r, c}) {
    console.log(`placing piece ${player} : ${r}, ${c}`);
    // board piece
    if (player === 2) {
        ctx.fillStyle = "white";
    } else if (player === 1) {
        ctx.fillStyle = "black";
    }
    updatePlayerTurn(3 - player);
    const {x, y} = getXY(r, c);

    // place piece
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, gridSize * 0.4, 0, Math.PI * 2, true);
    ctx.stroke();
    ctx.fill();

    // place indicator
    const indicatorSize = gridSize * 0.1;
    moveCtx.clearRect(0, 0, board.width, board.height);
    moveCtx.lineWidth = 2;
    moveCtx.strokeStyle = "red";
    moveCtx.beginPath();
    moveCtx.moveTo(x, y - indicatorSize);
    moveCtx.lineTo(x, y + indicatorSize);
    moveCtx.moveTo(x - indicatorSize, y);
    moveCtx.lineTo(x + indicatorSize, y);
    moveCtx.stroke();

    placePieceAudio.play();
}

function placePoint(player, {r, c}) {
    let thisCtx;
    // board piece
    if (player === 2) {
        thisCtx = p2PointerCtx;
        thisCtx.strokeStyle = "blue";
    } else if (player === 1) {
        thisCtx = p1PointerCtx;
        thisCtx.strokeStyle = "green";
    }
    const {x, y} = getXY(r, c);
    // place indicator
    const indicatorSize = gridSize * 0.1;
    thisCtx.clearRect(0, 0, board.width, board.height);
    thisCtx.lineWidth = 2;
    thisCtx.beginPath();
    thisCtx.moveTo(x, y - indicatorSize);
    thisCtx.lineTo(x, y + indicatorSize);
    thisCtx.moveTo(x - indicatorSize, y);
    thisCtx.lineTo(x + indicatorSize, y);
    thisCtx.stroke();
}

// attach to topmost
moveIndicator.addEventListener("mousedown", function (e) {
    e.preventDefault();
    let x;
    let y;
    if (e.pageX || e.pageY) {
        x = e.pageX;
        y = e.pageY;
    } else {
        x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }
    x -= board.offsetLeft;
    y -= board.offsetTop;

    const coord = getRowCol(x, y);
    // depending on left or right click send different events
    if (e.button === 2) {
        socket.send(JSON.stringify({
            type    : "point",
            location: coord,
            game,
            player,
            name
        }));
    } else if (e.button === 0) {
        socket.send(JSON.stringify({
            type    : "move",
            location: coord,
            game,
            player,
            name
        }));
    }
    return false;
});
document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
});


// messages
function makeJoin(game) {
    return JSON.stringify({
        type: "join",
        name,
        game
    });
}

const allowAI = document.getElementById("allow_ai");

function makeCreate() {
    return JSON.stringify({
        type: "create",
        ai  : allowAI.checked
    });
}

function makeConnect(name) {
    return JSON.stringify({
        type: "connect",
        name
    });
}

function makeState(game) {
    return JSON.stringify({
        type: "state",
        game
    });
}

function makeKeepAlive() {
    return JSON.stringify({
        type: "keep alive",
        name
    });
}

// game creation and joining buttons
const gameSelect = document.getElementById("game_select");
const createButton = document.getElementById("create");
const createGroup = document.getElementById("create_group");
const joinButton = document.getElementById("join");
createButton.addEventListener("click", () => {
    socket.send(makeCreate());
});
joinButton.addEventListener("click", () => {
    socket.send(makeJoin(Number(gameSelect.value)));
});
gameSelect.addEventListener("change", () => {
    socket.send(makeState(Number(gameSelect.value)));
});

const connectButton = document.getElementById("connect");
const connectModal = document.getElementById("connection_modal");
connectButton.addEventListener("click", () => {
    const nameInput = document.getElementById("name");
    // name is either given or randomly generated (8 characters long)
    name = nameInput.value || Math.random().toString(35).substr(2, 8);
    socket.send(makeConnect(name));
    // heroku needs keepalive message at least every 55 seconds
    setInterval(keepAlive, 30000);
    // assuming connection is successful
    joinButton.style.visibility = "visible";
    createButton.style.visibility = "visible";
    createGroup.style.visibility = "visible";
    connectModal.style.display = "none";
});

function updateGameSelection(list) {
    const curGame = gameSelect.value;
    const toRemoveIndices = [];
    const alreadyExistIndices = [];
    // remove all that's not in the list
    for (let i = gameSelect.options.length - 1; i >= 0; --i) {
        const j = list.indexOf(gameSelect.options[i].value);
        if (j < 0) {
            toRemoveIndices.push(i);
        } else {
            alreadyExistIndices.push(j);
        }
    }
    toRemoveIndices.forEach((i) => {
        gameSelect.remove(i);
    });
    // add new ones
    list.forEach((gameID, j) => {
        // not already existing
        if (alreadyExistIndices.indexOf(j) < 0) {
            const option = document.createElement("option");
            option.value = gameID;
            option.text = gameID;
            gameSelect.appendChild(option);
            // reselect
            if (option.value === curGame) {
                gameSelect.value = gameID;
            }
        }
    });
}

const playerList = document.getElementById("player_list");

function updatePlayerList(list) {
    const alreadyExistIndices = [];
    // remove all that's not in the list
    for (let i = playerList.children.length - 1; i >= 0; --i) {
        const j = list.indexOf(playerList.children[i].innerHTML);
        if (j < 0) {
            playerList.removeChild(playerList.children[i]);
        } else {
            alreadyExistIndices.push(j);
        }
    }
    // add new ones
    list.forEach((playerName, j) => {
        // not already existing
        if (alreadyExistIndices.indexOf(j) < 0) {
            const item = document.createElement("li");
            item.innerHTML = playerName;
            if (playerName === name) {
                item.id = "own_name";
            }
            playerList.appendChild(item);
        }
    });
}

const gameStatus = document.getElementById("game_status");

function updateGameState(state) {
    playerOne.innerHTML = state.players[0] || "";
    playerTwo.innerHTML = state.players[1] || "";
    updatePlayerTurn(state.turn);
    gameStatus.innerHTML = state.status;
}

function keepAlive() {
    socket.send(makeKeepAlive());
}

socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    console.log("message");
    console.log(msg);
    switch (msg.type) {
        case "connect": {
            // somebody connected, update player list
            return updatePlayerList(msg.names);
        }
        case "create": {
            // creation success
            console.log("Created game");
            game = msg.game;
            // immediately join created game
            return socket.send(makeJoin(game));
        }
        case "list": {
            // server sent list of games for us to update our selection list
            console.log("Listing available games");
            updateGameSelection(msg.list);
            break;
        }
        case "join": {
            // server sent game connection information (required for future interaction)
            console.log("Joined game");
            player = msg.player;
            game = msg.game;
            gridNum = msg.size;
            recalculateGrid(gridNum);
            break;
        }
        case "state": {
            // get latest state of the game
            updateGameState(msg.state);
            break;
        }
        case "getMove": {
            // display moves from players (including self)
            if (msg.validMove) {
                console.log(`Move made by ${msg.player}`);
                placePiece(msg.player, msg.location);
            }
            break;
        }
        case "point": {
            placePoint(msg.player, msg.location);
            break;
        }
        case "win": {
            // somebody won a game we're subscribed to
            if (msg.player === player) {
                winAudio.play();
                window.alert("Congratulations, you won!");
            } else {
                window.alert(msg.message);
            }
            break;
        }
        case "error": {
            window.alert(msg.message);
            break;
        }
        default:
            console.log("Unknown message type: " + msg.type);
    }
};


clearBoard();
