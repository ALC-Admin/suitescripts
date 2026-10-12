/**
 * @NApiVersion             2.1
 * @NScriptType             Suitelet
 */

define(
    [
        'N/file',
        'N/record',
        'N/runtime',
        'N/search',
        'N/ui/serverWidget'
    ],
    (
        file,
        record,
        runtime,
        search,
        sw
    ) => {
        const MODULE = `ALC.SL.SalesTargets`;
        const DATA_FOLDER = '740644';
        const SALES_TARGET = {
            ID: 'customrecord_alc_sales_trgt',
            Fields: {
                Inactive: 'isinactive',
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
            name: SALES_TARGET.Fields.SalesRep,
            year: SALES_TARGET.Fields.FinancialYear,
            q1: SALES_TARGET.Fields.Q1,
            q2: SALES_TARGET.Fields.Q2,
            q3: SALES_TARGET.Fields.Q3,
            q4: SALES_TARGET.Fields.Q4,
            annualtotal: SALES_TARGET.Fields.Total
        };

        const buildForm = ({ response }) => {
            const TITLE = `${MODULE}.BuildForm`;
            
            let form = sw.createForm({ title: 'Sales Target Upload Form' });
            form.addField({
                type: sw.FieldType.TEXT,
                label: 'Financial Year',
                id: 'custpage_st_year'
            });
            form.addField({
                type: sw.FieldType.FILE,
                label: 'Sales Target File (CSV)',
                id: 'custpage_st_file'
            });
            form.addSubmitButton({ label: 'Submit File' });
            response.writePage({ pageObject: form });
        };

        const submitForm = ({ request, response }) => {
            const TITLE = `${MODULE}.SubmitForm`;
            let files = request.files;
            log.debug({ title: TITLE, details: files });
            files.custpage_st_file.folder = DATA_FOLDER;
            
            let fileId = files.custpage_st_file.save();
            log.debug({ title: TITLE, details: `File successfully saved: ${fileId}` });

            log.debug({ title: TITLE, details: request.parameters });
            let year = request.parameters.custpage_st_year;

            let parseResult = parseTargetsFile({ id: fileId, year });
            response.write({ output: parseResult === true ?
                `Sales targets for financial year ${year} have been successfully uploaded.` :
                `An error has occurred while parsing the ${year} sales targets.`
            });
        };

        const parseTargetsFile = ({ id, year }) => {
            const TITLE = `${MODULE}.ParseTargetsFile`;
            let fileObject = file.load({ id });
            let contents = fileObject.getContents();
            log.debug({ title: TITLE, details: contents });
            let lines = contents.split('\n');
            log.debug({ title: TITLE, details: `lines = ${lines.length}` });

            let output = [];
            let headers = lines[0].split(',').map(d => d.replace(/\s/g, '').toLowerCase());
            for (let i = 1, count = lines.length; i < count; i++) {
                let values = lines[i].split(',');
                let salesTarget = record.create({ type: SALES_TARGET.ID });
                headers.forEach((h, ix) => {
                    if (h === 'name') {
                        salesTarget.setText({ fieldId: DATA_MAP[h], text: values[ix] });
                    }
                    else {
                        salesTarget.setValue({ fieldId: DATA_MAP[h], value: values[ix] });
                    }

                    if (year) {
                        salesTarget.setValue({ fieldId: SALES_TARGET.Fields.FinancialYear, value: year });
                    }
                });
                try {
                    let targetId = salesTarget.save();
                    log.debug({ title: TITLE, details: `Successfully created sales target ID ${targetId}` });
                    return true;
                }
                catch (ex) {
                    log.error({ title: TITLE, details: ex.toString() });
                    return false;
                }
            }
        };

        return {
            onRequest: ({ request, response }) => {
                const TITLE = `${MODULE}.Request`;
                
                let { method, parameters } = request;
                // if (method.toUpperCase() !== 'GET') {
                //     log.audit({ title: TITLE, details: `Invalid method (${method.toUpperCase()}). Exiting...` });
                //     return;
                // }

                // let { action } = parameters || {};
                // switch (action?.toUpperCase()) {
                //     default: buildForm({ response });
                // }

                // parseTargetsFile({ id: '1388599' });

                if (method.toUpperCase() === 'GET') {
                    buildForm({ response });
                }
                else {
                    submitForm({ request, response });
                }
            }
        };
    }
);