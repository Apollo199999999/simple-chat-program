import { Server } from "socket.io";

// create http server forwarding network traffic to socketio server
const io = new Server(10000, {
  cors: {
    origin: "*",
  },
});

// Array of rooms
let rooms = [];
const clients = new Set();

// Client "class" that stores the latest message sent by the client
function Client(socket) {
  this.socket = socket;
  this.username = "";
  this.roomCode = "";
  this.message = "";
}

// Room "class"
class Room {
  constructor(code) {
    this.clients = [];
    this.roomCode = code;
    this.messages = [];
  }

  addClient(c) {
    if (this.clients.includes(c) == false) {
      this.clients.push(c);
    }

  }

  removeClient(c) {
    if (!this.clients.includes(c)) {
      throw Error(`No client ${c.socket.id} in room`);
    }
    this.clients.splice(this.clients.indexOf(c), 1);
  }
}

console.log("Server running...")

io.on("connection", socket => {
  console.log("New connection!");

  // Client specific code
  let client = new Client(socket);
  clients.add(client);

  // Keep track of the index of the room object that the client is currently in
  let clientRoomIdx = 0;

  // Register the client's username once we have received that event
  socket.on("registerClient", (username, roomCode) => {
    // Assign props to client class on server
    client.username = username;
    client.roomCode = roomCode;

    // Create a new room if this room does not alr exist, and add the client
    let roomExists = false;

    for (let i = 0; i < rooms.length; i++) {
      if (rooms[i].roomCode == roomCode) {
        roomExists = true;
        rooms[i].addClient(client);
        clientRoomIdx = i;
      }
    }

    if (roomExists == false) {
      let room = new Room(roomCode);
      room.addClient(client)
      rooms.push(room);
      clientRoomIdx = rooms.length - 1;
    }

    // Tell other clients in the same room that we have connected
    rooms[clientRoomIdx].clients.forEach(c => {
      if (c != client) {
        c.socket.emit("clientConnect", client.username);
      }
    })

    // Push existing chat history to the new client
    rooms[clientRoomIdx].messages.push(username + " has connected.");
    client.socket.emit("buildHistory", rooms[clientRoomIdx].messages);
  })

  socket.on("msgSent", (id, message) => {
    // Assign message
    client.message = message;

    // Emit a msgReceived event for each socket
    rooms[clientRoomIdx].messages.push(client.username + ": " + message);
    rooms[clientRoomIdx].clients.forEach(c => {
      c.socket.emit("msgReceived", id, client.username, client.message);
    })
  });

  // Handle disconnects
  socket.on("disconnect", () => {
    rooms[clientRoomIdx].clients.forEach(c => {
      c.socket.emit("clientDisconnect", client.username);
    });

    rooms[clientRoomIdx].messages.push(client.username + " has disconnected.");

    // Remove client from rooms
    rooms[clientRoomIdx].removeClient(client);
    clients.delete(client);

    // Remove room if applicable
    if (rooms[clientRoomIdx].clients.length === 0) {
      rooms.splice(rooms.indexOf(rooms[clientRoomIdx]), 1);
    }
  })
})