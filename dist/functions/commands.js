"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = registerCommands;
exports.handleCommand = handleCommand;
// biome-ignore lint/nursery/noUnresolvedImports: This is necessary for assertions
// biome-ignore lint/style/useNodejsImportProtocol: This is necessary for assertions
const console_1 = require("console");
// biome-ignore lint/nursery/noUnresolvedImports: This import is necessary for environment variable management
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// biome-ignore lint/nursery/noUnresolvedImports: This import is necessary for environment variable management
const node_process_1 = __importDefault(require("node:process"));
const voice_1 = require("@discordjs/voice");
const ytdl_core_1 = __importDefault(require("@distube/ytdl-core"));
const discord_js_1 = require("discord.js");
const song_1 = require("./song");
const GLOBAL_COMMANDS = [
    {
        name: "ping",
        description: "Test if the bot is responding",
    },
    {
        name: "skip",
        description: "Skip the current song",
    },
    {
        name: "pause",
        description: "Pause the music",
    },
    {
        name: "resume",
        description: "Resume the music",
    },
    {
        name: "stop",
        description: "Stop the music",
    },
    {
        name: "queue",
        description: "Show the queue",
    },
    {
        name: "clear",
        description: "Clear the queue",
    },
    {
        name: "nowplaying",
        description: "Show the current song",
    },
];
function buildCommands() {
    const commands = [];
    for (const command of GLOBAL_COMMANDS) {
        commands.push(new discord_js_1.SlashCommandBuilder()
            .setName(command.name)
            .setDescription(command.description));
    }
    const newCommands = [
        ...commands,
        new discord_js_1.SlashCommandBuilder()
            .setName("play")
            .setDescription("Play a song")
            .addStringOption((option) => option
            .setName("url")
            .setDescription("The URL of the song to play")
            .setRequired(true)),
    ];
    return newCommands.map((command) => command.toJSON());
}
async function _handlePing(interaction) {
    console.log("Pong command received.");
    await interaction.reply("🏓 Pong! Bot is working correctly... << DLake official sound ! >>");
}
async function _handleSkip(interaction, queue) {
    if (!queue) {
        await interaction.reply("No music queue found for this server.");
        return;
    }
    queue.player.stop();
    await interaction.reply("Skipped the current song.");
}
async function _handlePause(interaction, queue) {
    if (!queue) {
        await interaction.reply("No music queue found for this server.");
        return;
    }
    queue.player.pause();
    queue.paused = true;
    await interaction.reply("Paused the current song.");
}
async function _handleResume(interaction, queue) {
    if (!queue) {
        await interaction.reply("No music queue found for this server.");
        return;
    }
    if (!queue.paused) {
        await interaction.reply("▶️ Not paused.");
        return;
    }
    queue.player.unpause();
    queue.paused = false;
    await interaction.reply("Resumed the current song.");
}
async function _handleStop(interaction, queue, queues) {
    if (!queue) {
        await interaction.reply("No music queue found for this server.");
        return;
    }
    queue.songs = [];
    queue.player.stop();
    queues?.delete(interaction.guildId);
    await interaction.reply("Stopped the music and cleared the queue.");
}
async function _handleQueue(interaction, queue) {
    if (!queue) {
        await interaction.reply("No music queue found for this server.");
        return;
    }
    if (queue.songs.length === 0) {
        await interaction.reply("The queue is empty.");
    }
    else {
        const list = queue.songs.map((s, i) => `${i + 1}. ${s.title}`).join("\n");
        await interaction.reply(`📜 **Queue:**\n${list}`);
    }
}
async function _handleNowPlaying(interaction, queue) {
    if (!queue) {
        await interaction.reply("No music queue found for this server.");
        return;
    }
    await interaction.reply(`🎶 Now playing: **${queue.songs[0]?.title || "Nothing"}**`);
}
async function _handlePlaySong(interaction, queue, queues) {
    try {
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
        let songInfo;
        try {
            const info = await ytdl_core_1.default.getInfo(url);
            songInfo = {
                title: info.videoDetails.title ??
                    "An unknown youtube video (probably an obscured one you can't play anyway)",
                url,
            };
        }
        catch (error) {
            console.error("Error fetching video info:", error);
            await interaction.reply("❌ Failed to retrieve video information. Please check the URL and try again.");
            return;
        }
        if (!queue) {
            if (!interaction.guild) {
                await interaction.reply("This command can only be used in a server.");
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
            queue.songs.push(songInfo);
            await interaction.reply(`🎵 Added to queue: **${songInfo.title}**`);
            if (!queue.playing) {
                const currentQueue = queues.get(interaction.guildId);
                if (!currentQueue) {
                    await interaction.followUp("❌ Failed to retrieve queue.");
                    return;
                }
                await (0, song_1.playSong)(interaction, currentQueue, (guildId) => {
                    queues.delete(guildId);
                });
            }
            return;
        }
        const currentQueue = queues.get(interaction.guildId);
        if (!currentQueue) {
            await interaction.reply("❌ Failed to create or retrieve queue.");
            return;
        }
        await (0, song_1.playSong)(interaction, currentQueue, (guildId) => {
            queues.delete(guildId);
        });
    }
    catch (error) {
        console.error("Error in _playSong:", error);
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply("❌ An unexpected error occurred while processing your request. Please try again.");
            }
            else if (interaction.deferred) {
                await interaction.editReply("❌ An unexpected error occurred while processing your request. Please try again.");
            }
            else {
                await interaction.followUp("❌ An unexpected error occurred while processing your request. Please try again.");
            }
        }
        catch (replyError) {
            console.error("Error sending error message in _playSong:", replyError);
        }
        if (interaction.guildId) {
            try {
                const partialQueue = queues.get(interaction.guildId);
                if (partialQueue) {
                    partialQueue.player.stop();
                    if (partialQueue.connection.state.status !==
                        voice_1.VoiceConnectionStatus.Destroyed) {
                        partialQueue.connection.destroy();
                    }
                    queues.delete(interaction.guildId);
                }
            }
            catch (cleanupError) {
                console.error("Error during cleanup in _playSong:", cleanupError);
            }
        }
    }
}
async function registerCommands() {
    const commands = buildCommands();
    (0, console_1.assert)(node_process_1.default.env.DISCORD_TOKEN, "DISCORD_TOKEN is not set in .env");
    const rest = new (await Promise.resolve().then(() => __importStar(require("@discordjs/rest")))).REST({
        version: "10",
    }).setToken(node_process_1.default.env.DISCORD_TOKEN ?? "");
    try {
        (0, console_1.assert)(node_process_1.default.env.CLIENT_ID, "CLIENT_ID is not set in .env");
        (0, console_1.assert)(node_process_1.default.env.GUILD_ID, "GUILD_ID is not set in .env");
        await rest.put((await Promise.resolve().then(() => __importStar(require("discord-api-types/v10")))).Routes.applicationGuildCommands(node_process_1.default.env.CLIENT_ID ?? "", node_process_1.default.env.GUILD_ID ?? ""), { body: commands });
    }
    catch (error) {
        console.error("Error registering commands:", error);
    }
}
async function handleCommand(interaction, queue, queues) {
    try {
        switch (interaction.commandName) {
            case "ping":
                await _handlePing(interaction);
                break;
            case "play":
                await _handlePlaySong(interaction, queue, queues);
                break;
            case "skip":
                await _handleSkip(interaction, queue);
                break;
            case "pause":
                await _handlePause(interaction, queue);
                break;
            case "resume":
                await _handleResume(interaction, queue);
                break;
            case "stop":
                await _handleStop(interaction, queue, queues);
                break;
            case "queue":
                await _handleQueue(interaction, queue);
                break;
            case "nowplaying":
                await _handleNowPlaying(interaction, queue);
                break;
        }
    }
    catch (error) {
        console.error("Error in handleCommand:", error);
        try {
            if (interaction.isChatInputCommand()) {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply("❌ An unexpected error occurred. Please try again.");
                }
                else if (interaction.deferred) {
                    await interaction.editReply("❌ An unexpected error occurred. Please try again.");
                }
                else {
                    await interaction.followUp("❌ An unexpected error occurred. Please try again.");
                }
            }
        }
        catch (replyError) {
            console.error("Error sending error message:", replyError);
        }
    }
}
