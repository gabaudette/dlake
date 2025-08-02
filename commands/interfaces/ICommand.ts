import type {
	CacheType,
	ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import type { Song } from "../../types/types";

export type CommandContext = {
	addSong: (song: Song) => Promise<boolean>;
	skipSong: () => boolean;
	pauseMusic: () => boolean;
	resumeMusic: () => boolean;
	stopMusic: () => boolean;
	shuffleQueue: () => boolean;

	getCurrentSong: () => Song | null;
	getQueueSongs: () => Song[];
	isPlaying: () => boolean;
	isPaused: () => boolean;
	hasActiveQueue: () => boolean;

	isUserInVoiceChannel: () => boolean;
	getUserVoiceChannelId: () => string | null;
};

export type CommandResult = {
	success: boolean;
	message: string;
};

export interface ICommand {
	getSlashCommand(): SlashCommandBuilder;
	execute(
		interaction: ChatInputCommandInteraction<CacheType>,
		context: CommandContext,
	): Promise<CommandResult>;
}
