async function loadData() {
    const BACKEND = 'https://11346072.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=5114&deploy=1&compid=11346072&ns-at=AAEJ7tMQVrrnycBf4R2WYtw9-k_oWI0hXgcW5Cbz2qAnBAFtcv4';

    let targets = await fetch(`${BACKEND}&action=get-targets`);
    targets = await targets.json();
    console.log(targets);

    let departments = await fetch(`${BACKEND}&action=get-departments`);
    departments = await departments.json();
    console.log(departments);

    let departmentData = departments.map(async (d) => {
        const response = await fetch(`${BACKEND}&action=get-report-by-dep&department=${d.id}`);
        return response.json();
    });
    departmentData = await Promise.all(departmentData);
    console.log(departmentData);
    
    const PARAMS = { targets, departments, data: departmentData };
    buildKPIs(PARAMS);
    buildLeaderboards(PARAMS);
    buildSalesByQuarter(PARAMS);
    buildMemberSales(PARAMS);
    buildDepartmentSales(PARAMS);
}