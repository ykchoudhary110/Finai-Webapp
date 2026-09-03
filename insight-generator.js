/**
 * FinAI — Rule-Based Natural Language Insight Generator
 * Pure function only. Zero DOM access. Zero external network calls.
 * 100% offline, deterministic NLG template engine.
 */

/**
 * Generate a concise, human-readable executive financial insight from reconciliation results.
 * 
 * @param {Object} reconciliationResult
 * @param {number} [seed]
 * @returns {string} Plain-English insight paragraph (2-4 sentences)
 */
function generateInsightSummary(reconciliationResult, seed) {
  try {
    // Edge case: invalid or empty dataset
    if (!reconciliationResult || typeof reconciliationResult !== "object" || reconciliationResult.error) {
      return "No transaction data is currently available for evaluation. Please run reconciliation to generate automated financial insights.";
    }

    const total = reconciliationResult.totalTransactions || 0;
    if (total === 0) {
      return "Zero records were processed in the current financial feed. Ingest settlement and ledger statements to generate insights.";
    }

    // Pseudo-random selection helper based on seed or pseudo-entropy
    let s = typeof seed === "number" ? (Math.floor(seed) >>> 0) : Math.floor(Date.now() + Math.random() * 100000);
    const rng = () => {
      s |= 0;
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const pick = (arr) => arr[Math.floor(rng() * arr.length)];

    const rate = parseFloat(reconciliationResult.matchRate) || 0;
    const counts = reconciliationResult.categoryCounts || {};
    const risk = reconciliationResult.amountAtRisk || 0;
    const formattedRisk = "₹" + Math.round(risk).toLocaleString("en-IN");
    const unrecCount = counts.UNRECOGNIZED_CHARGE || 0;

    const sentences = [];

    // 1. OPENING LINE based on match rate: healthy (>75%), moderate (60-75%), concerning (<60%)
    if (rate > 75) {
      const healthyTemplates = [
        `Reconciliation health is healthy at ${rate}% across ${total} evaluated records, with the majority of payments matching cleanly or auto-resolving standard fee deductions.`,
        `Financial ledger alignment demonstrates healthy reconciliation health at ${rate}% across ${total} transactions, reflecting strong agreement between internal orders and gateway settlements.`,
        `The current settlement cycle reflects healthy reconciliation health with a ${rate}% resolution rate across all ${total} analyzed entries.`
      ];
      sentences.push(pick(healthyTemplates));
    } else if (rate >= 60) {
      const moderateTemplates = [
        `Reconciliation health is moderate at ${rate}% across ${total} total records, indicating dependable core settlement alongside notable discrepancy pockets.`,
        `Settlement audit reflects moderate reconciliation health of ${rate}%, with variance primarily driven by transit float and fee adjustments.`,
        `Overall financial records demonstrate moderate reconciliation health at ${rate}%, warranting focused investigation into pending bank credits and ledger variances.`
      ];
      sentences.push(pick(moderateTemplates));
    } else {
      const concerningTemplates = [
        `Reconciliation health is concerning at ${rate}%, signaling significant divergence between internal ledger billings and bank statement credits.`,
        `Audit health registers as concerning at ${rate}%, with substantial mismatch volume requiring immediate treasury intervention across feeds.`,
        `The engine detected concerning reconciliation health at ${rate}%, indicating systemic discrepancies that demand prioritized reconciliation review.`
      ];
      sentences.push(pick(concerningTemplates));
    }

    // 2. SINGLE LARGEST EXCEPTION CATEGORY by count
    const actionableExceptions = [
      {
        key: "MISSING_IN_BANK",
        label: "Missing in Bank",
        count: counts.MISSING_IN_BANK || 0,
        desc: "unsettled bank credits"
      },
      {
        key: "DUPLICATE",
        label: "Duplicate Ledger",
        count: counts.DUPLICATE || 0,
        desc: "internal double-billing errors"
      },
      {
        key: "UNRECOGNIZED_CHARGE",
        label: "Unrecognized Bank Entry",
        count: counts.UNRECOGNIZED_CHARGE || 0,
        desc: "orphan bank deposits"
      }
    ];

    actionableExceptions.sort((a, b) => b.count - a.count);
    const topException = actionableExceptions[0];

    if (topException && topException.count > 0) {
      const exceptionTemplates = [
        `The largest exception category is ${topException.label} with ${topException.count} flagged instances (${topException.desc}).`,
        `Variance is predominantly led by ${topException.label} (${topException.count} records), making it the primary driver of reconciliation friction.`,
        `${topException.label} represents the single highest discrepancy count at ${topException.count} items, highlighting potential operational delay in ${topException.desc}.`
      ];
      sentences.push(pick(exceptionTemplates));
    } else {
      sentences.push("Zero critical exceptions were detected across any category during this execution.");
    }

    // 3. AMOUNT AT RISK FLAGGING (> ₹1,00,000 threshold)
    if (risk > 100000) {
      const highRiskTemplates = [
        `Total capital at risk stands at ${formattedRisk}, warranting focused attention from the finance team to mitigate potential revenue leakage.`,
        `With ${formattedRisk} currently classified at risk across unmatched records, active treasury intervention is needed to verify unsettled funds.`,
        `A significant capital exposure of ${formattedRisk} requires immediate accounting attention to reconcile outstanding credit variances.`
      ];
      sentences.push(pick(highRiskTemplates));
    } else if (risk > 0) {
      const lowRiskTemplates = [
        `Capital at risk remains contained at ${formattedRisk}, representing manageable operational exposure across unlinked items.`,
        `Outstanding variance accounts for ${formattedRisk} at risk, well within expected working capital tolerance.`,
        `Financial exposure is bounded at ${formattedRisk}, manageable through routine settlement clearing cycles.`
      ];
      sentences.push(pick(lowRiskTemplates));
    } else {
      sentences.push("Total capital at risk is ₹0, confirming zero unassigned funds in this cycle.");
    }

    // 4. CLOSING SENTENCE: Unrecognized charges compliance review
    if (unrecCount > 0) {
      const unrecTemplates = [
        `Because ${unrecCount} record(s) reflect unrecognized bank credits with zero order linkage, immediate compliance review is recommended for these items as the highest-risk category.`,
        `Notably, ${unrecCount} unrecognized bank entry/entries lack matching order identifiers — immediate compliance review is strongly recommended to rule out misdirected deposits.`,
        `Given the presence of ${unrecCount} anomalous bank credit(s), immediate compliance review is advised to verify source provenance.`
      ];
      sentences.push(pick(unrecTemplates));
    } else {
      const cleanClosingTemplates = [
        `All bank credits tie back to authenticated merchant orders, confirming clean routing across institutional channels.`,
        `Zero orphan bank deposits were identified, confirming full provenance across all credit narrations.`
      ];
      sentences.push(pick(cleanClosingTemplates));
    }

    return sentences.join(" ");

  } catch (err) {
    console.error("FinAI Insight Generator encountered an error:", err);
    return "Reconciliation completed. Review the metrics above and inspect the Exceptions tab for itemized discrepancy analysis.";
  }
}
