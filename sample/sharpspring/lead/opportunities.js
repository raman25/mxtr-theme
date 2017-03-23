var OppModule = function(options) {

    var self = this;

    var leads = options.leads;
    var dealStages = options.dealStages;
    var pipelines = options.pipelines;
    var campaigns = options.campaigns;
    var products = options.products;

    // Templates
    var oppModalCreateTemplate = $('#oppModalCreateTemplate').text();
    var oppNewProductRow = $('#oppNewProductRow').text();
    var oppExistingModalTemplate = $('#oppExistingModalTemplate').text();
    var oppModalCreateContactsTemplate = $('#oppModalCreateContactsTemplate').text();
    var oppDealStageSelectTemplate = $('#oppDealStageSelectTemplate').text();

    /*
     Crazy ass opportunity stuff, needs to be refactored into a library. Repeat code
     shared with lead dashboard
     Only difference between this page and contacts pge is that this page contains a global
     leads collection but no global lead object, so leadID has to be passed around via modals
     */

    var probabilitySlider;
    var updateProbability = function(event, ui) {
        $('.opp-percentage').text(ui.value);
    };

    $('body').on('change', '.opp-dealstage', function() {

        var $el = $(this);
        var dealStageID = $el.val();
        if (dealStages[dealStageID]) {
            probabilitySlider.slider('value', dealStages[dealStageID].defaultProbability);
        }
    });

    var sortByLeadScore = _.sortOnProperty('leadScoreWeighted', 'desc');
    var filterLeadsWithCampaigns = function(a) {
        return !!(a.campaignID);
    };

    var findLead = function(leadID, callback) {
        api.getLeadsByIDs([leadID], function(resp) {
            var newLeads = _.valueAt(resp, 'data', 'leads');
            if (newLeads && newLeads[leadID]) {
                leads = $.extend(true, leads, newLeads);
                callback(leadID);
            }
        });
    };

    var showRelatedLeads = function(resp) {

        var originatingLeadID = _.valueAt(resp, 'data', 'originatingLeadID');
        var originatingLead = leads[originatingLeadID];
        var matchedLeads = _.valueAt(resp, 'data', 'leads');

        $.extend(leads, matchedLeads);

        var matches = _.objToArray(matchedLeads, sortByLeadScore);
        matches = matches.filter(filterLeadsWithCampaigns);

        var sortedLeads = _.objToArray(matchedLeads, _.sortOnProperty('leadScoreWeighted', 'desc'));

        if (!_.isFunction(oppModalCreateContactsTemplate)) {
            oppModalCreateContactsTemplate = _.template(oppModalCreateContactsTemplate);
        }

        var html = oppModalCreateContactsTemplate({campaigns: campaigns, leads: sortedLeads, originatingLead: originatingLead, originatingLeadID: originatingLeadID});
        $('.oppContacts').html(html);
    };

    var showCreateOpportunityModal = function(leadID) {
        if (leadID && !leads[leadID]) {
            findLead(leadID, showCreateOpportunityModal);
            return;
        }

        if (!_.isFunction(oppModalCreateTemplate)) {
            oppModalCreateTemplate = _.template(oppModalCreateTemplate);
        }

        var pipelineIDs = _.keys(pipelines);
        var pipeline = pipelines[pipelineIDs[0]];
        var modal = oppModalCreateTemplate({ lead: leads[leadID], opp: {}, campaigns: campaigns, products: products, leads: leads, pipelines: pipelines, pipeline: pipeline });

        if (modal) {

            utils.showPageModal(modal);

            probabilitySlider = $('.opp-probability');
            probabilitySlider.slider({value: 10, min: 0, max: 100, step: 5 });

            probabilitySlider.on('slide', updateProbability);
            probabilitySlider.on('slidechange', updateProbability);

            $('.opp-closedate').datepicker({ altFormat: "yyyy-mm-dd" });

            api.getRelatedLeads(leadID, showRelatedLeads);

            $('.opp-account').autocomplete({
                minLength: 0,
                source: function(request, response) {
                    api.getSearch('account', request['term'], {limit: 10},
                        // success function
                        function(resp) {
                            if (resp && resp.data) {
                                var source = [];
                                acctMatches = resp.data.results;
                                _.each(acctMatches, function(acct) {
                                    source.push({label: acct.accountName, value: acct.id});
                                });
                            
                                response(source);
                            }
                        }, function(resp) {
                             response('');
                        }
                    );
                },
                select: function(event, ui) {
                    $(this).val(ui.item.label);
                    $('.opp-accountID').val(ui.item.value);
                    return false;
                },
                focus: function(event, ui) {
                    event.preventDefault();
                    $(this).val(ui.item.label);
                }
            }).focus(function() {
                $(this).autocomplete('search', $(this).val());
            });

            $('.opp-account').keydown(function(ev) {
                // ignore Enter, Tab, Shift, arrow keys, Caps Lock, Num Lock and meta keys (ctrl/cmd/alt/option)
                if (_.indexOf(_.autocompleteIgnoreKeys, ev.which) == -1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
                    $('.opp-accountID').val(-1);
                }
                //Esc
                if (ev.which == 27) {
                    $(this).val('');
                }
            });

            updateDealStageSelect(pipeline.id, null);
        }

    };

    var updateDealStageSelect = function(pipelineID, dealStageID) {
        var pipeline = pipelines[pipelineID];
        if (!_.isFunction(oppDealStageSelectTemplate)) {
            oppDealStageSelectTemplate = _.template(oppDealStageSelectTemplate);
        }
        var compiledTpl = oppDealStageSelectTemplate({ dealStages: dealStages, pipeline: pipeline, selectedStage: dealStageID });
        $('.opp-dealstage').val(dealStageID);
        $('.opp-dealstage').html(compiledTpl);
    };

    var showExistingOpportunityModal = function(element, matchedOpps, leadID) {
        if (!_.isFunction(oppExistingModalTemplate)) {
            oppExistingModalTemplate = _.template(oppExistingModalTemplate);
        }

        var modal = $(oppExistingModalTemplate({opps: matchedOpps, lead: leads[leadID]}));
        modal.on('click', '.createNewOpp', function() {
            var $el = $(this);
            $('.modal').modal('hide');
            showCreateOpportunityModal(leadID);
        });
        utils.queueModal(modal);
    }

    // From List of Leads / Opp Page
    $('body').on('click', '.createOpportunity', function() {
        var leadID = $(this).attr('data-leadid');
        var $el = $(this);

        api.getOppsRelatedToLead(leadID, 'sales', function(resp) {
            if (resp.data.opps.length == 0) {
                showCreateOpportunityModal(leadID);
            } else {
                showExistingOpportunityModal($el, resp.data.opps, leadID);
            }
        });
    });

    var updateProductRequirements = function(modal) {

        var pipelineID = parseInt($('.opp-pipelineID', modal).val(), 10);
        var dealStageID = parseInt($('.opp-dealstage', modal).val(), 10);

        updateDealStageSelect(pipelineID, dealStageID);

        // Check to see if there are any products that can't be listed
        if (modal.attr('data-oppid') == 0) {

            var totalValue = 0;
            $('.product', modal).each(function(index, el) {

                var $el = $(this);
                var productID = parseInt($('.productID', $el).val(), 10);
                var productPipelineID = products[productID].pipelineID;
                var productPrice = parseInt($el.find('.oppProductPrice').val(), 10);
                var productQty = parseInt($el.find('.oppProductQty').val(), 10);

                if (pipelines[pipelineID] && !_.isNull(productPipelineID) && pipelineID != productPipelineID) {
                    $el.addClass('disabled');
                } else {
                    $el.removeClass('disabled');

                    if (productPrice && productQty) {
                        totalValue += (productPrice * productQty);
                    }
                }

            });

            if (totalValue) {
                $('.opp-amount', modal).val(totalValue);
            }

        }
    };

    $('body').on('change', '.opp-pipelineID', function() {
        var $el = $(this);
        var pipelineID = parseInt($el.val(), 10);
        var modal = $el.closest('.modal');

        updateProductRequirements(modal);
    });

    $('body').on('click', '.opp-remove-product', function() {
        $(this).closest('li').remove();
    });

    // Add to New Opp
    $('body').on('click', '.opportunity-new-add-product', function() {

        var $el = $(this);
        var $modal = $el.closest('.modal');
        var $products = $modal.find('.products');
        var dealStageID = parseInt($('.opp-dealstage'), 10);
        var dealStagePipelineID = dealStages[dealStageID] ? dealStages[dealStageID].pipelineID : null;
        
        if (!_.isFunction(oppNewProductRow)) {
            oppNewProductRow = _.template(oppNewProductRow);
        }
        var row = $(oppNewProductRow({products: _.where(products, {isActive: "1"}), pipelineID: dealStagePipelineID}));

        $products.append(row);

    });

    // Change the price and amount when
    $('body').on('input', '.productID', function() {

        var $el = $(this);
        var row = $el.closest('.modal,.product');
        var modal = $el.closest('.modal');
        var productID = $el.val();
        $('.oppProductPrice', row).val(products[productID].price);
        updateProductRequirements(modal);

    });

    $('body').on('keyup change', '.oppProductQty', function() {
        var $el = $(this);
        var modal = $el.closest('.modal');
        updateProductRequirements(modal);
    });

    $('body').on('keyup change', '.oppProductPrice', function() {
        var $el = $(this);
        var modal = $el.closest('.modal');
        updateProductRequirements(modal);
    });

    var saveOpp = function() {

        var $el = $(this);
        var modal = $el.closest('.modal');

        var oppID = $('.opp-id', modal).val();
        var oppName = $('.opp-name', modal).val();
        var accountName = $('.opp-account', modal).val();
        var accountID = parseInt($('.opp-accountID', modal).val(), 10) || null;
        var ownerID = $('.opp-owner', modal).val();
        var leadIDs = $('.opp-leads', modal).val();
        var amount = $('.opp-amount', modal).val();
        var probability = $('.opp-percentage', modal).text();
        var dealStageID = $('.opp-dealstage', modal).val();
        var closeDate = $('.opp-closedate', modal).val();
        var status = $('.opp-status', modal).val();
        var reassignLead = $('.reassign-lead', modal).is(':checked') ? 1 : 0;
        var campaignID = $('.opp-campaign', modal).val();
        var settings = $('.opp-owner-lead-settings', modal).is('.link-active') ? 1 : 0;
        var oppProducts = [];
        var oppContacts = [];
        var originatingLeadID = parseInt($('.originatingLead:checked').val(), 10) || null;

        var isWon = (status === 'won' ? 1 : 0);
        var isClosed = (status === 'won' || status === 'lost' ? 1 : 0);
        var isActive = (status === 'archived' ? 0 : 1);

        var description = $('.opp-description', modal).val() || '';
        var fieldErrors = [];

        if (oppID) {
            leadIDs = opps[oppID].leadIDs.join(',');
        } else {
            $('.product', modal).not('.disabled').each(function(index, value) {
                var $el = $(this);
                var productID = parseInt($('.productID', $el).val(), 10);
                var product = products[productID];
                var productQty = parseInt($('.oppProductQty', $el).val(), 10);
                var productPrice = parseInt($('.oppProductPrice', $el).val(), 10);

                if (isNaN(productID) || isNaN(productQty) || isNaN(productPrice)) {
                    fieldErrors.push('Products');
                } else {
                    oppProducts.push({productID: productID, quantity: productQty, pricePer: productPrice, itemCode: product['itemCode'], category: product['category']});
                }
            });

            // Now grab all the contacts
            var $contacts = $('.contact', modal);
            if ($contacts.length) {
                $('.contact', modal).each(function() {

                    var $el = $(this);
                    var $contact = $('.oppContact', $el);
                    var $isOriginal = $('.originatingLead', $el);

                    if ($isOriginal.is(":checked") && !$contact.is(':checked')) {
                        fieldErrors.push('Originating Lead');
                    }

                    if ($contact.is(':checked')) {
                        oppContacts.push(parseInt($contact.val(), 10));
                    }

                });
            } else {
                fieldErrors.push('Contacts');
            }

            leadIDs = oppContacts.join(',');

        }


        if (!oppName) {
            fieldErrors.push('Opportunity name');
        }

        if (!accountName || !accountName.length) {
            fieldErrors.push('Account name');
        }

        amount = amount || '';
        amount = amount.replace(',', ''); // strip out the commas
        amount = Number(amount);
        if (!amount || amount < 1) {
            fieldErrors.push('Amount');
        }

        if (!ownerID) {
            fieldErrors.push('Owner');
        }

        if (!probability) {
            fieldErrors.push('Probability');
        }

        if (!dealStageID) {
            fieldErrors.push('Deal Stage');
        }

        if (!closeDate) {
            fieldErrors.push('Close Date');
        }

        if (!fieldErrors.length) {

            if ($el.is('.btn')) {
                $el.attr('disabled', 'disabled');
            }

            _.preventPageChange(false);
            var customFields = null;

            //setOpportunity: function(id, opportunityName, closeDate, description, accountName, accountID, ownerID, leadIDs, campaignID, amount, probability, dealStageID, isWon, isClosed, originatingLeadID, reassignLead, isActive, settings, products, customFields, success, error)
            api.setOpportunity(oppID, oppName, closeDate, description, accountName, accountID, ownerID, leadIDs, campaignID, amount, probability, dealStageID, isWon, isClosed, originatingLeadID, reassignLead, isActive, settings, oppProducts, customFields, function(resp) {

                var opportunity = _.valueAt(resp, 'data', 'opportunity');
                if (opportunity) {
                    $('.modal').modal('hide'); // hides a modal if new opp

                    if (oppID) {
                        _.pub('item.opportunity.update', {opportunity: opportunity, isNew: 0});
                    } else {
                        _.pub('item.opportunity.create', {opportunity: opportunity, isNew: 1});
                    }

                } else {
                    if (resp && resp.errors && resp.errors['opportunityError']) {
                        utils.showNotification({message: resp.errors['opportunityError']});
                    } else {
                        utils.showNotification({message: 'An error occurred while saving.'});
                    }
                }

                if ($el.is('.btn')) {
                    $el.removeAttr('disabled');
                }

            });
        } else {
            utils.showNotification({message: 'The following fields are required: ' + fieldErrors.join(', ')});
        }

    };


    var init = function() {

        $('body').on('click', '.opp-save', saveOpp);
        return self;
    };

    return init();

}
