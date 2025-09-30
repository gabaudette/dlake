# DLake Discord Bot

A private Discord music bot (my first) built as a hobby project for learning purposes and use among friends in private Discord servers.

## Important Legal Disclaimer

**This project is intended for PRIVATE, NON-COMMERCIAL use only as a learning exercise.**

- This bot streams audio from YouTube, which may violate YouTube's Terms of Service
- This code is shared for educational purposes and private use among friends
- **I am NOT responsible for any legal consequences if you choose to use this code**
- **DO NOT use this bot publicly or commercially**
- **Users assume all legal risks and responsibilities**
- Consider using official music streaming services or APIs for any public/commercial projects
## Commands

- `/play <url>` - Play a YouTube video
- `/skip` - Skip the current song
- `/pause` - Pause the current song
- `/resume` - Resume playback
- `/stop` - Stop music and clear queue
- `/queue` - Show current queue
- `/shuffle` - Shuffle the current queue
- `/nowplaying` - Show currently playing song
- `/ping` - Test bot connectivity
- `/help` - Show availables commands
- `/about` - Show information about this bot


## Prerequisites

- Node.js 18+ 
- Discord Bot Token & Application Credentials
- FFMPEG

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your Discord bot token:
   ```
   DISCORD_TOKEN=
   CLIENT_ID=
   GUILD_ID=
   ```
4. Build the project:
   ```bash
   npm run build
   ```
5. Start the bot:
   ```bash
   npm run start
   ```

## Development

- `npm run build` - Build the project using Rollup
- `npm run start` - Start the built bot
  
## Technologies Used

- **Discord.js** - Discord API wrapper
- **@discordjs/voice** - Voice connection handling
- **ytdl-core** - YouTube audio streaming
- **TypeScript** - Type-safe JavaScript
- **FFmpeg** - Audio processing

## Contributing

This is a personal learning project. Feel free to fork and modify for your own private use, but please respect the legal disclaimer above.

## License

This project is for educational purposes only. Use at your own risk and responsibility.

---

**Remember: This bot is for private use among friends only. Respect YouTube's Terms of Service and applicable laws in your jurisdiction.**

