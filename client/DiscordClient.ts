// biome-ignore lint/nursery/noUnresolvedImports: This import is necessary for environment variable management
import process from "node:process";
import { joinVoiceChannel, type VoiceConnection } from "@discordjs/voice";
import {
	type CacheType,
	type ChatInputCommandInteraction,
	Client,
	GatewayIntentBits,
	type GuildMember,
	type TextChannel,
} from "discord.js";
import { CommandHandler } from "../commands/CommandHandler";
import { Queue } from "../queue/Queue";

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

		this.once("ready", async () => {
			try {
				console.log(`Bot ${this.user?.tag} is online!`);
				if (process.env.CLIENT_ID && process.env.DISCORD_TOKEN) {
					await this.commandHandler.deployCommands(
						process.env.CLIENT_ID,
						process.env.DISCORD_TOKEN,
					);
				} else {
					console.warn(
						"CLIENT_ID or DISCORD_TOKEN not found. Slash commands won't be deployed.",
					);
				}
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
}
