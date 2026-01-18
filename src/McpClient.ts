import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { ChatCompletionTool } from "openai/resources/chat/completions";

interface ServerConnection {
  name: string;
  config: McpServerConfig;
  client: Client;
  transport: SSEClientTransport;
}

interface ToolMapping {
  serverName: string;
  mcpToolName: string;
}

export interface McpServerConfig {
  type: "http";
  url: string;
}

export interface McpConfig {
  servers: Record<string, McpServerConfig>;
}

export default class McpClientManager {
  private servers: Map<string, ServerConnection> = new Map();
  private mcpTools: ChatCompletionTool[] = [];
  private toolNameMap: Map<string, ToolMapping> = new Map();

  isConnected(): boolean {
    return this.servers.size > 0;
  }

  getConnectedServerNames(): string[] {
    return Array.from(this.servers.keys());
  }

  async connect(config: McpConfig): Promise<void> {
    // Disconnect any existing connections first
    await this.disconnect();

    const serverEntries = Object.entries(config.servers);
    if (serverEntries.length === 0) {
      throw new Error("No servers configured");
    }

    const connectionPromises = serverEntries.map(async ([name, serverConfig]) => {
      return this.connectServer(name, serverConfig);
    });

    const results = await Promise.allSettled(connectionPromises);
    
    // Check for any failures
    const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    if (failures.length > 0 && failures.length === results.length) {
      // All failed
      throw new Error(`All servers failed to connect: ${failures.map(f => f.reason).join(", ")}`);
    }

    if (failures.length > 0) {
      console.warn(`Some servers failed to connect: ${failures.map(f => f.reason).join(", ")}`);
    }

    // Refresh tools from all connected servers
    await this.refreshTools();
  }

  private async connectServer(name: string, config: McpServerConfig): Promise<void> {
    console.log(`Connecting to MCP server "${name}"...`);

    if (config.type !== "http") {
      throw new Error(`Unsupported server type: ${config.type}`);
    }

    const transport = new SSEClientTransport(new URL(config.url));
    const client = new Client(
      { name: `browser-mcp-chat-${name}`, version: "1.0.0" },
      { capabilities: {} }
    );

    await client.connect(transport);
    
    this.servers.set(name, {
      name,
      config,
      client,
      transport,
    });

    console.log(`Connected to MCP server "${name}"`);
  }

  async disconnect(): Promise<void> {
    const disconnectPromises = Array.from(this.servers.values()).map(async (server) => {
      try {
        await server.client.close();
        console.log(`Disconnected from MCP server "${server.name}"`);
      } catch (error) {
        console.error(`Error disconnecting from "${server.name}":`, error);
      }
    });

    await Promise.all(disconnectPromises);
    
    this.servers.clear();
    this.mcpTools = [];
    this.toolNameMap.clear();
  }

  private async refreshTools(): Promise<void> {
    this.mcpTools = [];
    this.toolNameMap.clear();

    for (const [serverName, server] of this.servers) {
      try {
        const result = await server.client.listTools();

        for (const tool of result.tools) {
          // Convert MCP tool to OpenAI format
          // Prefix with server name and mcp_ to distinguish tools
          const sanitizedToolName = tool.name.replace(/[^a-zA-Z0-9_-]/g, "_");
          const sanitizedServerName = serverName.replace(/[^a-zA-Z0-9_-]/g, "_");
          const openAiName = `mcp_${sanitizedServerName}_${sanitizedToolName}`;
          
          this.toolNameMap.set(openAiName, {
            serverName,
            mcpToolName: tool.name,
          });

          this.mcpTools.push({
            type: "function",
            function: {
              name: openAiName,
              description: `[${serverName}] ${tool.description || `MCP tool: ${tool.name}`}`,
              parameters: tool.inputSchema as Record<string, unknown> || {
                type: "object",
                properties: {},
                required: [],
              },
            },
          });
        }

        console.log(`Loaded ${result.tools.length} tools from server "${serverName}"`);
      } catch (error) {
        console.error(`Failed to list tools from server "${serverName}":`, error);
      }
    }

    console.log(`Total tools loaded: ${this.mcpTools.length}`);
  }

  getTools(): ChatCompletionTool[] {
    return this.mcpTools;
  }

  isMcpTool(toolName: string): boolean {
    return this.toolNameMap.has(toolName);
  }

  async executeTool(openAiToolName: string, args: Record<string, unknown>): Promise<string> {
    const mapping = this.toolNameMap.get(openAiToolName);
    if (!mapping) {
      throw new Error(`Unknown MCP tool: ${openAiToolName}`);
    }

    const server = this.servers.get(mapping.serverName);
    if (!server) {
      throw new Error(`Server "${mapping.serverName}" not connected`);
    }

    try {
      const result = await server.client.callTool({
        name: mapping.mcpToolName,
        arguments: args,
      });

      // Convert result to string
      if (result.content && Array.isArray(result.content)) {
        return result.content
          .map((item) => {
            if (item.type === "text") {
              return item.text;
            }
            return JSON.stringify(item);
          })
          .join("\n");
      }

      return JSON.stringify(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`MCP tool execution failed: ${message}`);
    }
  }
}
