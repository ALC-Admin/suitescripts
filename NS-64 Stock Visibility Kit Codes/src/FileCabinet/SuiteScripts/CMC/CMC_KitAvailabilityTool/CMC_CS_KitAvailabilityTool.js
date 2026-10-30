/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/log', 'N/url', 'N/currentRecord', 'N/format'],
    /**
     * @param{log} log
     * @param{url} url
     * @param{currentRecord} currentRecord
     * @param{format} format
     */
    function(log, url, currentRecord, format){

        const SCRIPT_ID      = 'customscript_cmc_sl_kitavailabilitytool';
        const DEPLOYMENT_ID  = 'customdeploy_cmc_sl_kitavailabilitytool';

        const FORECAST_SUBLISTS  = ['custpage_cmc_supply', 'custpage_cmc_demand'];
        const COMPONENT_SUBLIST  = 'custpage_cmc_components';

        // Highlight colours. Keep in sync with the legend in CMC_SL_KitAvailabilityTool.js
        const LIMITING_COLOUR            = '#ffb74d';
        const PROJECTED_LIMITING_COLOUR  = '#64b5f6';
        const FORECAST_COLOUR            = '#c5e1a5';
        const OVERDUE_COLOUR             = '#c62828';

        const DATE_COLUMN_LABELS  = ['Expected Date', 'Ship Date'];

        const LIMITING_CELLS  = [
            {'flag_field' : 'custpage_is_limiting',   'column_label' : 'Kits Supported',           'colour' : LIMITING_COLOUR},
            {'flag_field' : 'custpage_is_proj_limit', 'column_label' : 'Projected Kits Supported', 'colour' : PROJECTED_LIMITING_COLOUR}
        ];

        function pageInit(scriptContext){

            const DEBUG_IDENTIFIER  = 'pageInit';

            try{

                setupKitSearch({'current_record' : scriptContext.currentRecord});
                highlightForecastRows({'current_record' : scriptContext.currentRecord});
                highlightLimitingCells({'current_record' : scriptContext.currentRecord});

            }catch(e){

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

                const kit  = current_record.getValue({fieldId:'custpage_cmc_kit'}) || '';

                if(!kit){

                    alert('Please search for and select a Kit or Assembly from the list before checking availability.');

                    return false;
                }

                window.ischanged  = false;

                return true;

            }catch(e){

                alert(`${e.name} | ${e.message}`);

                log.error({
                    title   : `${DEBUG_IDENTIFIER}`,
                    details : `${e.name} | ${e.message}`
                });
            }
        }

        function download(){

            const DEBUG_IDENTIFIER  = 'download';

            try{

                const current_record  = currentRecord.get();

                const kit       = current_record.getValue({fieldId:'custpage_cmc_kit'})      || '';
                const location  = current_record.getValue({fieldId:'custpage_cmc_location'}) || '';
                const forecast  = current_record.getValue({fieldId:'custpage_cmc_forecast_to'});

                if(!kit){

                    alert('Please select a Kit or Assembly before exporting.');

                    return;
                }

                const target_url  = url.resolveScript({
                    scriptId     : SCRIPT_ID,
                    deploymentId : DEPLOYMENT_ID,
                    params       : {
                        'kit'      : kit,
                        'location'    : location,
                        'forecast_to' : forecast ? format.format({value : forecast, type : format.Type.DATE}) : '',
                        'export'      : true,
                        'search'      : true
                    }
                });

                window.ischanged  = false;
                window.open(target_url, '_blank').focus();

            }catch(e){

                alert(`${e.name} | ${e.message}`);

                log.error({
                    title   : `${DEBUG_IDENTIFIER}`,
                    details : `${e.name} | ${e.message}`
                });
            }
        }

        function reset(){

            const DEBUG_IDENTIFIER  = 'reset';

            try{

                if(!confirm('Are you sure you want to reset? This will clear the selected Kit, Location and results.')) return;

                const target_url  = url.resolveScript({
                    scriptId     : SCRIPT_ID,
                    deploymentId : DEPLOYMENT_ID
                });

                window.ischanged  = false;
                window.location   = target_url;

            }catch(e){

                alert(`${e.name} | ${e.message}`);

                log.error({
                    title   : `${DEBUG_IDENTIFIER}`,
                    details : `${e.name} | ${e.message}`
                });
            }
        }

        function cancel(){

            const DEBUG_IDENTIFIER  = 'cancel';

            try{

                if(!confirm('Are you sure you want to cancel? This will close the Kit Availability Tool.')) return;

                window.close();

            }catch(e){

                alert(`${e.name} | ${e.message}`);

                log.error({
                    title   : `${DEBUG_IDENTIFIER}`,
                    details : `${e.name} | ${e.message}`
                });
            }
        }

        /**
         * Type-to-search for the Kit / Assembly field. Every word typed must appear somewhere in the item's
         * code or name. Picking a result writes its internal id to the hidden custpage_cmc_kit field.
         */
        function setupKitSearch(options){

            const input     = document.getElementById('cmc_kat_kit_input');
            const results   = document.getElementById('cmc_kat_kit_results');
            const data_tag  = document.getElementById('cmc_kat_kit_data');

            if(!input || !results || !data_tag) return;

            const kits  = JSON.parse(data_tag.textContent);

            var selected_text  = input.value;
            var matches        = [];
            var active_index   = -1;

            function setKit(kit){

                options.current_record.setValue({
                    fieldId           : 'custpage_cmc_kit',
                    value             : kit ? kit.value : '',
                    ignoreFieldChange : true
                });
            }

            function search(query){

                const terms  = query.toLowerCase().split(/\s+/).filter(function(term){ return term; });

                matches  = kits.filter(function(kit){
                    const text  = kit.text.toLowerCase();
                    return terms.every(function(term){ return text.indexOf(term) > -1; });
                });

                active_index  = matches.length > 0 ? 0 : -1;

                render({'terms' : terms});
            }

            function render(render_options){

                if(matches.length == 0){
                    results.innerHTML      = '<div style="padding:6px 8px; color:#777;">No matching kits or assemblies</div>';
                    results.style.display  = 'block';
                    return;
                }

                var html  = '';

                for(var x=0; x<matches.length; x++){
                    html += `<div data-index="${x}" style="padding:5px 8px; cursor:pointer; border-bottom:1px solid #f0f0f0; background-color:${x == active_index ? '#e3edf9' : '#ffffff'};">${highlightTerms({'text' : matches[x].text, 'terms' : render_options.terms})}</div>`;
                }

                results.innerHTML      = html;
                results.style.display  = 'block';
            }

            function setActive(index){

                const rows  = results.querySelectorAll('[data-index]');

                if(rows.length == 0) return;

                active_index  = Math.max(0, Math.min(index, rows.length - 1));

                for(var x=0; x<rows.length; x++){
                    rows[x].style.backgroundColor  = x == active_index ? '#e3edf9' : '#ffffff';
                }

                rows[active_index].scrollIntoView({block : 'nearest'});
            }

            function choose(kit){
                input.value    = kit.text;
                selected_text  = kit.text;
                setKit(kit);
                hide();
            }

            function hide(){
                results.style.display  = 'none';
            }

            input.addEventListener('focus', function(){
                input.select();
                search(input.value == selected_text ? '' : input.value);
            });

            input.addEventListener('input', function(){
                setKit(null);
                search(input.value);
            });

            input.addEventListener('keydown', function(e){

                if(e.key == 'ArrowDown'){ e.preventDefault(); setActive(active_index + 1); }
                if(e.key == 'ArrowUp'){   e.preventDefault(); setActive(active_index - 1); }
                if(e.key == 'Escape'){    hide(); }

                // Enter picks the highlighted result rather than submitting the form
                if(e.key == 'Enter'){
                    e.preventDefault();
                    if(results.style.display != 'none' && matches[active_index]) choose(matches[active_index]);
                }
            });

            // mousedown fires before the input loses focus, so the click isn't lost when the list hides
            results.addEventListener('mousedown', function(e){

                const row  = e.target.closest('[data-index]');

                e.preventDefault();

                if(row) choose(matches[parseInt(row.getAttribute('data-index'), 10)]);
            });

            input.addEventListener('blur', function(){
                hide();
                if(options.current_record.getValue({fieldId: 'custpage_cmc_kit'})) input.value = selected_text;
            });
        }

        /**
         * Bolds the typed words inside a result. Works on the raw text first, then escapes, so the markup can't be broken.
         */
        function highlightTerms(options){

            const lower_text  = options.text.toLowerCase();

            var marked  = new Array(options.text.length).fill(false);

            for(var x=0; x<options.terms.length; x++){

                var position  = lower_text.indexOf(options.terms[x]);

                while(position > -1){
                    for(var y=position; y<position + options.terms[x].length; y++) marked[y] = true;
                    position  = lower_text.indexOf(options.terms[x], position + 1);
                }
            }

            var html     = '';
            var is_bold  = false;

            for(var z=0; z<options.text.length; z++){

                if(marked[z] != is_bold){
                    html     += marked[z] ? '<b>' : '</b>';
                    is_bold   = marked[z];
                }

                html += escapeHtml({'value' : options.text.charAt(z)});
            }

            return is_bold ? html + '</b>' : html;
        }

        function escapeHtml(options){
            return String(options.value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        /**
         * List sublists can't be styled server side, so shade the rows flagged by the hidden In Forecast column.
         */
        function highlightForecastRows(options){

            for(var x=0; x<FORECAST_SUBLISTS.length; x++){

                var sublist_id  = FORECAST_SUBLISTS[x];
                var line_count  = options.current_record.getLineCount({sublistId: sublist_id});
                var date_index  = getColumnIndex({'sublist_id' : sublist_id, 'labels' : DATE_COLUMN_LABELS});

                for(var y=0; y<line_count; y++){

                    var row  = document.getElementById(`${sublist_id}row${y}`);

                    if(!row) continue;

                    var in_forecast  = options.current_record.getSublistValue({sublistId: sublist_id, fieldId: 'custpage_tran_forecast', line: y});
                    var is_overdue   = options.current_record.getSublistValue({sublistId: sublist_id, fieldId: 'custpage_tran_overdue',  line: y});

                    if(in_forecast == 'Yes'){
                        for(var z=0; z<row.cells.length; z++){
                            setCellColour({'cell' : row.cells[z], 'colour' : FORECAST_COLOUR});
                        }
                    }

                    if(is_overdue == 'Yes' && date_index > -1 && row.cells[date_index]){
                        row.cells[date_index].style.setProperty('color', OVERDUE_COLOUR, 'important');
                        row.cells[date_index].style.fontWeight  = 'bold';
                    }
                }
            }
        }

        /**
         * Finds a visible column by its header label. Hidden columns aren't rendered, so they can't be counted by field order.
         */
        function getColumnIndex(options){

            const header  = document.getElementById(`${options.sublist_id}header`);

            if(!header) return -1;

            const header_labels  = Array.from(header.cells).map(function(cell){ return cell.textContent.trim().toUpperCase(); });

            for(var x=0; x<options.labels.length; x++){

                var index  = header_labels.indexOf(options.labels[x].toUpperCase());

                if(index > -1) return index;
            }

            return -1;
        }

        /**
         * Shades the Kits Supported / Projected Kits Supported cell of the components flagged as limiting.
         * The column is located by its header label, as hidden columns aren't rendered and shift the cell positions.
         */
        function highlightLimitingCells(options){

            const line_count  = options.current_record.getLineCount({sublistId: COMPONENT_SUBLIST});

            for(var x=0; x<LIMITING_CELLS.length; x++){

                var column_index  = getColumnIndex({'sublist_id' : COMPONENT_SUBLIST, 'labels' : [LIMITING_CELLS[x].column_label]});

                if(column_index == -1) continue;

                for(var y=0; y<line_count; y++){

                    var is_limiting  = options.current_record.getSublistValue({
                        sublistId : COMPONENT_SUBLIST,
                        fieldId   : LIMITING_CELLS[x].flag_field,
                        line      : y
                    });

                    var row  = document.getElementById(`${COMPONENT_SUBLIST}row${y}`);

                    if(is_limiting != 'Yes' || !row || !row.cells[column_index]) continue;

                    setCellColour({'cell' : row.cells[column_index], 'colour' : LIMITING_CELLS[x].colour});
                    row.cells[column_index].style.fontWeight  = 'bold';
                }
            }
        }

        // NetSuite's list styles set the cell background with !important, so match it
        function setCellColour(options){
            options.cell.style.setProperty('background-color', options.colour, 'important');
        }

        return {
            cancel       : cancel,
            reset        : reset,
            download     : download,
            pageInit     : pageInit,
            saveRecord   : saveRecord
        };

    });
