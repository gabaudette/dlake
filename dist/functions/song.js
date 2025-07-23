"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.playSong = playSong;
const voice_1 = require("@discordjs/voice");
const ytdl_core_1 = __importDefault(require("@distube/ytdl-core"));
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
if (ffmpeg_static_1.default) {
    process.env.FFMPEG_PATH = ffmpeg_static_1.default;
}
async function playSong(interaction, queue) {
    if (queue.songs.length === 0) {
        console.log("No songs in the queue to play.");
        queue.textChannel.send("No songs in the queue to play.");
        try {
            if (queue.connection.state.status !== voice_1.VoiceConnectionStatus.Destroyed) {
                queue.connection.destroy();
            }
        }
        catch (error) {
            console.error("Error destroying connection:", error);
        }
        return;
    }
    const song = queue.songs[0];
    if (!song) {
        console.log("An error has occurred: No song found to play.");
        queue.textChannel.send("An error has occurred: No song found to play.");
        return;
    }
    try {
        if (!song.url || typeof song.url !== "string" || song.url.trim() === "") {
            console.error("Invalid song URL:", song.url);
            queue.textChannel.send("Invalid song URL. Skipping to next song.");
            queue.songs.shift();
            if (queue.songs.length > 0) {
                playSong(interaction, queue);
            }
            else {
                queue.textChannel.send("Queue is empty. Stopping playback.");
                queue.playing = false;
                try {
                    if (queue.connection.state.status !== voice_1.VoiceConnectionStatus.Destroyed) {
                        queue.connection.destroy();
                    }
                }
                catch (destroyError) {
                    console.error("Error destroying connection:", destroyError);
                }
            }
            return;
        }
        try {
            if (!ytdl_core_1.default.validateURL(song.url)) {
                throw new Error(`Invalid YouTube URL: ${song.url}`);
            }
            const stream = (0, ytdl_core_1.default)(song.url, {
                filter: "audioonly",
                highWaterMark: 1 << 25, // 32MB buffer
                quality: "highestaudio",
            });
            console.log("Stream created successfully");
            const resource = (0, voice_1.createAudioResource)(stream);
            console.log("Audio resource created successfully");
            console.log("Connection status:", queue.connection.state.status);
            if (queue.connection.state.status !== voice_1.VoiceConnectionStatus.Ready) {
                console.log("Connection is not ready, waiting for ready state...");
                try {
                    await (0, voice_1.entersState)(queue.connection, voice_1.VoiceConnectionStatus.Ready, 15_000);
                    console.log("Connection is now ready!");
                }
                catch (error) {
                    console.error("Failed to establish voice connection:", error);
                    throw new Error("Voice connection failed to establish");
                }
            }
            console.log("Starting playback...");
            queue.player.play(resource);
            queue.playing = true;
            queue.paused = false;
            console.log("Player status after play:", queue.player.state.status);
            queue.player.on(voice_1.AudioPlayerStatus.Playing, () => {
                console.log("Player is now playing!");
            });
            queue.player.on(voice_1.AudioPlayerStatus.Buffering, () => {
                console.log("Player is buffering...");
            });
            queue.textChannel.send(`🎵 Now playing: **${song.title}**`);
            queue.player.once(voice_1.AudioPlayerStatus.Idle, () => {
                queue.songs.shift();
                if (queue.songs.length > 0) {
                    playSong(interaction, queue);
                }
                else {
                    queue.textChannel.send("Queue is empty. Stopping playback.");
                    queue.playing = false;
                    try {
                        if (queue.connection.state.status !== voice_1.VoiceConnectionStatus.Destroyed) {
                            queue.connection.destroy();
                        }
                    }
                    catch (error) {
                        console.error("Error destroying connection:", error);
                    }
                }
            });
            queue.player.once("error", (error) => {
                console.error("Error occurred while playing the song:", error);
                queue.textChannel.send("An error has occurred while trying to play the song.");
                queue.songs.shift();
                if (queue.songs.length > 0) {
                    playSong(interaction, queue);
                }
                else {
                    queue.textChannel.send("Queue is empty. Stopping playback.");
                    queue.playing = false;
                    try {
                        if (queue.connection.state.status !== voice_1.VoiceConnectionStatus.Destroyed) {
                            queue.connection.destroy();
                        }
                    }
                    catch (error) {
                        console.error("Error destroying connection:", error);
                    }
                }
            });
        }
        catch (error) {
            console.error("Error streaming song:", error);
            queue.textChannel.send("Failed to stream the song. Skipping to next song.");
            queue.songs.shift();
            if (queue.songs.length > 0) {
                playSong(interaction, queue);
            }
            else {
                queue.textChannel.send("Queue is empty. Stopping playback.");
                queue.playing = false;
                try {
                    if (queue.connection.state.status !== voice_1.VoiceConnectionStatus.Destroyed) {
                        queue.connection.destroy();
                    }
                }
                catch (destroyError) {
                    console.error("Error destroying connection:", destroyError);
                }
            }
            return;
        }
    }
    catch (error) {
        console.error("Error occurred while trying to play the song:", error);
        queue.textChannel.send("An error has occurred while trying to play the song.");
        queue.songs.shift();
        // If there are more songs in the queue, play the next one
        // This act as a fallback to ensure the queue continues
        // playing if there are songs left and the current song fails to play
        if (queue.songs.length > 0) {
            playSong(interaction, queue);
            return;
        }
        queue.textChannel.send("Queue is empty. Stopping playback.");
        queue.playing = false;
        try {
            if (queue.connection.state.status !== voice_1.VoiceConnectionStatus.Destroyed) {
                queue.connection.destroy();
            }
        }
        catch (error) {
            console.error("Error destroying connection:", error);
        }
    }
}
