import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { ChatLocalTools } from "./ChatLocalTools";
import McpClientManager from "./mcpClient";

export class ChatExecutor {

  private openai: OpenAI | null = null;
  private conversation: ChatCompletionMessageParam[] = [];

  private mcpClientManager: McpClientManager;
  private chatLocalTools = new ChatLocalTools();

  constructor(mcpClientManager: McpClientManager) {
    this.mcpClientManager = mcpClientManager;
  }

  public initClient(apiKey: string): void {
    this.openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  public getConversation(): ChatCompletionMessageParam[] {
    return this.conversation;
  }


  public async sendMessage(userMessage: string): Promise<void> {

    this.conversation.push({ role: "user", content: userMessage });

    const tools = this.getAllTools();

    try {
      let response = await this.openai!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: this.conversation,
        tools: tools.length > 0 ? tools : undefined,
      });

      let assistantMessage = response.choices[0].message;

      while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        this.conversation.push(assistantMessage);

        // Process tool calls (may include async MCP calls)
        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments || "{}");
          const toolCallResult = await this.executeToolCallAsync(toolName, toolArgs);

          this.conversation.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolCallResult,
          });
        }

        response = await this.openai!.chat.completions.create({
          model: "gpt-4o-mini",
          messages: this.conversation,
          tools: tools.length > 0 ? tools : undefined,
        });

        assistantMessage = response.choices[0].message;
      }

      const content = assistantMessage.content || "";
      this.conversation.push({ role: "assistant", content });
    } catch (error) {
      this.conversation.push({ role: "system", content: `Error: ${error instanceof Error ? error.message : "Unknown error"}` });
    }
  }


  // Get combined tools from local and MCP sources
  private getAllTools(): ChatCompletionTool[] {
    const allTools = [...this.chatLocalTools.getToolsDefinition()];
    
    if (this.mcpClientManager.isConnected()) {
      allTools.push(...this.mcpClientManager.getTools());
    }
    
    return allTools;
  }


  private async executeToolCallAsync(
    toolName: string,
    toolArgs: Record<string, unknown>
  ): Promise<string> {
    if (this.mcpClientManager.isMcpTool(toolName)) {
      try {
        return await this.mcpClientManager.executeTool(toolName, toolArgs);
      } catch (error) {
        return `MCP Error: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    }
    
    return this.chatLocalTools.executeToolCall(toolName, toolArgs);
  }
}
