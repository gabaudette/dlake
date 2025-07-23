import { assert } from "console";
import {
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
	SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../types/types";

const GLOBAL_COMMANDS: Command[] = [
	{
		name: "play",
		description: "Play a song",
	},
	{
		name: "skip",
		description: "Skip the current song",
	},
	{
		name: "pause",
		description: "Pause the music",
	},
	{
		name: "resume",
		description: "Resume the music",
	},
	{
		name: "stop",
		description: "Stop the music",
	},
	{
		name: "queue",
		description: "Show the queue",
	},
	{
		name: "clear",
		description: "Clear the queue",
	},
	{
		name: "nowplaying",
		description: "Show the current song",
	},
];

function buildCommands(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
	const commands = [];
	for (const command of GLOBAL_COMMANDS) {
		commands.push(
			new SlashCommandBuilder()
				.setName(command.name)
				.setDescription(command.description),
		);
	}

	return commands.map((command) => command.toJSON());
}

export async function registerCommands() {
	const commands = buildCommands();

	assert(process.env.DISCORD_TOKEN, "DISCORD_TOKEN is not set in .env");

	const rest = new (await import("@discordjs/rest")).REST({
		version: "10",
	}).setToken(process.env.DISCORD_TOKEN ?? "");

	try {
		assert(process.env.CLIENT_ID, "CLIENT_ID is not set in .env");
		assert(process.env.GUILD_ID, "GUILD_ID is not set in .env");
		await rest.put(
			(await import("discord-api-types/v10")).Routes.applicationGuildCommands(
				process.env.CLIENT_ID ?? "",
				process.env.GUILD_ID ?? "",
			),
			{ body: commands },
		);
	} catch (error) {
		console.error("Error registering commands:", error);
	}
}
