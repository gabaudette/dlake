"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.playSong = playSong;
const voice_1 = require("@discordjs/voice");
const ytdl_core_1 = __importDefault(require("@distube/ytdl-core"));
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
// Set FFmpeg path for the environment
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
    // Don't shift here yet! Just peek the first song.
    const song = queue.songs[0];
    if (!song) {
        console.log("No song found to play.");
        queue.textChannel.send("An error has occurred: No song found to play.");
        return;
    }
    try {
        console.log("SONG URL:", song.url);
        console.log("SONG URL type:", typeof song.url);
        console.log("SONG URL length:", song.url?.length);
        if (!song.url || typeof song.url !== "string" || song.url.trim() === "") {
            // Validate URL before attempting to stream
            console.error("Invalid song URL:", song.url);
            queue.textChannel.send("Invalid song URL. Skipping to next song.");
            // Remove the problematic song
            queue.songs.shift();
            if (queue.songs.length > 0) {
                // Attempt next song
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
            console.log("Creating audio stream with ytdl-core...");
            // Validate URL with ytdl-core
            if (!ytdl_core_1.default.validateURL(song.url)) {
                throw new Error(`Invalid YouTube URL: ${song.url}`);
            }
            console.log("URL validated successfully");
            // Create stream with ytdl-core
            const stream = (0, ytdl_core_1.default)(song.url, {
                filter: "audioonly",
                highWaterMark: 1 << 25, // 32MB buffer
                quality: "highestaudio",
            });
            console.log("Stream created successfully");
            const resource = (0, voice_1.createAudioResource)(stream);
            console.log("Audio resource created successfully");
            // Check connection status before playing
            console.log("Connection status:", queue.connection.state.status);
            // Wait for connection to be ready if it's not already
            if (queue.connection.state.status !== voice_1.VoiceConnectionStatus.Ready) {
                console.log("Connection is not ready, waiting for ready state...");
                try {
                    // Use entersState for more reliable waiting
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
            // Add player status logging
            console.log("Player status after play:", queue.player.state.status);
            // Add event listeners for debugging
            queue.player.on(voice_1.AudioPlayerStatus.Playing, () => {
                console.log("Player is now playing!");
            });
            queue.player.on(voice_1.AudioPlayerStatus.Buffering, () => {
                console.log("Player is buffering...");
            });
            // Send message to text channel instead of editing interaction
            queue.textChannel.send(`🎵 Now playing: **${song.title}**`);
            queue.player.once(voice_1.AudioPlayerStatus.Idle, () => {
                // Remove the song *after* it finished playing.
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
                // Remove the song that failed
                queue.songs.shift();
                // Attempt to play next song
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
            // Remove the problematic song
            queue.songs.shift();
            if (queue.songs.length > 0) {
                // Attempt next song
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
        // Remove the problematic song
        queue.songs.shift();
        if (queue.songs.length > 0) {
            // Attempt next song
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
    }
}
