import type {
	CacheType,
	ChatInputCommandInteraction,
	GuildMember,
} from "discord.js";
import type { Queue } from "../queue/Queue";
import type { ICommand, CommandContext } from "./interfaces/ICommand";

export class CommandHandler {
	private readonly commands: Map<string, ICommand> = new Map();
	private queue: Queue | null;

	constructor(queue: Queue | null = null) {
		this.queue = queue;
	}

	public registerCommand(name: string, command: ICommand): void {
		this.commands.set(name, command);
	}

	public setQueue(queue: Queue | null): void {
		this.queue = queue;
	}

	public async handleCommand(
		interaction: ChatInputCommandInteraction<CacheType>,
	): Promise<void> {
		try {
			const command = this.commands.get(interaction.commandName);
			if (!command) {
				await this.sendReply(
					interaction,
					"❌ Unknown command. Please use a valid command.",
				);
				return;
			}

			if (this.shouldDeferCommand(interaction.commandName)) {
				await interaction.deferReply();
			}

			const context = this.createCommandContext(interaction);
			const result = await command.execute(interaction, context);

			await this.sendReply(interaction, result.message);
		} catch (error) {
			console.error("Error in CommandHandler:", error);
			await this.sendReply(
				interaction,
				"❌ An unexpected error occurred. Please try again.",
			);
		}
	}

	private shouldDeferCommand(commandName: string): boolean {
		return ["play"].includes(commandName);
	}

	private createCommandContext(
		interaction: ChatInputCommandInteraction<CacheType>,
	): CommandContext {
		return {
			addSong: async (title: string, url: string): Promise<boolean> => {
				if (!this.queue) return false;
				try {
					await this.queue.addSong({ title, url });
					return true;
				} catch (error) {
					console.error("Error adding song:", error);
					return false;
				}
			},

			skipSong: (): boolean => {
				return this.queue?.skipCurrentSong() ?? false;
			},

			pauseMusic: (): boolean => {
				return this.queue?.pauseMusic() ?? false;
			},

			resumeMusic: (): boolean => {
				return this.queue?.resumeMusic() ?? false;
			},

			stopMusic: (): boolean => {
				return this.queue?.stopMusic() ?? false;
			},

			shuffleQueue: (): boolean => {
				return this.queue?.shuffleQueue() ?? false;
			},

			getCurrentSong: (): { title: string; url: string } | null => {
				const song = this.queue?.getCurrentSong();
				return song ? { title: song.title, url: song.url } : null;
			},

			getQueueSongs: (): { title: string; url: string }[] => {
				const songs = this.queue?.getUpcomingSongs() ?? [];
				return songs.map((song) => ({ title: song.title, url: song.url }));
			},

			isPlaying: (): boolean => {
				return this.queue?.isPlaying() ?? false;
			},

			isPaused: (): boolean => {
				return this.queue?.isPaused() ?? false;
			},

			hasActiveQueue: (): boolean => {
				return this.queue !== null;
			},

			isUserInVoiceChannel: (): boolean => {
				const member = interaction.member as GuildMember;
				return Boolean(member?.voice?.channel);
			},

			getUserVoiceChannelId: (): string | null => {
				const member = interaction.member as GuildMember;
				return member?.voice?.channel?.id ?? null;
			},
		};
	}

	private async sendReply(
		interaction: ChatInputCommandInteraction<CacheType>,
		message: string,
	): Promise<void> {
		try {
			if (!interaction.replied && !interaction.deferred) {
				await interaction.reply(message);
			} else if (interaction.deferred) {
				await interaction.editReply(message);
			} else {
				await interaction.followUp(message);
			}
		} catch (replyError) {
			console.error("Error sending reply:", replyError);
		}
	}
}
