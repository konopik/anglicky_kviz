export const GERMAN_POSSESSIVE_TRANSLATION_QUIZ = {
  sections: [
    {
      id: 'translation-to-czech',
      title: 'Přelož do češtiny.',
      description: 'Napiš český překlad pro každý německý výraz.',
      answerLocale: 'cs-CZ',
      type: 'article',
      items: [
        { prompt: 'ihr Hobby', answer: ['její hobby', 'její koníček'] },
        { prompt: 'sein Hobby', answer: ['jeho hobby', 'jeho koníček'] },
        { prompt: 'seine Freundin', answer: ['jeho kamarádka', 'jeho přítelkyně'] },
        { prompt: 'ihre Lieblingsfarbe', answer: 'její oblíbená barva' },
        { prompt: 'unser Hobby', answer: ['naše hobby', 'náš koníček'] },
        { prompt: 'unsere Schule', answer: 'naše škola' },
        { prompt: 'euer Hobby', answer: ['vaše hobby', 'váš koníček'] },
        { prompt: 'eure Oma', answer: 'vaše babička' }
      ]
    },
    {
      id: 'translation-to-german-a',
      title: 'Übersetze ins Deutsche.',
      description: 'Napiš německý překlad pro každý český výraz.',
      type: 'article',
      items: [
        { prompt: 'moje maminka', answer: ['meine Mutter', 'meine Mama', 'meine Mutti'] },
        { prompt: 'jeho maminka', answer: ['seine Mutter', 'seine Mama', 'seine Mutti'] },
        { prompt: 'naše sestra', answer: 'unsere Schwester' },
        { prompt: 'její sestra', answer: 'ihre Schwester' },
        { prompt: 'můj bratr', answer: 'mein Bruder' },
        { prompt: 'tvůj bratr', answer: 'dein Bruder' },
        { prompt: 'vaše dítě', answer: 'euer Kind' }
      ]
    },
    {
      id: 'translation-to-german-b',
      title: 'Übersetze ins Deutsche.',
      description: 'Dokonči druhou polovinu překladu do němčiny.',
      type: 'article',
      items: [
        { prompt: 'naše dítě', answer: 'unser Kind' },
        { prompt: 'její miminko', answer: ['ihr Baby', 'ihr Kind'] },
        { prompt: 'jeho koníček', answer: 'sein Hobby' },
        { prompt: 'můj den', answer: 'mein Tag' },
        { prompt: 'náš den', answer: 'unser Tag' },
        { prompt: 'její kytara', answer: 'ihre Gitarre' }
      ]
    }
  ]
};
