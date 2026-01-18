import { View } from "./view";
import { ChatExecutor } from "./ChatExecutor";
import McpClientManager from "./mcpClient";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const view = new View();
const mcpClientManager = new McpClientManager();
const chatExecutor = new ChatExecutor(mcpClientManager);

// Handle MCP connect/disconnect
view.onMcpConnect(async () => {
  view.setMcpConnectEnabled(false);
  view.setMcpConfigEnabled(false);
  
  if (mcpClientManager.isConnected()) {
    // Disconnect
    try {
      await mcpClientManager.disconnect();
      view.setMcpStatus("disconnected");
      view.setMcpConfigEnabled(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      view.setMcpStatus("error", message);
      view.setMcpConfigEnabled(true);
    }
  } else {
    // Connect
    view.setMcpStatus("connecting");
    try {
      const config = view.getMcpConfig();
      await mcpClientManager.connect(config);
      const toolCount = mcpClientManager.getTools().length;
      const serverNames = mcpClientManager.getConnectedServerNames();
      view.setMcpStatus("connected", `${toolCount} tools from ${serverNames.length} server(s)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      view.setMcpStatus("error", message);
      view.setMcpConfigEnabled(true);
    }
  }
  
  view.setMcpConnectEnabled(true);
});

// Handle sending messages
view.onSend(async () => {
  view.setInputEnabled(false);
  
  const userMessage = view.getUserMessage();
  view.addMessage("user", userMessage);
  view.clearMessageInput();
  
  chatExecutor.initClient(view.getApiKey());
  await chatExecutor.sendMessage(userMessage);
  view.clear();
  chatExecutor.getConversation().forEach((message: ChatCompletionMessageParam) => {
    if (message.role === "tool") {
      view.addToolMessage(message.tool_call_id, message.content as string);
    } else if (message.content) {
      view.addMessage(message.role as "user" | "assistant" | "system", message.content as string);
    }
  });
  view.setInputEnabled(true);
});

view.focusInput();
