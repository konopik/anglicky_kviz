const CHOICE_PATTERN = /^(\p{Ll})\/(\p{Lu}\p{L}*)$/u;

const splitTokenEdges = (token) => {
  const match = token.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u);
  return [match?.[1] ?? '', match?.[2] ?? token, match?.[3] ?? ''];
};

export const parseCapitalizationPrompt = (prompt) => {
  const parts = [];
  const tokens = String(prompt).split(/(\s+)/);

  const pushText = (text, type = 'fixed') => {
    if (!text) {
      return;
    }

    const previous = parts.at(-1);
    if (previous?.type === 'fixed' && type === 'fixed') {
      previous.text += text;
      return;
    }

    parts.push({ type, text });
  };

  tokens.forEach((token) => {
    if (!token) {
      return;
    }

    if (/^\s+$/.test(token)) {
      pushText(token);
      return;
    }

    const [leading, core, trailing] = splitTokenEdges(token);
    const match = core.match(CHOICE_PATTERN);

    if (!match) {
      pushText(token);
      return;
    }

    const [, lowerLetter, upperWord] = match;
    const upperLetter = Array.from(upperWord)[0];

    if (lowerLetter.toLocaleLowerCase('cs-CZ') !== upperLetter.toLocaleLowerCase('cs-CZ')) {
      throw new Error(`Capitalization choice letters do not match: ${token}`);
    }

    pushText(leading);
    parts.push({
      type: 'choice',
      lowerLetter,
      upperLetter,
      rest: Array.from(upperWord).slice(1).join('')
    });
    pushText(trailing);
  });

  return parts;
};

export const buildPhraseFromChoices = (parts, decisions) => parts.map((part) => {
  if (part.type === 'fixed') {
    return part.text;
  }

  const decision = decisions[part.choiceIndex];
  const letter = decision === 'upper' ? part.upperLetter : part.lowerLetter;
  return `${letter}${part.rest}`;
}).join('');

export const prepareCapitalizationEntry = (entry) => {
  if (Array.isArray(entry.answer)) {
    throw new Error(`Capitalization answer must be a single string for item ${entry.id}`);
  }

  let choiceIndex = 0;
  const parts = parseCapitalizationPrompt(entry.prompt).map((part) => {
    if (part.type !== 'choice') {
      return part;
    }

    const nextPart = { ...part, choiceIndex };
    choiceIndex += 1;
    return nextPart;
  });
  const correctDecisions = [];
  const answerCharacters = Array.from(entry.answer);
  let answerOffset = 0;

  parts.forEach((part) => {
    if (part.type === 'fixed') {
      const fixedText = answerCharacters.slice(answerOffset, answerOffset + Array.from(part.text).length).join('');

      if (fixedText !== part.text) {
        throw new Error(`Fixed prompt text does not match the answer for item ${entry.id}`);
      }

      answerOffset += Array.from(part.text).length;
      return;
    }

    const expectedLength = 1 + Array.from(part.rest).length;
    const answerSlice = answerCharacters.slice(answerOffset, answerOffset + expectedLength).join('');
    const answerLetter = Array.from(answerSlice)[0] ?? '';
    const answerRest = Array.from(answerSlice).slice(1).join('');

    if (answerRest !== part.rest) {
      throw new Error(`Choice remainder does not match the answer for item ${entry.id}`);
    }

    if (answerLetter === part.upperLetter) {
      correctDecisions[part.choiceIndex] = 'upper';
    } else if (answerLetter === part.lowerLetter) {
      correctDecisions[part.choiceIndex] = 'lower';
    } else {
      throw new Error(`Answer letter is not one of the prompt choices for item ${entry.id}`);
    }

    answerOffset += expectedLength;
  });

  if (answerOffset !== answerCharacters.length) {
    throw new Error(`Answer has unused characters for item ${entry.id}`);
  }

  return {
    ...entry,
    parts,
    choiceCount: choiceIndex,
    correctDecisions
  };
};

export const getCapitalizationResult = (preparedEntry, decisions) => {
  const wrongChoiceIndexes = preparedEntry.correctDecisions.flatMap((correctDecision, index) => (
    decisions[index] === correctDecision ? [] : [index]
  ));

  return {
    learnerPhrase: buildPhraseFromChoices(preparedEntry.parts, decisions),
    correctPhrase: preparedEntry.answer,
    wrongChoiceIndexes,
    mistakeCount: wrongChoiceIndexes.length
  };
};

export const scoreCapitalizationAttempt = ({ mistakeCount, isRetry }) => {
  if (mistakeCount === 0) {
    return {
      symbolType: 'perfect',
      points: isRetry ? 0 : 3
    };
  }

  if (mistakeCount === 1) {
    return {
      symbolType: 'incorrect',
      points: isRetry ? 0 : 1
    };
  }

  return {
    symbolType: 'hintUsed',
    points: 0
  };
};

export const shuffleCapitalizationEntries = (entries, random = Math.random) => {
  const shuffled = entries.map((entry) => ({ entry, isRetry: false }));

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
};

export const insertCapitalizationRetry = (remainingQueue, entry, random = Math.random) => {
  const nextQueue = [...remainingQueue];
  const retryEntry = { entry, isRetry: true };
  const minDelay = 2;

  if (nextQueue.length <= minDelay) {
    nextQueue.push(retryEntry);
    return nextQueue;
  }

  const insertPosition = minDelay + Math.floor(random() * (nextQueue.length - minDelay + 1));
  nextQueue.splice(insertPosition, 0, retryEntry);
  return nextQueue;
};
