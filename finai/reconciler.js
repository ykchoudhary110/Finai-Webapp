/**
 * FinAI — Deterministic Payment Reconciliation Engine
 * Pure functions only. Zero DOM access.
 * Takes dataset in -> returns structured ReconciliationResult.
 */

/**
 * Reconcile financial records across Razorpay Settlements, Bank Statement, and Internal Ledger.
 * 
 * @param {{ razorpaySettlements: Array, bankStatement: Array, internalLedger: Array }} dataset
 * @returns {{
 *   error?: boolean,
 *   totalTransactions: number,
 *   matchRate: string,
 *   categoryCounts: {
 *     MATCHED: number,
 *     FEE_ADJUSTED: number,
 *     DELAYED_SETTLEMENT: number,
 *     DUPLICATE: number,
 *     MISSING_IN_BANK: number,
 *     UNRECOGNIZED_CHARGE: number
 *   },
 *   amountAtRisk: number,
 *   matchedRecords: Array,
 *   exceptionRecords: Array,
 *   criticalExceptionsCount: number,
 *   autoAdjustedCount: number
 * }}
 */
function reconcile(dataset) {
  try {
    if (!dataset || typeof dataset !== "object") {
      throw new Error("Invalid dataset provided to reconcile()");
    }

    const razorpaySettlements = Array.isArray(dataset.razorpaySettlements) ? dataset.razorpaySettlements : [];
    const bankStatement = Array.isArray(dataset.bankStatement) ? dataset.bankStatement : [];
    const internalLedger = Array.isArray(dataset.internalLedger) ? dataset.internalLedger : [];

    // Helper: calculate day difference between two YYYY-MM-DD strings (date2 - date1)
    const getDaysDiff = (dateStr1, dateStr2) => {
      if (!dateStr1 || !dateStr2) return 0;
      const d1 = new Date(dateStr1 + "T00:00:00");
      const d2 = new Date(dateStr2 + "T00:00:00");
      const diffTime = d2.getTime() - d1.getTime();
      return Math.round(diffTime / (1000 * 60 * 60 * 24));
    };

    // STEP 1 — Index build
    // Build Map<txn_id, { settlement, bankEntries: [], ledgerEntries: [] }>
    const txnMap = new Map();

    const getOrCreateEntry = (txnId) => {
      if (!txnMap.has(txnId)) {
        txnMap.set(txnId, {
          txn_id: txnId,
          settlement: null,
          bankEntries: [],
          ledgerEntries: []
        });
      }
      return txnMap.get(txnId);
    };

    // Index Razorpay settlements
    for (let i = 0; i < razorpaySettlements.length; i++) {
      const rec = razorpaySettlements[i];
      if (rec && rec.txn_id) {
        getOrCreateEntry(rec.txn_id).settlement = rec;
      }
    }

    // Index Internal Ledger (array allows tracking duplicates)
    for (let i = 0; i < internalLedger.length; i++) {
      const rec = internalLedger[i];
      if (rec && rec.txn_id) {
        getOrCreateEntry(rec.txn_id).ledgerEntries.push(rec);
      }
    }

    // Index Bank Statement
    for (let i = 0; i < bankStatement.length; i++) {
      const rec = bankStatement[i];
      if (rec) {
        // Try direct txn_id, otherwise extract from narration
        let txnId = rec.txn_id;
        if (!txnId && rec.narration) {
          const match = rec.narration.match(/txn_[a-f0-9]{8}/i);
          if (match) txnId = match[0];
        }
        if (!txnId) {
          txnId = rec.ref_id || `unknown_bank_${i}`;
        }
        getOrCreateEntry(txnId).bankEntries.push(rec);
      }
    }

    // Category counters
    const categoryCounts = {
      MATCHED: 0,
      FEE_ADJUSTED: 0,
      DELAYED_SETTLEMENT: 0,
      DUPLICATE: 0,
      MISSING_IN_BANK: 0,
      UNRECOGNIZED_CHARGE: 0
    };

    let amountAtRisk = 0;
    const matchedRecords = [];
    const exceptionRecords = [];

    // STEP 2 & 3 — Classification
    for (const [txnId, entry] of txnMap.entries()) {
      const { settlement, bankEntries, ledgerEntries } = entry;

      // Case A: Ledger contains duplicates (double billing)
      if (ledgerEntries.length > 1) {
        categoryCounts.DUPLICATE++;
        const primaryLedger = ledgerEntries[0];
        // The duplicate amount is at risk
        const duplicateAmount = primaryLedger ? primaryLedger.amount : 0;
        amountAtRisk += duplicateAmount;

        exceptionRecords.push({
          txn_id: txnId,
          order_id: ledgerEntries.map(l => l.order_id).join(" & "),
          category: "DUPLICATE",
          amount: duplicateAmount,
          date: primaryLedger ? primaryLedger.date : (settlement ? settlement.date : "-"),
          customer: primaryLedger ? primaryLedger.customer : "Multiple",
          reason: "Same transaction billed twice in internal ledger",
          raw_data: {
            orders: ledgerEntries.map(l => l.order_id),
            count: ledgerEntries.length,
            settlement: settlement,
            bank: bankEntries[0] || null
          }
        });
        continue;
      }

      // Case B: Orphan bank entry (no ledger entry at all)
      if (ledgerEntries.length === 0) {
        if (bankEntries.length > 0) {
          for (let b = 0; b < bankEntries.length; b++) {
            const bank = bankEntries[b];
            categoryCounts.UNRECOGNIZED_CHARGE++;
            const unrecAmount = bank.amount || 0;
            amountAtRisk += unrecAmount;

            exceptionRecords.push({
              txn_id: txnId,
              order_id: "-",
              category: "UNRECOGNIZED_CHARGE",
              amount: unrecAmount,
              date: bank.date || "-",
              customer: "Unknown Customer",
              reason: "Bank entry has no matching order or settlement record — flag for manual review",
              raw_data: {
                ref_id: bank.ref_id,
                narration: bank.narration,
                bankAmount: bank.amount
              }
            });
          }
        }
        continue;
      }

      // We have exactly 1 ledger entry
      const ledger = ledgerEntries[0];

      // Case C: Missing in bank (settlement or ledger exists, but zero bank credit)
      if (bankEntries.length === 0) {
        categoryCounts.MISSING_IN_BANK++;
        const missingAmount = ledger.amount || (settlement ? settlement.amount : 0);
        amountAtRisk += missingAmount;

        exceptionRecords.push({
          txn_id: txnId,
          order_id: ledger.order_id || "-",
          category: "MISSING_IN_BANK",
          amount: missingAmount,
          date: ledger.date || (settlement ? settlement.date : "-"),
          customer: ledger.customer || "Direct Order",
          reason: "No matching bank credit found yet — may still be in transit",
          raw_data: {
            order_id: ledger.order_id,
            settlement: settlement || null
          }
        });
        continue;
      }

      // Case D: We have 1 ledger entry and at least 1 bank entry -> compare!
      const bank = bankEntries[0];
      const ledgerAmount = ledger.amount;
      const bankAmount = bank.amount;
      const amountDiff = Math.abs(bankAmount - ledgerAmount);
      const dateDiff = getDaysDiff(ledger.date, bank.date);

      // Expected Razorpay net settlement formula: round(ledger.amount * 0.98 - 2)
      const expectedNetFeeAmount = Math.round(ledgerAmount * 0.98 - 2);
      const feeRatio = ledgerAmount > 0 ? (ledgerAmount - bankAmount) / ledgerAmount : 0;

      // 1. Exact match
      if (amountDiff <= 0.5 && dateDiff === 0) {
        categoryCounts.MATCHED++;
        matchedRecords.push({
          txn_id: txnId,
          order_id: ledger.order_id,
          customer: ledger.customer,
          amount: ledgerAmount,
          date: ledger.date,
          status: "Matched",
          isFuzzy: false,
          bank_ref: bank.ref_id,
          bank_amount: bankAmount
        });
      }
      // 2. Fee Adjusted (~2% Razorpay deduction)
      else if (
        (Math.abs(bankAmount - expectedNetFeeAmount) <= 2) ||
        (bankAmount < ledgerAmount && feeRatio >= 0.014 && feeRatio <= 0.035)
      ) {
        categoryCounts.FEE_ADJUSTED++;
        const deductedFee = ledgerAmount - bankAmount;
        exceptionRecords.push({
          txn_id: txnId,
          order_id: ledger.order_id,
          category: "FEE_ADJUSTED",
          amount: ledgerAmount,
          date: ledger.date,
          customer: ledger.customer,
          reason: "Amount differs by Razorpay's ~2% settlement fee",
          raw_data: {
            ledgerAmount,
            bankAmount,
            fee: deductedFee,
            feePercent: (feeRatio * 100).toFixed(2) + "%",
            ref_id: bank.ref_id
          }
        });
      }
      // 3. Delayed settlement (1-2 days after ledger)
      else if (amountDiff <= 0.5 && dateDiff >= 1 && dateDiff <= 2) {
        categoryCounts.DELAYED_SETTLEMENT++;
        exceptionRecords.push({
          txn_id: txnId,
          order_id: ledger.order_id,
          category: "DELAYED_SETTLEMENT",
          amount: ledgerAmount,
          date: ledger.date,
          customer: ledger.customer,
          reason: `Bank credit arrived ${dateDiff} day(s) after ledger entry`,
          raw_data: {
            ledgerDate: ledger.date,
            bankDate: bank.date,
            delayDays: dateDiff,
            ref_id: bank.ref_id
          }
        });
      }
      // 4. Fuzzy fallback match (within ±3% and ±2 days)
      else if ((amountDiff / Math.max(ledgerAmount, 1) <= 0.03) && Math.abs(dateDiff) <= 2) {
        categoryCounts.MATCHED++;
        matchedRecords.push({
          txn_id: txnId,
          order_id: ledger.order_id,
          customer: ledger.customer,
          amount: ledgerAmount,
          date: ledger.date,
          status: "Matched",
          isFuzzy: true,
          bank_ref: bank.ref_id,
          bank_amount: bankAmount
        });
      }
      // 5. Unrecognized charge / anomalous discrepancy
      else {
        categoryCounts.UNRECOGNIZED_CHARGE++;
        amountAtRisk += bankAmount;
        exceptionRecords.push({
          txn_id: txnId,
          order_id: ledger.order_id || "-",
          category: "UNRECOGNIZED_CHARGE",
          amount: bankAmount,
          date: bank.date || ledger.date,
          customer: ledger.customer || "Unknown",
          reason: "Bank entry has no matching order or settlement record — flag for manual review",
          raw_data: {
            ledgerAmount,
            bankAmount,
            amountDiff,
            dateDiff,
            ref_id: bank.ref_id
          }
        });
      }
    }

    // STEP 4 — Aggregate
    const totalTransactions =
      categoryCounts.MATCHED +
      categoryCounts.FEE_ADJUSTED +
      categoryCounts.DELAYED_SETTLEMENT +
      categoryCounts.DUPLICATE +
      categoryCounts.MISSING_IN_BANK +
      categoryCounts.UNRECOGNIZED_CHARGE;

    // Match Rate = (MATCHED + FEE_ADJUSTED + DELAYED_SETTLEMENT) / total
    const matchedSum =
      categoryCounts.MATCHED +
      categoryCounts.FEE_ADJUSTED +
      categoryCounts.DELAYED_SETTLEMENT;

    const matchRate = totalTransactions > 0
      ? ((matchedSum / totalTransactions) * 100).toFixed(1)
      : "0.0";

    const criticalExceptionsCount =
      categoryCounts.DUPLICATE +
      categoryCounts.MISSING_IN_BANK +
      categoryCounts.UNRECOGNIZED_CHARGE;

    const autoAdjustedCount =
      categoryCounts.FEE_ADJUSTED +
      categoryCounts.DELAYED_SETTLEMENT;

    return {
      error: false,
      totalTransactions,
      matchRate,
      categoryCounts,
      amountAtRisk,
      matchedRecords,
      exceptionRecords,
      criticalExceptionsCount,
      autoAdjustedCount
    };
  } catch (err) {
    console.error("FinAI Reconciler encountered an error:", err);
    return {
      error: true,
      message: err.message || "Unknown error during reconciliation",
      totalTransactions: 0,
      matchRate: "0.0",
      categoryCounts: {
        MATCHED: 0,
        FEE_ADJUSTED: 0,
        DELAYED_SETTLEMENT: 0,
        DUPLICATE: 0,
        MISSING_IN_BANK: 0,
        UNRECOGNIZED_CHARGE: 0
      },
      amountAtRisk: 0,
      matchedRecords: [],
      exceptionRecords: [],
      criticalExceptionsCount: 0,
      autoAdjustedCount: 0
    };
  }
}
