# Agent Context

## Project Snapshot

This is `muj-kviz`, a client-only React 19 + Vite 7 vocabulary quiz app for English, German, and Czech practice. The app is a single-page quiz experience with no router and no backend. It uses Tailwind CSS utility classes, `lucide-react` icons, and `i18next`/`react-i18next` for UI copy.

The default language is Czech (`cs`) with English fallback. The README is still the stock Vite template, so this file is the useful repo context.

## Commands

- `npm run dev` - start the Vite dev server.
- `npm run build` - production build into `dist/`.
- `npm run lint` - ESLint over JS/JSX.
- `npm run preview` - preview a production build.

There is no automated test suite configured. For code changes, run at least `npm run lint` and usually `npm run build`.

## Main Files

- `src/main.jsx` mounts React, imports `src/index.css`, and initializes i18n through `src/i18n/config.js`.
- `src/App.jsx` is the main app controller. It owns start/playing/finished state, simple typed-answer quiz state, scoring, retry scheduling, hint state, and dispatches specialized modes.
- `src/components/CanvasKeyboard.jsx` draws the on-screen keyboard on a canvas and also handles physical keyboard input globally.
- `src/components/GermanPossessiveQuiz.jsx` renders the worksheet-style German possessive article quiz.
- `src/components/EnglishIrregularSelectedQuiz.jsx` renders the two-stage irregular verb quiz: simple past first, then past participle.
- `src/data/testSets.js` is the registry of all quiz sets and shared keyboard rows.
- `src/data/*.js` contains larger quiz data modules.
- `src/i18n/locales/cs.json` and `src/i18n/locales/en.json` contain localized UI strings and test-set titles/descriptions.
- `src/index.css` imports Tailwind v4 using `@import "tailwindcss";` and `@config "../tailwind.config.js";`.

`src/App.css` appears to be leftover Vite template CSS and is not imported by the app.

## Quiz Modes

### Simple Typed-Answer Mode

Defined directly in `TEST_SETS` with:

```js
{
  id,
  titleKey,
  descriptionKey,
  promptLabelKey,
  keyboardRows,
  entries: [{ prompt, answer, context?, keyboardRows?, promptLabelKey? }],
  hideAnswerLength?
}
```

`App.jsx` shuffles entries, tracks typed letters by position, advances past spaces automatically, gives hints after three mistakes, and retries imperfect words later in the queue. First-attempt scoring is 3 points for perfect, 1 point for mistakes, and 0 for hints. Retries produce badges but no points.

When `hideAnswerLength` is true, the UI reveals only the current input area and appends the special submit token from `CanvasKeyboard` (`SUBMIT_KEY`). The user must finish with the submit key.

### Worksheet Mode

Use `mode: 'worksheet'` and pass `sections` from a data module. The current implementation is `GermanPossessiveQuiz`.

Section types:

- `ending`: items use `{ stem, noun, article?, answer }`, where `answer` is either `''` or `'e'`.
- `article`: items use `{ cue, noun, article, answer }`.

Worksheet mode checks one section at a time, highlights wrong answers, counts corrections, and tracks completed items. It does not use the simple-mode badge scoring.

### Two-Stage Quiz Mode

Use `mode: 'two-stage-quiz'`. The current implementation is `EnglishIrregularSelectedQuiz`.

Entries have this shape:

```js
{
  prompt,
  stages: [
    { promptLabelKey, answer },
    { promptLabelKey, answer }
  ]
}
```

`answer` may be a string or an array of accepted answers. The component supports prefix matching, shared-next-letter hints, a submit key between stages, retry scheduling, and the same 3/1/0 scoring model as simple mode.

## Keyboard Behavior

`CanvasKeyboard.jsx` is central to both pointer and physical keyboard input.

- Keyboard rows are arrays of uppercase display/input tokens.
- `SUBMIT_KEY` is the internal submit token and displays as a check mark.
- Pointer input uses canvas hit detection with a larger priority radius around the expected key.
- Physical keyboard input is attached once to `window` and reads live props through refs.
- Enter maps to `SUBMIT_KEY` only when a submit key is available.
- Space maps to the literal space token and prevents page scroll.
- The canvas checks `document.documentElement.classList.contains('dark')` for dark-mode colors.

When changing keyboard behavior, verify pointer input, physical input, mobile sizing, special characters, spaces, submit, and disabled/locked states.

## Data And Localization Rules

- Add new test sets in `src/data/testSets.js`; put larger data arrays in their own `src/data/*.js` module.
- Every `titleKey`, `descriptionKey`, `promptLabelKey`, and UI string used by components must exist in both `cs.json` and `en.json`.
- Entry-level `keyboardRows` and `promptLabelKey` override the test-set defaults.
- Keep keyboard tokens in the same normalized format expected by the component. The simple German flow preserves `ß`; most other letters are uppercased by locale-aware normalization.
- Use `Array.from(...)` for answer characters when touching answer-length or character-position logic, because the app handles accented characters and special letters.

## Styling Conventions

- Prefer Tailwind utility classes in JSX. Global CSS is minimal and currently only imports Tailwind.
- Use existing visual language: slate surfaces, blue primary accents, green success, amber/orange mistakes, red hints/wrong attempts, responsive card-like quiz panels.
- Icons come from `lucide-react`.
- The UI is the app itself, not a marketing site. Keep screens focused on quiz workflows.
- There is dark-mode styling throughout, but no in-app dark-mode toggle.

## Development Notes

- This is a JavaScript project, not TypeScript.
- React state updates are immutable; clone `Set` instances before setting them.
- `dist/` is build output. Do not hand-edit it.
- `node_modules/` is present locally but should not be edited.
- `package-lock.json` is the npm lockfile; keep it in sync if dependencies change.
- Because there are no tests, behavior changes should be checked manually in the browser after `npm run dev`, especially across the three quiz modes.
