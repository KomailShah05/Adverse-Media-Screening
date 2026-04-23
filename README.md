# Screening Task

First of all, if you are reading this then congrats! The Arva team thinks you have potential to be a great fit for the role.

The purpose of this task is to assess your ability to apply your full stack engineering and AI knowledge to a real world task and deliver value quickly. You have one week to complete this task. We expect you to spend a few hours (but not days) on it.

Please read this document carefully in full before starting your solution!

## Background

When an individual signs up for a regulated financial service e.g. a bank account, one of the checks that an analyst will typically have to perform is adverse media screening. This means performing a search for news articles that portray the entity in a negative light, e.g. lawsuits, scandals, bankruptcies. They will often use a data provider to surface these results, but those tools have very fuzzy matching leading to the analyst having to manually review a large number of false positives. They must justify why the article is or is not about their applicant by checking whether details such as name, date of birth or occupation are a likely match.

## Part 1

You have been tasked with building an MVP tool where an analyst can provide the name and optionally date of birth of an individual and the URL of a news article and the tool should determine:

- Whether or this person is a match to the individual described in the article, and
- If so, whether the article describes the person in a positive or negative light

You have been given a template as a starting point which performs a very simple web scrape and string comparison. You must flesh out this implementation to build a more effective tool.

You can run the existing app by running `npm i` followed by `npm run dev`. If you add any additional steps e.g. required environment variables, please update these instructions.

You should approach this task carefully as you want to maximise the number of articles that can be discarded before they reach the analyst but cannot allow false negatives.

Since this is in a regulated context, you should also ensure that your output is explainable and auditable.

### Evaluation Criteria

We'll assess your solution based on:

- **Effectiveness**: Is what you have built an effective classifier?
- **Code quality**: Have you written clean, maintainable, and well-documented code?
- **User experience**: Is what you have built intuitive for a compliance analyst to use?
- **Explainability**: Is the result of your tool auditable and explainable?

You may receive additional credit for exploring a little further than what is explicitly stated above in whichever direction you find interesting.

## Part 2

Sometimes key details required to discount an article (such as middle names or dates of birth) are missing from the article itself but may be found by performing additional web research. Please include in your submission a detailed plan for how you might implement the automation of this additional enrichment. You are not required to actually implement this.

## Tools

It is up to you what tools you use to complete your solution. You may choose to use any of the current frontier or open source LLM providers such as OpenAI, Anthropic, Google or Huggingface. NB: DO NOT send us any API keys, assume that we have our own that we can use to test your tool.

**NOTE: You are welcome to use AI tools to help build your solution (Cursor, Copilot etc.) but please ensure that you understand the code you have written and are able to justify the decisions that you made. If your solution is identical to what Claude Code produces when given this task you probably have not put enough thought into it. Aim to build something that you feel fairly represents your full stack skills and that you are proud of.**

Once you have completed the task, please push to your classroom branch and notify us by emailing oli@arva.ai. Please include your GitHub username in this email so we can match it up to your application!

Have fun!

---

## My Solution

### Setup

```bash
npm install
cp .env.example .env.local   # add your OPENAI_API_KEY
npm run dev
```

### How it works

Two-stage pipeline per screening request:

1. **Scrape** — fetches the article URL server-side, strips markup with Cheerio, detects paywalls. If the article can't be extracted, the analyst can paste the text manually.
2. **Analyse** — sends the extracted text + subject details to GPT-4o via OpenAI function calling, which returns structured JSON (match, confidence, sentiment, evidence quotes, identifying details).
3. **Recommend** — a deterministic rule derives `DISCARD / REVIEW / ESCALATE` from the LLM output so the final verdict is always explainable and auditable.

### Architecture

| Layer | Tech | Notes |
|-------|------|-------|
| Framework | Next.js 15 App Router | Server + client components |
| API | tRPC v11 | End-to-end type safety |
| LLM | GPT-4o (OpenAI) | Function calling for structured output |
| Validation | Zod | Separate schemas for LLM parsing vs tRPC output |
| UI | Mantine v7 | Accessible component library |
| State | React Context + custom hooks | `useScreening` state machine, `useFocusEffect` |

### Key technical decisions

**Security**
- SSRF protection — blocks RFC-1918 ranges and enforces HTTPS-only URLs
- In-memory rate limiting (10 req/min per IP) via tRPC middleware
- Security headers — CSP, X-Frame-Options, Referrer-Policy

**Reliability**
- Article text cached 1 hr, screening results cached 24 hr (`unstable_cache`)
- Zod validates every LLM response field — malformed output is rejected, not silently passed through
- `isMountedRef` guard prevents state updates after component unmount
- Mutation cleanup on unmount so in-flight callbacks can't fire on stale components

**Frontend patterns**
- `useTransition` wraps all state transitions (React 19)
- `useDeferredValue` defers the result render to keep transitions responsive
- `useFocusEffect` — custom hook that focuses a container when its view activates and restores the previous focus element when it deactivates (keyboard accessibility)
- All components wrapped in `React.memo`, all handlers in `useCallback`, computed values in `useMemo`
- Context API eliminates prop drilling; domain components consume context directly via `use()` (React 19)

**Accessibility**
- ARIA live region (`aria-live="assertive"`) announces every view transition to screen readers
- Skip navigation link for keyboard users
- Focus is managed on every state change — result, paywall, and error containers all receive focus automatically

### Part 2 — Enrichment plan

When key identifying details (DOB, occupation, nationality) are missing from an article, confidence drops and the case lands in `REVIEW`. The enrichment step would resolve this automatically:

1. **Trigger** — after the initial screening, if `confidence !== "HIGH"` and one or more identifying fields are null, queue an enrichment job.
2. **Web research** — run parallel searches against public sources (Wikipedia, LinkedIn public profiles, Companies House, sanctions lists) using GPT-4o with web search tools or a dedicated search API (Tavily / Brave Search).
3. **Merge** — combine enriched details with the original article analysis and re-run `deriveRecommendation`. If the new details resolve the ambiguity, the case may upgrade from `REVIEW` to `DISCARD` or `ESCALATE` without analyst involvement.
4. **Audit trail** — the audit summary would record which details were found via enrichment vs the original article, keeping the result fully explainable.
5. **Implementation** — a second tRPC mutation (`enrichSubject`) called automatically after `analyseArticle` when enrichment is warranted, with its own 24 hr cache keyed on `name + dateOfBirth`.
