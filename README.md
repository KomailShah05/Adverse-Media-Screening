# Adverse Media Screening

Adverse Media Screening is an AI-assisted compliance tool for reviewing whether a news article is relevant to a specific individual and whether the coverage contains adverse media risk.

The product is designed for analyst workflows where false positives create manual review burden, but false negatives cannot be allowed. It combines article extraction, structured LLM analysis, deterministic recommendation rules, and an auditable evidence trail so each result can be reviewed and justified.

## Demo

https://www.loom.com/share/2d836814edbb44a88aa6aaee40824fd3

## What It Does

Analysts enter a subject's name, optional date of birth, and a news article URL. The tool then:

- Extracts readable article text from the URL
- Handles paywalled or inaccessible articles with a manual text fallback
- Checks whether the article appears to describe the same individual
- Assesses whether the article sentiment is positive, neutral, or negative
- Highlights identifying details and supporting evidence
- Produces a clear recommendation: `DISCARD`, `REVIEW`, or `ESCALATE`

The final decision is intentionally rule-based rather than purely generative, keeping the output explainable and consistent.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add your OpenAI API key to `.env.local`:

```bash
OPENAI_API_KEY=your_api_key_here
```

Open the app at:

```bash
http://localhost:3000
```

## How It Works

Each screening request runs through a three-step pipeline:

1. **Scrape**: The server fetches the article URL, strips markup with Cheerio, extracts readable text, and detects paywall-style failures.
2. **Analyse**: The article text and subject details are sent to GPT-4o using structured function calling. The model returns JSON containing match status, confidence, sentiment, evidence quotes, and identifying details.
3. **Recommend**: A deterministic rules layer derives `DISCARD`, `REVIEW`, or `ESCALATE` from the structured analysis.

This keeps the LLM focused on interpretation while the product owns the final operational decision.

## Architecture

| Layer | Tech | Notes |
|-------|------|-------|
| Framework | Next.js 15 App Router | Server and client components |
| API | tRPC v11 | End-to-end type safety |
| LLM | GPT-4o via OpenAI | Structured function calling |
| Validation | Zod | Validates tRPC inputs and LLM output |
| UI | Mantine v7 | Accessible component primitives |
| State | React Context and custom hooks | Screening state machine and focus management |
| Tests | Vitest | Unit coverage for screening logic and URL validation |

## Product Principles

### Explainability

Every recommendation includes structured reasoning, confidence, sentiment, evidence snippets, and extracted identifying details. This gives analysts a clear trail for why a case was discarded, reviewed, or escalated.

### Safety

The URL ingestion layer includes SSRF protection, HTTPS-only validation, private IP blocking, rate limiting, and security headers. Malformed model responses are rejected with Zod rather than silently accepted.

### Analyst Experience

The interface is built around a focused screening flow: submit details, track progress, review evidence, and act on the recommendation. Paywall and extraction failures move into a manual fallback instead of blocking the analyst.

### Accessibility

The app includes ARIA live updates, skip navigation, and focus management across form, progress, error, paywall, and result views.

## Key Features

- AI-assisted identity matching between a subject and article content
- Adverse, neutral, or positive media classification
- Deterministic recommendation layer
- Evidence-backed audit summary
- Paywall/manual text fallback
- Server-side article extraction and caching
- Rate limiting and SSRF protection
- Keyboard and screen-reader friendly UI states

## Scripts

```bash
npm run dev             # Start local development server
npm run build           # Build for production
npm run start           # Start production server
npm run typecheck       # Run TypeScript checks
npm run test            # Run unit tests
npm run test:coverage   # Run tests with coverage
npm run format:check    # Check formatting
npm run format:write    # Format files
```

## Enrichment Roadmap

Some articles do not contain enough identifying information to confidently discard or escalate a case. A future enrichment workflow could automatically research missing details such as middle names, date of birth, occupation, nationality, or company associations.

Planned approach:

1. Trigger enrichment when initial confidence is below `HIGH` and key identifiers are missing.
2. Search trusted public sources such as Wikipedia, Companies House, sanctions lists, and public professional profiles.
3. Merge enriched identifiers with the original article analysis.
4. Re-run the deterministic recommendation layer.
5. Record which details came from the original article and which came from enrichment for auditability.

## License

This project is private and intended for demonstration and evaluation purposes.
