export const AI_NAME = {
  SITUATION_GENERATOR: 'situation_generator',
  ENG_TALKER: 'eng_talker',
} as const;

export type AiName = (typeof AI_NAME)[keyof typeof AI_NAME];
