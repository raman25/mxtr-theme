var Support_Controller = function (options) {

    var self = this;

    var supportDetails;
    var myTickets;
    var roadmapTickets;
    var companyTickets;
    var referrals;

    var ticketGroup;
    var availableCompanies;
    var supportArticles;

    var ticketType;
    var ticketSubtype;

    var filteredCoName = t('support_allcompanies');

    // Templates
    var supportModalTpl = _.template($('#supportModalTpl').text());
    var supportDashboardTpl = _.template($('#supportDashboardTpl').text());
    var roadmapDashboardTpl = _.template($('#roadmapDashboardTpl').text());
    var supportTicketTpl = _.template($('#supportTicketTpl').text());
    var supportTicketRow = _.template($('#supportTicketRowTpl').text());
    var supportSuggestedReadingTpl = _.template($('#supportSuggestedReadingTpl').text());
    var supportReferralsTabTpl = _.template($('#supportReferralsTabTpl').text());

    // API Calls
    var  getSupportDetails;

    self.getSupportDetails = function () {
        return supportDetails;
    };

    var getSupportArticles = function () {
        var searchString = typeof ticketType !== 'undefined' ? ticketType + ' ' + ticketSubtype : undefined;
        var searchArticles = api.searchSupportArticles(searchString, function (resp) {
            if (_.valueAt(resp, 'data', 'success')) {
                supportArticles = resp.data.articles;
            }
        });

        $.when(getSupportDetails, searchArticles).done(function () {
            var $articleContainer = $('.support-docs-inner');
            var html = supportSuggestedReadingTpl({articles: supportArticles});
            $articleContainer.html(html);
        });
    };

    var onSupportTicketTypeChange = function () {
        var defaultText =   $('.defaultText');
        var salesText =     $('.salesText');
        var trainingText =  $('.trainingText');
        var $el = $(this);
        ticketType = $el.attr('data-type');
        ticketSubtype = $el.attr('data-subtype');
        var ticketSubtypeLabel = $el.text();
        var entries = ticketTypes[ticketType];
        for (var i = 0; i < entries.length; i++) {
            if (entries[i].value === ticketSubtype) {
                ticketGroup = entries[i].group;
                break;
            }
        }

        getSupportArticles();
        $('.ticket-type-text').text([ticketType, ticketSubtypeLabel].join(' : '));

        $el.closest('.btn-group').removeClass('open');

        // show/hide the appropriate message
        if (ticketType == 'Training') {
            trainingText.show();
            salesText.hide(); defaultText.hide();
        } else if (ticketType == 'Sales') {
            salesText.show();
            trainingText.hide(); defaultText.hide();
        } else {
            defaultText.show();
            salesText.hide(); trainingText.hide();
        }
    };

    var submitSupportTicket = function () {

        if ($('.ticket-create-btn').attr('disabled')) {
            return;
        }

        var errors = [];
        var $el = $('#support-functions');
        var ticket = {
            title: $el.find('.ticket-title').val(),
            contactPhone: $el.find('.ticket-phone').val(),
            contactName: $el.find('.ticket-name').val(),
            contactEmail: $el.find('.ticket-email').val(),
            description: $el.find('.ticket-description').val(),
            companyName: $el.find('.companyName').val(),
            companyID: $el.find('.companyID').val(),
            type: ticketType,
            subtype: ticketSubtype,
            group: ticketGroup,
            referrer: location.href
        };

        if (!ticket.title) {
            errors.push('title');
        }

        if (!ticket.contactPhone) {
            errors.push('contactPhone');
        }

        if (!ticket.description) {
            errors.push('description');
        }

        if (!ticket.type) {
            errors.push('type');
        }

        if (!ticket.subtype) {
            errors.push('subtype');
        }

        if (errors.length) {
            utils.showNotification({message: t('support_ticket_submit_error')});
        } else {
            $('.ticket-create-btn').attr('disabled', 'disabled');
            var screenshot = $('.input-upload', '.create-support-ticket').get(0).files[0];

            api.sendSupportTicket(ticket, {screenshot: screenshot}, function (resp) {
                if (_.valueAt(resp, 'data', 'success')) {
                    var ticketTypeText = $('.ticket-type-text', '.btn').text();

                    utils.showNotification({message: t('support_ticket_submit_success')});
                    $('#supportTicket').html(supportTicketTpl({supportDetails: supportDetails}));
                    $('.success-ticket-page').fadeIn(200);
                    $('.create-support-ticket').hide();
                    $('.ticket-text-inner').text(ticketTypeText);
                    $('.modal-body').scrollTo('#supportTicket', 200);
                } else {
                    utils.showNotification({message: t('support_ticket_submit_error_api')});
                }
            });
        }

    };

    var submitFeatureRequest = function () {

        if ($('.feature-create-btn').attr('disabled')) {
            return;
        }

        var errors = [];
        var $el = $('#feature-functions');
        var ticket = {
            title: $el.find('.ticket-title').val(),
            contactPhone: $el.find('.ticket-phone').val(),
            contactName: $el.find('.ticket-name').val(),
            contactEmail: $el.find('.ticket-email').val(),
            description: $el.find('.ticket-description1').val(),
            description2: $el.find('.ticket-description2').val(),
            companyName: $el.find('.companyName').val(),
            companyID: $el.find('.companyID').val(),
            type: null,
            subtype: null,
            group: 'Feature Requests'
        };

        if (!ticket.title) {
            errors.push('title');
        }

        if (!ticket.contactPhone) {
            errors.push('contactPhone');
        }

        if (ticket.companyID == 3) {
            if (!ticket.contactEmail) {
                errors.push('contactEmail');
            }
        }

        if (!ticket.description) {
            errors.push('description');
        }

        if (!ticket.description2) {
            errors.push('description2');
        }

        if (errors.length) {
            utils.showNotification({message: t('support_ticket_submit_error')});
        } else {
            $('.feature-create-btn').attr('disabled', 'disabled');
            var screenshot = $('.input-upload', '.create-feature-ticket').get(0).files[0];

            api.sendSupportTicket(ticket, {screenshot: screenshot}, function (resp) {
                if (_.valueAt(resp, 'data', 'success')) {

                    utils.showNotification({message: t('support_ticket_submit_success')});
                    $('#supportTicket').html(supportTicketTpl({supportDetails: supportDetails}));
                    $('.success-feature-page').fadeIn(200);
                    $('.create-feature-ticket').hide();
                    $('.modal-body').scrollTo('#feature-functions', 200);
                } else {
                    utils.showNotification({message: t('support_ticket_submit_error_api')});
                }
            });
        }
    };

    var submitReferral = function () {
        var $this = $(this);
        var $el = $this.closest('.referral-functions');

        if ($('.referral-create-btn').attr('disabled')) {
            return;
        }
        var contactPhone = $el.find('.ticket-phone').val();
        var contactName = $el.find('.ticket-name').val();
        var contactEmail = $el.find('.ticket-email').val();
        var contactCompany = $el.find('.company-name').val();

        api.sendReferral(contactPhone, contactName, contactEmail, contactCompany, function (resp) {
            if (_.valueAt(resp, 'data', 'success')) {
                $('.referral-create-btn').attr('disabled', 'disabled');

                utils.showNotification({message: t('referral_ticket_submit_success')});
                $('#supportReferrals').html(supportReferralsTabTpl({referrals: referrals}));
                $('.success-referral-page').fadeIn(200);
                $('.create-referral-ticket').hide();
            } else {
                utils.showApiErrors(resp);
            }
        });
    };

    var onGetCompanyTickets = function (resp) { // Now labeled 'Support Issues'
        companyTickets = _.valueAt(resp, 'data');
        $('#supportDashboard').html(supportDashboardTpl({companyTickets: companyTickets, supportTicketRow: supportTicketRow}));
        $('#roadmapDashboard').html(roadmapDashboardTpl({companyTickets: companyTickets, supportTicketRow: supportTicketRow}));
    };

    var getReferrals = function (resp) {
        referrals = _.valueAt(resp, 'data', 'referrals');
        $('#supportReferrals').html(supportReferralsTabTpl({referrals: referrals}));
    };

    var onGetSupportDetails = function (resp) {

        supportDetails = resp.data;

        if (_.isEmpty(resp.errors) && _.valueAt(supportDetails, 'supportInfo', 'hasSupportPortal'))
        {
            var html = supportModalTpl({supportDetails: supportDetails});
            var $html = $(html);
            $('body').addClass('supportMode');

            utils.showPageModal($html);
            $('#supportTicket').html(supportTicketTpl({supportDetails: supportDetails, ticketTypes: ticketTypes}));
            getReferrals(resp); // load the referrals tab

            api.getCompanyTickets(app.company.id, {}, onGetCompanyTickets);

            if (typeof supportDetails.availableCompanies !== 'undefined') {
                initSearchCompanies(supportDetails.availableCompanies);
            }

        } else {
            utils.showModal('/help/support');
        }

    };

    var openSupportPage = function () {

        getSupportArticles();

        if (supportDetails) {
            onGetSupportDetails({data: supportDetails});
        } else {
            getSupportDetails = api.getSupportDetails(null, {}, onGetSupportDetails);
        }
    };

    var enableForm = function () {
        $('.create-support-ticket').removeClass('dead');
    };

    var filterCompanies = function () {
        var $elVal = $(this).val();
        var tickets = $('.support-issues', '#supportDashboard');

        _.each(tickets, function (ticket) {
            var $ticketVal = $(ticket).attr('data-affected');

            if ($ticketVal.indexOf($elVal) > -1) {
                $(ticket).show();
                $('.current-co').text($elVal);
            } else if ($elVal == 'all') {
                $(ticket).show();
                $('.current-co').text(filteredCoName);
            } else {
                $(ticket).hide();
                $('.current-co').text($elVal);
            }
        });
    };

    var initSearchCompanies = function (availableCompanies) {
        $(".companyName").autocomplete({
            source: availableCompanies,
            focus: function (event, ui) {
                $(".companyName").val(ui.item.label);
                return false;
            },

            select: function (event, ui) {
                $(".companyName").val(ui.item.label);
                $(".companyID").val(ui.item.value);
                return false;
            }
        });
    };

    var init = function () {
        var ticketTypes = {};
        if (_.hasOffering(_.offerings.ESP)) {
            ticketTypes = {
                General: [
                    {value: 'Billing_Mailplus',                  label: t('supportal_ticket_label_billing'),         group: 'General'},
                    {value: 'Settings_Configurations_Mailplus',  label: t('supportal_ticket_label_settingsconfig'),  group: 'General'},
                    {value: 'Import_Export_General_Mailplus',    label: t('supportal_ticket_label_importexport'),    group: 'I/O'},
                    {value: 'Localization_Mailplus',             label: t('supportal_ticket_label_localization'),    group: 'General'},
                    {value: 'User_Accounts_Mailplus',            label: t('supportal_ticket_label_useraccounts'),    group: 'General'},
                    {value: 'Custom_Fields_Mailplus',            label: t('supportal_ticket_label_customefields'),   group: 'I/O'},
                    {value: 'Contact_Manager_Mailplus',          label: t('supportal_ticket_label_contactmanager'),  group: 'I/O'}
                ],
                Email: [
                    {value: 'A_B_Tests',                 label: t('supportal_ticket_label_abtests'),         group: 'Deliverability'},
                    {value: 'Delivery',                 label: t('supportal_ticket_label_delivery'),        group: 'Deliverability'},
                    {value: 'DKIM_Dedicated_IP',        label: t('supportal_ticket_label_dkim'),            group: 'Deliverability'},
                    {value: 'IMAP_Email_Sync_Mailplus',          label: t('supportal_ticket_label_imap'),            group: 'General'},
                    {value: 'Rendering',        label: t('supportal_ticket_label_rendering'),       group: 'HTML'},
                    {value: 'Reports',                  label: t('supportal_ticket_label_reports'),         group: 'Deliverability'},
                    {value: 'Dynamic_Email_Content',    label: t('supportal_ticket_label_dynamicemail'),    group: 'HTML'},
                    {value: 'Merge_Variables',          label: t('supportal_ticket_label_mergevariables'),  group: 'HTML'},
                    {value: 'Granular_Unsubscribe',     label: t('supportal_ticket_label_granularunsub'),   group: 'HTML'},
                    {value: 'Notifications_Email',            label: t('supportal_ticket_label_notifications'),   group: 'Automation'}
                ],
                Automation: [
                    {value: 'List_Building_Mailplus',            label: t('supportal_ticket_label_listbuilding'),    group: 'Automation'},
                    {value: 'Tasks_Mailplus',                    label: t('supportal_ticket_label_tasks'),           group: 'Automation'},
                    {value: 'Visitor_ID_Automation_Mailplus',               label: t('supportal_ticket_label_vid'),             group: 'Automation'},
                    {value: 'Workflows_Mailplus',                label: t('supportal_ticket_label_workflows'),       group: 'Automation'},
                    {value: 'Notifications_Automation',            label: t('supportal_ticket_label_notifications'),   group: 'Automation'}
                ],
                Forms: [
                    {value: 'Styling',                  label: t('supportal_ticket_label_styling'),         group: 'HTML'},
                    {value: 'Native_Form_Connectivity', label: t('supportal_ticket_label_nativeformconn'),  group: 'Code'},
                    {value: 'SharpSpring_Forms',        label: t('supportal_ticket_label_ssforms'),         group: 'HTML'},
                    {value: 'Configuration',            label: t('supportal_ticket_label_config'),          group: 'HTML'},
                    {value: 'Form_Insights',            label: t('supportal_ticket_label_forminsights'),    group: 'HTML'}
                ],
                'Connectivity or Integrations': [
                    {value: 'API_Mailplus',                      label: t('supportal_ticket_label_api'),             group: 'Code'},
                    {value: 'Zapier_Mailplus',                   label: t('supportal_ticket_label_zapier'),          group: 'Code'},
                    {value: 'IMAP_Email_Sync_Mailplus',          label: t('supportal_ticket_label_imap'),            group: 'General'},
                    {value: 'Import_Export_Connectivity_Mailplus',            label: t('supportal_ticket_label_importexport'),    group: 'I/O'},
                    {value: 'Dynamic_Web_Content_Mailplus',      label: t('supportal_ticket_label_dynamicweb'),      group: 'Code'}
                ],
                Tracking: [
                    {value: 'Site_Analytics_Mailplus',           label: t('supportal_ticket_label_siteanalytics'),   group: 'Automation'},
                    {value: 'Tracking_Code_Mailplus',            label: t('supportal_ticket_label_trackingcode'),    group: 'Automation'},
                    {value: 'Visitor_ID_Tracking_Mailplus',               label: t('supportal_ticket_label_vid'),             group: 'Automation'}
                ],
                'Landing Pages': [
                    {value: 'Editor',                   label: t('supportal_ticket_label_landingpageeditor'), group: 'HTML'},
                    {value: 'Forms',                    label: t('supportal_ticket_label_landingpageforms'), group: 'HTML'},
                    {value: 'Blog_Articles',               label: t('supportal_ticket_label_blogpages'),        group: 'HTML'},
                    {value: 'Publishing',               label: t('supportal_ticket_label_publishing'),       group: 'Code'}
                ]
            };
        } else {
            ticketTypes = {
                General: [
                    {value: 'Billing',                  label: t('supportal_ticket_label_billing'),         group: 'Billing'},
                    {value: 'Settings_Configuration',  label: t('supportal_ticket_label_settingsconfig'),  group: 'HTML'}, //change to Misc group later
                    {value: 'Import_Export_General',            label: t('supportal_ticket_label_importexport'),    group: 'I/O'},
                    {value: 'Localization',             label: t('supportal_ticket_label_localization'),    group: 'HTML'}, //change to Misc group later
                    {value: 'User_Accounts',            label: t('supportal_ticket_label_useraccounts'),    group: 'HTML'}, //change to Misc group later
                    {value: 'Media_Center_General',             label: t('supportal_ticket_label_mediacenter'),     group: 'Automation'}
                ],
                Email: [
                    {value: 'A_B_Tests',                 label: t('supportal_ticket_label_abtests'),         group: 'Deliverability'},
                    {value: 'Delivery',                 label: t('supportal_ticket_label_delivery'),        group: 'Deliverability'},
                    {value: 'DKIM_Dedicated_IP',        label: t('supportal_ticket_label_dkim'),            group: 'Deliverability'},
                    {value: 'IMAP_Email_Sync_Email',          label: t('supportal_ticket_label_imap'),            group: 'I/O'}, //change to Misc group later
                    {value: 'Rendering',        label: t('supportal_ticket_label_rendering'),       group: 'HTML'},
                    {value: 'Reports',                  label: t('supportal_ticket_label_reports'),         group: 'Deliverability'},
                    {value: 'Dynamic_Email_Content',    label: t('supportal_ticket_label_dynamicemail'),    group: 'HTML'},
                    {value: 'Merge_Variables',          label: t('supportal_ticket_label_mergevariables'),  group: 'HTML'},
                    {value: 'Granular_Unsubscribe',     label: t('supportal_ticket_label_granularunsub'),   group: 'HTML'}, //change to Misc group later
                    {value: 'Notifications_Email',            label: t('supportal_ticket_label_notifications'),   group: 'Automation'}
                ],
                Automation: [
                    {value: 'List_Building',            label: t('supportal_ticket_label_listbuilding'),    group: 'Automation'},
                    {value: 'Lead_Scoring',             label: t('supportal_ticket_label_leadscoring'),     group: 'Automation'},
                    {value: 'Tasks',                    label: t('supportal_ticket_label_tasks'),           group: 'Automation'},
                    {value: 'Visitor_ID',               label: t('supportal_ticket_label_vid'),             group: 'Automation'},
                    {value: 'Workflows',                label: t('supportal_ticket_label_workflows'),       group: 'Automation'},
                    {value: 'Notifications_Automation',            label: t('supportal_ticket_label_notifications'),   group: 'Automation'}
                ],
                Forms: [
                    {value: 'Styling',                  label: t('supportal_ticket_label_styling'),         group: 'HTML'},
                    {value: 'Native_Form_Connectivity', label: t('supportal_ticket_label_nativeformconn'),  group: 'Code'},
                    {value: 'SharpSpring_Forms',        label: t('supportal_ticket_label_ssforms'),         group: 'HTML'},
                    {value: 'Configuration',            label: t('supportal_ticket_label_config'),          group: 'HTML'},
                    {value: 'Form_Insights',            label: t('supportal_ticket_label_forminsights'),    group: 'HTML'}
                ],
                'Connectivity or Integrations': [
                    {value: '3rd_Party_Integrations',   label: t('supportal_ticket_label_3rdparty'),        group: 'Code'},
                    {value: 'API',                      label: t('supportal_ticket_label_api'),             group: 'Code'},
                    {value: 'CRM_Migration',            label: t('supportal_ticket_label_crm'),             group: 'I/O'},
                    {value: 'AdWords',                  label: t('supportal_ticket_label_adwords'),         group: 'HTML'}, //change to Misc group later (discussion)
                    {value: 'IMAP_Email_Sync_Connectivity',          label: t('supportal_ticket_label_imap'),            group: 'I/O'}, //change to Misc group later
                    {value: 'Import_Export_Connectivity',            label: t('supportal_ticket_label_importexport'),    group: 'I/O'},
                    {value: 'Shopping_Cart',            label: t('supportal_ticket_label_shoppingcart'),    group: 'Code'},
                    {value: 'Dynamic_Web_Content',      label: t('supportal_ticket_label_dynamicweb'),      group: 'Code'}
                ],
                'Contact Manager or CRM': [
                    {value: 'CRM_Migration_CRM',            label: t('supportal_ticket_label_crm'),             group: 'I/O'},
                    {value: 'SalesForce_Sync',          label: t('supportal_ticket_label_salesforce'),      group: 'I/O'},
                    {value: 'Custom_Fields',            label: t('supportal_ticket_label_customefields'),   group: 'I/O'}, //change to Misc group later
                    {value: 'SharpSpring_CRM',          label: t('supportal_ticket_label_sscrm'),           group: 'I/O'},
                    {value: 'Reports_CRM',                  label: t('supportal_ticket_label_reports'),         group: 'I/O'},
                    {value: 'Contact_Manager',          label: t('supportal_ticket_label_contactmanager'),  group: 'I/O'} //change to Misc group later
                ],
                'Campaigns or Tracking': [
                    {value: 'Adwords_Campaigns',                 label: t('supportal_ticket_label_adwords'),         group: 'HTML'},
                    {value: 'Media_Center_Campaigns',             label: t('supportal_ticket_label_mediacenter'),     group: 'Automation'},
                    {value: 'Site_Analytics',           label: t('supportal_ticket_label_siteanalytics'),   group: 'Automation'},
                    {value: 'Tracking_Code',            label: t('supportal_ticket_label_trackingcode'),    group: 'Automation'},
                    {value: 'Visitor_ID_Campaigns',               label: t('supportal_ticket_label_vid'),             group: 'Automation'},
                    {value: 'Campaigns',                label: t('supportal_ticket_label_campaigns'),       group: 'Automation'}
                ],
                'Landing Pages': [
                    {value: 'Editor',                   label: t('supportal_ticket_label_landingpageeditor'),    group: 'HTML'},
                    {value: 'Forms',                    label: t('supportal_ticket_label_landingpageforms'),      group: 'HTML'},
                    {value: 'Blog_Articles',               label: t('supportal_ticket_label_blogpages'),             group: 'HTML'},
                    {value: 'Publishing',               label: t('supportal_ticket_label_publishing'),            group: 'Code'}
                ],
                Addons: [
                    {value: 'API_Addons',                      label: t('supportal_ticket_label_api'),             group: 'Code'},
                    {value: 'Mobile_App',       label: t('supportal_ticket_label_mobile'),          group: 'Code'},
                    {value: 'Social_Assistant',         label: t('supportal_ticket_label_sa'),              group: 'I/O'}, //change to Misc group later
                    {value: 'Zapier',                   label: t('supportal_ticket_label_zapier'),          group: 'Code'}
                ],
                Sales: [
                    {value: 'Client_Sales_Presentation', label: t('supportal_ticket_label_clientsalespresentation'), group: 'Sales'}
                ],
                Training: [
                    //{value: 'New Employee Training',    label: t('supportal_ticket_label_newemployeetraining'), group: 'Training'},
                    {value: 'Application_Training',        label: t('supportal_ticket_label_appareatraining'),     group: 'Training'}
                ]
            };
            if (!app.isUsingTwillo) {
                ticketTypes.Addons = _.filter(ticketTypes.Addons, function (type) {
                    return type.value != 'Call Tracking';
                });
            }
        }

        window.ticketTypes = ticketTypes;

        $('body').on('click', '.openSupport', openSupportPage);

        // Setup the Ticket Form
        $('body').on('click', '.ticket-select-type', onSupportTicketTypeChange);
        $('body').on('click', '.ticket-select-type', enableForm);
        $('body').on('click', '.ticket-create-btn', submitSupportTicket);
        $('body').on('click', '.feature-create-btn', submitFeatureRequest);
        $('body').on('click', '.referral-create-btn', submitReferral);
        $('body').on('click', '.enable-new-ticket', openSupportPage);
        $('body').on('change', '.dropdown-filter', filterCompanies);
        $('body').on('click', '.close', '#full_page_modal', function () {
            $('body').removeClass('supportMode');
        });
        $('body').on('click', '.add-email-to-form', '#supportReferrals', function () {
            $(this).addClass('disabled');
            $('.referral-art-wrap').addClass('open');
        });
        $('body').on('click', '.collapse-cta', '#supportReferrals', function () {
            $('.referral-art-wrap').find('.add-email-to-form').removeClass('disabled');
            $('.referral-art-wrap').removeClass('open');
        });
        $('body').on('click', '.link-to-referrals-tab', function () {
            $('.nav-tabs li', '.support-portal').removeClass('active');
            $('a[href="#supportReferrals"]').parents('li').addClass('active');
        });
    };

    app.localesReady.done(init);
    return self;
};
