let { WebSocket } = require("ws");
require("dotenv").config({ path: __dirname + "/.env" });
const sock = new WebSocket("wss://chatty.ktat.repl.co/b/spam");

var heartbeat;
var token;

let users = [];

var helpString = "Command list:  \n  ";
var fetch = require("@replit/node-fetch");
var fetch2 = require("node-fetch");

async function DaisyChatAI(message) {
  console.log("DaisyChat is processing: " + message);
  const response = await fetch2(
    "https://DaisyChat-AI.skywarspro15.repl.co/chat?q=" + message
  );
  const result = await response.text();
  return result;
}

let commands = {
  help: {
    desc: "Get a list of commands, or help for a specific command",
    usage: "help [command]",
    exec: async function (e) {
      return helpString;
    },
  },
  say: {
    desc: "Quote something from you",
    usage: "say <whatever>",
    exec: async function (e) {
      return `> ${e.command.slice(1).join(" ")}<br>— *${e.who.name}*`;
    },
  },
  whois: {
    desc: "Get information about a user",
    usage: "whois <user>",
    exec: async function (e) {
      let userToFetch = e.command.slice(1)[0].toLowerCase();
      let user = users.find((m) =>
        m.name.toLowerCase().startsWith(userToFetch)
      );
      if (user === undefined) return "That user was not found.";
      if (user.isBot === undefined) {
        return `@${user.name} \n- Replit user ID: ${user.id}\n- Avatar: <img width=64 src="${user.profileImage}">`;
      } else {
        return `@${
          user.name
        }  \n- This is a bot.\n- Avatar: <img width=64 src="${
          user.profileImage
        }">\n- About this bot:\n> ${
          user.info || "No data"
        }\n\nTry asking it \`/${user.name} help\`!`;
      }
    },
  },

  // Fallback command is just a part of how it works lol
  fallback: {
    exec: async function (e) {
      return `I'm sorry, ${e.who.name}, I did not understand your command.`;
    },
  },
};

var keys = Object.keys(commands);
for (let i = 0; i < keys.length; i++) {
  var key = keys[i];
  if (key === "fallback") continue;
  var desc = commands[key].desc;
  var usage = commands[key].usage;
  helpString += `- \`${key}\` ${desc}  \n    Usage: ${usage}\n`;
}
var count;

async function botReply(slashCommand, data) {
  console.log(commands[slashCommand]);
  if (commands[slashCommand]) {
    return sock.send(
      JSON.stringify({
        type: "sendMessage",
        data: await commands[slashCommand].exec(data),
        wssMessageData: {
          token,
        },
      })
    );
  } else {
    return sock.send(
      JSON.stringify({
        type: "sendMessage",
        data: await commands.fallback.exec(data),
        wssMessageData: {
          token,
        },
      })
    );
  }
}

sock.onmessage = async (e) => {
  try {
    var d = JSON.parse(e.data);

    if (d.type && d.type === "slash") {
      var command = d.command[0];
      console.log("[RECV] Slash command:", command);
      return botReply(command, d);
    } else if (d.type && d.type === "hbr") {
      users = d.message;
      return;
    }
    // you can also listen for a message event although that is not done here
    if (d.type === "message") {
      console.log(d);
      if (d.who.isBot == true) return;
      if (!String(d.message).includes("daisy")) return;
      if (String(d.message).startsWith("/")) return;
      let curMessage = await DaisyChatAI(d.message);
      console.log(curMessage);
      return sock.send(
        JSON.stringify({
          type: "sendMessage",
          data: curMessage,
          wssMessageData: {
            token,
          },
        })
      );
    }

    if (d.token && token === undefined) {
      token = d.token;
      console.log("got it!", token);
      sock.send(
        JSON.stringify({
          type: "bot",
          bot: {
            name: "Daisy",
            info: "The Daisy bot, ported over for Chatty",
            image:
              "https://DarkorangeUnripeHexadecimal.skywarspro15.repl.co/pfp.png", // Change this URL to any image
          },
          wssMessageData: {
            token,
          },
        })
      );
    }
  } catch (e) {
    console.log("oopsie", e);
  }
};
sock.onopen = (e) => {
  console.log("[OPENED]", "waiting for bot token..");
};
sock.onclose = (e) => {
  console.log("[CLOSED]");
};

heartbeat = setInterval(() => {
  try {
    let json = JSON.stringify({
      type: "heartbeat",
      wssMessageData: { token: token },
    });
    sock.send(json);
    // console.log(">", json);
  } catch (e) {
    sock.close();
    clearInterval(heartbeat);
  }
}, 1000);
