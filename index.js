require("dotenv").config({ path: __dirname + "/.env" });
const fs = require("fs");
const {
  REST,
  Routes,
  Client,
  GatewayIntentBits,
  EmbedBuilder,
} = require("discord.js");
const { joinVoiceChannel } = require("@discordjs/voice");
const { addSpeechEvent } = require("discord-speech-recognition");
const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});
addSpeechEvent(client);
const fetch = require("node-fetch");

const commands = [
  {
    name: "hi",
    description: "Say hi to Daisy!",
  },
  {
    name: "cow",
    description: "Morph Daisy back to her former self.",
  },
  {
    name: "forget",
    description: "Daisy will forget a conversation with you and start fresh.",
  },
];

var dataset = {};
var messageCount = 0;
var cow = false;
var connection;

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

if (fs.existsSync("dataset.json")) {
  let rawJSON = fs.readFileSync("dataset.json", "utf8");
  dataset = JSON.parse(rawJSON);
} else {
  fs.writeFileSync("dataset.json", JSON.stringify(dataset));
}

async function query(data) {
  const response = await fetch(
    "https://api-inference.huggingface.co/models/satvikag/chatbot",
    {
      headers: {
        Authorization: "Bearer " + process.env.BEARER,
      },
      method: "POST",
      body: JSON.stringify(data),
    }
  );
  const result = await response.json();
  return result;
}

async function isToxic(comment) {
  console.log("Checking if message is toxic: " + comment);
  return await fetch(
    "https://NodeToxicityChecker.skywarspro15.repl.co/toxic?comment=" + comment
  ).then((result) => result.text());
}

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(Routes.applicationCommands("1057150902076723290"), {
      body: commands,
    });

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("messageCreate", async (message) => {
  let isCommand = false;
  if (message.author.bot) return;
  messageCount = messageCount + 1;
  timeOut = 2000;

  if (
    String(message.content).toLowerCase().includes("daisy") &&
    String(message.content).toLowerCase().includes("vc")
  ) {
    isCommand = true;
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      message.reply("Join a voice channel first!");
      return;
    }
    message.reply("Sure! Joining...");
    connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: false,
    });
  }

  setTimeout(async function () {
    const messageToxic = await isToxic(message.content);
    var embed;
    if (messageToxic == "True") {
      if (String(message.content).includes("commit suicide")) {
        embed = new EmbedBuilder()
          .setColor("#f5e353")
          .setTitle("Hey, " + message.author.username + "! You alright?")
          .setAuthor({
            name: "Daisy",
          })
          .setDescription("What you just said is VERY concerning.")
          .setThumbnail(
            "https://DarkorangeUnripeHexadecimal.skywarspro15.repl.co/pfp.png"
          )
          .addFields({ name: "You said:", value: message.content })
          .setTimestamp()
          .setFooter({
            text: "I'm trying my best to keep this server as clean as possible!",
            iconURL:
              "https://DarkorangeUnripeHexadecimal.skywarspro15.repl.co/pfp.png",
          });
      } else {
        embed = new EmbedBuilder()
          .setColor("#f5e353")
          .setTitle("HEY!!! You weren't supposed to say that!")
          .setAuthor({
            name: "Daisy",
          })
          .setDescription("Could you NOT say that again?")
          .setThumbnail(
            "https://DarkorangeUnripeHexadecimal.skywarspro15.repl.co/daisy%20angery.png"
          )
          .addFields({ name: "You said:", value: message.content })
          .setTimestamp()
          .setFooter({
            text: "I'm trying my best to keep this server as clean as possible!",
            iconURL:
              "https://DarkorangeUnripeHexadecimal.skywarspro15.repl.co/pfp.png",
          });
      }

      if (String(message.content).toLowerCase().includes("daisy")) {
        embed = new EmbedBuilder()
          .setColor("#f5e353")
          .setTitle("WHAT DID YOU JUST SAY ABOUT ME???")
          .setAuthor({
            name: "Daisy",
          })
          .setDescription("I'm just minding my own business!")
          .setThumbnail(
            "https://DarkorangeUnripeHexadecimal.skywarspro15.repl.co/filtered.png"
          )
          .addFields({ name: "You said:", value: message.content })
          .setTimestamp()
          .setFooter({
            text: "I'm trying my best to keep this server as clean as possible!",
            iconURL:
              "https://DarkorangeUnripeHexadecimal.skywarspro15.repl.co/pfp.png",
          });
      }

      message.channel.send({
        content: "<@" + message.author.id + ">",
        embeds: [embed],
      });
      message.delete();
    } else {
      if (isCommand) return;
      if (!String(message.content).toLowerCase().includes("daisy")) {
        if (message.reference) {
          const repliedTo = await message.channel.messages.fetch(
            message.reference.messageId
          );

          console.log(repliedTo.content);
          if (!repliedTo.author.bot) return;
        } else {
          return;
        }
      }

      message.channel.sendTyping();

      let inputs = [];
      let responses = [];
      if (message.author.id in dataset) {
        let userStored = dataset[message.author.id];
        inputs = userStored["inputs"];
        responses = userStored["responses"];
      }
      let result = await query({
        "inputs": {
          "past_user_inputs": inputs,
          "generated_responses": responses,
          "text": message.content,
        },
      });
      if ("generated_text" in result) {
        inputs.push(message.content);
        responses.push(result["generated_text"]);
        console.log(inputs);
        console.log(responses);
        dataset[message.author.id] = {
          "inputs": inputs,
          "responses": responses,
        };
        fs.writeFileSync("dataset.json", JSON.stringify(dataset));
        message.reply(result["generated_text"]);
      }
    }
    messageCount = messageCount - 1;
  }, timeOut);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "hi") {
    if (!cow) {
      await interaction.reply(
        "Hello there, " + interaction.member.user.username + "!"
      );
    } else {
      await interaction.reply("Moo, " + interaction.member.user.username + "!");
    }
  }

  if (interaction.commandName === "cow") {
    let embed;
    if (cow) {
      cow = false;
      embed = new EmbedBuilder()
        .setColor("#f5e353")
        .setTitle("I'm a human now!!!")
        .setAuthor({
          name: "Daisy",
        })
        .setDescription("Yes. I can still moo.")
        .setThumbnail(
          "https://DarkorangeUnripeHexadecimal.skywarspro15.repl.co/pfp.png"
        )
        .setFooter({
          text: "I'm a human but that doesn't mean I can't moo.",
          iconURL:
            "https://DarkorangeUnripeHexadecimal.skywarspro15.repl.co/pfp.png",
        });
    } else {
      cow = true;
      cow = false;
      embed = new EmbedBuilder()
        .setColor("#f5e353")
        .setTitle("Moo")
        .setAuthor({
          name: "Daisy",
        })
        .setDescription("Moo")
        .setThumbnail(
          "https://DarkorangeUnripeHexadecimal.skywarspro15.repl.co/cow.png"
        )
        .setFooter({
          text: "Moo",
          iconURL:
            "https://DarkorangeUnripeHexadecimal.skywarspro15.repl.co/pfp.png",
        });
    }
    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName == "forget") {
    delete dataset[interaction.member.user.id];
    fs.writeFileSync("dataset.json", JSON.stringify(dataset));
    await interaction.reply("Successfully deleted our conversation.");
  }
});

client.on("speech", (msg) => {
  if (!msg.content) return;
  console.log(msg.content);
  const noMic = client.channels.cache.get("1057256110702207066");
  if (String(msg.content).includes("how are you")) {
    noMic.send("I'm doing good, <@" + msg.author.id + ">! How about you?");
  }
  if (String(msg.content).includes("i'm doing good")) {
    noMic.send("It's great that you're doing good!");
  }
  if (String(msg.content).includes("you may now leave")) {
    noMic.send("Bye!!");
    connection.destroy();
  }
});

client.login(process.env.TOKEN);
