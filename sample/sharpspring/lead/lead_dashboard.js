var LeadDashboard = function(options) {

    var self = this;
    var leads = {};
    var campaigns = {};
    var notes = {};

    self.leads = leads;
    self.campaigns = campaigns;
    self.notes = notes;

    self.timeline = null;
    self.memberships = null;
    self.bannedDevices = null;
    self.sitePages = null;
    self.adwordsKeyword = null;

    self.totalMemberships = 0;

    // API CALLS
    var getCampaigns, getNotes, getTasks, getMemberships, getTimeline;

    // TEMPLATES
    var leadInfoPaneTpl = _.template($('#leadInfoPaneTpl').text());
    var timelineTemplate = _.template($('#leadTimelineTpl').text());
    var timelineEventTpl = _.template($('#leadTimelineEventTpl').text());
    var webVisitPagesTpl = _.template($('#webVisitPagesTpl').text());
    var membershipsTemplate = _.template($('#leadMembershipsTpl').text());
    var deviceMembershipsTemplate = _.template($('#leadDeviceMembershipsTpl').text());

    // Opps / Tasks
    var oppLineItemTemplate = _.template($('#oppLineItem').text());
    var taskRowTpl = _.template($('#taskRowTpl').text());
    var oppNewProductRow = $('#oppNewProductRow').text();
    var oppTaskTemplate = $('#oppTaskTemplate').text();

    // Notes
    var noteRowTpl = _.template($('#noteRowTpl').text());
    var noteEditModalTpl = _.template($('#editNoteModalTemplate').text());
    var notesEllipsisTpl = _.template($('#notesEllipsisTpl').text());
    var deleteNoteModalTpl = _.template($('#deleteNoteModalTpl').text());
    var callEditModalTpl = _.template($('#editCallModalTemplate').text());
    var deleteCallModalTpl = _.template($('#deleteCallModalTpl').text());

    var mediaRowTpl = _.template($('#mediaRowTpl').text());
    var unseenMediaModalTpl = _.template($('#unseenMediaModalTpl').text());

    // Tracking
    var enableTrackingText = t('lead_leaddevices_enabletracking');
    var disableTrackingText = t('lead_leaddevices_disabletracking');
    var disabledTarget = '.disabled-target';

    // ------------------------------ RENDERING  ---------------------------------

    var renderInfoPane = _.debounce(function() {
        var html = leadInfoPaneTpl({lead: lead, systemFields: systemFields, hasPersonas: options.hasPersonas});
        $('#leadInfoPane').html(html);

        $('.personas-modal-link').click(function(evt) {
            evt.preventDefault();

            //Disable link to prevent multiple clicks opening from the modal more than once
            var $link = $(evt.currentTarget);
            $link.attr('disabled', 'disabled');

            var savePersonaSelection = function savePersonaSelection() {
                //save changes goes here
                var selectedPersonaID = $('li[data-persona-id]:not(.persona-inactive-row)').attr('data-persona-id') || 0;
                var personaTitle = $('li[data-persona-id]:not(.persona-inactive-row) .persona-name').text() || t('personas_none_selected');

                api.setPersonaSelection(lead.id, selectedPersonaID, function() {
                    utils.showNotification({message: t('api_save_success')});
                    $('.personas-modal-link').attr('data-persona-id', selectedPersonaID);
                    $('.personas-modal-link > span').text(personaTitle);

                    //Re-enable dropdown link
                    $link.removeAttr('disabled');
                }, function() {
                    utils.showApiErrors({errors: [t('api_save_error')]});

                    //Re-enable dropdown link
                    $link.removeAttr('disabled');
                });
            };

            var selectNone = function selectNone() {
                //Prevent de-selection of checkbox (need to select something else instead)
                $(this).attr('disabled', 'disabled');

                //Deselect the currently selected row
                $('li[data-persona-id]').addClass('persona-inactive-row');
            };

            var selectPersona = function selectPersona() {
                //Clear and enable the "select none" option
                $('#persona-none-selected').removeAttr('disabled').removeAttr('checked');

                //Deselect all other rows
                $('li[data-persona-id]').addClass('persona-inactive-row');

                //Select clicked row
                $(this).removeClass('persona-inactive-row');
            };

            utils.showModal(
                $link.attr('href') + '?id=' + $link.attr('data-persona-id'),
                {
                    readyCallback: function modalReady(modal) {
                        modal.on('click', '#persona-select-modal-confirm', savePersonaSelection);
                        modal.on('change', '#persona-none-selected', selectNone);
                        modal.on('click', 'li[data-persona-id]', selectPersona);
                    }
                }
            );

            return false;
        });
    }, 50);

    var renderTimeline = _.debounce(function() {
        if (self.timeline && self.timeline.events) {
            $('#lolCount').text(self.timeline.events.length);

            var html = timelineTemplate({
                lead: lead,
                timeline: self.timeline,
                sitePages: self.sitePages,
                adwordsKeyword: self.adwordsKeyword,
                timelineEventTpl: timelineEventTpl,
                webVisitPagesTpl : webVisitPagesTpl
            });
            $('#lifeOfLead').html(html).removeClass('has-loader');

            app.modules.Timeline = new TimelineModule(self.timeline.events, {lead: lead});
        }
    }, 50);

    var renderMemberships = _.debounce(function() {
        self.totalMemberships = 0;
        _.each(self.memberships, function(membership, key) {
            if (key !== 'tasks') {
                self.totalMemberships += membership.length;
            }
        });

        if (self.timeline && self.timeline.devices) {
            self.totalMemberships += _.keys(self.timeline.devices).length;
        }

        $('#membershipCount').text(self.totalMemberships);
        var html = membershipsTemplate({lead: lead, memberships: self.memberships, timeline: self.timeline, devicesTpl: deviceMembershipsTemplate });
        $('#leadMemberships').html(html).removeClass('has-loader');

        // Toggle on first available tab
        $('#leadMemberships [data-toggle=tab]').eq(0).trigger('click');
    }, 50);

    var renderDeviceMemberships = _.debounce(function() {
        if (self.timeline) {
            $('.device-membership-btn .subtitle').html(t('x_devices', {x: _.keys(self.timeline.devices).length}));

            var html = deviceMembershipsTemplate({timeline: self.timeline});
            $('#memberships-devices-list').html(html);
        }
    }, 500);

    // ------------------------------ PREFERENCES  ---------------------------------

    var setLeadPrefence = function(preference) {

        api.setLeadPreferences(lead.id, preference, function(resp) {
            if (_.valueAt(resp, 'data', 'success')) {
                if (preference) {
                    $('.lead-notify-btn').addClass('link-active');
                } else {
                    $('.lead-notify-btn').removeClass('link-active');
                }
            }
        });
    };

    getTasks = function() {
        api.getUserTasks(lead.id, 'lead', null, null, null, function(resp) {
            addTasks(_.valueAt(resp, 'data', 'tasks'));
            app.scheduler.addTasks(tasks);
            renderTasks();
        });
    };

    $('body').on('click', '.lead-notify-btn', function() {
        $el = $(this);

        if ($el.is('.link-active')) {
            setLeadPrefence(0);
        } else {
            setLeadPrefence(1);
        }
    });

    // ------------------------------ OPPS  ---------------------------------

    var onOppUpdate = function(data) {

        if (data.isNew) {
            utils.dismissPageModal();
            $('.lead-opportunities').children('.no-opp').remove();
            $('.lead-opportunities').append($(oppLineItemTemplate({opp: data.opportunity}) ));
            utils.showNotification({message: 'Opportunity Saved Successfully.'});
        }

    };

    _.sub('item.opportunity.create', onOppUpdate);
    _.sub('item.opportunity.update', onOppUpdate);


    // ------------------------------ TASKS  ---------------------------------

    var renderTasks = function() {
        if (!_.isFunction(oppTaskTemplate)) {
            oppTaskTemplate = _.template(oppTaskTemplate);
        }

        var tasksHTML = $(oppTaskTemplate({whatID: null, whatType: null, whoID: lead.id, whoType: 'lead', users: users, userTasks: sortedTasks, taskRowTpl: taskRowTpl, noteRowTpl: noteRowTpl}));
        var count = 0;
        app.scheduler.addTasks(sortedTasks); // make sure the scheduler also keeps track of these

        for (var i in sortedTasks) {
            count++;
        }

        $('#taskBlock').html(tasksHTML);
        $('.opp-task-count').text(count);

        $html = $('#taskBlock .last-child');
    };

    var removeTask = function(taskID) {
        delete tasks[taskID];
        for (index in sortedTasks) {
            if (sortedTasks[index]['id'] == taskID) {
                delete sortedTasks[index];
            }
        }

        renderTasks();
    };

    $('body').on('click', '.toggle-tasks', function() {
        if ($('#taskRows').is('.open')) {
            $('#taskRows').removeClass('open');
        } else {
            $('#taskRows').addClass('open');
        }
    });

    $('body').on('click', '.lead-new-task', function() {
        var leadID = lead.id;

        if (leadID) {
            app.scheduler.newTaskModal(null, 'lead', leadID, null, null, {opps: opps});
        }
    });

    $('body').on('click', '.edit-task-button', function() {
        var $el = $(this);
        var leadID = lead.id;
        var taskID = parseInt($el.attr('data-taskID'), 10);
        var task = tasks[taskID];

        if (task && leadID) {
            app.scheduler.editTaskModal(taskID, task.ownerID, {opps: opps});
        }
    });

    $('body').on('click', '.add-task-note', function(event) {

        var $el = $(this);
        var taskID = $el.data('taskid');
        var note = $el.siblings('.insertNewNoteTask').val();
        if (note && note.length > 3) {
            api.setNoteForTask(taskID, note, function(resp){
                var html = noteRowTpl({users: users, note: resp.data.note});
                notes = resp.data.notes;
                tasks[taskID].notes = notes;
                notesLength = notes.length;

                $('.task-notes[data-taskid=' + taskID + ']').prepend(html);
                $el.siblings('.insertNewNoteTask').val('');

                $('#note-count-' + taskID).html(notesLength + ' Notes');

                utils.showNotification({message: 'Note successfully saved'});
            }, function(resp) {
                utils.showNotification({message: 'Server error with saving note'});
            });
        } else {
            utils.showNotification({message: 'Please provide a good note.'});
        }

    });

    var updateTask = function(resp) {

        var lead = _.valueAt(resp, 'lead');
        var task = _.valueAt(resp, 'task');

        if (task && lead) {
            addTasks([task]);
            renderTasks();
        }
    };

    _.sub('item.usertask.create', updateTask);
    _.sub('item.usertask.update', updateTask);
    _.sub('item.usertask.closed', updateTask);
    _.sub('item.usertask.delete', removeTask);


    // ------------------------------ NOTES  ---------------------------------

    var sortByDate = _.sortOnProperty('createTimestamp');
    var renderNotes = function() {

        var sortedNotes = _.objToArray(notes, sortByDate);
        var html = [];
        var count = 0;
        var shownCollasper = false;
        var keys = _.keys(notes);
        var hidden = keys.length - 3;

        for(var note in sortedNotes) {
            sortedNotes[note].hideOpp = _.empty(sortedNotes[note].whatID) || sortedNotes[note].whatType != "opportunity" ? true : false;
            sortedNotes[note]['collapse'] = (count < (keys.length - 1) && count > 1);

            if (!shownCollasper && sortedNotes[note]['collapse']) {
                html.push(notesEllipsisTpl({amount: hidden}));
                shownCollasper = true;
            }
            html.push(noteRowTpl({ note: sortedNotes[note] } ));

            count++;
        }

        $('.opp-note-count').text(keys.length);
        $('#commentsBlock').html(html.join(''));

    };

    $('body').on('click', '.toggle-notes', function() {
        if ($('#commentsBlock').is('.open')) {
            $('#commentsBlock').removeClass('open');
        } else {
            $('#commentsBlock').addClass('open');
        }
    });

    var setFormState = function(event) {
        var value = $(this).val();

        if (value.length) {
            $('#newCommentForm').addClass('focused');
            $(this).addClass('hasChanges');
            _.preventPageChange(true);
        } else {
            $('#newCommentForm').removeClass('focused');
            $(this).removeClass('hasChanges');
            if (!$('.hasChanges').length) {
                _.preventPageChange(false);
            }
        }
    };

    $('#leadOverview #newCommentField').on('keyup', setFormState);
    $('#leadOverview #newCommentField').on('change', setFormState);
    $('body').on('shown', '.modal', function(ev) {
        $('.datepicker', this).datepicker();
    });


    var saveComment = function() {
        var comment = $('#newCommentField').val();
        $('#saveComment').attr('disabled', 'disabled');

        oppID = $('.oppForNote').is(':checked') || $('.oppForNote').is('select') ? $('.oppForNote').val() : null;
        if (opps[oppID]) {
            whatType = 'opportunity';
            recipientID = opps[oppID].ownerID;
        } else {
            oppID = null;
            whatType = null;
            recipientID = lead['ownerID'];
        }

        if (recipientID == app.user.userProfileID) {
            recipientID = null;  // note to self, don't care about receipts
        }

        api.setNewNote(null, comment, 'lead', lead['id'], whatType, oppID, recipientID, function(resp) {
            if (resp && resp.data && resp.data.success) {

                var note = {
                    id: resp.data.insertID,
                    note: comment,
                    displayName: app.user.displayName,
                    emailAddress: app.user.emailAddress,
                    authorID: app.user.userProfileID,
                    createTimestamp: 0,
                    whatID: oppID,
                    whatType: whatType
                };

                notes[note.id] = note;
                var $note = $(noteRowTpl({note: note}));
                $note.hide();
                $('#commentsBlock').prepend($note);
                $note.slideDown(500);
                $('#newCommentField').val('').removeClass('hasChanges');
                $('#newCommentForm').removeClass('focused');
                if (!$('.hasChanges').length) {
                    _.preventPageChange(false);
                }
            }

            $('#saveComment').removeAttr('disabled');
        });
    };

    var setReadReceipt = function() {
        var $el = $(this);
        var noteID = $el.attr('data-noteID');
        var readerID = app.user.userProfileID;

        if (notes[noteID]) {
            api.setReadReceipt('note', noteID, app.user.userProfileID, function(resp) {
                notes[noteID].receipts[readerID] = _.valueAt(resp, 'data', 'receipt');
                $el.replaceWith('<i class="icon-ok"></i> Read');
            });
        }
    };

    $('#leadOverview').on('click', '.note-mark-isread', setReadReceipt);
    $('#leadOverview').on('click', '#saveComment', saveComment);
    $('#leadOverview').on('click', '#cancelComment', function() {
        $('#newCommentField').val('');
        $('#newCommentForm').removeClass('focused');
    });


    // ------------------------------ OPTIONS  ---------------------------------

    $('body').on('click', '.sendOneOffEmail', function() {
        if (app.needsBillingBeforeSend) {
            app.billing.getccBillingInfoModalTpl();
            return;
        }

        var leadID = lead['id'];
        selectedLeadIDs = [];
        selectedLeadIDs.push(leadID);

        utils.showModal('/contacts/sendOneOffEmailConfirm/' + leadID);
    });

    $('body').on('click', '.removeFromWorkflow', function(event) {
        var $el = $(this);
        var workflowID = $el.attr('data-workflowID');
        var leadID = $el.attr('data-leadID');
        api.deleteWorkflowMember(workflowID, leadID);
        $el.parent().parent().parent().parent().remove();
        $('#workflowCount').text(parseInt($('#workflowCount').text()) - 1);
        $('#membershipCount').text(parseInt($('#membershipCount').text()) - 1);
    });

    $('body').on('click', '.resubscribeToCategory', function(event) {
        var $el = $(this);
        var categoryID = $el.attr('data-categoryID');
        var leadID = $el.attr('data-leadID');
        api.resubscribeToCategory(categoryID, leadID);
        $el.parent().parent().parent().parent().remove();
        $('#unsubscribeCategoryCount').text(parseInt($('#unsubscribeCategoryCount').text()) - 1);
    });

    $('body').on('click', '.removeFromList', function(event) {
        var $el = $(this);
        var listID = $el.attr('data-listID');
        var leadID = $el.attr('data-leadID');
        api.removeListMember(listID, leadID);
        $el.parent().parent().parent().parent().remove();
        $('#listCount').text(parseInt($('#listCount').text()) - 1);
        $('#membershipCount').text(parseInt($('#membershipCount').text()) - 1);
    });

    $('body').on('click', '.setEventQueueProcessed', function(event) {
        var $el = $(this);
        var eventQueueID = $el.attr('data-eventQueueID');
        api.setEventQueueProcessed(eventQueueID);
        $el.parent().parent().parent().parent().remove();
        $('#eventQueueCount').text(parseInt($('#eventQueueCount').text()) - 1);
        $('#membershipCount').text(parseInt($('#membershipCount').text()) - 1);
    });


    // ------------------------------ LEAD FIELDS  ---------------------------------

    var onToggleEdit = function(ev) {

        var $el = $(this);
        var $cell = $el.closest('li');

        if ($cell.hasClass('editing')) {
            $cell.removeClass('editing');
            $('fieldset', $cell).hide();
            $('fieldset', $cell).find('.hasChanges').removeClass('hasChanges');
        } else {
            $cell.addClass('editing');
            $('fieldset', $cell).fadeIn('fast');
        }

        if (!$('.hasChanges').length) {
            _.preventPageChange(false);
        }
    };

    // Save Fields Code
    $('body').on('click', '.digest-list .edit', onToggleEdit);
    $('body').on('click', '.digest-list .cancel', onToggleEdit);

    var onFieldChange = function() {
        $(this).addClass('hasChanges');
        _.preventPageChange(true);
    };

    $('body').on('change', '.digest-list input', onFieldChange);
    $('body').on('change', '.digest-list select', onFieldChange);


    $('body').on('click', '.digest-list .save', function(ev) {
        var $el = $(this);
        var $cell = $el.closest('li');

        var specialToString = $cell.attr('data-tostring');
        var fields = {};
        var fieldsNotRetarded = {};
        var leadExists = false;

        var emailField = $('.lead-email-field');
        var checkEmail = api.getLeadEmailExists(emailField.val(), lead.id, function(resp) {
            if (resp && resp.data && resp.data.success && !_.empty(resp.data.lead)) {
                var crmMessage = "";
                if (app.crmConnection && resp.data.lead.crmLeadID && !resp.data.lead.active) {
                    crmMessage = " The existing lead was imported from a CRM and was deactivated. Reactivate the lead in your CRM if you wish to use this lead.";
                }
                utils.showNotification({message:"A lead with the entered email address already exists." + crmMessage});
                leadExists = true;
            }
        });

        $.when(checkEmail).then(function() {
            if (leadExists) {
                return false;
            }

            $('input,select', $cell).each(function(){

                var item = $(this);
                fields[item.attr('name')] = item.val();
                fieldsNotRetarded[item.attr('data-name')] = item.val();

                // TODO: validation by type
                item.removeClass('hasChanges');
            });


            api.setLeadFields(lead.id, fields, false, function(resp) {

                if (resp && resp.data && resp.data.success) {
                    var pairs = _.pairs(fieldsNotRetarded);

                    var prettyString = '';
                    switch (specialToString) {

                        case 'prettyLocation':
                            prettyString = _.prettyLocation(fieldsNotRetarded);
                            break;

                        case 'toPhoneLink':
                            prettyString = _.toPhoneLink(pairs[0][1]);
                            break;

                        case 'toEmailLink':
                            prettyString = _.toEmailLink(pairs[0][1]);
                            break;

                        case 'toWebLink':
                            prettyString = _.toWebLink(pairs[0][1]);
                            break;

                        case 'displayName':
                            prettyString = pairs[0][1] +' '+ pairs[1][1];
                            break;

                        default:
                            prettyString = _.isEmpty(pairs[0][1]) ? (_.prettyLabel(pairs[0][0]) + ' not provided') : pairs[0][1];
                            break;

                    }

                    $('.string', $cell).html(prettyString);
                    $cell.removeClass('editing');

                    if (!$('.hasChanges').length) {
                        _.preventPageChange(false);
                    }
                    if (resp.data.fieldsChanged && resp.data.fieldsChanged.hardBounced == 0) {
                        var hardBounceError = document.getElementById('hardBouncedTextError');
                        hardBounceError.parentNode.removeChild(hardBounceError);

                        var href = _.leadURL(lead.id) + '/subscribeConfirm/0';
                        var resubscribeLink = $('#manualResub');
                        resubscribeLink.find('a').attr('href', href);
                        resubscribeLink.find('a').find('span').text('Unsubscribe from Emails');
                    }
                } else if (resp && resp.errors) {
                    if (specialToString == 'toEmailLink' && resp.errors['dbError']) {
                        utils.showNotification({message: "<span class='warning'>A duplicate profile exists with this email.</span>"});
                    } else {
                        utils.showNotification({message: "<span class='warning'>An error occurred while updating this contact.</span>"});
                    }
                }
            });
        });
    });

    var setOptInStatus = function(optIn) {
        api.setOptInStatus(lead.id, optIn, function(resp) {
            if (resp.data && resp.data.success) {
                location.reload();
            } else if (resp.data.errors) {
                utils.showApiErrors(resp);
            }
        });
    };

    $('body').on('click', '#manualOptIn', function() {
        setOptInStatus(1);
    });

    $('body').on('click', '#removeManualOptIn', function() {
        setOptInStatus(0);
    });

    $('body').on('click', '.delete-uploaded-file', function() {
        var fieldID = $(this).data('fieldid');

        utils.confirmModal({confirmText: 'OK', title: 'Are you sure?', message: 'You will not be able to undo your changes.'}, function() {
            api.deleteLeadFileUpload(lead.id, fieldID, function(resp) {
                if (resp.data && resp.data.success) {
                    location.reload();
                } else if (resp.data.errors) {
                    utils.showNotification({message: resp.data.errors});
                }
            });
        });
    });


    $('body').on('input', '.field-type-url', function() {

        $el = $(this);
        $link = $el.siblings('a');

        link = $el.val();
        if (link.length && link.indexOf('://') < 0) {
            link = "http://" + link;
        }

        if (link.length) {
            $link.attr('href', link);
        } else {
            $link.removeAttr('href');
        }
    });


    $('body').on('click', '#saveCustomFields', function(ev) {
        var toSave = {};
        var textareaChanges = 0;

        var fieldsSaved = false;
        var fileUpload;
        var fileUploadCount = 0;
        var saveRequests = [];

        $('.upload-form').each(function(index, value) {
            var uploadFile = $(this).find("input[type='file']");
            var fieldID = uploadFile.attr('name');
            var file = uploadFile.get(0).files[0];

            if (uploadFile.hasClass('hasChanges')) {

                fileUpload = api.setUploadLeadField(lead.id, fieldID, file, function(resp) {

                    utils.showApiErrors(resp);

                    if (_.valueAt(resp, 'data', 'success')) {
                        uploadFile.removeClass('hasChanges');
                        fileUploadCount++;
                    }

                });

                saveRequests.push(fileUpload);
            }
        });

        $('.customFieldValue').each(function() {
            if (!$(this).closest('li').hasClass('editable')) {
                return;
            }
            toSave[$(this).attr('name')] = $(this).val();
        });

        $('.customFieldCheckBox').each(function() {
            if (!$(this).closest('li').hasClass('editable')) {
                return;
            }
            checkBoxName = $(this).attr('data-fieldName');
            checkBoxValue = "";
            var values = [];
            $('input:checked', $(this)).each(function() {

                values.push($(this).val());

            });

            values = values.join(',');

            toSave[checkBoxName] = values;
        });

        $('.customFieldBooleanCheckBox').each(function() {
            if (!$(this).closest('li').hasClass('editable')) {
                return;
            }
            checkBoxName = $(this).attr('data-fieldName');
            var value = 0;
            if ($('input:checked', $(this)).length > 0) {
                value = 1;
            }
            toSave[checkBoxName] = value;
        });

        $('.customFieldTextarea').each(function() {
            if (!$(this).closest('li').hasClass('editable')) {
                return;
            }
            textareaName = $(this).attr('data-fieldName');
            textareaValue = $('textarea', $(this)).val();
            api.setLeadTextarea(lead.id, textareaName, textareaValue, function(resp) {
                if (resp.data && resp.data.success) {
                    textareaChanges += 1;
                } else if (resp.data.errors) {
                    utils.showNotification({message: resp.data.errors});
                }
            });
        });

        var setFields = api.setLeadFields(lead.id, toSave, false, function(resp) {

            utils.showApiErrors(resp);

            if (_.valueAt(resp, 'data', 'success')) {
                fieldsSaved = true;
                $('.custom-fields .hasChanges').removeClass('hasChanges');
            }

        });

        saveRequests.push(setFields);

        $.when.apply($, saveRequests).done(function() {
            _.preventPageChange(false);

            if (fieldsSaved && fileUploadCount == (saveRequests.length - 1)) {
                utils.showNotification({message: t('lead_leadddashboard_savedcustom_fields')});
            } else {
                utils.showNotification({message: t('db_save_error')});
            }
        });

    });

    $('body').on('change', '.customFieldValue', function(ev) {
        _.preventPageChange(true);
    });

    $('body').on('click', '.linkedInSelectable li', function(ev) {
        $('.linkedInSelectable li').each(function() {
            $(this).removeClass('selected');
        });
        $(this).addClass('selected');
    });

    // ------------------------------ LEAD STATES  ---------------------------------

    $('body').on('click', '.view-devices', function() {
        $('#leadDevicesTabButton').click();
    });

    $('body').on('click', '.selectLeadOwner',function(ev) {
        ownerID = $(this).attr('data-value');
        leadIDs = [];
        leadIDs.push(lead.id);
        api.setLeadOwner(ownerID, leadIDs, function(resp) {
            utils.showNotification({message: 'Lead owner successfully updated.'});
        });
    });

    $('body').on('click', '.selectCampaign',function(ev) {
        campaignID = $(this).attr('data-value');
        leadIDs = [];
        leadIDs.push(lead.id);
        api.setLeadCampaign(campaignID, leadIDs, function(resp) {
            utils.showNotification({message: 'Campaign updated successfully updated.'});
        });
    });

    $('body').on('click', '.changeLeadStatus', function(ev) {
        var status = $(this).attr('data-value');
        fields = {};
        if (status == 'contact') {
            if (lead.hasOpportunity) {
                $('#leadStatusString').text(t('lead_infosidebar_contactwithopportunity'));
                $('#leadScoreDisplay').show();
            } else {
                $('#leadStatusString').text(t('contact'));
                $('#leadScoreDisplay').hide();
            }
        } else if (status == 'qualified') {
            $('#leadStatusString').text(t('lead_infosidebar_qualifiedlead'));
            $('#leadScoreDisplay').show();
        } else if (status == 'unqualified') {
            $('#leadStatusString').text(t('lead_infosidebar_unqualifiedlead'));
            $('#leadScoreDisplay').show();
        } else if (status == 'open') {
            $('#leadStatusString').text(t('lead_infosidebar_openlead'));
            $('#leadScoreDisplay').show();
        }
        api.setLeadStatus(lead.id, status, function(resp) {
            if (resp.data && resp.data.success) {
                utils.showNotification({message: 'Changed lead status!'});
            }
        });
    });
    
    $('body').on('submit', '#linkedInConnectionsList', function(ev) {
        $('.linkedInSelectable li').each(function() {
            if ($(this).hasClass('selected')) {
                var $el = $(this);
                $('<input>').attr({
                    type: 'hidden',
                    name: 'linkedInID',
                    value: $el.attr('connID'),
                }).appendTo('#linkedInConnectionsList');
                $('<input>').attr({
                    type: 'hidden',
                    name: 'thisUser',
                    value: $el.attr('thisUser'),
                }).appendTo('#linkedInConnectionsList');

            }
        });
    });

    $('body').on('click', '.edit-note', function(ev) {
        var $el = $(this);
        var noteID = $el.attr('data-noteID');
        var i, note;

        if ($el.parents('.task-notes').length) {
            var taskID = $el.parents('.task-notes').attr('data-taskid');
            for (i in tasks[taskID]['notes']) {
                if (tasks[taskID]['notes'][i]['id'] == noteID) {
                    note = tasks[taskID]['notes'][i];
                    break;
                }
            }
        } else {
            note = notes[noteID];
        }

        if (!note) {
            utils.showNotification(t('includes_editcall_modal_error_nodata'));
            return;
        }

        var modal;
        if (note.whatType == 'incomingCall' || note.whatType == 'outgoingCall') {
            var event = _.find(self.timelineEvents, function(event) {
                return _.valueAt(event, 'data', 'id') == note.whatID;
            });

            if (!event) {
                utils.showNotification(t('includes_editcall_modal_error_nodata'));
                return;
            }
            if (!_.isFunction(callEditModalTpl)) {
                callEditModalTpl = _.template(callEditModalTpl);
            }
            modal = callEditModalTpl({note: note, event: event, lead: lead});
        } else {
            if (!_.isFunction(noteEditModalTpl)) {
                noteEditModalTpl = _.template(noteEditModalTpl);
            }
            modal = noteEditModalTpl({note: note});
        }

        utils.queueModal($(modal));
    });

    $('body').on('click', '.btn-editNoteContent', function(ev) {
        var $el = $(this);
        var $modal = $el.closest('.modal');
        var noteContent = $('.editCommentField', $modal).val();
        var noteID = $('.noteID', $modal).val();

        if (noteContent) {
            api.setNewNoteContent(noteID, noteContent, function(resp) {
                if (resp.data && resp.data.success) {
                    note = resp.data.note;
                    if (note.whatType == 'task') {
                        noteIDs = _.pluck(tasks[note.whatID]['notes'], 'id');
                        index = noteIDs.indexOf(note['id']);
                        tasks[note.whatID]['notes'][index]['note'] = noteContent;
                        renderTasks();
                        $('#task-notes-' + note.whatID).show();
                    } else {
                        notes[noteID]['note'] = noteContent;
                        renderNotes();
                    }
                } else {
                    utils.showNotification({message: 'No changes were made!'});
                }
            });
        }
        $('.modal').modal('hide');
    });

    $('body').on('click', '.btn-editCallSubmit', function(ev) {
        var $el = $(this);
        var $modal = $el.closest('.modal');
        var callResult = $('#callResultSelect', $modal).attr('data-value');
        var direction = $('#directionSelect input:checked', $modal).val();
        var callNote = $('#callNote', $modal).val();
        var leadID = $('#leadID', $modal).val();
        var noteID = $('#noteID', $modal).val();
        var eventID = $('#eventID', $modal).val();
        var i;

        //(leadID, direction, callResult, callNote, success, error)
        api.editPhoneCall(noteID, leadID, direction, callResult, callNote, function(resp) {
            if (resp.data && resp.data.success) {
                if (resp.data.note) {
                    notes[noteID] = resp.data.note;
                }

                // TODO - life of the lead is entirely rendered in PHP right now and it sucks
                // this does not update the rendered event in life of the lead until you refresh
                var updatedEvent = resp.data.event;
                if (updatedEvent && self.timelineEvents) {
                    for (i = 0; i < self.timelineEvents.length; i++) {
                        if (self.timelineEvents[i]['data'] && self.timelineEvents[i]['data'].id == eventID) {
                            self.timelineEvents.splice(i, 1, updatedEvent);
                            break;
                        }
                    }
                }

                renderNotes();
            } else {
                utils.showNotification({message: t('includes_editcall_modal_editcall_error')});
            }
        });
        $('.modal').modal('hide');
    });

    $('body').on('click', '.delete-note', function(ev) {
        var $el = $(this);
        var noteID = $el.attr('data-noteID');
        var note, event, modal, i;
        if ($el.parents('.task-notes').length) {
            taskID = $el.parents('.task-notes').attr('data-taskid');
            for (i in tasks[taskID]['notes']) {
                if (tasks[taskID]['notes'][i]['id'] == noteID) {
                    note = tasks[taskID]['notes'][i];
                    break;
                }
            }

        } else {
            note = notes[noteID];
        }

        if (!note) {
            utils.showNotification(t('includes_editcall_modal_error_nodata'));
            return;
        }

        if (note.whatType == 'incomingCall' || note.whatType == 'outgoingCall') {
            if (self.timelineEvents) {
                for (i = 0; i < self.timelineEvents.length; i++) {
                    if (self.timelineEvents[i]['data'] && self.timelineEvents[i]['data'].id == note.whatID) {
                        event = self.timelineEvents[i];
                        break;
                    }
                }
            }

            if (!event) {
                utils.showNotification(t('includes_editcall_modal_error_nodata'));
                return;
            }

            if (!_.isFunction(deleteCallModalTpl)) {
                deleteCallModalTpl = _.template(deleteCallModalTpl);
            }
            //date MUST be in YYYY-MM-DDTHH:mm:ss.sssZ format for safari and firefox
            event['data']['createTimestamp'] = event['data']['createTimestamp'].replace(' ', 'T');
            modal = deleteCallModalTpl({note: note, event: event, lead: lead});

        } else {
            if (!_.isFunction(deleteNoteModalTpl)) {
                deleteNoteModalTpl = _.template(deleteNoteModalTpl);
            }
            modal = deleteNoteModalTpl({note: note});
        }

        utils.queueModal($(modal));
    });

    $('body').on('click', '.btn-deleteNoteConfirm', function(ev) {
        var $el = $(this);
        var $modal = $el.closest('.modal');
        var noteID = $('.noteID', $modal).val();
        var confirm = $('.noteConfirmDelete', $modal).val();

        if (confirm && noteID) {
            api.deleteNote(noteID, confirm, function(resp) {
                if (resp.data && resp.data.success) {
                    note = resp.data.note;
                    if (note.whatType == 'task') {
                        noteIDs = _.pluck(tasks[note.whatID]['notes'], 'id');
                        index = noteIDs.indexOf(note['id']);
                        tasks[note.whatID]['notes'].splice(index, 1);
                        renderTasks();
                        $('#task-notes-' + note.whatID).show();
                        notesLength = tasks[note.whatID]['notes'].length;
                        $('#note-count-' + taskID).html(notesLength + ' Notes');
                    } else {
                        delete notes[noteID];
                        renderNotes();
                    }
                } else if (resp.data && resp.data.confirm) {
                    utils.showNotification({ message: t('includes_deletenote_error_confirm', {'delete_confirm': t('delete_confirm')}) });
                }
            });
        } else {
            utils.showNotification({ message: t('includes_deletenote_error_confirm', {'delete_confirm': t('delete_confirm')}) });
        }
        $('.modal').modal('hide');

    });

    $('body').on('click', '.btn-deleteCallSubmit', function(ev) {
        var $el = $(this);
        var $modal = $el.closest('.modal');
        var noteID = $('#callDelete-noteID', $modal).val();
        var confirmation = $('#callDelete-agreement', $modal).val();
        var i;

        api.deletePhoneCall(noteID, confirmation, function(resp) {
            if (resp.data && resp.data.success) {
                delete notes[noteID];
                renderNotes();

                // TODO - life of the lead is entirely rendered in PHP right now and it sucks
                // this does not update the rendered event in life of the lead until you refresh
                if (self.timelineEvents) {
                    for (i = 0; i < self.timelineEvents.length; i++) {
                        if (self.timelineEvents[i]['data'] && self.timelineEvents[i]['data'].id == eventID) {
                            self.timelineEvents.splice(i, 1);
                            break;
                        }
                    }
                }

            } else {
                utils.showNotification({message: t('includes_editcall_modal_editcall_error')});
            }
        });
        $('.modal').modal('hide');
    });

    // ------------------------------ MEMBERSHIP FOLDERS  ---------------------------------

    $('body').on('click', '.viewUnseenMedia', function() {

        api.getUnseenMediaByLead(lead.id, 1, function(resp) {

            var unseenMedia = _.valueAt(resp, 'data', 'unseenMedia');
            if (unseenMedia) {
                var modal = unseenMediaModalTpl({ lead: lead, unseenMedia: unseenMedia, mediaRowTpl: mediaRowTpl });

                if (modal) {
                    utils.showPageModal(modal);
                }
            }
        });
    });

    $('body').on('click', '.membership-info a', function() {

        $('.membership-info a').removeClass('active');
        $(this).addClass('active');

    });


    // --------------------------- TOGGLE TRACKING DEVICES  ------------------------------
    $('body').on('click', '.tracking-toggle-btn', function(){
        var $el = $(this);
        var $device = $el.closest('.device');
        var trackingID = $el.attr('data-trackingID');
        var countEl = $('#leadDevicesTabButton .count');
        var deviceNum = parseInt(countEl.text());
        var banned;

        if ($(disabledTarget, $device).hasClass('disabled')) {
            //enable it
            banned = 0;
        } else {
            //disable it
            banned = 1;
        }

        api.setBanTrackingID(lead.companyProfileID, lead.id, trackingID, banned, function(resp) {
            if (resp && resp.data && resp.data.success) {
                if ($(disabledTarget, $device).hasClass('disabled')) {
                    //enable it
                    $(disabledTarget, $device).removeClass('disabled');
                    $el.removeClass('btn-success').addClass('btn-warning').text(disableTrackingText);
                    $('.no-devices-tracked-wrap').hide();
                    deviceNum++;
                } else {
                    //disable it
                    $(disabledTarget, $device).addClass('disabled');
                    $el.removeClass('btn-warning').addClass('btn-success').text(enableTrackingText);
                    $('.no-devices-tracked-wrap').show();
                    deviceNum--;
                }

                utils.showNotification({message: 'Device tracking has been updated.' });
                $(countEl).text(deviceNum);
            } else {
                utils.showNotification({message: 'Sorry, failed to update tracked device.' });
            }
        });
    });


    // ------------------------------ INIT  ---------------------------------

    var sortByDueDate = _.sortOnProperty('dueDate');
    var addTasks = function(newTasks) {

        for (var i in newTasks) {
            if (newTasks.hasOwnProperty(i)) {
                tasks[newTasks[i]['id']] = newTasks[i];
            }
        }

        sortedTasks = _.objToArray(tasks, sortByDueDate);
    };


    var setStateInput = function() {
        var enabledInput = '';
        var disabledInput = '';
        var value = '';

        if ($('#stateSelectInput').is(':visible')) {
            value = $('#stateSelectInputBox').val();
        } else {
            value = $('#stateTextInputBox').val();
        }
        if ($('#country').val() === 'US') {
            enabledInput = '#stateSelectInput';
            disabledInput = '#stateTextInput';
            if (!_.isEmpty(value)) {
                $('#stateSelectInputBox').val(value);
            }
        } else {
            enabledInput = '#stateTextInput';
            disabledInput = '#stateSelectInput';
            if (!_.isEmpty(value)) {
                $('#stateTextInputBox').val(value);
            }
        }

        $(enabledInput).val(value);
        $(enabledInput).show();
        $(disabledInput).hide();
        enabledInput += 'Box';
        disabledInput += 'Box';
        $(enabledInput).attr('name', 'field_' + _.valueAt(systemFields, 'state', 'id'));
        $(enabledInput).attr('data-name', 'state');
        $(disabledInput).attr('name', '');
        $(disabledInput).attr('data-name', '');
    };

    $('body').on('change', '#country', setStateInput);

    // update Lead description
    $('body').on('click', '.lead-description-edit', function() {
        $('.lead-description').show().focus();
        $('.lead-description-text').hide();
    });

    $('body').on('blur', '.lead-description-wrap textarea', function() {
        var oldText = $('.lead-description-text').html();
        var newText = _.plainTextToHTML($('.lead-description').val());
        $('.lead-description').hide();
        $('.lead-description-text').html(newText).show();
        if (newText != oldText) {
            $(this).addClass('hasChanges');
            _.preventPageChange(true);
        }
    });

    $('body').on('click', '.lead-save-description', function(){
        var leadDescription = $('.lead-description-wrap textarea').val();
        var leadID = parseInt($(this).attr('data-leadID'), 10);
        var leadData = {
            description : leadDescription
        };

        api.setLeadFields(leadID, leadData, false, function(resp) {
            if (_.valueAt(resp, 'data', 'success')) {
                $('.lead-description-wrap textarea').removeClass('hasChanges');
                if (!$('.hasChanges').length) {
                    _.preventPageChange(false);
                }
                utils.showNotification({message: 'Lead description successfully updated.'});
            } else {
                utils.showNotification({message: 'Error, lead description not saved.'});
            }
        });
    });

    $('body').on('click', '.lead-delete-event-from-history', function () {
        var modalConfig = {
                confirmText: t('delete_event_from_timeline_confirm_confirmtext'),
                title: t('delete_event_from_timeline_confirm_title'),
                message: t('delete_event_from_timeline_confirm_message')
            },
            success = function (resp) {
                if (_.valueAt(resp, 'data', 'eventID')) {
                    $('[data-eventid=' + resp.data.eventID + ']').remove();
                    utils.showNotification({message: t('delete_event_from_timeline_confirm_success')});
                } else {
                    utils.showNotification({message: t('delete_event_from_timeline_confirm_error')});
                }
            },
            error = function () {
                utils.showNotification({message: t('delete_event_from_timeline_confirm_error')});
            },
            callback = function () {
                var leadID = $(this).data('whoid'),
                    whatID = $(this).data('whatid'),
                    eventID = $(this).data('eventid'),
                    eventType = $(this).data('eventtype');
                api.deleteEventFromTimeline(leadID, whatID, eventID, eventType, success, error);
            };

        utils.confirmModal(modalConfig, $.proxy(callback, this));
    });

    // Date fields, yaa!
    $('.datepicker').datepicker({
        dateFormat: "yy-mm-dd",
        onSelect: function(dateText, inst) { $(this).attr("value", dateText); }
    });

    $('.datetimepicker').datetimepicker({
        onSelect: function(dateText, inst) { $(this).attr("value", dateText); },
        defaultTime: "00:00"
    });

    var handleCallLogger = function (timeline, note) {
        self.timeline = timeline;
        self.timelineEvents = self.timeline['events'];

        if (!_.isFunction(noteRowTpl)) {
            noteRowTpl = _.template($(noteRowTpl).text());
        }

        var $note = $(noteRowTpl({note: note}));
        $note.hide();
        $('#commentsBlock').prepend($note);
        $note.slideDown(500);
        $('#newCommentField').val('');
        $('#newCommentForm').removeClass('focused');
    };

    var init = function() {
        /* callLogger is exposed via lead_logcall.js */
        var callLogger = window.callLogger();
        callLogger.setCallback(handleCallLogger);

        leads[lead.id] = lead;

        if (app.modules.customFields) {
            app.modules.customFields.render('.lead-overview .custom-fields');
        }

        getCampaigns = api.getCampaigns(1, null, null, function(resp) {
            campaigns = $.extend(campaigns, resp.data.campaigns);
        });

        getNotes = api.getNotes('lead', lead.id, null, null, function(resp) {
            notes = $.extend(notes, _.valueAt(resp, 'data', 'notes'));
        });

        getTimeline = api.getLeadTimeline(lead.id, {order: 'asc'}, function(resp) {
            self.timeline = _.valueAt(resp, 'data', 'timeline');
            self.bannedDevices = _.valueAt(resp, 'data', 'bannedDevices');
            self.sitePages = _.valueAt(resp, 'data', 'sitePages');
            self.adwordsKeyword = _.valueAt(resp, 'data', 'adwordsKeyword');
            self.timelineEvents = self.timeline['events'];
        });

        getMemberships = api.getLeadMemberships(lead.id, function(resp) {
            var memberships = _.valueAt(resp, 'data', 'memberships');
            if (memberships.sentEmails && memberships.sentEmails.length) {
                memberships.sentEmails = _.sortBy(memberships.sentEmails, 'createTimestamp').reverse();
            }
            if (memberships.pendingEmails && memberships.pendingEmails.length) {
                memberships.pendingEmails = _.sortBy(memberships.pendingEmails, 'eventScheduled');
            }
            self.memberships = memberships;
        });

        $.when(getTimeline, getNotes).done(renderNotes);
        $.when(getTimeline).done(renderTimeline);
        $.when(getMemberships).done(renderMemberships);
        $.when(getTimeline, getMemberships).done(renderDeviceMemberships); // Since this needs devices, maybe render those separately

        getTasks();
        renderInfoPane();
        setStateInput();
    };

    window.app.localesReady.done(init);
    return self;
};
