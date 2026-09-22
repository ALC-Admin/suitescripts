/**
 * @NApiVersion             2.1
 * @NScriptType             UserEventScript
 */

define(
    [
        'N/email',
        'N/record',
        'N/search'
    ],
    (
        email,
        record,
        search
    ) => {
        const MODULE = `ALC.UE.FulfillNotification`;
        const SALES_ORDER_LINE_SEARCH = 'customsearch_alc_so_lines';
        const SENDER = '45828'; // Mike Wong
        const SERVICE_BUSINESS_UNIT = '7';

        const buildNotificationBody = ({ orderLines }) => {
            const TITLE = `${MODULE}.BuildNotificationBody`;

            let tranId = orderLines[0].tranId;
            let dateCreated = orderLines[0].dateCreated;

            let body = `
            <style>
                :root { --border-color: #ddd; }
                .email { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
                .email > .lbl { font-weight: 600; }
                .email table {
                    border: 1px solid var(--border-color);
                    border-collapse: collapse;
                }
                .email table > thead > tr > th,
                .email table > tbody > tr > td {
                    border-collapse: collapse; border: 1px solid var(--border-color); padding: 0.25rem;
                }
                th.item, td.item { width: 100px; }
                th.category, td.category { width: 200px; }
                th.memo, td.memo { width: 300px; }
                th.qty, td.qty { width: 80px; }
            </style>
            <div class="email">
                <span class="lbl">Sales Order:</span> ${tranId}<br/>
                <span class="lbl">Date Created:</span> ${dateCreated}<br/><br/>

                <table cellspacing="0" cellpadding="0">
                    <thead>
                    <tr>
                        <th class="item">Item</th>
                        <th class="category">Category</th>
                        <th class="memo">Memo</th>
                        <th class="qty">Qty Fulfilled</th>
                    </tr>
                    </thead>
            `;

            orderLines.forEach(line => {
                body += `<tbody><tr>
                    <td class="item">${line.item}</td>
                    <td class="category">${line.itemCategory}</td>
                    <td class="memo">${line.memo}</td>
                    <td class="qty">${line.fulfilled}</td>
                </tr></tbody>`;
            });

            body += '</table></div>';
            log.debug({ title: TITLE, details: body });
            return body;
        };

        const getSalesOrderLines = ({ id }) => {
            const TITLE = `${MODULE}.GetSalesOrderLines`;
            let lineSearch = search.load({ id: SALES_ORDER_LINE_SEARCH });
            lineSearch.filters.push(
                search.createFilter({ name: 'internalid', operator: 'anyof', values: id })
            );
            log.debug({ title: `${TITLE} filters`, details: lineSearch.filterExpression });

            let output = [];
            let lineResults = lineSearch.run().getRange({ start: 0, end: 1000 });
            lineResults.forEach(line => {
                let itemType = line.getValue(line.columns[5])?.toUpperCase();
                log.audit({ title: TITLE, details: `itemType = ${itemType}` });
                if (itemType !== 'INVTPART') {
                    return true;
                }
                
                output.push({
                    department: line.getValue(line.columns[0]),
                    inventory: parseInt(line.getValue(line.columns[1]) || '0'),
                    fulfilled: parseInt(line.getValue(line.columns[2]) || '0'),
                    dateCreated: line.getValue(line.columns[3]),
                    item: line.getValue(line.columns[4]),
                    tranId: line.getValue(line.columns[6]),
                    memo: line.getValue(line.columns[7]),
                    itemCategory: line.getValue(line.columns[8])
                });
                log.debug({ title: TITLE, details: output[output.length - 1] });
            });

            return output;
        };

        const sendNotification = ({ orderLines }) => {
            const TITLE = `${MODULE}.SendNotification`;

            let tranId = orderLines[0].tranId;
            try {
                email.send({
                    author: SENDER,
                    recipients: [ 'service@alphalifecare.com.au' ],
                    subject: `All parts for ${tranId} have been fulfilled`,
                    body: buildNotificationBody({ orderLines })
                });
                log.audit({ title: TITLE, details: `Successfully sent shipping email notification!` });
            }
            catch (ex) {
                log.error({ title: TITLE, details: ex.toString() });
            }
        };

        const validateItemFulfillment = ({ newRecord, type }) => {
            const TITLE = `${MODULE}.ValidateItemFulfillment`;

            if ([ 'create', 'edit', 'ship' ].indexOf(type) < 0) {
                log.audit({ title: TITLE, details: `Invalid event type (${type}). Exiting...` });
                return false;
            }

            let shipStatus = newRecord.getValue({ fieldId: 'shipstatus' });
            if (shipStatus !== 'C') {
                log.audit({ title: TITLE, details: `Invalid ship status (${shipStatus}). Exiting...` });
                return false;
            }

            let createdFrom = newRecord.getValue({ fieldId: 'createdfrom' });
            if (!createdFrom) {
                log.audit({ title: TITLE, details: `Item Fulfillment does not have a linked Sales Order. Exiting...` });
                return false;
            }

            return true;
        };

        return {
            afterSubmit: ({ newRecord, type }) => {
                const TITLE = `${MODULE}.AfterSubmit`;

                if (validateItemFulfillment({ newRecord, type }) !== true) { return; }

                let createdFrom = newRecord.getValue({ fieldId: 'createdfrom' });
                let orderLines = getSalesOrderLines({ id: createdFrom });
                if (orderLines.length <= 0) {
                    log.audit({ title: TITLE, details: `No valid sales order lines found. Exiting...` });
                    return false;
                }

                let department = orderLines[0].department;
                if (department.toString() !== SERVICE_BUSINESS_UNIT) {
                    log.audit({ title: TITLE, details: `Sales order Business Unit is not "Service." Exiting...` });
                    return;
                }

                let incompleteLines = orderLines.filter(line => line.fulfilled < line.inventory);
                if (incompleteLines.length > 0) {
                    log.audit({ title: TITLE, details: `Not all inventory lines are completely fulfilled. Exiting...` });
                    return;
                }

                sendNotification({ orderLines });
            }
        };
    }
);
