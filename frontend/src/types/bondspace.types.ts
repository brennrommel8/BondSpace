// Update this file with the fixed ChatMessage interface
// This should be placed in your /src/types/bondspace.types.ts file

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ChatRequest {
    messages: ChatMessage[];
    systemInstruction?: string;
}

export interface ChatResponse {
    reply: string;
    model?: string;
    tokens?: number;
}

export interface ModelInfo {
    name: string;
    version: string;
    displayName: string;
    description: string;
    inputTokenLimit: number;
    outputTokenLimit: number;
}

export interface ModelListResponse {
    models: ModelInfo[];
}