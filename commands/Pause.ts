import type { CacheType, ChatInputCommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import type {
	CommandContext,
	CommandResult,
	ICommand,
} from "./interfaces/ICommand";

export class PauseCommand implements ICommand {
	public getSlashCommand(): SlashCommandBuilder {
		return new SlashCommandBuilder()
			.setName("pause")
			.setDescription("Pause the current song");
	}

	public async execute(
		_interaction: ChatInputCommandInteraction<CacheType>,
		context: CommandContext,
	): Promise<CommandResult> {
		const success = context.pauseMusic();
		if (!success) {
			return {
				success: false,
				message: "❌ No music is currently playing or no queue found.",
			};
		}

		return {
			success: true,
			message: "⏸️ Paused the current song.",
		};
	}
}
