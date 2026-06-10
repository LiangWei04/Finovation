# ESG Momentum Radar Data Pipeline

This project implements the first prototype workflow stages only:

```text
Seed Web Collection -> Raw Source Database -> Filtering + AI Signal Extraction -> Structured ESG Signal Dataset
```

No frontend is included yet. The dashboard can be added later after the page designs are ready.

## Setup

```bash
npm install
cp .env.example .env
```

For a stable demo without paid API calls, keep:

```text
COLLECTION_MODE=mock
AI_EXTRACTION_MODE=mock
```

To use live collection, set:

```text
FIRECRAWL_API_KEY=...
COLLECTION_MODE=live
```

To use AI extraction, set:

```text
OPENAI_API_KEY=...
AI_EXTRACTION_MODE=live
```

## Commands

```bash
npm run collect
npm run extract
npm run validate
npm run pipeline
npm run check
```

## Outputs

- `data/raw_sources.json`: raw website/report/job/news text records from Firecrawl or seeded prototype text.
- `data/structured_esg_signals.json`: evidence-backed ESG signals extracted from raw sources.

All generated signals are prototype decision-support data, not investment recommendations.
