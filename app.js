/**
 * FinAI — Application Controller & UI Wiring
 * The ONLY file allowed to manipulate the DOM directly and wire events.
 * Zero external libraries. 100% resilient.
 */

(function () {
  "use strict";

  // State
  let currentDataset = null;
  let currentResult = null;
  let activeTabId = "pane-overview";
  let activeExceptionFilter = "ALL";
  let inFlightAnimationFrames = [];

  // Helper: Currency formatting (Indian Rupee format)
  function formatINR(amount) {
    if (typeof amount !== "number" || isNaN(amount)) return "₹0";
    return "₹" + Math.round(amount).toLocaleString("en-IN");
  }

  // Cancel any currently running count-up animation loops
  function cancelRunningAnimations() {
    for (let i = 0; i < inFlightAnimationFrames.length; i++) {
      cancelAnimationFrame(inFlightAnimationFrames[i]);
    }
    inFlightAnimationFrames = [];
  }

  /**
   * Smooth ease-out count-up animation
   * @param {HTMLElement} element 
   * @param {number} targetValue 
   * @param {number} duration 
   * @param {Function} formatter 
   */
  function animateValue(element, targetValue, duration = 600, formatter = (v) => Math.round(v).toString()) {
    if (!element) return;
    const startTime = performance.now();
    const startValue = 0;
    const isFloating = typeof targetValue === "number" && !Number.isInteger(targetValue);

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quad: t * (2 - t)
      const ease = progress * (2 - progress);
      const current = startValue + (targetValue - startValue) * ease;

      element.textContent = formatter(isFloating ? Number(current.toFixed(1)) : current);

      if (progress < 1) {
        const frameId = requestAnimationFrame(step);
        inFlightAnimationFrames.push(frameId);
      } else {
        element.textContent = formatter(targetValue);
      }
    }

    const frameId = requestAnimationFrame(step);
    inFlightAnimationFrames.push(frameId);
  }

  /**
   * Get category badge HTML
   */
  function getCategoryBadge(category) {
    switch (category) {
      case "MATCHED":
        return `<span class="status-pill pill-matched">● Matched</span>`;
      case "FEE_ADJUSTED":
        return `<span class="status-pill pill-fee">● Fee Adjusted</span>`;
      case "DELAYED_SETTLEMENT":
        return `<span class="status-pill pill-delayed">● Delayed</span>`;
      case "DUPLICATE":
        return `<span class="status-pill pill-duplicate">● Duplicate</span>`;
      case "MISSING_IN_BANK":
        return `<span class="status-pill pill-missing">● Missing In Bank</span>`;
      case "UNRECOGNIZED_CHARGE":
        return `<span class="status-pill pill-unrecognized">● Unrecognized</span>`;
      default:
        return `<span class="status-pill">${category}</span>`;
    }
  }

  /**
   * Get CSS class for left border of exception row
   */
  function getRowBorderClass(category) {
    switch (category) {
      case "FEE_ADJUSTED": return "row-border-fee";
      case "DELAYED_SETTLEMENT": return "row-border-delayed";
      case "DUPLICATE": return "row-border-duplicate";
      case "MISSING_IN_BANK": return "row-border-missing";
      case "UNRECOGNIZED_CHARGE": return "row-border-unrecognized";
      default: return "";
    }
  }

  // Helper: Extract only true actionable exceptions (matching "Exceptions Found" metric)
  function getActionableExceptions(result) {
    if (!result || !Array.isArray(result.exceptionRecords)) return [];
    return result.exceptionRecords.filter(rec =>
      rec.category === "DUPLICATE" ||
      rec.category === "MISSING_IN_BANK" ||
      rec.category === "UNRECOGNIZED_CHARGE"
    );
  }

  /**
   * Render Top 4 Metric Cards with synchronized count-up animations
   */
  function renderMetrics(result) {
    try {
      cancelRunningAnimations();

      const elTotal = document.getElementById("metric-total");
      const elRate = document.getElementById("metric-rate");
      const elExceptions = document.getElementById("metric-exceptions");
      const elRisk = document.getElementById("metric-risk");

      const elTotalMicro = document.getElementById("metric-total-micro");
      const elRateMicro = document.getElementById("metric-rate-micro");
      const elExceptionsMicro = document.getElementById("metric-exceptions-micro");
      const elRiskMicro = document.getElementById("metric-risk-micro");

      const total = result.totalTransactions || 0;
      const rateVal = parseFloat(result.matchRate) || 0;
      const criticalCount = result.criticalExceptionsCount || 0;
      const riskVal = result.amountAtRisk || 0;

      // Count up animations
      animateValue(elTotal, total, 600, (v) => Math.round(v).toString());
      animateValue(elRate, rateVal, 600, (v) => `${Number(v).toFixed(1)}%`);
      animateValue(elExceptions, criticalCount, 600, (v) => Math.round(v).toString());
      animateValue(elRisk, riskVal, 600, (v) => formatINR(v));

      // Micro copy
      if (elTotalMicro) elTotalMicro.textContent = `Live evaluation across 3 feeds`;
      if (elRateMicro) elRateMicro.textContent = `${result.categoryCounts.MATCHED} clean + ${result.autoAdjustedCount} adjusted`;
      if (elExceptionsMicro) elExceptionsMicro.textContent = `${criticalCount} critical action items`;
      if (elRiskMicro) elRiskMicro.textContent = `Unmatched capital sum`;

      // Update Tab Badges — Exceptions badge MUST match Exceptions Found metric count exactly
      const actionableExceptions = getActionableExceptions(result);
      const badgeMatched = document.getElementById("badge-matched");
      const badgeExceptions = document.getElementById("badge-exceptions");
      if (badgeMatched) badgeMatched.textContent = result.matchedRecords.length;
      if (badgeExceptions) badgeExceptions.textContent = actionableExceptions.length;

    } catch (err) {
      console.error("FinAI Error rendering metrics:", err);
    }
  }

  /**
   * Render Matched Table Rows
   */
  function renderMatchedTable(matchedRecords) {
    const tbody = document.getElementById("tbody-matched");
    if (!tbody) return;

    try {
      if (!matchedRecords || matchedRecords.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty-state">No matched records found.</td></tr>`;
        return;
      }

      let html = "";
      for (let i = 0; i < matchedRecords.length; i++) {
        const row = matchedRecords[i];
        const fuzzyTag = row.isFuzzy ? ` <span title="Matched within ±3% tolerance" style="font-size:10px; color:var(--text-tertiary);">(fuzzy)</span>` : "";
        html += `
          <tr>
            <td><span class="code-id">${row.txn_id}</span></td>
            <td><span class="code-id">${row.order_id || "-"}</span></td>
            <td><span class="truncate-cell" title="${row.customer || "Customer"}">${row.customer || "Customer"}</span></td>
            <td class="text-right tabular-num"><strong>${formatINR(row.amount)}</strong></td>
            <td>${row.date}</td>
            <td><span class="status-pill pill-matched">● Matched</span>${fuzzyTag}</td>
          </tr>
        `;
      }
      tbody.innerHTML = html;
    } catch (err) {
      console.error("Error rendering matched table:", err);
      tbody.innerHTML = `<tr><td colspan="6" class="table-empty-state">Error loading matched records.</td></tr>`;
    }
  }

  /**
   * Render Exceptions Table with active filter (Only DUPLICATE, MISSING_IN_BANK, UNRECOGNIZED_CHARGE)
   */
  function renderExceptionsTable(actionableExceptions, filter = "ALL") {
    const tbody = document.getElementById("tbody-exceptions");
    if (!tbody) return;

    try {
      if (!actionableExceptions || actionableExceptions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty-state">Zero exceptions recorded. All transactions reconciled cleanly!</td></tr>`;
        return;
      }

      const filtered = actionableExceptions.filter(rec => {
        if (filter === "ALL") return true;
        return rec.category === filter;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty-state">No exceptions match the "${filter}" filter.</td></tr>`;
        return;
      }

      let html = "";
      for (let i = 0; i < filtered.length; i++) {
        const row = filtered[i];
        const borderClass = getRowBorderClass(row.category);
        const badgeHtml = getCategoryBadge(row.category);

        html += `
          <tr class="${borderClass}">
            <td><span class="code-id">${row.txn_id}</span></td>
            <td>${badgeHtml}</td>
            <td class="text-right tabular-num"><strong>${formatINR(row.amount)}</strong></td>
            <td><span class="truncate-reason" title="${row.reason}">${row.reason}</span></td>
            <td>${row.date}</td>
          </tr>
        `;
      }
      tbody.innerHTML = html;

      // Update Filter counts in chips
      updateFilterCounts(actionableExceptions);

    } catch (err) {
      console.error("Error rendering exceptions table:", err);
      tbody.innerHTML = `<tr><td colspan="5" class="table-empty-state">Error loading exception records.</td></tr>`;
    }
  }

  /**
   * Update the numerical counts shown inside exception filter chips
   */
  function updateFilterCounts(actionableExceptions) {
    try {
      const counts = {
        all: actionableExceptions.length,
        duplicate: 0,
        missing: 0,
        unrecognized: 0
      };

      for (let i = 0; i < actionableExceptions.length; i++) {
        const cat = actionableExceptions[i].category;
        if (cat === "DUPLICATE") counts.duplicate++;
        else if (cat === "MISSING_IN_BANK") counts.missing++;
        else if (cat === "UNRECOGNIZED_CHARGE") counts.unrecognized++;
      }

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };

      setVal("filter-count-all", counts.all);
      setVal("filter-count-duplicate", counts.duplicate);
      setVal("filter-count-missing", counts.missing);
      setVal("filter-count-unrecognized", counts.unrecognized);

    } catch (err) {
      console.error("Error updating filter counts:", err);
    }
  }

  /**
   * Render Raw Data Tables (3 Accordions)
   */
  function renderRawData(dataset) {
    try {
      // 1. Settlements
      const settlements = dataset.razorpaySettlements || [];
      const tbSettlements = document.getElementById("tbody-raw-settlements");
      const badgeSettlements = document.getElementById("acc-count-settlements");
      if (badgeSettlements) badgeSettlements.textContent = `${settlements.length} records`;

      if (tbSettlements) {
        let html = "";
        for (let i = 0; i < settlements.length; i++) {
          const row = settlements[i];
          html += `
            <tr>
              <td><span class="code-id">${row.txn_id}</span></td>
              <td class="text-right tabular-num">${formatINR(row.amount)}</td>
              <td>${row.date}</td>
              <td><span class="status-pill pill-matched">● settled</span></td>
            </tr>
          `;
        }
        tbSettlements.innerHTML = html || `<tr><td colspan="4" class="table-empty-state">No settlement records.</td></tr>`;
      }

      // 2. Bank Statement
      const bank = dataset.bankStatement || [];
      const tbBank = document.getElementById("tbody-raw-bank");
      const badgeBank = document.getElementById("acc-count-bank");
      if (badgeBank) badgeBank.textContent = `${bank.length} records`;

      if (tbBank) {
        let html = "";
        for (let i = 0; i < bank.length; i++) {
          const row = bank[i];
          html += `
            <tr>
              <td><span class="code-id">${row.ref_id}</span></td>
              <td class="text-right tabular-num">${formatINR(row.amount)}</td>
              <td>${row.date}</td>
              <td><span class="truncate-reason" title="${row.narration}">${row.narration}</span></td>
            </tr>
          `;
        }
        tbBank.innerHTML = html || `<tr><td colspan="4" class="table-empty-state">No bank records.</td></tr>`;
      }

      // 3. Internal Ledger
      const ledger = dataset.internalLedger || [];
      const tbLedger = document.getElementById("tbody-raw-ledger");
      const badgeLedger = document.getElementById("acc-count-ledger");
      if (badgeLedger) badgeLedger.textContent = `${ledger.length} records`;

      if (tbLedger) {
        let html = "";
        for (let i = 0; i < ledger.length; i++) {
          const row = ledger[i];
          html += `
            <tr>
              <td><span class="code-id">${row.order_id}</span></td>
              <td><span class="code-id">${row.txn_id}</span></td>
              <td><span class="truncate-cell" title="${row.customer}">${row.customer}</span></td>
              <td class="text-right tabular-num">${formatINR(row.amount)}</td>
              <td>${row.date}</td>
            </tr>
          `;
        }
        tbLedger.innerHTML = html || `<tr><td colspan="5" class="table-empty-state">No ledger records.</td></tr>`;
      }

    } catch (err) {
      console.error("Error rendering raw data tables:", err);
    }
  }

  /**
   * Full Run / Re-run Reconciliation Routine
   * @param {number} [seed]
   */
  function runReconciliation(seed = Date.now()) {
    try {
      // Generate synthetic dataset
      currentDataset = generateDataset(seed);

      // Execute deterministic reconciliation engine
      currentResult = reconcile(currentDataset);

      // Render Metrics with synchronized count-up
      renderMetrics(currentResult);

      // Render Chart in Overview tab
      const chartContainer = document.getElementById("chart-mount");
      if (chartContainer) {
        renderBarChart(chartContainer, currentResult.categoryCounts, currentResult.totalTransactions);
      }

      // Render Matched Table
      renderMatchedTable(currentResult.matchedRecords);

      // Render Exceptions Table (only true actionable exceptions)
      const actionableExceptions = getActionableExceptions(currentResult);
      renderExceptionsTable(actionableExceptions, activeExceptionFilter);

      // Render Raw Data Tables
      renderRawData(currentDataset);

    } catch (err) {
      console.error("FinAI runReconciliation failed:", err);
    }
  }

  /**
   * Set up tab switching listeners
   */
  function setupTabs() {
    const tabButtons = document.querySelectorAll(".tab-btn");
    const panes = document.querySelectorAll(".tab-pane");

    tabButtons.forEach(button => {
      button.addEventListener("click", () => {
        const targetPaneId = button.getAttribute("data-target");
        if (targetPaneId === activeTabId) return;

        // Update button states
        tabButtons.forEach(btn => {
          btn.classList.remove("active");
          btn.setAttribute("aria-selected", "false");
        });
        button.classList.add("active");
        button.setAttribute("aria-selected", "true");

        // Cross-fade panes
        const currentPane = document.getElementById(activeTabId);
        const nextPane = document.getElementById(targetPaneId);

        if (currentPane) {
          currentPane.style.opacity = "0";
          setTimeout(() => {
            currentPane.classList.remove("active");
            if (nextPane) {
              nextPane.classList.add("active");
              // Force layout reflow before triggering fade in
              void nextPane.offsetWidth;
              nextPane.style.opacity = "1";
            }
            activeTabId = targetPaneId;
          }, 150);
        } else if (nextPane) {
          nextPane.classList.add("active");
          nextPane.style.opacity = "1";
          activeTabId = targetPaneId;
        }
      });
    });
  }

  /**
   * Set up Accordions in Raw Data tab
   */
  function setupAccordions() {
    const accordionItems = document.querySelectorAll(".accordion-item");
    accordionItems.forEach(item => {
      const header = item.querySelector(".accordion-header");
      if (header) {
        header.addEventListener("click", () => {
          item.classList.toggle("expanded");
        });
      }
    });
  }

  /**
   * Set up Exception Filter Chips
   */
  function setupExceptionFilters() {
    const chips = document.querySelectorAll(".filter-chip");
    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        chips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        activeExceptionFilter = chip.getAttribute("data-filter") || "ALL";

        if (currentResult) {
          const actionableExceptions = getActionableExceptions(currentResult);
          renderExceptionsTable(actionableExceptions, activeExceptionFilter);
        }
      });
    });
  }

  /**
   * Generate a cryptographically strong or randomized fresh seed
   */
  function generateFreshSeed() {
    try {
      if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
        const arr = new Uint32Array(1);
        window.crypto.getRandomValues(arr);
        return arr[0];
      }
    } catch (e) {
      // Fallback
    }
    return Math.floor(Date.now() + Math.random() * 10000000);
  }

  /**
   * Set up "Re-run Reconciliation" Button with simulated working state and rotation
   */
  function setupRerunButton() {
    const btn = document.getElementById("btn-rerun");
    const icon = btn ? btn.querySelector(".refresh-icon") : null;
    const textSpan = document.getElementById("btn-rerun-text");

    if (!btn) return;

    btn.addEventListener("click", () => {
      if (btn.disabled) return;

      // Disable button
      btn.disabled = true;

      // Start rotation animation on refresh SVG icon
      if (icon) {
        icon.classList.remove("rotating");
        void icon.offsetWidth; // force reflow
        icon.classList.add("rotating");
      }

      // Update button text to show working agent state
      if (textSpan) {
        textSpan.textContent = "Reconciling...";
      }

      // Simulate 450ms agent calculation delay for live demo impact
      setTimeout(() => {
        try {
          const newSeed = generateFreshSeed();
          runReconciliation(newSeed);
        } finally {
          btn.disabled = false;
          if (icon) icon.classList.remove("rotating");
          if (textSpan) textSpan.textContent = "Re-run Reconciliation";
        }
      }, 450);
    });
  }

  /**
   * App Initialization
   */
  function init() {
    setupTabs();
    setupAccordions();
    setupExceptionFilters();
    setupRerunButton();

    // Initial run on page load with fresh randomized seed (no hardcoded seed)
    runReconciliation(generateFreshSeed());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
