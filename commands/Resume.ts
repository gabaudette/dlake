import type { CacheType, ChatInputCommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import type {
	CommandContext,
	CommandResult,
	ICommand,
} from "./interfaces/ICommand";

export class ResumeCommand implements ICommand {
	public getSlashCommand(): SlashCommandBuilder {
		return new SlashCommandBuilder()
			.setName("resume")
			.setDescription("Resume the paused song");
	}

	public async execute(
		_interaction: ChatInputCommandInteraction<CacheType>,
		context: CommandContext,
	): Promise<CommandResult> {
		if (!context.isPaused()) {
			return {
				success: false,
				message: "▶️ Music is not paused.",
			};
		}

		const success = context.resumeMusic();
		if (!success) {
			return {
				success: false,
				message: "❌ Failed to resume music or no queue found.",
			};
		}

		return {
			success: true,
			message: "▶️ Resumed the current song.",
		};
	}
}
