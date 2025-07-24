import type { CacheType, ChatInputCommandInteraction } from "discord.js";
import { formatTime } from "../utils/time";
import type {
	CommandContext,
	CommandResult,
	ICommand,
} from "./interfaces/ICommand";

export class ShuffleCommand implements ICommand {
	async execute(
		_interaction: ChatInputCommandInteraction<CacheType>,
		context: CommandContext,
	): Promise<CommandResult> {
		const success = context.shuffleQueue();
		if (!success) {
			return {
				success: false,
				message: "❌ Not enough songs in the queue to shuffle.",
			};
		}

		const queueSongs = context.getQueueSongs();
		const list = queueSongs
			.map(
				(song, index) =>
					`${index + 1}. ${song.title} - ${song.author} (${formatTime(song.duration)})`,
			)
			.join("\n");

		return {
			success: true,
			message: `🔀 Shuffled the queue. Here is the new order:\n${list}`,
		};
	}
}
