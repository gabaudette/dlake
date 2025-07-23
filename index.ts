// biome-ignore lint/nursery/noUnresolvedImports: This import is necessary for environment variable management
import process from "node:process";
import { Client, GatewayIntentBits } from "discord.js";
// biome-ignore lint/nursery/noUnresolvedImports: This import is necessary for environment variable management
import dotenv from "dotenv";
import { handleCommand, registerCommands } from "./functions/commands";
import type { Queue } from "./types/types";

dotenv.config();

const client: Client<boolean> = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildVoiceStates,
	],
});

client.once("ready", async () => {
	try {
		console.log(`Logged in as ${client.user?.tag}`);
		await registerCommands();
	} catch (e) {
		console.error("Error during bot initialization:", e);
		process.exit(1);
	}
});

client.on("interactionCreate", async (interaction) => {
	try {
		if (!interaction.isCommand()) return;
		if (!interaction.isChatInputCommand() || !interaction?.guildId) {
			await interaction.reply(
				"This command can only be used as a chat input command or in a server.",
			);
			return;
		}

		const queue = queues.get(interaction.guildId);
		await handleCommand(interaction, queue, queues);
	} catch (e) {
		console.error("Error handling interaction:", e);
	}
});

const queues: Map<string, Queue> = new Map<string, Queue>();

client.login(process.env.DISCORD_TOKEN);
