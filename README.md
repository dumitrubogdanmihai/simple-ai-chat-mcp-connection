# Simple AI Chat MCP Connection

A simple AI chat interface connected to an MCP server.

This lightweight web application displays a basic AI chat and includes a button to connect to an MCP server. The project also includes an MCP server with two tools. It can be used to inspect and troubleshoot the API requests exchanged between the AI chat, the OpenAI server, and the MCP server. All requests can be viewed in the browser’s developer tools under the Network tab.

## Features

- Send messages to OpenAI's GPT-4o-mini model
- Hardcoded tool: `get_current_date` - returns the current date and time
- Allows to connect to a MCP server with two tools: "add_numbers" and "greet".

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run it:
   ```bash
   npm run dev:all
   ```

3. Open http://localhost:5173/ in the browser and enter your OpenAI API key to start chatting.

## Note

This application runs entirely in the browser. Your API key is only used to make requests to OpenAI and is not stored or sent anywhere else.
