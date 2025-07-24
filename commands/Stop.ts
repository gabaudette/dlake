import type { CacheType, ChatInputCommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import type {
	CommandContext,
	CommandResult,
	ICommand,
} from "./interfaces/ICommand";

export class StopCommand implements ICommand {
	public getSlashCommand(): SlashCommandBuilder {
		return new SlashCommandBuilder()
			.setName("stop")
			.setDescription("Stop the music and clear the queue");
	}

	public async execute(
		_interaction: ChatInputCommandInteraction<CacheType>,
		context: CommandContext,
	): Promise<CommandResult> {
		const success = context.stopMusic();
		if (!success) {
			return {
				success: false,
				message: "❌ No music to stop or no queue found.",
			};
		}

		return {
			success: true,
			message: "⏹️ Stopped the music and cleared the queue.",
		};
	}
}
