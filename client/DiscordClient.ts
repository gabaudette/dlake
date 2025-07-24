import { joinVoiceChannel, type VoiceConnection } from "@discordjs/voice";
import { GatewayIntentBits } from "discord.js";
import { Queue } from "../queue/Queue";
import { CommandHandler } from "../commands/CommandHandler";
import { PingCommand } from "../commands/Ping";
import { PlayCommand } from "../commands/Play";
import { SkipCommand } from "../commands/Skip";
import { PauseCommand } from "../commands/Pause";
import { ResumeCommand } from "../commands/Resume";
import { StopCommand } from "../commands/Stop";
import { NowPlayingCommand } from "../commands/NowPlaying";
import { ShowQueueCommand } from "../commands/ShowQueue";
import { ShuffleCommand } from "../commands/Shuffle";
// biome-ignore lint/nursery/noUnresolvedImports: This import is necessary for environment variable management
import process from "node:process";

import {
	type CacheType,
	type ChatInputCommandInteraction,
	Client,
	type GuildMember,
	type TextChannel,
} from "discord.js";

export class DiscordClient extends Client {
	private queue: Queue | null = null;
	private connection: VoiceConnection | null = null;
	private readonly commandHandler: CommandHandler;

	constructor() {
		super({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.GuildVoiceStates,
			],
		});

		this.commandHandler = new CommandHandler();
		this.registerCommands();

		this.once("ready", async () => {
			try {
				console.log(`Bot ${this.user?.tag} is online!`);
			} catch (e) {
				console.error("Error during bot initialization:", e);
				process.exit(1);
			}
		});

		this.on("interactionCreate", async (interaction) => {
			if (!interaction.isCommand()) {
				return;
			}

			if (!interaction.isChatInputCommand() || !interaction?.guildId) {
				return;
			}

			await this.handleInteraction(interaction);
		});
	}

	private registerCommands(): void {
		this.commandHandler.registerCommand("ping", new PingCommand());
		this.commandHandler.registerCommand("play", new PlayCommand());
		this.commandHandler.registerCommand("skip", new SkipCommand());
		this.commandHandler.registerCommand("pause", new PauseCommand());
		this.commandHandler.registerCommand("resume", new ResumeCommand());
		this.commandHandler.registerCommand("stop", new StopCommand());
		this.commandHandler.registerCommand("nowplaying", new NowPlayingCommand());
		this.commandHandler.registerCommand("queue", new ShowQueueCommand());
		this.commandHandler.registerCommand("shuffle", new ShuffleCommand());
	}

	private async handleInteraction(
		interaction: ChatInputCommandInteraction<CacheType>,
	): Promise<void> {
		if (!this.queue && this.needsQueue(interaction.commandName)) {
			const queueCreated = await this.createQueue(interaction);
			if (!queueCreated) {
				this.commandHandler.setQueue(null);
				await this.commandHandler.handleCommand(interaction);
				return;
			}
		}

		this.commandHandler.setQueue(this.queue);
		await this.commandHandler.handleCommand(interaction);
	}

	private needsQueue(commandName: string): boolean {
		return ["play"].includes(commandName);
	}

	private async createQueue(
		interaction: ChatInputCommandInteraction<CacheType>,
	): Promise<boolean> {
		const member = interaction.member as GuildMember;
		const voiceChannel = member.voice?.channel;

		if (!voiceChannel) {
			return false;
		}

		if (!interaction.guild || !interaction.guildId) {
			return false;
		}

		this.connection = joinVoiceChannel({
			channelId: voiceChannel.id,
			guildId: interaction.guildId,
			adapterCreator: interaction.guild.voiceAdapterCreator,
		});

		this.queue = new Queue(
			interaction.channel as TextChannel,
			voiceChannel.id,
			this.connection,
		);

		this.connection.subscribe(this.queue.getPlayer());

		return true;
	}

	public getQueue(): Queue | null {
		return this.queue;
	}

	public destroyQueue(): void {
		if (this.queue) {
			this.queue.destroy();
			this.queue = null;
		}

		if (this.connection) {
			this.connection.destroy();
			this.connection = null;
		}
	}
}
