var Billing_Controller = function(options) {

    var self = this;

    // TEMPLATES
    var ccBillingInfoModalTpl = _.template($('#ccBillingInfoModalTpl').text());
    var ccBillingInfoInner = _.template($('#ccBillingInfoInner').text());
    var quickUpgradeTpl = _.template($('#quickUpgradeTpl').text());

    var getccBillingInfoModalTpl = function() {
        api.getBillingInfo(function(resp) {
            var $ccBillingInfoModalTpl = $(ccBillingInfoModalTpl({}));
            var $ccBillingInfoInner = $(ccBillingInfoInner(resp.data));

            $ccBillingInfoModalTpl.find('.ccBillingInfoInner').html($ccBillingInfoInner);
            utils.queueModal($ccBillingInfoModalTpl);
        });
    };

    var getQuickUpgradeModal = function() {
        var $quickUpgradeTpl = $(quickUpgradeTpl({}));
        utils.queueModal($quickUpgradeTpl);
    };

    var submitBillingInfo = function($container, $el) {
        if ($el.attr('disabled')) {
            return;
        }

        var errors = [];
        var billingInfo = {
            country:            $('#country', $container).val(),
            address:            $('#address', $container).val(),
            city:               $('#city', $container).val(),
            zip:                $('#zip', $container).val(),
            cardNumber:         $('#cardNumber', $container).val(),
            expMonth:           $('#cardExpirationMonth', $container).val(),
            expYear:            $('#cardExpirationYear', $container).val(),
            ccv:                $('#csc', $container).val()
        };

        if (billingInfo.country == 'US') {
            billingInfo.state = $('#state', $container).val();
        } else {
            billingInfo.state = $('#stateField input', $container).val();
        }

        if (!$('.confirmTerms').is(':checked') || !$('.confirmCharge').is(':checked')) {
            utils.showNotification({message: t('billing_billinginfo_confirmterms')});
            $el.removeAttr('disabled');
            return;
        }

        _.each(billingInfo, function(value, key) {
            if (_.empty(value)) {
                //We need to make state optional if country is not US
                if (key === 'state' && billingInfo.country !== 'US') {
                    return;
                }
                errors.push(key);
            }
        });

        if ($('.ccInfoType:checked').val() == 1) {
            billingInfo.firstName = $('#firstName', $container).val();
            billingInfo.lastName = $('#lastName', $container).val();
            if (_.empty(billingInfo.firstName) || _.empty(billingInfo.lastName)) {
                errors.push('fullName');
            }
        } else {
            billingInfo.billingCompanyName = $('#billingCompanyName', $container).val();
            if (_.empty(billingInfo.billingCompanyName)) {
                errors.push('companyName');
            }
        }

        if (errors.length) {
            utils.showNotification({message: t('billing_billinginfo_errortext')});
            $el.removeAttr('disabled');
        } else {
            $el.attr('disabled', 'disabled');
            api.setBillingInfo(billingInfo, function(resp) {
                if (_.valueAt(resp, 'data', 'success')) {
                    var elsToFadeInOnSave =
                        $(
                            '.success-ticket-page,' +
                            '.continue-btn'
                        );
                    var elsToHideOnSave =
                        $(
                            '.billing-info-entry,' +
                            '.submit-billing-info-btn,' +
                            'a[data-dismiss="modal"],' +
                            '.plan-selection'
                        );
                    elsToHideOnSave.hide();
                    elsToFadeInOnSave.fadeIn(200);
                    app.needsBillingBeforeSend = false;
                    $el.removeAttr('disabled');
                } else {
                    utils.showApiErrors(resp);
                    $el.removeAttr('disabled');
                }
            });
        }

    };

    var init = function() {
        // TODO: this is used to fire the upgrade modal
        var tryingToSendEmailWithNoCredits = false;
        if (tryingToSendEmailWithNoCredits) {  // not an actual function
            if (app.company.managedBy != app.company.id) {
                // sub accounts should not ever be sent to the plans page
                return;
            }
            getQuickUpgradeModal();
        }

        $('body').on('change', '#country', function(ev) {
            if ($('#country').val() == 'US') {
                $('#stateFieldLi').hide();
                $('#stateDropdownLi').show();
            } else {
                $('#stateFieldLi').show();
                $('#stateDropdownLi').hide();
            }
        });

        $('body').on('change', 'input[type=radio][name=ccInfoType]', function(ev) {
            if ($(this).val() == 2) {
                $('.ccTypeIndividual').addClass('hide');
                $('.ccTypeCompany').removeClass('hide');
            } else {
                $('.ccTypeIndividual').removeClass('hide');
                $('.ccTypeCompany').addClass('hide');
            }
        });

        if ($('#billingInfoWrap').length) {
            api.getBillingInfo(function(resp) {
                if (resp.data && resp.data.success) {
                    $('#billingInfoWrap').html(ccBillingInfoInner(resp.data));
                    $('.submit-billing-info-wall-btn').remove().appendTo('#billingInfoFields', '.billing-info-entry');
                } else {
                    utils.showApiErrors(resp);
                }
            });
        }

        $('body').on('click', '.submit-billing-info-btn', function(ev) {
            $el = $(this);
            $modal = $el.closest('.modal');
            $container = $('.ccBillingInfoInner', $modal);

            submitBillingInfo($container, $el);
        });

        $('body').on('click', '.submit-billing-info-wall-btn', function(ev) {
            $el = $(this);
            $page = $el.closest('.settings-billing-info-page');
            $container = $('#billingInfoWrap', $page);

            submitBillingInfo($container, $el);
        });

        self.getQuickUpgradeModal = getQuickUpgradeModal;
        self.getccBillingInfoModalTpl = getccBillingInfoModalTpl;
    };

    self.plansReady = $.Deferred();
    app.localesReady.done(function() {
        init();
        self.plansReady.resolve();
    });
    return self;
};