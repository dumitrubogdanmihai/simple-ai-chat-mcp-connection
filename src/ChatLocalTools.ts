import type { ChatCompletionTool } from "openai/resources/chat/completions";

export class ChatLocalTools {

  public getToolsDefinition() : ChatCompletionTool[]  {
    return [
      {
        type: "function",
        function: {
          name: "get_current_date",
          description: "Returns the current date and time",
          parameters: {
            type: "object",
            properties: {},
            required: [],
          },
        },
      },
    ];
  }

  public executeToolCall(
    toolName: string,
    _args: Record<string, unknown>
  ): string {
    switch (toolName) {
      case "get_current_date":
        return this.getCurrentDate_();
      default:
        return `Unknown tool: ${toolName}`;
    }
  }

  private getCurrentDate_(): string {
    const now = new Date();
    return now.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });
  }
}
