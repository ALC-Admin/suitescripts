function buildMemberSales(PARAMS) {
    let { targets, departments, data } = PARAMS;

    // const memberSelect = document.getElementById('memberSalesMember');
    // let memberOptions = '<option value="">All members</option>';
    // targets.forEach(d => {
    //     memberOptions += `<option value="${d.id}">${d.name}</option>`;
    // });
    // memberSelect.innerHTML = memberOptions;

    let memberValues = targets.map(t => {
        // console.log('*** t ***', t);
        let total = 0;
        data.forEach(d => {
            // console.log('  >> d', d)
            let memberData = d.find(m => m.member === t.id);
            total += memberData ? parseFloat(memberData.total) : 0
            return true;
        });
        return total;
    });
    let memberTargets = targets.map(t => t.year);
    
    const ctxMS = document.getElementById('chartMemberSales');
    const barWidth = 80;
    const chartPadding = 20;
    const chartHeight = (data.length * (barWidth + chartPadding)) + chartPadding;
    ctxMS.style.height = `${chartHeight}px`;
    ctxMS.style.width = `100%`;
    
    new Chart(ctxMS, {
        type: 'bar',
        data: {
            labels: targets.map(t => t.name),
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
        options: {
            indexAxis: 'y',
            barPercentage: 0.8,
            categoryPercentage: 0.5,
            barThickness: 15,
            // maintainAspectRatio: false,
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
            }
        }
    });
}