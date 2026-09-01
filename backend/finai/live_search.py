from __future__ import annotations

import logging
from duckduckgo_search import DDGS

logger = logging.getLogger(__name__)

OFFICIAL_FALLBACKS = [
    {
        "title": "CBIC Central Tax Notifications & Circulars 2024-2025",
        "url": "https://cbic-gst.gov.in/central-tax-notifications.html",
        "snippet": "Official notifications regarding GST rate revisions, ITC rules, and return filing advisories issued by CBIC.",
        "citation_tag": "CBIC Official Portal",
    },
    {
        "title": "Income Tax Department — Section 115BAC & Slabs (Finance Act 2024)",
        "url": "https://www.incometax.gov.in/iec/foportal/latest-news",
        "snippet": "New tax regime revisions under Section 115BAC: standard deduction increased to ₹75,000, 87A rebate revised.",
        "citation_tag": "Income Tax Dept",
    },
    {
        "title": "GST Council Recommendation on ITC and Blocked Credits (Section 17(5))",
        "url": "https://gstcouncil.gov.in/",
        "snippet": "Clarification on input tax credit restrictions on motor vehicles, employee benefits, and works contract services.",
        "citation_tag": "GST Council Advisory",
    },
]


def search_tax_statutes(query: str, max_results: int = 4) -> list[dict]:
    """
    Live web search for Indian statutory tax guidelines, circulars, and notifications.
    Returns structured list with title, URL, snippet, and citation tag.
    """
    enhanced_query = f"{query} India tax GST CBIC incometax site:gov.in OR site:cleartax.in"
    results = []
    try:
        with DDGS(timeout=2) as ddgs:
            raw_results = list(ddgs.text(enhanced_query, max_results=max_results))
            for item in raw_results:
                title = item.get("title", "Statutory Reference")
                url = item.get("href", "")
                body = item.get("body", "")

                # Assign citation tag based on domain
                tag = "Statutory Guideline"
                if "cbic" in url:
                    tag = "CBIC Central Circular"
                elif "incometax" in url:
                    tag = "Income Tax Section 115BAC"
                elif "gstcouncil" in url:
                    tag = "GST Council Recommendation"
                elif "cleartax" in url:
                    tag = "ClearTax Statutory Digest"
                elif "taxmann" in url:
                    tag = "Taxmann Case Law"

                results.append({
                    "title": title,
                    "url": url,
                    "snippet": body[:220] + "..." if len(body) > 220 else body,
                    "citation_tag": tag,
                })
    except Exception as e:
        logger.warning(f"DuckDuckGo search error: {e}")

    if not results:
        results = OFFICIAL_FALLBACKS[:max_results]

    return results
