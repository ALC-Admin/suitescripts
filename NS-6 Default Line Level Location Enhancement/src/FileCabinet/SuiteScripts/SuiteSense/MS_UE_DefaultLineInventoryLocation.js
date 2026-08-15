/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 *
 * Author: SuiteSense Inc
 *
 * Defaults the line-level Inventory Location from the header Location.
 * The mapping is data-driven: each Location record holds the location to
 * default onto the lines in the field below.
 *
 * Update History:
 *
 * 15 Aug 2026 - CM Consulting
 *   Replaced the hardcoded location mapping in this script with the
 *   Default Line Inventory Location field (custrecord_cmc_default_line_inv_loc)
 *   on the Location record, so the mapping is maintained in NetSuite
 *   rather than in code.
 *
 */
define(['N/log', 'N/search'],
    function (log, search) {

        var LOCATION_RECORD           = 'location';
        var FLD_DEFAULT_LINE_INV_LOC  = 'custrecord_cmc_default_line_inv_loc';
        var SUBLIST                   = 'item';
        var FLD_LINE_INV_LOC          = 'inventorylocation';
        var FLD_LINE_ITEM_TYPE        = 'itemtype';

        var SKIPPED_ITEM_TYPES  = ['EndGroup', 'Description', 'Subtotal'];

        /**
         * Reads the mapped default inventory location off a Location record.
         *
         * @param {string|number} stLocId - internal id of the header location
         * @returns {string} internal id of the mapped location, or '' when unmapped
         */
        function getDefaultLineInvLoc(stLocId) {
            if (!stLocId) return '';

            var objLookup = search.lookupFields({
                type: LOCATION_RECORD,
                id: stLocId,
                columns: [FLD_DEFAULT_LINE_INV_LOC]
            });

            var arrValue = objLookup[FLD_DEFAULT_LINE_INV_LOC];

            return (arrValue && arrValue.length) ? arrValue[0].value : '';
        }

        function beforeSubmit(context) {
            var stLogTitle = 'beforeSubmit';
            try {
                if (context.type !== context.UserEventType.CREATE &&
                    context.type !== context.UserEventType.EDIT) return;

                var objRec = context.newRecord;
                var stLocId = objRec.getValue({fieldId: 'location'});
                if (!stLocId) return;

                var stDefaultInvLocId = getDefaultLineInvLoc(stLocId);
                log.debug({
                    title: stLogTitle,
                    details: {
                        stLocId: stLocId,
                        stDefaultInvLocId: stDefaultInvLocId
                    }
                });
                if (!stDefaultInvLocId) return;

                var iLnCnt = objRec.getLineCount({sublistId: SUBLIST});

                for (var iL = 0; iL < iLnCnt; iL++) {
                    var stItemType = objRec.getSublistValue({
                        sublistId: SUBLIST,
                        fieldId: FLD_LINE_ITEM_TYPE,
                        line: iL
                    });
                    if (SKIPPED_ITEM_TYPES.indexOf(stItemType) !== -1) continue;

                    var stInvLocId = objRec.getSublistValue({
                        sublistId: SUBLIST,
                        fieldId: FLD_LINE_INV_LOC,
                        line: iL
                    });
                    if (stInvLocId) continue;

                    objRec.setSublistValue({
                        sublistId: SUBLIST,
                        fieldId: FLD_LINE_INV_LOC,
                        line: iL,
                        value: stDefaultInvLocId
                    });
                }
            } catch (e) {
                log.error(stLogTitle, e.message + ' | ' + JSON.stringify(e));
            }
        }

        return {
            beforeSubmit: beforeSubmit
        };
    }
);
