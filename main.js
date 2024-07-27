// Websocket connection
const address = "ws://192.168.0.236:8080"
//const address = "wss://pong-server-n8nb.onrender.com/"

const ws = new WebSocket(address)
let avgPing = 0;
let avgPingCount = 0;

ws.onopen = () => {
    document.getElementById("connTxt").style.display = "none";
    document.getElementById("multiplayerCont").style.display = "flex";

    console.log('WebSocket connection with server established.')
    setInterval(() => {
        avgPing = 0;
        avgPingCount = 0;
    }, 3000)
    ws.send(JSON.stringify({type: "ping", time: Date.now()}))
}

document.getElementById("hostRoom").addEventListener("click", e => {
    ws.send(JSON.stringify({type: "create"}))
    document.getElementById("multiplayerCont").innerHTML = "<h1 style='color: white;'>Waiting for player...</h1>";
})
document.getElementById("joinRoom").addEventListener("click", e => {
    document.getElementById("multiplayerCont").style.display = "none";
    document.getElementById("roomCont").style.display = "block";
})
const joinRoom = () => {
    const roomId = document.getElementById("roomCode").value;
    ws.send(JSON.stringify({type: "join", params: roomId}));
}

ws.onmessage = (message) => {
    const msg = JSON.parse(message.data)
    //console.log(`Received>`, msg)
    switch(msg.type){
        case "room":
            ws.send(JSON.stringify({type: "rooms"}))
            break;
        case "rooms":
            document.getElementById("roomCont").innerHTML = "";
            msg.value.forEach(room => {
                const roomDiv = document.createElement("div");
                roomDiv.classList.add("room");
                roomDiv.innerText = room.id + " " + room.players + "/2";
                roomDiv.addEventListener("click", e => {
                    ws.send(JSON.stringify({type: "join", params: room.id}))
                    document.getElementById("multiplayerCont").style.display = "none";
                    document.getElementById("roomCont").style.display = "block";
                })
                document.getElementById("roomCont").appendChild(roomDiv);
            })
            break;
        case "start":
            document.getElementById("multiplayerCont").style.display = "none";
            document.getElementById("roomCont").style.display = "none";
            document.querySelector("canvas").style.display = "block";
            update();
            break;
        case "stop":
            window.location.reload();
            break;
        case "update":
            
            break;
        case "pong":
            let ping = Date.now() - msg.time;
            document.getElementById("ping").innerText = `Ping: ${ping}ms`
            ws.send(JSON.stringify({type: "ping", time: Date.now()}))
            avgPing += ping;
            avgPingCount++;
            document.getElementById("avgPing").innerText = `Avg Ping: ${(avgPing / avgPingCount).toFixed(0)}ms`
            break;
    }
}

ws.onclose = (message) => {
    console.error("Connection closed:", message.reason)
    window.location.reload();
}