import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { buildCompanyAnalytics } from "./lib/analytics";
import { useEsgData } from "./hooks/useEsgData";
import { useRoute } from "./routes/router";
import { Layout } from "./components/Layout";
import { LoadingState } from "./components/LoadingState";
import { Dashboard } from "./pages/Dashboard";
import { CompanyDetail } from "./pages/CompanyDetail";
import { EvidenceExplorer } from "./pages/EvidenceExplorer";

export default function App() {
  const route = useRoute();
  const { data, error, loading } = useEsgData();
  const analytics = useMemo(() => (data ? buildCompanyAnalytics(data) : []), [data]);

  if (loading) return <LoadingState />;

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-midnight px-4">
        <div className="glass-panel max-w-xl rounded-xl p-6">
          <AlertTriangle className="mb-3 h-8 w-8 text-warning" />
          <h1 className="text-lg font-semibold text-white">Unable to load static ESG data</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">{error ?? "Run npm run frontend:sync-data before starting the frontend."}</p>
        </div>
      </div>
    );
  }

  return (
    <Layout route={route}>
      {route.name === "dashboard" ? <Dashboard data={data} analytics={analytics} /> : null}
      {route.name === "evidence" ? <EvidenceExplorer data={data} /> : null}
      {route.name === "company" ? (
        <CompanyDetail data={data} analytics={analytics.find((item) => item.company.company_id === route.companyId)} />
      ) : null}
    </Layout>
  );
}
