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

  // Keep track of the room object that the client is currently in
  let clientRoom;

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
        clientRoom = rooms[i];
      }
    }

    if (roomExists == false) {
      let room = new Room(roomCode);
      room.addClient(client)
      rooms.push(room);
      clientRoom = room;
    }

    // Tell other clients in the same room that we have connected
    clientRoom.clients.forEach(c => {
      if (c != client) {
        c.socket.emit("clientConnect", client.username);
      }
    })

    // Push existing chat history to the new client
    clientRoom.messages.push(username + " has connected.");
    client.socket.emit("buildHistory", clientRoom.messages);
  });

  socket.on("msgSent", (id, message) => {
    // Assign message
    client.message = message;

    // Emit a msgReceived event for each socket
    clientRoom.messages.push(client.username + ": " + message);
    clientRoom.clients.forEach(c => {
      c.socket.emit("msgReceived", id, client.username, client.message);
    })
  });

  // Handle disconnects
  socket.on("disconnect", () => {
    clientRoom.clients.forEach(c => {
      c.socket.emit("clientDisconnect", client.username);
    });

    clientRoom.messages.push(client.username + " has disconnected.");

    // Remove client from rooms
    clientRoom.removeClient(client);
    clients.delete(client);

    // Remove room if applicable
    if (clientRoom.clients.length === 0) {
      rooms.splice(rooms.indexOf(clientRoom), 1);
    }
  })
})