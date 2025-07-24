import type { CacheType, ChatInputCommandInteraction } from "discord.js";

export interface CommandContext {
	addSong: (title: string, url: string) => Promise<boolean>;
	skipSong: () => boolean;
	pauseMusic: () => boolean;
	resumeMusic: () => boolean;
	stopMusic: () => boolean;
	shuffleQueue: () => boolean;

	getCurrentSong: () => { title: string; url: string } | null;
	getQueueSongs: () => { title: string; url: string }[];
	isPlaying: () => boolean;
	isPaused: () => boolean;
	hasActiveQueue: () => boolean;

	isUserInVoiceChannel: () => boolean;
	getUserVoiceChannelId: () => string | null;
}

export interface CommandResult {
	success: boolean;
	message: string;
}

export interface ICommand {
	execute(
		interaction: ChatInputCommandInteraction<CacheType>,
		context: CommandContext,
	): Promise<CommandResult>;
}
