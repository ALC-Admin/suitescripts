/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/log', 'N/search', 'N/ui/message', 'N/ui/serverWidget'],
/**
 * @param{log} log
 * @param{search} search
 * @param{message} message
 * @param{serverWidget} serverWidget
 */
    (log, search, message, serverWidget) => {

        const PRE_CHECK_MESSAGE  = 'Pre-delivery checklists must be completed for items on this order before despatch.';
        const BANNER_FLAG_FIELD  = 'custpage_cmc_pre_check_banner';

        const beforeLoad = (scriptContext) => {

            const DEBUG_IDENTIFIER  = 'beforeLoad';

            try{

                switch(scriptContext.type){

                    case 'view':

                        const new_record  = scriptContext.newRecord;
                        const form        = scriptContext.form;
                        const record_id   = new_record.id;

                        // Flag field already on the form means the banner was added by another execution — skip to prevent stacking
                        if(!isNullOrEmpty(record_id) && isNullOrEmpty(form.getField({ id : BANNER_FLAG_FIELD }))){

                            const pre_check_search = search.create({
                                type : 'salesorder',
                                filters : [
                                    ['type', 'anyof', 'SalesOrd'],
                                    'AND',
                                    ['internalid', 'anyof', record_id],
                                    'AND',
                                    ['mainline', 'is', 'F'],
                                    'AND',
                                    ['taxline', 'is', 'F'],
                                    'AND',
                                    ['shipping', 'is', 'F'],
                                    'AND',
                                    ['cogs', 'is', 'F'],
                                    'AND',
                                    ['item.custitem_cmc_pre_check_req', 'is', 'T']
                                ],
                                columns : [
                                    search.createColumn({ name : 'item' })
                                ]
                            });

                            const pre_check_results  = pre_check_search.run().getRange({ start : 0, end : 1 });

                            log.debug({
                                title   : DEBUG_IDENTIFIER,
                                details : `Record ID: ${record_id} | Pre-check required: ${pre_check_results.length > 0}`
                            });

                            if(pre_check_results.length > 0){

                                const banner_flag  = form.addField({
                                    id    : BANNER_FLAG_FIELD,
                                    type  : serverWidget.FieldType.CHECKBOX,
                                    label : 'Pre-Check Banner'
                                });

                                banner_flag.updateDisplayType({ displayType : serverWidget.FieldDisplayType.HIDDEN });

                                form.addPageInitMessage({
                                    type    : message.Type.WARNING,
                                    title   : 'Pre-Check Required',
                                    message : PRE_CHECK_MESSAGE
                                });
                            }
                        }

                    break;
                }

            }catch(e){

                log.error({
                    title   : DEBUG_IDENTIFIER,
                    details : `${e.name} | ${e.message}`
                });
            }
        }

        function isNullOrEmpty(objVariable){
            return (objVariable == null || objVariable == "" || objVariable == undefined || objVariable == 'undefined');
        };

        return {
            beforeLoad : beforeLoad
        }

    });
