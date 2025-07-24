import type { CacheType, ChatInputCommandInteraction } from "discord.js";
import type {
	ICommand,
	CommandContext,
	CommandResult,
} from "./interfaces/ICommand";

export class NowPlayingCommand implements ICommand {
	async execute(
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
			message: `🎶 Now playing: **${currentSong.title}**`,
		};
	}
}
