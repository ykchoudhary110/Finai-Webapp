/**
 * FinAI — Chart Rendering Component
 * Pure render functions. Takes (container, data) -> injects responsive bar chart & legend.
 * Zero external libraries or network dependencies.
 */

/**
 * Category styling and descriptive metadata
 */
const CATEGORY_META = {
  MATCHED: {
    label: "Clean Matched",
    description: "Exact 1:1 match across Ledger, Settlement & Bank",
    color: "#2E7D5B",
    bgColor: "#E6F2EC",
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2E7D5B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
  },
  FEE_ADJUSTED: {
    label: "Fee Adjusted",
    description: "Razorpay ~2% standard settlement fee deducted",
    color: "#2563EB",
    bgColor: "#EFF6FF",
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>`
  },
  DELAYED_SETTLEMENT: {
    label: "Delayed Settlement",
    description: "Bank credit arrived 1-2 days after ledger date",
    color: "#B8860B",
    bgColor: "#FBF3E1",
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B8860B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`
  },
  DUPLICATE: {
    label: "Duplicate Ledger",
    description: "Same transaction billed twice internally",
    color: "#D97706",
    bgColor: "#FEF3C7",
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`
  },
  MISSING_IN_BANK: {
    label: "Missing in Bank",
    description: "Ledger transaction with no bank credit found",
    color: "#8B5CF6",
    bgColor: "#F3E8FF",
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>`
  },
  UNRECOGNIZED_CHARGE: {
    label: "Unrecognized Bank Entry",
    description: "Bank credit with no matching order or settlement",
    color: "#C0392B",
    bgColor: "#FBEAE8",
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C0392B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`
  }
};

/**
 * Render Horizontal Bar Chart & Legend into the provided container element.
 * 
 * @param {HTMLElement} container
 * @param {Object} categoryCounts
 * @param {number} totalTransactions
 */
function renderBarChart(container, categoryCounts, totalTransactions) {
  try {
    if (!container) return;

    const total = totalTransactions > 0 ? totalTransactions : 1;
    const categories = Object.keys(CATEGORY_META);

    // Find maximum count for proportional scaling
    let maxCount = 1;
    categories.forEach(cat => {
      const cnt = categoryCounts[cat] || 0;
      if (cnt > maxCount) maxCount = cnt;
    });

    let html = `
      <div class="chart-wrapper">
        <div class="chart-header">
          <div class="chart-title-group">
            <h3 class="chart-title">Transaction Classification Breakdown</h3>
            <span class="chart-subtitle">Deterministic categorization of all ${totalTransactions} analyzed records</span>
          </div>
          <div class="chart-badge">
            <span class="pulse-dot"></span> Reconciled in Real-Time
          </div>
        </div>

        <div class="chart-bars-list">
    `;

    categories.forEach((catKey, index) => {
      const meta = CATEGORY_META[catKey];
      const count = categoryCounts[catKey] || 0;
      const pctOfTotal = ((count / total) * 100).toFixed(1);
      // Scale width so the largest bar spans ~85-95% of available track
      const barWidthPct = count > 0 ? Math.max(3, (count / maxCount) * 100) : 0;
      const delayMs = index * 60;

      html += `
        <div class="chart-bar-row" data-category="${catKey}">
          <div class="chart-label-col" title="${meta.description}">
            <span class="category-icon" style="background: ${meta.bgColor};">${meta.icon}</span>
            <span class="category-name">${meta.label}</span>
          </div>

          <div class="chart-track-col">
            <div class="chart-track">
              <div class="chart-fill" 
                   data-final-width="${barWidthPct}%"
                   style="width: 0%; background-color: ${meta.color}; transition-delay: ${delayMs}ms;">
              </div>
            </div>
          </div>

          <div class="chart-value-col">
            <span class="bar-count">${count}</span>
            <span class="bar-pct">(${pctOfTotal}%)</span>
          </div>
        </div>
      `;
    });

    html += `
        </div>

        <div class="chart-legend-row">
    `;

    categories.forEach(catKey => {
      const meta = CATEGORY_META[catKey];
      const count = categoryCounts[catKey] || 0;
      html += `
        <div class="legend-item" title="${meta.description}">
          <span class="legend-dot" style="background-color: ${meta.color};"></span>
          <span class="legend-label">${meta.label}</span>
          <span class="legend-count">${count}</span>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Trigger smooth CSS animation from 0% to final width
    requestAnimationFrame(() => {
      const fills = container.querySelectorAll(".chart-fill");
      fills.forEach(fill => {
        const targetWidth = fill.getAttribute("data-final-width");
        if (targetWidth) {
          fill.style.width = targetWidth;
        }
      });
    });

  } catch (err) {
    console.error("FinAI Chart Renderer encountered an error:", err);
    if (container) {
      container.innerHTML = `
        <div class="chart-error-state">
          <p>Failed to render breakdown chart. Please click "Re-run Reconciliation".</p>
        </div>
      `;
    }
  }
}
