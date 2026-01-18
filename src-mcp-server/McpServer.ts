import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";
import { z } from "zod";

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for the frontend
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
}));

// Create MCP server
const mcpServer = new McpServer({
  name: "simple-mcp-server",
  version: "1.0.0",
});

// Tool 1: Greet - returns a greeting message
mcpServer.tool(
  "greet",
  "Returns a friendly greeting message for the given name",
  {
    name: z.string().describe("The name of the person to greet"),
  },
  async ({ name }) => {
    const greeting = `Hello, ${name}! Welcome to the MCP server. 👋`;
    return {
      content: [{ type: "text", text: greeting }],
    };
  }
);

// Tool 2: Add Numbers - adds two numbers together
mcpServer.tool(
  "add_numbers",
  "Adds two numbers together and returns the result",
  {
    a: z.number().describe("The first number"),
    b: z.number().describe("The second number"),
  },
  async ({ a, b }) => {
    const result = a + b;
    return {
      content: [{ type: "text", text: `${a} + ${b} = ${result}` }],
    };
  }
);

// Store active transports by their internal session ID
const transports = new Map<string, SSEServerTransport>();

// SSE endpoint for MCP connections
app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  const sessionId = transport.sessionId;
  
  console.log(`[${new Date().toISOString()}] New SSE connection: ${sessionId}`);
  transports.set(sessionId, transport);

  res.on("close", () => {
    console.log(`[${new Date().toISOString()}] SSE connection closed: ${sessionId}`);
    transports.delete(sessionId);
  });

  await mcpServer.connect(transport);
});

// Messages endpoint for client-to-server communication
app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);

  if (!transport) {
    console.error(`Session not found: ${sessionId}`);
    console.error(`Available sessions: ${Array.from(transports.keys()).join(", ")}`);
    res.status(404).json({ error: "Session not found" });
    return;
  }

  await transport.handlePostMessage(req, res);
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`Simple MCP Server running on http://localhost:${PORT}`);
  console.log(`========================================`);
  console.log(`  - SSE endpoint:    GET  /sse`);
  console.log(`  - Messages:        POST /messages`);
  console.log(`  - Health check:    GET  /api/health`);
  console.log(`\nAvailable tools:`);
  console.log(`  - greet(name)           Returns a greeting message`);
  console.log(`  - add_numbers(a, b)     Adds two numbers together`);
  console.log(`\n`);
});
