window.ALCQ_TARGETS = [];
window.ALCQ_SALES_DATA = [];
window.ALCQ_DEPARTMENTS = [];
window.ALCQ_YEARS = [];

window.ALCQ_CHARTS = {
    departmentSales: {
        chart: '',
        filters: {}
    },
    memberSales: {
        chart: '',
        filters: {}
    }
};

/** KPI */
function buildKPIs() {
    // let { targets, departments, data } = PARAMS;

    const CURRENCY_FORMATTER = new Intl.NumberFormat('en', {
        notation: 'compact',
        compactDisplay: 'short',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    });

    /** KPI #1 - Total Sales */
    let totalSales = window.ALCQ_SALES_DATA.reduce((sum, next) => {
        sum += next.reduce((a, b) => a + parseFloat(b.total || '0'), 0);
        return sum;
    }, 0);
    console.log('totalSales', totalSales);
    let totalSalesEl = document.getElementById('kpiTotalSales');
    totalSalesEl.innerText = CURRENCY_FORMATTER.format(totalSales);

    /** KPI #2 - Gap to Target */
    let totalTarget = window.ALCQ_TARGETS.reduce((a, b) => a + parseFloat(b.year || '0'), 0);
    let gapToTarget = (totalSales * 100) / totalTarget;
    let gapToTargetEl = document.getElementById('kpiGapToTarget');
    gapToTargetEl.innerText = `${gapToTarget.toFixed(0)}%`;

    /** KPI #3 - Reps At Quota */
    let repsAtQuota = 0;
    repsAtQuota = window.ALCQ_TARGETS.filter(rep => {
        let target = parseFloat(rep.year);
        let total = 0;
        window.ALCQ_SALES_DATA.forEach(d => {
            let memberData = d.find(m => m.member === rep.id);
            total += memberData ? parseFloat(memberData.total) : 0
            return true;
        });
        return total >= target;
    }).length;
    let repsAtQuotaEl = document.getElementById('kpiRepsAtQuota');
    repsAtQuotaEl.innerText = repsAtQuota;

    /** KPI #4 - Quota Attainment */
    let quotaAttainment = (repsAtQuota * 100) / window.ALCQ_TARGETS.length;
    let quotaAttainmentEl = document.getElementById('kpiQuotaAttainment');
    quotaAttainmentEl.innerText = `${quotaAttainment.toFixed(1)}%`;
}

/** LEADER BOARDS */
function buildSalesLeaderBoard(PARAMS) {
    // let { data, targets } = PARAMS;

    let repTotals = window.ALCQ_TARGETS.map(rep => {
        let total = 0;
        window.ALCQ_SALES_DATA.forEach(d => {
            let memberData = d.find(m => m.member === rep.id);
            total += memberData ? parseFloat(memberData.total) : 0
            return true;
        });
        return {
            name: rep.name,
            total
        };
    });
    repTotals.sort((a, b) => {
        if (a.total < b.total) { return 1 }
        if (a.total > b.total) { return -1 }
        return 0;
    });

    const FORMATTER = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    document.getElementById('salesLeaderBoard').innerHTML = repTotals.slice(0, 5).map(r => 
        `<div class="row">
            <div class="name">${r.name}</div>
            <div class="value">$${FORMATTER.format(r.total)}</div>
        </div>`
    ).join('');
}

function buildSalesVsTargetsBoard() {
    // let { data, departments, targets } = PARAMS;

    let targetGaps = window.ALCQ_TARGETS
        .filter(t => t.type === '2')
        .map(rep => {
            let total = window.ALCQ_SALES_DATA.reduce((sum, next) => {
                let member = next.find(d => rep.id === d.member);
                sum += member ? parseFloat(member.total) : 0;
                return sum;
            }, 0);
            return {
                name: rep.name,
                rate: (total * 100) / parseFloat(rep.year)
            }
        });
    targetGaps.sort((a, b) => {
        if (a.rate < b.rate) { return 1 }
        if (a.rate > b.rate) { return -1 }
        return 0;
    });
    console.log('targetGaps', targetGaps);

    const FORMATTER = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    });
    let salesVsTargetEl = document.getElementById('salesVsTargetBoard');
    salesVsTargetEl.innerHTML = targetGaps.slice(0, 5).map(d =>
        `<div class="row">
            <div class="name">${d.name}</div>
            <div class="value">${FORMATTER.format(d.rate)}%</div>
        </div>`
    ).join('');
}

function buildDepartmentBoard() {
    // let { data, departments } = PARAMS;

    let departmentValues = window.ALCQ_DEPARTMENTS.map(department => {
        let total = 0;
        window.ALCQ_SALES_DATA.forEach(d => {
            total += d.filter(m => m.id === department.id).reduce((a, b) => a + parseFloat(b.total), 0);
            return true;
        });
        return {
            name: department.name,
            total
        };
    });
    departmentValues.sort((a, b) => {
        if (a.total < b.total) { return 1 }
        if (a.total > b.total) { return -1 }
        return 0;
    });

    const FORMATTER = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    document.getElementById('departmentBoard').innerHTML = departmentValues.slice(0, 5).map(d => 
        `<div class="row">
            <div class="name">${d.name}</div>
            <div class="value">$${FORMATTER.format(d.total)}</div>
        </div>`
    ).join('');
}

function buildLeaderboards() {
    buildSalesLeaderBoard();
    buildSalesVsTargetsBoard();
    buildDepartmentBoard();
}

/** CHARTS */
function buildSalesByQuarter() {
    const FY = new URLSearchParams(location.search).get('fy');
    
    let periodSelect = document.getElementById('financialYear');
    window.ALCQ_YEARS.forEach(year => {
        periodSelect.add(new Option(year, year, year === FY, year === FY));
    });

    let quarterlyTargets = [];
    let quarterlyValues = [];

    for (let i = 1; i <= 4; i++) {
        let sumQuarter = 0;
        let sumTarget = 0;

        sumTarget = window.ALCQ_TARGETS.reduce((a, b) => a + parseFloat(b[`q${i}`] || '0'), 0);
        window.ALCQ_SALES_DATA.forEach(d => {
            sumQuarter += d.reduce((a, b) => a + parseFloat(b[`q${i}`] || '0'), 0);
            return true;
        });

        quarterlyTargets.push(sumTarget);
        quarterlyValues.push(sumQuarter);
    }
    
    const ctxSBQ = document.getElementById('chartSalesByQuarter');
    const chart = new Chart(ctxSBQ, {
        type: 'bar',
        data: {
            labels: [ 'Q1', 'Q2', 'Q3', 'Q4' ],
            datasets: [{
                label: 'Sales',
                data: quarterlyValues,
                borderWidth: 1
            }, {
                label: 'Target',
                data: quarterlyTargets,
                borderWidth: 1
            }]
        },
        options: {
            barPercentage: 0.8,
            categoryPercentage: 0.5,
            maintainAspectRatio: false,
            maxBarThickness: 50,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Sales ($)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        padding: { top: 10, bottom: 20 }
                    }
                }
            }
        },
    });
}

function buildMemberSales() {
    // let { targets, departments, data } = PARAMS;

    const MEMBER_DATA = window.ALCQ_TARGETS.filter(t => t.type === '2')
    let memberValues = MEMBER_DATA
        .map(t => {
            let total = 0;
            window.ALCQ_SALES_DATA.forEach(d => {
                let memberData = d.find(m => m.member === t.id);
                total += memberData ? parseFloat(memberData.total) : 0
                return true;
            });
            return total;
        });
    let memberTargets = MEMBER_DATA.map(t => t.year);
    console.log('memberTargets', memberTargets);
    
    const ctxMS = document.getElementById('chartMemberSales');
    const barWidth = 80;
    const chartPadding = 20;
    const chartHeight = (window.ALCQ_SALES_DATA.length * (barWidth + chartPadding)) + chartPadding;
    ctxMS.style.height = `${chartHeight}px`;
    ctxMS.style.width = `100%`;
    
    window.ALCQ_CHARTS.memberSales.chart = new Chart(ctxMS, {
        type: 'bar',
        data: {
            labels: MEMBER_DATA.map(t => t.name),
            datasets: [{
                label: 'Sales ($)',
                data: memberValues,
                borderWidth: 0
            }, {
                label: 'Target',
                data: memberTargets,
                borderWidth: 0
            }]
        },
        plugins: [ChartDataLabels],
        options: {
            indexAxis: 'y',
            barPercentage: 0.8,
            categoryPercentage: 0.5,
            barThickness: 15,
            responsive: true,
            plugins: {
                datalabels: {
                    color: '#333',
                    align: 'end',
                    anchor: 'start',
                    clamp: true,
                    formatter: function (value) {
                        return (new Intl.NumberFormat('en', {
                            notation: 'compact',
                            compactDisplay: 'short',
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1                            
                        })).format(value)
                    }
                },
                legend: {
                    position: 'bottom'
                },
            }
        }
    });
}

function buildDepartmentSales() {
    const DEPARTMENT_DATA = window.ALCQ_TARGETS.filter(t => t.type === '1');
    let departmentValues = DEPARTMENT_DATA
        .map(t => {
            let department = window.ALCQ_DEPARTMENTS.find(d => d.id === t.dep);
            let total = 0;
            window.ALCQ_SALES_DATA.forEach(d => {
                total += d.filter(m => m.id === department.id).reduce((a, b) => a + parseFloat(b.total), 0);
                return true;
            });
            return total;
        });
    let departmentTargets = DEPARTMENT_DATA.map(t => t.year);

    const ctxDS = document.getElementById('chartDepartmentSales');
    const barWidth = 40;
    const chartPadding = 10;
    const chartHeight = (departmentValues.length * (barWidth + chartPadding)) + chartPadding;
    ctxDS.style.height = `${chartHeight}px`;
    ctxDS.style.width = `100%`;

    window.ALCQ_CHARTS.departmentSales.chart = new Chart(ctxDS, {
        type: 'bar',
        data: {
            labels: DEPARTMENT_DATA.map(d => d.name),
            datasets: [{
                label: 'Sales',
                data: departmentValues,
                borderWidth: 0
            }, {
                label: 'Target',
                data: departmentTargets,
                borderWidth: 0
            }]
        },
        plugins: [ChartDataLabels],
        options: {
            indexAxis: 'y',
            barPercentage: 0.8,
            categoryPercentage: 0.5,
            barThickness: 16,
            responsive: true,
            plugins: {
                datalabels: {
                    color: '#333',
                    align: 'end',
                    anchor: 'start',
                    clamp: true,
                    formatter: function (value) {
                        return (new Intl.NumberFormat('en', {
                            notation: 'compact',
                            compactDisplay: 'short',
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1                            
                        })).format(value)
                    }
                },
                legend: {
                    position: 'bottom'
                },
            }
        }
    });
}

/** LOAD */
async function loadData() {
    const BACKEND = 'https://11346072.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=5114&deploy=1&compid=11346072&ns-at=AAEJ7tMQVrrnycBf4R2WYtw9-k_oWI0hXgcW5Cbz2qAnBAFtcv4';

    // DEPR
    // let targets = await fetch(`${BACKEND}&action=get-targets`);
    // window.ALCQ_TARGETS = await targets.json();
    // console.log(window.ALCQ_TARGETS);

    const FY = new URLSearchParams(location.search).get('fy');
    let masterData = await fetch(`${BACKEND}&action=get-master&fy=${FY || ''}`);
    let { departments, targets, years } = await masterData.json();
    window.ALCQ_DEPARTMENTS = departments;
    console.log(window.ALCQ_DEPARTMENTS);
    window.ALCQ_TARGETS = targets;
    console.log(window.ALCQ_TARGETS);
    window.ALCQ_YEARS = years;
    console.log(window.ALCQ_YEARS);

    let departmentData = window.ALCQ_DEPARTMENTS.map(async (d) => {
        const response = await fetch(`${BACKEND}&action=get-report-by-dep&department=${d.id}`);
        return response.json();
    });
    window.ALCQ_SALES_DATA = await Promise.all(departmentData);
    console.log(window.ALCQ_SALES_DATA);
    
    // const PARAMS = { targets, departments, data: departmentData };
    // buildKPIs(PARAMS);
    buildKPIs();
    buildLeaderboards();
    buildSalesByQuarter();
    buildMemberSales();
    buildDepartmentSales();

    document.getElementById('loading-overlay').classList.add('fade-out');
}

/** ENTRY */
window.addEventListener("DOMContentLoaded", loadData);

/** EVENT HANDLERS */
document.getElementById('financialYear').addEventListener('change', e => {
    const selectedValue = e.target.value;
    console.log('financialYear selectedValue', selectedValue);

    const url = new URL(location.href);
    url.searchParams.set('fy', selectedValue);
    console.log('url', url.toString());
    location.href = url.toString();
});

document.getElementById('memberSalesPeriod').addEventListener('change', e => {
    const selectedValue = e.target.value;
    console.log('member selectedValue', selectedValue);

    const MEMBER_DATA = window.ALCQ_TARGETS.filter(t => t.type === '2');
    let filteredData = MEMBER_DATA.map(t => {
        let total = 0;
        window.ALCQ_SALES_DATA.forEach(d => {
            let memberData = d.find(m => m.member === t.id);
            total += memberData ? parseFloat(memberData[selectedValue || 'total']) : 0
            return true;
        });
        return total;
    });
    let filteredTargets = MEMBER_DATA.map(t => t[selectedValue || 'year']);
    window.ALCQ_CHARTS.memberSales.chart.data.datasets[0].data = filteredData;
    window.ALCQ_CHARTS.memberSales.chart.data.datasets[1].data = filteredTargets;
    window.ALCQ_CHARTS.memberSales.chart.update();
});

document.getElementById('departmentSalesPeriod').addEventListener('change', e => {
    const selectedValue = e.target.value;
    console.log('department selectedValue', selectedValue);
    
    window.ALCQ_CHARTS.departmentSales.filters.period = selectedValue;
    updateDepartmentChart();
});
function updateDepartmentChart() {
    const PERIOD = window.ALCQ_CHARTS.departmentSales.filters.period;
    // Allow for future creation of department filter
    let departments = window.ALCQ_CHARTS.departmentSales.filters.department ?
        window.ALCQ_DEPARTMENTS.filter(d => d.id === window.ALCQ_CHARTS.departmentSales.filters.department) : window.ALCQ_DEPARTMENTS;
    let filteredData = departments.map(department => {
        let total = 0;
        window.ALCQ_SALES_DATA.forEach(d => {
            if (window.ALCQ_CHARTS.departmentSales.filters.department) {

            }
            total += d.filter(m => m.id === department.id)
                .reduce((a, b) =>
                    a + parseFloat(b[PERIOD || 'total']),
                    0
                );
            return true;
        });
        return total;
    });
    window.ALCQ_CHARTS.departmentSales.chart.data.datasets[0].data = filteredData;

    let filteredTargets = window.ALCQ_TARGETS.filter(t => t.type === '1').map(t => t[PERIOD || 'year']);
    window.ALCQ_CHARTS.departmentSales.chart.data.datasets[1].data = filteredTargets;
    window.ALCQ_CHARTS.departmentSales.chart.update();
}
