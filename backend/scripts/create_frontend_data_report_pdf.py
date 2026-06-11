from pathlib import Path

from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "docs"
PDF_PATH = OUT_DIR / "ESG_Momentum_Radar_Data_Report.pdf"


def make_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#18324a"),
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#5b6773"),
            spaceAfter=18,
        ),
        "h1": ParagraphStyle(
            "Heading1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#18324a"),
            spaceBefore=8,
            spaceAfter=7,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.2,
            leading=13,
            textColor=colors.HexColor("#1f2933"),
            spaceAfter=8,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.6,
            leading=10,
            textColor=colors.HexColor("#1f2933"),
        ),
        "mono": ParagraphStyle(
            "Mono",
            parent=base["BodyText"],
            fontName="Courier",
            fontSize=7.3,
            leading=9.5,
            textColor=colors.HexColor("#1f2933"),
        ),
    }


def p(text, style):
    return Paragraph(text.replace("&", "&amp;"), style)


def table(data, widths, styles):
    wrapped = []
    for row_index, row in enumerate(data):
        row_style = styles["small"] if row_index else styles["small"]
        wrapped.append([p(str(cell), row_style) for cell in row])
    t = Table(wrapped, colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e9f0f5")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#18324a")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5df")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fbfcfd")]),
            ]
        )
    )
    return t


def build_pdf():
    OUT_DIR.mkdir(exist_ok=True)
    styles = make_styles()
    story = []

    story.append(p("ESG Momentum Radar Data Workflow Report", styles["title"]))
    story.append(
        p(
            "Prepared for frontend handoff | Prototype data layer | Time window: 2025-06-10 to 2026-06-10",
            styles["subtitle"],
        )
    )
    story.append(p("Summary", styles["h1"]))
    story.append(
        p(
            "We built the ESG Momentum Radar data workflow up to the structured dataset stage for the hackathon prototype. "
            "The workflow starts from a manually curated list of Singapore-focused companies and source URLs, uses Firecrawl "
            "for live one-time collection where pages can be scraped reliably, stores the collected text in a raw source JSON "
            "database, filters the raw text into evidence-backed ESG signals across Environmental, Social, and Governance, "
            "then aggregates those signals into company-level datasets and quarterly evidence-trend outputs for the future "
            "frontend. The pipeline also includes validation and a QA feedback loop to catch hidden consistency issues such "
            "as missing ESG coverage, invalid source references, non-matching evidence quotes, wrong time windows, and trend "
            "or dataset totals that do not match the underlying signal rows. The frontend has not been implemented yet; these "
            "JSON files are the current data endpoints to consume.",
            styles["body"],
        )
    )

    story.append(p("Pipeline Commands", styles["h1"]))
    story.append(
        table(
            [
                ["Command", "Purpose"],
                ["npm run collect", "Runs Firecrawl/live collection or transparent seed fallback into raw_sources.json."],
                ["npm run extract", "Filters raw source text into row-level ESG signals."],
                ["npm run dataset", "Builds company-level structured ESG dataset for dashboard use."],
                ["npm run trends", "Builds quarterly evidence trend points."],
                ["npm run pipeline", "Runs collect -> extract -> dataset -> trends."],
                ["npm run validate", "Validates references, time windows, evidence quotes, and output shape."],
                ["npm run qa", "Runs the deeper feedback-loop QA checks."],
                ["npm run check", "Runs TypeScript type checking."],
            ],
            [1.55 * inch, 5.65 * inch],
            styles,
        )
    )

    story.append(Spacer(1, 8))
    story.append(p("Frontend Data Endpoints", styles["h1"]))
    story.append(
        table(
            [
                ["JSON endpoint", "Frontend use", "Important keys"],
                [
                    "data/structured_esg_dataset.json",
                    "Main dashboard data: company cards, ranking table, E/S/G breakdown, summary metrics, top evidence.",
                    "company_id, company_name, sector, sgx_identifier, time_window, total_signal_count, total_signal_score, average_confidence, source_count, source_platform_counts, category_breakdown, top_evidence, dataset_disclaimer",
                ],
                [
                    "data/structured_esg_signals.json",
                    "Evidence panel and drilldowns: individual ESG signals with source-backed quotes.",
                    "signal_id, company_id, source_id, esg_category, signal_tags, signal_direction, signal_strength, confidence, time_relevance, evidence_summary, evidence_quote, source_reliability, weighted_signal_score, published_date, time_window, source_platform, url, prototype_disclaimer",
                ],
                [
                    "data/trend_output.json",
                    "Trend charts: quarterly evidence signal movement by company and E/S/G category.",
                    "company_id, company_name, sector, period, period_start, period_end, environmental_score, social_score, governance_score, total_signal_score, environmental_signal_count, social_signal_count, governance_signal_count, positive_signal_count, negative_signal_count, confidence, source_count, trend_disclaimer",
                ],
                [
                    "data/raw_sources.json",
                    "Source provenance and debugging: raw scraped or fallback text.",
                    "source_id, seed_id, company_id, source_platform, url, title, source_type, scraped_at, raw_text, extraction_status, content_hash, source_reliability, published_date, collection_window, firecrawl_metadata",
                ],
                [
                    "data/companies.json",
                    "Company metadata and labels.",
                    "company_id, name, sector, sgx_identifier, website, initial_esg_score, historical_esg_scores, prototype_note",
                ],
                [
                    "data/collection_scope.json",
                    "Display scope, collection window, source priorities, and ESG dimension definitions.",
                    "window_start, window_end, window_label, companies, platform_priority, esg_dimensions",
                ],
            ],
            [1.75 * inch, 2.1 * inch, 3.35 * inch],
            styles,
        )
    )

    story.append(Spacer(1, 8))
    story.append(p("Environment Keys", styles["h1"]))
    story.append(
        table(
            [
                ["Key", "Current role", "Frontend exposure"],
                [
                    "FIRECRAWL_API_KEY",
                    "Used by the local/backend collection script when COLLECTION_MODE=live. It must stay in .env.",
                    "Do not expose in frontend.",
                ],
                [
                    "COLLECTION_MODE",
                    "live means the collector calls Firecrawl; mock uses seeded prototype text.",
                    "Not needed in frontend.",
                ],
                [
                    "AI_EXTRACTION_MODE",
                    "mock currently; extraction is rules-based. live would require OPENAI_API_KEY.",
                    "Not needed in frontend.",
                ],
                [
                    "OPENAI_API_KEY",
                    "Currently blank/not required. Only needed if AI_EXTRACTION_MODE=live later.",
                    "Do not expose in frontend.",
                ],
                [
                    "OPENAI_MODEL",
                    "Default model name for future live AI extraction.",
                    "Not needed in frontend.",
                ],
            ],
            [1.45 * inch, 3.8 * inch, 1.95 * inch],
            styles,
        )
    )

    story.append(Spacer(1, 8))
    story.append(p("Current QA Status", styles["h1"]))
    story.append(
        table(
            [
                ["Check", "Latest result"],
                ["Companies", "10"],
                ["Seeds / raw sources", "40 / 40"],
                ["Structured ESG signals", "75"],
                ["Structured company dataset rows", "10"],
                ["Trend points", "21"],
                ["Core ESG categories", "Environmental: 26, Social: 19, Governance: 30"],
                ["Raw source statuses", "skipped_unchanged=18, fallback_seeded=22"],
                ["QA feedback loop", "0 errors, 0 warnings"],
                ["Security audit", "0 vulnerabilities"],
            ],
            [2.0 * inch, 5.2 * inch],
            styles,
        )
    )

    story.append(Spacer(1, 8))
    story.append(p("Frontend Consumption Recommendation", styles["h1"]))
    story.append(
        p(
            "For the first frontend version, use structured_esg_dataset.json for the dashboard overview and ranking table, "
            "structured_esg_signals.json for evidence panels and company drilldowns, and trend_output.json for quarterly "
            "trend visuals. The Firecrawl key and any future OpenAI key must remain server-side or local-only; the frontend "
            "should consume generated JSON data, not call external scraping or AI services directly.",
            styles["body"],
        )
    )

    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=LETTER,
        rightMargin=0.65 * inch,
        leftMargin=0.65 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.65 * inch,
        title="ESG Momentum Radar Data Workflow Report",
        author="Codex",
    )
    doc.build(story)


def verify_pdf():
    reader = PdfReader(str(PDF_PATH))
    if len(reader.pages) < 1:
        raise RuntimeError("PDF verification failed: no pages produced.")
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    required = [
        "ESG Momentum Radar Data Workflow Report",
        "data/structured_esg_dataset.json",
        "FIRECRAWL_API_KEY",
        "Environmental",
        "Governance",
    ]
    missing = [item for item in required if item not in text]
    if missing:
        raise RuntimeError(f"PDF verification failed; missing text: {missing}")
    print(f"Created {PDF_PATH}")
    print(f"Pages: {len(reader.pages)}")


if __name__ == "__main__":
    build_pdf()
    verify_pdf()
