import type { CacheType, ChatInputCommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import type {
	CommandContext,
	CommandResult,
	ICommand,
} from "./interfaces/ICommand";

export class PingCommand implements ICommand {
	public getSlashCommand(): SlashCommandBuilder {
		return new SlashCommandBuilder()
			.setName("ping")
			.setDescription("Replies with pong!");
	}

	public async execute(
		_interaction: ChatInputCommandInteraction<CacheType>,
		_context: CommandContext,
	): Promise<CommandResult> {
		return {
			success: true,
			message: "🏓 Pong!",
		};
	}
}
