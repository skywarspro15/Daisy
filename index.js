require("dotenv").config({ path: __dirname + "/.env" });
const fs = require("fs");
const cleverbot = require("cleverbot-free");
const discordTTS = require("discord-tts");
const Tesseract = require("tesseract.js");
const {
  REST,
  Routes,
  Client,
  GatewayIntentBits,
  EmbedBuilder,
} = require("discord.js");
const {
  joinVoiceChannel,
  AudioPlayer,
  createAudioResource,
  StreamType,
  entersState,
  VoiceConnectionStatus,
  VoiceConnection,
} = require("@discordjs/voice");
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
  {
    name: "join-voice",
    description: "Start a voice conversation with Daisy.",
  },
  {
    name: "leave-voice",
    description: "End a voice conversation.",
  },
  {
    name: "toggle-moderation",
    description: "Toggles moderation features.",
  },
];

var dataset = {};
var config = {};
var messageCount = 0;
var cow = false;
var connection;

var audioPlayer = new AudioPlayer();

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

if (fs.existsSync("dataset.json")) {
  let rawJSON = fs.readFileSync("dataset.json", "utf8");
  dataset = JSON.parse(rawJSON);
} else {
  fs.writeFileSync("dataset.json", JSON.stringify(dataset, null, 2));
}

if (fs.existsSync("guilds.json")) {
  let rawJSON = fs.readFileSync("guilds.json", "utf8");
  config = JSON.parse(rawJSON);
} else {
  fs.writeFileSync("guilds.json", JSON.stringify(config, null, 2));
}

async function query(data) {
  const response = await fetch(
    "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium",
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
  if (comment.trim() == "") {
    return "False";
  }
  console.log("Checking if message is toxic: " + comment);
  return await fetch(
    "https://NodeToxicityChecker.skywarspro15.repl.co/toxic?comment=" +
      encodeURI(comment.trim())
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
  let modEnabled = true;
  if (message.author.bot) return;
  if (message.guild.id in config) {
    modEnabled = config[message.guild.id]["modEnabled"];
  } else {
    config[message.guild.id] = { "modEnabled": modEnabled };
    fs.writeFileSync("guilds.json", JSON.stringify(config, null, 2));
  }

  messageCount = messageCount + 1;
  timeOut = 2000;

  setTimeout(async function () {
    var messageToxic = await isToxic(message.content);
    var embed;
    console.log(messageToxic);
    if (messageToxic == "False") {
      if (message.attachments.size > 0) {
        message.attachments.forEach(async (attachment) => {
          var ImageURL = attachment.proxyURL;
          const worker = await Tesseract.createWorker({
            logger: (m) => console.log(m),
          });
          await worker.loadLanguage("eng");
          await worker.initialize("eng");
          let text = await worker.recognize(ImageURL);
          let textOCR = String(text["data"]["text"]);
          console.log(textOCR);
          let isMessageToxic = await isToxic(textOCR);
          console.log(isMessageToxic);
          if (isMessageToxic == "True") {
            if (!modEnabled) return;
            if (
              String(textOCR).includes("commit suicide") ||
              String(textOCR).includes("kill myself")
            ) {
              embed = new EmbedBuilder()
                .setColor("#f5e353")
                .setTitle("Hey, " + message.author.username + "! You alright?")
                .setAuthor({
                  name: "Daisy",
                })
                .setDescription(
                  "What you just said is VERY concerning. Get some help."
                )
                .setThumbnail(
                  "https://DarkorangeUnripeHexadecimal.skywarspro15.repl.co/pfp.png"
                )
                .addFields({ name: "You said (in image):", value: textOCR })
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
                .addFields({ name: "You said (in image):", value: textOCR })
                .setTimestamp()
                .setFooter({
                  text: "I'm trying my best to keep this server as clean as possible!",
                  iconURL:
                    "https://DarkorangeUnripeHexadecimal.skywarspro15.repl.co/pfp.png",
                });
            }

            if (
              String(textOCR).toLowerCase().includes("daisy") ||
              String(textOCR).includes("<@1057150902076723290>")
            ) {
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
                .addFields({ name: "You said (in image):", value: textOCR })
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
          }
        });
      }
    }
    if (messageToxic == "True") {
      if (!modEnabled) return;
      if (
        String(message.content).includes("commit suicide") ||
        String(message.content).includes("kill myself")
      ) {
        embed = new EmbedBuilder()
          .setColor("#f5e353")
          .setTitle("Hey, " + message.author.username + "! You alright?")
          .setAuthor({
            name: "Daisy",
          })
          .setDescription(
            "What you just said is VERY concerning. Get some help."
          )
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

      if (
        String(message.content).toLowerCase().includes("daisy") ||
        String(message.content).includes("<@1057150902076723290>")
      ) {
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
      if (
        !String(message.content).toLowerCase().includes("daisy") &&
        !String(message.content).includes("<@1057150902076723290>")
      ) {
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

      let context = [];

      if (message.author.id in dataset) {
        let userStored = dataset[message.author.id];
        context = userStored["context"];
      }
      try {
        cleverbot(message.content, context).then((response) => {
          context.push(message.content);
          context.push(response);
          dataset[message.author.id] = { "context": context };
          fs.writeFileSync("dataset.json", JSON.stringify(dataset, null, 2));
          message.reply(response);
        });
      } catch (e) {
        console.log(e);
        message.reply("Daisy did not respond. \n ```" + e + "```");
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
    fs.writeFileSync("dataset.json", JSON.stringify(dataset, null, 2));
    await interaction.reply("Successfully deleted our conversation.");
  }

  if (interaction.commandName == "join-voice") {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      interaction.reply("Join a voice channel first!");
      return;
    }
    connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: false,
    });
    interaction.reply("Joined in your voice channel!");
  }

  if (interaction.commandName == "leave-voice") {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      interaction.reply("You're not in a voice channel!");
      return;
    }
    connection.destroy();
    interaction.reply("Bye! Left your voice channel.");
  }

  if (interaction.commandName == "toggle-moderation") {
    if (interaction.guild.id in config) {
      let val = config[interaction.guild.id]["modEnabled"];
      if (val == true) {
        val = false;
      } else {
        val = true;
      }
      config[interaction.guild.id]["modEnabled"] = val;
      fs.writeFileSync("guilds.json", JSON.stringify(config, null, 2));
      interaction.reply("Moderation set to: ``" + val + "``");
    } else {
      val = false;
      config[interaction.guild.id] = { "modEnabled": val };
      fs.writeFileSync("guilds.json", JSON.stringify(config, null, 2));
      interaction.reply("Moderation set to: ``" + val + "``");
    }
  }
});

client.on("guildCreate", async (guild) => {
  let embed;
  embed = new EmbedBuilder()
    .setColor("#f5e353")
    .setTitle("Thanks for adding me to your server!")
    .setAuthor({
      name: "Daisy",
    })
    .setDescription(
      "Hi! I'm Daisy. I'm a character from a YouTuber named Ethobot. Be sure to check him out!"
    )
    .addFields(
      {
        name: "What I can do:",
        value:
          "I can have a conversation with you! Just mention my name and I'll respond! \n And, I can keep the server clean and keep toxic content from coming in.",
      },
      {
        name: "Start a voice conversation:",
        value: "/join-voice",
        inline: true,
      },
      {
        name: "End a voice conversation:",
        value: "/leave-voice",
        inline: true,
      }
    )
    .setThumbnail(
      "https://DarkorangeUnripeHexadecimal.skywarspro15.repl.co/pfp.png"
    )
    .setFooter({
      text: "Hi, I'm Daisy!",
      iconURL:
        "https://DarkorangeUnripeHexadecimal.skywarspro15.repl.co/pfp.png",
    });
  guild.systemChannel.send({ embeds: [embed] });
});

client.on("speech", async (msg) => {
  if (!msg.content) return;
  console.log(msg.content);
  if (!String(msg.content).toLowerCase().includes("daisy")) {
    return;
  }
  let context = [];
  if (msg.author.id in dataset) {
    let userStored = dataset[msg.author.id];
    context = userStored["context"];
  }
  cleverbot(msg.content, context).then((response) => {
    context.push(msg.content);
    context.push(response);
    dataset[msg.author.id] = { "context": context };
    fs.writeFileSync("dataset.json", JSON.stringify(dataset, null, 2));
    const stream = discordTTS.getVoiceStream(response);
    const audioResource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
      inlineVolume: true,
    });
    connection.subscribe(audioPlayer);
    audioPlayer.play(audioResource);
  });
});

client.login(process.env.TOKEN);
