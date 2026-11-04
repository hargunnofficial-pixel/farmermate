# FarmerMate: AI farm adviser

A FarmerChat-style AI agronomist for small farmers. It's built as a TKS Focus **Build** project by Hargunn Bassi.

- **Ask anything**: chat with an AI agronomist in English or Hindi, by typing or speaking.
- **Knows your farm**: every answer uses your exact location's 7-day weather forecast and your crops.
- **Scan a leaf**: take a photo and get the likely disease or pest, how sure the AI is, and what to do.
- **Trusted guides (RAG)**: answers are grounded in a built-in library of farming guides, and it shows the source.
- **Weather alerts**: rain, wind, heat, frost and fungal-risk warnings, plus the best spray window.
- **Free to run**: Gemini API free tier, Open-Meteo weather (no key), Vercel free hosting.

---

## How it works

```
Phone (public/)                        Server (api/)                         Google Gemini
─────────────────                      ─────────────────                     ─────────────
Setup: location + crops ──┐
Open-Meteo weather ───────┤
Question / leaf photo ────┴─► POST /api/chat or /api/scan
                                │ 1. validate input (lib/validate.js)
                                │ 2. RAG: BM25 search over farming guides
                                │    (lib/rag.js + lib/knowledge.js)
                                │ 3. build hidden system prompt with
                                │    weather + crops + top guides (lib/prompt.js)
                                └─► 4. call Gemini (lib/gemini.js) ─────────► answer / JSON diagnosis
                              ◄── reply + sources ◄──────────────────────────┘
```

**Why a server?** The Gemini API key has to stay secret. If it lived in the app, anyone could copy it and use up your free quota. So the app talks to our small server, and only the server talks to Gemini.

**What is RAG?** RAG stands for Retrieval-Augmented Generation. Before asking Gemini, the server searches the knowledge base (`lib/knowledge.js`) using **BM25**, the same ranking formula classic search engines use. It then pastes the best-matching guides into the prompt. Gemini answers *from those guides* rather than only from memory, so it makes fewer mistakes and the app can show where the advice came from. Hindi questions work too, because common Hindi farm words are mapped to English (`HINDI_MAP` in `lib/rag.js`).

**Leaf scan:** the photo is shrunk on the phone to 1024 px (fast, and it stays inside free limits). Gemini is then asked for a **structured JSON answer** with fixed fields: issue, severity, confidence, steps and so on. That way the app can always show a clean result card.

---

## Run it on your laptop

1. Install **Node.js** (version 18 or newer) from https://nodejs.org (pick "LTS").
2. Get a free Gemini API key: go to https://aistudio.google.com/app/apikey, sign in with Google and click **Create API key**.
3. In this folder, copy `.env.example` to a new file called `.env` and paste your key:
   ```
   GEMINI_API_KEY=your-key-here
   ```
4. Open Terminal in this folder and run:
   ```
   npm start
   ```
5. Open http://localhost:3000. You can also open it on your phone if it's on the same Wi-Fi, using your laptop's IP address.

No `npm install` is needed. The app has zero dependencies.

## Put it online (free) with Vercel

1. Make a free account at https://vercel.com.
2. Upload this folder: either push it to GitHub and click **Add New → Project → Import**, or run `npx vercel` in this folder.
3. In the Vercel project, go to **Settings → Environment Variables**, add `GEMINI_API_KEY` with your key and `ACCESS_PASSWORD` with the password you want. Then redeploy.
4. You get a link like `farmermate.vercel.app`. Open it on any phone, then "Add to Home Screen" to use it like an app.

## Password lock

Set `ACCESS_PASSWORD` (on Vercel: Settings → Environment Variables) and everyone has to enter it once before using the app. The check happens **on the server**: the chat and scan APIs refuse every request without the login cookie, so nobody can skip the lock by calling the API directly. Wrong guesses are slowed down. The cookie lasts 30 days. If `ACCESS_PASSWORD` isn't set (e.g. on your laptop), the app stays open.

## Tests

```
npm test
```
There are 14 tests. They check the RAG search (English and Hindi), the chat and scan APIs, input validation, the model fallback, the free-tier limit message, the busy-model fallback and the password lock. A **fake Gemini server** is used, so the tests never spend your real quota.

## Project structure

```
api/chat.js        chat endpoint (RAG + weather context + Gemini)
api/scan.js        leaf photo diagnosis endpoint (structured JSON)
api/login.js       password lock (sets a secure cookie)
lib/gemini.js      Gemini REST client, with fallback model
lib/rag.js         BM25 search + Hindi word mapping
lib/knowledge.js   farming guides (the knowledge base)
lib/prompt.js      system prompt + scan JSON schema
lib/validate.js    input safety checks
lib/auth.js        password + cookie checks
public/            the app (HTML/CSS/JS, English + Hindi)
server.js          local dev server (Vercel runs api/ itself)
test/              automated tests
```

## Honest limitations (good for the write-up)

- The knowledge base is 16 guides written for this prototype from public extension advice (ICAR, state agri universities, FAO IPM). **An agronomist should review them** before real farmers rely on them. This is a perfect question for industry validation.
- AI photo diagnosis can be wrong, especially with blurry photos or diseases that look alike. The app shows a confidence level and points farmers to the Kisan Call Centre (1800-180-1551) or the local KVK for serious problems.
- On the Gemini free tier, Google may use requests to improve its products, and there are per-minute and per-day limits. That's fine for a prototype; a real launch would use the paid tier.
- Chat history is saved only on the user's phone.

## Ideas for the Iterate stage

- Embedding-based search (semantic RAG) and a much bigger knowledge base built from real ICAR crop manuals
- Voice replies (text-to-speech) for farmers who can't read
- More languages (Marathi, Punjabi, Tamil…)
- Connect a DIY weather station / soil sensor so advice uses data from the actual field
- Mandi (market) prices and government scheme info
