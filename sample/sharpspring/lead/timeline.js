var TimelineModule = function(timelineEvents, options) {

    var self = this;
    var timelineEvents = timelineEvents;
    var timelineFilters = {};
    var options = options || {};
    var lead = options.lead || window.lead;

    var point = null, distance = 0;
    var minDistance = 3.5;
    var minGroupDistance = 5.0;
    var percentPerItem = Math.floor(4000 / $('.main-page').width()); // 40px per item
    var maxDistance = lead['hasOpportunity'] ? Math.max(96.5, timelineEvents.length * percentPerItem) : 50;
    var pointGroup = '<div class="points" data-points="0"><span class="group_line"></span><span class="group_line2"></span></div>';
    var event, lastEventTime, eventTime;
    var group = null, groupPoints = 0, groupLine = false, newGroup = false;
    var $points = $('<div></div>');
    
    var pointTpl = _.template($('#timelinePoint').text());

    var renderEvents = _.debounce(function () {

        if (timelineEvents && timelineEvents.length) {

            if (_.last(timelineEvents).type != 'today') {
                timelineEvents.push({
                    type: 'today',
                    time: (new Date()).getTime() / 1000,
                    data: {metadata: {}}
                });
            }

            // Take out the garbage
            distance = 0;
            $('.timeline_event,.points', '#timeline_points').remove();

            var minTimeGap = 0;
            var maxTimeGap = 0;
            var lastTimeIndicator = 0;
            var leadDate = _.sqlDateToUTCDate(lead.createTimestamp);
            var numEvents = timelineEvents.length;
            var timeTillToday = (new Date()).getTime() - timelineEvents[timelineEvents.length - 1].time * 1000;
            var timeSpan = (numEvents > 1 ? (timelineEvents[numEvents - 1].time - timelineEvents[0].time) : 0) * 1000;

            var fullRange = timeSpan + ((lead['oppClosed']) ? 0 : Math.min(_.interval.week, timeTillToday + _.interval.day * 2));
            var filterKeys = _.keys(timelineFilters);
            var newGroup = false;

            // Calculate spacing of Events
            var timeGap;
            for (var i = 1; i < timelineEvents.length; i++) {

                timeGap = (timelineEvents[i].time - timelineEvents[i - 1].time) * 1000;
                if (!minTimeGap || timeGap < minTimeGap) {
                    minTimeGap = timeGap;
                }

                if (!maxTimeGap || timeGap > maxTimeGap) {
                    maxTimeGap = timeGap;
                }

            }

            // Draw Points for Events
            for (i = 0; i < numEvents; i++) {

                event = timelineEvents[i];
                eventTime = new Date(event.time * 1000);

                if (filterKeys.length && !timelineFilters[event['type']] && event.type != 'today') {
                    continue;
                }

                if (i > 0) {

                    newGroup = (eventTime.getMonth() != lastEventTime.getMonth() || eventTime.getDate() != lastEventTime.getDate());
                    distance = Math.max(((event.time - timelineEvents[0].time) * 1000 / fullRange) * maxDistance, distance + (newGroup ? minGroupDistance : minDistance));

                    if (newGroup) {
                        group = $(pointGroup);
                        $('#timeline_points').append(group);
                        group.css({left: distance + '%'}).attr('data-start', distance);
                    }

                } else {
                    group = $(pointGroup).attr('data-start', distance).css({left: distance + '%'});
                    $('#timeline_points').prepend(group);
                }

                if (eventTime.getDayOfYear() == leadDate.getDayOfYear() && eventTime.getFullYear() == leadDate.getFullYear()) {
                    $('.unknownLine').css({width: distance + '%'});
                }

                point = $(pointTpl({event: event}));
                point.css({'left': (distance + '%')});

                // Show the first point, not the second and at least numEvents % apart (10% represents an event)
                if (i == 0 || (newGroup && (distance - lastTimeIndicator) > numEvents && i > 2)) {
                    point.find('.timeline_date').show(); // always show some initial dates
                    lastTimeIndicator = distance;
                }

                $points.append(point);
                $points.width(distance + 1 + '%');

                groupPoints = parseInt(group.attr('data-points'));
                group.attr('data-points', ++groupPoints);
                group.toggleClass('group', groupPoints > 1).css({width: Math.max(1, distance - parseInt(group.attr('data-start'))) + '%'});

                lastEventTime = eventTime;
            }

            $('#timeline_points').append($points); // add at the end
            $('.leadLine').css({width: (distance + 2) + '%'});

            if (distance > 100) {
                // need to add a scrollbar
                // if the width isn't set, the scrollbar will never show up.
                if ($('#timelineScrollable').width()) {
                    $('#timelineScrollable').tinyscrollbar({axis: 'x'});
                }

                $("#lolTab").click(function () {
                    // Check if the scrollbar was already added to the element.
                    if (!$('#timelineScrollable').data('tsb')) {
                        // We don't have a scrollbar. Add one after the elements get some width to them.
                        _.delay(function () {
                            $('#timelineScrollable').tinyscrollbar({axis: 'x'});
                        }, 250);
                    }
                });

                window.addEventListener('resize', function () {
                    $('#timelineScrollable').tinyscrollbar_update('bottom');
                });
            } else {
                $('.timeline_window .overview').css({left: 0, width: 'auto'});
                $('#timelineScrollable .scrollbar').hide();
            }

        }
    }, 250);


    // ----------------- EVENTS -----------------

    $('#timeline_points').on('click', '.timeline_event', function(ev) {

        var point = $(ev.target).closest('.timeline_event');
        var id = point.attr('data-eventid');

        if (id) {

            point.addClass('active').siblings().removeClass('active');

            // TODO: Change to a scrollTo
            $('#event-' + id).siblings('.timeline_event_info:visible').css('position', 'absolute').fadeOut();
            $('#event-' + id).fadeIn();
            $('.timeline_info').height(Math.max(200, $('#event-' + id).height()));
        }

    });

    $('.toggle-typeFilter').on('click', function(ev) {

        var $el = $(this);
        var value = $el.attr('data-timeline-event');
        var add = false;

        if (value.length) {

            var values = value.split(',');

            if ($el.hasClass('link-active')) {
                $el.removeClass('link-active');
            } else {
                add = true;
                $el.addClass('link-active');
                $('.toggle-all-events').removeClass('link-active');
            }

            for (var v in values) {

                if (add) {
                    timelineFilters[values[v]] = 1;
                } else {
                    delete timelineFilters[values[v]];
                }

            }

        } else {
            $('.toggle-typeFilter').removeClass('link-active');
            $el.addClass('link-active');
            timelineFilters = {};
        }

        renderEvents();

    });

    var init = function() {
        renderEvents();
        return self;
    };

    return init();

};