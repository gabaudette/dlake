import type { CacheType, ChatInputCommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import type {
	CommandContext,
	CommandResult,
	ICommand,
} from "./interfaces/ICommand";

export class HelpCommand implements ICommand {
	public getSlashCommand(): SlashCommandBuilder {
		return new SlashCommandBuilder()
			.setName("help")
			.setDescription("Show all available commands");
	}

	public async execute(
		_interaction: ChatInputCommandInteraction<CacheType>,
		_context: CommandContext,
	): Promise<CommandResult> {
		return {
			success: true,
			message: `Here are the available commands:
- **/play**: To play a song from a URL.
- **/pause**: To pause the current song.
- **/resume**: To resume the paused song.
- **/skip**: To skip the current song.
- **/stop**: To stop the playback.
- **/queue**: To view the current song queue.
- **/nowplaying**: To see the currently playing song.
- **/shuffle**: To shuffle the current queue.
- **/help**: To show this help message.
- **/about**: To learn more about this bot.`,
		};
	}
}
