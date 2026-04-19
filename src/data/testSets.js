import { GERMAN_POSSESSIVE_QUIZ } from './germanPossessiveQuiz';
import { GERMAN_POSSESSIVE_TRANSLATION_QUIZ } from './germanPossessiveTranslationQuiz';

export const ENGLISH_KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

export const GERMAN_KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P', 'Ü'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ö', 'Ä'],
  ['Y', 'X', 'C', 'V', 'B', 'N', 'M', 'ß']
];

export const TEST_SETS = [
  {
    id: 'english-quiz-1',
    titleKey: 'testSets.englishQuiz1.title',
    descriptionKey: 'testSets.englishQuiz1.description',
    promptLabelKey: 'gameplay.typePromptPast',
    keyboardRows: ENGLISH_KEYBOARD_ROWS,
    entries: [
      { prompt: 'run', answer: 'ran' },
      { prompt: 'swim', answer: 'swam' },
      { prompt: 'take', answer: 'took' },
      { prompt: 'write', answer: 'wrote' },
      { prompt: 'read', answer: 'read' },
      { prompt: 'make', answer: 'made' },
      { prompt: 'give', answer: 'gave' },
      { prompt: 'drink', answer: 'drank' },
      { prompt: 'go', answer: 'went' },
      { prompt: 'see', answer: 'saw' },
      { prompt: 'eat', answer: 'ate' },
      { prompt: 'ring', answer: 'rang' }
    ]
  },
  {
    id: 'english-quiz-2',
    titleKey: 'testSets.englishQuiz2.title',
    descriptionKey: 'testSets.englishQuiz2.description',
    promptLabelKey: 'gameplay.typePromptPast',
    keyboardRows: ENGLISH_KEYBOARD_ROWS,
    entries: [
      { prompt: 'have', answer: 'had' },
      { prompt: 'buy', answer: 'bought' },
      { prompt: 'spend', answer: 'spent' },
      { prompt: 'sell', answer: 'sold' },
      { prompt: 'break', answer: 'broke' },
      { prompt: 'drive', answer: 'drove' },
      { prompt: 'ride', answer: 'rode' },
      { prompt: 'fly', answer: 'flew' },
      { prompt: 'say', answer: 'said' },
      { prompt: 'sing', answer: 'sang' },
      { prompt: 'meet', answer: 'met' },
      { prompt: 'bring', answer: 'brought' }
    ]
  },
  {
    id: 'english-quiz-3',
    titleKey: 'testSets.englishQuiz3.title',
    descriptionKey: 'testSets.englishQuiz3.description',
    promptLabelKey: 'gameplay.typePromptPast',
    keyboardRows: ENGLISH_KEYBOARD_ROWS,
    entries: [
      { prompt: 'cut', answer: 'cut' },
      { prompt: 'build', answer: 'built' },
      { prompt: 'feel', answer: 'felt' },
      { prompt: 'leave', answer: 'left' },
      { prompt: 'think', answer: 'thought' },
      { prompt: 'catch', answer: 'caught' },
      { prompt: 'tell', answer: 'told' },
      { prompt: 'stand', answer: 'stood' },
      { prompt: 'speak', answer: 'spoke' },
      { prompt: 'wake up', answer: 'woke up' },
      { prompt: 'know', answer: 'knew' },
      { prompt: 'understand', answer: 'understood' }
    ]
  },
  {
    id: 'german-adjectives-1',
    titleKey: 'testSets.germanAdjectives1.title',
    descriptionKey: 'testSets.germanAdjectives1.description',
    promptLabelKey: 'gameplay.typePromptGerman',
    keyboardRows: GERMAN_KEYBOARD_ROWS,
    entries: [
      { prompt: 'milý / příjemný', answer: 'nett' },
      { prompt: 'přátelský', answer: 'freundlich' },
      { prompt: 'zábavný', answer: 'lustig' },
      { prompt: 'ochotný pomoci', answer: 'hilfsbereit' },
      { prompt: 'super / cool', answer: 'cool' },
      { prompt: 'hodný', answer: 'lieb' },
      { prompt: 'sportovní', answer: 'sportlich' },
      { prompt: 'chytrý', answer: 'klug' },
      { prompt: 'klidný', answer: 'ruhig' },
      { prompt: 'aktivní', answer: 'aktiv' },
      { prompt: 'hlučný', answer: 'laut' },
      { prompt: 'tichý', answer: 'leise' },
      { prompt: 'stydlivý', answer: 'schüchtern' },
      { prompt: 'vážný', answer: 'ernst' },
      { prompt: 'zlý', answer: 'gemein' },
      { prompt: 'líný', answer: 'faul' },
      { prompt: 'sobecký', answer: 'egoistisch' },
      { prompt: 'nepřátelský', answer: 'unfreundlich' }
    ]
  },
  {
    id: 'german-possessive-articles-1',
    titleKey: 'testSets.germanPossessiveArticles1.title',
    descriptionKey: 'testSets.germanPossessiveArticles1.description',
    mode: 'worksheet',
    worksheetInstructionKeys: [
      'instructions.worksheetCheck',
      'instructions.worksheetEnding',
      'instructions.worksheetRetry'
    ],
    sections: GERMAN_POSSESSIVE_QUIZ.sections
  },
  {
    id: 'german-possessive-translation-1',
    titleKey: 'testSets.germanPossessiveTranslation1.title',
    descriptionKey: 'testSets.germanPossessiveTranslation1.description',
    mode: 'worksheet',
    worksheetInstructionKeys: [
      'instructions.worksheetCheck',
      'instructions.worksheetTranslate',
      'instructions.worksheetRetry'
    ],
    sections: GERMAN_POSSESSIVE_TRANSLATION_QUIZ.sections
  }
];

export const getTestSetById = (testSetId) => TEST_SETS.find((testSet) => testSet.id === testSetId) ?? null;
