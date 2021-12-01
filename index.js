const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const chatApp = express();
const server = http.createServer(chatApp);
const io = new Server(server);

chatApp.use(express.static("clients"));

// Global variables to hold all guest names and rooms created
var guests = {};
var rooms = [
  { name: "main", creator: "Anonymous" },
  { name: "Room 2", creator: "Anonymous" },
];

io.on("connection", socket => {
  console.log(`User connected to server.`);

  socket.on("createUser", username =>{
    socket.username = username;
    guests[username] = username;
    socket.currentRoom = "main";
    socket.join("main");

    console.log(`User ${username} created on server successfully.`);

    socket.emit("updateChat", "INFO", "You have joined main room");
    socket.broadcast
      .to("main")
      .emit("updateChat", "INFO", username + " has joined the main room");
    io.sockets.emit("updateUsers", guests);
    socket.emit("updateRooms", rooms, "main");
  });

  socket.on("sendMessage", data => {
    io.sockets.to(socket.currentRoom).emit("updateChat", socket.username, data);
  });

  socket.on("createRoom", room=> {
    if (room != null) {
      rooms.push({ name: room, creator: socket.username});
      io.sockets.emit("updateRooms", rooms, null);
    }
  });

  socket.on("updateRooms", room => {
    socket.broadcast
      .to(socket.currentRoom)
      .emit("updateChat", "INFO", socket.username + " has left the room");
    socket.leave(socket.currentRoom);
    socket.currentRoom = room;
    socket.join(room);
    socket.emit("updateChat", "INFO", "Hello! You have joined the " + room + " room");
    socket.broadcast
      .to(room)
      .emit(
        "updateChat",
        "INFO",
        socket.username + " has joined " + room + " room"
      );
  });

  socket.on("disconnect",  ()=> {
    console.log(`User ${socket.username} has disconnected.`);
    delete guests[socket.username];
    io.sockets.emit("updateUsers", guests);
    socket.broadcast.emit(
      "updateChat",
      "INFO",
      socket.username + " disconnected"
    );
  });
});

server.listen(80, ()=> {
  console.log("Listening to port 80.");
});