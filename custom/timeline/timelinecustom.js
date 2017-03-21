// Timeline functions
var timeline;
var timeline_control = new Object();
var eventToItemMapping = {};
var lastEventId = 1;
var prevSelectedDotDiv = null;
/**
 * Zoom
 * @param zoomVal
 */
timeline_control.zoom = function (zoomVal) {
    timeline.zoom(zoomVal);
    timeline.trigger("rangechange");
    timeline.trigger("rangechanged");
}

/**
 * Adjust the visible time range such that all events are visible.
 */
function adjustVisibleTimeRangeToAccommodateAllEvents() {
    timeline.setVisibleChartRangeAuto();
}

/**
 * Move
 * @param moveVal
 */
timeline_control.move = function (moveVal) {
    timeline.move(moveVal);
    timeline.trigger("rangechange");
    timeline.trigger("rangechanged");
}

/**
 * Move the visible range such that the current time is located in the center of the timeline.
 */
function moveToCurrentTime() {
    timeline.setVisibleChartRangeNow();
}
function bindEventHoverEvent() {
    $('.event').on("mouseenter", function (event) {
        $('.timeline-event-dot').removeClass("hovered");
        var id = $(this).attr('id').replace(/[^\d]+/img, '');
        console.log(event, ' - ', id);
        eventToItemMapping[id].forEach(function (el) {
            $(el).addClass('hovered');
        });
    });

    $('.event').on("mouseleave", function (event) {
        var id = $(this).attr('id').replace(/[^\d]+/img, '');
        eventToItemMapping[id].forEach(function (el) {
            $(el).removeClass('hovered');
        });
    });
}

function mouseoverItemEventCallback(eventId) {
    $('.event').removeClass("highlighted");
    $('#event_id_' + eventId).addClass("highlighted");
}

function clickItemEventCallback(eventId, dotDiv) {
    $('.timeline-event-dot').removeClass("selected");
    if ($(prevSelectedDotDiv)) {
        $(prevSelectedDotDiv).removeClass("selected");
    }
    $(dotDiv).addClass("selected");
    prevSelectedDotDiv = dotDiv;
    $('.events').scrollTo('#event_id_' + eventId, {duration: 'slow'});
}

function itemToEventMapCallback(eventId, dotDiv, eventIds) {
    eventIds.push(eventId);
    eventIds.forEach(function (evtId) {

        if (eventToItemMapping.hasOwnProperty(evtId)) {
            eventToItemMapping[evtId].push(dotDiv);
        } else {
            eventToItemMapping[evtId] = [dotDiv];
        }

    });
    console.log("eventToItemMapping : ", eventToItemMapping);
}
function itemArialLabelCallback(divDot, className, eventDate, content) {
    //var weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    //monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var eventType = (className == 'green') ? "Ok" :
        (
            (className == 'green-m') ? "Maintenance" :
                (
                    (className == 'yellow') ? "Warning" : "Error"
                )
        );
    eventType = className;
    //var formattedDate = monthNames[eventDate.getMonth()] + " " + eventDate.getDate() + " " + eventDate.getFullYear();
    var dd = eventDate.getDate();
    var mm = eventDate.getMonth() + 1;
    var yyyy = eventDate.getFullYear();
    if (dd < 10) {
        dd = '0' + dd
    }
    if (mm < 10) {
        mm = '0' + mm
    }
    var formattedDate = dd + '/' + mm + '/' + yyyy;
    divDot.setAttribute("aria-label", "Event type " + eventType + " on " + formattedDate);
}
function init_timeline() {
    if ($('#mytimeline').length) {
        var data = {
            "_id": {
                "$oid": "571fb7f854230d1ea4a832d8"
            },
            "AccountObjectID": "568f15065423102b700de781",
            "MxtrAccountID": "e66f3539-be77-405f-9a65-bc59922fc7fd",
            "CRMKind": "Sharpspring",
            "CreateDate": "2017-02-07T04:00:00.000+0000",
            "LastUpdatedDate": "2017-02-07T04:00:00.000+0000",
            "LeadID": "59869836290",
            "AccountID": "0",
            "OwnerID": "7203",
            "CampaignID": "0",
            "LeadStatus": "qualified",
            "LeadScore": 31,
            "IsActive": true,
            "FirstName": "Cole",
            "LastName": "Balderson",
            "EmailAddress": "colebalderson@ourismanva.com",
            "CompanyName": "Ourisman Automotive of Virginia",
            "Title": null,
            "Street": null,
            "City": null,
            "Country": null,
            "State": null,
            "ZipCode": null,
            "Website": "ourismanva.com",
            "PhoneNumber": "7034992512",
            "MobilePhoneNumber": null,
            "FaxNumber": null,
            "Description": null,
            "Industry": null,
            "IsUnsubscribed": false,
            "Events": [
                {
                    "EventID": "221209145346",
                    "LeadID": "59869836290",
                    "EventName": "Filled out the form Get Started ",
                    "WhatID": "1a15ed25-b327-46d2-b9fa-a50fa89841a6",
                    "WhatType": "form",
                    "EventData": [],
                    "CreateTimestamp": "2017-03-20T17:07:03.000+0000"
                },
                {
                    "EventID": "221209144322",
                    "LeadID": "59869836290",
                    "EventName": "User visited page.",
                    "WhatID": "mxtrautomation.com",
                    "WhatType": "pageVisit",
                    "EventData": [
                        {
                            "Name": "referrer",
                            "Value": ""
                        }
                    ],
                    "CreateTimestamp": "2017-02-07T17:07:03.000+0000"
                },
                {
                    "EventID": "221209146370",
                    "LeadID": "59869836290",
                    "EventName": "User visited page.",
                    "WhatID": "mxtrautomation.com",
                    "WhatType": "pageVisit",
                    "EventData": [
                        {
                            "Name": "referrer",
                            "Value": ""
                        }
                    ],
                    "CreateTimestamp": "2017-02-07T17:07:03.000+0000"
                },
                {
                    "EventID": "221209151490",
                    "LeadID": "59869836290",
                    "EventName": "User visited page.",
                    "WhatID": "mxtrautomation.com/index.html",
                    "WhatType": "pageVisit",
                    "EventData": [
                        {
                            "Name": "referrer",
                            "Value": "mxtrautomation.com"
                        }
                    ],
                    "CreateTimestamp": "2017-02-07T17:07:04.000+0000"
                },
                {
                    "EventID": "336907233282",
                    "LeadID": "59869836290",
                    "EventName": "Lead was sent an email.",
                    "WhatID": "28208",
                    "WhatType": "email",
                    "EventData": [
                        {
                            "Name": "isDelivered",
                            "Value": "1"
                        },
                        {
                            "Name": "isOpened",
                            "Value": "1"
                        }
                    ],
                    "CreateTimestamp": "2017-02-07T17:08:02.000+0000"
                },
                {
                    "EventID": "48414356482",
                    "LeadID": "59869836290",
                    "EventName": "Lead opened an email.",
                    "WhatID": "28208",
                    "WhatType": "email",
                    "EventData": [],
                    "CreateTimestamp": "2017-02-07T17:13:36.000+0000"
                },
                {
                    "EventID": "221467911170",
                    "LeadID": "59869836290",
                    "EventName": "User visited page.",
                    "WhatID": "mxtrautomation.com",
                    "WhatType": "pageVisit",
                    "EventData": [
                        {
                            "Name": "referrer",
                            "Value": "mxtrautomation.com/booking.html"
                        }
                    ],
                    "CreateTimestamp": "2017-02-07T20:29:13.000+0000"
                },
                {
                    "EventID": "221467922434",
                    "LeadID": "59869836290",
                    "EventName": "User visited page.",
                    "WhatID": "mxtrautomation.com",
                    "WhatType": "pageVisit",
                    "EventData": [
                        {
                            "Name": "referrer",
                            "Value": "mxtrautomation.com/booking.html"
                        }
                    ],
                    "CreateTimestamp": "2017-02-07T20:29:17.000+0000"
                }
            ]
        };
        var Events = data.Events;

        var timelinedata = [];
        var htmlcontent = "";
        $.each(Events, function (index, event) {
            var eventDate = new Date(event.CreateTimestamp);
            var dd = eventDate.getDate();
            var mm = eventDate.getMonth() + 1;
            var yyyy = eventDate.getFullYear();
            var formattedDate = moment(event.CreateTimestamp).toNow();
            timelinedata[index] = {
                'start': eventDate,
                'content': event.EventName,
                'className': event.WhatType,
                'event_id': event.EventID
            }
            console.log(timelinedata[index]);
            htmlcontent += '<a href="javascript:void(0)">  <div class="mail_list event"  id="event_id_' + event.EventID + '" >    <div class="left">    <div class="' + event.WhatType + '1 label label-primary pull-left">' + (index + 1) + '.</div>    </div>    <div class="right">    <h3>' + event.EventName + ' <small>' + formattedDate + '</small></h3><p>Ut enim ad minim veniam, quis nostrud exercitation enim ad minim veniam, quis nostrud exercitation...</p> </div> </div></a>';
            //'<div id="event_id_' + event.EventID + '" class="event"><h2><a href="#">' + event.EventName + '</a></h2><p>Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Phasellus hendrerit. Pellentesque aliquet nibh nec urna. In nisi neque, aliquet vel, dapibus id, mattis vel, nisi. Sed pretium, ligula sollicitudin laoreet viverra, tortor libero sodales leo, eget blandit nunc tortor eu nibh. Nullam mollis. Ut justo. Suspendisse potenti.</p></div>';
        });
        document.getElementById('eventcontainer').innerHTML = htmlcontent;
        // specify options
        var options = {
            'width': '100%',
            'height': '125px',
            'start': moment().subtract(30, 'days').calendar(),
            'end': new Date(),
            'cluster': true,
            'clusterMaxItems': 1
        };
        // Instantiate our timeline object.
        timeline = new links.Timeline(document.getElementById('mytimeline'), options);

        // Draw our timeline with the created data and options
        timeline.draw(timelinedata);
        bindEventHoverEvent();
        $(window).resize(function () {
            timeline.redraw();
        });
    }
}

