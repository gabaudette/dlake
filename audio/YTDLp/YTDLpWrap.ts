/** REFACTOR VERSION OF https://github.com/foxesdocode/yt-dlp-wrap/blob/master/src/index.ts */


import {
	execFile,
	type ExecFileException,
	execSync,
	spawn,
	type ChildProcess,
	type ChildProcessWithoutNullStreams,
	type SpawnOptionsWithoutStdio,
} from "node:child_process";
import type { IncomingMessage } from "node:http";
import { EventEmitter, Readable } from "node:stream";
import * as https from "node:https";
import * as fs from "node:fs";
import * as os from "node:os";

const executableName = "yt-dlp";
const progressRegex =
	/\[download\] *(.*) of ([^ ]*)(:? *at *([^ ]*))?(:? *ETA *([^ ]*))?/;

type YTDlpEventNameDataTypeMap = {
	close: [number | null];
	error: [Error];
	progress: [Progress];
	ytDlpEvent: [eventType: string, eventData: string];
};

type YTDlpEventName = keyof YTDlpEventNameDataTypeMap;

type YTDlpEventListener<EventName extends YTDlpEventName> = (
	...args: YTDlpEventNameDataTypeMap[EventName]
) => void;

type YTDlpEventNameToEventListenerFunction<ReturnType> = <
	K extends YTDlpEventName,
>(
	channel: K,
	listener: YTDlpEventListener<K>,
) => ReturnType;

type YTDlpEventNameToEventDataFunction<ReturnType> = <K extends YTDlpEventName>(
	channel: K,
	...args: YTDlpEventNameDataTypeMap[K]
) => ReturnType;

//#region YTDlpReadable

type YTDlpReadableEventName = keyof YTDlpReadableEventNameDataTypeMap;

type YTDlpReadableEventListener<EventName extends YTDlpReadableEventName> = (
	...args: YTDlpReadableEventNameDataTypeMap[EventName]
) => void;

type YTDlpReadableEventNameToEventListenerFunction<ReturnType> = <
	K extends YTDlpReadableEventName,
>(
	event: K,
	listener: YTDlpReadableEventListener<K>,
) => ReturnType;

type YTDlpReadableEventNameToEventDataFunction<ReturnType> = <
	K extends YTDlpReadableEventName,
>(
	event: K,
	...args: YTDlpReadableEventNameDataTypeMap[K]
) => ReturnType;

type YTDlpReadableEventNameDataTypeMap = {
	close: [];
	progress: [progress: Progress];
	ytDlpEvent: [eventType: string, eventData: string];
	data: [chunk: unknown];
	end: [];
	error: [error: Error];
	pause: [];
	readable: [];
	resume: [];
};

export interface YTDlpReadable extends Readable {
	ytDlpProcess?: ChildProcessWithoutNullStreams;

	/**
	 * Event emitter
	 * The defined events on documents including:
	 * 1. close
	 * 2. data
	 * 3. end
	 * 4. error
	 * 5. pause
	 * 6. readable
	 * 7. resume
	 * 8. ytDlpEvent
	 * 9. progress
	 */
	addListener: YTDlpReadableEventNameToEventListenerFunction<this>;
	emit: YTDlpReadableEventNameToEventDataFunction<boolean>;
	on: YTDlpReadableEventNameToEventListenerFunction<this>;
	once: YTDlpReadableEventNameToEventListenerFunction<this>;
	prependListener: YTDlpReadableEventNameToEventListenerFunction<this>;
	prependOnceListener: YTDlpReadableEventNameToEventListenerFunction<this>;
	removeListener: YTDlpReadableEventNameToEventListenerFunction<this>;
}
export interface YTDlpOptions extends SpawnOptionsWithoutStdio {
	maxBuffer?: number;
}

export interface Progress {
	percent?: number;
	totalSize?: string;
	currentSpeed?: string;
	eta?: string;
}

export default class YTDlpWrap {
	private binaryPath: string;

	constructor(binaryPath: string = executableName) {
		this.binaryPath = binaryPath;
	}

	getBinaryPath(): string {
		return this.binaryPath;
	}

	setBinaryPath(binaryPath: string): void {
		this.binaryPath = binaryPath;
	}

	private static createGetMessage(url: string): Promise<IncomingMessage> {
		return new Promise<IncomingMessage>((resolve, reject) => {
			https.get(url, (httpResponse) => {
				httpResponse.on("error", (e) => reject(e));
				resolve(httpResponse);
			});
		});
	}

	private static processMessageToFile(
		message: IncomingMessage,
		filePath: string,
	): Promise<IncomingMessage> {
		const file = fs.createWriteStream(filePath);
		const HTTP_STATUS_OK = 200;

		return new Promise<IncomingMessage>((resolve, reject) => {
			message.pipe(file);
			message.on("error", (e) => reject(e));
			file.on("finish", () =>
				message.statusCode === HTTP_STATUS_OK
					? resolve(message)
					: reject(message),
			);
		});
	}

	static async downloadFile(
		fileURL: string,
		filePath: string,
	): Promise<IncomingMessage | undefined> {
		const currentUrl: string | null = fileURL;
		function getMessageRecursive(
			url: string,
		): Promise<IncomingMessage | undefined> {
			return YTDlpWrap.createGetMessage(url).then((message) => {
				if (message.headers.location) {
					return getMessageRecursive(message.headers.location);
				} else {
					return YTDlpWrap.processMessageToFile(message, filePath);
				}
			});
		}
		if (currentUrl) {
			return getMessageRecursive(currentUrl);
		}
	}

	static getGithubReleases(
		page: number = 1,
		perPage: number = 1,
	): Promise<unknown> {
		return new Promise<unknown>((resolve, reject) => {
			const apiURL =
				"https://api.github.com/repos/yt-dlp/yt-dlp/releases?page=" +
				page +
				"&per_page=" +
				perPage;
			const HTTP_STATUS_OK = 200;
			https.get(apiURL, { headers: { "User-Agent": "node" } }, (response) => {
				let resonseString = "";
				response.setEncoding("utf8");
				response.on("data", (body) => {
					resonseString += body;
				});
				response.on("error", (e) => reject(e));
				response.on("end", () =>
					response.statusCode === HTTP_STATUS_OK
						? resolve(JSON.parse(resonseString))
						: reject(response),
				);
			});
		});
	}

	static async downloadFromGithub(
		filePath?: string,
		version?: string,
		platform: string = os.platform(),
	): Promise<void> {
		const isWin32 = platform === "win32";
		const fileName = `${executableName}${isWin32 ? ".exe" : ""}`;
		if (!version) {
			const releases = await YTDlpWrap.getGithubReleases(1, 1);
			if (Array.isArray(releases) && releases.length > 0 && typeof releases[0] === "object" && releases[0] !== null && "tag_name" in releases[0]) {
				version = (releases[0] as { tag_name: string }).tag_name;
			} else {
				throw new Error("Could not retrieve yt-dlp release version from GitHub.");
			}
		}

		if (!filePath) {
			filePath = `./${fileName}`;
		}

		const fileURL =
			"https://github.com/yt-dlp/yt-dlp/releases/download/" +
			version +
			"/" +
			fileName;

		await YTDlpWrap.downloadFile(fileURL, filePath);
		!isWin32 && fs.chmodSync(filePath, "777");
	}

	exec(
		ytDlpArguments: string[] = [],
		options: YTDlpOptions = {},
		abortSignal: AbortSignal | null = null,
	): YTDlpEventEmitter {
		options = YTDlpWrap.setDefaultOptions(options);

		const execEventEmitter = new EventEmitter() as YTDlpEventEmitter;
		const ytDlpProcess = spawn(this.binaryPath, ytDlpArguments, options);

		execEventEmitter.ytDlpProcess = ytDlpProcess;
		YTDlpWrap.bindAbortSignal(abortSignal, ytDlpProcess);

		let stderrData = "";
		let processError: Error;

		ytDlpProcess.stdout.on("data", (data) =>
			YTDlpWrap.emitYoutubeDlEvents(data.toString(), execEventEmitter),
		);

		ytDlpProcess.stderr.on("data", (data) => {
			stderrData += data.toString();
		});

		ytDlpProcess.on("error", (error) => {
			processError = error;
		});

		ytDlpProcess.on("close", (code) => {
			if (code === 0 || ytDlpProcess.killed)
				execEventEmitter.emit("close", code);
			else
				execEventEmitter.emit(
					"error",
					YTDlpWrap.createError(code, processError, stderrData),
				);
		});
		return execEventEmitter;
	}

	execPromise(
		ytDlpArguments: string[] = [],
		options: YTDlpOptions = {},
		abortSignal: AbortSignal | null = null,
	): YTDlpPromise<string> {
		let ytDlpProcess: ChildProcess | undefined;

		const ytDlpPromise: YTDlpPromise<string> = new Promise(
			(resolve, reject) => {
				options = YTDlpWrap.setDefaultOptions(options);
				ytDlpProcess = execFile(
					this.binaryPath,
					ytDlpArguments,
					options,
					(error, childStdout, stderr) => {
						if (error) {
							reject(YTDlpWrap.createError(error, null, stderr));
						}

						resolve(childStdout);
					},
				);
				YTDlpWrap.bindAbortSignal(abortSignal, ytDlpProcess);
			},
		);

		ytDlpPromise.ytDlpProcess = ytDlpProcess;
		return ytDlpPromise;
	}

	execStream(
		ytDlpArguments: string[] = [],
		options: YTDlpOptions = {},
		abortSignal: AbortSignal | null = null,
	): YTDlpReadable {
		const readStream: YTDlpReadable = new Readable({
			read(_size: number): void {},
		});

		options = YTDlpWrap.setDefaultOptions(options);
		ytDlpArguments = ytDlpArguments.concat(["-o", "-"]);

		const ytDlpProcess = spawn(this.binaryPath, ytDlpArguments, options);

		readStream.ytDlpProcess = ytDlpProcess;
		YTDlpWrap.bindAbortSignal(abortSignal, ytDlpProcess);

		let stderrData = "";
		let processError: Error;

		ytDlpProcess.stdout.on("data", (data) => readStream.push(data));
		ytDlpProcess.stderr.on("data", (data) => {
			const stringData = data.toString();
			YTDlpWrap.emitYoutubeDlEvents(stringData, readStream);
			stderrData += stringData;
		});

		ytDlpProcess.on("error", (error) => {
			processError = error;
		});

		ytDlpProcess.on("close", (code) => {
			if (code === 0 || ytDlpProcess.killed) {
				readStream.push(null);
			} else {
				const error = YTDlpWrap.createError(code, processError, stderrData);
				readStream.emit("error", error);
				readStream.destroy(error);
			}
		});

		return readStream;
	}

	async getExtractors(): Promise<string[]> {
		const ytDlpStdout = await this.execPromise(["--list-extractors"]);
		return ytDlpStdout.split("\n");
	}

	async getExtractorDescriptions(): Promise<string[]> {
		const ytDlpStdout = await this.execPromise(["--extractor-descriptions"]);
		return ytDlpStdout.split("\n");
	}

	async getHelp(): Promise<string> {
		const ytDlpStdout = await this.execPromise(["--help"]);
		return ytDlpStdout;
	}

	async getUserAgent(): Promise<string> {
		const ytDlpStdout = await this.execPromise(["--dump-user-agent"]);
		return ytDlpStdout;
	}

	async getVersion(): Promise<string> {
		const ytDlpStdout = await this.execPromise(["--version"]);
		return ytDlpStdout;
	}

	async getVideoInfo(ytDlpArguments: string | string[]): Promise<unknown> {
		if (typeof ytDlpArguments === "string") {
			ytDlpArguments = [ytDlpArguments];
		}

		if (
			!ytDlpArguments.includes("-f") &&
			!ytDlpArguments.includes("--format")
		) {
			ytDlpArguments = ytDlpArguments.concat(["-f", "best"]);
		}

		const ytDlpStdout = await this.execPromise(
			ytDlpArguments.concat(["--dump-json"]),
		);

		try {
			return JSON.parse(ytDlpStdout);
		} catch (_) {
			return JSON.parse(`[${ytDlpStdout.replace(/\n/g, ",").slice(0, -1)}]`);
		}
	}

	static bindAbortSignal(
		signal: AbortSignal | null,
		process: ChildProcess,
	): void {
		signal?.addEventListener("abort", () => {
			try {
				if (os.platform() === "win32")
					execSync(`taskkill /pid ${process.pid} /T /F`);
				else {
					execSync(`pgrep -P ${process.pid} | xargs -L 1 kill`);
				}
			} catch (_) {
			} finally {
				process.kill();
			}
		});
	}

	static readonly DEFAULT_MAX_BUFFER = 1024 * 1024 * 1024;

	static setDefaultOptions(options: YTDlpOptions): YTDlpOptions {
		if (!options.maxBuffer) {
			options.maxBuffer = YTDlpWrap.DEFAULT_MAX_BUFFER;
		}

		return options;
	}

	static createError(
		code: number | ExecFileException | null,
		processError: Error | null,
		stderrData: string,
	): Error {
		let errorMessage = `\nError code: ${code}`;
		if (processError) {
			errorMessage += `\n\nProcess error:\n${processError}`;
		}

		if (stderrData) {
			errorMessage += `\n\nStderr:\n${stderrData}`;
		}

		return new Error(errorMessage);
	}

	static emitYoutubeDlEvents(
		stringData: string,
		emitter: YTDlpEventEmitter | YTDlpReadable,
	): void {
		const outputLines = stringData.split(/\r|\n/g).filter(Boolean);
		for (const outputLine of outputLines) {
			if (outputLine[0] === "[") {
				const progressMatch = outputLine.match(progressRegex);
				if (progressMatch) {
					const progressObject: Progress = {};
					progressObject.percent = parseFloat(
						progressMatch[1].replace("%", ""),
					);

					progressObject.totalSize = progressMatch[2].replace("~", "");
					progressObject.currentSpeed = progressMatch[4];
					progressObject.eta = progressMatch[6];

					(emitter as YTDlpEventEmitter).emit("progress", progressObject);
				}

				const eventType = outputLine
					.split(" ")[0]
					.replace("[", "")
					.replace("]", "");

				const eventData = outputLine.substring(
					outputLine.indexOf(" "),
					outputLine.length,
				);

				(emitter as YTDlpEventEmitter).emit("ytDlpEvent", eventType, eventData);
			}
		}
	}
}

export interface YTDlpEventEmitter extends EventEmitter {
	ytDlpProcess?: ChildProcessWithoutNullStreams;

	removeAllListeners(event?: YTDlpEventName | symbol): this;
	setMaxListeners(n: number): this;
	getMaxListeners(): number;
	listenerCount(eventName: YTDlpEventName): number;
	eventNames(): Array<YTDlpEventName>;
	addListener: YTDlpEventNameToEventListenerFunction<this>;
	prependListener: YTDlpEventNameToEventListenerFunction<this>;
	prependOnceListener: YTDlpEventNameToEventListenerFunction<this>;
	on: YTDlpEventNameToEventListenerFunction<this>;
	once: YTDlpEventNameToEventListenerFunction<this>;
	removeListener: YTDlpEventNameToEventListenerFunction<this>;
	off: YTDlpEventNameToEventListenerFunction<this>;
	listeners<EventName extends YTDlpEventName>(
		eventName: EventName,
	): Array<YTDlpEventListener<EventName>>;
	rawListeners(
		eventName: YTDlpEventName,
	): Array<(...args: unknown[]) => unknown>;
	emit: YTDlpEventNameToEventDataFunction<boolean>;
}

export interface YTDlpPromise<T> extends Promise<T> {
	ytDlpProcess?: ChildProcess;
}
