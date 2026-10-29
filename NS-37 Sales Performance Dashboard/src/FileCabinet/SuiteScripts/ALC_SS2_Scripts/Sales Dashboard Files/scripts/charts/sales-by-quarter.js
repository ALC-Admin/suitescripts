function buildSalesByQuarter(PARAMS) {
    let { targets, departments, data } = PARAMS;
    let quarterlyTargets = [];
    let quarterlyValues = [];

    for (let i = 1; i <= 4; i++) {
        let sumQuarter = 0;
        let sumTarget = 0;

        sumTarget = targets.reduce((a, b) => a + parseFloat(b[`q${i}`] || '0'), 0);

        data.forEach(d => {
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