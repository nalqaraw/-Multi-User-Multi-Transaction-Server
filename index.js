const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const chatApp = express(); //binding name to reference an instance of the server 
const server = http.createServer(chatApp);
const io = new Server(server);

chatApp.use(express.static("clients"));


// Global variables to hold all guest names and rooms created
var guests = [];
var rooms = [
  { name: "main", creator: " " },
  { name: "Room 2", creator: " " },
  { name: "Room 3", creator: " " },
];

// connecting to the socket 
io.on("connection", socket => {
  console.log("user is connected!");
  
  //Creating the addGuest command to be called 
  socket.on("addGuest", username =>{//listener function to get the update from the client's end
    
    //adding the new guest to the array and displaying it 
    socket.username = username;
    guests.push(username);
    console.log("adding users array length: "+ guests.length);
    
    //setting the socket connection for the guest to the main room
    socket.currentRoom = "main";
    socket.join("main");

    //updating the chat and displaying the message below to only the new joined user
    socket.emit("updateChat", "INFO", "You have joined main room");//call back function to emit the server's update to the clients
    socket.broadcast.to("main");

    //this will inform the entire room that a member has joined
    socket.broadcast.emit("updateChat", "INFO", username + " has joined the main room");
    io.sockets.emit("updateUsers", guests);
    socket.emit("updateRooms", rooms, "main");//call back function to emit the server's update to the clients
  });

  //code that allows for the user to send a message through sending data
  socket.on("sendMessage", data => {
    io.sockets.to(socket.currentRoom).emit("updateChat", socket.username, data);//call back function to emit the server's update to the clients
  });

  //enabling the createroom fundtion, this pushes the new name of the room and updates the room list
  socket.on("createRoom", room=> { //listener function to get the update from the client's end
    if (room != null) {
      rooms.push({ name: room, creator: socket.username});
      io.sockets.emit("updateRooms", rooms, null); //call back function to emit the server's update to the clients
    }
  });

  //update room content that is executed everytime there is a new room created or if someone leaves etc. 
  socket.on("updateRooms", room => { //listener function to get the update from  the client's end
    socket.broadcast.to(socket.currentRoom);
    socket.broadcast.emit("updateChat", "INFO", socket.username + " has left the room");//call back function to emit the server's update to the clients
    socket.leave(socket.currentRoom);
    socket.currentRoom = room;
    socket.join(room);
    socket.emit("updateChat", "INFO", "Hello! You have joined the " + room + " room");//call back function to emit the server's update to the clients
    socket.broadcast.to(room);
    //function to broadcast the server's update to the clients
    socket.broadcast.emit(
        "updateChat",
        "INFO",
        socket.username + " has joined " + room + " room"
      );
  });

//function to terminate the server gracefully when the client exits the tab
socket.on("disconnect",  ()=> { //listener function waiting to get an update when the client exits the tab (socket is closed)
  console.log(`User ${socket.username} has disconnected.`);
  // delete guests[socket.username];
  guests.pop(socket.username);
  console.log("removing user from array- new length: " + guests.length);

  io.sockets.emit("updateUsers", guests);//call back function to emit the server's update to the clients

  socket.broadcast.emit( //function to broadcast the server's update to the clients
    "updateChat",
    "INFO",
    socket.username + " disconnected"
  );
  

  //if statement to check if there are anymore users on the server, if there arent the socket will be terminated gracefully
  if(guests.length < 1 || guests == undefined){
    socket.disconnect(); //disconnect the socket
    console.log("The server has gracefully terminated!");
    console.log(guests.length);
    server.close(()=>{ //terminate the server 
      console.log("closing the server");
      process.exit(0);
    });
  }
});
});

server.listen(80, ()=> {});