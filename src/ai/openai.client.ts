import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AI_NAME, AiName } from './ai.names';

type ResponseInput = OpenAI.Responses.ResponseInputItem[];

@Injectable()
export class OpenAiClient {
  private readonly logger = new Logger(OpenAiClient.name);

  constructor(private readonly config: ConfigService) {}

  async createResponse(params: {
    ai: AiName;
    input: ResponseInput;
    textFormat?: OpenAI.Responses.ResponseFormatTextConfig;
    verbosity?: 'low' | 'medium' | 'high';
  }): Promise<string> {
    const apiKey = this.keyFor(params.ai);
    if (!apiKey || apiKey.includes('여기에')) {
      throw new HttpException(
        `[${params.ai}] API 키가 설정되지 않았습니다.`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const model = this.modelFor(params.ai);
    const project = this.projectFor(params.ai);
    this.logger.log(`[${params.ai}] Responses API 호출 (model=${model})`);

    const openai = new OpenAI({
      apiKey,
      ...(project ? { project } : {}),
    });

    try {
      return await this.requestText(openai, model, params);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      if (this.shouldFallbackToJsonObject(params.textFormat, message)) {
        this.logger.warn(
          `[${params.ai}] json_schema 미지원, json_object로 재시도: ${message}`,
        );
        return this.createResponse({
          ...params,
          textFormat: { type: 'json_object' },
        });
      }
      this.logger.error(`[${params.ai}] OpenAI API 오류: ${message}`);
      throw new HttpException(
        `[${params.ai}] OpenAI API 오류: ${message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private async requestText(
    openai: OpenAI,
    model: string,
    params: {
      ai: AiName;
      input: ResponseInput;
      textFormat?: OpenAI.Responses.ResponseFormatTextConfig;
      verbosity?: 'low' | 'medium' | 'high';
    },
  ): Promise<string> {
    const response = await openai.responses.create({
      model,
      input: params.input,
      text: {
        format: params.textFormat ?? { type: 'text' },
        verbosity: params.verbosity ?? 'medium',
      },
      reasoning: {
        effort: 'medium',
        mode: 'standard',
        summary: 'auto',
      },
      tools: [],
      store: true,
      include: [
        'reasoning.encrypted_content',
        'web_search_call.action.sources',
      ],
    });

    const text = this.outputText(response);
    if (!text) {
      throw new HttpException(
        `[${params.ai}] 응답이 비어 있습니다.`,
        HttpStatus.BAD_GATEWAY,
      );
    }
    return text;
  }

  private shouldFallbackToJsonObject(
    format: OpenAI.Responses.ResponseFormatTextConfig | undefined,
    message: string,
  ): boolean {
    if (!format || format.type !== 'json_schema') return false;
    return /json_schema|structured output|response_format|text\.format|unsupported.*format|invalid.*format/i.test(
      message,
    );
  }

  private outputText(response: OpenAI.Responses.Response): string {
    if (response.output_text?.trim()) {
      return response.output_text.trim();
    }

    const chunks: string[] = [];
    for (const item of response.output ?? []) {
      if (item.type !== 'message') continue;
      for (const part of item.content ?? []) {
        if (part.type === 'output_text' && part.text) {
          chunks.push(part.text);
        }
      }
    }
    return chunks.join('\n').trim();
  }

  private keyFor(ai: AiName): string {
    if (ai === AI_NAME.SITUATION_GENERATOR) {
      return (
        this.config.get<string>('SITUATION_GENERATOR_API_KEY') ??
        this.config.get<string>('OPENAI_API_KEY') ??
        ''
      );
    }
    return (
      this.config.get<string>('ENG_TALKER_API_KEY') ??
      this.config.get<string>('OPENAI_API_KEY') ??
      ''
    );
  }

  private projectFor(ai: AiName): string {
    const shared = this.config.get<string>('OPENAI_PROJECT')?.trim() ?? '';
    const specific =
      ai === AI_NAME.SITUATION_GENERATOR
        ? this.config.get<string>('SITUATION_GENERATOR_PROJECT')
        : this.config.get<string>('ENG_TALKER_PROJECT');
    return specific?.trim() || shared;
  }

  private modelFor(ai: AiName): string {
    const fallback = this.config.get<string>('OPENAI_MODEL') ?? 'gpt-5.6-luna';
    if (ai === AI_NAME.SITUATION_GENERATOR) {
      return this.config.get<string>('SITUATION_GENERATOR_MODEL') ?? fallback;
    }
    return this.config.get<string>('ENG_TALKER_MODEL') ?? fallback;
  }
}
