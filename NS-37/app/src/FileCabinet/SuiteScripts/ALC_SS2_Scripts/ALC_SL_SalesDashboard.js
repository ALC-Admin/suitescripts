/**
 * @NApiVersion             2.1
 * @NScriptType             Suitelet
 */

define(
    [
        'N/file',
        'N/search'
    ],
    (
        file,
        search
    ) => {
        const MODULE = `ALC.SL.SalesDashboard`;
        const DASHBOARD_FILES = {
            HTML: 'sales_dash.html',
            CSS: 'sales_dash.css',
            JS: 'sales_dash.js',
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
            log.debug({ title: TITLE, details: fileSearch });

            let fileResults = fileSearch.run().getRange({ start: 0, end: Object.keys(DASHBOARD_FILES).length });
            output = fileResults.map(f => {
                return {
                    id: f.id,
                    name: f.getValue({ name: 'name' }),
                    // contents: file.load(f.id).getContents()
                };
            });

            log.debug({ title: TITLE, details: output });
            return output;
        };

        const renderSalesDashboard = ({ method }) => {
            const TITLE = `${MODULE}.RenderSalesDashboard`;
            if (method.toUpperCase() !== 'GET') {
                let msg = `Invalid method: ${method.toUpperCase()}`;
                log.debug({ title: TITLE, details: msg });
                return msg;
            }

            let dashboardFiles = getDashboardFiles();
            let html = dashboardFiles.find(f => f.name === DASHBOARD_FILES.HTML);


            return JSON.stringify(html);
        };

        return {
            onRequest: ({ request, response }) => {
                const TITLE = `${MODULE}.Request`;
                
                let output = 'Not yet implemented.';
                const { action } = request.parameters;
                switch (action?.toLowerCase()) {
                    case 'sales-dash': {
                        output = renderSalesDashboard(request);
                        break;
                    }
                }

                response.write({ output });
            }
        };
    }
);
