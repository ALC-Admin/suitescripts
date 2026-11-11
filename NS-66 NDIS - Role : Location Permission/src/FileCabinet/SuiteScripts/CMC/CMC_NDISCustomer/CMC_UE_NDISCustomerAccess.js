/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/log', 'N/runtime', 'N/search', 'N/ui/serverWidget'],
/**
 * @param{log} log
 * @param{runtime} runtime
 * @param{search} search
 * @param{serverWidget} serverWidget
 */
    (log, runtime, search, serverWidget) => {

        const NDIS_CUSTOMER_FIELD    = 'custentity_alc_ndis_customer';
        const NDIS_NUMBER_FIELD      = 'custentity_ndis_number';
        const ALLOWED_COUNTRY        = 'AU';
        const ADMINISTRATOR_ROLE     = 3;
        const ACCESS_ERROR_MESSAGE   = 'You do not have access to this record.';
        const NUMBER_ERROR_MESSAGE   = 'Please enter an NDIS Number. It is required when Is NDIS Customer is ticked.';

        const beforeLoad = (scriptContext) => {

            const DEBUG_IDENTIFIER  = 'beforeLoad';

            let is_restricted  = false;

            try{

                const new_record  = scriptContext.newRecord;
                const is_ndis     = new_record.getValue({ fieldId : NDIS_CUSTOMER_FIELD }) === true;

                switch(scriptContext.type){

                    case 'view':
                    case 'edit':
                    case 'copy':
                    case 'print':

                        if(is_ndis && isUserInterface() && !hasNDISAccess()){
                            is_restricted  = true;
                        }

                        // Edit / copy are handled by the client script; view has no client script so hide here
                        if(scriptContext.type == 'view' && !is_ndis && !isNullOrEmpty(scriptContext.form)){

                            const ndis_number_field  = scriptContext.form.getField({ id : NDIS_NUMBER_FIELD });

                            if(!isNullOrEmpty(ndis_number_field)){
                                ndis_number_field.updateDisplayType({ displayType : serverWidget.FieldDisplayType.HIDDEN });
                            }
                        }

                    break;
                }

                log.debug({
                    title   : DEBUG_IDENTIFIER,
                    details : `Type: ${scriptContext.type} | Record ID: ${new_record.id} | Is NDIS: ${is_ndis} | Restricted: ${is_restricted}`
                });

            }catch(e){

                log.error({
                    title   : DEBUG_IDENTIFIER,
                    details : `${e.name} | ${e.message}`
                });
            }

            // Thrown as a plain message so the user sees the text only, not the SuiteScript error JSON
            if(is_restricted){
                throw ACCESS_ERROR_MESSAGE;
            }
        }

        const beforeSubmit = (scriptContext) => {

            const DEBUG_IDENTIFIER  = 'beforeSubmit';

            let error_message  = '';

            try{

                switch(scriptContext.type){

                    case 'create':
                    case 'edit':
                    case 'xedit':

                        const new_record  = scriptContext.newRecord;
                        const values      = getSubmittedValues(scriptContext);

                        log.debug({
                            title   : DEBUG_IDENTIFIER,
                            details : `Type: ${scriptContext.type} | Context: ${runtime.executionContext} | Record ID: ${new_record.id} | Values: ${JSON.stringify(values)}`
                        });

                        // Inline edit from a list - uses the saved NDIS flag so unticking it inline is also blocked
                        if(scriptContext.type == 'xedit' && values.was_ndis && isInlineEditContext() && !hasNDISAccess()){
                            error_message  = ACCESS_ERROR_MESSAGE;
                        }
                        else if(values.is_ndis && isNullOrEmpty(String(values.ndis_number).trim())){
                            error_message  = NUMBER_ERROR_MESSAGE;
                        }

                    break;
                }

            }catch(e){

                log.error({
                    title   : DEBUG_IDENTIFIER,
                    details : `${e.name} | ${e.message}`
                });
            }

            if(!isNullOrEmpty(error_message)){
                throw error_message;
            }
        }

        // Returns the NDIS flag / number as they will be after the save, plus the saved NDIS flag
        function getSubmittedValues(scriptContext){

            const new_record  = scriptContext.newRecord;
            const old_record  = scriptContext.oldRecord;

            let values  = {
                was_ndis    : false,
                is_ndis     : new_record.getValue({ fieldId : NDIS_CUSTOMER_FIELD }) === true,
                ndis_number : new_record.getValue({ fieldId : NDIS_NUMBER_FIELD }) || ''
            };

            if(!isNullOrEmpty(old_record)){
                values.was_ndis  = old_record.getValue({ fieldId : NDIS_CUSTOMER_FIELD }) === true;
            }

            // Inline edit only carries the changed fields - read the rest from the saved record
            if(scriptContext.type == 'xedit'){

                const changed_fields  = new_record.getFields();
                const saved_values    = search.lookupFields({
                    type    : search.Type.CUSTOMER,
                    id      : new_record.id,
                    columns : [NDIS_CUSTOMER_FIELD, NDIS_NUMBER_FIELD]
                });

                values.was_ndis  = saved_values[NDIS_CUSTOMER_FIELD] === true;

                if(changed_fields.indexOf(NDIS_CUSTOMER_FIELD) == -1){
                    values.is_ndis  = values.was_ndis;
                }

                if(changed_fields.indexOf(NDIS_NUMBER_FIELD) == -1){
                    values.ndis_number  = saved_values[NDIS_NUMBER_FIELD] || '';
                }
            }

            return values;
        }

        // Administrator role, or an employee whose default address country is Australia
        function hasNDISAccess(){

            const DEBUG_IDENTIFIER  = 'hasNDISAccess';

            const current_user  = runtime.getCurrentUser();

            if(current_user.role == ADMINISTRATOR_ROLE){
                return true;
            }

            let country  = '';

            try{

                const employee_values  = search.lookupFields({
                    type    : search.Type.EMPLOYEE,
                    id      : current_user.id,
                    columns : ['billcountry']
                });

                if(!isNullOrEmpty(employee_values.billcountry) && employee_values.billcountry.length > 0){
                    country  = employee_values.billcountry[0].value;
                }

            }catch(e){

                // Not an employee (e.g. customer centre / partner) - treated as restricted
                log.audit({
                    title   : DEBUG_IDENTIFIER,
                    details : `User ID: ${current_user.id} | ${e.name} | ${e.message}`
                });
            }

            log.debug({
                title   : DEBUG_IDENTIFIER,
                details : `User ID: ${current_user.id} | Role: ${current_user.role} | Country: ${country}`
            });

            return country == ALLOWED_COUNTRY;
        }

        function isUserInterface(){
            return runtime.executionContext == runtime.ContextType.USER_INTERFACE;
        }

        // List inline edit arrives as USEREVENT (confirmed in SB1), client-side submitFields as CLIENT
        function isInlineEditContext(){
            return [
                runtime.ContextType.USER_INTERFACE,
                runtime.ContextType.USEREVENT,
                runtime.ContextType.CLIENT
            ].indexOf(runtime.executionContext) != -1;
        }

        function isNullOrEmpty(objVariable){
            return (objVariable == null || objVariable == "" || objVariable == undefined || objVariable == 'undefined');
        };

        return {
            beforeLoad   : beforeLoad,
            beforeSubmit : beforeSubmit
        }

    });
