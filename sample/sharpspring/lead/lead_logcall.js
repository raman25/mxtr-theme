/**
 * Call Logging Component
 *
 * In the future, we should encapsulate all call logging functionality here,
 * instead of spread out in lead_dashboard, pipeline.js, main.js, etc.
*/

var callLogger = function callLogger() {
    "use strict";
    /*global $, api, utils, app, t */
    var callback;

    (function init() {
        $('body').on('click', '#btn-LogCall', function saveCallLog() {
            var $el = $(this);
            var $modal = $el.closest('.modal');
            var callResult = $('#callResultSelect', $modal).attr('data-value');
            var direction = $('#directionSelect input:checked', $modal).val();
            var callNote = $('#callNote', $modal).val();
            var leadID = $('#leadID', $modal).val();
            var notes = window.notes || (app.leadDash && app.leadDash.notes);

            if (_.isEmpty(callResult)) {
                utils.showNotification({message: t('log_call_empty_result_error')});
                return;
            }

            if (_.isEmpty(direction)) {
                utils.showNotification({message: t('log_call_empty_direction_error')});
                return;
            }

            if (callResult === 'answered' && _.isEmpty(callNote)) {
                utils.showNotification({message: t('log_call_empty_note_error')});
                return;
            }

            api.setPhoneCall(leadID, direction, callResult, callNote, function setPhoneCallResp(resp) {
                if (resp.data && resp.data.success) {
                    $modal.modal('hide');
                    if (resp.data.note && notes) {
                        var note = resp.data.note;
                        if (!note.hasOwnProperty('displayName') && app.user && note.authorID === app.user.userProfileID) {
                            note.displayName = app.user.displayName;
                        }
                        notes[note.id] = note;

                        api.getLeadTimeline(leadID, {order: 'asc'}, function (resp) {
                            var timeline = _.valueAt(resp, 'data', 'timeline');

                            if (_.isFunction(callback)) {
                                callback(timeline, note);
                            }
                        }, function getLeadTimelineError(error) {
                            utils.showNotification({message: error});
                        });
                    } else {
                        utils.showNotification({message: t('log_call_success')});
                    }
                } else if (resp.errors) {
                    _.each(resp.errors, function setPhoneCallError(error) {
                        utils.showNotification({message: error});
                    });
                } else {
                    utils.showNotification({message: t('log_call_other_error')});
                }
            });
        });
    }());

    var setCallback = function(cb) {
        callback = cb;
    };

    return {
        setCallback: setCallback
    };
};
