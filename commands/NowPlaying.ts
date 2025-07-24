import type { CacheType, ChatInputCommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import { formatTime } from "../utils/time";
import type {
	CommandContext,
	CommandResult,
	ICommand,
} from "./interfaces/ICommand";

export class NowPlayingCommand implements ICommand {
	public getSlashCommand(): SlashCommandBuilder {
		return new SlashCommandBuilder()
			.setName("nowplaying")
			.setDescription("Show the currently playing song");
	}

	public async execute(
		_interaction: ChatInputCommandInteraction<CacheType>,
		context: CommandContext,
	): Promise<CommandResult> {
		const currentSong = context.getCurrentSong();
		if (!currentSong) {
			return {
				success: false,
				message: "🎶 Nothing is currently playing.",
			};
		}

		return {
			success: true,
			message: `🎵 **Now Playing**\n📀 **${currentSong.title}**\n👤 By: ${currentSong.author}\n⏱️ Duration: ${formatTime(currentSong.duration)}\n 🔗 Url: ${currentSong.url}`,
		};
	}
}
