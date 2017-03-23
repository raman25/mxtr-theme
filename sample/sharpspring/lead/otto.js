var Otto = function() {
    var self = this;

    this.formatTaskReminder = function(data) {

        // pretty date takes datetimes in milliseconds
        var dueDate = parseInt(data.epochDate) * 1000;
        var now = new Date();
        var isFuture = dueDate < now.getTime() * 1000;
        var lateness = isFuture ? 'due.' : 'overdue.';
        var message = [data.title, (isFuture ? ', which is scheduled for ' : ', which was scheduled '), _.prettyDate(dueDate, null, ' ago', ' from now', true), ", is " + lateness];

        if (data.whatType == 'opp') {
            message.push(' <a href="/pipeline/sales/#opp/' + data.whatID + '">More Info</a>');
        } else if (data.whoType == 'lead') {
            message.push(' <a href="' + _.leadURL(data.whoID) + '">More Info</a>');
        }

        return message.join('');

    };

    this.formatBulkTaskReminder = function(data) {
        var numUnreadTasks = data.numUnreadTasks;
        var message = "You have " + numUnreadTasks + " past due tasks. ";

        message += "<a id='openTaskBarNotificationLink'>More Info.</a>";

        return message;
    };

    this.formatExportReminder = function(data) {
        return 'The file <a href="/export/manager">' + data.label + '</a> has finished processing.';
    };

    this.formatExportCancel = function(data) {
        var msg = t('otto_error_exportcancel', {label: data.label});
        switch (data.reason) {
            case 'sizeLimit':
                msg += ' ' + t('otto_error_exportcancel_limit');
                break;

            case 'emptyPayload':
                msg += ' ' + t('otto_error_exportcancel_nodata');
                break;
        }

        return msg;
    };

    this.formatListReminder = function(data) {
        return 'The list, <a href="/automationlist/members/' + data.listID + '">' + data.listName + "</a>, has finished building successfully.";
    };

    this.formatImportReminder = function(data) {
        return 'The import, <a href="/automationlist/members/' + data.listID + '">' + data.listName + "</a>, has been processed successfully.";
    };

    this.formatEmailPreviewReminder = function(data) {
        return 'The email render test for <a href="/email/edit/' + data.emailID + '">' + data.title + "</a> has completed successfully.";
    };

    this.formatMailboxEmailOpen = function(data) {
        var leadName = data.lead.firstName + ' ' + data.lead.lastName;
        return 'Your lead "' + leadName + '" has opened an email with the subject ' + data.subject + '.';
    };

    this.formatMediaOpen = function(data) {
        var leadName = data.lead.firstName + ' ' + data.lead.lastName,
            mediaTitle = data.media.title;
        return 'Your lead "' + leadName + '" has viewed the media ' + mediaTitle + '.';
    };

    this.formatClientCreated = function(data) {
        return t('otto_notif_newclientready', {name: data.name});
    };

    this.formatEmailUploadComplete = function(data) {
        return t('otto_emailupload_complete_' + data.type, {title: data.title, url: data.url});
    };

    this.formatEmailUploadFailed = function(data) {
        return t('otto_emailupload_failed_' + data.type, {title: data.title, url: data.url});
    };

    this.formatListSampleFailed = function (data) {
        return '<a href="/email/job/' + data.jobID + '" target="_blank">' + t('otto_listsample_failed', {emailTitle: data.emailTitle, listName: data.listName}) + '</a>';
    };

    this.formatBulkOperationComplete = function (data) {
        // mapped to constants in bulkedit_model.php (5 is field edits, and is temporarily omitted)
        // 8 is list duplication, which is handled individually below
        var operationKeys = {
            0: 'generic',
            1: 'link',
            2: 'link',
            3: 'link',
            4: 'link',
            6: 'email',
            7: 'generic',
            9: 'generic'
        };

        var url = _.valueAt(data, 'objectLink') ? data.objectLink + data.objectID : '';

        return t('otto_bulkoperation_complete_' + operationKeys[data.editType], {
            operation: data.objectOperation,
            name: data.objectName,
            editType: data.objectType,
            count: data.editCount,
            url: url
        });
    };

    this.formatListDuplicationComplete = function (data) {
        return t('otto_listduplication_complete', {
            listID: data.listID,
            name: data.listName,
            oldListName: data.oldListName,
            oldListID: data.oldListID,
            url: data.url
        });
    };

    this.runIfTimeframeOk = function(appState, data, callback) {
        if (appState) {
            now = new Date();
            epochTS = Math.floor(now.getTime() / 1000);
            appState.notifications = appState.notifications || {};
            appState.notifications[data.type] = appState.notifications[data.type] || {};
            seen = appState.notifications[data.type];
            // this is useful for seeing when stuff should fire
            seenTmp = {};
            hasChanges = false;

            // garbage collect any expired tasks
            for (var taskID in seen) {
                if (seen[taskID] < epochTS) {
                    hasChanges = true;
                    delete seen[taskID];
                } else {
                    seenTmp[taskID] = seen[taskID];
                }
            }

            seen = seenTmp;
            result = data.result;

            if (!seen[result.id]) {
                hasChanges = true;
                // clear the key for a given task after 60 minutes
                // to allow the notification to show up once per hour
                // until it has been dismissed
                seen[result.id] = epochTS + (60 * 60);
            }

            if (hasChanges) {
                // rewrite app state to keep a persistent record
                appState.notifications[data.type] = seen;
                callback(result);
                api.setAppState('application', appState);
                hasChanges = false;
            }
        }
    };

    this.dispatch = function(data) {
        switch (data.type) {
            case 'connectionError':
                //utils.showNotification( { message: t('otto_error_socketconnection'), lifetime: 60000 });
                break;
            case 'userTaskReminder':
                self.runIfTimeframeOk(app.state, data, function(result) {
                    // notifications automatically disappear after 55 minutes
                    utils.showNotification({ message: self.formatTaskReminder(result), lifetime: 3300000 });
                });
                break;
            case 'incomingCall':
                _.pub('item.callevent.create', data);
                break;
            case 'updatedCall':
                _.pub('item.callevent.update', data);
                break;
            case 'completedCall':
                _.pub('item.callevent.update', data);
                break;
            case 'callRepStatusUpdate':
                _.pub('item.callrepstatus.update', data);
                break;
            case 'callRepActivityUpdate':
                _.pub('item.callrepactivity.update', data);
                break;
            case 'listComplete':
                // make sure that data.list exists
                utils.showNotification( { message: self.formatListReminder(data), lifetime: 60000 });
                _.pub('item.list.complete', data);
                break;
            case 'importComplete':
                utils.showNotification( { message: self.formatImportReminder(data), lifetime: 60000 });
                _.pub('item.import.complete', data);
                break;
            case 'exportComplete':
                utils.showNotification( { message: self.formatExportReminder(data), lifetime: 60000 });
                _.pub('item.export.complete', data);
                break;
            case 'exportCanceled':
                utils.showNotification( { message: self.formatExportCancel(data), lifetime: 60000 });
                _.pub('item.export.canceled', data);
                break;
            case 'emailPreviewComplete':
                utils.showNotification( {message: self.formatEmailPreviewReminder(data), lifetime: 60000 });
                _.pub('item.emaildesign.complete', data);
                break;
            case 'emailReportComplete':
                _.pub('item.emailreport.complete', data);
                break;
            case 'mailboxEmailOpen':
                utils.showNotification({
                    message: self.formatMailboxEmailOpen(data),
                    lifetime: 60000
                });
                break;
            case 'mediaOpen':
                if (!data.media || !data.lead) {
                    return;
                }
                utils.showNotification({
                    message: self.formatMediaOpen(data),
                    lifetime: 60000 * 5
                });
                break;
            case 'userTaskBulkReminder':
                console.log(data);
                self.runIfTimeframeOk(app.state, data, function(result) {
                    utils.showNotification( {message: self.formatBulkTaskReminder(data), lifetime: 60000 });
                });
                break;

            // for the progress meters on list builder
            case 'listBuildStatus':
                _.pub('item.list.progress', data);
                break;

            // for the current viewers on email edit pages
            case 'emailPing':
                _.pub('item.email.viewers', data);
                break;

            case 'newClientCreated':
                utils.showNotification({
                    message: self.formatClientCreated(data),
                    lifetime: 60000
                });
                break;

            case 'emailUploadComplete':
                utils.showNotification({message: self.formatEmailUploadComplete(data), lifetime: 60000 });
                _.pub('item.emailupload.complete', data);
                break;

            case 'emailUploadFailed':
                utils.showNotification({message: self.formatEmailUploadFailed(data), lifetime: 60000 });
                _.pub('item.emailupload.failed', data);
                break;

            case 'bulkOperationComplete':
                utils.showNotification({ message: self.formatBulkOperationComplete(data), lifetime: 60000 });
                _.pub('item.bulkoperation.complete', data);
                break;

            case 'listDuplicationComplete':
                utils.showNotification({ message: self.formatListDuplicationComplete(data), lifetime: 60000 });
                break;

            case 'listSampleFailed':
                utils.showNotification({message: self.formatListSampleFailed(data), lifetime: 6000});
                break;
        }
    };
};
