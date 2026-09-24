import React, { useMemo, useState } from 'react';
import { CheckCircle, House, RotateCcw, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  getCapitalizationResult,
  insertCapitalizationRetry,
  prepareCapitalizationEntry,
  scoreCapitalizationAttempt,
  shuffleCapitalizationEntries
} from '../data/czechCapitalizationLogic';

const renderPhrase = (parts, { decisions, activeChoiceIndex, wrongChoiceIndexes = null }) => (
  parts.map((part, index) => {
    if (part.type === 'fixed') {
      return <span key={`fixed-${index}`}>{part.text}</span>;
    }

    const decision = decisions[part.choiceIndex];
    const isResolved = decision === 'lower' || decision === 'upper';
    const isCurrent = wrongChoiceIndexes === null && part.choiceIndex === activeChoiceIndex;
    const isWrong = wrongChoiceIndexes?.includes(part.choiceIndex) ?? false;
    const letter = isResolved
      ? (decision === 'upper' ? part.upperLetter : part.lowerLetter)
      : part.lowerLetter;
    let letterClass = 'text-slate-400 dark:text-slate-500';

    if (isWrong) {
      letterClass = 'rounded-md bg-red-100 px-1 text-red-700 dark:bg-red-900/50 dark:text-red-300';
    } else if (isCurrent) {
      letterClass = 'rounded-md bg-blue-100 px-1 text-blue-700 underline decoration-2 underline-offset-4 dark:bg-blue-900/40 dark:text-blue-300';
    } else if (isResolved) {
      letterClass = 'text-slate-900 dark:text-white';
    }

    return (
      <span key={`choice-${part.choiceIndex}`}>
        <span className={`font-black ${letterClass}`}>{letter}</span>
        <span className={isResolved || isCurrent ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}>
          {part.rest}
        </span>
      </span>
    );
  })
);

export default function CzechCapitalizationQuiz({ testSet, onHome, onRestart }) {
  const { t } = useTranslation();
  const preparedEntries = useMemo(
    () => new Map(testSet.entries.map((entry) => [entry.id, prepareCapitalizationEntry(entry)])),
    [testSet]
  );
  const [queue, setQueue] = useState(() => shuffleCapitalizationEntries(testSet.entries));
  const [activeChoiceIndex, setActiveChoiceIndex] = useState(0);
  const [decisions, setDecisions] = useState([]);
  const [review, setReview] = useState(null);
  const [scoreSequence, setScoreSequence] = useState([]);
  const [totalScore, setTotalScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [mistakeEntries, setMistakeEntries] = useState([]);

  const currentQueueItem = queue[0] ?? null;
  const currentEntry = currentQueueItem?.entry ?? null;
  const preparedEntry = currentEntry ? preparedEntries.get(currentEntry.id) : null;

  const resetPhraseState = () => {
    setActiveChoiceIndex(0);
    setDecisions([]);
    setReview(null);
  };

  const registerMistakeEntry = (entry) => {
    setMistakeEntries((previous) => (
      previous.some((item) => item.id === entry.id) ? previous : [...previous, entry]
    ));
  };

  const handleChoice = (decision) => {
    if (!preparedEntry || review) {
      return;
    }

    const nextDecisions = [...decisions];
    nextDecisions[activeChoiceIndex] = decision;

    if (activeChoiceIndex < preparedEntry.choiceCount - 1) {
      setDecisions(nextDecisions);
      setActiveChoiceIndex((current) => current + 1);
      return;
    }

    const result = getCapitalizationResult(preparedEntry, nextDecisions);
    const scoring = scoreCapitalizationAttempt({
      mistakeCount: result.mistakeCount,
      isRetry: currentQueueItem.isRetry
    });

    setDecisions(nextDecisions);
    setReview({ ...result, ...scoring });
    setScoreSequence((previous) => [...previous, scoring.symbolType]);
    setTotalScore((previous) => previous + scoring.points);

    if (result.mistakeCount > 0) {
      registerMistakeEntry(currentEntry);
    }
  };

  const handleContinue = () => {
    if (!currentEntry || !review) {
      return;
    }

    const nextQueue = review.mistakeCount > 0
      ? insertCapitalizationRetry(queue.slice(1), currentEntry)
      : queue.slice(1);

    if (nextQueue.length === 0) {
      setQueue([]);
      setFinished(true);
      resetPhraseState();
      return;
    }

    setQueue(nextQueue);
    resetPhraseState();
  };

  const renderBadge = (symbol, index, size = 'header') => {
    const isHeader = size === 'header';

    return (
      <div
        key={`${symbol}-${index}`}
        className={isHeader
          ? 'flex h-5 w-5 shrink-0 items-center justify-center sm:h-6 sm:w-6'
          : 'flex h-8 w-8 items-center justify-center'}
      >
        {symbol === 'perfect' ? (
          <Star className={isHeader
            ? 'h-[1.125rem] w-[1.125rem] fill-current text-yellow-500 dark:text-yellow-400 sm:h-5 sm:w-5'
            : 'h-6 w-6 fill-current text-yellow-500 dark:text-yellow-400'}
          />
        ) : symbol === 'incorrect' ? (
          <span className={isHeader
            ? 'block h-3 w-3 rounded-full bg-slate-400 dark:bg-slate-500 sm:h-3.5 sm:w-3.5'
            : 'block h-4 w-4 rounded-full bg-slate-400 dark:bg-slate-500'}
          />
        ) : symbol === 'hintUsed' ? (
          <span className={isHeader
            ? 'block h-3 w-3 rounded-full bg-red-500 dark:bg-red-400 sm:h-3.5 sm:w-3.5'
            : 'block h-4 w-4 rounded-full bg-red-500 dark:bg-red-400'}
          />
        ) : null}
      </div>
    );
  };

  if (finished) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-800 dark:text-slate-100">
        <div className="max-w-xl w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center space-y-6 border border-slate-100 dark:border-slate-700">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 w-28 h-28 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-14 h-14 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">{t(testSet.titleKey)}</p>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('app.finishedTitle')}</h1>
            <p className="text-slate-600 dark:text-slate-300">{t('capitalization.finishedMessage')}</p>
          </div>

          <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">{t('gameplay.totalPoints')}</p>
            <p className="mt-2 text-3xl font-bold text-blue-700 dark:text-blue-300">{totalScore}</p>
          </div>

          <div className="rounded-xl border border-slate-100 dark:border-slate-600 bg-white dark:bg-slate-700/30 p-4">
            <p className="mb-3 text-sm font-semibold uppercase text-slate-500 dark:text-slate-400">{t('symbols.sequence')}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {scoreSequence.length === 0 ? (
                <span className="italic text-slate-400 dark:text-slate-500">{t('gameplay.emptySequence')}</span>
              ) : (
                scoreSequence.map((symbol, index) => renderBadge(symbol, index, 'finished'))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('capitalization.mistakePhrasesTitle')}</p>
            {mistakeEntries.length === 0 ? (
              <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{t('capitalization.noMistakePhrases')}</p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {mistakeEntries.map((entry) => (
                  <p
                    key={entry.id}
                    className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold leading-relaxed text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300"
                  >
                    {entry.answer}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onRestart} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-800 px-6 py-4 font-bold text-white dark:bg-slate-700">
              <RotateCcw className="h-5 w-5" />
              {t('app.playAgainButton')}
            </button>
            <button type="button" onClick={onHome} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-4 font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
              <House className="h-5 w-5" />
              {t('app.homeButton')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!preparedEntry) {
    return null;
  }

  const activeChoice = preparedEntry.parts.find((part) => (
    part.type === 'choice' && part.choiceIndex === activeChoiceIndex
  ));

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col font-sans text-slate-800 dark:text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:px-6">
        <div className="mx-auto flex max-w-4xl items-start justify-between gap-3 sm:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="hidden flex-col md:flex">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('testSets.currentLabel')}</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t(testSet.titleKey)}</span>
            </div>
            <div className="grid min-w-0 grid-cols-[max-content_max-content_minmax(0,1fr)] items-start gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:items-center sm:gap-6">
              <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 sm:text-sm sm:normal-case sm:tracking-normal">{t('gameplay.words')}</span>
                <span className="text-base font-bold text-blue-600 dark:text-blue-400 sm:text-lg">{queue.length}</span>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 sm:text-sm sm:normal-case sm:tracking-normal">{t('gameplay.points')}</span>
                <span className="text-base font-bold text-blue-600 dark:text-blue-400 sm:text-lg">{totalScore}</span>
              </div>
              <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 sm:text-sm sm:normal-case sm:tracking-normal">{t('gameplay.symbols')}</span>
                <div className="flex min-w-0 flex-wrap gap-1">
                  {scoreSequence.map((symbol, index) => renderBadge(symbol, index))}
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onHome}
            aria-label={t('app.homeButton')}
            title={t('app.homeButton')}
            className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-100 text-slate-600 shadow-sm dark:border-slate-600 dark:from-slate-700 dark:to-slate-800 dark:text-slate-200"
          >
            <House className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
            {review ? t('capitalization.reviewLabel') : t('capitalization.choiceProgress', {
              current: activeChoiceIndex + 1,
              total: preparedEntry.choiceCount
            })}
          </p>
          <h2 className="mt-4 text-3xl font-bold leading-relaxed text-slate-900 dark:text-white md:text-5xl">
            {renderPhrase(preparedEntry.parts, {
              decisions,
              activeChoiceIndex,
              wrongChoiceIndexes: review?.wrongChoiceIndexes ?? null
            })}
          </h2>

          {review ? (
            <div className="mt-8 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-700 dark:bg-slate-900/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('capitalization.yourPhrase')}</p>
                <p className="mt-2 text-xl font-bold leading-relaxed">{review.learnerPhrase}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left dark:border-emerald-800 dark:bg-emerald-900/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{t('capitalization.correctPhrase')}</p>
                <p className="mt-2 text-xl font-bold leading-relaxed text-emerald-800 dark:text-emerald-200">{review.correctPhrase}</p>
              </div>
              <button
                type="button"
                onClick={handleContinue}
                className="w-full rounded-xl bg-blue-600 px-6 py-5 text-xl font-bold text-white hover:bg-blue-700"
              >
                {t('capitalization.continueButton')}
              </button>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[activeChoice.lowerLetter, activeChoice.upperLetter].map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => handleChoice(letter === activeChoice.upperLetter ? 'upper' : 'lower')}
                  className="flex min-h-40 items-center justify-center rounded-3xl border-2 border-slate-200 bg-slate-50 text-7xl font-black text-slate-900 shadow-sm transition-transform active:scale-95 hover:border-blue-400 hover:bg-blue-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:hover:border-blue-500 dark:hover:bg-blue-950/40 md:min-h-56 md:text-8xl"
                >
                  {letter}
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
