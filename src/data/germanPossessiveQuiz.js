export const GERMAN_POSSESSIVE_QUIZ = {
  sections: [
    {
      id: 'mein-dein-endings',
      title: 'Ergänze -e, wo nötig.',
      description: 'Doplň jen koncovku „e“, pokud je potřeba.',
      type: 'ending',
      items: [
        { stem: 'mein', noun: 'Mutter', answer: 'e' },
        { stem: 'dein', noun: 'Bruder', answer: '' },
        { stem: 'dein', noun: 'Vater', answer: '' },
        { stem: 'dein', noun: 'Oma', answer: 'e' },
        { stem: 'mein', noun: 'Lehrer', answer: '' },
        { stem: 'mein', noun: 'Lehrerin', answer: 'e' },
        { stem: 'dein', noun: 'Tante', answer: 'e' },
        { stem: 'mein', noun: 'Onkel', answer: '' }
      ]
    },
    {
      id: 'ich-du-articles',
      title: 'Ergänze die Possessivartikel. Achte auf die Endungen.',
      description: 'Doplň celý přivlastňovací tvar.',
      type: 'article',
      items: [
        { cue: 'ich', noun: 'Schere', article: 'die', answer: 'meine' },
        { cue: 'ich', noun: 'Auto', article: 'das', answer: 'mein' },
        { cue: 'du', noun: 'Kuli', article: 'der', answer: 'dein' },
        { cue: 'du', noun: 'Tasche', article: 'die', answer: 'deine' },
        { cue: 'ich', noun: 'Bleistift', article: 'der', answer: 'mein' },
        { cue: 'du', noun: 'Tafel', article: 'die', answer: 'deine' },
        { cue: 'du', noun: 'Buch', article: 'das', answer: 'dein' },
        { cue: 'ich', noun: 'Lampe', article: 'die', answer: 'meine' }
      ]
    },
    {
      id: 'sein-ihr-endings',
      title: 'Ergänze -e, wo nötig.',
      description: 'Rozhodni, kdy je potřeba přidat „e“.',
      type: 'ending',
      items: [
        { stem: 'sein', noun: 'Freund', answer: '' },
        { stem: 'sein', noun: 'Schwester', answer: 'e' },
        { stem: 'sein', noun: 'Vater', answer: '' },
        { stem: 'ihr', noun: 'Vater', answer: '' },
        { stem: 'ihr', noun: 'Freundin', answer: 'e' },
        { stem: 'ihr', noun: 'Mutter', answer: 'e' }
      ]
    },
    {
      id: 'er-sie-es-articles',
      title: 'Ergänze die Possessivartikel. Achte auf die Endungen.',
      description: 'Doplň správný tvar podle osoby a rodu podstatného jména.',
      type: 'article',
      items: [
        { cue: 'er', noun: 'Haus', article: 'das', answer: 'sein' },
        { cue: 'sie', noun: 'Fahrrad', article: 'das', answer: 'ihr' },
        { cue: 'Oskar', noun: 'Tisch', article: 'der', answer: 'sein' },
        { cue: 'Frau Meyer', noun: 'Tasche', article: 'die', answer: 'ihre' },
        { cue: 'es', noun: 'Ball', article: 'der', answer: 'sein' },
        { cue: 'der Mann', noun: 'Hund', article: 'der', answer: 'sein' }
      ]
    },
    {
      id: 'ihr-endings',
      title: 'Ergänze -e, wo nötig.',
      description: 'Procvič si tvary „ihr / ihre“.',
      type: 'ending',
      items: [
        { stem: 'ihr', noun: 'Mutter', article: 'die', answer: 'e' },
        { stem: 'ihr', noun: 'Opa', answer: '' },
        { stem: 'ihr', noun: 'Freundin', answer: 'e' },
        { stem: 'ihr', noun: 'Bruder', answer: '' },
        { stem: 'ihr', noun: 'Haus', article: 'das', answer: '' },
        { stem: 'ihr', noun: 'Familie', article: 'die', answer: 'e' },
        { stem: 'ihr', noun: 'Auto', article: 'das', answer: '' },
        { stem: 'ihr', noun: 'Klasse', article: 'die', answer: 'e' },
        { stem: 'ihr', noun: 'Hund', article: 'der', answer: '' },
        { stem: 'ihr', noun: 'Schule', article: 'die', answer: 'e' }
      ]
    },
    {
      id: 'unser-euer-endings',
      title: 'Ergänze -e, wo nötig.',
      description: 'Dávej pozor na rozdíl mezi „unser“ a „euer / eure“.',
      type: 'ending',
      items: [
        { stem: 'eur', noun: 'Mutter', answer: 'e' },
        { stem: 'unser', noun: 'Opa', answer: '' },
        { stem: 'unser', noun: 'Lehrerin', answer: 'e' },
        { stem: 'euer', noun: 'Lehrer', answer: '' },
        { stem: 'eur', noun: 'Freundin', answer: 'e' },
        { stem: 'unser', noun: 'Onkel', answer: '' }
      ]
    },
    {
      id: 'wir-ihr-articles',
      title: 'Ergänze die Possessivartikel. Achte auf die Endungen.',
      description: 'Doplň celý správný přivlastňovací tvar.',
      type: 'article',
      items: [
        { cue: 'wir', noun: 'Wohnung', article: 'die', answer: 'unsere' },
        { cue: 'ihr', noun: 'Haus', article: 'das', answer: 'euer' },
        { cue: 'ihr', noun: 'Garten', article: 'der', answer: 'euer' },
        { cue: 'wir', noun: 'Tür', article: 'die', answer: 'unsere' },
        { cue: 'wir', noun: 'Hund', article: 'der', answer: 'unser' },
        { cue: 'wir', noun: 'Auto', article: 'das', answer: 'unser' },
        { cue: 'ihr', noun: 'Katze', article: 'die', answer: 'eure' },
        { cue: 'ihr', noun: 'Schule', article: 'die', answer: 'eure' }
      ]
    }
  ]
};

export const getGermanPossessiveQuizItemCount = () =>
  GERMAN_POSSESSIVE_QUIZ.sections.reduce((total, section) => total + section.items.length, 0);
