import { Injectable } from '@nestjs/common';
import { OpenAiClient } from './openai.client';
import { AI_NAME } from './ai.names';
import { ChatDto } from './dto/chat.dto';
import { parseJsonObject, stripFences } from './json-text';

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
    const vocabLines = [
      ...(dto.phrases ?? []).slice(0, 8).map((p) => `- phrase: ${p}`),
      ...(dto.words ?? []).slice(0, 16).map((w) => `- word: ${w}`),
    ].join('\n');

    const situationBlock = dto.situationTitle
      ? `Today's situation title: ${dto.situationTitle}
${dto.situationDescription ? `Today's situation story: ${dto.situationDescription}` : ''}`
      : 'No specific situation was provided. Choose a simple everyday scene.';

    const developer = `You are ${this.name}, a conversation partner for Korean adult English learners (CEFR B2–C1).
You stay inside today's situation and speak as a person in that scene (staff, friend, officer, classmate, etc.).
Do not become a classroom lecturer. Do not invent a different situation.

${situationBlock}

Useful language for today:
${vocabLines || '(none)'}

Rules:
- Speak mainly in natural everyday English, the kind people actually use in daily life.
- Sound like a real person in the scene, not a textbook, customer-service script, or classroom model.
- Prefer common spoken words and contractions (I'll, that's, gonna is fine when it fits the role). Avoid stiff or overly formal phrasing unless the role truly needs it.
- Keep replies short: at most 2 short sentences, about 40 words or fewer.
- If you ask a question, make it one short clause. Do not stack questions or explain extra options.
- Do not give long instructions, lists, or extra background.
- If the student uses Korean, reply in simple everyday English and model a natural spoken version in one short line.
- Prefer today's phrases/words when they fit naturally in real conversation.
- If there are no previous real student messages, open the scene: greet the student in character and ask the first question.

Running summary of earlier conversation (may be empty):
${dto.summary?.trim() || '(none)'}

You only see the last 8 messages plus this summary. Treat the summary as earlier context.

Return a JSON object that matches the required schema exactly.
- reply: non-empty English string, short everyday speech (1-2 sentences, one optional short question)
- replyKo: non-empty natural Korean translation of reply, equally short
- issue: JSON null, or one short Korean sentence
- summary: non-empty English running summary, under 120 words
Do not add extra keys. Do not wrap the JSON in markdown.

About "issue" (the student's LAST real message only):
- If the student wrote Korean, set issue to null.
- If this turn is only the scene opening and there is no real student utterance, set issue to null.
- Catch clear English typos / misspellings (e.g. recieve → receive, teh → the, tommorow → tomorrow).
- Also set issue when a foreigner/native listener would likely misunderstand, or the sentence is genuinely broken/nonsensical.
- Be generous with grammar. Small grammar slips, awkward wording, missing articles, mixed tense, or informal chat spellings that people actually use (ok, gonna, wanna, u, idk) are NOT issues by themselves.
- Do NOT nitpick style, politeness, or "more natural" alternatives.
- When issue is needed, write ONE short Korean sentence: the typo or problem, and the correct form (or how it could be misunderstood).
- replyKo is a natural everyday Korean translation of YOUR reply, not of the student's message.
- Each turn, rewrite "summary": merge the previous summary with new facts from the recent messages.
- Keep summary under 120 words. Include who is talking, what has happened, requests, and unresolved points.
- Do not drop important earlier facts just because they are not in the last 8 messages.`;

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
              content:
                "Start the conversation in character. One short greeting and one short question. Keep it under 2 sentences.",
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
