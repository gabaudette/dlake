import { Readable } from "node:stream";
import YTDlpWrap from "./YTDLp/YTDLpWrap";



export interface IStreamProvider {
	createStream(url: string): Promise<Readable>;
}

export class StreamProvider implements IStreamProvider {
	public async createStream(url: string): Promise<Readable> {
		const y = new YTDlpWrap(process.env.YTDLP_PATH);

		try {
			const stream = y.execStream([
				url,
				"-f",
				"bestaudio",
				"-o",
				"-",
				"--no-playlist",
				"--audio-format",
				"opus",
				"--no-cache-dir",
				"--force-ipv4",
			]);

			stream.on("end", () => {
				if (stream.destroyed) return;
				stream.destroy();
			});

			stream.on("error", (error) => {
				console.error("Stream error:", error);
				stream.destroy();
			});

			return stream;
		} catch (error) {
			console.error("yt-dlp error:", error);
			throw error;
		}
	}
}
