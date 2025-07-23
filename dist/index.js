"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// biome-ignore lint/nursery/noUnresolvedImports: This import is necessary for environment variable management
const node_process_1 = __importDefault(require("node:process"));
const discord_js_1 = require("discord.js");
// biome-ignore lint/nursery/noUnresolvedImports: This import is necessary for environment variable management
const dotenv_1 = __importDefault(require("dotenv"));
const commands_1 = require("./functions/commands");
dotenv_1.default.config();
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.GuildVoiceStates,
    ],
});
client.once("ready", async () => {
    try {
        console.log(`Logged in as ${client.user?.tag}`);
        await (0, commands_1.registerCommands)();
    }
    catch (e) {
        console.error("Error during bot initialization:", e);
        node_process_1.default.exit(1);
    }
});
client.on("interactionCreate", async (interaction) => {
    try {
        if (!interaction.isCommand())
            return;
        if (!interaction.isChatInputCommand() || !interaction?.guildId) {
            await interaction.reply("This command can only be used as a chat input command or in a server.");
            return;
        }
        const queue = queues.get(interaction.guildId);
        await (0, commands_1.handleCommand)(interaction, queue, queues);
    }
    catch (e) {
        console.error("Error handling interaction:", e);
    }
});
const queues = new Map();
client.login(node_process_1.default.env.DISCORD_TOKEN);
