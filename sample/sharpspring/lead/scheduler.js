var Scheduler = function() {

    // This is a COPY of usersettings.php constant
    const DISABLE_POPUP_REMINDERS = 256;
    var self = this;

    this.tasks = {};
    this.sortedTasks = [];
    this.taskOpps = {};
    this.taskLeads = {};
    this.users = {};
    this.user = {};
    this.reminders = {};
    this.$ = $;

    var sortByDueDate = _.sortOnProperty('dueDate', 'asc');

    var init = function() {
        self.users = _.getUsers();
        self.user = app.user;
        self.taskTileTemplate = _.template($('#taskTileTemplate').text());
        self.taskRowTpl = _.template($('#taskRowTpl').text());
        self.noteRowTpl = _.template($('#noteRowTpl').text());
        self.closeTaskTemplate = $('#closeTaskTemplate').text();
        self.setUserTaskModalTemplate = $('#setUserTaskModalTpl').text();
        self.deleteTaskModalTpl = $('#deleteTaskModalTpl').text();

        $('body').on('click', '.task-close-submit', self.closeTask);    

        self.getTasks = api.getUserTasksByUser(null, null, function(resp) {
            self.addTasks(_.valueAt(resp, 'data', 'tasks'));
            self.taskOpps = _.valueAt(resp, 'data', 'taskOpps');
            self.taskLeads = _.valueAt(resp, 'data', 'taskLeads');
            self.renderPullout();
        });

        _.sub('item.usertask.update', function(data) {
            var task = _.valueAt(data, 'task');
            if (task['ownerID'] != app.user.userProfileID) {
                return;
            }

            self.tasks[task.id] = task;
            self.sortedTasks = _.objToArray(self.tasks, sortByDueDate);
            self.renderPullout();
        });

        _.sub('item.usertask.create', function(data) {
            var task = _.valueAt(data, 'task');
            if (task['ownerID'] != app.user.userProfileID) {
                return;
            }

            self.tasks[task.id] = task;
            self.renderPullout();
        });

        _.sub('item.usertask.close', function(data) {
            var task = _.valueAt(data,'task');
            var taskID = task['id'];

            self.tasks[taskID]['isClosed'] = 1;
            self.sortedTasks = _.objToArray(self.tasks, sortByDueDate);
            self.renderPullout();
        });

        _.sub('item.usertask.delete', function(taskID) {
            delete self.tasks[taskID];
            self.sortedTasks = _.objToArray(self.tasks, sortByDueDate);
            self.renderPullout();
        });
    };


    this.addTasks = function(newTasks) {

        for (var i in newTasks) {
            if (newTasks.hasOwnProperty(i)) {
                self.tasks[newTasks[i]['id']] = newTasks[i];
            }
        }

        self.sortedTasks = _.objToArray(self.tasks, sortByDueDate);

    };

    var daySeconds = 86400000;
    this.renderPullout = _.debounce(function() {

        // Render to schedulerOverdue (-time), schedulerToday (), schedulerThisWeek, schedulerFuture
        var today = new Date();
        today.setHours(0);
        today.setMinutes(0);
        today.setSeconds(0);
        today.setMilliseconds(0);

        var now = new Date();
        var thisMorning = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var reminders = self.reminders;
        _.valuesAt(reminders, 'timer').forEach(clearTimeout);

        var taskTime, task;
        var todaysDay = today.getDay();
        var remainingDays = 7 - todaysDay;
        var sections = {overdue: false, today: false, weekly: false, future: false };

        for (var i in self.sortedTasks) {

            task = self.sortedTasks[i];
            taskTime = Date.parse(task['dueDate']);
            //local notifications
            (function(task) {
                if (typeof task !== 'object') {
                    return;
                }
                if (taskTime > now.getTime() + 604800000) {
                    // setTimeout doesn't play nice with very large numbers.
                    // Additionally, we don't need to set a client-side timer to pop up a notification a WEEK from now...
                    return;
                }
                var id = task.id;
                reminders[id] = (reminders[id] || {timer: false, shown: false});
                //if the user has not disablled reminders, it's not closed, not completed or the task date is after today minus seven days
                if (!(app.user.userSettings & DISABLE_POPUP_REMINDERS) && !task.isClosed && !task.completedDate && taskTime > now.getTime() - 604800000) {
                    var notify = _.debounce(function() {
                        if (reminders[id].shown) {
                            return;
                        }
                        reminders[id].shown = true;
                        app.otto.runIfTimeframeOk(app.state, {type:'userTaskReminder', result: task}, function(result) {
                            // notifications automatically disappear after 55 minutes
                            utils.showNotification({ message: app.otto.formatTaskReminder(result), lifetime: 3300000 });
                        });
                    }, 10);
                    if (taskTime.getTime() <= now.getTime()) {
                        reminders[id].timer = setTimeout(notify, 0);
                    } else {
                        reminders[id].timer = setTimeout(notify, taskTime.getTime() - now.getTime());
                    }
                }
            })(task);
            if (task.ownerID != app.user.userProfileID || task.isClosed) { continue; }
            if (taskTime) {
                if (now.getTime() > taskTime.getTime() && !(task.allDayTask && taskTime.getTime() == thisMorning.getTime())) {
                    sections.overdue = sections.overdue ? sections.overdue : '';
                    sections.overdue += self.taskTileTemplate({task: task, taskOpps: self.taskOpps, taskLeads: self.taskLeads});
                } else if ((taskTime.getTime() > today.getTime() && taskTime.getTime() < (today.getTime() + daySeconds)) || (task.allDayTask && taskTime.getTime() == thisMorning.getTime())) {
                    sections.today = sections.today ? sections.today : '';
                    sections.today += self.taskTileTemplate({task: task, taskOpps: self.taskOpps, taskLeads: self.taskLeads});
                } else if (taskTime.getTime() > (today.getTime() - (daySeconds * todaysDay)) && taskTime.getTime() < (today.getTime() + (daySeconds * remainingDays))) {
                    sections.weekly = sections.weekly ? sections.weekly : '';
                    sections.weekly += self.taskTileTemplate({task: task, taskOpps: self.taskOpps, taskLeads: self.taskLeads});
                } else {
                    sections.future = sections.future ? sections.future : '';
                    sections.future += self.taskTileTemplate({task: task, taskOpps: self.taskOpps, taskLeads: self.taskLeads});
                }
            }

        }


        // Now render each section of hide it
        if (sections.overdue) {
            $('#schedulerOverdue').html(sections.overdue);
        } else {
            $('#schedulerOverdue').html('');
        }

        if (sections.today) {
            $('#schedulerToday').html(sections.today);
        } else {
            $('#schedulerToday').html('');
        }

        if (sections.weekly) {
            $('#schedulerThisWeek').html(sections.weekly);
        } else {
            $('#schedulerThisWeek').html('');
        }

        if (sections.future) {
            $('#schedulerFuture').html(sections.future);
        } else {
            $('#schedulerFuture').html('');
        }

    }, 100);

    this.closeTaskModal = function(taskID) {
        if (!_.isFunction(self.closeTaskTemplate)) {
            self.closeTaskTemplate = _.template(self.closeTaskTemplate);
        }
        var modal = self.$(self.closeTaskTemplate({taskID: taskID, task: self.tasks[taskID], taskLeads: self.taskLeads, taskOpps: self.taskOpps}));
        utils.queueModal(modal);
    };

    this.closeTask = function(data) {
        $el = self.$(this);
        modal = $el.closest('.modal');
        var taskID = modal.attr('data-taskid');
        var note = $('.task-note', modal).val();
        var task = self.tasks[taskID];
        var logCall = $('.closeTaskLogCall', modal).is(':checked');
        var callResult = $('.callResult', modal).attr('data-value');
        var callDirection = $('.directionSelect input:checked', modal).val()
        var callLeadID = $('.calledLead', modal).val();

        if (logCall) {
            if (_.isEmpty(callResult)) {
                utils.showNotification({message: t('scheduler_closetask_call_musthaveresult')});
                return;
            }

            if (_.isEmpty(callDirection)) {
                utils.showNotification({message: t('scheduler_closetask_call_musthavedirection')});
                return;
            }

            if (callResult == 'answered' && _.isEmpty(note)) {
                utils.showNotification({message: t('scheduler_closetask_call_musthavenote')});
                return;
            }

            api.setPhoneCall(callLeadID, callDirection, callResult, note, function(resp) {
                if (resp.data && resp.data.success) {
                    utils.showNotification({message: t('scheduler_closetask_call_success')});
                } else if (resp.errors) {
                    for (error in resp.errors) {
                        utils.showNotification({message: resp.errors[error]});
                    }
                } else {
                    utils.showNotification({message: t('scheduler_closetask_call_error')});
                }
            });
        }

        // @TODO Make a combined call to close task and log call simultaneously
        api.setCloseUserTask(taskID, note, function(resp) {
            utils.showNotification({message : t('scheduler_closetask_success')});
            var task = self.tasks[taskID];
            task['isClosed'] = 1;
            $('.task-completed-checkbox[data-taskid=' + taskID + ']').closest('.task').replaceWith(
                $(self.taskTileTemplate({task: task, taskOpps: self.taskOpps, taskLeads: self.taskLeads}))
            );

            modal.modal('hide');
            _.pub('item.usertask.close', {task: task});

        }, function(resp) {
            utils.showNotification({message : t('scheduler_closetask_error')});
        });
    };

    this.newTaskModal = function(ownerID, whoType, whoID, whatType, whatID, options) {
        if (!_.isFunction(self.setUserTaskModalTemplate)) {
            self.setUserTaskModalTemplate = _.template(self.setUserTaskModalTemplate);
        }

        var options = options || {};
        var html = self.$(self.setUserTaskModalTemplate({users: self.users, task: {}, whatID: whatID, whatType: whatType, whoID: whoID, whoType: whoType, ownerID: ownerID, options: options}));
        self.$('.task-due-date', html).datepicker({ dateFormat: "yy-mm-dd" });
        utils.queueModal(html);
    };

    this.editTaskModal = function(taskID, ownerID, options) {
        if (!_.isFunction(self.setUserTaskModalTemplate)) {
            self.setUserTaskModalTemplate = _.template(self.setUserTaskModalTemplate);
        }

        var options = options || {};
        var task = self.tasks[taskID];
        var html = $(self.setUserTaskModalTemplate({users: self.users, task: task, whatID: task.whatID, whatType: task.whatType, whoID: task.whoID, whoType: task.whoType, ownerID: ownerID, options: options}));
        $('.task-due-date', html).datepicker({ dateFormat: "yy-mm-dd" });
        utils.queueModal(html);
    };

    this.setUserTask = function() {

        var $el = self.$(this);
        var modal = $el.closest('.modal');
        var whoID = parseInt($('.task-edit-form', modal).attr('data-whoid'));
        var whoType = $('.task-edit-form', modal).attr('data-whotype');
        var whatID = parseInt($('.task-edit-form', modal).attr('data-whatid'));
        var whatType = $('.task-edit-form', modal).attr('data-whattype');
        var allDayTask = !($('.task-specify-time', modal).is(':checked'));

        // if whatID is overridden via the form, attempt to grab from form element
        if ($('.opp-selection', modal).length) {
            whatID = $('.opp-selection', modal).attr('data-value');
            if (whatID) {
                whatType = 'opp';
            }
        }

        // if whoID is overridden via the form, attempt to grab from form element
        if ($('.lead-selection', modal).length) {
            whoID = $('.lead-selection', modal).attr('data-value');
            if (whoID) {
                whoType = 'lead';
            }
        }

        var taskID = parseInt($('.task-edit-form', modal).attr('data-taskid'), 10);
        if (taskID == '' || !taskID || taskID == 0) {
            taskID = null;
        }

        var taskType = $('.task-type', modal).attr('data-value');

        /* Datetime calculation */
        var taskDueDate = $('.task-due-date', modal).val();
        var taskDueHours = $('.task-due-hours', modal).val();
        var taskDueMinutes = $('.task-due-minutes', modal).val();
        var taskDueOffset = $('.task-due-offset', modal).val();
        var sendCalendarInvite = $('.task-sendCalendarInvite').is(':checked');

        var hour = (parseInt(taskDueHours) % 12) + parseInt(taskDueOffset);
        hour = hour < 10 ? "0" + hour : hour;
        var minute = parseInt(taskDueMinutes) < 10 ? "0" + taskDueMinutes : taskDueMinutes;
        var dueDateTime = taskDueDate + " " + hour + ":" + minute + ":00";

        var taskTitle = $('.task-title', modal).val();
        var ownerID = parseInt($('.task-owner', modal).attr('data-value'), 10);
        if (!ownerID) {
            ownerID = null;
        }

        if (_.empty(taskTitle)) {
            utils.showNotification({message : "Please select a Title for your task."});
            return;
        }
        if (_.empty(taskType)) {
            utils.showNotification({message : "Please select a Type for your task."});
            return;
        }

        /* create data object */
        var data = {}
        data['type'] = taskType;
        data['dueDate'] = dueDateTime;
        data['whatID'] = whatID;
        data['whatType'] = whatType;
        data['whoID'] = whoID;
        data['whoType'] = whoType;
        data['title'] = taskTitle;
        data['ownerID'] = ownerID;
        data['allDayTask'] = allDayTask;
        data['sendCalendarInvite'] = sendCalendarInvite;

        api.setUserTask(taskID, data, function(resp) {
            var task = resp['data']['task'];

            var oldTask = resp['data']['oldTask'];

            self.tasks[task['id']] = task;

            self.sortedTasks.push(task);
            self.sortedTasks.sort(_.sortOnProperty('dueDate'));

            if (task['whatID'] && task['whatType'] === 'opp') {
                self.taskOpps[task['whatID']] = _.valueAt(resp, 'data', 'opp');
            }

            if (task['whoID'] && task['whoType'] === 'lead') {
                self.taskLeads[task['whoID']] = _.valueAt(resp, 'data', 'lead');
            }

            utils.showNotification({message : "Task successfully scheduled."});
            if (taskID > 0) {
                _.pub('item.usertask.update', {task: task, opp: _.valueAt(resp, 'data', 'opp'), lead: _.valueAt(resp, 'data', 'lead') });
            } else {
                _.pub('item.usertask.create', {task: task, opp: _.valueAt(resp, 'data', 'opp'), lead: _.valueAt(resp, 'data', 'lead') });
            }

            if (oldTask) {
                _.pub('item.usertask.close', {task: oldTask});
            }
            modal.modal('hide');

        }, function(resp) {
            utils.showNotification({message : "A server error has occured."});
        });
    }


    /* Event handlers */
    $('body').on('click', '.scheduler-task-new', function() { self.newTaskModal(app.user.userProfileID, null, null, null, null, {}); } );
    $('body').on('click', '.scheduler-task-edit', function() { var taskID = $(this).attr('data-taskID'); self.editTaskModal(taskID, app.user.userProfileID, {leads: self.taskLeads, opps: self.taskOpps}); } );
    $('body').on('click', '.scheduler-task-create-submit', self.setUserTask);
    $('body').on('click', '.scheduler-task-edit-submit', self.setUserTask);
    $('body').on('click', '.scheduler-task-delete', function(ev) {
        var taskID = $(this).attr('data-taskID');
        task = self.tasks[taskID];
        
        if (!_.isFunction(self.deleteTaskModalTpl)) {
            self.deleteTaskModalTpl = _.template(self.deleteTaskModalTpl);
        }
        var modal = self.deleteTaskModalTpl({task: task});

        utils.queueModal($(modal));
    });

    $('body').on('click', '.btn-deleteTaskConfirm', function(ev) {
        var $el = $(this);
        var $modal = $el.closest('.modal');
        var taskID = $('.taskID', $modal).val();
        var confirm = $('.taskConfirmDelete', $modal).val();
        
        if (confirm && taskID) {
            api.deleteTask(taskID, confirm, function(resp) {
                if (resp.data && resp.data.success) {
                    _.pub('item.usertask.delete', taskID);
                } else {
                    utils.showNotification({message: 'There was an issue delete your task'});
                }
            });
        } else {
            utils.showNotification({message: 'There was an issue delete your task'});
        }
        $('.modal').modal('hide');
    });

    $('body').on('click', '.task-specify-time', function(ev) {
        if($(this).is(':checked') && $('.schedule-task-time').hasClass('hide')) {
            $('.schedule-task-time').removeClass('hide');
        } else {
            $('.schedule-task-time').addClass('hide');
        }
    });

    $('body').on('click', '.scheduler-task-complete', function(){
        self.closeTaskModal($(this).attr('data-taskid'));
    });

    $('body').on('change', '.closeTaskLogCall', function() {
        $('.task-close-form .call-option').toggleClass('hide', !$(this).is(':checked'));
    });

    init();
    return this;
};
