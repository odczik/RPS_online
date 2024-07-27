const http = require('http');
const ws = require('ws');
require("dotenv").config()
const fs = require('fs').promises;

let server = http.createServer((req, res) => {
    switch(req.url){
        case "/":
            //res.writeHead(200, { 'Content-Type': 'text/html' });
            //res.end();
            /*fs.readFile("../index.html")
                .then(contents => {
                    res.setHeader("Content-Type", "text/html");
                    res.writeHead(200);
                    res.end(contents);
                })
                .catch(err => {
                    res.writeHead(500);
                    res.end(err);
                    return;
                });*/
            break;
    }
    
});

server.addListener('upgrade', (req) => console.log('UPGRADE:', req.url, "FROM:", `${req.socket.remoteAddress}:${req.socket.remotePort}`));
server.on('error', (err) => console.error(err));
server.listen(process.env.PORT, () => console.log('Https running on port', process.env.PORT));

let rooms = {};
let clients = {};

setInterval(() => {
    console.log("Rooms:", rooms)
}, 500)

const wss = new ws.Server({server, path: '/'});
wss.on('connection', function connection(ws) { 
    console.log('A new connection has been established. Total clients: ', wss.clients.size);
    ws.send(JSON.stringify({ type: "msg", value: "Connection established." }));

    ws.id = Math.random().toString(36).substring(7);
    clients[ws.id] = ws;
    clients[ws.id].room = null;


    ws.addEventListener("message", (msg) => {
        try {
            msg = JSON.parse(msg.data)
        } catch(e) {
            console.error("Error parsing JSON, terminating connection.")
            return ws.close(1003, "Invalid JSON");
        }
        if(msg.type !== "ping") console.log("Received>", msg)
        switch(msg.type){
            case "create":
                create(ws, msg.public);
                break;
            case "join":
                join(ws, msg.params);
                break;
            case "leave":
                leave(msg.params);
                break;
            case "update":
                handleGameUpdate(ws, msg);
                break;
            case "ping":
                ws.send(JSON.stringify({type: "pong", time: msg.time}));
                break;
            default:
                console.warn(`Type: ${type} unknown`);
                break;
        }
    })
    ws.on("close", (socket) => {
        console.log("A connection has been closed.", socket, ws.id)
        if(clients[ws.id].room){
            console.log("Removing player from room.")
            let room = rooms[clients[ws.id].room];
            room.players = room.players.filter(player => player !== ws);
            if(room.players.length === 0){
                delete rooms[clients[ws.id].room];
            } else {
                room.players[0].send(JSON.stringify({type: "stop"}));
            }
        }
        delete clients[ws.id];
    })
});

const create = (ws, public) => {
    let id = Math.random().toString(36).substring(7);
    rooms[id] = { id, public, players: [ws] };

    clients[ws.id].room = id;
    clients[ws.id].host = true;

    ws.send(JSON.stringify({type: "room", value: id}));
}

const join = (ws, id) => {
    if(clients[ws.id].room) return ws.send(JSON.stringify({type: "error", value: "You are already in a room.", client: clients[ws.id]}));
    id = id === "random" ? Object.keys(rooms).find(room => 
        rooms[room].players.length === 1 &&
        rooms[room].public
    ) : id;
    if(id === undefined) return ws.send(JSON.stringify({type: "error", value: "No active rooms right now."}));
    if(!rooms[id]) return ws.send(JSON.stringify({type: "error", value: "Room not found."}));
    if(rooms[id].players.length >= 2) return ws.send(JSON.stringify({type: "error", value: "Room is full."}));
    
    rooms[id].players.push(ws);

    clients[ws.id].room = id;
    clients[ws.id].host = false;

    ws.send(JSON.stringify({type: "room", value: id}));
    rooms[id].players.forEach(player => {
        player.send(JSON.stringify({type: "start"}));
    })
}

const handleGameUpdate = (ws, msg) => {
    if(msg.updateType === "playAgain"){
        rooms[clients[ws.id].room].players.forEach(player => {
            if(player == ws){
                player.thing = null;
            } else {
                player.send(JSON.stringify({type: "update", updateType: "playAgain"}));
            }
        })
        if( rooms[clients[ws.id].room].players[0].thing === null &&
            rooms[clients[ws.id].room].players[1].thing === null){
            rooms[clients[ws.id].room].players.forEach(player => {
                player.send(JSON.stringify({type: "update", updateType: "start"}));
            })
        }
        return;
    }

    rooms[clients[ws.id].room].players.forEach(player => {
        if(player === ws){
            player.thing = msg.value;
        } else {
            player.send(JSON.stringify({type: "update", updateType: "oppWaiting"}));
        }
    })
    if( rooms[clients[ws.id].room].players[0].thing && 
        rooms[clients[ws.id].room].players[1].thing ){

        let player1 = rooms[clients[ws.id].room].players[0].thing;
        let player2 = rooms[clients[ws.id].room].players[1].thing;

        let result = null;
        if(player1 === player2){
            result = "draw";
        } else if(player1 === "⛰️" && player2 === "✂️" ||
                  player1 === "📜" && player2 === "⛰️" ||
                  player1 === "✂️" && player2 === "📜"){
            result = "player1";
        } else {
            result = "player2";
        }

        switch(result){
            case "draw":
                rooms[clients[ws.id].room].players[0].send(JSON.stringify({type: "update", updateType: "draw", thing: player2}));
                rooms[clients[ws.id].room].players[1].send(JSON.stringify({type: "update", updateType: "draw", thing: player1}));
                break;
            case "player1":
                rooms[clients[ws.id].room].players[0].send(JSON.stringify({type: "update", updateType: "win", thing: player2}));
                rooms[clients[ws.id].room].players[1].send(JSON.stringify({type: "update", updateType: "lose", thing: player1}));
                break;
            case "player2":
                rooms[clients[ws.id].room].players[0].send(JSON.stringify({type: "update", updateType: "lose", thing: player2}));
                rooms[clients[ws.id].room].players[1].send(JSON.stringify({type: "update", updateType: "win", thing: player1}));
                break;
        }
    }
}