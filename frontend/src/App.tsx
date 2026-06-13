import { Dashboard } from "./pages/Dashboard";
import { CompanyDetail } from "./pages/CompanyDetail";
import { RiskRadar } from "./pages/RiskRadar";
import { Investment } from "./pages/Investment";
import { Watchlist } from "./pages/Watchlist";
import { useRoute } from "./routes/router";

export default function App() {
  const route = useRoute();
  if (route.name === "company") return <CompanyDetail companyId={route.companyId} />;
  if (route.name === "risk-radar") return <RiskRadar />;
  if (route.name === "investment") return <Investment />;
  if (route.name === "watchlist") return <Watchlist />;
  return <Dashboard />;
}
