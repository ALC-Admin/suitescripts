/**
 * @NApiVersion             2.1
 * @NModuleScope            SameAccount
 * @NScriptType             ClientScript
 */

define(
    [
        'N/ui/message'
    ],
    (
        message
    ) => {
        const MODULE = `ALC.CS.SalesTargets`;
        const BACKEND = 'https://11346072.app.netsuite.com/app/site/hosting/scriptlet.nl?script=5214&deploy=1';

        const submitForm = async ({ currentRecord }) => {
            let type = currentRecord.getValue({ fieldId: 'custpage_st_type' });
            let year = currentRecord.getValue({ fieldId: 'custpage_st_year' });
            let validateResponse = await fetch(`${BACKEND}&action=validate&type=${type}&year=${year}`);
            let jsonResponse = await validateResponse.json();
            console.log('jsonResponse', jsonResponse);
            
            if (!jsonResponse.ok && jsonResponse.error) {
                message.create({
                    type: message.Type.ERROR,
                    title: 'Form Validation Error',
                    message: jsonResponse.error
                }).show({ duration: 5000 });
                return;
            }
            else if (jsonResponse.ok) {
                document.getElementById('main_form').submit();
            }
        };

        return {
            pageInit: () => {
                window.onbeforeunload = {};
                if (window.ALCQ_SUCCESS) {
                    message.create({
                        type: message.Type.CONFIRMATION,
                        title: 'Success',
                        message: 'The targets file has been successfully uploaded.'
                    }).show({ duration: 5000 });
                }
            },

            saveRecord: ({ currentRecord }) => {
                let type = currentRecord.getValue({ fieldId: 'custpage_st_type' });
                let year = currentRecord.getValue({ fieldId: 'custpage_st_year' });
                let file = currentRecord.getValue({ fieldId: 'custpage_st_file' });

                if (!type || !year || !file) {
                    message.create({
                        type: message.Type.ERROR,
                        title: 'Form Validation Error',
                        message: 'Please fill out all fields before submitting.'
                    }).show({ duration: 5000 });
                    return false;
                }
                
                submitForm({ currentRecord });
                return false;
            }
        };
    }
);
