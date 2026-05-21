import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCircle, House, RotateCcw, Star, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CanvasKeyboard, { SUBMIT_KEY } from './CanvasKeyboard';

const MISTAKES_FOR_HINT = 3;
const RETRY_DELAY_MS = 600;
const STAGE_TRANSITION_DELAY_MS = 450;
const DEFAULT_WORD_COUNT = 10;
const DEFAULT_SKIP_COUNT = 2;

const normalizeAnswerText = (text) => Array.from(text ?? '').map((character) => {
  if (character === 'ß') {
    return 'ß';
  }

  return character.toLocaleUpperCase('en-US');
}).join('');

const shuffleEntries = (entries) => {
  const shuffled = [...entries];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
};

const createQueueItems = (entries) => entries.map((entry) => ({ entry, isRetry: false }));

const clampNumber = (value, min, max) => Math.min(Math.max(value, min), max);

const getMaxSkipCount = (wordCount, totalEntries) => Math.min(
  Math.floor(wordCount * 0.3),
  Math.max(0, totalEntries - wordCount)
);

const getDefaultWordCount = (totalEntries) => Math.min(DEFAULT_WORD_COUNT, totalEntries);

const getAcceptedAnswers = (stage) => {
  if (!stage) {
    return [];
  }

  const rawAnswers = Array.isArray(stage.answer) ? stage.answer : [stage.answer];
  return rawAnswers.map((answer) => normalizeAnswerText(answer));
};

const getMatchingAnswers = (acceptedAnswers, typedValue) => (
  acceptedAnswers.filter((answer) => answer.startsWith(typedValue))
);

const getSharedNextLetter = (matchingAnswers, typedValue) => {
  if (matchingAnswers.length === 0) {
    return null;
  }

  let nextLetter = null;
  let hasCompleteAnswer = false;

  for (const answer of matchingAnswers) {
    if (answer.length === typedValue.length) {
      hasCompleteAnswer = true;
      continue;
    }

    const candidateNextLetter = answer[typedValue.length];
    if (!candidateNextLetter) {
      return null;
    }

    if (nextLetter === null) {
      nextLetter = candidateNextLetter;
      continue;
    }

    if (nextLetter !== candidateNextLetter) {
      return null;
    }
  }

  if (hasCompleteAnswer) {
    return null;
  }

  return nextLetter;
};

const getDisplayToken = (token) => (token === SUBMIT_KEY ? '✓' : token);

export default function EnglishIrregularSelectedQuiz({ testSet, onHome, onRestart }) {
  const { t } = useTranslation();
  const defaultWordCount = getDefaultWordCount(testSet.entries.length);
  const defaultSkipCount = Math.min(DEFAULT_SKIP_COUNT, getMaxSkipCount(defaultWordCount, testSet.entries.length));
  const [setupWordCount, setSetupWordCount] = useState(defaultWordCount);
  const [setupSkipCount, setSetupSkipCount] = useState(defaultSkipCount);
  const [hasStarted, setHasStarted] = useState(false);
  const [queue, setQueue] = useState([]);
  const [replacementEntries, setReplacementEntries] = useState([]);
  const [skipsRemaining, setSkipsRemaining] = useState(defaultSkipCount);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [typedValue, setTypedValue] = useState('');
  const [mistakesOnStage, setMistakesOnStage] = useState(0);
  const [wrongLetters, setWrongLetters] = useState(new Set());
  const [hintedLetter, setHintedLetter] = useState(null);
  const [currentVerbIsPerfect, setCurrentVerbIsPerfect] = useState(true);
  const [currentVerbUsedHint, setCurrentVerbUsedHint] = useState(false);
  const [positionStatuses, setPositionStatuses] = useState([]);
  const [scoreSequence, setScoreSequence] = useState([]);
  const [totalScore, setTotalScore] = useState(0);
  const [isInputLocked, setIsInputLocked] = useState(false);
  const [wrongAttemptValue, setWrongAttemptValue] = useState(null);
  const [showSubmitFeedback, setShowSubmitFeedback] = useState(false);
  const [finished, setFinished] = useState(false);
  const [errorEntries, setErrorEntries] = useState([]);

  const audioContextRef = useRef(null);
  const transitionTimeoutRef = useRef(null);

  const currentQueueItem = queue[0] ?? null;
  const currentEntry = currentQueueItem?.entry ?? null;
  const currentStage = currentEntry?.stages?.[currentStageIndex] ?? null;
  const acceptedAnswers = useMemo(() => getAcceptedAnswers(currentStage), [currentStage]);
  const matchingAnswers = useMemo(() => getMatchingAnswers(acceptedAnswers, typedValue), [acceptedAnswers, typedValue]);
  const isStageComplete = acceptedAnswers.includes(typedValue);
  const sharedNextLetter = useMemo(() => getSharedNextLetter(matchingAnswers, typedValue), [matchingAnswers, typedValue]);
  const expectedLetter = isInputLocked ? null : (hintedLetter ?? sharedNextLetter);
  const isWordComplete = isInputLocked || finished;
  const currentPromptLabelKey = currentStage?.promptLabelKey ?? 'gameplay.typePromptSimplePast';
  const currentKeyboardRows = testSet.keyboardRows;
  const totalWordsRemaining = queue.length;
  const maxSetupSkipCount = getMaxSkipCount(setupWordCount, testSet.entries.length);
  const canSkipCurrentWord = skipsRemaining > 0 && replacementEntries.length > 0 && currentQueueItem && !currentQueueItem.isRetry && !isInputLocked;

  useEffect(() => () => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
  }, []);

  const resetStageState = () => {
    setTypedValue('');
    setMistakesOnStage(0);
    setWrongLetters(new Set());
    setHintedLetter(null);
    setWrongAttemptValue(null);
    setShowSubmitFeedback(false);
    setPositionStatuses([]);
    setIsInputLocked(false);
  };

  const startConfiguredQuiz = () => {
    const wordCount = clampNumber(Number(setupWordCount) || defaultWordCount, 1, testSet.entries.length);
    const maxSkipCount = getMaxSkipCount(wordCount, testSet.entries.length);
    const skipCount = clampNumber(Number(setupSkipCount) || 0, 0, maxSkipCount);
    const randomizedEntries = shuffleEntries(testSet.entries);
    const selectedEntries = randomizedEntries.slice(0, wordCount);
    const availableReplacements = randomizedEntries.slice(wordCount);

    setSetupWordCount(wordCount);
    setSetupSkipCount(skipCount);
    setQueue(createQueueItems(selectedEntries));
    setReplacementEntries(availableReplacements);
    setSkipsRemaining(skipCount);
    setCurrentStageIndex(0);
    setScoreSequence([]);
    setTotalScore(0);
    setCurrentVerbIsPerfect(true);
    setCurrentVerbUsedHint(false);
    setFinished(false);
    setErrorEntries([]);
    resetStageState();
    setHasStarted(true);
  };

  const playErrorSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 300;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      console.log('Audio not available');
    }
  };

  const goToNextVerb = (entryToRepeat = null) => {
    let newQueue = queue.slice(1);

    if (entryToRepeat) {
      const retryEntry = { entry: entryToRepeat, isRetry: true };
      const minDelay = 2;

      if (newQueue.length <= minDelay) {
        newQueue.push(retryEntry);
      } else {
        const insertPosition = minDelay + Math.floor(Math.random() * (newQueue.length - minDelay + 1));
        newQueue.splice(insertPosition, 0, retryEntry);
      }
    }

    if (newQueue.length === 0) {
      setQueue([]);
      setCurrentStageIndex(0);
      setFinished(true);
      setIsInputLocked(true);
      return;
    }

    setQueue(newQueue);
    setCurrentStageIndex(0);
    setCurrentVerbIsPerfect(true);
    setCurrentVerbUsedHint(false);
    resetStageState();
  };

  const registerErrorEntry = (entry) => {
    setErrorEntries((previous) => (
      previous.some((item) => item.prompt === entry.prompt)
        ? previous
        : [...previous, entry]
    ));
  };

  const registerCorrectLetter = (letter, { fromHint = false } = {}) => {
    if (!currentEntry || !currentStage || isInputLocked) {
      return;
    }

    const normalizedLetter = normalizeAnswerText(letter);
    const nextValue = `${typedValue}${normalizedLetter}`;
    const nextMatchingAnswers = getMatchingAnswers(acceptedAnswers, nextValue);

    if (nextMatchingAnswers.length === 0) {
      const newMistakes = mistakesOnStage + 1;
      setWrongAttemptValue(normalizedLetter);
      setMistakesOnStage(newMistakes);
      setCurrentVerbIsPerfect(false);

      if (!wrongLetters.has(normalizedLetter)) {
        playErrorSound();
        const nextWrongLetters = new Set(wrongLetters);
        nextWrongLetters.add(normalizedLetter);
        setWrongLetters(nextWrongLetters);
      }

      if (newMistakes >= MISTAKES_FOR_HINT) {
        const nextHint = getSharedNextLetter(matchingAnswers, typedValue);
        setHintedLetter(nextHint);
      }

      return;
    }

    const usedHintThisTurn = fromHint || hintedLetter !== null;
    const wasImperfectBeforeThisLetter = mistakesOnStage > 0 || wrongLetters.size > 0;
    const positionStatus = usedHintThisTurn
      ? 'hint'
      : wasImperfectBeforeThisLetter
        ? 'mistake'
        : 'perfect';

    setTypedValue(nextValue);
    setMistakesOnStage(0);
    setWrongLetters(new Set());
    setHintedLetter(null);
    setWrongAttemptValue(null);
    setPositionStatuses((previous) => [...previous, positionStatus]);

    if (usedHintThisTurn) {
      setCurrentVerbIsPerfect(false);
      setCurrentVerbUsedHint(true);
    } else if (wasImperfectBeforeThisLetter) {
      setCurrentVerbIsPerfect(false);
    }
  };

  const handleLetterClick = (letter) => {
    if (letter === SUBMIT_KEY) {
      if (isInputLocked || !currentEntry || !currentStage) {
        return;
      }

      if (!isStageComplete) {
        return;
      }

      setShowSubmitFeedback(true);
      setIsInputLocked(true);
      const isLastStage = currentStageIndex >= currentEntry.stages.length - 1;

      if (!isLastStage) {
        transitionTimeoutRef.current = setTimeout(() => {
          setCurrentStageIndex((current) => current + 1);
          resetStageState();
        }, STAGE_TRANSITION_DELAY_MS);
        return;
      }

      const hintWasUsed = currentVerbUsedHint;
      const wasPerfect = currentVerbIsPerfect && !hintWasUsed;
      let symbolType = 'perfect';
      let points = 0;

      if (currentQueueItem?.isRetry) {
        if (hintWasUsed) {
          symbolType = 'hintUsed';
        } else if (!currentVerbIsPerfect) {
          symbolType = 'incorrect';
        } else {
          symbolType = 'perfect';
        }
        points = 0;
      } else if (hintWasUsed) {
        symbolType = 'hintUsed';
        points = 0;
      } else if (!currentVerbIsPerfect) {
        symbolType = 'incorrect';
        points = 1;
      } else {
        symbolType = 'perfect';
        points = 3;
      }

      setScoreSequence((previous) => [...previous, symbolType]);
      setTotalScore((previous) => previous + points);

      if (!wasPerfect) {
        registerErrorEntry(currentEntry);
      }

      transitionTimeoutRef.current = setTimeout(() => {
        goToNextVerb(wasPerfect ? null : currentEntry);
      }, RETRY_DELAY_MS);
      return;
    }

    registerCorrectLetter(letter);
  };

  const handleSkipWord = () => {
    if (!canSkipCurrentWord) {
      return;
    }

    const [replacementEntry, ...remainingReplacements] = replacementEntries;
    const nextQueue = [...queue.slice(1), { entry: replacementEntry, isRetry: false }];
    const currentWordHasError = !currentVerbIsPerfect || currentVerbUsedHint || mistakesOnStage > 0 || wrongLetters.size > 0;

    if (currentWordHasError) {
      registerErrorEntry(currentEntry);
    }

    setReplacementEntries(remainingReplacements);
    setSkipsRemaining((current) => current - 1);
    setCurrentStageIndex(0);
    setCurrentVerbIsPerfect(true);
    setCurrentVerbUsedHint(false);
    setQueue(nextQueue);
    resetStageState();
  };

  const handleHintedLetterClick = () => {
    if (hintedLetter === null || !currentEntry || !currentStage || isInputLocked) {
      return;
    }

    registerCorrectLetter(hintedLetter, { fromHint: true });
  };

  const handleRestart = () => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    onRestart();
  };

  const handleSetupWordCountChange = (event) => {
    const nextWordCount = clampNumber(Number(event.target.value) || 1, 1, testSet.entries.length);
    const nextMaxSkipCount = getMaxSkipCount(nextWordCount, testSet.entries.length);

    setSetupWordCount(nextWordCount);
    setSetupSkipCount((current) => clampNumber(current, 0, nextMaxSkipCount));
  };

  const handleSetupSkipCountChange = (event) => {
    setSetupSkipCount(clampNumber(Number(event.target.value) || 0, 0, maxSetupSkipCount));
  };

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
        <div className="max-w-xl w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 space-y-6 border border-slate-100 dark:border-slate-700">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">{t(testSet.titleKey)}</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{t('irregularSetup.title')}</h1>
            </div>
            <button
              onClick={onHome}
              type="button"
              aria-label={t('app.homeButton')}
              title={t('app.homeButton')}
              className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-100 text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-600 hover:shadow-md dark:border-slate-600 dark:from-slate-700 dark:to-slate-800 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-300"
            >
              <House className="h-5 w-5 transition-transform group-hover:scale-110" />
            </button>
          </div>

          <div className="grid gap-4">
            <label className="block rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('irregularSetup.wordCountLabel')}</span>
              <input
                type="number"
                min="1"
                max={testSet.entries.length}
                value={setupWordCount}
                onChange={handleSetupWordCountChange}
                className="mt-3 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-lg font-bold text-slate-900 dark:text-white outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
              />
              <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400">
                {t('irregularSetup.wordCountHelp', { max: testSet.entries.length })}
              </span>
            </label>

            <label className="block rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('irregularSetup.skipCountLabel')}</span>
              <input
                type="number"
                min="0"
                max={maxSetupSkipCount}
                value={setupSkipCount}
                onChange={handleSetupSkipCountChange}
                className="mt-3 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-lg font-bold text-slate-900 dark:text-white outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
              />
              <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400">
                {t('irregularSetup.skipCountHelp', { max: maxSetupSkipCount })}
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={startConfiguredQuiz}
            className="w-full bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <CheckCircle className="w-5 h-5" />
            {t('irregularSetup.startButton')}
          </button>
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
        <div className="max-w-xl w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center space-y-6 border border-slate-100 dark:border-slate-700">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 w-28 h-28 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-14 h-14 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">{t(testSet.titleKey)}</p>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('app.finishedTitle')}</h1>
            <p className="text-slate-600 dark:text-slate-300">{t('app.finishedMessage')}</p>
          </div>

          <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">{t('gameplay.totalPoints')}</p>
            <p className="mt-2 text-3xl font-bold text-blue-700 dark:text-blue-300">{totalScore}</p>
          </div>

          <div className="bg-white dark:bg-slate-700/30 rounded-xl p-4 border border-slate-100 dark:border-slate-600 mb-4">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">{t('symbols.sequence')}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {scoreSequence.length === 0 ? (
                <span className="text-slate-400 dark:text-slate-500 italic">{t('gameplay.emptySequence')}</span>
              ) : (
                scoreSequence.map((symbol, idx) => (
                  <div key={idx} className="flex items-center justify-center w-8 h-8">
                    {symbol === 'perfect' ? (
                      <Star className="w-6 h-6 text-yellow-500 dark:text-yellow-400 fill-current" />
                    ) : symbol === 'incorrect' ? (
                      <span className="block h-4 w-4 rounded-full bg-slate-400 dark:bg-slate-500" />
                    ) : symbol === 'hintUsed' ? (
                      <span className="block h-4 w-4 rounded-full bg-red-500 dark:bg-red-400" />
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('irregularSetup.errorWordsTitle')}</p>
            {errorEntries.length === 0 ? (
              <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{t('irregularSetup.noErrorWords')}</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {errorEntries.map((entry) => (
                  <span
                    key={entry.prompt}
                    className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300"
                  >
                    {entry.prompt}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleRestart}
              className="flex-1 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <RotateCcw className="w-5 h-5" />
              {t('app.playAgainButton')}
            </button>
            <button
              type="button"
              onClick={onHome}
              className="flex-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold py-4 px-6 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <House className="w-5 h-5" />
              {t('app.homeButton')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentEntry || !currentStage) {
    return null;
  }

  const displayedTypedLetters = Array.from(typedValue);
  let trailingBoxClass = 'bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600';

  if (wrongAttemptValue) {
    trailingBoxClass = 'bg-red-100 dark:bg-red-900/50 border-red-400 text-red-700 dark:text-red-300';
  } else if (showSubmitFeedback) {
    trailingBoxClass = 'bg-green-100 dark:bg-green-900/50 border-green-400 text-green-700 dark:text-green-300';
  } else if (hintedLetter) {
    trailingBoxClass = 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 text-yellow-700 dark:text-yellow-300 cursor-pointer hover:bg-yellow-200 dark:hover:bg-yellow-900/50';
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-800 px-4 md:px-6 py-3 shadow-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 transition-colors duration-300">
        <div className="flex items-start justify-between gap-3 sm:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="hidden md:flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('testSets.currentLabel')}</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t(testSet.titleKey)}</span>
            </div>
            <div className="grid min-w-0 grid-cols-[max-content_max-content_minmax(0,1fr)] items-start gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:items-center sm:gap-6">
              <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 sm:text-sm sm:normal-case sm:tracking-normal">{t('gameplay.words')}</span>
                <span className="text-base font-bold text-blue-600 dark:text-blue-400 sm:text-lg">{totalWordsRemaining}</span>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 sm:text-sm sm:normal-case sm:tracking-normal">{t('gameplay.points')}</span>
                <span className="text-base font-bold text-blue-600 dark:text-blue-400 sm:text-lg">{totalScore}</span>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 sm:text-sm sm:normal-case sm:tracking-normal">{t('irregularSetup.skips')}</span>
                <span className="text-base font-bold text-blue-600 dark:text-blue-400 sm:text-lg">{skipsRemaining}</span>
              </div>
              <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3 sm:justify-self-start">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 sm:text-sm sm:normal-case sm:tracking-normal">{t('gameplay.symbols')}</span>
                <div className="flex min-w-0 flex-wrap gap-1 sm:max-w-none">
                  {scoreSequence.map((symbol, idx) => (
                    <div key={idx} className="flex h-5 w-5 shrink-0 items-center justify-center sm:h-6 sm:w-6">
                      {symbol === 'perfect' ? (
                        <Star className="h-[1.125rem] w-[1.125rem] fill-current text-yellow-500 dark:text-yellow-400 sm:h-5 sm:w-5" />
                      ) : symbol === 'incorrect' ? (
                        <span className="block h-3 w-3 rounded-full bg-slate-400 dark:bg-slate-500 sm:h-3.5 sm:w-3.5" />
                      ) : symbol === 'hintUsed' ? (
                        <span className="block h-3 w-3 rounded-full bg-red-500 dark:bg-red-400 sm:h-3.5 sm:w-3.5" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleSkipWord}
              disabled={!canSkipCurrentWord}
              aria-label={t('irregularSetup.skipButton')}
              title={t('irregularSetup.skipButton')}
              className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-100 text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-600 dark:from-slate-700 dark:to-slate-800 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-300"
            >
              <span className="flex items-center -space-x-1 transition-transform group-hover:scale-110" aria-hidden="true">
                <Play className="h-4 w-4 fill-current stroke-[2.5]" />
                <Play className="h-4 w-4 fill-current stroke-[2.5]" />
              </span>
            </button>
            <button
              onClick={onHome}
              type="button"
              aria-label={t('app.homeButton')}
              title={t('app.homeButton')}
              className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-100 text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-600 hover:shadow-md dark:border-slate-600 dark:from-slate-700 dark:to-slate-800 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-300"
            >
              <House className="h-5 w-5 transition-transform group-hover:scale-110" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 pt-3 pb-4 md:px-6 md:pt-4 md:pb-6 flex flex-col justify-start">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 md:p-10 mb-4 transition-colors duration-300 text-center">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            {t(currentPromptLabelKey)}
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-blue-600 dark:text-blue-400 mb-6 break-words">
            {currentEntry.prompt}
          </h2>

          <div className="mb-8 flex flex-wrap justify-center items-center gap-1.5 md:gap-2.5">
            {displayedTypedLetters.map((letter, idx) => {
              let letterClass = 'bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100';

              if (positionStatuses[idx] === 'perfect') {
                letterClass = 'bg-green-100 dark:bg-green-900/50 border-green-400 text-green-700 dark:text-green-300';
              } else if (positionStatuses[idx] === 'mistake') {
                letterClass = 'bg-orange-100 dark:bg-orange-900/50 border-orange-400 text-orange-700 dark:text-orange-300';
              } else if (positionStatuses[idx] === 'hint') {
                letterClass = 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 text-yellow-700 dark:text-yellow-300';
              }

              return (
                <div
                  key={`typed-${idx}`}
                  className={`flex h-[2.75rem] w-[2.75rem] items-center justify-center rounded-lg border-2 text-base font-bold transition-all md:h-[3.1rem] md:w-[3.1rem] md:text-lg ${letterClass}`}
                >
                  {getDisplayToken(letter)}
                </div>
              );
            })}
            <div
              className={`flex h-[2.75rem] w-[2.75rem] items-center justify-center rounded-lg border-2 text-base font-bold transition-all md:h-[3.1rem] md:w-[3.1rem] md:text-lg ${trailingBoxClass}`}
              onClick={() => hintedLetter && handleHintedLetterClick()}
            >
              {wrongAttemptValue ? (
                getDisplayToken(wrongAttemptValue)
              ) : hintedLetter ? (
                getDisplayToken(hintedLetter)
              ) : showSubmitFeedback ? (
                <Check className="h-5 w-5 stroke-[3.25] text-slate-500 dark:text-slate-300" aria-hidden="true" />
              ) : ''}
            </div>
          </div>

          {hintedLetter && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-semibold mb-4">
              {t('gameplay.hintMessage')}
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-2 sm:p-4 md:p-8 transition-colors duration-300 mb-4">
          <CanvasKeyboard
            qwertyRows={currentKeyboardRows}
            typedLetters={Array.from(typedValue)}
            wrongLetters={wrongLetters}
            hintedLetter={hintedLetter}
            isWordComplete={isWordComplete}
            onLetterClick={handleLetterClick}
            expectedLetter={expectedLetter}
            showSubmitKey
            submitAriaLabel={t('gameplay.submitAnswer')}
            className="p-0 shadow-none border-none"
          />
        </div>
      </main>
    </div>
  );
}
