(function() {
    var modalTemplate,
        listFolderTemplate,
        listRowTemplate;

    var emails,
        tags,
        lists,
        listFolders,
        email;
    var emailClicklistBound = false;
    var lastEmailId = -1;

    function getTemplates() {
        modalTemplate = _.template($('#scheduleEmailModalTpl').text());
        listFolderTemplate = _.template($('#listFoldersTpl').text());
        listRowTemplate = _.template($('#listRowTpl').text());
    }

    var ScheduleEmailModal = function(opts)
    {
        var _this = this;

        this.options = opts || {};

        this.options.recipient = this.options.recipient || {};
        this.options.email = this.options.email || {};

        this.open = function() {
            var fetchEmail = false;
            var fetchLists = false;
            var fetchTags = false;

            if (!this.options.email.id || !emails || !emails[this.options.email.id]) {
                fetchEmail = true;
            }
            if (!this.options.recipient.id) {
                if (!lists) {
                    fetchLists = true;
                }
                if (!tags) {
                    fetchTags = true;
                }
            }

            if (fetchEmail || fetchLists || fetchTags) {
                api.getDataForEmailScheduleModal(
                    {
                        emails: fetchEmail,
                        lists: fetchLists,
                        tags: fetchTags,
                        emailSet: fetchLists ? null : 3,
                        email: this.options.email.id
                    },
                    function(resp) {
                        if (resp.data && resp.data.emails) {
                            emails = resp.data.emails;
                        }
                        if (resp.data && resp.data.lists) {
                            lists = resp.data.lists;
                        }
                        if (resp.data && resp.data.listFolders) {
                            listFolders = resp.data.listFolders;
                        }
                        if (resp.data && resp.data.tags) {
                            tags = resp.data.tags;
                        }
                        if (resp.data && resp.data.email) {
                            email = resp.data.email;
                        } else {
                            email = {};
                        }
                        emails[email.id] = email;
                        _this.options.email = email;
                        _this.render();
                    }
                );
            } else {
                if (this.options.email.id && emails && emails[this.options.email.id]) {
                    this.options.email = emails[this.options.email.id];
                }
                this.render();
            }
        };

        this.setupDuplicateWrapper = function setupDuplicateWrapper(email) {
            if (!email || _.empty(email)) {
                return;
            }

            if (email.allowDuplicateSend == 1) {
                $("#duplicateWarningWrapper").hide();
                $("#sendDuplicate").prop('checked', true);
            } else {
                $("#duplicateWarningWrapper").show();
                $("#sendDuplicate").prop('checked', false);
            }
        };

        // Bind click handler for "select an email" modal
        this.setupEmailListHandler = function setupEmailListHandler() {
            $('.email-select-list.alpha-scan-list li').off('click').on('click', function(e) {
                var emailID = $(e.target).attr("value");
                if (!emailID) {
                    return;
                }
                if (lastEmailId != emailID) {
                    lastEmailId = emailID;
                    api.getDataForEmailScheduleModal({email: emailID}, function(resp) {
                        if (resp.data && resp.data.email) {
                            email = resp.data.email;
                        } else {
                            email = {};
                        }
                        _this.options.email = email;
                        _this.setupDuplicateWrapper(email);
                    });
                }
            });
        };

        this.render = function() {
            if (!modalTemplate) {
                getTemplates();
            }
            var email = this.options.email;
            var html = modalTemplate(
                {
                    emails: emails || [],
                    tags: tags || [],
                    recipient: this.options.recipient,
                    email: email
                }
            );

            var $modal = utils.showPageModal(html);
            if ($modal.is(':visible')) {
                _this.setupLists($modal);
                _this.setupHandlers($modal);
                _this.setupEmailListHandler();
                emailClicklistBound = true;
            } else {
                $modal.on('show', function() {
                    _this.setupLists($modal);
                    _this.setupHandlers($modal);
                });
            }

            _this.setupDuplicateWrapper(email);
        };

        this.setupLists = function($el) {
            // Hook up ListJS and search for email list
            if ($('#select_email .list').length) {
                var emailPagingOptions = {
                    name: "pagingBottom",
                    paginationClass: "pagingBottom",
                    innerWindow: 3,
                    left: 2,
                    right: 2
                };

                var emailSelectList = new List('select_email', {
                    page: 25,
                    valueNames: ['email-title', 'email-subject'],
                    plugins: [
                        ListPagination(emailPagingOptions)
                    ]
                });

                emailSelectList.sort('email-title', { order: 'asc' });

                $('#email-search input').on('change, keyup', function(ev) {
                    emailSelectList.search($(this).val() || undefined);
                });
            }

            // Hook up ListJS and search for tags list
            if ($('#select_tag .list').length) {

                var tagSelectList = new List('select_tag', {
                    valueNames: ['list-title']
                });

                tagSelectList.sort('list-title', { order: 'asc' });

                $('#tag-search input').on('change, keyup', function(ev) {
                    tagSelectList.search($(this).val() || undefined);
                });
            }

            // Render non-ListJS list/folders list (search handled via searchGroup)
            if ($('#select_list table.folders').length) {
                var listsHtml = listFolderTemplate({
                    folders: listFolders,
                    lists: lists,
                    listRowTpl: listRowTemplate,
                    disableOptions: true,
                    disablePending: true,
                    selectionMode: true,
                    hideEditName: true
                });
                $('#select_list table.folders').html(listsHtml);
            }

            // Hide show appropriate search inputs on tab change
            $('#select_email').on('tab.change', function() {
                $('#email-search').show();
                $('#list-search').hide();
                $('#tag-search').hide();
            });
            $('#select_list').on('tab.change', function() {
                $('#email-search').hide();
                $('#list-search').show();
                $('#tag-search').hide();
            });
            $('#select_tag').on('tab.change', function() {
                $('#email-search').hide();
                $('#list-search').hide();
                $('#tag-search').show();
            });

            // Allow folder toggling
            $('#select_list .folder-header').on('click', function(ev) {
                ev.stopImmediatePropagation(); // Prevent one on the page already from hiding it
                $(this).closest('.folder').toggleClass('open').find('.icon-folder').toggleClass('icon-folder-open');
            });
        };

        this.setupHandlers = function($el) {
            $('.datepicker', $el).datepicker({minDate: new Date()});

            $('#select_list').on('click', '.list-row', function(ev) {
                var $checkSelect = $('.checkbox-select', ev.currentTarget);
                $checkSelect.toggleClass('checked');

                $('.tagToEmail', $el).prop('checked', false);
            });

            $('#select_tag').on('click', '.tag-row', function(ev) {
                $('#select_list').find('.checkbox-select').removeClass('checked');
            });

            var handleSubmit = function(ev) {
                var time = {};
                var scheduleOpts = {};
                var email = this.options.email;
                var recipient = this.options.recipient;

                // get form data
                var sendLater = $('#sendLater').is(':checked'),
                    sendImmediate = $('#sendImmediate').is(':checked'),
                    sendDuplicate = $('#sendDuplicate').is(':checked'),
                    date = $("input[name='date']", $el).val(),
                    hour = $("select[name='hour']", $el).val(),
                    minute = $("select[name='minute'] option:selected", $el).val(),
                    hourOffset = $("select[name='hourOffset'] option:selected", $el).val(),
                    $selectedEmailRow = $("#select_email input[name='emailID']:checked"),
                    $selectedListRow = $('#select_list .checkbox-select.checked'),
                    $selectedTagRow = $("#select_tag input[name='tagID']:checked"),
                    wholeDate = new Date(date),
                    now = new Date();

                if (sendDuplicate) {
                    $("#duplicateWarningWrapper").hide();
                }else {
                    $("#duplicateWarningWrapper").show();
                }

                // Options
                scheduleOpts.sendDuplicate = sendDuplicate;

                // Validate Time/Date data
                if (sendImmediate) {
                    time.immediate = 1;

                } else {
                    if (!sendLater || _.empty(date)) {
                        utils.showNotification({message: t('email_schedulemodal_error_nodate')});
                        return false;
                    }

                    wholeDate.setHours(hour + hourOffset);
                    wholeDate.setMinutes(minute);
                    if (wholeDate < now) {
                        dateString = wholeDate.toLocaleString();
                        utils.showNotification({message: t('email_schedulemodal_error_invaliddatetime', {datetime: dateString})});
                        return false;
                    }

                    time = {
                        immediate: 0,
                        date: date,
                        hour: hour,
                        minute: minute,
                        hourOffset: hourOffset
                    };
                }

                // Validate email
                if (!email || !email.id) {
                    if (!$selectedEmailRow.length) {
                        utils.showNotification({message: t('email_schedulemodal_error_noemail')});
                        return false;
                    }
                    email = {
                        id: $selectedEmailRow.val()
                    };
                }

                // Validate recipient
                if (!recipient || !recipient.id) {
                    if ($selectedListRow.length) {
                        var lists = _.map($selectedListRow, function(el) { return $(el).data('itemid'); });
                        recipient = {
                            id: lists.length == 1 ? lists[0] : lists,
                            type: 'list'
                        };

                    } else if ($selectedTagRow.length) {
                        recipient = {
                            id: $selectedTagRow.val(),
                            type: 'listTag'
                        };

                    } else {
                        utils.showNotification({message: t('email_schedulemodal_error_noemail')});
                        return false;
                    }

                }

                if ((recipient.type == 'list' || recipient.type == 'listTag') && app.modules.emailModule) {
                    var lID = recipient.type == 'list' ? recipient.id : false;
                    var tID = recipient.type == 'listTag' ? recipient.id : false;
                    app.modules.emailModule.showEmailConfirmation(lID, tID, email.id, scheduleOpts.sendDuplicate, time);
                    return;
                }

                api.scheduleEmailJob(recipient, email, time, scheduleOpts, function(resp) {
                    if (resp && resp.data && resp.data.success) {
                        utils.showNotification({message: t('email_schedulemodal_success')});
                    } else if (resp.errors) {
                        utils.showApiErrors(resp);
                    } else {
                        utils.showNotification({message: t('email_schedulemodal_error')});
                    }
                    utils.dismissPageModal();
                });
            };
            $('#submitEmailJobBtn', $el).click(_.bind(handleSubmit, this));
        };
    };

    window.ScheduleEmailModal = ScheduleEmailModal;
    return ScheduleEmailModal;
})();
