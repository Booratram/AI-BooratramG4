import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
  }>;
  error?: {
    message?: string;
  };
}

export interface EmbeddingsStatus {
  provider: 'deepseek' | 'openai';
  live: boolean;
  mode: 'deterministic' | 'openai';
  model?: string;
}

@Injectable()
export class EmbeddingsService {
  constructor(private readonly configService: ConfigService) {}

  async embed(text: string): Promise<number[]> {
    const provider = this.getProvider();

    if (provider === 'openai' && this.isOpenAiConfigured()) {
      try {
        return await this.openAiEmbedding(text);
      } catch {
        return this.deterministicFallback(text);
      }
    }

    return this.deterministicFallback(text);
  }

  getStatus(): EmbeddingsStatus {
    const provider = this.getProvider();
    const live = provider === 'openai' && this.isOpenAiConfigured();

    return {
      provider,
      live,
      mode: live ? 'openai' : 'deterministic',
      model: live
        ? this.configService.get<string>('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small')
        : undefined,
    };
  }

  private getProvider(): 'deepseek' | 'openai' {
    return this.configService.get<string>('EMBEDDING_PROVIDER', 'deepseek') === 'openai'
      ? 'openai'
      : 'deepseek';
  }

  private isOpenAiConfigured() {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    return Boolean(apiKey && !apiKey.startsWith('sk-...'));
  }

  private async openAiEmbedding(text: string): Promise<number[]> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const model = this.configService.get<string>(
      'OPENAI_EMBEDDING_MODEL',
      'text-embedding-3-small',
    );

    if (!apiKey || apiKey.startsWith('sk-...')) {
      throw new ServiceUnavailableException('OPENAI_API_KEY is not configured');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model,
      }),
      signal: AbortSignal.timeout(30000),
    });

    const payload = await this.parseResponse(response);
    if (!response.ok) {
      throw new ServiceUnavailableException(
        payload?.error?.message?.trim() ?? `Embedding request failed with ${response.status}`,
      );
    }

    const embedding = payload?.data?.[0]?.embedding;
    if (!embedding?.length) {
      throw new ServiceUnavailableException('Embedding provider returned an empty vector');
    }

    return embedding;
  }

  private async parseResponse(response: Response): Promise<OpenAIEmbeddingResponse | null> {
    try {
      return (await response.json()) as OpenAIEmbeddingResponse;
    } catch {
      return null;
    }
  }

  private deterministicFallback(text: string): number[] {
    const vectorSize = 1536;
    const embedding = new Array<number>(vectorSize).fill(0);
    const normalized = this.normalize(text);
    const features = this.extractFeatures(normalized);
    const sourceFeatures = features.length > 0 ? features : [`raw:${normalized || text || 'empty'}`];

    sourceFeatures.forEach((feature, index) => {
      const primaryHash = this.hash(`${feature}:${index}`);
      const secondaryHash = this.hash(`mirror:${feature}:${index}`);
      const primarySlot = primaryHash % vectorSize;
      const secondarySlot = secondaryHash % vectorSize;
      const weight = 1 + Math.min(feature.length, 24) / 24;
      const signedWeight = primaryHash % 2 === 0 ? weight : -weight;

      embedding[primarySlot] += signedWeight;
      embedding[secondarySlot] += signedWeight * 0.5;
    });

    const magnitude = Math.sqrt(embedding.reduce((sum, value) => sum + value * value, 0)) || 1;
    return embedding.map((value) => Number((value / magnitude).toFixed(6)));
  }

  private normalize(text: string) {
    return text
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractFeatures(text: string) {
    const tokens = text.split(' ').filter(Boolean);
    const features: string[] = [];

    tokens.forEach((token, index) => {
      features.push(`tok:${token}`);

      if (index < tokens.length - 1) {
        features.push(`bigram:${token}_${tokens[index + 1]}`);
      }

      if (token.length >= 4) {
        features.push(`prefix:${token.slice(0, 4)}`);
        features.push(`suffix:${token.slice(-4)}`);
      }
    });

    return features;
  }

  private hash(input: string) {
    let hash = 2166136261;

    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }
}
