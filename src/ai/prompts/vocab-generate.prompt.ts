export function buildVocabUserPrompt(
  situationText: string,
  date: string,
): string {
  return `Create today's vocabulary and phrases for this situation.

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
}
