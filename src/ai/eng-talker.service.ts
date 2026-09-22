import { Injectable } from '@nestjs/common';
import { OpenAiClient } from './openai.client';
import { AI_NAME } from './ai.names';
import { ChatDto } from './dto/chat.dto';
import { parseJsonObject, stripFences } from './json-text';
import {
  buildEngTalkerDeveloperPrompt,
  ENG_TALKER_OPENING_USER,
} from './prompts/eng-talker.prompt';

const TALK_JSON_SCHEMA: { [key: string]: unknown } = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'replyKo', 'issue', 'summary'],
  properties: {
    reply: { type: 'string' },
    replyKo: { type: 'string' },
    issue: { type: ['string', 'null'] },
    summary: { type: 'string' },
  },
};

@Injectable()
export class EngTalkerService {
  readonly name = AI_NAME.ENG_TALKER;

  constructor(private readonly openai: OpenAiClient) {}

  async talk(dto: ChatDto): Promise<{
    reply: string;
    replyKo: string;
    ai: string;
    issue: string | null;
    summary: string;
  }> {
    const developer = buildEngTalkerDeveloperPrompt({
      name: this.name,
      situationTitle: dto.situationTitle,
      situationDescription: dto.situationDescription,
      phrases: dto.phrases,
      words: dto.words,
      summary: dto.summary,
    });

    const recent = dto.messages.slice(-8).map((m) =>
      m.role === 'user'
        ? { ...m, content: m.content.slice(0, 200) }
        : m,
    );
    const conversation =
      recent.length > 0
        ? recent
        : [
            {
              role: 'user' as const,
              content: ENG_TALKER_OPENING_USER,
            },
          ];

    const raw = await this.openai.createResponse({
      ai: this.name,
      verbosity: 'low',
      textFormat: {
        type: 'json_schema',
        name: 'eng_talker_turn',
        strict: true,
        schema: TALK_JSON_SCHEMA,
      },
      input: [
        {
          role: 'developer',
          content: [{ type: 'input_text', text: developer }],
        },
        ...conversation.map((m) => ({
          type: 'message' as const,
          role: (m.role === 'assistant' ? 'assistant' : 'user') as
            | 'assistant'
            | 'user',
          content: m.content,
        })),
      ],
    });

    const parsed = this.parseTalk(raw);
    return {
      reply: parsed.reply,
      replyKo: parsed.replyKo,
      ai: this.name,
      issue: parsed.issue,
      summary: parsed.summary || dto.summary?.trim() || '',
    };
  }

  private parseTalk(raw: string): {
    reply: string;
    replyKo: string;
    issue: string | null;
    summary: string;
  } {
    const parsed = parseJsonObject(raw);
    if (!parsed) {
      return {
        reply: stripFences(raw),
        replyKo: '',
        issue: null,
        summary: '',
      };
    }

    const reply = this.asString(parsed.reply);
    const replyKo = this.asString(parsed.replyKo);
    const summary = this.asString(parsed.summary);
    const issue = this.asIssue(parsed.issue);
    if (reply) return { reply, replyKo, issue, summary };

    return {
      reply: stripFences(raw),
      replyKo,
      issue,
      summary,
    };
  }

  private asString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private asIssue(value: unknown): string | null {
    if (value == null) return null;
    if (typeof value !== 'string') return null;
    const text = value.trim();
    if (!text || /^null|none|없음$/i.test(text)) return null;
    return text;
  }
}
