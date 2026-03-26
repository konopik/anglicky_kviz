import React, { useState, useRef } from 'react';
import { Star, CheckCircle, RotateCcw, House, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CanvasKeyboard from './components/CanvasKeyboard';
import { TEST_SETS, getTestSetById } from './data/testSets';

const MISTAKES_FOR_HINT = 3;

const normalizeAnswerText = (text) => Array.from(text).map((character) => {
  if (character === 'ß') {
    return 'ß';
  }

  return character.toLocaleUpperCase('de-DE');
}).join('');

const createInitialWordState = (entry) => {
  if (!entry) {
    return {
      typedLetters: [],
      positionStatuses: [],
      currentPosition: 0,
    };
  }

  const expectedAnswer = normalizeAnswerText(entry.answer);
  const typedLetters = Array(expectedAnswer.length).fill('');
  const positionStatuses = Array(expectedAnswer.length).fill(null);
  let currentPosition = 0;

  while (currentPosition < expectedAnswer.length && expectedAnswer[currentPosition] === ' ') {
    typedLetters[currentPosition] = ' ';
    positionStatuses[currentPosition] = 'space';
    currentPosition += 1;
  }

  return {
    typedLetters,
    positionStatuses,
    currentPosition,
  };
};

const advancePastSpaces = (expectedAnswer, typedLetters, positionStatuses, startPosition) => {
  let nextPosition = startPosition;

  while (nextPosition < expectedAnswer.length && expectedAnswer[nextPosition] === ' ') {
    typedLetters[nextPosition] = ' ';
    positionStatuses[nextPosition] = 'space';
    nextPosition += 1;
  }

  return nextPosition;
};

export default function App() {
  const { t, i18n } = useTranslation();
  const [gameState, setGameState] = useState('start');
  const [selectedTestSetId, setSelectedTestSetId] = useState(null);
  const [queue, setQueue] = useState([]);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [isCurrentWordRetry, setIsCurrentWordRetry] = useState(false);
  const [scoreSequence, setScoreSequence] = useState([]);
  const [totalScore, setTotalScore] = useState(0);
  
  const [typedLetters, setTypedLetters] = useState([]);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [mistakesOnPosition, setMistakesOnPosition] = useState(0);
  const [wrongLetters, setWrongLetters] = useState(new Set());
  const [hintedLetter, setHintedLetter] = useState(null);
  const [currentWordIsPerfect, setCurrentWordIsPerfect] = useState(true);
  const [currentWordUsedHint, setCurrentWordUsedHint] = useState(false);
  const [positionStatuses, setPositionStatuses] = useState([]);
  const [showAutoStartMessage, setShowAutoStartMessage] = useState(false);

  const audioContextRef = useRef(null);
  const autoStartTimeoutRef = useRef(null);
  const selectedTestSet = getTestSetById(selectedTestSetId);

  const initializeQueue = (entries) => {
    // Fisher-Yates shuffle
    const shuffled = [...entries].map(entry => ({ entry, isRetry: false }));
    for (let i = shuffled.length - 1; i > 0; i--) {
      // eslint-disable-next-line react-hooks/purity
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const startGame = (testSetId = null) => {
    const testSetToStart = testSetId ? getTestSetById(testSetId) : selectedTestSet;
    if (!testSetToStart) return;

    if (testSetId) {
      setSelectedTestSetId(testSetId);

      if (autoStartTimeoutRef.current) {
        clearTimeout(autoStartTimeoutRef.current);
      }

      setShowAutoStartMessage(true);
      autoStartTimeoutRef.current = setTimeout(() => {
        setShowAutoStartMessage(false);
        autoStartTimeoutRef.current = null;
      }, 1800);
    }

    const initialQueue = initializeQueue(testSetToStart.entries);
    setQueue(initialQueue);
    setCurrentEntry(initialQueue[0].entry);
    setIsCurrentWordRetry(initialQueue[0].isRetry);
    setGameState('playing');
    setScoreSequence([]);
    setTotalScore(0);
    resetWordState(initialQueue[0].entry);
  };

  const goHome = () => {
    if (autoStartTimeoutRef.current) {
      clearTimeout(autoStartTimeoutRef.current);
      autoStartTimeoutRef.current = null;
    }

    setGameState('start');
    setCurrentEntry(null);
    setQueue([]);
    setScoreSequence([]);
    setTotalScore(0);
    setMistakesOnPosition(0);
    setTypedLetters([]);
    setCurrentPosition(0);
    setWrongLetters(new Set());
    setHintedLetter(null);
    setCurrentWordIsPerfect(true);
    setCurrentWordUsedHint(false);
    setPositionStatuses([]);
    setShowAutoStartMessage(false);
  };

  const resetWordState = (entry) => {
    const initialWordState = createInitialWordState(entry);
    setTypedLetters(initialWordState.typedLetters);
    setCurrentPosition(initialWordState.currentPosition);
    setMistakesOnPosition(0);
    setWrongLetters(new Set());
    setHintedLetter(null);
    setCurrentWordIsPerfect(true);
    setCurrentWordUsedHint(false);
    setPositionStatuses(initialWordState.positionStatuses);
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

  const handleLetterClick = (letter) => {
    if (!currentEntry) return;
    
    const expectedAnswer = normalizeAnswerText(currentEntry.answer);
    const expectedLetter = expectedAnswer[currentPosition];
    const isCorrect = letter === expectedLetter;

    if (isCorrect) {
      const usedHintThisTurn = hintedLetter !== null;
      const newTyped = [...typedLetters];
      newTyped[currentPosition] = letter;
      
      // Determine position status: perfect, mistake, or hint
      let posStatus = 'perfect';
      if (usedHintThisTurn) {
        posStatus = 'hint';
      } else if (mistakesOnPosition > 0 || wrongLetters.size > 0) {
        posStatus = 'mistake';
      }
      
      const newStatuses = [...positionStatuses];
      newStatuses[currentPosition] = posStatus;

      const nextPosition = advancePastSpaces(expectedAnswer, newTyped, newStatuses, currentPosition + 1);

      setTypedLetters(newTyped);
      setPositionStatuses(newStatuses);
      
      setCurrentPosition(nextPosition);
      setMistakesOnPosition(0);
      setWrongLetters(new Set());
      setHintedLetter(null);
      if (usedHintThisTurn) {
        setCurrentWordIsPerfect(false);
        setCurrentWordUsedHint(true);
      }

      if (nextPosition >= expectedAnswer.length) {
        completeWord(usedHintThisTurn);
      }
    } else {
      if (!wrongLetters.has(letter)) {
        playErrorSound();
        setCurrentWordIsPerfect(false);
        const newWrongLetters = new Set(wrongLetters);
        newWrongLetters.add(letter);
        setWrongLetters(newWrongLetters);
        
        const newMistakes = mistakesOnPosition + 1;
        setMistakesOnPosition(newMistakes);

        if (newMistakes >= MISTAKES_FOR_HINT) {
          setHintedLetter(expectedLetter);
        }
      }
    }
  };

  const handleHintedLetterClick = () => {
    if (hintedLetter === null || !currentEntry) return;

    const expectedAnswer = normalizeAnswerText(currentEntry.answer);
    const newTyped = [...typedLetters];
    newTyped[currentPosition] = hintedLetter;
    
    const newStatuses = [...positionStatuses];
    newStatuses[currentPosition] = 'hint';

    const nextPosition = advancePastSpaces(expectedAnswer, newTyped, newStatuses, currentPosition + 1);

    setTypedLetters(newTyped);
    setPositionStatuses(newStatuses);
    
    setCurrentPosition(nextPosition);
    setMistakesOnPosition(0);
    setWrongLetters(new Set());
    setHintedLetter(null);
    setCurrentWordIsPerfect(false);
    setCurrentWordUsedHint(true);

    if (nextPosition >= expectedAnswer.length) {
      completeWord(true);
    }
  };

  const completeWord = (usedHint) => {
    const hintWasUsed = currentWordUsedHint || usedHint;
    const wasPerfect = currentWordIsPerfect && !hintWasUsed && mistakesOnPosition === 0;
    let symbolType = 'perfect';
    let points = 0;

    if (isCurrentWordRetry) {
      // No points on retry, but still record the symbol
      if (hintWasUsed) {
        symbolType = 'hintUsed';
      } else if (mistakesOnPosition > 0 || !currentWordIsPerfect) {
        symbolType = 'incorrect';
      } else {
        symbolType = 'perfect';
      }
      points = 0;
    } else {
      // First attempt scoring
      if (hintWasUsed) {
        symbolType = 'hintUsed';
        points = 0;
      } else if (mistakesOnPosition > 0 || !currentWordIsPerfect) {
        symbolType = 'incorrect';
        points = 1;
      } else {
        symbolType = 'perfect';
        points = 3;
      }
    }

    setScoreSequence(prev => [...prev, symbolType]);
    setTotalScore(prev => prev + points);

    setTimeout(() => {
      nextQuestion(wasPerfect ? null : currentEntry);
    }, 600);
  };

  const nextQuestion = (entryToRepeat = null) => {
    let newQueue = queue.slice(1);

    if (entryToRepeat) {
      // Create a retry entry for the word to repeat
      const retryEntry = { entry: entryToRepeat, isRetry: true };
      
      // Insert word after at least 2 words, or randomly if less than 2 words remain
      const minDelay = 2;
      if (newQueue.length <= minDelay) {
        newQueue.push(retryEntry);
      } else {
        // eslint-disable-next-line react-hooks/purity
        const insertPos = minDelay + Math.floor(Math.random() * (newQueue.length - minDelay + 1));
        newQueue.splice(insertPos, 0, retryEntry);
      }
    }

    if (newQueue.length === 0) {
      setQueue([]);
      setCurrentEntry(null);
      setGameState('finished');
      return;
    }

    setQueue(newQueue);
    setCurrentEntry(newQueue[0].entry);
    setIsCurrentWordRetry(newQueue[0].isRetry);
    resetWordState(newQueue[0].entry);
  };



  if (gameState === 'start') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
        <div className="max-w-3xl w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center space-y-6 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-100 dark:bg-yellow-900/40 w-24 h-24 rounded-full flex items-center justify-center">
              <Star className="w-12 h-12 text-yellow-500 dark:text-yellow-400 fill-current" />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => i18n.changeLanguage('en')}
                className={`px-3 py-1 rounded text-sm font-bold transition-all ${
                  i18n.language === 'en'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => i18n.changeLanguage('cs')}
                className={`px-3 py-1 rounded text-sm font-bold transition-all ${
                  i18n.language === 'cs'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                CZ
              </button>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('app.title')}</h1>
          <div className="text-left space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                {t('testSets.selectLabel')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TEST_SETS.map((testSet) => {
                  const isSelected = selectedTestSetId === testSet.id;

                  return (
                    <button
                      key={testSet.id}
                      type="button"
                      onClick={() => startGame(testSet.id)}
                      className={`w-full rounded-xl border p-4 text-left transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-200 dark:ring-blue-800'
                          : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/30 hover:border-blue-300 dark:hover:border-blue-500'
                      }`}
                    >
                      <p className="font-bold text-slate-900 dark:text-white">{t(testSet.titleKey)}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{t(testSet.descriptionKey)}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedTestSet && (
              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                  {t('testSets.selectedLabel')}
                </p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-1">{t(selectedTestSet.titleKey)}</p>
                <p className="text-sm text-blue-600 dark:text-blue-200 mt-1">{t(selectedTestSet.descriptionKey)}</p>
              </div>
            )}
          </div>
          <div className="text-slate-600 dark:text-slate-300 leading-relaxed space-y-3 text-left bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl">
            <p>{t('instructions.typeInstruction')}</p>
            <p>{t('instructions.perfectStar')}</p>
            <p>{t('instructions.incorrectDot')}</p>
            <p>{t('instructions.hintDot')}</p>
            <p>{t('instructions.hintMechanic')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'finished') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center space-y-6 border border-slate-100 dark:border-slate-700">
          <div className="bg-yellow-100 dark:bg-yellow-900/30 w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-14 h-14 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('app.finishedTitle')}</h1>
          {selectedTestSet && (
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
              {t(selectedTestSet.titleKey)}
            </p>
          )}
          <p className="text-slate-600 dark:text-slate-300">{t('app.finishedMessage')}</p>
          
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 border border-blue-200 dark:border-blue-700 mt-6 mb-4">
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase mb-2">{t('gameplay.totalPoints')}</p>
            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{totalScore}</p>
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
          
          <button 
            onClick={startGame}
            className="w-full mt-4 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md border-none outline-none"
          >
            <RotateCcw className="w-5 h-5" />
            {t('app.playAgainButton')}
          </button>
        </div>
      </div>
    );
  }

  if (!currentEntry || !selectedTestSet) return null;

  const expectedAnswer = normalizeAnswerText(currentEntry.answer);
  const isWordComplete = currentPosition >= expectedAnswer.length;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {showAutoStartMessage && (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-start justify-center px-4 pt-16 md:pt-20">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-200/80 bg-white/92 px-5 py-4 shadow-2xl shadow-emerald-500/20 backdrop-blur-xl dark:border-emerald-700/70 dark:bg-slate-900/90">
            <div className="absolute -left-8 -top-8 h-20 w-20 rounded-full bg-emerald-300/35 blur-2xl dark:bg-emerald-500/20" />
            <div className="absolute -right-6 -bottom-10 h-24 w-24 rounded-full bg-sky-300/35 blur-2xl dark:bg-sky-500/20" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-400 to-sky-500 text-white shadow-lg shadow-emerald-500/30">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-300">
                  {t('testSets.currentLabel')}
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{t('app.startedAutomatically')}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{t(selectedTestSet.titleKey)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white dark:bg-slate-800 px-4 md:px-6 py-4 shadow-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 transition-colors duration-300">
        <div className="flex items-start justify-between gap-3 sm:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="hidden md:flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('testSets.currentLabel')}</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t(selectedTestSet.titleKey)}</span>
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

          <button
            onClick={goHome}
            type="button"
            aria-label={t('app.homeButton')}
            title={t('app.homeButton')}
            className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-100 text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-600 hover:shadow-md dark:border-slate-600 dark:from-slate-700 dark:to-slate-800 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-300"
          >
            <House className="h-5 w-5 transition-transform group-hover:scale-110" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col justify-center">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 md:p-10 mb-8 transition-colors duration-300 text-center">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t(selectedTestSet.promptLabelKey)}</p>
          <h2 className="text-4xl md:text-5xl font-bold text-blue-600 dark:text-blue-400 mb-6 break-words">{currentEntry.prompt}</h2>
          
          <div className="mb-8 flex flex-wrap justify-center gap-1.5 md:gap-2.5">
            {expectedAnswer.split('').map((letter, idx) => {
              if (letter === ' ') {
                return <div key={`space-${idx}`} className="h-[2.75rem] w-3 md:h-[3.1rem] md:w-5" aria-hidden="true" />;
              }

              const isTyped = Boolean(typedLetters[idx]);
              const isHinted = idx === currentPosition && hintedLetter;
              const wrongOnThis = idx === currentPosition && mistakesOnPosition > 0 && !isTyped;
              
              // Determine background color based on position status (for completed positions)
              let bgClass = 'bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600';
              
              if (isTyped && positionStatuses[idx]) {
                const status = positionStatuses[idx];
                if (status === 'perfect') {
                  bgClass = 'bg-green-100 dark:bg-green-900/50 border-green-400 text-green-700 dark:text-green-300';
                } else if (status === 'mistake') {
                  bgClass = 'bg-orange-100 dark:bg-orange-900/50 border-orange-400 text-orange-700 dark:text-orange-300';
                } else if (status === 'hint') {
                  bgClass = 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 text-yellow-700 dark:text-yellow-300';
                }
              } else if (isTyped) {
                bgClass = 'bg-green-100 dark:bg-green-900/50 border-green-400 text-green-700 dark:text-green-300';
              } else if (isHinted) {
                bgClass = 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 text-yellow-700 dark:text-yellow-300 cursor-pointer hover:bg-yellow-200 dark:hover:bg-yellow-900/50';
              } else if (wrongOnThis) {
                bgClass = 'bg-red-100 dark:bg-red-900/50 border-red-400 text-red-700 dark:text-red-300';
              }
              
              return (
                <div
                  key={idx}
                  className={`flex h-[2.75rem] w-[2.75rem] items-center justify-center rounded-lg border-2 text-base font-bold transition-all md:h-[3.1rem] md:w-[3.1rem] md:text-lg ${bgClass}`}
                  onClick={() => isHinted && handleHintedLetterClick()}
                >
                  {isTyped ? typedLetters[idx] : isHinted ? letter : ''}
                </div>
              );
            })}
          </div>

          {hintedLetter && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-semibold mb-4">
              {t('gameplay.hintMessage')}
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-2 sm:p-4 md:p-8 transition-colors duration-300 mb-8">
          <CanvasKeyboard
            qwertyRows={selectedTestSet.keyboardRows}
            typedLetters={typedLetters}
            wrongLetters={wrongLetters}
            hintedLetter={hintedLetter}
            isWordComplete={isWordComplete}
            onLetterClick={handleLetterClick}
            expectedLetter={isWordComplete ? null : expectedAnswer[currentPosition]}
            className="p-0 shadow-none border-none"
          />
        </div>


      </main>
    </div>
  );
}



