"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.playSong = playSong;
// biome-ignore lint/nursery/noUnresolvedImports: This import is necessary for environment variable management
const node_process_1 = __importDefault(require("node:process"));
const voice_1 = require("@discordjs/voice");
const ytdl_core_1 = __importDefault(require("@distube/ytdl-core"));
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
if (ffmpeg_static_1.default) {
    node_process_1.default.env.FFMPEG_PATH = ffmpeg_static_1.default;
}
async function _handleEmptyQueue(interaction, queue, onQueueEmpty) {
    console.log("No songs in the queue to play.");
    try {
        await queue.textChannel.send("No songs in the queue to play.");
    }
    catch (error) {
        console.error("Error sending message to text channel:", error);
    }
    try {
        if (queue.connection.state.status !== voice_1.VoiceConnectionStatus.Destroyed) {
            queue.connection.destroy();
        }
    }
    catch (error) {
        console.error("Error destroying connection:", error);
    }
    if (onQueueEmpty && interaction.guildId) {
        try {
            onQueueEmpty(interaction.guildId);
        }
        catch (error) {
            console.error("Error calling onQueueEmpty callback:", error);
        }
    }
}
async function _handleNoSong(interaction, queue, onQueueEmpty) {
    console.log("An error has occurred: No song found to play.");
    try {
        await queue.textChannel.send("An error has occurred: No song found to play.");
    }
    catch (error) {
        console.error("Error sending message to text channel:", error);
    }
    queue.playing = false;
    try {
        if (queue.connection.state.status !== voice_1.VoiceConnectionStatus.Destroyed) {
            queue.connection.destroy();
        }
    }
    catch (error) {
        console.error("Error destroying connection:", error);
    }
    if (onQueueEmpty && interaction.guildId) {
        try {
            onQueueEmpty(interaction.guildId);
        }
        catch (error) {
            console.error("Error calling onQueueEmpty callback:", error);
        }
    }
}
async function _handleInvalidUrl(interaction, queue, onQueueEmpty, url) {
    console.error("Invalid song URL:", url);
    queue.textChannel.send("Invalid song URL. Skipping to next song.");
    queue.songs.shift();
    if (queue.songs.length > 0) {
        await playSong(interaction, queue, onQueueEmpty);
        return;
    }
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
    if (onQueueEmpty && interaction.guildId) {
        onQueueEmpty(interaction.guildId);
    }
}
async function _playAudio(interaction, queue, onQueueEmpty, song) {
    if (!ytdl_core_1.default.validateURL(song.url)) {
        throw new Error(`Invalid YouTube URL: ${song.url}`);
    }
    const highWaterMark = 33_554_432; // 1 << 25, equivalent to 32MB
    const stream = (0, ytdl_core_1.default)(song.url, {
        filter: "audioonly",
        highWaterMark,
        quality: "highestaudio",
    });
    const resource = (0, voice_1.createAudioResource)(stream);
    const timeoutOrSignal = 15_000;
    if (queue.connection.state.status !== voice_1.VoiceConnectionStatus.Ready) {
        console.log("Connection is not ready, waiting for ready state...");
        await (0, voice_1.entersState)(queue.connection, voice_1.VoiceConnectionStatus.Ready, timeoutOrSignal);
        console.log("Connection is now ready!");
    }
    queue.player.play(resource);
    queue.playing = true;
    queue.paused = false;
    queue.player.on(voice_1.AudioPlayerStatus.Playing, () => {
        console.log("Player is now playing!");
    });
    queue.player.on(voice_1.AudioPlayerStatus.Buffering, () => {
        console.log("Player is buffering...");
    });
    queue.textChannel.send(`🎵 Now playing: **${song.title}**`);
    _handlePlayerIdle(interaction, queue, onQueueEmpty);
    _handlePlayerError(interaction, queue, onQueueEmpty);
}
function _handlePlayerIdle(interaction, queue, onQueueEmpty) {
    queue.player.once(voice_1.AudioPlayerStatus.Idle, async () => {
        queue.songs.shift();
        if (queue.songs.length > 0) {
            await playSong(interaction, queue, onQueueEmpty);
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
        if (onQueueEmpty && interaction.guildId) {
            onQueueEmpty(interaction.guildId);
        }
    });
}
function _handlePlayerError(interaction, queue, onQueueEmpty) {
    queue.player.once("error", async (error) => {
        console.error("Error occurred while playing the song:", error);
        queue.textChannel.send("An error has occurred while trying to play the song.");
        queue.songs.shift();
        if (queue.songs.length > 0) {
            await playSong(interaction, queue, onQueueEmpty);
            return;
        }
        queue.textChannel.send("Queue is empty. Stopping playback.");
        queue.playing = false;
        try {
            if (queue.connection.state.status !== voice_1.VoiceConnectionStatus.Destroyed) {
                queue.connection.destroy();
            }
        }
        catch (e) {
            console.error("Error destroying connection:", e);
        }
        if (onQueueEmpty && interaction.guildId) {
            onQueueEmpty(interaction.guildId);
        }
    });
}
async function _handlePlayError(interaction, queue, onQueueEmpty, error) {
    console.error("Error occurred while trying to play the song:", error);
    queue.textChannel.send("An error has occurred while trying to play the song.");
    queue.songs.shift();
    if (queue.songs.length > 0) {
        await playSong(interaction, queue, onQueueEmpty);
        return;
    }
    queue.textChannel.send("Queue is empty. Stopping playback.");
    queue.playing = false;
    try {
        if (queue.connection.state.status !== voice_1.VoiceConnectionStatus.Destroyed) {
            queue.connection.destroy();
        }
    }
    catch (e) {
        console.error("Error destroying connection:", e);
    }
    if (onQueueEmpty && interaction.guildId) {
        onQueueEmpty(interaction.guildId);
    }
}
async function playSong(interaction, queue, onQueueEmpty) {
    if (queue.songs.length === 0) {
        await _handleEmptyQueue(interaction, queue, onQueueEmpty);
        return;
    }
    const song = queue.songs[0];
    if (!song) {
        await _handleNoSong(interaction, queue, onQueueEmpty);
        return;
    }
    if (!song.url || typeof song.url !== "string" || song.url.trim() === "") {
        await _handleInvalidUrl(interaction, queue, onQueueEmpty, song.url);
        return;
    }
    try {
        await _playAudio(interaction, queue, onQueueEmpty, song);
    }
    catch (error) {
        await _handlePlayError(interaction, queue, onQueueEmpty, error);
    }
}
