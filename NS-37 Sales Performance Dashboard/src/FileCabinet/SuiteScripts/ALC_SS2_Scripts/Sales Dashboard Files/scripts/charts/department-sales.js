function buildDepartmentSales(PARAMS) {
    let { targets, departments, data } = PARAMS;

    const departmentSelect = document.getElementById('departmentSalesDepartment');
    let options = '<option value="">All departments</option>';
    window.ALCQ_DEPARTMENTS.forEach(d => {
        options += `<option value="${d.id}">${d.name}</option>`;
    });
    departmentSelect.innerHTML = options;

    let departmentValues = departments.map(department => {
        let total = 0;
        data.forEach(d => {
            total += d.filter(m => m.id === department.id).reduce((a, b) => a + parseFloat(b.total), 0);
            return true;
        });
        return total;
    });

    const ctxDS = document.getElementById('chartDepartmentSales');
    const barWidth = 40;
    const chartPadding = 10;
    const chartHeight = (departmentValues.length * (barWidth + chartPadding)) + chartPadding;
    ctxDS.style.height = `${chartHeight}px`;
    ctxDS.style.width = `100%`;
    
    new Chart(ctxDS, {
        type: 'bar',
        data: {
            labels: departments.map(d => d.name),
            datasets: [{
                label: 'Sales ($)',
                data: departmentValues,
                borderWidth: 0
            }]
        },
        options: {
            indexAxis: 'y',
            barPercentage: 0.8,
            categoryPercentage: 0.5,
            barThickness: 20,
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
            }
        }
    });
}