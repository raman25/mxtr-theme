(function($) {
    $(function() {

        var existingLeadTpl = _.template('<li class="existing-contact">' +
            '<img src="<%= _.gravatar(emailAddress) %>" class="avatar round" width="48" height="48" /> '+
            '<div class="lead-meta"><a href="<%= _.leadURL(id) %>"> <span class="lead-name"><%= displayName %></span> ' +
            '<span class="lead-email"><%= emailAddress %></span></a>' +
            "<a class='btn btn-mini btn-success formCloneContact' data-sourceLeadID='<%= id %>'><i class='icon-plus'></i> Copy</a></div>" +
            '</li>');

        var foundLeads = function(leads) {
            // Manipulate modal dom to show off new leads and expost a confirm button

            var leadLinks = [];
            for (var lead in leads) {
                var lead = leads[lead];
                var html = existingLeadTpl(lead);
                leadLinks.push(html);
            }

            $('#foundContactsList').html(leadLinks.join(''));
            $('#contactNewModal').hide();
            $('#formConfirmNewContact').hide();
            $('#formCreateNewContact').show();
            $('#foundContacts').show();
        };

        var exactLead = function(lead) {
            var link = "<a href='" + _.leadURL(lead.id) + "' >" + lead.firstName + " " + lead.lastName + " - " + lead.emailAddress + "</a><br/>";

            $('#exactContactMatch').append(link);
            $('#exactEmail').append(lead.emailAddress);

            $('#contactNewModal').hide();
            $('#formConfirmNewContact').hide();
            $('#exactContactMatch').show();
        };

        $('body').on('click', '#formConfirmNewContact', function(ev){
            var firstName = $('#newContactFirstName').val();
            var lastName = $('#newContactLastName').val();
            var emailAddress = $('#newContactEmail').val();
            var phoneNumber = $('#newContactPhoneNumber').val();
            var mobilePhoneNumber = $('#newContactMobilePhoneNumber').val();
            var existingContacts;

            var fullName = firstName + " " + lastName;
            $('#fullName').append(fullName);

            var fields = {
                phoneNumber: phoneNumber,
                mobilePhoneNumber: mobilePhoneNumber
            };

            $('#contactModalErrors').hide().empty();

            api.getSimilarLeads(firstName, lastName, emailAddress, function(resp) {
                if (resp && resp.data && resp.data.success) {
                    if (resp.data.exactLead && resp.data.exactLead.id) {
                        exactLead(resp.data.exactLead);
                    } else if(resp.data.similarLeads) {
                        existingContacts = resp.data.similarLeads;
                        foundLeads(existingContacts);
                    } else {
                        api.createNewContact(null, firstName, lastName, emailAddress, fields, function(resp) {
                            if (resp && resp.data && resp.data.success) {
                                window.location = _.leadURL(resp.data.leadID);
                            } else {
                                utils.showNotification({autohide:false, message: "Contact could not be created."});
                            }
                        }, function(resp) {
                            console.log('lead not created');
                        });
                    }
                } else {
                    utils.showApiErrors(resp);
                }
            }, function(resp) {
                console.log('something went wrong');
            });
        });

        $('body').on('click', '#formCreateNewContact', function(ev) {
            ev.preventDefault();
            createNewContact();
        });

        $('body').on('click', '.formCloneContact', function(ev) {
            ev.preventDefault();
            // Probably not the best way to get this data property, but it works for now
            var sourceLeadID = parseInt(ev.target.attributes['data-sourceLeadID'].value, 10);
            $('body').append('<input type="hidden" id="sourceLeadID" name="sourceLeadID" value="' + sourceLeadID + '"/>');
            createNewContact();
        });

        var createNewContact = function() {
            var firstName = $('#newContactFirstName').val();
            var lastName = $('#newContactLastName').val();
            var emailAddress = $('#newContactEmail').val();
            var phoneNumber = $('#newContactPhoneNumber').val();
            var mobilePhoneNumber = $('#newContactMobilePhoneNumber').val();
            var sourceLeadID = $('#sourceLeadID').val();

            var fields = {
                phoneNumber: phoneNumber,
                mobilePhoneNumber: mobilePhoneNumber
            };

            api.createNewContact(sourceLeadID, firstName, lastName, emailAddress, fields, function(resp) {
                if (resp && resp.data && resp.data.success) {
                    window.location = _.leadURL(resp.data.leadID);
                } else if (resp && resp.data && resp.errors) {
                    var message = t('contact_create_error');

                    if (resp.errors.length > 0) {
                        // Show only one error at a time
                        for (var namedField in resp.errors[0]) {
                            if (resp.errors[0].hasOwnProperty(namedField)) {
                                message = resp.errors[0][namedField];
                                break;
                            }
                        }
                    }

                    utils.showNotification({autohide:false, message: message});
                } else {
                    utils.showNotification({autohide:false, message: t('contact_create_error')});
                }


            }, function(resp) {
                utils.showNotification({message: t('contact_create_error')});
            });
        };


        // Page Search for Contact Manager
        var leadResultTpl = _.template($('#leadSearchTemplate').text());
        var processLeads = function(resp) {

            //console.warn('Lead Matches', resp);
            var leads = _.valueAt(resp, 'data', 'leads');
            var leadIDs = _.keys(leads);

            if (leadIDs.length) {

                var html = '', cnt = 0;
                for (var l in leads) {
                    html += leadResultTpl({lead: leads[l]});
                    if (cnt++ > 20) { break; }
                }

                $('.lead-matched-results').html(html);
                $('.lead-matched-search').fadeIn('fast');

            } else {
                $('.lead-matched-results').html('');
                $('.lead-matched-search').hide();
            }

        };

        var searchForLeads = function(el) {

            var $el = $(this);
            var query = $el.val();

            if (query.length) {
                api.getFilteredLeads(0, query, null, null, null, null, 1, 1, 1, 1, 1, 0, null, null, processLeads);
            } else {
                $('.lead-matched-results').html('');
                $('.lead-matched-search').hide();
            }

        }

        $('body').on('click', '#merge-contacts', function() {
            $modal = $(this).closest('.modal');
            leftLeadID = $('.left-lead-head', $modal).attr('data-leftLeadID');
            rightLeadID = $('.right-lead-head', $modal).attr('data-rightLeadID');
            var $fields = $('.field-active'),
                mergedFields = {};

            $fields.each(function() {
                var $el = $(this),
                    fieldID = $el.attr('data-field-id');

                mergedFields[fieldID] = $el.attr('data-value');
            });

            console.log(mergedFields);
            console.log(leftLeadID, rightLeadID);

            api.setMergedContact(leftLeadID, rightLeadID, mergedFields, function(resp) {
                if (resp.data && resp.data.success && resp.data.leadID) {
                    window.location = _.leadURL(resp.data.leadID);
                }
            });

        });

        $('body').on('click', '#configure-contacts-merge', function() {
            var $modal = $(this).closest('.modal'),
                url;
            leftLeadID = $('.leftLeadID', $modal).val();
            rightLeadID = $('.rightLeadID', $modal).val();

            url = "/contacts/mergeContactConfirm/" + leftLeadID + "/" + rightLeadID;

            utils.getPageContents(url).done(function(data) {
                utils.showPageModal(data);
            });

        });

        $('body').on('click', '.compare-field', function() {
            var $field = $(this),
                $oppositeField,
                isActive = $field.hasClass('field-active'),
                dataValue = $field.attr('data-field-id'),
                leadSelector = '';

            if ($field.closest('.compare-lead')[0].id === 'leftLead') {
                leadSelector = '#rightLead';
            } else {
                leadSelector = '#leftLead';
            }

            $oppositeField = $(leadSelector).find('.compare-field[data-field-id=' + dataValue + ']');

            if (isActive) {
                $field.removeClass('field-active');
                $oppositeField.addClass('field-active');
            } else {
                $field.addClass('field-active');
                $oppositeField.removeClass('field-active');
            }

        });

        var searchLeadsDelayed = _.debounce(searchForLeads, 500);
        $('input.contacts-search').on('paste', searchLeadsDelayed);
        $('input.contacts-search').on('keyup', searchLeadsDelayed);
        $('input.contacts-search').on('change', searchLeadsDelayed);

        $('body').on('click', '.confirmLeadSubscribe', function(ev) {
            var fields = {};
            fields['isUnsubscribed'] =  0;
            var leadID = parseInt($(this).attr('data-leadID'), 10);
            api.setLeadFields(leadID, fields, true, function(resp) {
                if (!(resp.data && resp.data.success)) {
                    utils.showNotification({message: 'Unable to remove from Unsubscribe list!'});
                } else {
                    location.reload();
                }
            });
        });

        $('body').on('click', '.confirmLeadUnsubscribe', function(ev) {
            var fields = {};
            fields['isUnsubscribed'] =  1;
            var leadID = parseInt($(this).attr('data-leadID'), 10);
            api.setLeadFields(leadID, fields, true, function(resp) {
                if (!(resp.data && resp.data.success)) {
                    utils.showNotification({message: 'Unable to add to Unsubscribe list!'});
                } else {
                    location.reload();
                }
            });
        });

    });

})(jQuery);