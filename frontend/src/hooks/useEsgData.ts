import { useEffect, useState } from "react";
import type {
  CollectionScope,
  Company,
  EsgDataBundle,
  EsgSignal,
  EsgTrendPoint,
  StructuredEsgCompanyDataset,
} from "../types/esg";

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Unable to load ${path}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function useEsgData() {
  const [data, setData] = useState<EsgDataBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        const [dataset, signals, trends, companies, scope] = await Promise.all([
          fetchJson<StructuredEsgCompanyDataset[]>("/data/structured_esg_dataset.json"),
          fetchJson<EsgSignal[]>("/data/structured_esg_signals.json"),
          fetchJson<EsgTrendPoint[]>("/data/trend_output.json"),
          fetchJson<Company[]>("/data/companies.json"),
          fetchJson<CollectionScope>("/data/collection_scope.json"),
        ]);

        if (active) {
          setData({ dataset, signals, trends, companies, scope });
          setError(null);
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Unable to load ESG data.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  return { data, error, loading };
}
