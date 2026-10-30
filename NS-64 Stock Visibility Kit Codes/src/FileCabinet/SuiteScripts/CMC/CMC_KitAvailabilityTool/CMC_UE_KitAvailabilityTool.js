/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/log', 'N/url', 'N/format', 'N/runtime'],
    /**
 * @param{log} log
 * @param{url} url
 * @param{format} format
 * @param{runtime} runtime
 */
    (log, url, format, runtime) => {

        const SCRIPT_ID      = 'customscript_cmc_sl_kitavailabilitytool';
        const DEPLOYMENT_ID  = 'customdeploy_cmc_sl_kitavailabilitytool';

        /**
         * Adds a Check Availability button to Kit and Assembly items. Opens the Kit Availability Tool in a new tab
         * for this item, across all locations, with Forecast To set to today.
         */
        const beforeLoad = (scriptContext) => {

            const DEBUG_IDENTIFIER  = 'beforeLoad';

            try{

                switch(scriptContext.type){

                    case 'view':

                        const new_record  = scriptContext.newRecord;
                        const form        = scriptContext.form;

                        const target_url  = url.resolveScript({
                            scriptId     : SCRIPT_ID,
                            deploymentId : DEPLOYMENT_ID,
                            params       : {
                                'kit'         : new_record.id,
                                'forecast_to' : getToday(),
                                'search'      : true
                            }
                        });

                        log.debug({
                            title   : DEBUG_IDENTIFIER,
                            details : `item: ${new_record.id} | type: ${new_record.type} | target_url: ${target_url}`
                        });

                        form.addButton({
                            id           : 'custpage_cmc_check_availability',
                            label        : 'Check Availability',
                            functionName : `window.open('${target_url}', '_blank')`
                        });

                    break;
                }

            }catch(e){

                log.error({
                    title   : DEBUG_IDENTIFIER,
                    details : `${e.name} | ${e.message}`
                });
            }
        }

        /**
         * Today's date in the user's time zone, in their date format. The server runs on US time, which would
         * otherwise put "today" a day behind for Australian users.
         */
        function getToday(){

            try{

                const timezone  = runtime.getCurrentUser().getPreference({name : 'TIMEZONE'});
                const now_text  = format.format({value : new Date(), type : format.Type.DATETIMETZ, timezone : timezone});

                return now_text.split(' ')[0];

            }catch(e){

                log.error({
                    title   : 'getToday',
                    details : `${e.name} | ${e.message}`
                });

                return format.format({value : new Date(), type : format.Type.DATE});
            }
        }

        return {
            beforeLoad : beforeLoad
        }

    });
