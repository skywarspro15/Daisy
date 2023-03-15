const { io } = require("socket.io-client");
const socket = io("wss://MineFlayerEndpoint.skywarspro15.repl.co");

var user;
var curBlock;
var taskFinished = false;

socket.on("connect", () => {
  socket.emit("CREATE", {
    "name": "DaisyBot",
    "address": "RealSMPServer.aternos.me",
    "port": 11064,
  });
});

socket.on("MESSAGE", (arg) => {
  console.log(arg);
  if (arg["name"] == "DaisyBot") return;
  if (arg["message"] == "hi") {
    socket.emit("MESSAGE", "hi " + arg["name"]);
  }
  if (arg["message"] == "follow me") {
    socket.emit("MESSAGE", "OK, " + arg["name"] + ". Finding a path...");
    socket.emit("FOLLOW", arg["name"]);
  }
  if (String(arg["message"]).includes("mine")) {
    let args = String(arg["message"]).split(" ");
    socket.emit("MESSAGE", "Trying to gather: " + args[1]);
    socket.emit("FINDBLOCK", args[1] + " " + args[2]);
    curBlock = args[1];
    user = arg["name"];
  }
  if (String(arg["message"]).includes("drop")) {
    let args = String(arg["message"]).split(" ");
    socket.emit("MESSAGE", "Trying to drop: " + args[1]);
    socket.emit("DROPITEM", args[1]);
  }
  if (arg["message"] == "guard") {
    socket.emit("MESSAGE", "Guarding your location...");
    socket.emit("GUARD", arg["name"]);
  }
});

socket.on("TASKDONE", (arg) => {
  socket.emit("MESSAGE", arg);
  if (arg == "Mining task finished") {
    socket.emit("FOLLOW", user);
  }
});

socket.on("BLOCKNOTFOUND", (arg) => {
  socket.emit("MESSAGE", "Sorry, I can't see any of those blocks nearby.");
});

socket.on("CANNOTFIND", (arg) => {
  socket.emit("MESSAGE", arg);
});

socket.on("PATHFOUND", (arg) => {
  socket.emit(
    "MESSAGE",
    "Found a path! I'll get there within " + arg.length + " steps."
  );
});

socket.on("ARRIVED", (arg) => {
  socket.emit("MESSAGE", "Just arrived! You should see me now.");
  if (taskFinished == true) {
    //socket.emit("DROPITEM", curBlock);
  }
});

socket.on("LOG", (arg) => {
  console.log(arg);
});
