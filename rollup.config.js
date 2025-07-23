import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import copy from "rollup-plugin-copy";

export default {
	input: "index.ts",
	output: {
		file: "dist/index.cjs",
		format: "cjs",
		sourcemap: true,
		banner: "#!/usr/bin/env node",
		inlineDynamicImports: true,
	},
	plugins: [
		resolve({
			preferBuiltins: true,
			exportConditions: ["node"],
		}),
		commonjs(),
		json(),
		typescript({
			tsconfig: "./tsconfig.json",
			sourceMap: true,
			inlineSources: true,
		}),
		copy({
			targets: [{ src: ".env.example", dest: "dist", rename: ".env.example" }],
			copyOnce: true,
		}),
	],
	external: [
		"node:process",
		"node:path",
		"node:fs",
		"node:os",
		"node:crypto",
		"node:events",
		"node:stream",
		"node:util",
		"node:url",
		"node:buffer",
		"node:child_process",
		"node:net",
		"node:tls",
		"node:http",
		"node:https",
		"node:zlib",
		"discord.js",
		"@discordjs/voice",
		"@distube/ytdl-core",
		"dotenv",
		"ffmpeg-static",
		/^@ffmpeg-installer\//,
		/^node-gyp-build/,
		/^prebuild-install/,
	],
};
