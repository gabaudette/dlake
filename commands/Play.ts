import ytdl from "@distube/ytdl-core";
import type { CacheType, ChatInputCommandInteraction } from "discord.js";
import type {
	CommandContext,
	CommandResult,
	ICommand,
} from "./interfaces/ICommand";

export class PlayCommand implements ICommand {
	async execute(
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

			const success = await context.addSong(songInfo.title, songInfo.url);
			if (!success) {
				return {
					success: false,
					message: "❌ Failed to add song to queue. Please try again.",
				};
			}

			return {
				success: true,
				message: `🎵 Added to queue: **${songInfo.title}**`,
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

	private async getSongInfo(
		url: string,
	): Promise<{ title: string; url: string } | null> {
		try {
			const info = await ytdl.getInfo(url);
			return {
				title: info.videoDetails.title ?? "Unknown video title",
				url,
			};
		} catch (error) {
			console.error("Error fetching video info:", error);
			return null;
		}
	}
}
