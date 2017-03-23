(function() {
    var modalTemplate,
        domainBlacklistedModalTpl;

    function getTemplates() {
        modalTemplate = _.template($('#domainVerifyModalTemplate').text());
        domainBlacklistedModalTpl = _.template($('#domainBlacklistedModalTemplate').text());
    }

    var DomainVerifyModal = function(opts)
    {
        var _this = this;

        this.options = opts || {};

        this.options.domain = this.options.domain || '';
        this.options.vDomain = this.options.vDomain || null;
        this.options.emailAddress = this.options.emailAddress || '';
        this.options.createNew =  this.options.createNew || false;
        this.options.reloadOnSuccess = this.options.reloadOnSuccess || false;

        this.open = function() {
            var _this = this;

            if (this.options.createNew) {
                this.render();
                return;
            }

            if (!this.options.domain && this.options.emailAddress) {
                var emailParts = this.options.emailAddress.split('@');
                if (emailParts.length > 1) {
                    this.options.domain = $.trim(_.last(emailParts));
                }
            }
            if (!this.options.domain) {
                return;
            }

            if (!this.options.vDomain) {
                api.getVerifiedDomain(this.options.domain, 0, function(resp) {
                    var vDomain = _.valueAt(resp, 'data', 'domain');
                    _this.options.vDomain = vDomain;
                    if (!_this.options.emailAddress && vDomain && vDomain.lastRequestAddress) {
                        _this.options.emailAddress = vDomain.lastRequestAddress;
                    }
                    _this.render();
                });

            } else {
                this.render();
            }
        };

        this.render = function() {
            var _this = this;
            if (!modalTemplate) {
                getTemplates();
            }

            var html = modalTemplate(
                {
                    domain: this.options.domain,
                    vDomain: this.options.vDomain,
                    emailAddress: this.options.emailAddress,
                    createNew: this.options.createNew,
                    isPro: (app.company.productOffering & 1) > 0
                }
            );

            $modal = utils.queueModal(html);
            if ($modal.is(':visible')) {
                this.setupHandlers($modal);
            } else {
                $modal.on('show', function() {
                    _this.setupHandlers($modal);
                });
            }
        };

        this.setupHandlers = function($modal) {

            var handleSubmit = function(ev) {
                var emailAddress = $modal.find('input[name="verificationAddress"]').val();
                var emailParts = emailAddress.split('@');
                var reloadOnSuccess = this.options.reloadOnSuccess;

                if (emailParts.length > 1 && (this.options.createNew || $.trim(_.last(emailParts)) == this.options.domain)) {
                    api.isValidSendAddress(emailAddress, function(resp) {
                        if (_.valueAt(resp, 'data', 'valid')) {
                            api.sendDomainVerificationEmail(emailAddress, function(resp) {
                                if (_.valueAt(resp, 'data', 'success') != 0) {
                                    if (reloadOnSuccess) {
                                        window.location.reload();
                                    } else {
                                        utils.showNotification({message: 'Verification Link Sent'});
                                    }
                                } else {
                                    utils.showNotification({error: t('email_verifydomain_error_errorsending')});
                                }
                                $modal.modal('hide');
                            });
                        } else {
                            $modal.modal('hide');
                            var html = domainBlacklistedModalTpl({
                                domain: $.trim(_.last(emailParts)),
                                source: _.valueAt(resp, 'data', 'match')
                            });
                            utils.queueModal(html);
                        }
                    });
                } else {
                    $modal.find('.control-group').addClass('error');
                    utils.showNotification({message: t('email_verifydomain_error_domainnotmatch')});
                }
            };

            $('button.submit', $modal).click(_.bind(handleSubmit, this));
        };
    };

    window.DomainVerifyModal = DomainVerifyModal;
})();
