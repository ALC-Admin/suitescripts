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
        const DATA_FOLDER = '935497';
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
            department: SALES_TARGET.Fields.Department,
            name: SALES_TARGET.Fields.SalesRep,
            year: SALES_TARGET.Fields.FinancialYear,
            q1: SALES_TARGET.Fields.Q1,
            q2: SALES_TARGET.Fields.Q2,
            q3: SALES_TARGET.Fields.Q3,
            q4: SALES_TARGET.Fields.Q4,
            annualtotal: SALES_TARGET.Fields.Total
        };

        const buildForm = ({ response, message, error }) => {
            const TITLE = `${MODULE}.BuildForm`;
            
            let form = sw.createForm({ title: 'Sales Target Upload Form' });
            form.addField({
                type: sw.FieldType.TEXT,
                label: 'Financial Year',
                id: 'custpage_st_year'
            });
            form.addField({
                type: sw.FieldType.SELECT,
                label: 'Targets Type',
                id: 'custpage_st_type',
                source: 'customlist_alc_sales_trgt_type'
            });
            form.addField({
                type: sw.FieldType.FILE,
                label: 'Sales Target File (CSV)',
                id: 'custpage_st_file'
            });

            if (message) {
                let fld = form.addField({
                    type: sw.FieldType.INLINEHTML,
                    label: 'Message',
                    id: 'custpage_st_msg'
                });
                fld.defaultValue = `<script>
                    window.ALCQ_SUCCESS = "${message}";
                </script>`;
            }
            if (error) {
                let fld = form.addField({
                    type: sw.FieldType.INLINEHTML,
                    label: 'Error',
                    id: 'custpage_st_msg'
                });
                fld.defaultValue = `<script>
                    window.ALCQ_ERROR = "${error}";
                </script>`;
            }

            form.clientScriptModulePath = './ALC_CS_SalesTargets';
            form.addSubmitButton({ label: 'Submit File' });
            response.writePage({ pageObject: form });
        };

        const submitForm = ({ request, response }) => {
            const TITLE = `${MODULE}.SubmitForm`;

            // let hasYearTargets = validateYearTargets({
            //     type: request.parameters.type,
            //     year: request.parameters.year
            // });
            // if (hasYearTargets) {
            //     log.debug({ title: TITLE, details: `` })
            // }
            // response.write({ output: hasYearTargets.toString() });
            // return;

            let files = request.files;
            log.debug({ title: TITLE, details: files });
            files.custpage_st_file.folder = DATA_FOLDER;
            
            let fileId = files.custpage_st_file.save();
            log.debug({ title: TITLE, details: `File successfully saved: ${fileId}` });

            log.debug({ title: TITLE, details: request.parameters });
            let type = request.parameters.custpage_st_type;
            let year = request.parameters.custpage_st_year;

            let parseResult = parseTargetsFile({ id: fileId, type, year });
            if (parseResult) {
                buildForm({ response, message: `Targets for financial year ${year} have been successfully uploaded.` });
            }
            else {
                buildForm({ response, error: `An error has occurred while parsing the ${year} targets.` });
            }
        };

        const parseTargetsFile = ({ id, type, year }) => {
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
                salesTarget.setValue({ fieldId: SALES_TARGET.Fields.Type, value: type });

                headers.forEach((h, ix) => {
                    if ([ 'department', 'name' ].indexOf(h) >= 0) {
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
                }
                catch (ex) {
                    log.error({ title: TITLE, details: ex.toString() });
                    return false;
                }
            }

            return true;
        };

        const validateYearTargets = ({ type, year }) => {
            const TITLE = `${MODULE}.ValidateYearTargets`;

            if (!type || !year) {
                let msg = 'Missing type or year. Please check and try again.';
                log.debug({ title: TITLE, details: msg });
                return { ok: false, error: msg };
            }

            log.debug({ title: TITLE, details: `type = ${type}; year = ${year}` });
            let targetSearch = search.create({
                type: SALES_TARGET.ID,
                filters: [
                    [ SALES_TARGET.Fields.Inactive, 'is', false ], 'AND',
                    [ SALES_TARGET.Fields.Type, 'anyof', type ], 'AND',
                    [ SALES_TARGET.Fields.FinancialYear, 'is', year || getFinancialYear().toString() ]
                ],
                columns: Object.values(SALES_TARGET.Fields)
            });

            let targetResults = targetSearch.run().getRange({ start: 0, end: 1000 });
            log.debug({ title: TITLE, details: `targetResults = ${targetResults.length}` });

            let obj = { ok: targetResults.length <= 0 }
            if (!obj.ok) {
                obj.error = 'Targets already exist for this type and/or year.'
            };

            return obj;
        };

        return {
            onRequest: ({ request, response }) => {
                const TITLE = `${MODULE}.Request`;
                
                let { method, parameters } = request;

                if (method.toUpperCase() === 'GET') {
                    switch (parameters.action) {
                        case 'validate': {
                            let validate = validateYearTargets(parameters);
                            log.debug({ title: TITLE, details: validate });
                            response.write({ output: JSON.stringify(validateYearTargets(parameters)) });
                            break;
                        }
                        default: buildForm({ response });
                    }
                }
                else {
                    submitForm({ request, response });
                }
            }
        };
    }
);
