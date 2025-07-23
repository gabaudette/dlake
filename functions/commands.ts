// biome-ignore lint/nursery/noUnresolvedImports: This is necessary for assertions
// biome-ignore lint/style/useNodejsImportProtocol: This is necessary for assertions
import { assert } from "console";

// biome-ignore lint/nursery/noUnresolvedImports: This import is necessary for environment variable management
import dotenv from "dotenv";

dotenv.config();

// biome-ignore lint/nursery/noUnresolvedImports: This import is necessary for environment variable management
import process from "node:process";
import {
	createAudioPlayer,
	joinVoiceChannel,
	NoSubscriberBehavior,
	VoiceConnectionStatus,
} from "@discordjs/voice";
import ytdl from "@distube/ytdl-core";
import {
	type CacheType,
	type ChatInputCommandInteraction,
	type GuildMember,
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
	SlashCommandBuilder,
	type TextChannel,
	type VoiceBasedChannel,
} from "discord.js";
import type { Command, Queue, Song } from "../types/types";
import { cancelDelayedLeave, delayedLeaveChannel, playSong } from "./song";

const GLOBAL_COMMANDS: Command[] = [
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
		description: "Stop the music and clear the queue",
	},
	{
		name: "queue",
		description: "Show the queue",
	},
	{
		name: "nowplaying",
		description: "Show the current song",
	},
	{
		name: "shuffle",
		description: "Shuffle the queue (excluding the currently playing song)",
	},
];

function buildCommands(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
	const commands = [];
	for (const command of GLOBAL_COMMANDS) {
		commands.push(
			new SlashCommandBuilder()
				.setName(command.name)
				.setDescription(command.description),
		);
	}

	const newCommands = [
		...commands,
		new SlashCommandBuilder()
			.setName("play")
			.setDescription("Play a song")
			.addStringOption((option) =>
				option
					.setName("url")
					.setDescription("The URL of the song to play")
					.setRequired(true),
			),
	];

	return newCommands.map((command) => command.toJSON());
}

async function _handlePing(
	interaction: ChatInputCommandInteraction<CacheType>,
): Promise<void> {
	console.log("Pong command received.");
	await interaction.reply(
		"🏓 Pong! Bot is working correctly... << DLake official sound ! >>",
	);
}

async function _handleSkip(
	interaction: ChatInputCommandInteraction<CacheType>,
	queue: Queue | undefined,
): Promise<void> {
	if (!queue) {
		await interaction.reply("No music queue found for this server.");
		return;
	}

	queue.player.stop();
	await interaction.reply("Skipped the current song.");
}

async function _handlePause(
	interaction: ChatInputCommandInteraction<CacheType>,
	queue: Queue | undefined,
): Promise<void> {
	if (!queue) {
		await interaction.reply("No music queue found for this server.");
		return;
	}

	queue.player.pause();
	queue.paused = true;
	await interaction.reply("Paused the current song.");
}

async function _handleResume(
	interaction: ChatInputCommandInteraction<CacheType>,
	queue: Queue | undefined,
): Promise<void> {
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

	cancelDelayedLeave(queue);

	await interaction.reply("Resumed the current song.");
}

async function _handleStop(
	interaction: ChatInputCommandInteraction<CacheType>,
	queue: Queue | undefined,
	queues?: Map<string, Queue>,
): Promise<void> {
	if (!queue || !interaction.guildId) {
		await interaction.reply("No music queue found for this server.");
		return;
	}

	queue.songs = [];
	queue.player.stop();
	cancelDelayedLeave(queue);
	queues?.delete(interaction.guildId);

	await interaction.reply("Stopped the music and cleared the queue.");
}

async function _handleShuffle(
	interaction: ChatInputCommandInteraction<CacheType>,
	queue: Queue | undefined,
): Promise<void> {
	if (!queue) {
		await interaction.reply("No music queue found for this server.");
		return;
	}
	if (queue.songs.length <= 1) {
		await interaction.reply("Not enough songs in the queue to shuffle.");
		return;
	}

	const currentSong = queue.songs[0];
	const remainingSongs = queue.songs.slice(1);
	const SHUFFLE_RANDOM_THRESHOLD = 0.5;
	remainingSongs.sort(() => Math.random() - SHUFFLE_RANDOM_THRESHOLD);
	queue.songs = [currentSong, ...remainingSongs];

	await interaction.reply(
		"🔀 Shuffled the queue. Here is the new order:\n" +
			remainingSongs.map((s, i) => `${i + 1}. ${s.title}`).join("\n"),
	);
}

async function _handleQueue(
	interaction: ChatInputCommandInteraction<CacheType>,
	queue: Queue | undefined,
): Promise<void> {
	if (!queue) {
		await interaction.reply("No music queue found for this server.");
		return;
	}

	if (queue.songs.length === 0) {
		await interaction.reply("The queue is empty.");
	} else {
		const tempsSong = queue.songs.slice(1);
		if (tempsSong.length === 0) {
			await interaction.reply("The queue is empty after the current song.");
			return;
		}
		const list = tempsSong.map((s, i) => `${i + 1}. ${s.title}`).join("\n");
		await interaction.reply(`📜 **Queue:**\n${list}`);
	}
}

async function _handleNowPlaying(
	interaction: ChatInputCommandInteraction<CacheType>,
	queue: Queue | undefined,
): Promise<void> {
	if (!queue) {
		await interaction.reply("No music queue found for this server.");
		return;
	}

	await interaction.reply(
		`🎶 Now playing: **${queue.songs[0]?.title || "Nothing"}**`,
	);
}

async function _handlePlaySong(
	interaction: ChatInputCommandInteraction<CacheType>,
	queue?: Queue,
	queues?: Map<string, Queue>,
): Promise<void> {
	try {
		if (!interaction?.guildId) {
			await interaction?.reply("This command can only be used in a server.");
			return;
		}

		const url = interaction.options.getString("url", true);
		const member = interaction.member as GuildMember;
		const memberVoiceChannel = member.voice?.channel;
		if (!memberVoiceChannel) {
			await interaction.reply(
				"You need to be in a voice channel to play music.",
			);
			return;
		}

		const songInfo = await _getSongInfo(url, interaction);
		if (!songInfo) return;

		if (!queue || !queues) {
			const created = await _createQueueAndJoin(
				interaction,
				memberVoiceChannel,
				songInfo,
				queues,
			);

			if (!created) {
				return;
			}

			const newQueue = queues?.get(interaction.guildId);
			if (!newQueue) {
				await interaction.reply("❌ Failed to create queue.");
				return;
			}

			await playSong(interaction, newQueue, (guildId) => {
				queues?.delete(guildId);
			});
		} else {
			const added = await _addSongToQueue(interaction, queue, songInfo);
			if (!added) {
				return;
			}

			await playSong(interaction, queue, (guildId) => {
				queues?.delete(guildId);
			});
		}
	} catch (error) {
		await _handlePlaySongError(error, interaction, queues);
	}
}

async function _getSongInfo(
	url: string,
	interaction: ChatInputCommandInteraction<CacheType>,
): Promise<Song | null> {
	try {
		const info = await ytdl.getInfo(url);
		return {
			title:
				info.videoDetails.title ??
				"An unknown youtube video (probably an obscured one you can't play anyway)",
			url,
		};
	} catch (error) {
		console.error("Error fetching video info:", error);
		await interaction.reply(
			"❌ Failed to retrieve video information. Please check the URL and try again.",
		);
		return null;
	}
}

async function _createQueueAndJoin(
	interaction: ChatInputCommandInteraction<CacheType>,
	memberVoiceChannel: VoiceBasedChannel,
	songInfo: Song,
	queues?: Map<string, Queue>,
): Promise<boolean> {
	if (!interaction.guild || !interaction.guildId) {
		await interaction.reply("This command can only be used in a server.");
		return false;
	}

	const connection = joinVoiceChannel({
		channelId: memberVoiceChannel.id,
		guildId: interaction.guildId,
		adapterCreator: interaction.guild.voiceAdapterCreator,
	});

	const player = createAudioPlayer({
		behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
	});

	const newQueue: Queue = {
		textChannel: interaction.channel as TextChannel,
		voiceChannelId: memberVoiceChannel.id,
		connection,
		player,
		songs: [songInfo],
		playing: false,
		paused: false,
	};

	queues?.set(interaction.guildId, newQueue);
	connection.subscribe(player);
	return true;
}

async function _addSongToQueue(
	interaction: ChatInputCommandInteraction<CacheType>,
	queue: Queue,
	songInfo: Song,
): Promise<boolean> {
	queue.songs.push(songInfo);

	cancelDelayedLeave(queue);

	await interaction.reply(`🎵 Added to queue: **${songInfo.title}**`);

	return true;
}

async function _handlePlaySongError(
	error: unknown,
	interaction: ChatInputCommandInteraction<CacheType>,
	queues?: Map<string, Queue>,
): Promise<void> {
	console.error("Error in _playSong:", error);
	try {
		if (!interaction.replied && !interaction.deferred) {
			await interaction.reply(
				"❌ An unexpected error occurred while processing your request. Please try again.",
			);
		} else if (interaction.deferred) {
			await interaction.editReply(
				"❌ An unexpected error occurred while processing your request. Please try again.",
			);
		} else {
			await interaction.followUp(
				"❌ An unexpected error occurred while processing your request. Please try again.",
			);
		}
	} catch (replyError) {
		console.error("Error sending error message in _playSong:", replyError);
	}

	if (interaction.guildId) {
		try {
			const partialQueue = queues?.get(interaction.guildId);
			if (partialQueue) {
				partialQueue.player.stop();
				if (
					partialQueue.connection.state.status !==
					VoiceConnectionStatus.Destroyed
				) {
					delayedLeaveChannel(partialQueue);
				}
				queues?.delete(interaction.guildId);
			}
		} catch (cleanupError) {
			console.error("Error during cleanup in _playSong:", cleanupError);
		}
	}
}

export async function registerCommands(): Promise<void> {
	const commands = buildCommands();

	assert(process.env.DISCORD_TOKEN, "DISCORD_TOKEN is not set in .env");

	const rest = new (await import("@discordjs/rest")).REST({
		version: "10",
	}).setToken(process.env.DISCORD_TOKEN ?? "");

	try {
		assert(process.env.CLIENT_ID, "CLIENT_ID is not set in .env");
		assert(process.env.GUILD_ID, "GUILD_ID is not set in .env");
		await rest.put(
			(await import("discord-api-types/v10")).Routes.applicationGuildCommands(
				process.env.CLIENT_ID ?? "",
				process.env.GUILD_ID ?? "",
			),
			{ body: commands },
		);
	} catch (error) {
		console.error("Error registering commands:", error);
	}
}

export async function handleCommand(
	interaction: ChatInputCommandInteraction<CacheType>,
	queue?: Queue,
	queues?: Map<string, Queue>,
): Promise<void> {
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
			case "shuffle":
				await _handleShuffle(interaction, queue);
				break;
			default:
				await interaction.reply(
					"❌ Unknown command. Please use a valid command.",
				);
				break;
		}
	} catch (error) {
		console.error("Error in handleCommand:", error);
		try {
			if (interaction.isChatInputCommand()) {
				if (!interaction.replied && !interaction.deferred) {
					await interaction.reply(
						"❌ An unexpected error occurred. Please try again.",
					);
				} else if (interaction.deferred) {
					await interaction.editReply(
						"❌ An unexpected error occurred. Please try again.",
					);
				} else {
					await interaction.followUp(
						"❌ An unexpected error occurred. Please try again.",
					);
				}
			}
		} catch (replyError) {
			console.error("Error sending error message:", replyError);
		}
	}
}
