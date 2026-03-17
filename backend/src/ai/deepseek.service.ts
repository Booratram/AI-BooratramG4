import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  useReasoner?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  finishReason?: string;
  usedReasoner: boolean;
}

export interface DeepseekStatus {
  available: boolean;
  baseUrl: string;
  model: string;
  reasonerModel: string;
  timeoutMs: number;
}

interface DeepSeekResponse {
  choices?: Array<{
    finish_reason?: string;
    message?: {
      content?: string;
      reasoning_content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  error?: {
    message?: string;
    type?: string;
    code?: string | number;
  };
}

@Injectable()
export class DeepseekService {
  constructor(private readonly configService: ConfigService) {}

  getStatus(): DeepseekStatus {
    return {
      available: this.isConfigured(),
      baseUrl: this.getBaseUrl(),
      model: this.getModel(false),
      reasonerModel: this.getModel(true),
      timeoutMs: this.getTimeoutMs(),
    };
  }

  isConfigured() {
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    return Boolean(apiKey && !apiKey.startsWith('sk-...'));
  }

  async chat(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {},
  ): Promise<ChatCompletionResult> {
    const apiKey = this.getApiKey();
    const useReasoner = Boolean(options.useReasoner);
    const model = this.getModel(useReasoner);
    const payload: Record<string, unknown> = {
      model,
      messages: this.sanitizeMessages(messages),
      stream: false,
    };

    if (!useReasoner) {
      payload.temperature = options.temperature ?? 0.2;
    }

    if (options.maxTokens) {
      payload.max_tokens = options.maxTokens;
    }

    let response: Response;
    try {
      response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.getTimeoutMs()),
      });
    } catch (error) {
      throw this.normalizeTransportError(error);
    }

    const responsePayload = await this.parseResponse(response);
    if (!response.ok) {
      throw new ServiceUnavailableException(
        this.extractErrorMessage(responsePayload) ?? `DeepSeek request failed with ${response.status}`,
      );
    }

    const content = responsePayload?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new ServiceUnavailableException('DeepSeek returned an empty assistant response');
    }

    return {
      content,
      model,
      promptTokens: responsePayload?.usage?.prompt_tokens,
      completionTokens: responsePayload?.usage?.completion_tokens,
      finishReason: responsePayload?.choices?.[0]?.finish_reason,
      usedReasoner: useReasoner,
    };
  }

  private getApiKey() {
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');

    if (!apiKey || apiKey.startsWith('sk-...')) {
      throw new ServiceUnavailableException('DEEPSEEK_API_KEY is not configured');
    }

    return apiKey;
  }

  private getBaseUrl() {
    return this.configService
      .get<string>('DEEPSEEK_BASE_URL', 'https://api.deepseek.com')
      .replace(/\/$/, '');
  }

  private getTimeoutMs() {
    const value = Number(this.configService.get<string>('DEEPSEEK_TIMEOUT_MS', '45000'));
    return Number.isFinite(value) && value > 0 ? value : 45000;
  }

  private getModel(useReasoner: boolean) {
    return useReasoner
      ? this.configService.get<string>('DEEPSEEK_REASONER_MODEL', 'deepseek-reasoner')
      : this.configService.get<string>('DEEPSEEK_MODEL', 'deepseek-chat');
  }

  private sanitizeMessages(messages: ChatMessage[]) {
    return messages
      .map((message) => ({
        role: message.role,
        content: message.content?.trim() ?? '',
      }))
      .filter((message) => message.content.length > 0);
  }

  private async parseResponse(response: Response): Promise<DeepSeekResponse | null> {
    try {
      return (await response.json()) as DeepSeekResponse;
    } catch {
      return null;
    }
  }

  private extractErrorMessage(payload: DeepSeekResponse | null) {
    const message = payload?.error?.message?.trim();
    if (message) {
      return message;
    }

    return null;
  }

  private normalizeTransportError(error: unknown) {
    if (error instanceof ServiceUnavailableException) {
      return error;
    }

    if (error instanceof Error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        return new ServiceUnavailableException('DeepSeek request timed out');
      }

      return new ServiceUnavailableException(`DeepSeek request failed: ${error.message}`);
    }

    return new ServiceUnavailableException('DeepSeek request failed');
  }
}
