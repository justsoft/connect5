/**
 * Created by Johnson on 2017-01-05.
 */
const {games, getNames} = require("./states");
module.exports = {
    makeError(message) {
        return JSON.stringify({
            type: "error",
            message
        });
    },
    makeMove(validMove, player, location) {
        return JSON.stringify({
            type: "getMove",
            player,
            validMove,
            location
        });
    },
    makePoint(player, location) {
        return JSON.stringify({
            type: "point",
            player,
            location
        });
    },
    makeConnect() {
        return JSON.stringify({
            type : "connect",
            names: getNames()
        });
    },
    makeCreate(game) {
        return JSON.stringify({
            type: "create",
            ai  : games[game].ai,
            game,
        });
    },
    makeList() {
        return JSON.stringify({
            type: "list",
            list: Object.keys(games)
        });
    },
    makeWin(winStatus) {
        return JSON.stringify(Object.assign({type: "win"}, winStatus));
    },
    makeJoin(data) {
        return JSON.stringify(Object.assign({
            type   : "join",
            success: true,
        }, data));
    },
    makeState(game) {
        return JSON.stringify({
            type : "state",
            state: game.getState()
        });
    },
    makeBoard(game) {
        return JSON.stringify({
            type : "board",
            turn : game.playerTurn,
            board: game.board,
        });
    }
};
