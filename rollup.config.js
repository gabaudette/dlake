import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import copy from 'rollup-plugin-copy';

export default {
  input: 'index.ts',
  output: {
    file: 'dist/index.cjs',
    format: 'cjs',
    sourcemap: true,
    banner: '#!/usr/bin/env node',
    inlineDynamicImports: true
  },
  plugins: [
    // Resolve node modules
    resolve({
      preferBuiltins: true,
      exportConditions: ['node']
    }),
    
    // Convert CommonJS modules to ES6
    commonjs(),
    
    // Handle JSON imports
    json(),
    
    // TypeScript compilation
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: true,
      inlineSources: true
    }),
    
    // Copy static files
    copy({
      targets: [
        { src: '.env.example', dest: 'dist', rename: '.env.example' }
      ],
      copyOnce: true
    })
  ],
  
  // Mark dependencies as external (don't bundle them)
  external: [
    // Node.js built-ins
    'node:process',
    'node:path',
    'node:fs',
    'node:os',
    'node:crypto',
    'node:events',
    'node:stream',
    'node:util',
    'node:url',
    'node:buffer',
    'node:child_process',
    'node:net',
    'node:tls',
    'node:http',
    'node:https',
    'node:zlib',
    
    // npm dependencies (they should be in node_modules)
    'discord.js',
    '@discordjs/voice',
    '@distube/ytdl-core',
    'dotenv',
    'ffmpeg-static',
    
    // Conditional externals for binaries
    /^@ffmpeg-installer\//,
    /^node-gyp-build/,
    /^prebuild-install/
  ]
};
