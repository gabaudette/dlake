import type {
	CacheType,
	ChatInputCommandInteraction,
	GuildMember,
} from "discord.js";
import { REST, Routes } from "discord.js";
import type { Queue } from "../queue/Queue";
import type { Song } from "../types/types";
import { AboutCommand } from "./About";
import { HelpCommand } from "./Help";
import type { CommandContext, ICommand } from "./interfaces/ICommand";
import { NowPlayingCommand } from "./NowPlaying";
import { PauseCommand } from "./Pause";
import { PingCommand } from "./Ping";
import { PlayCommand } from "./Play";
import { ResumeCommand } from "./Resume";
import { ShowQueueCommand } from "./ShowQueue";
import { ShuffleCommand } from "./Shuffle";
import { SkipCommand } from "./Skip";
import { StopCommand } from "./Stop";

export class CommandHandler {
	private readonly commands: Map<string, ICommand> = new Map();
	private queue: Queue | null;

	constructor(queue: Queue | null = null) {
		this.queue = queue;
		this.registerCommands();
	}

	public setQueue(queue: Queue | null): void {
		this.queue = queue;
	}

	public async deployCommands(clientId: string, token: string): Promise<void> {
		const commandData: unknown[] = Array.from(this.commands.values()).map(
			(command) => command.getSlashCommand().toJSON(),
		);

		const rest: REST = new REST({ version: "10" }).setToken(token);

		try {

			await rest.put(Routes.applicationCommands(clientId), {
				body: commandData,
			});
		} catch (error) {
			console.error("Error deploying commands:", error);
		}
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

	private registerCommands(): void {
		this.commands.set("ping", new PingCommand());
		this.commands.set("play", new PlayCommand());
		this.commands.set("skip", new SkipCommand());
		this.commands.set("pause", new PauseCommand());
		this.commands.set("resume", new ResumeCommand());
		this.commands.set("stop", new StopCommand());
		this.commands.set("nowplaying", new NowPlayingCommand());
		this.commands.set("queue", new ShowQueueCommand());
		this.commands.set("shuffle", new ShuffleCommand());
		this.commands.set("help", new HelpCommand());
		this.commands.set("about", new AboutCommand());
	}

	private shouldDeferCommand(commandName: string): boolean {
		return ["play"].includes(commandName);
	}

	private createCommandContext(
		interaction: ChatInputCommandInteraction<CacheType>,
	): CommandContext {
		return {
			addSong: async (song: Song): Promise<boolean> => {
				if (!this.queue) return false;
				try {
					await this.queue.addSong(song);
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

			getCurrentSong: (): Song | null => {
				return this.queue?.getCurrentSong() ?? null;
			},

			getQueueSongs: (): Song[] => {
				return this.queue?.getUpcomingSongs() ?? [];
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
