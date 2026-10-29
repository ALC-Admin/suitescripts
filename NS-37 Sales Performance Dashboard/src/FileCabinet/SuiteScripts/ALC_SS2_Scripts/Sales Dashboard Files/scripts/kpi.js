function buildKPIs(PARAMS) {
    let { targets, departments, data } = PARAMS;

    const CURRENCY_FORMATTER = new Intl.NumberFormat('en', {
        notation: 'compact',
        compactDisplay: 'short',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    });

    /** KPI #1 - Total Sales */
    let totalSales = data.reduce((sum, next) => {
        sum += next.reduce((a, b) => a + parseFloat(b.total || '0'), 0);
        return sum;
    }, 0);
    console.log('totalSales', totalSales);
    let totalSalesEl = document.getElementById('kpiTotalSales');
    totalSalesEl.innerText = CURRENCY_FORMATTER.format(totalSales);

    /** KPI #2 - Gap to Target */
    let totalTarget = targets.reduce((a, b) => a + parseFloat(b.year || '0'), 0);
    let gapToTarget = (totalSales * 100) / totalTarget;
    let gapToTargetEl = document.getElementById('kpiGapToTarget');
    gapToTargetEl.innerText = `${gapToTarget.toFixed(0)}%`;

    /** KPI #3 - Reps At Quota */
    let repsAtQuota = 0;
    repsAtQuota = targets.filter(rep => {
        let target = parseFloat(rep.year);
        let total = 0;
        data.forEach(d => {
            let memberData = d.find(m => m.member === rep.id);
            total += memberData ? parseFloat(memberData.total) : 0
            return true;
        });
        return total >= target;
    }).length;
    let repsAtQuotaEl = document.getElementById('kpiRepsAtQuota');
    repsAtQuotaEl.innerText = repsAtQuota;

    /** KPI #4 - Quota Attainment */
    let quotaAttainment = ((repsAtQuota + 2) * 100) / targets.length;
    let quotaAttainmentEl = document.getElementById('kpiQuotaAttainment');
    quotaAttainmentEl.innerText = `${quotaAttainment.toFixed(1)}%`;
}