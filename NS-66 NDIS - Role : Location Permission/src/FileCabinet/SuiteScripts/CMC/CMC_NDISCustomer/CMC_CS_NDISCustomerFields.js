/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/log'],
    /**
     * @param{log} log
     */
    function(log){

        const NDIS_CUSTOMER_FIELD  = 'custentity_alc_ndis_customer';
        const NDIS_NUMBER_FIELD    = 'custentity_ndis_number';
        const NUMBER_REQUIRED_MSG  = 'Please enter an NDIS Number. It is required when Is NDIS Customer is ticked.';

        function pageInit(scriptContext){

            const DEBUG_IDENTIFIER  = 'pageInit';

            try{

                setNDISNumberDisplay(scriptContext.currentRecord);

            }catch(e){

                alert('Title: ' + e.title + ' Message: ' + e.message);

                log.error({
                    title   : `${DEBUG_IDENTIFIER}`,
                    details : `${e.name} | ${e.message}`
                });
            }
        }

        function fieldChanged(scriptContext){

            const DEBUG_IDENTIFIER  = 'fieldChanged';

            try{

                const current_record  = scriptContext.currentRecord;
                const field_id        = scriptContext.fieldId;

                switch(field_id){

                    case NDIS_CUSTOMER_FIELD:

                        setNDISNumberDisplay(current_record);

                    break;
                }

            }catch(e){

                alert('Title: ' + e.title + ' Message: ' + e.message);

                log.error({
                    title   : `${DEBUG_IDENTIFIER}`,
                    details : `${e.name} | ${e.message}`
                });
            }
        }

        function saveRecord(scriptContext){

            const DEBUG_IDENTIFIER  = 'saveRecord';

            try{

                const current_record  = scriptContext.currentRecord;
                const is_ndis         = current_record.getValue({ fieldId : NDIS_CUSTOMER_FIELD }) === true;
                const ndis_number     = current_record.getValue({ fieldId : NDIS_NUMBER_FIELD }) || '';

                if(is_ndis && isNullOrEmpty(String(ndis_number).trim())){
                    alert(NUMBER_REQUIRED_MSG);
                    return false;
                }

            }catch(e){

                log.error({
                    title   : `${DEBUG_IDENTIFIER}`,
                    details : `${e.name} | ${e.message}`
                });
            }

            return true;
        }

        // Show and make NDIS Number mandatory when Is NDIS Customer is ticked, otherwise hide it (value is kept)
        function setNDISNumberDisplay(current_record){

            const ndis_number_field  = current_record.getField({ fieldId : NDIS_NUMBER_FIELD });

            if(isNullOrEmpty(ndis_number_field)){
                return;
            }

            const is_ndis  = current_record.getValue({ fieldId : NDIS_CUSTOMER_FIELD }) === true;

            ndis_number_field.isDisplay    = is_ndis;
            ndis_number_field.isMandatory  = is_ndis;
        }

        function isNullOrEmpty(objVariable){
            return (objVariable == null || objVariable == "" || objVariable == undefined || objVariable == 'undefined');
        };

        return {
            pageInit     : pageInit,
            fieldChanged : fieldChanged,
            saveRecord   : saveRecord
        };
    });
