function buildSalesLeaderBoard(PARAMS) {
    let { data, targets } = PARAMS;

    let repTotals = targets.map(rep => {
        let total = 0;
        data.forEach(d => {
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

function buildSalesVsTargetsBoard(PARAMS) {
    let { data, departments, targets } = PARAMS;

    let targetGaps = targets.map(rep => {
        let total = data.reduce((sum, next) => {
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

function buildDepartmentBoard(PARAMS) {
    let { data, departments } = PARAMS;

    let departmentValues = departments.map(department => {
        let total = 0;
        data.forEach(d => {
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

function buildLeaderboards(PARAMS) {
    buildSalesLeaderBoard(PARAMS);
    buildSalesVsTargetsBoard(PARAMS);
    buildDepartmentBoard(PARAMS);
}
