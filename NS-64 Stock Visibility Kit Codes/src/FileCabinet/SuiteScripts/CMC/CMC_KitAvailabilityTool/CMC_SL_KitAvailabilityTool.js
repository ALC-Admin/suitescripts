/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/log', 'N/search', 'N/ui/serverWidget', 'N/redirect', 'N/error', 'N/file', 'N/format', 'N/runtime'],
    /**
 * @param{log} log
 * @param{search} search
 * @param{serverWidget} serverWidget
 * @param{redirect} redirect
 * @param{error} error
 * @param{file} file
 * @param{format} format
 * @param{runtime} runtime
 */
    (log, search, serverWidget, redirect, error, file, format, runtime) => {

        const SCRIPT_ID         = 'customscript_cmc_sl_kitavailabilitytool';
        const DEPLOYMENT_ID     = 'customdeploy_cmc_sl_kitavailabilitytool';
        const CLIENT_SCRIPT     = 'SuiteScripts/CMC/CMC_KitAvailabilityTool/CMC_CS_KitAvailabilityTool.js';

        const KIT_TYPE          = 'Kit';
        const ASSEMBLY_TYPE     = 'Assembly';
        const TRACKED_TYPES     = ['InvtPart', 'Assembly'];
        const MAX_DEPTH         = 10;
        const FORECAST_DAYS     = 30;

        // Highlight colours. Keep in sync with CMC_CS_KitAvailabilityTool.js, which applies them to the sublists
        const LIMITING_COLOUR            = '#ffb74d';
        const PROJECTED_LIMITING_COLOUR  = '#64b5f6';
        const FORECAST_COLOUR            = '#c5e1a5';
        const OVERDUE_COLOUR             = '#c62828';

        const PO_STATUSES       = ['PurchOrd:B', 'PurchOrd:D', 'PurchOrd:E'];
        const SO_STATUSES       = ['SalesOrd:B', 'SalesOrd:D', 'SalesOrd:E'];
        const TO_OUT_STATUSES   = ['TrnfrOrd:B', 'TrnfrOrd:D', 'TrnfrOrd:E'];
        const TO_IN_STATUSES    = ['TrnfrOrd:B', 'TrnfrOrd:D', 'TrnfrOrd:E', 'TrnfrOrd:F'];
        const WO_STATUSES       = ['WorkOrd:B', 'WorkOrd:D'];

        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {

            const DEBUG_IDENTIFIER  = 'onRequest';

            try{

                switch(scriptContext.request.method){

                    case 'GET':

                        const param_kit          = scriptContext.request.parameters.kit          || '';
                        const param_location     = scriptContext.request.parameters.location     || '';
                        const param_forecast_to  = scriptContext.request.parameters.forecast_to  || getDefaultForecastDate();
                        const param_search       = scriptContext.request.parameters.search       || 'false';
                        const param_export       = scriptContext.request.parameters.export       || 'false';

                        const config  = {
                            'kit'         : param_kit,
                            'location'    : param_location,
                            'forecast_to' : param_forecast_to,
                            'is_search'   : param_search,
                            'is_export'   : param_export
                        };

                        log.debug({
                            title   : DEBUG_IDENTIFIER,
                            details : `config : ${JSON.stringify(config)}`
                        });

                        var availability  = null;

                        if(config.is_search == 'true' && config.kit){

                            const kit_info  = getKitInfo({
                                'kit_id' : config.kit
                            });

                            const component_lines  = explodeKit({
                                'kit_id'     : kit_info.kit_id,
                                'kit_name'   : kit_info.kit_name,
                                'multiplier' : 1,
                                'level'      : 1,
                                'path'       : [kit_info.kit_id],
                                'cache'      : {},
                                'lines'      : []
                            });

                            log.debug({
                                title   : DEBUG_IDENTIFIER,
                                details : `component_lines (${component_lines.length}): ${JSON.stringify(component_lines)}`
                            });

                            availability  = calculateAvailability({
                                'config' : config,
                                'lines'  : component_lines
                            });

                            log.debug({
                                title   : DEBUG_IDENTIFIER,
                                details : `kit_available: ${availability.kit_available} | limiting: ${availability.limiting_names.join(', ')} | location_lines: ${JSON.stringify(availability.location_lines)}`
                            });

                            if(config.is_export == 'true'){

                                const csv_content  = getCsvContent({
                                    'lines'          : availability.lines,
                                    'location_lines' : availability.location_lines,
                                    'forecast'       : availability.forecast
                                });

                                const download_file  = file.create({
                                    name     : `KitAvailability_${kit_info.kit_name.replace(/[^\w-]/g, '_')}.csv`,
                                    fileType : file.Type.CSV,
                                    contents : csv_content
                                });

                                scriptContext.response.writeFile({
                                    file     : download_file,
                                    isInline : false
                                });

                                return;
                            }
                        }

                        const form  = buildForm({
                            'config' : config
                        });

                        if(availability){

                            const is_all_locations  = !config.location;

                            form.getField({id: 'custpage_summary_available'}).defaultValue = availability.kit_available === null ? '' : availability.kit_available;

                            addLegend({
                                'form'             : form,
                                'is_all_locations' : is_all_locations,
                                'has_tracked'      : availability.kit_available !== null
                            });

                            if(is_all_locations){

                                const location_sublist  = buildLocationSublist({
                                    'form'  : form,
                                    'total' : availability.location_lines.length
                                });

                                populateLocationSublist({
                                    'sublist' : location_sublist,
                                    'lines'   : availability.location_lines
                                });
                            }

                            if(availability.forecast){

                                form.getField({id: 'custpage_summary_projected'}).defaultValue = availability.forecast.projected_kits === null ? '' : availability.forecast.projected_kits;
                            }

                            const sublist  = buildSublist({
                                'form'             : form,
                                'total'            : availability.lines.length,
                                'is_all_locations' : is_all_locations
                            });

                            populateSublist({
                                'sublist' : sublist,
                                'lines'   : availability.lines
                            });

                            if(availability.forecast){

                                const supply_sublist  = buildSupplySublist({
                                    'form'  : form,
                                    'total' : availability.forecast.supply_lines.length
                                });

                                populateTransactionSublist({
                                    'sublist' : supply_sublist,
                                    'lines'   : availability.forecast.supply_lines
                                });

                                const demand_sublist  = buildDemandSublist({
                                    'form'  : form,
                                    'total' : availability.forecast.demand_lines.length
                                });

                                populateTransactionSublist({
                                    'sublist' : demand_sublist,
                                    'lines'   : availability.forecast.demand_lines
                                });
                            }
                        }

                        scriptContext.response.writePage(form);

                    break;

                    case 'POST':

                        const kit          = scriptContext.request.parameters.custpage_cmc_kit          || '';
                        const location     = scriptContext.request.parameters.custpage_cmc_location     || '';
                        const forecast_to  = scriptContext.request.parameters.custpage_cmc_forecast_to  || '';

                        log.debug({
                            title   : DEBUG_IDENTIFIER,
                            details : `kit: ${kit} | location: ${location} | forecast_to: ${forecast_to}`
                        });

                        redirect.toSuitelet({
                            scriptId     : SCRIPT_ID,
                            deploymentId : DEPLOYMENT_ID,
                            parameters   : {
                                'kit'         : kit,
                                'location'    : location,
                                'forecast_to' : forecast_to,
                                'search'      : true
                            }
                        });

                    break;
                }

            }catch(e){

                log.error({
                    title   : DEBUG_IDENTIFIER,
                    details : `${e.name} | ${e.message}`
                });

                scriptContext.response.write(`
                    <html>
                        <head>
                            <style>
                                .error-container {
                                    width: 50%;
                                    margin: 50px auto;
                                    padding: 20px;
                                    border: 1px solid red;
                                    background-color: #ffe6e6;
                                    text-align: center;
                                    font-family: Arial, sans-serif;
                                }
                                .error-title {
                                    font-size: 18px;
                                    font-weight: bold;
                                    color: red;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="error-container">
                                <div class="error-title">An Error Occurred</div>
                                <p>${e.name} | ${e.message}</p>
                            </div>
                        </body>
                    </html>
                `);
            }
        }

        /**
         * The kit field is sourced from all items, so confirm the selection is a Kit/Package or an Assembly.
         * Assemblies are broken down by their member items (Advanced BOM is off, so members sit on the item record).
         */
        function getKitInfo(options){

            const results  = search.create({
                type    : search.Type.ITEM,
                filters : [
                    ['internalid', 'anyof', options.kit_id]
                ],
                columns : [
                    search.createColumn({name: 'itemid'}),
                    search.createColumn({name: 'type'})
                ]
            }).run().getRange({start: 0, end: 1});

            if(results.length == 0 || [KIT_TYPE, ASSEMBLY_TYPE].indexOf(results[0].getValue({name: 'type'})) == -1){
                throw error.create({
                    name      : 'INVALID_KIT',
                    message   : `${results.length > 0 ? results[0].getValue({name: 'itemid'}) : options.kit_id} is not a Kit/Package or Assembly item. Please select a Kit or Assembly.`,
                    notifyOff : true
                });
            }

            return {
                'kit_id'   : options.kit_id,
                'kit_name' : results[0].getValue({name: 'itemid'})
            };
        }

        /**
         * Active Kit/Package and Assembly items for the Kit / Assembly search box. The selected item is added if it's
         * missing (e.g. an inactive kit opened from its item record) so the field still shows it.
         */
        function getKitOptions(options){

            var kit_options  = [];
            var has_selected = !options.selected;

            const results  = getAllResults({'search' : search.create({
                type    : search.Type.ITEM,
                filters : [
                    ['type', 'anyof', [KIT_TYPE, ASSEMBLY_TYPE]],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns : [
                    search.createColumn({name: 'itemid', sort: search.Sort.ASC}),
                    search.createColumn({name: 'displayname'})
                ]
            })});

            for(var x=0; x<results.length; x++){

                var display_name  = results[x].getValue({name: 'displayname'});

                kit_options.push({
                    'value' : results[x].id,
                    'text'  : display_name ? `${results[x].getValue({name: 'itemid'})} ${display_name}` : results[x].getValue({name: 'itemid'})
                });

                if(results[x].id == options.selected) has_selected = true;
            }

            if(!has_selected){

                const selected_item  = search.create({
                    type    : search.Type.ITEM,
                    filters : [
                        ['internalid', 'anyof', options.selected]
                    ],
                    columns : [
                        search.createColumn({name: 'itemid'})
                    ]
                }).run().getRange({start: 0, end: 1});

                if(selected_item.length > 0){
                    kit_options.unshift({'value' : options.selected, 'text' : `${selected_item[0].getValue({name: 'itemid'})} (Inactive)`});
                }
            }

            return kit_options;
        }

        /**
         * Markup for the Kit / Assembly search box. The kit list is embedded as JSON for the client script, which
         * filters it as the user types and writes the chosen internal id to the hidden custpage_cmc_kit field.
         */
        function getKitSearchHtml(options){

            const selected_kit   = options.kit_options.filter(function(kit){ return kit.value == options.selected; })[0];
            const selected_text  = selected_kit ? selected_kit.text : '';

            // Escape "<" so an item name can never close the script tag early
            const kit_data  = JSON.stringify(options.kit_options).replace(/</g, '\\u003c');

            return `
                <div style="position:relative; margin-bottom:8px;">
                    <div class="smallgraytextnolink uir-label" style="margin-bottom:2px;">KIT / ASSEMBLY <span style="color:#d00000;">*</span></div>
                    <input type="text" id="cmc_kat_kit_input" class="input" autocomplete="off" spellcheck="false"
                        placeholder="Type to search kits and assemblies..." value="${escapeHtml({'value' : selected_text})}"
                        style="width:420px; padding:4px 6px; box-sizing:border-box;">
                    <div id="cmc_kat_kit_results" style="display:none; position:absolute; z-index:1000; width:420px; max-height:320px; overflow-y:auto; background:#ffffff; border:1px solid #b8b8b8; box-shadow:0 4px 12px rgba(0,0,0,0.15); font-size:13px;"></div>
                </div>
                <script type="application/json" id="cmc_kat_kit_data">${kit_data}</script>
            `;
        }

        function escapeHtml(options){
            return String(options.value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        /**
         * Recursively walks the kit and any nested kits, returning the flattened component lines
         * in display order (each sub-kit is followed by its own components).
         */
        function explodeKit(options){

            const DEBUG_IDENTIFIER  = 'explodeKit';

            if(options.level > MAX_DEPTH){
                throw error.create({
                    name      : 'KIT_DEPTH_EXCEEDED',
                    message   : `Kit nesting exceeds ${MAX_DEPTH} levels at ${options.kit_name}. Please review the kit setup.`,
                    notifyOff : true
                });
            }

            if(!options.cache[options.kit_id]){
                options.cache[options.kit_id]  = getKitMembers({'kit_id' : options.kit_id});
            }

            const members  = options.cache[options.kit_id];

            log.debug({
                title   : DEBUG_IDENTIFIER,
                details : `kit: ${options.kit_name} | level: ${options.level} | members: ${JSON.stringify(members)}`
            });

            for(var x=0; x<members.length; x++){

                var member        = members[x];
                var is_kit        = member.item_type == KIT_TYPE;
                var qty_required  = member.qty_per * options.multiplier;

                options.lines.push({
                    'item_id'      : member.item_id,
                    'item_name'    : member.item_name,
                    'description'  : member.description,
                    'item_type'    : member.item_type,
                    'parent_name'  : options.kit_name,
                    'level'        : options.level,
                    'qty_per'      : member.qty_per,
                    'qty_required' : qty_required,
                    'is_kit'       : is_kit,
                    'is_tracked'   : TRACKED_TYPES.indexOf(member.item_type) > -1
                });

                if(is_kit){

                    if(options.path.indexOf(member.item_id) > -1){
                        throw error.create({
                            name      : 'CIRCULAR_KIT_REFERENCE',
                            message   : `${member.item_name} references itself through ${options.kit_name}. Please review the kit setup.`,
                            notifyOff : true
                        });
                    }

                    explodeKit({
                        'kit_id'     : member.item_id,
                        'kit_name'   : member.item_name,
                        'multiplier' : qty_required,
                        'level'      : options.level + 1,
                        'path'       : options.path.concat([member.item_id]),
                        'cache'      : options.cache,
                        'lines'      : options.lines
                    });
                }
            }

            return options.lines;
        }

        /**
         * Totals the required quantity per component (a component can appear under more than one sub-kit),
         * then works out how many kits can be built. With a location selected the lines show that location's
         * stock and the supply/demand forecast. Without one, each location is calculated separately and the
         * lines show stock totals.
         */
        function calculateAvailability(options){

            const DEBUG_IDENTIFIER  = 'calculateAvailability';

            var required_map  = {};
            var name_map      = {};
            var type_map      = {};

            for(var x=0; x<options.lines.length; x++){

                var line  = options.lines[x];

                if(!line.is_tracked) continue;

                required_map[line.item_id]  = (required_map[line.item_id] || 0) + line.qty_required;
                name_map[line.item_id]      = line.item_name;
                type_map[line.item_id]      = line.item_type;
            }

            const item_ids  = Object.keys(required_map);

            const stock_map  = item_ids.length > 0 ? getLocationStock({
                'item_ids' : item_ids,
                'location' : options.config.location
            }) : {};

            log.debug({
                title   : DEBUG_IDENTIFIER,
                details : `required_map: ${JSON.stringify(required_map)} | stock_map: ${JSON.stringify(stock_map)}`
            });

            if(options.config.location){

                const selected_items  = stock_map[options.config.location] ? stock_map[options.config.location].items : {};

                const selected_result  = calculateKitsForLocation({
                    'required_map' : required_map,
                    'name_map'     : name_map,
                    'items'        : selected_items
                });

                for(var y=0; y<options.lines.length; y++){

                    var line   = options.lines[y];
                    var stock  = selected_items[line.item_id] || {'on_hand' : 0, 'available' : 0};

                    if(line.is_tracked){

                        line.on_hand      = stock.on_hand;
                        line.available    = stock.available;
                        line.max_kits     = selected_result.max_kits_map[line.item_id];
                        line.is_limiting  = line.max_kits === selected_result.kit_available;

                    }else if(line.is_kit){

                        line.max_kits  = getSubKitMaxKits({
                            'lines' : options.lines,
                            'index' : y,
                            'map'   : selected_result.max_kits_map
                        });
                    }
                }

                const forecast  = item_ids.length > 0 ? calculateForecast({
                    'config'       : options.config,
                    'lines'        : options.lines,
                    'required_map' : required_map,
                    'name_map'     : name_map,
                    'type_map'     : type_map,
                    'items'        : selected_items
                }) : null;

                return {
                    'kit_available'  : selected_result.kit_available,
                    'limiting_names' : selected_result.limiting_names,
                    'lines'          : options.lines,
                    'location_lines' : [],
                    'forecast'       : forecast
                };
            }

            var total_map       = {};
            var location_lines  = [];
            var kit_available   = null;

            for(var location_id in stock_map){

                var location_items  = stock_map[location_id].items;
                var has_stock       = false;

                for(var item_id in location_items){

                    var stock  = location_items[item_id];

                    if(!total_map[item_id]) total_map[item_id] = {'on_hand' : 0, 'available' : 0};

                    total_map[item_id].on_hand    += stock.on_hand;
                    total_map[item_id].available  += stock.available;

                    if(stock.on_hand != 0 || stock.available != 0) has_stock = true;
                }

                // Skip locations that hold none of the components, otherwise every inactive or unused location is listed
                if(!has_stock) continue;

                var result  = calculateKitsForLocation({
                    'required_map' : required_map,
                    'name_map'     : name_map,
                    'items'        : location_items
                });

                location_lines.push({
                    'location_name'  : stock_map[location_id].name,
                    'kit_available'  : result.kit_available,
                    'limiting_names' : result.limiting_names
                });

                kit_available  = (kit_available || 0) + result.kit_available;
            }

            if(item_ids.length > 0 && kit_available === null) kit_available = 0;

            location_lines.sort(function(a, b){
                return b.kit_available - a.kit_available || a.location_name.localeCompare(b.location_name);
            });

            for(var z=0; z<options.lines.length; z++){

                var line   = options.lines[z];
                var stock  = total_map[line.item_id] || {'on_hand' : 0, 'available' : 0};

                if(line.is_tracked){
                    line.on_hand    = stock.on_hand;
                    line.available  = stock.available;
                }
            }

            return {
                'kit_available'  : kit_available,
                'limiting_names' : [],
                'lines'          : options.lines,
                'location_lines' : location_lines,
                'forecast'       : null
            };
        }

        /**
         * Projects component stock at the location up to the Forecast To date.
         *
         * Available already excludes committed stock (including components committed by kit sales orders), so only
         * the uncommitted part of each open order line reduces the projection :
         * Backordered = sum of (Outstanding - Committed) per line. Projected = Available + Incoming Supply - Backordered.
         * Location level committed isn't used, as it can include stock committed to orders outside this list.
         */
        function calculateForecast(options){

            const DEBUG_IDENTIFIER  = 'calculateForecast';

            const item_ids       = Object.keys(options.required_map);
            const assembly_ids   = item_ids.filter(function(item_id){ return options.type_map[item_id] == ASSEMBLY_TYPE; });
            const forecast_date  = parseDate({'value' : options.config.forecast_to});
            const today_date     = parseDate({'value' : getToday()});

            const supply_lines  = getSupplyLines({
                'item_ids'      : item_ids,
                'assembly_ids'  : assembly_ids,
                'location'      : options.config.location,
                'forecast_date' : forecast_date,
                'today_date'    : today_date
            });

            const demand_kit_map  = getDemandKitMap({
                'item_ids' : item_ids
            });

            const demand_lines  = getDemandLines({
                'item_ids'       : item_ids,
                'demand_kit_map' : demand_kit_map,
                'name_map'       : options.name_map,
                'location'       : options.config.location,
                'forecast_date'  : forecast_date,
                'today_date'     : today_date
            });

            var supply_map       = {};
            var demand_map       = {};
            var backordered_map  = {};

            for(var x=0; x<supply_lines.length; x++){
                if(supply_lines[x].in_forecast) supply_map[supply_lines[x].item_id] = (supply_map[supply_lines[x].item_id] || 0) + supply_lines[x].quantity;
            }

            for(var y=0; y<demand_lines.length; y++){

                var demand_line  = demand_lines[y];

                if(!demand_line.in_forecast) continue;

                demand_map[demand_line.item_id]       = (demand_map[demand_line.item_id] || 0) + demand_line.quantity;
                backordered_map[demand_line.item_id]  = (backordered_map[demand_line.item_id] || 0) + Math.max(demand_line.quantity - (demand_line.committed || 0), 0);
            }

            var projected_items  = {};
            var component_map    = {};

            for(var z=0; z<item_ids.length; z++){

                var item_id      = item_ids[z];
                var stock        = options.items[item_id] || {'available' : 0};
                var incoming     = supply_map[item_id] || 0;
                var open_demand  = demand_map[item_id] || 0;
                var backordered  = backordered_map[item_id] || 0;

                component_map[item_id]  = {
                    'incoming'    : incoming,
                    'open_demand' : open_demand,
                    'backordered' : backordered,
                    'projected'   : stock.available + incoming - backordered
                };

                projected_items[item_id]  = {'available' : component_map[item_id].projected};
            }

            const projected_result  = calculateKitsForLocation({
                'required_map' : options.required_map,
                'name_map'     : options.name_map,
                'items'        : projected_items
            });

            for(var i=0; i<options.lines.length; i++){

                var line  = options.lines[i];

                if(line.is_tracked){

                    line.incoming            = component_map[line.item_id].incoming;
                    line.open_demand         = component_map[line.item_id].open_demand;
                    line.backordered         = component_map[line.item_id].backordered;
                    line.projected               = component_map[line.item_id].projected;
                    line.projected_max_kits      = projected_result.max_kits_map[line.item_id];
                    line.is_projected_limiting   = line.projected_max_kits === projected_result.kit_available;

                }else if(line.is_kit){

                    line.projected_max_kits  = getSubKitMaxKits({
                        'lines' : options.lines,
                        'index' : i,
                        'map'   : projected_result.max_kits_map
                    });
                }
            }

            log.debug({
                title   : DEBUG_IDENTIFIER,
                details : `forecast_to: ${options.config.forecast_to} | supply: ${supply_lines.length} | demand: ${demand_lines.length} | component_map: ${JSON.stringify(component_map)} | projected_kits: ${projected_result.kit_available}`
            });

            return {
                'forecast_to'    : options.config.forecast_to,
                'projected_kits' : projected_result.kit_available,
                'limiting_names' : projected_result.limiting_names,
                'supply_lines'   : supply_lines,
                'demand_lines'   : demand_lines
            };
        }

        function calculateKitsForLocation(options){

            var max_kits_map   = {};
            var kit_available  = null;

            for(var item_id in options.required_map){

                var available  = options.items[item_id] ? options.items[item_id].available : 0;
                var max_kits   = options.required_map[item_id] > 0 ? Math.floor(Math.max(available, 0) / options.required_map[item_id]) : 0;

                max_kits_map[item_id]  = max_kits;

                if(kit_available === null || max_kits < kit_available) kit_available = max_kits;
            }

            var limiting_names  = [];

            for(var item_id in max_kits_map){
                if(max_kits_map[item_id] === kit_available) limiting_names.push(options.name_map[item_id]);
            }

            return {
                'kit_available'  : kit_available,
                'max_kits_map'   : max_kits_map,
                'limiting_names' : limiting_names
            };
        }

        /**
         * A sub-kit can only support as many top level kits as its weakest tracked component.
         */
        function getSubKitMaxKits(options){

            const kit_level  = options.lines[options.index].level;

            var max_kits  = null;

            for(var x=options.index+1; x<options.lines.length; x++){

                var line  = options.lines[x];

                if(line.level <= kit_level) break;
                if(!line.is_tracked) continue;

                var line_max  = options.map[line.item_id];

                if(max_kits === null || line_max < max_kits) max_kits = line_max;
            }

            return max_kits;
        }

        /**
         * Open supply at the location : purchase orders, inbound transfer orders and work orders (assemblies only).
         */
        function getSupplyLines(options){

            var supply_lines  = [];

            const po_results  = getAllResults({'search' : search.create({
                type    : search.Type.PURCHASE_ORDER,
                filters : [
                    ['mainline', 'is', 'F'],
                    'AND',
                    ['taxline', 'is', 'F'],
                    'AND',
                    ['closed', 'is', 'F'],
                    'AND',
                    ['status', 'anyof', PO_STATUSES],
                    'AND',
                    ['item', 'anyof', options.item_ids],
                    'AND',
                    ['location', 'anyof', options.location]
                ],
                columns : [
                    search.createColumn({name: 'tranid'}),
                    search.createColumn({name: 'mainname'}),
                    search.createColumn({name: 'item'}),
                    search.createColumn({name: 'quantity'}),
                    search.createColumn({name: 'quantityshiprecv'}),
                    search.createColumn({name: 'custcol_eta'}),
                    search.createColumn({name: 'duedate'})
                ]
            })});

            for(var x=0; x<po_results.length; x++){

                var result     = po_results[x];
                var remaining  = (parseFloat(result.getValue({name: 'quantity'})) || 0) - (parseFloat(result.getValue({name: 'quantityshiprecv'})) || 0);

                if(remaining <= 0) continue;

                // Same ETA rule as the Line Level ETA report : line ETA first, then the PO due date
                supply_lines.push(buildTransactionLine({
                    'type'          : 'Purchase Order',
                    'tran_number'   : result.getValue({name: 'tranid'}),
                    'party'         : result.getText({name: 'mainname'}),
                    'item_id'       : result.getValue({name: 'item'}),
                    'item_name'     : result.getText({name: 'item'}),
                    'quantity'      : remaining,
                    'date'          : result.getValue({name: 'custcol_eta'}) || result.getValue({name: 'duedate'}),
                    'is_supply'     : true,
                    'forecast_date' : options.forecast_date,
                    'today_date'    : options.today_date
                }));
            }

            // Transfer orders return ITEM, SHIPPING and RECEIVING lines per item. The RECEIVING line sits on the destination location
            const to_results  = getAllResults({'search' : search.create({
                type    : search.Type.TRANSFER_ORDER,
                filters : [
                    ['mainline', 'is', 'F'],
                    'AND',
                    ['transactionlinetype', 'anyof', 'RECEIVING'],
                    'AND',
                    ['status', 'anyof', TO_IN_STATUSES],
                    'AND',
                    ['item', 'anyof', options.item_ids],
                    'AND',
                    ['location', 'anyof', options.location]
                ],
                columns : [
                    search.createColumn({name: 'internalid'}),
                    search.createColumn({name: 'tranid'}),
                    search.createColumn({name: 'item'}),
                    search.createColumn({name: 'quantity'}),
                    search.createColumn({name: 'quantityshiprecv'}),
                    search.createColumn({name: 'expectedreceiptdate'}),
                    search.createColumn({name: 'shipdate'})
                ]
            })});

            const from_location_map  = getTransferSourceLocations({
                'transfer_ids' : to_results.map(function(result){ return result.id; })
            });

            for(var y=0; y<to_results.length; y++){

                var result     = to_results[y];
                var remaining  = Math.abs(parseFloat(result.getValue({name: 'quantity'})) || 0) - (parseFloat(result.getValue({name: 'quantityshiprecv'})) || 0);

                if(remaining <= 0) continue;

                supply_lines.push(buildTransactionLine({
                    'type'          : 'Transfer Order (In)',
                    'tran_number'   : result.getValue({name: 'tranid'}),
                    'party'         : from_location_map[result.id] || '',
                    'item_id'       : result.getValue({name: 'item'}),
                    'item_name'     : result.getText({name: 'item'}),
                    'quantity'      : remaining,
                    'date'          : result.getValue({name: 'expectedreceiptdate'}) || result.getValue({name: 'shipdate'}),
                    'is_supply'     : true,
                    'forecast_date' : options.forecast_date,
                    'today_date'    : options.today_date
                }));
            }

            if(options.assembly_ids.length > 0){

                const wo_results  = getAllResults({'search' : search.create({
                    type    : search.Type.WORK_ORDER,
                    filters : [
                        ['mainline', 'is', 'T'],
                        'AND',
                        ['status', 'anyof', WO_STATUSES],
                        'AND',
                        ['item', 'anyof', options.assembly_ids],
                        'AND',
                        ['location', 'anyof', options.location]
                    ],
                    columns : [
                        search.createColumn({name: 'tranid'}),
                        search.createColumn({name: 'item'}),
                        search.createColumn({name: 'quantity'}),
                        search.createColumn({name: 'built'}),
                        search.createColumn({name: 'enddate'})
                    ]
                })});

                for(var z=0; z<wo_results.length; z++){

                    var result     = wo_results[z];
                    var remaining  = (parseFloat(result.getValue({name: 'quantity'})) || 0) - (parseFloat(result.getValue({name: 'built'})) || 0);

                    if(remaining <= 0) continue;

                    supply_lines.push(buildTransactionLine({
                        'type'          : 'Work Order',
                        'tran_number'   : result.getValue({name: 'tranid'}),
                        'party'         : '',
                        'item_id'       : result.getValue({name: 'item'}),
                        'item_name'     : result.getText({name: 'item'}),
                        'quantity'      : remaining,
                        'date'          : result.getValue({name: 'enddate'}),
                        'is_supply'     : true,
                        'forecast_date' : options.forecast_date,
                        'today_date'    : options.today_date
                    }));
                }
            }

            return sortTransactionLines({'lines' : supply_lines});
        }

        /**
         * Open demand at the location : sales orders for the components or for any kit that uses them,
         * plus outbound transfer orders.
         */
        function getDemandLines(options){

            var demand_lines  = [];

            const kit_ids  = Object.keys(options.demand_kit_map);

            const so_results  = getAllResults({'search' : search.create({
                type    : search.Type.SALES_ORDER,
                filters : [
                    ['mainline', 'is', 'F'],
                    'AND',
                    ['taxline', 'is', 'F'],
                    'AND',
                    ['shipping', 'is', 'F'],
                    'AND',
                    ['cogs', 'is', 'F'],
                    'AND',
                    ['closed', 'is', 'F'],
                    'AND',
                    ['status', 'anyof', SO_STATUSES],
                    'AND',
                    ['item', 'anyof', options.item_ids.concat(kit_ids)],
                    'AND',
                    ['location', 'anyof', options.location]
                ],
                columns : [
                    search.createColumn({name: 'tranid'}),
                    search.createColumn({name: 'entity'}),
                    search.createColumn({name: 'item'}),
                    search.createColumn({name: 'quantity'}),
                    search.createColumn({name: 'quantityshiprecv'}),
                    search.createColumn({name: 'quantitycommitted'}),
                    search.createColumn({name: 'shipdate'})
                ]
            })});

            for(var x=0; x<so_results.length; x++){

                var result       = so_results[x];
                var ordered_id   = result.getValue({name: 'item'});
                var outstanding  = (parseFloat(result.getValue({name: 'quantity'})) || 0) - (parseFloat(result.getValue({name: 'quantityshiprecv'})) || 0);

                if(outstanding <= 0) continue;

                var line_data  = {
                    'type'          : 'Sales Order',
                    'tran_number'   : result.getValue({name: 'tranid'}),
                    'party'         : result.getText({name: 'entity'}),
                    'ordered_item'  : result.getText({name: 'item'}),
                    'date'          : result.getValue({name: 'shipdate'}),
                    'is_supply'     : false,
                    'forecast_date' : options.forecast_date,
                    'today_date'    : options.today_date
                };

                if(options.item_ids.indexOf(ordered_id) > -1){

                    demand_lines.push(buildTransactionLine(Object.assign({}, line_data, {
                        'item_id'   : ordered_id,
                        'item_name' : result.getText({name: 'item'}),
                        'quantity'  : outstanding,
                        'committed' : parseFloat(result.getValue({name: 'quantitycommitted'})) || 0
                    })));

                    continue;
                }

                // Kit line : break the outstanding and committed kit quantities down into component quantities
                var component_qty_map  = options.demand_kit_map[ordered_id] || {};
                var kits_committed     = parseFloat(result.getValue({name: 'quantitycommitted'})) || 0;

                for(var item_id in component_qty_map){

                    demand_lines.push(buildTransactionLine(Object.assign({}, line_data, {
                        'item_id'   : item_id,
                        'item_name' : options.name_map[item_id],
                        'quantity'  : outstanding * component_qty_map[item_id],
                        'committed' : kits_committed * component_qty_map[item_id]
                    })));
                }
            }

            // Outbound transfers : quantity committed and quantity shipped both sit on the SHIPPING line at the source location
            const to_results  = getAllResults({'search' : search.create({
                type    : search.Type.TRANSFER_ORDER,
                filters : [
                    ['mainline', 'is', 'F'],
                    'AND',
                    ['transactionlinetype', 'anyof', 'SHIPPING'],
                    'AND',
                    ['status', 'anyof', TO_OUT_STATUSES],
                    'AND',
                    ['item', 'anyof', options.item_ids],
                    'AND',
                    ['location', 'anyof', options.location]
                ],
                columns : [
                    search.createColumn({name: 'tranid'}),
                    search.createColumn({name: 'item'}),
                    search.createColumn({name: 'transferlocation'}),
                    search.createColumn({name: 'quantity'}),
                    search.createColumn({name: 'quantityshiprecv'}),
                    search.createColumn({name: 'quantitycommitted'}),
                    search.createColumn({name: 'shipdate'})
                ]
            })});

            for(var y=0; y<to_results.length; y++){

                var result       = to_results[y];
                var outstanding  = Math.abs(parseFloat(result.getValue({name: 'quantity'})) || 0) - (parseFloat(result.getValue({name: 'quantityshiprecv'})) || 0);

                if(outstanding <= 0) continue;

                demand_lines.push(buildTransactionLine({
                    'type'          : 'Transfer Order (Out)',
                    'tran_number'   : result.getValue({name: 'tranid'}),
                    'party'         : result.getText({name: 'transferlocation'}),
                    'ordered_item'  : result.getText({name: 'item'}),
                    'item_id'       : result.getValue({name: 'item'}),
                    'item_name'     : result.getText({name: 'item'}),
                    'quantity'      : outstanding,
                    'committed'     : parseFloat(result.getValue({name: 'quantitycommitted'})) || 0,
                    'date'          : result.getValue({name: 'shipdate'}),
                    'is_supply'     : false,
                    'forecast_date' : options.forecast_date,
                    'today_date'    : options.today_date
                }));
            }

            return sortTransactionLines({'lines' : demand_lines});
        }

        /**
         * Finds every kit (at any level) that uses one of the components, and how many of each component
         * one of that kit consumes : { kit_id : { component_id : qty } }. Used to break kit sales order lines
         * down into component demand, including kits other than the one selected that share components.
         */
        function getDemandKitMap(options){

            var edges     = {};
            var seen      = {};
            var frontier  = options.item_ids.slice();

            for(var depth=0; depth<MAX_DEPTH && frontier.length>0; depth++){

                var results  = getAllResults({'search' : search.create({
                    type    : search.Type.ITEM,
                    filters : [
                        ['type', 'anyof', KIT_TYPE],
                        'AND',
                        ['memberitem.internalid', 'anyof', frontier]
                    ],
                    columns : [
                        search.createColumn({name: 'memberitem'}),
                        search.createColumn({name: 'memberquantity'})
                    ]
                })});

                var next_frontier  = [];

                for(var x=0; x<results.length; x++){

                    var kit_id  = results[x].id;

                    if(!edges[kit_id]) edges[kit_id] = [];

                    edges[kit_id].push({
                        'member_id' : results[x].getValue({name: 'memberitem'}),
                        'qty'       : parseFloat(results[x].getValue({name: 'memberquantity'})) || 0
                    });

                    if(!seen[kit_id]){
                        seen[kit_id]  = true;
                        next_frontier.push(kit_id);
                    }
                }

                frontier  = next_frontier;
            }

            var resolved     = {};
            var in_progress  = {};

            function resolveKit(kit_id){

                if(resolved[kit_id])    return resolved[kit_id];
                if(in_progress[kit_id]) return {};

                in_progress[kit_id]  = true;

                var component_qty_map  = {};

                for(var x=0; x<edges[kit_id].length; x++){

                    var edge  = edges[kit_id][x];

                    if(options.item_ids.indexOf(edge.member_id) > -1){
                        component_qty_map[edge.member_id]  = (component_qty_map[edge.member_id] || 0) + edge.qty;
                    }

                    if(edges[edge.member_id]){

                        var sub_map  = resolveKit(edge.member_id);

                        for(var component_id in sub_map){
                            component_qty_map[component_id]  = (component_qty_map[component_id] || 0) + edge.qty * sub_map[component_id];
                        }
                    }
                }

                in_progress[kit_id]  = false;
                resolved[kit_id]     = component_qty_map;

                return component_qty_map;
            }

            for(var kit_id in edges){
                resolveKit(kit_id);
            }

            return resolved;
        }

        function getTransferSourceLocations(options){

            var location_map  = {};

            if(options.transfer_ids.length == 0) return location_map;

            const results  = getAllResults({'search' : search.create({
                type    : search.Type.TRANSFER_ORDER,
                filters : [
                    ['mainline', 'is', 'T'],
                    'AND',
                    ['internalid', 'anyof', options.transfer_ids]
                ],
                columns : [
                    search.createColumn({name: 'location'})
                ]
            })});

            for(var x=0; x<results.length; x++){
                location_map[results[x].id]  = results[x].getText({name: 'location'});
            }

            return location_map;
        }

        /**
         * Supply without a date is left out of the forecast (we can't say when it lands).
         * Demand without a date is treated as due now.
         *
         * Overdue lines stay in the forecast but are flagged : supply past its expected date, and demand past its
         * ship date that still has uncommitted quantity (fully committed orders already have their stock set aside).
         */
        function buildTransactionLine(options){

            const line_date    = parseDate({'value' : options.date});
            const in_forecast  = line_date ? (!options.forecast_date || line_date <= options.forecast_date) : !options.is_supply;
            const is_past_due  = !!(line_date && options.today_date && line_date < options.today_date);
            const uncommitted  = options.quantity - (parseFloat(options.committed) || 0);
            const is_overdue   = options.is_supply ? is_past_due : (is_past_due && uncommitted > 0);

            return {
                'type'         : options.type,
                'tran_number'  : options.tran_number,
                'party'        : options.party,
                'ordered_item' : options.ordered_item || '',
                'item_id'      : options.item_id,
                'item_name'    : options.item_name,
                'quantity'     : options.quantity,
                'committed'    : options.committed === undefined ? '' : options.committed,
                'date'         : options.date || '',
                'sort_date'    : line_date ? line_date.getTime() : 0,
                'in_forecast'  : in_forecast,
                'is_overdue'   : is_overdue
            };
        }

        function sortTransactionLines(options){

            return options.lines.sort(function(a, b){
                return a.sort_date - b.sort_date || String(a.tran_number).localeCompare(String(b.tran_number));
            });
        }

        function getKitMembers(options){

            var members  = [];

            const kit_search  = search.create({
                type    : search.Type.ITEM,
                filters : [
                    ['internalid', 'anyof', options.kit_id]
                ],
                columns : [
                    search.createColumn({name: 'memberitem'}),
                    search.createColumn({name: 'memberquantity'}),
                    search.createColumn({name: 'itemid',           join: 'memberItem'}),
                    search.createColumn({name: 'salesdescription', join: 'memberItem'}),
                    search.createColumn({name: 'type',             join: 'memberItem'})
                ]
            });

            const results  = getAllResults({'search' : kit_search});

            for(var x=0; x<results.length; x++){

                var result     = results[x];
                var member_id  = result.getValue({name: 'memberitem'});

                if(!member_id) continue;

                members.push({
                    'item_id'     : member_id,
                    'item_name'   : result.getValue({name: 'itemid', join: 'memberItem'}) || result.getText({name: 'memberitem'}),
                    'description' : result.getValue({name: 'salesdescription', join: 'memberItem'}) || '',
                    'item_type'   : result.getValue({name: 'type', join: 'memberItem'}),
                    'qty_per'     : parseFloat(result.getValue({name: 'memberquantity'})) || 0
                });
            }

            return members;
        }

        /**
         * Returns stock grouped by location : { location_id : { name, items : { item_id : { on_hand, available } } } }
         */
        function getLocationStock(options){

            var stock_map  = {};

            var filters  = [
                ['internalid', 'anyof', options.item_ids]
            ];

            if(options.location){
                filters.push('AND', ['inventorylocation', 'anyof', options.location]);
            }

            const stock_search  = search.create({
                type    : search.Type.ITEM,
                filters : filters,
                columns : [
                    search.createColumn({name: 'internalid'}),
                    search.createColumn({name: 'inventorylocation'}),
                    search.createColumn({name: 'locationquantityonhand'}),
                    search.createColumn({name: 'locationquantityavailable'})
                ]
            });

            const results  = getAllResults({'search' : stock_search});

            for(var x=0; x<results.length; x++){

                var result       = results[x];
                var location_id  = result.getValue({name: 'inventorylocation'});

                if(!location_id) continue;

                if(!stock_map[location_id]){
                    stock_map[location_id]  = {
                        'name'  : result.getText({name: 'inventorylocation'}),
                        'items' : {}
                    };
                }

                stock_map[location_id].items[result.id]  = {
                    'on_hand'   : parseFloat(result.getValue({name: 'locationquantityonhand'}))    || 0,
                    'available' : parseFloat(result.getValue({name: 'locationquantityavailable'})) || 0
                };
            }

            return stock_map;
        }

        function getAllResults(options){

            var search_results  = [];

            const result_set  = options.search.run();

            var current_range  = result_set.getRange({
                start : 0,
                end   : 1000
            });

            var i = 0;
            var j = 0;

            while( j < current_range.length ){

                search_results.push(current_range[j]);

                i++; j++;

                if( j==1000 ) {
                    j=0;
                    current_range = result_set.getRange({
                        start : i,
                        end   : i+1000
                    });
                }
            }

            return search_results;
        }

        function getDefaultForecastDate(){

            var forecast_date  = parseDate({'value' : getToday()}) || new Date();
            forecast_date.setDate(forecast_date.getDate() + FORECAST_DAYS);

            return format.format({value : forecast_date, type : format.Type.DATE});
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

        function parseDate(options){

            if(!options.value) return null;

            try{
                return format.parse({value : options.value, type : format.Type.DATE});
            }catch(e){
                return null;
            }
        }

        function getCsvContent(options){

            const has_forecast  = !!options.forecast;

            var csv_content  = '';
                csv_content  = "Level,";
                csv_content += "Component,";
                csv_content += "Description,";
                csv_content += "Type,";
                csv_content += "Parent Kit,";
                csv_content += "Qty Per Parent,";
                csv_content += "Qty Required Per Kit,";
                csv_content += "On Hand,";
                csv_content += "Available,";
                csv_content += "Kits Supported,";
                csv_content += "Limiting";

            if(has_forecast){
                csv_content += ",Incoming Supply,";
                csv_content += "Open Demand,";
                csv_content += "Backordered,";
                csv_content += "Projected Available,";
                csv_content += "Projected Kits Supported,";
                csv_content += "Projected Limiting";
            }

                csv_content += "\r";

            for(var x=0; x<options.lines.length; x++){

                var line  = options.lines[x];

                csv_content += cleanseValue(line.level) + ",";
                csv_content += cleanseValue(line.item_name) + ",";
                csv_content += cleanseValue(line.description) + ",";
                csv_content += cleanseValue(getTypeLabel({'line' : line})) + ",";
                csv_content += cleanseValue(line.parent_name) + ",";
                csv_content += cleanseValue(line.qty_per) + ",";
                csv_content += cleanseValue(line.qty_required) + ",";
                csv_content += cleanseValue(line.on_hand) + ",";
                csv_content += cleanseValue(line.available) + ",";
                csv_content += cleanseValue(line.max_kits) + ",";
                csv_content += line.is_limiting ? "Yes" : "";

                if(has_forecast){
                    csv_content += "," + cleanseValue(line.incoming) + ",";
                    csv_content += cleanseValue(line.open_demand) + ",";
                    csv_content += cleanseValue(line.backordered) + ",";
                    csv_content += cleanseValue(line.projected) + ",";
                    csv_content += cleanseValue(line.projected_max_kits) + ",";
                    csv_content += line.is_projected_limiting ? "Yes" : "";
                }

                csv_content += "\r";
            }

            if(options.location_lines.length > 0){

                csv_content += "\r";
                csv_content += "Location,";
                csv_content += "Kits Available,";
                csv_content += "Limiting Component(s)";
                csv_content += "\r";

                for(var y=0; y<options.location_lines.length; y++){

                    var location_line  = options.location_lines[y];

                    csv_content += cleanseValue(location_line.location_name) + ",";
                    csv_content += cleanseValue(location_line.kit_available) + ",";
                    csv_content += cleanseValue(location_line.limiting_names.join(' / '));
                    csv_content += "\r";
                }
            }

            if(has_forecast){

                csv_content += "\r";
                csv_content += `Forecast To,${cleanseValue(options.forecast.forecast_to)}\r`;
                csv_content += `Projected Kits Available,${cleanseValue(options.forecast.projected_kits)}\r`;

                var sections  = [
                    {'title' : 'Incoming Supply', 'lines' : options.forecast.supply_lines},
                    {'title' : 'Incoming Demand', 'lines' : options.forecast.demand_lines}
                ];

                for(var s=0; s<sections.length; s++){

                    csv_content += "\r";
                    csv_content += sections[s].title + "\r";
                    csv_content += "Type,";
                    csv_content += "Transaction,";
                    csv_content += "Vendor / Customer / Location,";
                    csv_content += "Ordered Item,";
                    csv_content += "Component,";
                    csv_content += "Quantity,";
                    csv_content += "Committed,";
                    csv_content += "Date,";
                    csv_content += "In Forecast,";
                    csv_content += "Overdue";
                    csv_content += "\r";

                    for(var z=0; z<sections[s].lines.length; z++){

                        var tran_line  = sections[s].lines[z];

                        csv_content += cleanseValue(tran_line.type) + ",";
                        csv_content += cleanseValue(tran_line.tran_number) + ",";
                        csv_content += cleanseValue(tran_line.party) + ",";
                        csv_content += cleanseValue(tran_line.ordered_item) + ",";
                        csv_content += cleanseValue(tran_line.item_name) + ",";
                        csv_content += cleanseValue(tran_line.quantity) + ",";
                        csv_content += cleanseValue(tran_line.committed) + ",";
                        csv_content += cleanseValue(tran_line.date) + ",";
                        csv_content += (tran_line.in_forecast ? "Yes" : "No") + ",";
                        csv_content += tran_line.is_overdue ? "Yes" : "";
                        csv_content += "\r";
                    }
                }
            }

            return csv_content;
        }

        /**
         * Adds a Legend section below Summary Information on single location runs. All locations runs get a note
         * explaining the forecast and highlights need a location, and kits with no tracked components get a note too.
         */
        function addLegend(options){

            const swatch  = 'display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:middle; border:1px solid #bbb;';

            var legend_html  = '';

            if(!options.has_tracked){

                legend_html  = '<div style="font-size:13px;">No inventory tracked components found.</div>';

            }else if(options.is_all_locations){

                legend_html  = '<div style="font-size:13px;">Showing stock across all locations. Select a Location and click Check Availability to see the supply and demand forecast and the highlighted limiting components.</div>';

            }else{

                const items  = [
                    {'sample' : `<span style="${swatch} background-color:${LIMITING_COLOUR};"></span>`,           'text' : 'Limiting component today (Kits Supported)'},
                    {'sample' : `<span style="${swatch} background-color:${PROJECTED_LIMITING_COLOUR};"></span>`, 'text' : 'Limiting component by the Forecast To date (Projected Kits Supported)'},
                    {'sample' : `<span style="${swatch} background-color:${FORECAST_COLOUR};"></span>`,           'text' : 'Included in the forecast (Incoming Supply / Incoming Demand)'},
                    {'sample' : `<span style="margin-right:6px; font-weight:bold; color:${OVERDUE_COLOUR};">Date</span>`, 'text' : 'Overdue : supply past its expected date, or uncommitted demand past its ship date. Still counted in the forecast.'}
                ];

                legend_html  = '<div style="font-size:12px; color:#333;">';

                for(var x=0; x<items.length; x++){
                    legend_html += `<div style="margin-bottom:4px;">${items[x].sample}${items[x].text}</div>`;
                }

                legend_html += '</div>';
            }

            options.form.addFieldGroup({
                id    : 'legend_info',
                label : options.has_tracked && !options.is_all_locations ? 'Legend' : 'Notes'
            });

            const legend_field  = options.form.addField({
                id        : 'custpage_legend',
                type      : serverWidget.FieldType.INLINEHTML,
                label     : 'Legend',
                container : 'legend_info'
            });

            legend_field.defaultValue  = legend_html;
        }

        function getTypeLabel(options){
            return options.line.is_kit ? 'Kit' : (options.line.is_tracked ? options.line.item_type : `${options.line.item_type} (Not Tracked)`);
        }

        function populateLocationSublist(options){

            for(var x=0; x<options.lines.length; x++){

                var line  = options.lines[x];

                setSublistValues({
                    'sublist' : options.sublist,
                    'line'    : x,
                    'values'  : {
                        'custpage_loc_name'     : line.location_name,
                        'custpage_loc_kits'     : line.kit_available
                    }
                });
            }
        }

        function populateTransactionSublist(options){

            for(var x=0; x<options.lines.length; x++){

                var line  = options.lines[x];

                setSublistValues({
                    'sublist' : options.sublist,
                    'line'    : x,
                    'values'  : {
                        'custpage_tran_type'      : line.type,
                        'custpage_tran_number'    : line.tran_number,
                        'custpage_tran_party'     : line.party,
                        'custpage_tran_ordered'   : line.ordered_item,
                        'custpage_tran_component' : line.item_name,
                        'custpage_tran_qty'       : line.quantity,
                        'custpage_tran_committed' : line.committed,
                        'custpage_tran_date'      : line.date || 'No Date',
                        'custpage_tran_forecast'  : line.in_forecast ? 'Yes' : 'No',
                        'custpage_tran_overdue'   : line.is_overdue ? 'Yes' : 'No'
                    }
                });
            }
        }

        function populateSublist(options){

            for(var x=0; x<options.lines.length; x++){

                var line    = options.lines[x];
                var indent  = line.level > 1 ? '    '.repeat(line.level - 1) + '└ ' : '';

                setSublistValues({
                    'sublist' : options.sublist,
                    'line'    : x,
                    'values'  : {
                        'custpage_level'          : line.level,
                        'custpage_component'      : indent + line.item_name,
                        'custpage_description'    : line.description,
                        'custpage_type'           : getTypeLabel({'line' : line}),
                        'custpage_parent'         : line.parent_name,
                        'custpage_qty_per'        : line.qty_per,
                        'custpage_qty_required'   : line.qty_required,
                        'custpage_on_hand'        : line.on_hand,
                        'custpage_available'      : line.available,
                        'custpage_max_kits'       : line.max_kits,
                        'custpage_is_limiting'    : line.is_limiting ? 'Yes' : 'No',
                        'custpage_is_proj_limit'  : line.is_projected_limiting ? 'Yes' : 'No',
                        'custpage_incoming'       : line.incoming,
                        'custpage_open_demand'    : line.open_demand,
                        'custpage_backordered'    : line.backordered,
                        'custpage_projected'      : line.projected,
                        'custpage_projected_kits' : line.projected_max_kits
                    }
                });
            }
        }

        /**
         * Skips empty values and columns the sublist doesn't have (e.g. forecast columns on an all locations run).
         */
        function setSublistValues(options){

            for(var column_id in options.values){

                var value  = options.values[column_id];

                if(value === null || value === undefined || value === '') continue;
                if(!options.sublist.getField({id: column_id})) continue;

                options.sublist.setSublistValue({ id: column_id, line: options.line, value: String(value) });
            }
        }

        function buildLocationSublist(options){

            var sublist  = options.form.addSublist({
                id    : 'custpage_cmc_locations',
                type  : serverWidget.SublistType.LIST,
                label : `Kits by Location (${options.total})`
            });

            sublist.addField({id: 'custpage_loc_name',     label: 'Location',              type: serverWidget.FieldType.TEXT});
            sublist.addField({id: 'custpage_loc_kits',     label: 'Kits Available',        type: serverWidget.FieldType.INTEGER});

            return sublist;
        }

        function buildSupplySublist(options){

            var sublist  = options.form.addSublist({
                id    : 'custpage_cmc_supply',
                type  : serverWidget.SublistType.LIST,
                label : `Incoming Supply (${options.total})`
            });

            addTransactionFields({
                'sublist'      : sublist,
                'party_label'  : 'Vendor / From Location',
                'qty_label'    : 'Qty Remaining',
                'date_label'   : 'Expected Date',
                'is_supply'    : true
            });

            return sublist;
        }

        function buildDemandSublist(options){

            var sublist  = options.form.addSublist({
                id    : 'custpage_cmc_demand',
                type  : serverWidget.SublistType.LIST,
                label : `Incoming Demand (${options.total})`
            });

            addTransactionFields({
                'sublist'      : sublist,
                'party_label'  : 'Customer / To Location',
                'qty_label'    : 'Component Qty Outstanding',
                'date_label'   : 'Ship Date',
                'is_supply'    : false
            });

            return sublist;
        }

        function addTransactionFields(options){

            options.sublist.addField({id: 'custpage_tran_type',      label: 'Type',               type: serverWidget.FieldType.TEXT});
            options.sublist.addField({id: 'custpage_tran_number',    label: 'Transaction',        type: serverWidget.FieldType.TEXT});
            options.sublist.addField({id: 'custpage_tran_party',     label: options.party_label,  type: serverWidget.FieldType.TEXT});

            if(!options.is_supply){
                options.sublist.addField({id: 'custpage_tran_ordered', label: 'Ordered Item',     type: serverWidget.FieldType.TEXT});
            }

            options.sublist.addField({id: 'custpage_tran_component', label: 'Component',          type: serverWidget.FieldType.TEXT});
            options.sublist.addField({id: 'custpage_tran_qty',       label: options.qty_label,    type: serverWidget.FieldType.FLOAT});

            if(!options.is_supply){
                options.sublist.addField({id: 'custpage_tran_committed', label: 'Committed',      type: serverWidget.FieldType.TEXT});
            }

            options.sublist.addField({id: 'custpage_tran_date',      label: options.date_label,   type: serverWidget.FieldType.TEXT});

            // Hidden flags read by the client script to highlight the rows included in the forecast and the overdue dates
            var forecast_field  = options.sublist.addField({id: 'custpage_tran_forecast', label: 'In Forecast', type: serverWidget.FieldType.TEXT});
            var overdue_field   = options.sublist.addField({id: 'custpage_tran_overdue',  label: 'Overdue',     type: serverWidget.FieldType.TEXT});

            forecast_field.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            overdue_field.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
        }

        function buildSublist(options){

            var sublist  = options.form.addSublist({
                id    : 'custpage_cmc_components',
                type  : serverWidget.SublistType.LIST,
                label : options.is_all_locations ? `Components (${options.total}) - Stock Across All Locations` : `Components (${options.total})`
            });

            sublist.addField({id: 'custpage_level',        label: 'Level',                type: serverWidget.FieldType.INTEGER});
            sublist.addField({id: 'custpage_component',    label: 'Component',            type: serverWidget.FieldType.TEXT});
            sublist.addField({id: 'custpage_description',  label: 'Description',          type: serverWidget.FieldType.TEXT});
            sublist.addField({id: 'custpage_type',         label: 'Type',                 type: serverWidget.FieldType.TEXT});
            sublist.addField({id: 'custpage_parent',       label: 'Parent Kit',           type: serverWidget.FieldType.TEXT});
            sublist.addField({id: 'custpage_qty_per',      label: 'Qty Per Parent',       type: serverWidget.FieldType.FLOAT});
            sublist.addField({id: 'custpage_qty_required', label: 'Qty Required Per Kit', type: serverWidget.FieldType.FLOAT});
            sublist.addField({id: 'custpage_on_hand',      label: 'On Hand',              type: serverWidget.FieldType.FLOAT});
            sublist.addField({id: 'custpage_available',    label: 'Available',            type: serverWidget.FieldType.FLOAT});

            // Kits can't be built across locations, so per component kit counts and the forecast only apply to a single location
            if(!options.is_all_locations){
                sublist.addField({id: 'custpage_max_kits',       label: 'Kits Supported',           type: serverWidget.FieldType.INTEGER});
                sublist.addField({id: 'custpage_incoming',       label: 'Incoming Supply',          type: serverWidget.FieldType.FLOAT});
                sublist.addField({id: 'custpage_open_demand',    label: 'Open Demand',              type: serverWidget.FieldType.FLOAT});
                sublist.addField({id: 'custpage_backordered',    label: 'Backordered',              type: serverWidget.FieldType.FLOAT});
                sublist.addField({id: 'custpage_projected',      label: 'Projected Available',      type: serverWidget.FieldType.FLOAT});
                sublist.addField({id: 'custpage_projected_kits', label: 'Projected Kits Supported', type: serverWidget.FieldType.INTEGER});

                // Hidden flags read by the client script to highlight the limiting Kits Supported / Projected Kits Supported cells
                var limiting_field   = sublist.addField({id: 'custpage_is_limiting',   label: 'Limiting',           type: serverWidget.FieldType.TEXT});
                var projected_field  = sublist.addField({id: 'custpage_is_proj_limit', label: 'Projected Limiting', type: serverWidget.FieldType.TEXT});

                limiting_field.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
                projected_field.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            }

            return sublist;
        }

        function buildForm(options){

            var form  = serverWidget.createForm({title: 'Kit Availability Tool'});

            form.clientScriptModulePath  = CLIENT_SCRIPT;

            form.addSubmitButton({label : 'Check Availability'});

            form.addButton({id : 'custpage_export', label : 'Export CSV', functionName: 'download()'});
            form.addButton({id : 'custpage_reset',  label : 'Reset',      functionName: 'reset()'});
            form.addButton({id : 'custpage_cancel', label : 'Cancel',     functionName: 'cancel()'});

            form.addFieldGroup({
                id    : 'filters',
                label : 'Filters'
            });

            // The kit is picked with a type-to-search box (built by the client script) that stores the internal id in this hidden field
            var filter_field_1  = form.addField({
                id        : 'custpage_cmc_kit',
                type      : serverWidget.FieldType.TEXT,
                label     : 'Kit / Assembly',
                container : 'filters'
            });
            filter_field_1.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});

            const kit_options  = getKitOptions({'selected' : options.config.kit});

            var kit_search_field  = form.addField({
                id        : 'custpage_cmc_kit_search',
                type      : serverWidget.FieldType.INLINEHTML,
                label     : 'Kit / Assembly',
                container : 'filters'
            });

            kit_search_field.defaultValue  = getKitSearchHtml({
                'kit_options' : kit_options,
                'selected'    : options.config.kit
            });

            var filter_field_2  = form.addField({
                id        : 'custpage_cmc_location',
                type      : serverWidget.FieldType.SELECT,
                label     : 'Location',
                source    : 'location',
                container : 'filters'
            });
            filter_field_2.setHelpText({help : 'Leave blank to check availability across all locations. The supply and demand forecast is only calculated when a location is selected.'});

            var filter_field_3  = form.addField({
                id        : 'custpage_cmc_forecast_to',
                type      : serverWidget.FieldType.DATE,
                label     : 'Forecast To',
                container : 'filters'
            });
            filter_field_3.setHelpText({help : `Incoming purchase orders, transfers and work orders expected by this date, and sales orders and transfers due to ship by this date, are included in the projected figures. Only applies when a location is selected. Defaults to ${FORECAST_DAYS} days from today.`});

            if(options.config.kit)         filter_field_1.defaultValue = options.config.kit;
            if(options.config.location)    filter_field_2.defaultValue = options.config.location;
            if(options.config.forecast_to) filter_field_3.defaultValue = options.config.forecast_to;

            form.addFieldGroup({
                id    : 'summary_info',
                label : 'Summary Information'
            });

            var summary_field_1  = form.addField({
                id        : 'custpage_summary_available',
                type      : serverWidget.FieldType.INTEGER,
                label     : 'Kits Available',
                container : 'summary_info'
            });
            summary_field_1.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});

            var summary_field_2  = form.addField({
                id        : 'custpage_summary_projected',
                type      : serverWidget.FieldType.INTEGER,
                label     : 'Projected Kits Available (by Forecast To)',
                container : 'summary_info'
            });
            summary_field_2.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});

            if(!options.config.location){
                summary_field_2.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            }

            return form;
        }

        function cleanseValue(objVariable) {

            if(objVariable === null || objVariable === undefined || objVariable === '' || objVariable == 'undefined' || objVariable == '- None -'){

                return '';

            }else{

                var objVariable = String(objVariable).replace(/,/g, "");
                    objVariable = objVariable.replace(/\n/g, " ");
                    objVariable = objVariable.replace(/\r/g, " ");
                    objVariable = objVariable.replace(/["']/g, "IN");

                return objVariable;
            }
        };

        return {onRequest}

    });
