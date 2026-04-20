import React, { useRef, useEffect, useState, useCallback } from 'react';

export const SUBMIT_KEY = '__SUBMIT__';
const KEYBOARD_HEIGHT = 'clamp(200px, 42vw, 240px)';

const CanvasKeyboard = ({
  qwertyRows,
  typedLetters,
  wrongLetters,
  hintedLetter,
  isWordComplete,
  onLetterClick,
  expectedLetter,
  showSubmitKey = false,
  submitAriaLabel = 'Submit',
  className = ''
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const keyPositionsRef = useRef([]);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Refs to keep latest prop values for the global key handler without re-attaching the listener.
  const onLetterClickRef = useRef(onLetterClick);
  const isWordCompleteRef = useRef(isWordComplete);
  const qwertyRowsRef = useRef(qwertyRows);
  const showSubmitKeyRef = useRef(showSubmitKey);

  // Keep refs updated on every render so the single attached event listener always reads latest values.
  onLetterClickRef.current = onLetterClick;
  isWordCompleteRef.current = isWordComplete;
  qwertyRowsRef.current = qwertyRows;
  showSubmitKeyRef.current = showSubmitKey;

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };
    
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  // Global physical keyboard support:
  // We attach the listener to `window` rather than focusing a hidden <input> because focusing any
  // input element on mobile triggers the system virtual keyboard.  By listening at the window level
  // we capture hardware-keyboard events without causing the virtual keyboard to appear.
  useEffect(() => {
    const handleKeyDown = (event) => {
      // If the event was already handled upstream, skip.
      if (event.defaultPrevented) return;
      const onLetter = onLetterClickRef.current;
      if (!onLetter) return;

      // Do not intercept when a real input/textarea/contentEditable has focus – respect native inputs.
      const active = document.activeElement;
      if (active) {
        const tag = active.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || active.isContentEditable === true) return;
      }

      // Ignore modifier combos (Ctrl/Alt/Meta).  Shift is intentionally allowed so that the OS
      // can still produce the correct character; we normalise to uppercase ourselves below.
      if (event.ctrlKey || event.altKey || event.metaKey) return;

      const key = event.key;
      if (!key) return;

      // Enter -> SUBMIT_KEY, but only when submit is actually available on this keyboard.
      if (key === 'Enter') {
        const canSubmit =
          showSubmitKeyRef.current ||
          (Array.isArray(qwertyRowsRef.current) &&
            qwertyRowsRef.current.some((row) => Array.isArray(row) && row.includes(SUBMIT_KEY)));

        if (canSubmit) {
          // Always prevent default for Enter when the keyboard handles it, even if the word is
          // already complete, to avoid unintentional form submissions or page navigation.
          event.preventDefault();
          if (!isWordCompleteRef.current) {
            onLetter(SUBMIT_KEY);
          }
        }
        return;
      }

      // Space -> literal space token; prevent default so the page does not scroll.
      if (key === ' ' || key === 'Spacebar') {
        if (!isWordCompleteRef.current) {
          event.preventDefault();
          onLetter(' ');
        }
        return;
      }

      // Ignore non-printable / function keys – printable keys always have length === 1.
      if (key.length !== 1) return;

      // Normalise to uppercase to match the token format used by the rest of the keyboard.
      const token = key.toUpperCase();

      if (!isWordCompleteRef.current) {
        // Prevent default browser behaviour for handled keys (e.g. unexpected navigation).
        event.preventDefault();
        onLetter(token);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    // Remove listener on unmount to avoid memory leaks and duplicate handling.
    return () => window.removeEventListener('keydown', handleKeyDown);
    // No dependencies: the handler reads all live values via refs, so we only attach once.
  }, []);

  // Colors matching Tailwind design - light and dark modes
  const getColors = (darkMode) => ({
    bg: darkMode ? '#1e293b' : '#ffffff',           // slate-900 / white
    typed: darkMode ? '#334155' : '#e2e8f0',        // slate-700 / slate-200
    wrong: darkMode ? '#7f1d1d' : '#fee2e2',        // red-900 / red-100
    hinted: darkMode ? '#854d0e' : '#fcd34d',       // yellow-900 / yellow-300
    border: darkMode ? '#475569' : '#cbd5e1',       // slate-600 / slate-300
    text: darkMode ? '#e2e8f0' : '#1e293b',         // slate-200 / slate-800
    textLight: darkMode ? '#94a3b8' : '#64748b',    // slate-400 / slate-500
  });

  // Helper: Calculate distance between two points
  const distance = (x1, y1, x2, y2) => {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Helper: Determine which letter was clicked based on tolerance
  const getLetterFromClick = (clickX, clickY, positions, expectedLtr) => {
    if (positions.length === 0) return null;

    // Calculate key dimensions for tolerance calculation
    const avgKeyWidth = positions.reduce((sum, p) => sum + p.width, 0) / positions.length;
    const avgKeyHeight = positions.reduce((sum, p) => sum + p.height, 0) / positions.length;
    const avgKeySize = Math.max(avgKeyWidth, avgKeyHeight);
    
    // Expected letter gets large priority zone (70% of key size)
    const expectedPriorityRadius = avgKeySize * 0.7;
    // Other keys require to be closest and within a 50% tolerance
    const fallbackTolerance = avgKeySize * 0.5;

    // First pass: check if expected letter is within its large priority zone
    if (expectedLtr) {
      const expectedPos = positions.find(p => p.letter === expectedLtr.toUpperCase());
      if (expectedPos) {
        const dist = distance(clickX, clickY, expectedPos.centerX, expectedPos.centerY);
        if (dist <= expectedPriorityRadius) {
          return expectedLtr.toUpperCase(); // Priority: return expected letter if in priority zone
        }
      }
    }

    // Second pass: find closest key overall and check if it's in fallback tolerance
    let closestLetter = null;
    let closestDistance = Infinity;

    for (const pos of positions) {
      const dist = distance(clickX, clickY, pos.centerX, pos.centerY);
      if (dist < closestDistance) {
        closestDistance = dist;
        closestLetter = pos.letter;
      }
    }

    // Return closest letter only if it's within fallback tolerance
    return closestDistance <= fallbackTolerance ? closestLetter : null;
  };

  // Calculate keyboard layout and key positions
  const calculateKeyPositions = useCallback((containerWidth, containerHeight) => {
    if (!containerWidth || !containerHeight) return [];

    const width = containerWidth;
    const height = containerHeight;
    const keyboardRows = showSubmitKey
      ? [...qwertyRows.slice(0, -1), [...qwertyRows[qwertyRows.length - 1], SUBMIT_KEY]]
      : qwertyRows;

    // Responsive layout parameters - reduce margins on mobile
    const isMobile = width < 600;
    const padding = isMobile ? 2 : 8;
    const keyMargin = isMobile ? 2 : 6;
    const totalRows = keyboardRows.length;

    // Key sizing based on longest row (maintains standard keyboard offset/layout)
    const maxKeysInRow = Math.max(...keyboardRows.map(row => row.length));
    const availableWidth = width - padding * 2 - keyMargin * (maxKeysInRow - 1);
    const keyWidth = availableWidth / maxKeysInRow;
    const keyHeight = (height - padding * 2 - keyMargin * (totalRows - 1)) / totalRows;
    const keyStep = keyWidth + keyMargin;

    const positions = [];
    let keyId = 0;

    for (let rowIdx = 0; rowIdx < keyboardRows.length; rowIdx++) {
      const row = keyboardRows[rowIdx];
      const rowOffset = ((maxKeysInRow - row.length) * keyStep) / 2;
      const rowStartX = padding + rowOffset;

      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const letter = row[colIdx];
        const x = rowStartX + colIdx * (keyWidth + keyMargin);
        const y = padding + rowIdx * (keyHeight + keyMargin);

        positions.push({
          id: keyId++,
          letter,
          x,
          y,
          width: keyWidth,
          height: keyHeight,
          centerX: x + keyWidth / 2,
          centerY: y + keyHeight / 2,
        });
      }
    }

    return positions;
  }, [qwertyRows, showSubmitKey]);

  // Draw the keyboard on canvas
  const drawKeyboard = useCallback((canvas, positions, containerWidth, containerHeight) => {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const colors = getColors(isDarkMode);

    // Set canvas resolution for crisp rendering
    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas with appropriate background
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, containerWidth, containerHeight);

    // Draw each key
    for (const pos of positions) {
      const isSubmitKey = pos.letter === SUBMIT_KEY;
      const isTyped = typedLetters.includes(pos.letter);
      const isWrong = wrongLetters.has(pos.letter);
      const isHinted = hintedLetter === pos.letter;
      const isDisabled = isWordComplete;

      // Determine background color
      let bgColor = isDarkMode ? '#0f172a' : '#f8fafc'; // slate-950 / slate-50
      let textColor = colors.text;
      let borderColor = colors.border;
      let alpha = 1;

      if (isDisabled) {
        alpha = 0.5;
      }

      if (isSubmitKey && !isDisabled) {
        bgColor = isDarkMode ? '#064e3b' : '#dcfce7';
        borderColor = isDarkMode ? '#10b981' : '#22c55e';
        textColor = isDarkMode ? '#d1fae5' : '#047857';
      }

      if (isWrong) {
        bgColor = colors.wrong;
        borderColor = isDarkMode ? '#dc2626' : '#fca5a5'; // red-600 / red-300
      } else if (isHinted) {
        bgColor = colors.hinted;
        borderColor = isDarkMode ? '#b45309' : '#eab308'; // yellow-700 / yellow-500
        textColor = isDarkMode ? '#fef3c7' : '#78350f'; // yellow-100 / yellow-900
      } else if (isTyped) {
        bgColor = colors.typed;
        textColor = colors.textLight;
        borderColor = isDarkMode ? '#64748b' : '#a1a5af'; // slate-500 / slate-400
      }

      // Apply opacity for disabled state
      ctx.globalAlpha = alpha;

      // Draw key rectangle
      ctx.fillStyle = bgColor;
      ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

      // Draw border
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);

      // Draw text
      ctx.fillStyle = textColor;
      ctx.font = `bold ${Math.round(pos.height * 0.4)}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isSubmitKey ? '✓' : pos.letter, pos.centerX, pos.centerY);

      ctx.globalAlpha = 1;
    }
  }, [hintedLetter, isDarkMode, isWordComplete, typedLetters, wrongLetters]);

  const getInteractionPoint = (event) => {
    if ('clientX' in event && 'clientY' in event) {
      return { clientX: event.clientX, clientY: event.clientY };
    }

    const touch = event.touches?.[0] ?? event.changedTouches?.[0];
    if (touch) {
      return { clientX: touch.clientX, clientY: touch.clientY };
    }

    return null;
  };

  // Handle canvas press/tap
  const handleCanvasPress = (event) => {
    if (isWordComplete || keyPositionsRef.current.length === 0) return;

    const point = getInteractionPoint(event);
    if (!point) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = point.clientX - rect.left;
    const clickY = point.clientY - rect.top;

    const letter = getLetterFromClick(clickX, clickY, keyPositionsRef.current, expectedLetter);
    if (letter) {
      onLetterClick(letter);
    }
  };

  // Setup canvas and draw
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Get dimensions from container (respecting CSS)
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Set canvas display size
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;

    // Calculate key positions
    const positions = calculateKeyPositions(containerWidth, containerHeight);
    keyPositionsRef.current = positions;

    // Draw keyboard
    drawKeyboard(canvas, positions, containerWidth, containerHeight);
  }, [calculateKeyPositions, drawKeyboard]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        canvas.style.width = `${containerWidth}px`;
        canvas.style.height = `${containerHeight}px`;

        const positions = calculateKeyPositions(containerWidth, containerHeight);
        keyPositionsRef.current = positions;
        drawKeyboard(canvas, positions, containerWidth, containerHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateKeyPositions, drawKeyboard]);

  return (
    <div
      className={`w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 ${className}`}
    >
      <div
        ref={containerRef}
        className="w-full"
        style={{ height: KEYBOARD_HEIGHT }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handleCanvasPress}
          aria-label={showSubmitKey ? `${submitAriaLabel} key available on keyboard` : 'On-screen keyboard'}
          style={{ 
            display: 'block', 
            width: '100%', 
            height: '100%',
            cursor: isWordComplete ? 'not-allowed' : 'pointer',
            touchAction: 'manipulation',
          }}
        />
      </div>
    </div>
  );
};

export default CanvasKeyboard;
