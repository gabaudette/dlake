import { AudioPlayerStatus, createAudioResource } from "@discordjs/voice";
import play from "play-dl";
import type { Queue } from "../types/types";
import type { CacheType, ChatInputCommandInteraction } from "discord.js";

export async function playSong(
	interaction: ChatInputCommandInteraction<CacheType>,
	queue: Queue,
): Promise<void> {
	if (queue.songs.length === 0) {
		console.log("No songs in the queue to play.");
		queue.textChannel.send("No songs in the queue to play.");
		queue.connection.destroy();
		return;
	}

	const song = queue.songs.shift();
	if (!song) {
		console.log("No song found to play.");
		queue.textChannel.send("An error has occurred: No song found to play.");
		return;
	}

	try {
		const stream = await play.stream(song.url, {
			discordPlayerCompatibility: true,
		});
		const resource = createAudioResource(stream.stream, {
			inputType: stream.type,
		});

		queue.player.play(resource);
		queue.playing = true;
		queue.paused = false;
		queue.textChannel.send(`Now playing: **${song.title}**`);
		queue.player.once(AudioPlayerStatus.Idle, () => {
			queue.songs.shift();
			if (queue.songs.length > 0) {
				playSong(interaction, queue);
			} else {
				queue.textChannel.send("Queue is empty. Stopping playback.");
				queue.playing = false;
				queue.connection.destroy();
			}
		});

		queue.player.on("error", (error) => {
			console.error("Error occurred while playing the song:", error);
			queue.textChannel.send(
				"An error has occurred while trying to play the song.",
			);
			queue.songs.shift();

			playSong(interaction, queue);
		});
	} catch (error) {
		console.error("Error occurred while trying to play the song:", error);
		queue.textChannel.send(
			"An error has occurred while trying to play the song.",
		);
		queue.songs.shift();

		playSong(interaction, queue);
	}
}
