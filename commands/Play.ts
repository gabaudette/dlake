import ytdl from "@distube/ytdl-core";
import type { CacheType, ChatInputCommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import type { Song } from "../types/types";
import { formatTime } from "../utils/time";
import type {
	CommandContext,
	CommandResult,
	ICommand,
} from "./interfaces/ICommand";

export class PlayCommand implements ICommand {
	public getSlashCommand(): SlashCommandBuilder {
		return new SlashCommandBuilder()
			.setName("play")
			.setDescription("Play a song from a URL")
			.addStringOption((option) =>
				option
					.setName("url")
					.setDescription("The YouTube URL to play")
					.setRequired(true),
			) as SlashCommandBuilder;
	}

	public async execute(
		interaction: ChatInputCommandInteraction<CacheType>,
		context: CommandContext,
	): Promise<CommandResult> {
		try {
			if (!context.isUserInVoiceChannel()) {
				return {
					success: false,
					message: "You need to be in a voice channel to play music.",
				};
			}

			if (!context.hasActiveQueue()) {
				return {
					success: false,
					message:
						"❌ Failed to create queue. Make sure you're in a voice channel and the bot has proper permissions.",
				};
			}

			const url = interaction.options.getString("url", true);
			const songInfo = await this.getSongInfo(url);
			if (!songInfo) {
				return {
					success: false,
					message:
						"❌ Failed to retrieve video information. Please check the URL and try again.",
				};
			}

			const isMusicAlreadyPlaying =
				context.isPlaying() || context.getCurrentSong() !== null;

			const success = await context.addSong({
				title: songInfo.title,
				author: songInfo.author,
				duration: songInfo.duration,
				url: songInfo.url,
			});

			if (!success) {
				return {
					success: false,
					message: "❌ Failed to add song to queue. Please try again.",
				};
			}

			if (!isMusicAlreadyPlaying) {
				return {
					success: true,
					message: `🎵 **Now Playing**\n📀 **${songInfo.title}**\n👤 By: ${songInfo.author}\n⏱️ Duration: ${formatTime(songInfo.duration)}\n 🔗 Url: ${url}`,
				};
			}

			return {
				success: true,
				message: `🎵 **Added to Queue**\n📀 **${songInfo.title}**\n👤 By: ${songInfo.author}\n⏱️ Duration: ${formatTime(songInfo.duration)}\n 🔗 Url: ${url}`,
			};
		} catch (error) {
			console.error("Error in PlayCommand:", error);
			return {
				success: false,
				message:
					"❌ An unexpected error occurred while processing your request. Please try again.",
			};
		}
	}

	private async getSongInfo(url: string): Promise<Song | null> {
		try {
			const info = await ytdl.getInfo(url);
			return {
				title: info.videoDetails.title ?? "Unknown video title",
				author: info.videoDetails.author.name ?? "Unknown author",
				duration: info.videoDetails.lengthSeconds ?? "0",
				url,
			};
		} catch (error) {
			console.error("Error fetching video info:", error);
			return null;
		}
	}
}
