import type { AudioPlayer, VoiceConnection } from "@discordjs/voice";
import { clear } from "console";
import type { TextChannel } from "discord.js";

export type Song = {
	title: string;
	url: string;
};

export type Queue = {
	textChannel: TextChannel;
	voiceChannelId: string;
	connection: VoiceConnection;
	player: AudioPlayer;
	songs: Song[];
	playing: boolean;
	paused: boolean;
};

export const CCommands = [
	"ping",
	"play",
	"skip",
	"stop",
	"pause",
	"resume",
	"queue",
	"clear",
	"nowplaying",
] as const;

export type Command = {
	name: (typeof CCommands)[number];
	description: string;
};
