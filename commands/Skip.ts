import type { CacheType, ChatInputCommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import type {
	CommandContext,
	CommandResult,
	ICommand,
} from "./interfaces/ICommand";

export class SkipCommand implements ICommand {
	public getSlashCommand(): SlashCommandBuilder {
		return new SlashCommandBuilder()
			.setName("skip")
			.setDescription("Skip the current song");
	}

	public async execute(
		_interaction: ChatInputCommandInteraction<CacheType>,
		context: CommandContext,
	): Promise<CommandResult> {
		const success = context.skipSong();
		if (!success) {
			return {
				success: false,
				message: "❌ No song to skip or no queue found.",
			};
		}

		return {
			success: true,
			message: "⏭️ Skipped the current song.",
		};
	}
}
