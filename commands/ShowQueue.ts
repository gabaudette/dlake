import type { CacheType, ChatInputCommandInteraction } from "discord.js";
import type {
	ICommand,
	CommandContext,
	CommandResult,
} from "./interfaces/ICommand";

export class ShowQueueCommand implements ICommand {
	async execute(
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
			.map((song, index) => `${index + 1}. ${song.title}`)
			.join("\n");

		return {
			success: true,
			message: `📜 **Queue:**\n${list}`,
		};
	}
}
