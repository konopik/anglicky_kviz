import React, { useMemo, useState } from 'react';
import { CheckCircle, ChevronRight, House, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const normalizeTextAnswer = (value) => value.trim().toLocaleLowerCase('de-DE');

const createInitialAnswers = (section) => section.items.map(() => (
  section.type === 'ending' ? null : ''
));

const createInitialSectionState = (section) => ({
  answers: createInitialAnswers(section),
  submitted: false,
  passed: false,
  countedMistakes: new Set()
});

export default function GermanPossessiveQuiz({ testSet, onHome, onRestart }) {
  const { t } = useTranslation();
  const [sectionIndex, setSectionIndex] = useState(0);
  const [sectionStates, setSectionStates] = useState(() => (
    testSet.sections.map((section) => createInitialSectionState(section))
  ));
  const [finished, setFinished] = useState(false);
  const [mistakeCount, setMistakeCount] = useState(0);

  const currentSection = testSet.sections[sectionIndex];
  const currentSectionState = sectionStates[sectionIndex];
  const totalSections = testSet.sections.length;
  const totalItems = useMemo(
    () => testSet.sections.reduce((total, section) => total + section.items.length, 0),
    [testSet.sections]
  );
  const answers = currentSectionState.answers;
  const submitted = currentSectionState.submitted;
  const sectionPassed = currentSectionState.passed;
  const countedMistakes = currentSectionState.countedMistakes;
  const completedItems = useMemo(() => testSet.sections.reduce((total, section, index) => (
    sectionStates[index].passed ? total + section.items.length : total
  ), 0), [sectionStates, testSet.sections]);
  const allSectionsPassed = sectionStates.every((sectionState) => sectionState.passed);

  const evaluation = useMemo(() => currentSection.items.map((item, index) => {
    const rawAnswer = answers[index] ?? '';
    const isCorrect = currentSection.type === 'ending'
      ? rawAnswer === item.answer
      : normalizeTextAnswer(rawAnswer) === item.answer;

    return {
      isCorrect,
      isFilled: currentSection.type === 'ending' ? rawAnswer !== null : rawAnswer.trim().length > 0
    };
  }), [answers, currentSection.items, currentSection.type]);

  const allFilled = currentSection.items.every((_, index) => {
    if (currentSection.type === 'ending') {
      return answers[index] !== null;
    }

    return (answers[index] ?? '').trim().length > 0;
  });

  const incorrectCount = evaluation.filter((item) => !item.isCorrect).length;

  const goToSection = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= totalSections) {
      return;
    }

    setSectionIndex(nextIndex);
  };

  const goToNextIncompleteSection = () => {
    const nextIncompleteIndex = sectionStates.findIndex((sectionState, index) => (
      index > sectionIndex && !sectionState.passed
    ));

    if (nextIncompleteIndex !== -1) {
      goToSection(nextIncompleteIndex);
      return;
    }

    const firstIncompleteIndex = sectionStates.findIndex((sectionState) => !sectionState.passed);

    if (firstIncompleteIndex !== -1) {
      goToSection(firstIncompleteIndex);
      return;
    }

    setFinished(true);
  };

  const handleCheck = () => {
    if (sectionPassed) {
      if (allSectionsPassed) {
        setFinished(true);
        return;
      }

      goToNextIncompleteSection();
      return;
    }

    setSectionStates((current) => current.map((sectionState, index) => (
      index === sectionIndex
        ? { ...sectionState, submitted: true }
        : sectionState
    )));

    if (!allFilled) {
      return;
    }

    if (incorrectCount > 0) {
      const newIncorrectIndexes = evaluation.reduce((indexes, item, index) => {
        if (!item.isCorrect && !countedMistakes.has(index)) {
          indexes.push(index);
        }

        return indexes;
      }, []);

      if (newIncorrectIndexes.length > 0) {
        setMistakeCount((current) => current + newIncorrectIndexes.length);
        setSectionStates((current) => current.map((sectionState, index) => {
          if (index !== sectionIndex) {
            return sectionState;
          }

          const nextMistakes = new Set(sectionState.countedMistakes);
          newIncorrectIndexes.forEach((itemIndex) => nextMistakes.add(itemIndex));

          return {
            ...sectionState,
            countedMistakes: nextMistakes
          };
        }));
      }

      return;
    }

    setSectionStates((current) => current.map((sectionState, index) => (
      index === sectionIndex
        ? { ...sectionState, passed: true, submitted: true }
        : sectionState
    )));
  };

  const handleEndingSelect = (index, value) => {
    if (sectionPassed) {
      return;
    }

    setSectionStates((current) => current.map((sectionState, currentSectionIndex) => (
      currentSectionIndex === sectionIndex
        ? {
          ...sectionState,
          answers: sectionState.answers.map((answer, currentIndex) => (
            currentIndex === index ? value : answer
          ))
        }
        : sectionState
    )));
  };

  const handleArticleChange = (index, value) => {
    if (sectionPassed) {
      return;
    }

    setSectionStates((current) => current.map((sectionState, currentSectionIndex) => (
      currentSectionIndex === sectionIndex
        ? {
          ...sectionState,
          answers: sectionState.answers.map((answer, currentIndex) => (
            currentIndex === index ? value : answer
          ))
        }
        : sectionState
    )));
  };

  if (finished) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
        <div className="max-w-xl w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center space-y-6 border border-slate-100 dark:border-slate-700">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 w-28 h-28 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-14 h-14 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">{t(testSet.titleKey)}</p>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('worksheet.finishedTitle')}</h1>
            <p className="text-slate-600 dark:text-slate-300">{t('worksheet.finishedMessage')}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">{t('worksheet.summary.completedSections')}</p>
              <p className="mt-2 text-3xl font-bold text-blue-700 dark:text-blue-300">{totalSections}/{totalSections}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">{t('worksheet.summary.corrections')}</p>
              <p className="mt-2 text-3xl font-bold text-amber-700 dark:text-amber-300">{mistakeCount}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{t('worksheet.summary.completedItems')}</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700 dark:text-emerald-300">{completedItems}/{totalItems}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onRestart}
              className="flex-1 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <RotateCcw className="w-5 h-5" />
              {t('app.playAgainButton')}
            </button>
            <button
              type="button"
              onClick={onHome}
              className="flex-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500 text-slate-700 dark:text-slate-100 font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <House className="w-5 h-5" />
              {t('app.homeButton')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-800 px-4 md:px-6 py-3 shadow-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-5xl mx-auto flex items-start justify-between gap-3 sm:items-center">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('worksheet.progressLabel')}</p>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">{t(testSet.titleKey)}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t('worksheet.sectionCounter', { current: sectionIndex + 1, total: totalSections })}
            </p>
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
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-4 md:px-6 md:py-6 space-y-4">
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                {t('worksheet.sectionBadge', { current: sectionIndex + 1, total: totalSections })}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{currentSection.title}</h2>
              <p className="mt-2 text-slate-600 dark:text-slate-300">{currentSection.description}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-4 py-3 text-sm">
              <p className="font-semibold text-slate-700 dark:text-slate-200">{t('worksheet.summary.completedItems')}</p>
              <p className="mt-1 text-lg font-bold text-blue-600 dark:text-blue-400">{completedItems}/{totalItems}</p>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('worksheet.sectionJumpLabel')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {testSet.sections.map((section, index) => {
                const isCurrent = index === sectionIndex;
                const isPassed = sectionStates[index].passed;

                return (
                  <button
                    key={section.id}
                    type="button"
                    disabled={isCurrent}
                    onClick={() => goToSection(index)}
                    aria-current={isCurrent ? 'step' : undefined}
                    title={t('worksheet.sectionCounter', { current: index + 1, total: totalSections })}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                      isCurrent
                        ? 'border-blue-500 bg-blue-100 text-blue-700 dark:border-blue-500 dark:bg-blue-900/40 dark:text-blue-300'
                        : isPassed
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-400 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500'
                    } ${isCurrent ? 'cursor-default' : ''}`}
                  >
                    {isPassed && <CheckCircle className="h-4 w-4" />}
                    <span>{index + 1}. {section.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {currentSection.items.map((item, index) => {
              const isCorrect = submitted && evaluation[index]?.isCorrect;
              const isIncorrect = submitted && allFilled && !evaluation[index]?.isCorrect;
              const rowClass = isCorrect
                ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20'
                : isIncorrect
                  ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                  : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800';

              return (
                <div key={`${currentSection.id}-${index}`} className={`rounded-2xl border p-4 transition-colors ${rowClass}`}>
                  {currentSection.type === 'ending' ? (
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="text-lg font-semibold text-slate-900 dark:text-white">
                        <span>{item.stem}</span>
                        <span className="inline-flex min-w-10 justify-center rounded-md border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-2 py-1 mx-2 text-blue-600 dark:text-blue-400">
                          {(answers[index] ?? '') === '' ? '—' : answers[index]}
                        </span>
                        <span>{item.noun}</span>
                        {item.article && (
                          <span className="ml-2 text-sm font-medium text-slate-500 dark:text-slate-400">({item.article})</span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEndingSelect(index, '')}
                          disabled={sectionPassed}
                          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                            answers[index] === ''
                              ? 'border-blue-500 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-500'
                              : 'border-slate-300 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500'
                          } ${sectionPassed ? 'cursor-not-allowed opacity-80' : ''}`}
                        >
                          {t('worksheet.optionNoEnding')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEndingSelect(index, 'e')}
                          disabled={sectionPassed}
                          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                            answers[index] === 'e'
                              ? 'border-blue-500 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-500'
                              : 'border-slate-300 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500'
                          } ${sectionPassed ? 'cursor-not-allowed opacity-80' : ''}`}
                        >
                          {t('worksheet.optionAddEnding')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="text-lg font-semibold text-slate-900 dark:text-white">
                        <span>{item.cue}:</span>
                        <span className="inline-flex min-w-28 justify-center rounded-md border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-3 py-1 mx-2 text-blue-600 dark:text-blue-400">
                          {(answers[index] ?? '').trim() || '...'}
                        </span>
                        <span>{item.noun}</span>
                        {item.article && (
                          <span className="ml-2 text-sm font-medium text-slate-500 dark:text-slate-400">({item.article})</span>
                        )}
                      </div>

                      <input
                        type="text"
                        value={answers[index] ?? ''}
                        onChange={(event) => handleArticleChange(index, event.target.value)}
                        placeholder={t('worksheet.articlePlaceholder')}
                        autoComplete="off"
                        disabled={sectionPassed}
                        className={`w-full lg:w-48 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-base font-semibold text-slate-900 dark:text-white outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 ${sectionPassed ? 'cursor-not-allowed opacity-80' : ''}`}
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          {submitted && !allFilled && (
            <p className="mt-4 text-sm font-semibold text-amber-600 dark:text-amber-400">{t('worksheet.fillAllMessage')}</p>
          )}

          {submitted && allFilled && !sectionPassed && incorrectCount > 0 && (
            <p className="mt-4 text-sm font-semibold text-red-600 dark:text-red-400">
              {t('worksheet.tryAgainMessage', { count: incorrectCount })}
            </p>
          )}

          {sectionPassed && (
            <p className="mt-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400">{t('worksheet.sectionPassedMessage')}</p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:items-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('worksheet.progressItems', { completed: completedItems, total: totalItems })}
            </p>
            <button
              type="button"
              onClick={handleCheck}
              className="bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white font-bold py-3 px-5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {sectionPassed ? (
                <>
                  {allSectionsPassed ? t('worksheet.finishButton') : t('worksheet.nextSectionButton')}
                  <ChevronRight className="w-5 h-5" />
                </>
              ) : (
                t('worksheet.checkButton')
              )}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
