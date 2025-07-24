// biome-ignore lint/nursery/noUnresolvedImports: This import is necessary for environment variable management
import process from "node:process";
// biome-ignore lint/nursery/noUnresolvedImports: This import is necessary for environment variable management
import dotenv from "dotenv";
import { DiscordClient } from "./client/DiscordClient";

dotenv.config();

const client: DiscordClient = new DiscordClient();
client.login(process.env.DISCORD_TOKEN);
