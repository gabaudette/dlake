import type { Readable } from "node:stream";
import ytdl from "@distube/ytdl-core";

export interface IStreamProvider {
	createStream(url: string): Promise<Readable>;
}

export class StreamProvider implements IStreamProvider {
	private readonly buffer: number = 33_554_432; // 32MB buffer

	public async createStream(url: string): Promise<Readable> {
		try {
			const stream = ytdl(url, {
				filter: "audioonly",
				quality: "highestaudio",
				highWaterMark: this.buffer,
			});

			stream.on("error", (streamError) => {
				console.error("YouTube stream error:", streamError.message);
			});

			return stream;
		} catch (error) {
			console.error("Error creating stream:", error);
			throw error;
		}
	}
}
