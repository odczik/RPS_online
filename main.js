// Websocket connection
const address = "ws://192.168.0.236:8080"
//const address = "wss://pong-server-n8nb.onrender.com/"

const ws = new WebSocket(address)
let avgPing = 0;
let avgPingCount = 0;

ws.onopen = () => {
    document.getElementById("connTxt").style.display = "none";
    document.getElementById("multiplayerCont").style.display = "block";

    console.log('WebSocket connection with server established.')
    setInterval(() => {
        avgPing = 0;
        avgPingCount = 0;
    }, 3000)
    ws.send(JSON.stringify({type: "ping", time: Date.now()}))
}

document.getElementById("hostRoom").addEventListener("click", e => {
    document.getElementById("multiplayerCont").style.display = "none";
    document.getElementById("hostCont").style.display = "block";
})
const hostRoom = (public) => {
    ws.send(JSON.stringify({type: "create", public}))
    document.getElementById("hostCont").innerHTML = "<h1 style='color: white;'>Waiting for player...</h1>";
}

document.getElementById("joinRoom").addEventListener("click", e => {
    document.getElementById("multiplayerCont").style.display = "none";
    document.getElementById("joinCont").style.display = "block";
})
const joinRoom = () => {
    const roomId = document.getElementById("roomCode").value;
    ws.send(JSON.stringify({type: "join", params: roomId}));
}
const joinRandomRoom = () => {
    ws.send(JSON.stringify({type: "join", params: "random"}));
}

ws.onmessage = (message) => {
    const msg = JSON.parse(message.data)
    if(msg.type !== "pong") console.log("Received>", msg)
    switch(msg.type){
        case "room":
            document.getElementById("hostCont").innerHTML = `<h1 style='color: white;'>Waiting for player...</h1>
                                                                    <h2 style='color: white;'>Room code: ${msg.value}</h2>`;
            break;
        case "start":
            document.getElementById("hostCont").style.display = "none";
            document.getElementById("joinCont").style.display = "none";

            document.getElementById("gameCont").style.display = "block";
            break;
        case "stop":
            window.location.reload();
            break;
        case "update":
            switch(msg.updateType){
                case "oppWaiting":
                    document.getElementById("gameStatus").innerText = "Opponent is waiting."
                    break;
                case "draw":
                    document.getElementById("gameStatus").innerText = "Draw!"
                    break;
                case "win":
                    document.getElementById("gameStatus").innerText = "You win!"
                    break;
                case "lose":
                    document.getElementById("gameStatus").innerText = "You lose!"
                    break;
            }
            break;
        case "error":
            alert(msg.value)
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

const play = (thing) => {
    const playBtns = document.querySelectorAll(".playBtns")
    playBtns.forEach(btn => btn.disabled = "true")
    playBtns.forEach(btn => btn.id === thing ? btn.classList.add("active") : null)
    ws.send(JSON.stringify({type: "update", value: thing}))
}