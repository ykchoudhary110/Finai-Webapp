/**
 * FinAI — Deterministic Payment Reconciliation Data Generator
 * Pure functions only. Zero DOM access.
 * Returns plain JS objects and arrays.
 */

// Seeded PRNG using Mulberry32 algorithm
function createPRNG(seed) {
  let s = (Math.floor(seed) >>> 0) || 1337;
  return function () {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Hardcoded realistic Indian customer names
const INDIAN_CUSTOMERS = [
  "Aarav Sharma",
  "Priya Patel",
  "Rohan Mehta",
  "Ananya Iyer",
  "Vikram Singh",
  "Neha Gupta",
  "Aditya Verma",
  "Pooja Reddy",
  "Rahul Nair",
  "Sneha Joshi",
  "Karan Malhotra",
  "Divya Rao",
  "Siddharth Das",
  "Ishita Mukherjee",
  "Arjun Kulkarni"
];

/**
 * Format a Date object as YYYY-MM-DD string
 */
function formatDateISO(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Shift a date string YYYY-MM-DD by delta days
 */
function shiftDate(dateStr, days) {
  const parts = dateStr.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + days);
  return formatDateISO(d);
}

/**
 * Generate dataset using seeded PRNG
 * @param {number} [seed=42]
 * @returns {{ razorpaySettlements: Array, bankStatement: Array, internalLedger: Array }}
 */
function generateDataset(seed = Date.now()) {
  try {
    const prng = createPRNG(seed);

    const randomInt = (min, max) => Math.floor(prng() * (max - min + 1)) + min;
    const randomChoice = (arr) => arr[Math.floor(prng() * arr.length)];
    const randomHex = (len) => {
      let str = "";
      const hex = "0123456789abcdef";
      for (let i = 0; i < len; i++) {
        str += hex[Math.floor(prng() * 16)];
      }
      return str;
    };
    const randomDigits = (len) => {
      let str = "";
      for (let i = 0; i < len; i++) {
        str += Math.floor(prng() * 10).toString();
      }
      return str;
    };

    // Base transaction count: 60 - 80
    const baseCount = randomInt(60, 80);

    // Fixed reference date: 2026-09-02 or today
    const now = new Date();
    const referenceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Generate base transactions
    const baseTransactions = [];
    for (let i = 0; i < baseCount; i++) {
      const daysAgo = randomInt(0, 13);
      const txnDate = new Date(referenceDate);
      txnDate.setDate(txnDate.getDate() - daysAgo);

      baseTransactions.push({
        txn_id: "txn_" + randomHex(8),
        amount: randomInt(199, 24999), // Whole rupees for readability ₹199 to ₹24,999
        date: formatDateISO(txnDate),
        customer: randomChoice(INDIAN_CUSTOMERS),
        order_id: "ORD" + randomDigits(6),
        ref_id: "REF" + randomDigits(8)
      });
    }

    // Shuffle transaction indices to assign mutation types predictably
    const indices = baseTransactions.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Proportions: ~40% Clean Match, ~20% Fee Adjusted, ~15% Delayed, ~10% Duplicate, ~10% Missing In Bank
    const nClean = Math.round(baseCount * 0.40);
    const nFee = Math.round(baseCount * 0.20);
    const nDelayed = Math.round(baseCount * 0.15);
    const nDup = Math.round(baseCount * 0.10);
    // Remainder goes to missing in bank (approx 10-15%)
    const nMissing = Math.max(2, baseCount - nClean - nFee - nDelayed - nDup);

    let offset = 0;
    const cleanIndices = new Set(indices.slice(offset, offset + nClean));
    offset += nClean;
    const feeIndices = new Set(indices.slice(offset, offset + nFee));
    offset += nFee;
    const delayedIndices = new Set(indices.slice(offset, offset + nDelayed));
    offset += nDelayed;
    const dupIndices = new Set(indices.slice(offset, offset + nDup));
    offset += nDup;
    const missingIndices = new Set(indices.slice(offset));

    const razorpaySettlements = [];
    const bankStatement = [];
    const internalLedger = [];

    baseTransactions.forEach((txn, idx) => {
      const { txn_id, amount, date, customer, order_id, ref_id } = txn;
      const cleanCustomerTag = customer.split(" ")[0].toUpperCase();

      // Razorpay Settlement is recorded for all legitimate transactions
      razorpaySettlements.push({
        txn_id: txn_id,
        amount: amount,
        date: date,
        status: "settled"
      });

      // Internal Ledger primary entry
      internalLedger.push({
        order_id: order_id,
        txn_id: txn_id,
        amount: amount,
        date: date,
        customer: customer
      });

      if (cleanIndices.has(idx)) {
        // CLEAN MATCH: exact amount, exact date
        bankStatement.push({
          ref_id: ref_id,
          txn_id: txn_id,
          amount: amount,
          date: date,
          narration: `UPI-${cleanCustomerTag}-RAZORPAY/${txn_id}`
        });
      } else if (feeIndices.has(idx)) {
        // FEE_ADJUSTED: Razorpay settlement fee ~2% deducted
        const netBankAmount = Math.max(1, Math.round(amount * 0.98 - 2));
        bankStatement.push({
          ref_id: ref_id,
          txn_id: txn_id,
          amount: netBankAmount,
          date: date,
          narration: `UPI-${cleanCustomerTag}-RAZORPAY/${txn_id}`
        });
      } else if (delayedIndices.has(idx)) {
        // DELAYED_SETTLEMENT: bank credit arrived 1-2 days after ledger
        const delayDays = randomInt(1, 2);
        const delayedDate = shiftDate(date, delayDays);
        bankStatement.push({
          ref_id: ref_id,
          txn_id: txn_id,
          amount: amount,
          date: delayedDate,
          narration: `UPI-${cleanCustomerTag}-RAZORPAY/${txn_id}`
        });
      } else if (dupIndices.has(idx)) {
        // DUPLICATE: duplicate billing in internal ledger
        const duplicateOrderId = "ORD" + randomDigits(6);
        internalLedger.push({
          order_id: duplicateOrderId,
          txn_id: txn_id,
          amount: amount,
          date: date,
          customer: customer
        });
        // Bank received 1 normal settlement
        bankStatement.push({
          ref_id: ref_id,
          txn_id: txn_id,
          amount: amount,
          date: date,
          narration: `UPI-${cleanCustomerTag}-RAZORPAY/${txn_id}`
        });
      } else if (missingIndices.has(idx)) {
        // MISSING_IN_BANK: settlement exists, ledger exists, but zero bank credit
        // Do not add to bankStatement
      }
    });

    // UNRECOGNIZED_CHARGE: 2-3 extra bank credits that have no matching order/ledger
    const unrecognizedCount = Math.max(3, Math.round(baseCount * 0.05));
    for (let u = 0; u < unrecognizedCount; u++) {
      const daysAgo = randomInt(1, 10);
      const unrecDate = new Date(referenceDate);
      unrecDate.setDate(unrecDate.getDate() - daysAgo);
      const fakeRef = "REF" + randomDigits(8);
      const fakeTxn = "txn_" + randomHex(8);
      const fakeAmount = randomInt(499, 14999);
      const narrations = [
        `POS-DIRECT-CREDIT-UNKNOWN/${fakeRef}`,
        `NEFT-INWARD-REV-PENDING/${fakeRef}`,
        `IMPS-SETTLEMENT-ORPHAN/${fakeRef}`
      ];

      bankStatement.push({
        ref_id: fakeRef,
        txn_id: fakeTxn,
        amount: fakeAmount,
        date: formatDateISO(unrecDate),
        narration: narrations[u % narrations.length]
      });
    }

    // Shuffle arrays so tables don't display synchronized row orders
    const shuffleArray = (arr) => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(prng() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    return {
      razorpaySettlements: shuffleArray(razorpaySettlements),
      bankStatement: shuffleArray(bankStatement),
      internalLedger: shuffleArray(internalLedger)
    };
  } catch (err) {
    console.error("FinAI Data Generator encountered an error:", err);
    return {
      razorpaySettlements: [],
      bankStatement: [],
      internalLedger: []
    };
  }
}
