var EmailModule = function(options) {

    var self = this;

    var sendEmailToList = function() {
        var email = {
            id: self.emailID
        };
        var options = {
            sendDuplicate: self.sendDuplicate
        };
        var recipient;
        if (self.listID) {
            recipient = {
                id: self.listID,
                type: 'list'
            };
        } else if (self.tagID) {
            recipient = {
                id: self.tagID,
                type: 'listTag'
            };
        }

        api.scheduleEmailJob(recipient, email, self.time, options, function(resp) {

            if (resp && resp.data && resp.data.success) {
                message = 'Successfully scheduled email, "' + data.email.title + '" for list/tag "' + data.sendName + '".';
                utils.dismissModal();
                utils.showNotification({message: message});
            } else if (resp.errors) {
                self.element.removeAttr('disabled');
                utils.showApiErrors(resp);
            } else {
                utils.showNotification({message: 'There was an error sending your email.'});
                self.element.removeAttr('disabled');
            }
        });
    };
    
    var emailConfirmModal;
    var showEmailConfirmation = function(listID, tagID, emailID, sendDuplicate, time) {
        self.listID = listID;
        self.tagID = tagID;
        self.emailID = emailID;
        self.sendDuplicate = sendDuplicate;
        self.time = time;

        api.getEmailAccountStatus(listID, tagID, emailID, time, function(resp) {
            if (resp.data && resp.data.success) {
                if (!emailConfirmModal) {
                    emailConfirmModal = _.template($('#emailConfirmModalTpl').text());
                }
                data = resp.data;
                var modal = emailConfirmModal(data);
                utils.dismissModal();
                utils.dismissPageModal();
                utils.queueModal(modal);
            }
        });
    };

    self.showEmailConfirmation = showEmailConfirmation;

    var init = function() {

        $('body').on('click', '.email-send-confirm-btn', _.debounce(function() {
            self.element = $(this);
            $modal = self.element.closest('.modal');

            var readOversize = $('.confirm-read-oversize', $modal).is(':checked');
            var readAtRisk = $('.confirm-read-at-risk', $modal).is(':checked');
            var confirmReadSendFromOwner = $('.confirm-read-send-from-owner', $modal).is(':checked');

            if (!readOversize || !readAtRisk || !confirmReadSendFromOwner) {
                utils.showNotification({message: 'You must confirm that you have read all notices in order to proceed.'});
                return false;
            }
            self.element.attr('disabled', 'disabled');

            sendEmailToList(self.listID, self.tagID, self.emailID, self.sendDuplicate, self.time);
        }, 2000, true));
        $('body').on('click', '.toggle-email-status-table', _.debounce(function() {
            $('.toggle-email-status-table span,.email-status-table').toggleClass('hide'); //toggle which one is shown
        }, 100, true));

        return self;
    };

    return init();

}
