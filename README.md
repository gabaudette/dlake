# DLake Discord Bot

A private Discord music bot (my first) built as a hobby project for learning purposes and use among friends in private Discord servers.

## ⚠️ Important Legal Disclaimer

**This project is intended for PRIVATE, NON-COMMERCIAL use only as a learning exercise.**

- This bot streams audio from YouTube, which may violate YouTube's Terms of Service
- This code is shared for educational purposes and private use among friends
- **I am NOT responsible for any legal consequences if you choose to use this code**
- **DO NOT use this bot publicly or commercially**
- **Users assume all legal risks and responsibilities**
- Consider using official music streaming services or APIs for any public/commercial projects

## Features

- 🎵 Play music from YouTube URLs
- ⏭️ Skip tracks
- ⏸️ Pause/Resume playback
- 🛑 Stop and clear queue
- 📜 View current queue
- 🎶 Show currently playing track
- 🏓 Ping command for testing

## Commands

- `/play <url>` - Play a YouTube video
- `/skip` - Skip the current song
- `/pause` - Pause the current song
- `/resume` - Resume playback
- `/stop` - Stop music and clear queue
- `/queue` - Show current queue
- `/nowplaying` - Show currently playing song
- `/ping` - Test bot connectivity

## Prerequisites

- Node.js 18+ 
- Discord Bot Token & Application Credentials
- FFmpeg installed on your system

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your Discord bot token & application credentials:
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
   npm start
   ```

## Development

- `npm run dev` - Start in development mode with auto-reload
- `npm run build` - Compile TypeScript to JavaScript

## Project Structure

```
├── functions/
│   ├── commands.ts    # Slash command registration
│   └── song.ts        # Music playback logic
├── types/
│   └── types.ts       # TypeScript type definitions
├── index.ts           # Main bot file
└── package.json
```

## Technologies Used

- **Discord.js** - Discord API wrapper
- **@discordjs/voice** - Voice connection handling
- **ytdl-core** - YouTube audio streaming
- **TypeScript** - Type-safe JavaScript
- **FFmpeg** - Audio processing

## Error Handling

The bot includes comprehensive error handling to prevent crashes

## Contributing

This is a personal learning project. Feel free to fork and modify for your own private use, but please respect the legal disclaimer above.

## License

This project is for educational purposes only. Use at your own risk and responsibility.

---

**Remember: This bot is for private use among friends only. Respect YouTube's Terms of Service and applicable laws in your jurisdiction.**

