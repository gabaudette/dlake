import type { CacheType, ChatInputCommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import type {
	CommandContext,
	CommandResult,
	ICommand,
} from "./interfaces/ICommand";

export class HelpCommand implements ICommand {
	getSlashCommand(): SlashCommandBuilder {
		return new SlashCommandBuilder()
			.setName("help")
			.setDescription("Show all available commands");
	}
	async execute(
		_interaction: ChatInputCommandInteraction<CacheType>,
		_context: CommandContext,
	): Promise<CommandResult> {
		return {
			success: true,
			message: `Here are the available commands: \n
			- **/play**: To play a song from a URL. \n
			- **/pause**: To pause the current song.\n
            - **/resume**: To resume the paused song.\n
			- **/skip**: To skip the current song.\n
			- **/stop**: To stop the playback.\n
			- **/queue**: To view the current song queue.\n
            - **/nowplaying**: To see the currently playing song.\n
            - **/shuffle**: To shuffle the current queue.\n
			- **/help**: To show this help message.\n
            - **/about**: To learn more about this bot.\n
            `,
		};
	}
}
