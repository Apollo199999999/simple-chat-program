// socketio object
const socket = io.connect("ws://localhost:8001");
let clientSocketId;

// Retrieve socket id for this client upon connection
socket.on('connect', () => {
    clientSocketId = socket.id; // an alphanumeric id...
});

let localUsername, roomCode;

// Retrieve url queries using load event
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(
        window.location.search,
    );

    localUsername = urlParams.get('username');
    Object.freeze(localUsername);

    roomCode = urlParams.get('roomCode');
    Object.freeze(roomCode);

    // Change room code display
    document.getElementById("roomCodeHeading").innerHTML = "Room Code: " + roomCode;

    // Emit a register username event
    socket.emit("registerClient", localUsername, roomCode);
});

// Pull chat history when server tells you to do so
socket.on("buildHistory", chatHistory => {
    for (let i = 0; i < chatHistory.length; i++) {
        const msg = document.createElement("p");
        const node = document.createTextNode(chatHistory[i]);
        msg.appendChild(node);

        const chatDiv = document.getElementById("chat-logs");
        chatDiv.appendChild(msg);
    }
});

socket.on("clientConnect", username => {
    // Indicate that a new user has connected
    const msg = document.createElement("p");
    const node = document.createTextNode(username + " has connected.");
    msg.appendChild(node);

    const chatDiv = document.getElementById("chat-logs");
    chatDiv.appendChild(msg);
});

// Function to try entering the message when the user presses enter on the keyboard
function tryEnterMessage(e) {
    // Look for window.event in case event isn't passed in
    e = e || window.event;
    if (e.keyCode == 13) {
        document.getElementById('sendMsgBtn').click();
    }
}

// Function to create a userMessageDict from user input
function addLocalMessage(message) {
    addMessage({ "user": localUsername, "message": message });

    // Emit a message sent event
    socket.emit("msgSent", clientSocketId, message);

    // Clear msgInputBox
    document.getElementById("msgInputBox").value = "";
}

// Function to render a new message
// userMessageDict should be in the format {user: "", message: ""}
function addMessage(userMessageDict) {
    // Create a p element and add it to chat-logs div
    const msg = document.createElement("p");
    const node = document.createTextNode(userMessageDict["user"] + ": " + userMessageDict["message"]);
    msg.appendChild(node);

    const chatDiv = document.getElementById("chat-logs");
    chatDiv.appendChild(msg);
}

socket.on("msgReceived", (id, user, message) => {
    if (id != clientSocketId) {
        addMessage({ user: user, message: message });
    }
})


socket.on("clientDisconnect", username => {
    // Indicate that the user has disconnected
    const msg = document.createElement("p");
    const node = document.createTextNode(username + " has disconnected.");
    msg.appendChild(node);

    const chatDiv = document.getElementById("chat-logs");
    chatDiv.appendChild(msg);
});