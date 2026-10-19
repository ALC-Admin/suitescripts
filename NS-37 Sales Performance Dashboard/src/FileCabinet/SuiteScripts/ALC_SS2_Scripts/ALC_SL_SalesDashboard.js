/**
 * @NApiVersion             2.1
 * @NScriptType             Suitelet
 */

define(
    [
        'N/file',
        'N/runtime',
        'N/search',
        'N/url'
    ],
    (
        file,
        runtime,
        search,
        url
    ) => {
        const MODULE = `ALC.SL.SalesDashboard`;
        const DASHBOARD_FILES = {
            HTML: 'sales_dash.html',
            // CSS: 'sales_dash.css',
            // JS: 'sales_dash.js',
        };
        const SALES_TARGET = {
            ID: 'customrecord_alc_sales_trgt',
            Fields: {
                Inactive: 'isinactive',
                Type: 'custrecord_alc_sales_trgt_type',
                Department: 'custrecord_alc_sales_trgt_dep',
                SalesRep: 'custrecord_alc_sales_trgt_rep',
                FinancialYear: 'custrecord_alc_sales_trgt_year',
                Q1: 'custrecord_alc_sales_trgt_q1',
                Q2: 'custrecord_alc_sales_trgt_q2',
                Q3: 'custrecord_alc_sales_trgt_q3',
                Q4: 'custrecord_alc_sales_trgt_q4',
                Total: 'custrecord_alc_sales_trgt_total'
            }
        };
        const DATA_MAP = {
            id: SALES_TARGET.Fields.SalesRep,
            type: SALES_TARGET.Fields.Type,
            dep: SALES_TARGET.Fields.Department,
            fy: SALES_TARGET.Fields.FinancialYear,
            q1: SALES_TARGET.Fields.Q1,
            q2: SALES_TARGET.Fields.Q2,
            q3: SALES_TARGET.Fields.Q3,
            q4: SALES_TARGET.Fields.Q4,
            year: SALES_TARGET.Fields.Total
        };

        const getDashboardFiles = () => {
            const TITLE = `${MODULE}.GetFiles`;
            let output = [];

            let filters = [];
            for (const [key, value] of Object.entries(DASHBOARD_FILES)) {
                filters.push([ 'name', 'startswith', value ]);
                filters.push('OR');
            }
            if (filters.length > 0) filters.pop();

            let fileSearch = search.create({
                type: 'file',
                filters,
                columns: [ 'name' ]
            });
            // log.debug({ title: TITLE, details: fileSearch });

            let fileResults = fileSearch.run().getRange({ start: 0, end: Object.keys(DASHBOARD_FILES).length });
            output = fileResults.map(f => {
                return {
                    id: f.id,
                    name: f.getValue({ name: 'name' }),
                    contents: file.load(f.id).getContents()
                };
            });

            // log.debug({ title: TITLE, details: output });
            return output;
        };

        const getDepartments = () => {
            const TITLE = `${MODULE}.GetDepartments`;

            let departmentSearch = search.create({
                type: 'department',
                filters: [
                    [ 'isinactive', 'is', false ]
                ],
                columns: [ 'internalid', 'name' ]
            });
            let departmentResults = departmentSearch.run().getRange({ start: 0, end: 1000 });
            let output = departmentResults.map(d => {
                return {
                    id: d.id,
                    name: d.getValue({ name: 'name' })
                }
            });

            // log.debug({ title: TITLE, details: output });
            return output;
        };

        /* const getSalesTeam = () => {
            const TITLE = `${MODULE}.GetSalesTeam`;

            let employeeSearch = search.create({
                type: 'employee',
                filters: [
                    [ 'isinactive', 'is', false ], 'AND',
                    [ 'salesrep', 'is', true ]
                ],
                columns: [ 'firstname', 'lastname' ]
            });
            let employeeResults = employeeSearch.run().getRange({ start: 0, end: 1000 });
            let output = employeeResults.map(r => {
                return {
                    id: r.id,
                    name: `${r.getValue({ name: 'firstname' })} ${r.getValue({ name: 'lastname' })}`
                };
            });

            log.debug({ title: TITLE, details: output });
            return output;
        }; */

        /* const getSalesReport = () => {
            const TITLE = `${MODULE}.GetSalesReport`;

            let targets = getSalesTargets();
            let salesSearch = search.load({ id: 'customsearch_alcq_sales_qdep' }); // customsearch_alcq_invoiced_so_q
            let salesResults = salesSearch.run().getRange({ start: 0, end: 1000 });
            // log.debug({ title: TITLE, details: salesResults[1] });

            let report = salesResults.map(d => {
                return {
                    id: d.getValue(d.columns[0]),
                    member: d.getText(d.columns[0]),
                    target: targets.find(t => t.id === d.getValue(d.columns[0])),
                    total: d.getValue(d.columns[1]),
                    acute: {
                        q1: d.getValue(d.columns[2]),
                        q2: d.getValue(d.columns[3]),
                        q3: d.getValue(d.columns[4]),
                        q4: d.getValue(d.columns[5]),
                    },
                    aged: {
                        q1: d.getValue(d.columns[6]),
                        q2: d.getValue(d.columns[7]),
                        q3: d.getValue(d.columns[8]),
                        q4: d.getValue(d.columns[9]),
                    },
                    community: {
                        q1: d.getValue(d.columns[10]),
                        q2: d.getValue(d.columns[11]),
                        q3: d.getValue(d.columns[12]),
                        q4: d.getValue(d.columns[13]),
                    },
                    hire: {
                        q1: d.getValue(d.columns[14]),
                        q2: d.getValue(d.columns[15]),
                        q3: d.getValue(d.columns[16]),
                        q4: d.getValue(d.columns[17]),
                    },
                    cq: {
                        q1: d.getValue(d.columns[18]),
                        q2: d.getValue(d.columns[19]),
                        q3: d.getValue(d.columns[20]),
                        q4: d.getValue(d.columns[21]),
                    },
                    direct: {
                        q1: d.getValue(d.columns[22]),
                        q2: d.getValue(d.columns[23]),
                        q3: d.getValue(d.columns[24]),
                        q4: d.getValue(d.columns[25]),
                    },
                    service: {
                        q1: d.getValue(d.columns[26]),
                        q2: d.getValue(d.columns[27]),
                        q3: d.getValue(d.columns[28]),
                        q4: d.getValue(d.columns[29]),
                    },
                    other: {
                        q1: d.getValue(d.columns[30]),
                        q2: d.getValue(d.columns[31]),
                        q3: d.getValue(d.columns[32]),
                        q4: d.getValue(d.columns[33]),
                    },
                };
            }).filter(d => !!d.target === true);
            // log.debug({ title: TITLE, details: report[0] });

            return report;
        }; */

        const getSalesReportByDepartment = (parameters) => {
            const TITLE = `${MODULE}.GetSalesReportByDepartment`;

            let { department, fy } = parameters;
            // log.debug({ title: TITLE, details: `department = ${department}` });
            if (!department) {
                log.debug({ title: TITLE, details: 'No department. Exiting...' });
                return []
            }
            // if (!salesrep) { return [] }

            // let targets = getSalesTargets();
            let salesSearch = search.load({ id: 'customsearch_alcq_sales_qdep_2' });
            // log.debug({ title: TITLE, details: salesSearch.filterExpression });

            salesSearch.filterExpression = [
                ...salesSearch.filterExpression,
                'AND',
                [ 'department', 'is', department ]
            ];
            // log.debug({ title: TITLE, details: salesSearch.filterExpression });
            // salesSearch.filters.push(search.createFilter({
            //     // name: 'internalid',
            //     name: 'department',
            //     operator: 'is',
            //     value: dep
            // }));
            let salesResults = salesSearch.run().getRange({ start: 0, end: 1000 });

            let report = salesResults.map(d => {
                return {
                    id: d.getValue(d.columns[0]),
                    member: d.getValue(d.columns[1]),
                    memberName: d.getText(d.columns[1]),
                    total: d.getValue(d.columns[2]),
                    q1: d.getValue(d.columns[3]),
                    q2: d.getValue(d.columns[4]),
                    q3: d.getValue(d.columns[5]),
                    q4: d.getValue(d.columns[6])
                };
            });

            // log.debug({ title: TITLE, details: report });
            return report;
        };

        const getFinancialYear = () => {
            let now = new Date();
            let year = now.getFullYear();
            return now.getMonth() >= 6 ? parseInt(year) + 1 : year;
        };

        const getSalesTargets = (year) => {
            const TITLE = `${MODULE}.GetSalesTargets`;

            let targetSearch = search.create({
                type: SALES_TARGET.ID,
                filters: [
                    [ SALES_TARGET.Fields.Inactive, 'is', false ], 'AND',
                    [ SALES_TARGET.Fields.FinancialYear, 'is', year || getFinancialYear().toString() ]
                ],
                columns: Object.values(SALES_TARGET.Fields)
            });

            let targetResults = targetSearch.run().getRange({ start: 0, end: 1000 });
            log.debug({ title: `${TITLE} columns`, details: targetResults[0].columns });
            // let output = {
            //     departments: [],
            //     members: []
            // };
            let output = targetResults.map(d => {
                let obj = {};
                Object.values(SALES_TARGET.Fields).forEach(f => {
                    if (f.toLowerCase() === 'isinactive') { return true; }
                    obj[Object.keys(DATA_MAP).find(key => DATA_MAP[key] === f)] = d.getValue({ name: f })
                });
                if (obj.type === '1') {
                    obj.id = JSON.stringify(d.dep);
                    obj.name = d.getText({ name: SALES_TARGET.Fields.Department });
                }
                else {
                    obj.name = d.getText({ name: SALES_TARGET.Fields.SalesRep });
                }

                if (!obj.dep) { delete obj.dep }
                // delete obj.dep;
                return obj;
            });
            log.debug({ title: TITLE, details: output });

            return output;
        };

        const getYears = () => {
            const TITLE = `${MODULE}.GetYears`;

            let yearSearch = search.create({
                type: SALES_TARGET.ID,
                filters: [
                    [ SALES_TARGET.Fields.Inactive, 'is', false ]
                ],
                columns: [
                    search.createColumn({
                        name: SALES_TARGET.Fields.FinancialYear,
                        summary: search.Summary.GROUP
                    })
                ]
            });
            let yearResults = yearSearch.run().getRange({ start: 0, end: 1000 });
            let output = yearResults.map(d =>
                d.getValue({
                    name: SALES_TARGET.Fields.FinancialYear,
                    summary: search.Summary.GROUP
                })
            );
            log.debug({ title: TITLE, details: output });
            return output;
        };

        const renderSalesDashboard = ({ method }) => {
            const TITLE = `${MODULE}.RenderSalesDashboard`;
            if (method.toUpperCase() !== 'GET') {
                let msg = `Invalid method: ${method.toUpperCase()}`;
                log.audit({ title: TITLE, details: msg });
                return msg;
            }

            let dashboardFiles = getDashboardFiles();
            let html = dashboardFiles.find(f => f.name === DASHBOARD_FILES.HTML);

            let externalUrl = url.resolveScript({
                scriptId: runtime.getCurrentScript().id,
                deploymentId: runtime.getCurrentScript().deploymentId,
                returnExternalUrl: true
            });
            // log.debug({ title: TITLE, details: externalUrl });

            let output = html.contents.replace('{{BACKEND}}', externalUrl);
            // return html.contents;

            // let employees = getSalesTeam();
            // let report = getSalesReport();
            // let output = html.contents.replace('{{DATA}}', JSON.stringify(report));

            // let members = report.map(d => {
            //     return { id: d.id, name: d.member };
            // });
            // output = output.replace('{{TEAM}}', JSON.stringify(members));

            // let targets = getSalesTargets();
            // output = output.replace('{{TARGETS}}', JSON.stringify(targets));
            
            return output;
        };

        return {
            onRequest: ({ request, response }) => {
                const TITLE = `${MODULE}.Request`;
                
                let output = 'Not yet implemented.';
                const { action, fy } = request.parameters;
                switch (action?.toLowerCase()) {
                    case 'get-departments': {
                        response.setHeader({
                            name: 'Content-Type',
                            value: 'application/json'
                        });
                        output = JSON.stringify(getDepartments());
                        break;
                    }
                    // case 'get-targets': {
                        // response.setHeader({
                        //     name: 'Content-Type',
                        //     value: 'application/json'
                        // });
                    //     output = JSON.stringify(getSalesTargets(fy));
                    //     break;
                    // }
                    case 'get-master': {
                        output = JSON.stringify({
                            departments: getDepartments(),
                            targets: getSalesTargets(fy),
                            years: getYears()
                        });
                        break;
                    }
                    // case 'get-report': {
                        // response.setHeader({
                        //     name: 'Content-Type',
                        //     value: 'application/json'
                        // });
                    //     output = JSON.stringify(getSalesReport());
                    //     break;
                    // }
                    case 'get-report-by-dep': {
                        // response.setHeader({
                        //     name: 'Content-Type',
                        //     value: 'application/json'
                        // });
                        output = JSON.stringify(getSalesReportByDepartment(request.parameters));
                        break;
                    }
                    default: {
                        // response.setHeader({
                        //     name: 'Content-Type',
                        //     value: 'text/html'
                        // });
                        output = renderSalesDashboard(request);
                    }
                }

                response.addHeader({
                    name: 'Access-Control-Allow-Origin',
                    value: '*'
                });
                response.write({ output });
            }
        };
    }
);
