# ESG Momentum Radar

Prototype repository split into two workspaces:

- `backend/`: TypeScript data pipeline for collection, filtering, structured ESG dataset generation, trend output, validation, and QA.
- `frontend/`: Vite/React dashboard consuming synced JSON files from `frontend/public/data`.

Common commands from the repository root:

```bash
npm run backend:pipeline
npm run frontend:sync-data
npm run frontend:dev
npm run validate
npm run check
```

Use `npm run pipeline` to regenerate backend data and sync frontend JSON in one step.
