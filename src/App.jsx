import React, { useState, useRef } from 'react';
import { Star, CheckCircle, Play, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CanvasKeyboard from './components/CanvasKeyboard';

const VERBS = [
  { infinitive: 'run', past: 'ran' },
  { infinitive: 'swim', past: 'swam' },
  { infinitive: 'take', past: 'took' },
  { infinitive: 'write', past: 'wrote' },
  { infinitive: 'read', past: 'read' },
  { infinitive: 'make', past: 'made' },
  { infinitive: 'give', past: 'gave' },
  { infinitive: 'drink', past: 'drank' },
  { infinitive: 'go', past: 'went' },
  { infinitive: 'see', past: 'saw' },
  { infinitive: 'eat', past: 'ate' },
  { infinitive: 'ring', past: 'rang' }
];

const QWERTY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

const MISTAKES_FOR_HINT = 3;

export default function App() {
  const { t, i18n } = useTranslation();
  const [gameState, setGameState] = useState('start');
  const [queue, setQueue] = useState([]);
  const [currentVerb, setCurrentVerb] = useState(null);
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

  const audioContextRef = useRef(null);

  const initializeQueue = () => {
    // Fisher-Yates shuffle
    const shuffled = [...VERBS].map(verb => ({ verb, isRetry: false }));
    for (let i = shuffled.length - 1; i > 0; i--) {
      // eslint-disable-next-line react-hooks/purity
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const startGame = () => {
    const initialQueue = initializeQueue();
    setQueue(initialQueue);
    setCurrentVerb(initialQueue[0].verb);
    setIsCurrentWordRetry(initialQueue[0].isRetry);
    setGameState('playing');
    setScoreSequence([]);
    setTotalScore(0);
    resetWordState();
  };

  const resetWordState = () => {
    setTypedLetters([]);
    setCurrentPosition(0);
    setMistakesOnPosition(0);
    setWrongLetters(new Set());
    setHintedLetter(null);
    setCurrentWordIsPerfect(true);
    setCurrentWordUsedHint(false);
    setPositionStatuses([]);
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
    if (!currentVerb) return;
    
    const expectedAnswer = currentVerb.past.toUpperCase();
    const expectedLetter = expectedAnswer[currentPosition];
    const isCorrect = letter === expectedLetter;

    if (isCorrect) {
      const usedHintThisTurn = hintedLetter !== null;
      const newTyped = [...typedLetters, letter];
      setTypedLetters(newTyped);
      
      // Determine position status: perfect, mistake, or hint
      let posStatus = 'perfect';
      if (currentWordUsedHint || usedHintThisTurn) {
        posStatus = 'hint';
      } else if (mistakesOnPosition > 0 || wrongLetters.size > 0) {
        posStatus = 'mistake';
      }
      
      const newStatuses = [...positionStatuses, posStatus];
      setPositionStatuses(newStatuses);
      
      setCurrentPosition(currentPosition + 1);
      setMistakesOnPosition(0);
      setWrongLetters(new Set());
      setHintedLetter(null);
      if (usedHintThisTurn) {
        setCurrentWordIsPerfect(false);
        setCurrentWordUsedHint(true);
      }

      if (newTyped.length === expectedAnswer.length) {
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
    if (hintedLetter === null || !currentVerb) return;

    const expectedAnswer = currentVerb.past.toUpperCase();
    const newTyped = [...typedLetters, hintedLetter];
    setTypedLetters(newTyped);
    
    const newStatuses = [...positionStatuses, 'hint'];
    setPositionStatuses(newStatuses);
    
    setCurrentPosition(currentPosition + 1);
    setMistakesOnPosition(0);
    setWrongLetters(new Set());
    setHintedLetter(null);
    setCurrentWordIsPerfect(false);
    setCurrentWordUsedHint(true);

    if (newTyped.length === expectedAnswer.length) {
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
      nextQuestion(wasPerfect ? null : currentVerb);
    }, 600);
  };

  const nextQuestion = (wordToRepeat = null) => {
    let newQueue = queue.slice(1);

    if (wordToRepeat) {
      // Create a retry entry for the word to repeat
      const retryEntry = { verb: wordToRepeat, isRetry: true };
      
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
      setCurrentVerb(null);
      setGameState('finished');
      return;
    }

    setQueue(newQueue);
    setCurrentVerb(newQueue[0].verb);
    setIsCurrentWordRetry(newQueue[0].isRetry);
    resetWordState();
  };



  if (gameState === 'start') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center space-y-6 border border-slate-100 dark:border-slate-700">
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
          <div className="text-slate-600 dark:text-slate-300 leading-relaxed space-y-3 text-left bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl">
            <p>{t('instructions.typeInstruction')}</p>
            <p>{t('instructions.perfectStar')}</p>
            <p>{t('instructions.incorrectDot')}</p>
            <p>{t('instructions.hintDot')}</p>
            <p>{t('instructions.hintMechanic')}</p>
          </div>
          <button 
            onClick={startGame}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-lg shadow-md border-none outline-none"
          >
            <Play className="w-6 h-6 fill-current" />
            {t('app.startButton')}
          </button>
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

  if (!currentVerb) return null;

  const expectedAnswer = currentVerb.past.toUpperCase();
  const isWordComplete = typedLetters.length === expectedAnswer.length;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-800 px-4 md:px-6 py-4 shadow-sm border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 z-10 transition-colors duration-300">
        <div className="flex items-center gap-6">
          <div className="flex gap-2 items-center">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{t('gameplay.words')}</span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{queue.length}</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{t('gameplay.points')}</span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{totalScore}</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{t('gameplay.symbols')}</span>
            <div className="flex gap-1 flex-wrap">
              {scoreSequence.map((symbol, idx) => (
                <div key={idx} className="flex items-center justify-center w-6 h-6">
                  {symbol === 'perfect' ? (
                    <Star className="w-5 h-5 text-yellow-500 dark:text-yellow-400 fill-current" />
                  ) : symbol === 'incorrect' ? (
                    <span className="block h-3.5 w-3.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                  ) : symbol === 'hintUsed' ? (
                    <span className="block h-3.5 w-3.5 rounded-full bg-red-500 dark:bg-red-400" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col justify-center">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 md:p-10 mb-8 transition-colors duration-300 text-center">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t('gameplay.typePrompt')}</p>
          <h2 className="text-5xl md:text-6xl font-bold text-blue-600 dark:text-blue-400 mb-6">{currentVerb.infinitive}</h2>
          
          <div className="flex justify-center gap-2 md:gap-3 mb-8 flex-wrap">
            {expectedAnswer.split('').map((letter, idx) => {
              const isTyped = idx < typedLetters.length;
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
                  className={`w-12 h-12 md:w-14 md:h-14 rounded-lg font-bold text-lg md:text-xl flex items-center justify-center border-2 transition-all ${bgClass}`}
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

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8 transition-colors duration-300 mb-8">
          <CanvasKeyboard
            qwertyRows={QWERTY_ROWS}
            typedLetters={typedLetters}
            wrongLetters={wrongLetters}
            hintedLetter={hintedLetter}
            isWordComplete={isWordComplete}
            onLetterClick={handleLetterClick}
            expectedLetter={expectedAnswer[currentPosition]}
            className="p-0 shadow-none border-none"
          />
        </div>


      </main>
    </div>
  );
}



