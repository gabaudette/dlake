"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const commands_1 = require("./functions/commands");
const song_1 = require("./functions/song");
const voice_1 = require("@discordjs/voice");
const ytdl_core_1 = __importDefault(require("@distube/ytdl-core"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.GuildVoiceStates,
    ],
});
client.once("ready", () => {
    console.log(`Logged in as ${client.user?.tag}`);
    (0, commands_1.registerCommands)();
});
client.on("interactionCreate", (interaction) => {
    handleCommand(interaction);
});
const queues = new Map();
async function handleCommand(interaction) {
    if (!interaction.isCommand())
        return;
    if (!interaction.isChatInputCommand()) {
        await interaction.reply("This command can only be used as a chat input command.");
        return;
    }
    if (!interaction?.guildId) {
        await interaction?.reply("This command can only be used in a server.");
        return;
    }
    const queue = queues.get(interaction.guildId);
    switch (interaction.commandName) {
        case "ping":
            await interaction.reply("🏓 Pong! Bot is working correctly... << DLake official sound ! >>");
            break;
        case "play":
            _playSong(interaction, queue);
            break;
        case "skip":
            if (!queue) {
                await interaction.reply("No music queue found for this server.");
                return;
            }
            queue.player.stop();
            await interaction.reply("Skipped the current song.");
            break;
        case "pause":
            if (!queue) {
                await interaction.reply("No music queue found for this server.");
                return;
            }
            queue.player.pause();
            queue.paused = true;
            await interaction.reply("Paused the current song.");
            break;
        case "resume":
            if (!queue) {
                await interaction.reply("No music queue found for this server.");
                return;
            }
            if (!queue.paused)
                return interaction.reply("▶️ Not paused.");
            queue.player.unpause();
            queue.paused = false;
            await interaction.reply("Resumed the current song.");
            break;
        case "stop":
            if (!queue) {
                await interaction.reply("No music queue found for this server.");
                return;
            }
            queue.songs = [];
            queue.player.stop();
            queues.delete(interaction.guildId);
            await interaction.reply("Stopped the music and cleared the queue.");
            break;
        case "queue":
            if (!queue) {
                await interaction.reply("No music queue found for this server.");
                return;
            }
            if (queue.songs.length === 0) {
                await interaction.reply("The queue is empty.");
            }
            else {
                const list = queue.songs
                    .map((s, i) => `${i + 1}. ${s.title}`)
                    .join("\n");
                await interaction.reply(`📜 **Queue:**\n${list}`);
            }
            break;
        case "nowplaying":
            if (!queue) {
                await interaction.reply("No music queue found for this server.");
                return;
            }
            await interaction.reply(`🎶 Now playing: **${queue.songs[0]?.title || "Nothing"}**`);
    }
}
client.login(process.env.DISCORD_TOKEN);
async function _playSong(interaction, queue) {
    if (!interaction?.guildId) {
        await interaction?.reply("This command can only be used in a server.");
        return;
    }
    const url = interaction.options.getString("url", true);
    const member = interaction.member;
    const memberVoiceChannel = member.voice?.channel;
    if (!memberVoiceChannel) {
        await interaction.reply("You need to be in a voice channel to play music.");
        return;
    }
    await interaction.deferReply();
    let songInfo;
    try {
        const info = await ytdl_core_1.default.getInfo(url);
        songInfo = {
            title: info.videoDetails.title ??
                "An unknown youtube video (probably an obscured one you can't play anyway)",
            url: url,
        };
    }
    catch {
        await interaction.editReply("❌ Failed to retrieve video info.");
        return;
    }
    if (!queue) {
        if (!interaction.guild) {
            await interaction.editReply("This command can only be used in a server.");
            return;
        }
        const connection = (0, voice_1.joinVoiceChannel)({
            channelId: memberVoiceChannel.id,
            guildId: interaction.guildId,
            adapterCreator: interaction.guild.voiceAdapterCreator,
        });
        const player = (0, voice_1.createAudioPlayer)({
            behaviors: { noSubscriber: voice_1.NoSubscriberBehavior.Pause },
        });
        const newQueue = {
            textChannel: interaction.channel,
            voiceChannelId: memberVoiceChannel.id,
            connection,
            player,
            songs: [songInfo],
            playing: false,
            paused: false,
        };
        queues.set(interaction.guildId, newQueue);
        connection.subscribe(player);
    }
    else {
        // Add song to existing queue
        queue.songs.push(songInfo);
        await interaction.editReply(`🎵 Added to queue: **${songInfo.title}**`);
        // If nothing is currently playing, start playing
        if (!queue.playing) {
            const currentQueue = queues.get(interaction.guildId);
            if (!currentQueue) {
                await interaction.followUp("❌ Failed to retrieve queue.");
                return;
            }
            await (0, song_1.playSong)(interaction, currentQueue);
        }
        return;
    }
    const currentQueue = queues.get(interaction.guildId);
    if (!currentQueue) {
        await interaction.editReply("❌ Failed to create or retrieve queue.");
        return;
    }
    await (0, song_1.playSong)(interaction, currentQueue);
}
