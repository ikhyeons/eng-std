import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { OpenAiClient } from './openai.client';
import { AI_NAME } from './ai.names';
import {
  SituationPhrase,
  SituationWord,
} from '../words/situation.types';
import { VOCAB_QUALITY_PROMPT } from './prompts/vocab-quality.prompt';
import { parseJsonObject } from './json-text';

const VOCAB_ITEM_SCHEMA: { [key: string]: unknown } = {
  type: 'object',
  additionalProperties: false,
  required: ['english', 'korean', 'example', 'exampleKo'],
  properties: {
    english: { type: 'string' },
    korean: { type: 'string' },
    example: { type: 'string' },
    exampleKo: { type: 'string' },
  },
};

const VOCAB_JSON_SCHEMA: { [key: string]: unknown } = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'phrases', 'words'],
  properties: {
    title: { type: 'string' },
    phrases: {
      type: 'array',
      items: VOCAB_ITEM_SCHEMA,
    },
    words: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['english', 'korean', 'category', 'example', 'exampleKo'],
        properties: {
          english: { type: 'string' },
          korean: { type: 'string' },
          category: {
            type: 'string',
            enum: ['명사', '동사', '형용사', '부사', '숙어'],
          },
          example: { type: 'string' },
          exampleKo: { type: 'string' },
        },
      },
    },
  },
};

@Injectable()
export class SituationGeneratorService {
  readonly name = AI_NAME.SITUATION_GENERATOR;

  constructor(private readonly openai: OpenAiClient) {}

  async generateVocab(
    situationText: string,
    date: string,
  ): Promise<{
    title: string;
    words: SituationWord[];
    phrases: SituationPhrase[];
  }> {
    const user = `Create today's vocabulary and phrases for this situation.

Date: ${date}
Situation (from the user — use this scene exactly, do not replace it with a different situation):
${situationText}

Return a JSON object that matches the required schema exactly. No markdown. No extra keys. No commentary.

JSON shape (exact keys):
{
  "title": "적당한 한국어 제목, 이모지 선택 가능, 40자 이내",
  "phrases": [ 
    { 
      "english": "reusable spoken expression, sentence pattern, or conversational framework at B2–C1", 
      "korean": "Korean meaning of the expression/pattern", 
      "example": "natural example sentence that demonstrates how to use the expression/pattern", 
      "exampleKo": "Korean translation of the example" 
    } 
  ],
  "words": [
    {
      "english": "prefer a single word; multi-word only if meaning is unpredictable or it is a high-stakes official term",
      "korean": "Korean meaning",
      "category": "명사 | 동사 | 형용사 | 부사 | 숙어",
      "example": "natural example sentence that contains the word",
      "exampleKo": "Korean translation of the example"
    }
  ]
}

Additional output rules:
- words: exactly 60 items, following the vocabulary quality standards
- Prefer single-word vocabulary. Reject transparent glued compounds such as "item description", "physical condition", "platform policy", "delivery confirmation", "condition report", "service fee"
- Keep a multi-word item only if the combined meaning cannot be guessed from the parts, or it is an official high-importance chunk such as "boarding pass"
- phrases: exactly 8 items, practical spoken English for THIS situation, also B2–C1
- phrases should be reusable sentence skeletons or speaking patterns, not complete situation-specific sentences 
- Keep each phrase short and structural 
- Show replaceable parts with "~" 
- Prefer patterns that can generate many different sentences
- Every example MUST contain the target english word/phrase
- Do not repeat the same english item across words and phrases
- title must summarize THIS situation, not a different one
- Do NOT invent a different situation`;

    const content = await this.openai.createResponse({
      ai: this.name,
      textFormat: {
        type: 'json_schema',
        name: 'daily_vocab',
        strict: true,
        schema: VOCAB_JSON_SCHEMA,
      },
      input: [
        {
          role: 'developer',
          content: [
            {
              type: 'input_text',
              text: VOCAB_QUALITY_PROMPT,
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: user,
            },
          ],
        },
      ],
    });

    return this.parseVocab(content, situationText);
  }

  private parseVocab(
    raw: string,
    situationText: string,
  ): {
    title: string;
    words: SituationWord[];
    phrases: SituationPhrase[];
  } {
    const parsed = parseJsonObject(raw);
    if (!parsed) {
      throw new HttpException(
        `[${this.name}] JSON 형식을 읽지 못했습니다.`,
        HttpStatus.BAD_GATEWAY,
      );
    }
    const phraseRows = Array.isArray(parsed.phrases) ? parsed.phrases : [];
    const wordRows = Array.isArray(parsed.words) ? parsed.words : [];
    const title =
      this.asString(parsed.title).slice(0, 80) ||
      situationText.slice(0, 40);

    const phrases = phraseRows
      .map((item, i) => this.toPhrase(item, 101 + i))
      .filter((p) => p.english && p.korean);

    const words = wordRows
      .map((item, i) => this.toWord(item, i + 1))
      .filter((w) => w.english && w.korean);

    if (phrases.length < 3 || words.length < 20) {
      throw new HttpException(
        `[${this.name}] 생성한 단어/표현이 너무 적습니다.`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return { title, phrases, words };
  }

  private toPhrase(item: unknown, id: number): SituationPhrase {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      id,
      english: this.asString(row.english) || this.asString(row.phrase),
      korean: this.asString(row.korean) || this.asString(row.meaning),
      example: this.asString(row.example),
      exampleKo: this.asString(row.exampleKo) || this.asString(row.example_ko),
    };
  }

  private toWord(item: unknown, id: number): SituationWord {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      id,
      english: this.asString(row.english) || this.asString(row.word),
      korean: this.asString(row.korean) || this.asString(row.meaning),
      category: this.normalizeCategory(this.asString(row.category)),
      example: this.asString(row.example),
      exampleKo: this.asString(row.exampleKo) || this.asString(row.example_ko),
    };
  }

  private normalizeCategory(value: string): string {
    const map: Record<string, string> = {
      noun: '명사',
      verb: '동사',
      adjective: '형용사',
      adj: '형용사',
      adverb: '부사',
      adv: '부사',
      idiom: '숙어',
      phrase: '숙어',
      명사: '명사',
      동사: '동사',
      형용사: '형용사',
      부사: '부사',
      숙어: '숙어',
      표현: '표현',
    };
    return map[value] ?? map[value.toLowerCase()] ?? '명사';
  }

  private asString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }
}
