export class View {
  private apiKeyInput: HTMLInputElement;
  private chatMessages: HTMLDivElement;
  private messageInput: HTMLInputElement;
  private sendButton: HTMLButtonElement;
  private mcpConnectButton: HTMLButtonElement;
  private mcpStatus: HTMLSpanElement;
  private mcpConfigTextarea: HTMLTextAreaElement;

  constructor() {
    this.apiKeyInput = document.getElementById("api-key") as HTMLInputElement;
    this.chatMessages = document.getElementById("chat-messages") as HTMLDivElement;
    this.messageInput = document.getElementById("message-input") as HTMLInputElement;
    this.sendButton = document.getElementById("send-button") as HTMLButtonElement;
    this.mcpConnectButton = document.getElementById("mcp-connect") as HTMLButtonElement;
    this.mcpStatus = document.getElementById("mcp-status") as HTMLSpanElement;
    this.mcpConfigTextarea = document.getElementById("mcp-config") as HTMLTextAreaElement;
  }

  public getMcpConfig(): McpConfig {
    const text = this.mcpConfigTextarea.value.trim();
    return JSON.parse(text) as McpConfig;
  }

  public setMcpConfigEnabled(enabled: boolean): void {
    this.mcpConfigTextarea.disabled = !enabled;
  }

  public getApiKey(): string {
    return this.apiKeyInput.value.trim();
  }

  public getUserMessage(): string {
    return this.messageInput.value.trim();
  }

  public clearMessageInput(): void {
    this.messageInput.value = "";
  }

  public setInputEnabled(enabled: boolean): void {
    this.sendButton.disabled = !enabled;
    this.messageInput.disabled = !enabled;
    if (enabled) {
      this.messageInput.focus();
    }
  }

  public clear(): void {
    this.chatMessages.innerHTML = "";
  }

  public addMessage(role: "user" | "assistant" | "system" | "tool", content: string): void {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${role}`;
    messageDiv.textContent = content;
    this.chatMessages.appendChild(messageDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  public addToolMessage(toolName: string, result: string): void {
    const messageDiv = document.createElement("div");
    messageDiv.className = "message tool";
    messageDiv.innerHTML = `<strong>Tool: ${toolName}</strong><br>${result}`;
    this.chatMessages.appendChild(messageDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  public onSend(callback: () => void): void {
    this.sendButton.addEventListener("click", callback);
    this.messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        callback();
      }
    });
  }

  public focusInput(): void {
    this.messageInput.focus();
  }

  public onMcpConnect(callback: () => void): void {
    this.mcpConnectButton.addEventListener("click", callback);
  }

  public setMcpConnectEnabled(enabled: boolean): void {
    this.mcpConnectButton.disabled = !enabled;
  }

  public setMcpStatus(status: "disconnected" | "connecting" | "connected" | "error", message?: string): void {
    this.mcpStatus.className = "";
    this.mcpConnectButton.classList.remove("connected");

    switch (status) {
      case "disconnected":
        this.mcpStatus.textContent = "";
        this.mcpConnectButton.textContent = "Connect MCP";
        break;
      case "connecting":
        this.mcpStatus.textContent = "Connecting...";
        break;
      case "connected":
        this.mcpStatus.className = "connected";
        this.mcpStatus.textContent = message || "Connected";
        this.mcpConnectButton.classList.add("connected");
        this.mcpConnectButton.textContent = "Disconnect";
        break;
      case "error":
        this.mcpStatus.className = "error";
        this.mcpStatus.textContent = message || "Connection failed";
        break;
    }
  }
}
