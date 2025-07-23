// biome-ignore lint/nursery/noUnresolvedImports: This import is necessary for environment variable management
import process from "node:process";
import {
	AudioPlayerStatus,
	createAudioResource,
	entersState,
	VoiceConnectionStatus,
} from "@discordjs/voice";
import ytdl from "@distube/ytdl-core";
import type { CacheType, ChatInputCommandInteraction } from "discord.js";
import ffmpegPath from "ffmpeg-static";
import type { Queue, Song } from "../types/types";

if (ffmpegPath) {
	process.env.FFMPEG_PATH = ffmpegPath;
}

const LEAVE_DELAY_MS = 60_000; // 60 seconds
const MILLISECONDS_TO_SECONDS = 1000;

const leaveTimeouts: Map<string, NodeJS.Timeout> = new Map();

async function _handleEmptyQueue(
	interaction: ChatInputCommandInteraction<CacheType>,
	queue: Queue,
	onQueueEmpty?: (guildId: string) => void,
): Promise<void> {
	console.log("No songs in the queue to play.");

	try {
		await queue.textChannel.send("No songs in the queue to play.");
	} catch (error) {
		console.error("Error sending message to text channel:", error);
	}

	try {
		if (queue.connection.state.status !== VoiceConnectionStatus.Destroyed) {
			delayedLeaveChannel(queue);
		}
	} catch (error) {
		console.error("Error scheduling delayed leave:", error);
	}

	if (onQueueEmpty && interaction.guildId) {
		try {
			onQueueEmpty(interaction.guildId);
		} catch (error) {
			console.error("Error calling onQueueEmpty callback:", error);
		}
	}
}

async function _handleNoSong(
	interaction: ChatInputCommandInteraction<CacheType>,
	queue: Queue,
	onQueueEmpty?: (guildId: string) => void,
): Promise<void> {
	console.log("An error has occurred: No song found to play.");

	try {
		await queue.textChannel.send(
			"An error has occurred: No song found to play.",
		);
	} catch (error) {
		console.error("Error sending message to text channel:", error);
	}

	queue.playing = false;

	try {
		if (queue.connection.state.status !== VoiceConnectionStatus.Destroyed) {
			delayedLeaveChannel(queue);
		}
	} catch (error) {
		console.error("Error scheduling delayed leave:", error);
	}

	if (onQueueEmpty && interaction.guildId) {
		try {
			onQueueEmpty(interaction.guildId);
		} catch (error) {
			console.error("Error calling onQueueEmpty callback:", error);
		}
	}
}

async function _handleInvalidUrl(
	interaction: ChatInputCommandInteraction<CacheType>,
	queue: Queue,
	onQueueEmpty?: (guildId: string) => void,
	url?: string,
): Promise<void> {
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
		if (queue.connection.state.status !== VoiceConnectionStatus.Destroyed) {
			delayedLeaveChannel(queue);
		}
	} catch (destroyError) {
		console.error("Error scheduling delayed leave:", destroyError);
	}

	if (onQueueEmpty && interaction.guildId) {
		onQueueEmpty(interaction.guildId);
	}
}

async function _playAudio(
	interaction: ChatInputCommandInteraction<CacheType>,
	queue: Queue,
	onQueueEmpty: ((guildId: string) => void) | undefined,
	song: Song,
): Promise<void> {
	if (!ytdl.validateURL(song.url)) {
		throw new Error(`Invalid YouTube URL: ${song.url}`);
	}

	const highWaterMark = 33_554_432; // 1 << 25, equivalent to 32MB
	const stream = ytdl(song.url, {
		filter: "audioonly",
		highWaterMark,
		quality: "highestaudio",
	});

	const resource = createAudioResource(stream);
	const timeoutOrSignal = 15_000;
	if (queue.connection.state.status !== VoiceConnectionStatus.Ready) {
		console.log("Connection is not ready, waiting for ready state...");
		await entersState(
			queue.connection,
			VoiceConnectionStatus.Ready,
			timeoutOrSignal,
		);
		console.log("Connection is now ready!");
	}

	queue.player.play(resource);
	queue.playing = true;
	queue.paused = false;

	cancelDelayedLeave(queue);

	queue.player.on(AudioPlayerStatus.Playing, () => {
		console.log("Player is now playing!");
	});

	queue.player.on(AudioPlayerStatus.Buffering, () => {
		console.log("Player is buffering...");
	});

	queue.textChannel.send(`🎵 Now playing: **${song.title}**`);

	_handlePlayerIdle(interaction, queue, onQueueEmpty);
	_handlePlayerError(interaction, queue, onQueueEmpty);
}

function _handlePlayerIdle(
	interaction: ChatInputCommandInteraction<CacheType>,
	queue: Queue,
	onQueueEmpty?: (guildId: string) => void,
): void {
	queue.player.once(AudioPlayerStatus.Idle, async () => {
		queue.songs.shift();
		if (queue.songs.length > 0) {
			await playSong(interaction, queue, onQueueEmpty);
			return;
		}

		queue.textChannel.send("Queue is empty. Stopping playback.");
		queue.playing = false;

		try {
			if (queue.connection.state.status !== VoiceConnectionStatus.Destroyed) {
				delayedLeaveChannel(queue);
			}
		} catch (error) {
			console.error("Error scheduling delayed leave:", error);
		}

		if (onQueueEmpty && interaction.guildId) {
			onQueueEmpty(interaction.guildId);
		}
	});
}

function _handlePlayerError(
	interaction: ChatInputCommandInteraction<CacheType>,
	queue: Queue,
	onQueueEmpty?: (guildId: string) => void,
): void {
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
			if (queue.connection.state.status !== VoiceConnectionStatus.Destroyed) {
				delayedLeaveChannel(queue);
			}
		} catch (e) {
			console.error("Error scheduling delayed leave:", e);
		}

		if (onQueueEmpty && interaction.guildId) {
			onQueueEmpty(interaction.guildId);
		}
	});
}

async function _handlePlayError(
	interaction: ChatInputCommandInteraction<CacheType>,
	queue: Queue,
	onQueueEmpty?: (guildId: string) => void,
	error?: unknown,
): Promise<void> {
	console.error("Error occurred while trying to play the song:", error);

	queue.textChannel.send(
		"An error has occurred while trying to play the song.",
	);

	queue.songs.shift();
	if (queue.songs.length > 0) {
		await playSong(interaction, queue, onQueueEmpty);
		return;
	}

	queue.textChannel.send("Queue is empty. Stopping playback.");
	queue.playing = false;

	try {
		if (queue.connection.state.status !== VoiceConnectionStatus.Destroyed) {
			delayedLeaveChannel(queue);
		}
	} catch (e) {
		console.error("Error scheduling delayed leave:", e);
	}

	if (onQueueEmpty && interaction.guildId) {
		onQueueEmpty(interaction.guildId);
	}
}

export async function playSong(
	interaction: ChatInputCommandInteraction<CacheType>,
	queue: Queue,
	onQueueEmpty?: (guildId: string) => void,
): Promise<void> {
	cancelDelayedLeave(queue);

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
	} catch (error) {
		await _handlePlayError(interaction, queue, onQueueEmpty, error);
	}
}
export function delayedLeaveChannel(queue: Queue): void {
	const channelId = queue.voiceChannelId;
	const existingTimeout = leaveTimeouts.get(channelId);
	if (existingTimeout) {
		clearTimeout(existingTimeout);
		leaveTimeouts.delete(channelId);
	}

	console.log(
		`Queue finished. Leaving voice channel in ${LEAVE_DELAY_MS / MILLISECONDS_TO_SECONDS} seconds...`,
	);

	const timeout = setTimeout(() => {
		console.log(`Timeout executed for channel:`, channelId);
		try {
			if (
				queue.connection.state.status !== VoiceConnectionStatus.Destroyed &&
				queue.connection &&
				queue.songs.length === 0 &&
				!queue.playing
			) {
				queue.connection.destroy();
				console.log("Left voice channel after delay.");
			}
		} catch (error) {
			console.error("Error destroying connection after delay:", error);
		} finally {
			leaveTimeouts.delete(channelId);
		}
	}, LEAVE_DELAY_MS);

	leaveTimeouts.set(channelId, timeout);
}
export function cancelDelayedLeave(queue: Queue): void {
	const channelId = queue.voiceChannelId;
	const timeout = leaveTimeouts.get(channelId);
	if (timeout) {
		clearTimeout(timeout);
		leaveTimeouts.delete(channelId);
		console.log(`Cancelled timeout for channel:`, channelId);
	}
}
