import type { CacheType, ChatInputCommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import type {
	CommandContext,
	CommandResult,
	ICommand,
} from "./interfaces/ICommand";

export class ShowQueueCommand implements ICommand {
	public getSlashCommand(): SlashCommandBuilder {
		return new SlashCommandBuilder()
			.setName("queue")
			.setDescription("Show the current music queue");
	}

	public async execute(
		_interaction: ChatInputCommandInteraction<CacheType>,
		context: CommandContext,
	): Promise<CommandResult> {
		const queueSongs = context.getQueueSongs();
		if (queueSongs.length === 0) {
			return {
				success: false,
				message: "📜 The queue is empty.",
			};
		}

		const list = queueSongs
			.map(
				(song, index) =>
					`${index + 1}. ${song.title} - ${song.author} (${song.duration} seconds)`,
			)
			.join("\n");

		return {
			success: true,
			message: `📜 **Queue:**\n${list}`,
		};
	}
}
