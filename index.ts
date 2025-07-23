import {
	type CacheType,
	type ChatInputCommandInteraction,
	Client,
	GatewayIntentBits,
	type GuildMember,
	type Interaction,
	type TextChannel,
} from "discord.js";
import type { Queue, Song } from "./types/types";
import { registerCommands } from "./functions/commands";
import { playSong } from "./functions/song";
import {
	createAudioPlayer,
	joinVoiceChannel,
	NoSubscriberBehavior,
	VoiceConnectionStatus,
} from "@discordjs/voice";
import ytdl from "@distube/ytdl-core";
// biome-ignore lint/nursery/noUnresolvedImports: This import is necessary for environment variable management
import dotenv from "dotenv";
// biome-ignore lint/nursery/noUnresolvedImports: This import is necessary for environment variable management
import process from "node:process";
dotenv.config();

const client: Client<boolean> = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildVoiceStates,
	],
});

client.once("ready", async () => {
	try {
		console.log(`Logged in as ${client.user?.tag}`);
		await registerCommands();
	} catch (e) {
		console.error("Error during bot initialization:", e);
		process.exit(1);
	}
});

client.on("interactionCreate", async (interaction) => {
	try {
		await handleCommand(interaction);
	} catch (e) {
		console.error("Error handling interaction:", e);
	}
});


const queues: Map<string, Queue> = new Map<string, Queue>();

async function handleCommand(
	interaction: Interaction<CacheType>,
): Promise<void> {
	try {
		if (!interaction.isCommand()) return;

		if (!interaction.isChatInputCommand()) {
			await interaction.reply(
				"This command can only be used as a chat input command.",
			);
			return;
		}

		if (!interaction?.guildId) {
			await interaction?.reply("This command can only be used in a server.");
			return;
		}

		const queue = queues.get(interaction.guildId);

		switch (interaction.commandName) {
			case "ping":
				console.log("Pong command received.");
				await interaction.reply(
					"🏓 Pong! Bot is working correctly... << DLake official sound ! >>",
				);
				break;
			case "play":
				await _playSong(interaction, queue);
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

				if (!queue.paused) {
					await interaction.reply("▶️ Not paused.");
					return;
				}

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
				} else {
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

				await interaction.reply(
					`🎶 Now playing: **${queue.songs[0]?.title || "Nothing"}**`,
				);
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

client.login(process.env.DISCORD_TOKEN);

async function _playSong(
	interaction: ChatInputCommandInteraction<CacheType>,
	queue: Queue,
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
		let songInfo: Song;

		try {
			const info = await ytdl.getInfo(url);
			songInfo = {
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
			return;
		}

		if (!queue) {
			if (!interaction.guild) {
				await interaction.reply("This command can only be used in a server.");
				return;
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

			queues.set(interaction.guildId, newQueue);
			connection.subscribe(player);
		} else {
			queue.songs.push(songInfo);
			await interaction.reply(`🎵 Added to queue: **${songInfo.title}**`);

			if (!queue.playing) {
				const currentQueue = queues.get(interaction.guildId);
				if (!currentQueue) {
					await interaction.followUp("❌ Failed to retrieve queue.");
					return;
				}

				await playSong(interaction, currentQueue, (guildId) => {
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

		await playSong(interaction, currentQueue, (guildId) => {
			queues.delete(guildId);
		});
	} catch (error) {
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
				const partialQueue = queues.get(interaction.guildId);
				if (partialQueue) {
					partialQueue.player.stop();
					if (
						partialQueue.connection.state.status !==
						VoiceConnectionStatus.Destroyed
					) {
						partialQueue.connection.destroy();
					}
					queues.delete(interaction.guildId);
				}
			} catch (cleanupError) {
				console.error("Error during cleanup in _playSong:", cleanupError);
			}
		}
	}
}
