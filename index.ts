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
} from "@discordjs/voice";
import play from "play-dl";

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once("ready", () => {
	console.log(`Logged in as ${client.user?.tag}`);
	registerCommands();
});

client.on("interactionCreate", (interaction) => {
	handleCommand(interaction);
});

const queues = new Map<string, Queue>();

async function handleCommand(interaction: Interaction<CacheType>) {
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
	if (!queue) {
		await interaction.reply("No music queue found for this server.");
		return;
	}

	switch (interaction.commandName) {
		case "play":
			_playSong(interaction, queue);
			break;
		case "skip":
			queue.player.stop();
			await interaction.reply("Skipped the current song.");
			break;
		case "pause":
			queue.player.pause();
			queue.paused = true;
			await interaction.reply("Paused the current song.");
			break;
		case "resume":
			if (!queue.paused) return interaction.reply("▶️ Not paused.");
			queue.player.unpause();
			queue.paused = false;
			await interaction.reply("Resumed the current song.");
			break;
		case "stop":
			queue.songs = [];
			queue.player.stop();
			queues.delete(interaction.guildId);
			await interaction.reply("Stopped the music and cleared the queue.");
			break;
		case "queue":
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
			await interaction.reply(
				`🎶 Now playing: **${queue.songs[0]?.title || "Nothing"}**`,
			);
	}
}

client.login(process.env.DISCORD_TOKEN);

async function _playSong(
	interaction: ChatInputCommandInteraction<CacheType>,
	queue: Queue,
) {
	if (!interaction?.guildId) {
		await interaction?.reply("This command can only be used in a server.");
		return;
	}

	const url = interaction.options.getString("url", true);
	const member = interaction.member as GuildMember;
	const memberVoiceChannel = member.voice?.channel;
	if (!memberVoiceChannel) {
		await interaction.reply("You need to be in a voice channel to play music.");
		return;
	}

	await interaction.deferReply();
	let songInfo: Song;

	try {
		const info = await play.video_info(url);
		songInfo = {
			title: info.video_details.title ?? "A youtube video",
			url: info.video_details.url,
		};
	} catch {
		await interaction.editReply("❌ Failed to retrieve video info.");
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
	}
	await playSong(interaction, queue);
}
