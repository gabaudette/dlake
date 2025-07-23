"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = registerCommands;
const console_1 = require("console");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const discord_js_1 = require("discord.js");
const GLOBAL_COMMANDS = [
    {
        name: "ping",
        description: "Test if the bot is responding",
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
function buildCommands() {
    const commands = [];
    for (const command of GLOBAL_COMMANDS) {
        commands.push(new discord_js_1.SlashCommandBuilder()
            .setName(command.name)
            .setDescription(command.description));
    }
    const newCommands = [
        ...commands,
        new discord_js_1.SlashCommandBuilder()
            .setName("play")
            .setDescription("Play a song")
            .addStringOption((option) => option
            .setName("url")
            .setDescription("The URL of the song to play")
            .setRequired(true)),
    ];
    return newCommands.map((command) => command.toJSON());
}
async function registerCommands() {
    const commands = buildCommands();
    (0, console_1.assert)(process.env.DISCORD_TOKEN, "DISCORD_TOKEN is not set in .env");
    const rest = new (await Promise.resolve().then(() => __importStar(require("@discordjs/rest")))).REST({
        version: "10",
    }).setToken(process.env.DISCORD_TOKEN ?? "");
    try {
        (0, console_1.assert)(process.env.CLIENT_ID, "CLIENT_ID is not set in .env");
        (0, console_1.assert)(process.env.GUILD_ID, "GUILD_ID is not set in .env");
        await rest.put((await Promise.resolve().then(() => __importStar(require("discord-api-types/v10")))).Routes.applicationGuildCommands(process.env.CLIENT_ID ?? "", process.env.GUILD_ID ?? ""), { body: commands });
    }
    catch (error) {
        console.error("Error registering commands:", error);
    }
}
