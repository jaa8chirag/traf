export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiReply {
  text: string;
}

export interface AIProvider {
  chat(input: { system: string; messages: AiMessage[]; maxTokens?: number }): Promise<AiReply>;
  translate(input: { text: string; from?: string; to: string }): Promise<string>;
}
