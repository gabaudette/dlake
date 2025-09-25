import {
	type AudioPlayer,
	AudioPlayerStatus,
	type AudioResource,
	createAudioPlayer,
	createAudioResource,
	NoSubscriberBehavior,
	StreamType,
	type VoiceConnection,
} from "@discordjs/voice";
import type { TextChannel } from "discord.js";
// Update the import path to match the actual file location and extension
import { StreamProvider } from "../audio/StreamProvider";
import type { Song } from "../types/types";

export class Queue {
	private readonly player: AudioPlayer;
	private textChannel: TextChannel;
	private voiceChannelId: string;
	private connection: VoiceConnection;
	private songs: Song[];
	private playing: boolean;
	private paused: boolean;

	constructor(
		textChannel: TextChannel,
		voiceChannelId: string,
		connection: VoiceConnection,
	) {
		this.textChannel = textChannel;
		this.voiceChannelId = voiceChannelId;
		this.connection = connection;
		this.player = createAudioPlayer({
			behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
		});

		this.songs = [];
		this.playing = false;
		this.paused = false;

		this.player.on(AudioPlayerStatus.Idle, async () => {
			this.playing = false;
			this.paused = false;
			this.songs.shift();

			try {
				await this.playNext();
			} catch (error) {
				console.error("Error playing next song:", error);
			}
		});

		this.player.on(AudioPlayerStatus.Playing, () => {
			this.playing = true;
			this.paused = false;
		});

		this.player.on(AudioPlayerStatus.Paused, () => {
			this.paused = true;
		});

		this.player.on("error", (error) => {
			console.error("Audio player error:", error.message);
			this.songs.shift();
			this.playNext().catch((nextError) => {
				console.error("Error playing next song after error:", nextError);
			});
		});
	}

	public getPlayer(): AudioPlayer {
		return this.player;
	}

	public async addSong(song: Song): Promise<void> {
		this.songs.push(song);
		if (!this.playing && !this.paused) {
			try {
				await this.playNext();
			} catch (error) {
				console.error("Error starting playback:", error);
			}
		}
	}

	public skipCurrentSong(): boolean {
		if (this.songs.length === 0) {
			return false;
		}

		this.player.stop();
		return true;
	}

	public pauseMusic(): boolean {
		if (!this.playing) {
			return false;
		}

		this.player.pause();
		this.paused = true;
		return true;
	}

	public resumeMusic(): boolean {
		if (!this.paused) {
			return false;
		}

		this.player.unpause();
		this.paused = false;
		return true;
	}

	public stopMusic(): boolean {
		this.player.stop();
		this.songs = [];
		this.playing = false;
		this.paused = false;
		return true;
	}

	public shuffleQueue(): boolean {
		if (this.songs.length <= 1) {
			return false;
		}

		const currentSong = this.songs[0];
		const remainingSongs = this.songs.slice(1);
		const SHUFFLE_RANDOM_THRESHOLD = 0.5;

		remainingSongs.sort(() => Math.random() - SHUFFLE_RANDOM_THRESHOLD);
		this.songs = [currentSong, ...remainingSongs];
		return true;
	}

	public getCurrentSong(): Song | null {
		return this.songs[0] || null;
	}

	public getQueueSongs(): Song[] {
		return [...this.songs];
	}

	public getUpcomingSongs(): Song[] {
		return this.songs.slice(1);
	}

	public isPlaying(): boolean {
		return this.playing;
	}

	public isPaused(): boolean {
		return this.paused;
	}

	public isEmpty(): boolean {
		return this.songs.length === 0;
	}

	public setPlaying(playing: boolean): void {
		this.playing = playing;
	}

	public setPaused(paused: boolean): void {
		this.paused = paused;
	}

	public getTextChannel(): TextChannel {
		return this.textChannel;
	}

	public getVoiceChannelId(): string {
		return this.voiceChannelId;
	}

	public getConnection(): VoiceConnection {
		return this.connection;
	}

	public destroy(): void {
		this.player.stop();
		this.connection.destroy();
		this.songs = [];
		this.playing = false;
		this.paused = false;
		this.textChannel = null as unknown as TextChannel;
		this.voiceChannelId = "";
		this.connection = null as unknown as VoiceConnection;
	}

	private async playNext(): Promise<void> {
		if (this.songs.length === 0) {
			this.playing = false;
			return;
		}

		try {
			const song = this.songs[0];
			const streamProvider = new StreamProvider();
			const stream = await streamProvider.createStream(song.url);
			const resource: AudioResource = createAudioResource(stream, {
				inputType: StreamType.Arbitrary
			});

			this.player.play(resource);
		} catch (error) {
			console.error("Error playing song:", error);
			this.songs.shift();

			try {
				await this.playNext();
			} catch (nextError) {
				console.error("Error playing next song after skip:", nextError);
			}
		}
	}
}
