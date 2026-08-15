const DAYS_IN_MONTH = 30; // Business rule confirmed with client: 30-day month convention for daily interest proration

function calculateAccruedInterest(outstandingPrincipal, interestRate, lastPaymentDate) {
  const todayStr = new Date().toLocaleDateString('en-CA');
  const today = new Date(todayStr + 'T00:00:00Z');
  const last = new Date(lastPaymentDate + 'T00:00:00Z');

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSincePayment = Math.floor((today - last) / msPerDay);

  const dailyRate = (interestRate / 100) / DAYS_IN_MONTH;
  const interestAccrued = outstandingPrincipal * dailyRate * daysSincePayment;

  return {
    daysSincePayment,
    interestAccrued: Math.round(interestAccrued * 100) / 100,
    totalOwed: Math.round((outstandingPrincipal + interestAccrued) * 100) / 100,
  };
}

module.exports = calculateAccruedInterest;