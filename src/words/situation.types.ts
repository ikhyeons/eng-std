export interface SituationWord {
  id: number;
  english: string;
  korean: string;
  category: string;
  example: string;
  exampleKo: string;
}

export interface SituationPhrase {
  id: number;
  english: string;
  korean: string;
  example: string;
  exampleKo: string;
}

export interface Situation {
  id: number;
  date: string;
  title: string;
  description: string;
  words: SituationWord[];
  phrases: SituationPhrase[];
}
