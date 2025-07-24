import type { CacheType, ChatInputCommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import type {
	CommandContext,
	CommandResult,
	ICommand,
} from "./interfaces/ICommand";

export class AboutCommand implements ICommand {
	getSlashCommand(): SlashCommandBuilder {
		return new SlashCommandBuilder()
			.setName("about")
			.setDescription("Learn more about this bot");
	}
	async execute(
		_interaction: ChatInputCommandInteraction<CacheType>,
		_context: CommandContext,
	): Promise<CommandResult> {
		return {
			success: true,
			message: `D'Lake - Official Sound 🤖🎶 is a Discord music bot where you 
            can listen to your music (or others *maybe* weird videos) together with your friends!
			To show the available commands, use **/help**.
            \n 
            🤓 Author: Gabriel Audette 
			\n 
            🔗 GitHub: https://github.com/gabaudette/dlake
			\n
			For more information about this bot & licensing, check [here](https://github.com/gabaudette/dlake/blob/main/README.md)`,
		};
	}
}
