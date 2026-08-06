# Chinese Handwriting Practice

I built this browser-based exercise for junior-high Chinese character practice. The application contains five units with ten questions each. Students read the Zhuyin prompt, write the corresponding characters and can submit the completed work through Google Classroom.

## Features

- Five editable units with a total of fifty questions.
- Canvas-based handwriting input.
- Browser-side stroke matching with HanziLookupJS.
- Immediate checking against the expected character.
- Optional Google Classroom submission.
- React components separated from question data and service integrations.

## Technology

- React and Vite
- JavaScript
- HanziLookupJS
- Google Classroom integration

Handwriting recognition runs in the browser, so the core exercise does not require a Python backend.

## Run locally

```bash
cp .env.example .env
npm install
npm run dev
```

The development server is available at `http://localhost:5173`. Google Classroom credentials are only required when the submission feature is enabled.

## Question data

The units are defined in `src/data/wordBank.js`, independently of the interface components. This makes it possible to replace the vocabulary or add a new unit without changing the handwriting and scoring logic.
