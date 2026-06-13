import type { DashboardCompany, EsgCategory } from "../types/esg";

export type CompanyClass = "Future Leaders" | "Hidden Winners" | "Value Traps" | "Overrated Leaders";

export function periodTime(period: string) {
  const match = period.match(/^(\d{4})-H([12])$/);
  if (!match) return 0;
  return Number(match[1]) * 2 + Number(match[2]);
}

export function classifyCompany(company: DashboardCompany, esgThreshold: number, momentumThreshold: number): CompanyClass {
  const highEsg = company.esgScore >= esgThreshold;
  const highMomentum = company.momentum >= momentumThreshold;
  if (highEsg && highMomentum) return "Future Leaders";
  if (!highEsg && highMomentum) return "Hidden Winners";
  if (!highEsg && !highMomentum) return "Value Traps";
  return "Overrated Leaders";
}

export function classificationThresholds(companies: DashboardCompany[]) {
  const minEsg = companies.length ? Math.min(...companies.map((company) => company.esgScore)) : 0;
  const maxEsg = companies.length ? Math.max(...companies.map((company) => company.esgScore)) : 1;
  const minMomentum = companies.length ? Math.min(...companies.map((company) => company.momentum)) : 0;
  const maxMomentum = companies.length ? Math.max(...companies.map((company) => company.momentum)) : 1;
  return {
    minEsg,
    maxEsg,
    minMomentum,
    maxMomentum,
    esgThreshold: (minEsg + maxEsg) / 2,
    momentumThreshold: (minMomentum + maxMomentum) / 2,
  };
}

export function classColor(classification: CompanyClass) {
  if (classification === "Hidden Winners") return "#00a99d";
  if (classification === "Future Leaders") return "#4b91d9";
  if (classification === "Value Traps") return "#f59e0b";
  return "#ef4444";
}

export function classStyles(classification: CompanyClass) {
  if (classification === "Hidden Winners") return "bg-teal-50 text-teal-700";
  if (classification === "Future Leaders") return "bg-blue-50 text-blue-700";
  if (classification === "Value Traps") return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

export function categoryColor(category: EsgCategory) {
  if (category === "Environmental") return "#2BA640";
  if (category === "Social") return "#0071e3";
  return "#f59e0b";
}

export function categoryStyles(category: EsgCategory) {
  if (category === "Environmental") return "bg-emerald-50 text-emerald-700";
  if (category === "Social") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
}
