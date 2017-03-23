(function($){

    var invalidStrings = new RegExp('/(unknown|asdf|(.)\2{3,})/');

    $.extend(_, {

        autocompleteIgnoreKeys: [
            13,     // Enter
            9,      // Tab
            16,     // Shift
            37,     // Left
            38,     // Up
            39,     // Right
            40,     // Down
            20,     // Caps Lock
            144     // Num Lock
        ],

        empty: function(obj) {

            var isEmpty = false;
            if (_.isString(obj)) {
                isEmpty = !obj.length;
            } else if (_.isObject(obj)) {
                isEmpty = _.objIsEmpty(obj);
            } else {
                isEmpty = !obj;
            }

            return isEmpty;
        },

        objIsEmpty: function(obj) {

            for (var i in obj) {
                if (obj.hasOwnProperty(i)) {
                    return false;
                }
            }

            return true;

        },

        // Items is an array / keys of integer values, assumes there is a max size to all the values
        chunkByWeight: function(items, segments) {

            var keys = _.keys(items);
            var chunks = new Array(segments);
            var chunkSize = new Array(segments);
            var cursor = 0;
            var min, max, pick, index, i;
            var limit = keys.length;
            var count = 0;

            for (i = 0; i < segments; i++) {
                chunkSize[i] = 0;
                chunks[i] = [];
            }

            while (keys.length) {

                pick = _.toArray(_.pick(items, keys));
                max = _.max(pick);
                index = _.indexOf(pick, max);

                min = _.min(chunkSize);
                cursor = _.indexOf(chunkSize, min);

                chunks[cursor].push(keys[index]);
                chunkSize[cursor] += max;

                keys.splice(index, 1);

                if (count++ > limit) { break; }

            }

            // TODO: Decide whether to reorder the chunks based on final size
            return chunks;

        },

        // Let's you know if the string is not just fluff to display, test strings such as asdf, unknown, etc..
        validString: function(str) {

            return !_.empty(str) && !invalidStrings.test(str);

        },

        // Because isDate doesn't tell you if it's a garbage date
        isValidDate: function validDate(date) {
            return _.isDate(date) && _.isFinite(date.getTime());
        },

        /**
         * The best way to escape HTML in Javascript
         *
         * @see http://shebang.brandonmintern.com/foolproof-html-escaping-in-javascript/
         */
        escapeHTML: function(text) {
            var div = document.createElement('div');
            div.appendChild(document.createTextNode(text));
            return div.innerHTML;
        },

        // For formatting strings for popover titles and such
        htmlAttrString: function(text) {
            if (!_.isString(text) || !text.length) {
                return '';
            }
            return text.replace(/\r?\n/g, '<br />').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        },

        // Good for escaping text inputs
        addslashes: function( str ) {
            return (str + '').replace(/[\\"]/g, '\\$&').replace(/\u0000/g, '\\0');
        },

        // Formats a number with grouped thousands
        number_format: function (number, decimals, dec_point, thousands_sep) {

            number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
            var n = !isFinite(+number) ? 0 : +number,
                prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
                sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
                dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
                s = '',
                toFixedFix = function (n, prec) {
                    var k = Math.pow(10, prec);
                    return '' + Math.round(n * k) / k;
                };
            // Fix for IE parseFloat(0.55).toFixed(0) = 0;
            s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
            if (s[0].length > 3) {
                s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
            }
            if ((s[1] || '').length < prec) {
                s[1] = s[1] || '';
                s[1] += new Array(prec - s[1].length + 1).join('0');
            }
            return s.join(dec);
        },

        number_abbr: function(n, uppercase) {

            var divisor = 1;
            var suffix = '';
            var shorthand = n;
            var uppercase = uppercase ? 1 : 0;

            if (n < 1000) {
                divisor = 1;
            } else if (n < 1000*1000) { // k
                divisor = 1000;
                suffix = 'k';
            } else if (n < 1000*1000*1000) { // m
                divisor = 1000*1000;
                suffix = 'm';
            } else { // t
                divisor = 1000*1000*1000;
                suffix = 't';
            }

            shorthand = shorthand / divisor;
            shorthand = _.number_format(shorthand, (shorthand > divisor && shorthand % 1) ? 1 : 0);
            shorthand += uppercase ? suffix.toUpperCase() : suffix;

            return shorthand;
        },

        urlToFragment: function(url, domain) {

            var page = url;
            var urlMatch = new RegExp('([http|https]://)?(.*\.)?(' + domain + ')(.*)', 'i');

            var matches = urlMatch.exec(url);

            if (matches && matches.length) {
                page = matches.pop();
            }

            return page;
        },

        highlight: function(string, start, length) {

            var str = string;

            if (start >= 0 ) {

                var beg, mid, end;
                beg = string.substr(0, start);
                mid = string.substr(start, length);
                end = string.substr(start + length, string.length - (start + length));

                str = [beg, '<span class="highlight">', mid, '</span>', end].join('');
            }

            return str;
        },

        getUsers: function(type) {
            if (type === 'all') {
                return app.users;
            } else if (type === 'agency') {
                return _.pick(app.users, app.agencyUsers);
            }
            return _.pick(app.users, app.companyUsers);
        },

        roles: { 'ADMIN': 1, 'COMPANY_MANAGER': 2, 'COMPANY_MARKETING': 4, 'COMPANY_SALES': 8, 'COMPANY_CALL_CENTER': 16, 'CALL_CENTER_MGR': 32, 'SALESPERSON': 64, 'CALL_CENTER_REP': 128, 'JRSALESPERSON': 256 },

        roleInfo : {
            1 : {'key' : 'administrator', icon: 'icon-key'},
            2 : {'key' : 'company_manager', icon: 'icon-briefcase'},
            4 : {'key' : 'company_marketing_manager', icon: 'icon-megaphone'},
            8 : {'key' : 'company_sales_manager', icon: 'icon-line-chart'},
            6 : {'key' : 'company_marketing_manager', icon: 'icon-megaphone'},
            10 : {'key' : 'company_sales_manager', icon: 'icon-line-chart'},
            14 : {'key' : 'company_manager', icon: 'icon-briefcase'}, // Sales and Marketing Checked
            //16 : {'key' : 'call_center'},
            //32 : {'key' : 'call_center_manager'},
            64 : {'key' : 'salesperson', icon: 'icon-line-chart'},
            //128 : {'key' : 'call_center_rep'},
            256 : {'key' : 'jr_salesperson', icon: 'icon-line-chart'}
        },

        hasRole: function(role, flags) {
            return role & flags;
        },

        isFavorite: function(favoriteType, favoriteID, returnOnTrue) {
            var returnOnTrue = returnOnTrue || 'favorite';
            return _.valueAt(app.user.favorites, favoriteType, favoriteID) ? returnOnTrue : false;
        },

        offerings: { 'PRO': 1, 'ESP': 2, 'SUP': 4, 'CRM': 8, 'VID': 16, 'BETA': 32 },

        hasOffering: function(offering, flags) {
            flags = flags || app.company.productOffering;
            return offering & flags;
        },

        hasRecentFavorites: function(favoriteType, lastSeen) {

            var faves = _.objToArray(app.user.favorites[favoriteType]);
            var count = 0;

            for (var i = 0; i < faves.length; i++) {
                if (!lastSeen || lastSeen < faves[i]) {
                    count++;
                }
            }

            return count;
        },

        hasFeature: function() {

            var features = app.getFeatures();
            for (var i = 0; i < arguments.length; i++) {
                if (!features.hasOwnProperty(arguments[i])) {
                    return false;
                }
            }

            return true;
        },

        leadURL: function(id) {
            return (_.hasFeature('leads') ? '/lead/' : '/contact/') + id;
        },

        getFeatureSettings: function(feature) {
            var settings = app.getFeatureSettings();
            if (this.hasFeature(feature) && settings.hasOwnProperty(feature)) {
                return settings[feature];
            }
            return null;
        },

        mediaTypes : [
            { name: 'FILE', icon: 'icon-file-alt' },
            { name: 'LINK', icon: 'icon-globe' },
            { name: 'YOUTUBE', icon: 'icon-youtube' },
            { name: 'VIMEO', icon: 'icon-vimeo' },
            { name: 'FACEBOOK', icon: 'icon-facebook' },
            { name: 'GOOGLE_DOCS', icon: 'icon-google-drive' }
        ],

        mimeTypes : [
            { name: 'OTHER', icon: 'icon-file-text' },
            { name: 'MIME_TYPE_PDF', icon: 'icon-file-pdf' },
            { name: 'MIME_TYPE_XLS', icon: 'icon-file-excel' },
            { name: 'MIME_TYPE_PPT', icon: 'icon-file-powerpoint' },
            { name: 'MIME_TYPE_HTML', icon: 'icon-file-xml' },
            { name: 'MIME_TYPE_CSV', icon: 'icon-file-text' },
            { name: 'MIME_TYPE_RTF', icon: 'icon-file-word' }
        ],

        interval: {'day': (24 * 3600 * 1000), 'week': (24 * 3600 * 1000 * 7), 'month': (30 * 24 * 3600000), 'year': (31556952000)},

        keyboard: {ENTER: 13, SEMICOLON: 186, ESC: 27, COMMAND: 91, SHIFT: 16, SPACE: 32, ALT: 18, TAB: 9},

        email_domains: [''],

        us_regions: (function(){

            var regions = {'division': {}, 'region': {}};

            // Region 1
            regions['New England'] = regions['division'][1] = ['Maine', 'New Hampshire', 'Vermont', 'Massachusetts', 'Rhode Island', 'Connecticut'];
            regions['Mid-Atlantic'] = regions['division'][2] = ['New York', 'Pennsylvania', 'New Jersey'];
            regions['Northeast'] = regions['region'][1] = regions['division'][1].concat(regions['division'][2]);

            // Region 2
            regions['East North Central'] = regions['division'][3] = ['Wisconsin', 'Michigan', 'Illinois', 'Indiana', 'Ohio'];
            regions['West North Central'] = regions['division'][4] = ['Missouri', 'North Dakota', 'South Dakota', 'Nebraska', 'Kansas', 'Minnesota', 'Iowa'];
            regions['Midwest'] = regions['region'][2] = regions['division'][3].concat(regions['division'][4]);

            // Region 3
            regions['South Atlantic'] = regions['division'][5] = ['Delaware', 'Maryland', 'District of Columbia', 'Virginia', 'West Virginia', 'North Carolina', 'South Carolina', 'Georgia', 'Florida'];
            regions['East South Central'] = regions['division'][6] = ['Kentucky', 'Tennessee', 'Mississippi', 'Alabama'];
            regions['West South Central'] = regions['division'][7] = ['Oklahoma', 'Texas', 'Arkansas', 'Louisiana'];
            regions['South'] = regions['region'][3] = regions['division'][5].concat(regions['division'][6], regions['division'][7]);

            // Region 4
            regions['Mountain'] = regions['division'][8] = ['Idaho', 'Montana', 'Wyoming', 'Nevada', 'Utah', 'Colorado', 'Arizona', 'New Mexico'];
            regions['Pacific'] = regions['division'][9] = ['Alaska', 'Washington', 'Oregon', 'California', 'Hawaii'];
            regions['West'] = regions['region'][4] = regions['division'][8].concat(regions['division'][9]);

            return regions;

        })(),

        quartersByMonth: [0,0,0,3,3,3,6,6,6,9,9,9],
        getQuarter: function(date) {

            var currentMonth = date.getMonth();
            var quarterMonth = _.quartersByMonth[currentMonth];

            var from = date.clone();
                from.setMonth(quarterMonth);
                from.moveToFirstDayOfMonth();

            var to = from.clone();
                to.addMonths(2);
                to.moveToLastDayOfMonth();

            var values = {from: from, to: to};

            return values;
        },

        isNumber: function(n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        },

        parseURL: function(url) {
            if (!url || !_.isString(url)) {
                return null;
            }

            url = _.ensureHttp(url);
            var a = document.createElement('a');
            a.href = url;
            return a;
        },

        splatURL: function(url) {

            var parsed = _.parseURL(url);
            var getParams = [];
            var param, query;
            var get = {};

            var parts = url.split('?');
            if (parts[1]) {
                parts = parts[1].split('#'); // maked sure not to include the hash
                query = parts[0];

                getParams = query.split('&');
                for (param in getParams) {

                    if (getParams.hasOwnProperty(param)) {
                        param = getParams[param].split('=');
                        get[param[0]] = param[1] ? param[1] : '';
                    }

                }

            }

            var urlParts = {
                protocol: parsed.protocol,
                host: parsed.host,
                hash: parsed.hash,
                pathname: parsed.pathname,
                port: parsed.port,
                query: query,
                get: get
            };

            return urlParts;

        },

        sqlDateToUTCDate: function(date) {
            var standardDate = date.replace(/\s/, 'T');
            var dateObject = new Date(standardDate);
            var utcTimestamp = dateObject.getTime() + dateObject.getTimezoneOffset()*60*1000;
            return new Date(utcTimestamp);
        },

        prettyDate: function(time, showtime, pastSuffix, futureSuffix, toLower) {
            var now = new Date();
            var date = this.parseDate(time);
            var pastSuffix = pastSuffix || ' ago';
            var futureSuffix = futureSuffix || '';

            if (!date) {
                return 'unknown';
            }

            // Convert dates to UNIX time (ms)
            now = now.getTime();
            date = date.getTime();

            var diff = (now - date) / 1000; // seconds
            var day_diff = Math.floor(Math.abs(diff) / 86400);
            var minutes = Math.floor((diff % 3600) / 60);

            var isPast = (diff > 0);
            var suffix = isPast ? pastSuffix : futureSuffix;

            diff = Math.abs(diff);
            day_diff = Math.abs(day_diff);

            if ( isNaN(day_diff) || day_diff < 0 ) {
                return 'unknown';
            }

            var string = (day_diff == 0 && (
                diff < 60 && "" + (isPast ? 'just now' : 'just') ||
                diff < 120 && "1 minute" + suffix ||
                diff < 3600 && (Math.floor( diff / 60 ) + " minutes" + suffix) ||
                diff < 7200 && ("1 hour" /* ( minutes ? (' ' + minutes + ' minutes') : '' ) + */ + suffix)  ||
                diff < 86400 && Math.floor( diff / 3600 ) + " hours" /* + ( minutes ? (' ' + minutes + ' minutes') : '' )*/ + suffix) ||
                day_diff == 1 && "A day" + suffix ||
                day_diff < 14 && day_diff + " days" + suffix ||
                day_diff <= 90 && Math.ceil( day_diff / 7 ) + " weeks" + suffix ||
                day_diff <= 730 && Math.ceil( day_diff / 30) + " months" + suffix ||
                day_diff > 730 && Math.ceil( day_diff / 365) + " years" + suffix);

            return toLower ? string.toLowerCase() : string;
        },

        // Hack to deal with difference between the server timezone and the browser timezone
        localDateOffset: function(x) {
            var timezoneOffset = ((app.user.userTimezoneOffset || 0) + (new Date()).getTimezoneOffset()) * 60 * 1000;
            return new Date(x.getTime() - timezoneOffset);
        },

        parseDate: function (date) {
            var parsedTime;
            if (!date) {
                return null;
            }

            if (_.isFinite(date)) {
                return new Date(date);
            }

            if (_.isString(date)) {
                date = date.replace(/-/g, '/');
            }

            parsedTime = new Date(date);
            if (_.isValidDate(parsedTime)) {
                return this.localDateOffset(parsedTime);
            }
            return null;
        },

        prettyDateLabel: function (time, showtime, pastSuffix, futureSuffix, toLower)  {
            var string = this.prettyDate(time, showtime, pastSuffix, futureSuffix, toLower);
            var date = this.parseDate(time);
            var title = '';

            if (date) {
                title = date.format('longDateTime');
            }

            return '<span class="tip tool-tip-anchor" title="' + title + '">' + string + '</span>';
        },

        // Takes a date and returns a date value formated m/d/Y for the previous month
        getPreviousMonth: function (date, format)
        {
            if (!format) {
                format = 'm/d/yyyy';
            }
            var date = new Date(Date.parse(date + " 00:00:00"));

            // Decrement the month using the setMonth function so that it accounts for changing years.
            var month = date.getMonth();
            month -= 1;
            date.setMonth(month);

            return date.format(format);
        },

        // Takes a date and returns a date value formated m/d/Y for the next month
        getNextMonth: function (date, format)
        {
            if (!format) {
                format = 'm/d/yyyy';
            }
            var date = new Date(Date.parse(date + " 00:00:00"));

            // Increment the month using the setMonth function so that it accounts for changing years.
            var month = date.getMonth();
            month += 1;
            date.setMonth(month);

            return date.format(format);
        },

        prettyNumber: function(value, showUnits) {

            showUnits = true;
            var thousand = 1000;
            var million = 1000000;
            var billion = 1000000000;
            var trillion = 1000 * billion;

            if (value < thousand * 10) {
                return _.number_format(value);
            } else if (value < million) {
                return Math.round(value / 1000) + (showUnits ? ' thousand' : '');
            } else if (value < billion) {
                return Math.round(value / million) + (showUnits ? ' million' : '');
            } else if (value < trillion) {
                return Math.round(value / billion) + (showUnits ? ' billion' : '');
            } else {
                return _.number_format(Math.round(value / trillion)) + (showUnits ? ' trillion' : '');
            }

        },

        prettyNumberRange: function(range, prefix) {

            var str = '';
            prefix = _.isString(prefix) ? prefix : '$';

            if (!range) {
                return t('unknown');
            }

            if (range.length == 1) {
                return 'Over ' + prefix + _.prettyNumber(range[0]);
            }

            for (var i = 0; i < range.length; i++) {

                if (i > 0 && str.length) {
                    str += ' - ';
                }

                str += (range[i] ? (prefix + _.prettyNumber(range[i], !range[i+1] && (Math.abs(range[i]) - Math.abs(range[i+1])) < 1000)) : '');
            }

            return str;
        },

        dateParts: function(seconds)
        {
            month = 86400 * 30;
            week = 86400 * 7;
            day = 86400;
            hour = 3600;
            minute = 60;

            // results
            months = 0;
            weeks = 0;
            days = 0;
            hours = 0;
            minutes = 0;

            if (seconds >= month) {
                months = Math.floor(seconds / month);
                seconds = seconds % month;
            }

            if (seconds >= week) {
                weeks = Math.floor(seconds / week);
                seconds = seconds % week;
            }

            if (seconds >= day) {
                days = Math.floor(seconds / day);
                seconds = seconds % day;
            }

            if (seconds >= hour) {
                hours = Math.floor(seconds / hour);
                seconds = seconds % hour;
            }

            if (seconds >= minute) {
                minutes = Math.floor(seconds / minute);
                seconds = seconds % minute;
            }

            return {"months" : months, "weeks" : weeks, "days" : days, "hours" : hours, "minutes" : minutes};
        },

        prettyDateParts: function(seconds)
        {
            var diff = ((seconds - (new Date()).getTime()) / 1000);
            if (diff < 86400) {
                return _.prettyDate(seconds);
            }

            var parts = _.dateParts(diff);
            var str = "";

            if (parts.months) {
                str += parts.months + " month";
                if (parts.months > 1) {
                    str += "s";
                }

                str += " ";
            }

            if (parts.weeks) {
                str += parts.weeks + " week";
                if (parts.weeks > 1) {
                    str += "s";
                }

                str += " ";
            }

            if (parts.days) {
                str += parts.days + " day";
                if (parts.days > 1) {
                    str += "s";
                }

                str += " ";
            }

            if (parts.hours) {
                str += parts.hours + " hour";
                if (parts.hours > 1) {
                    str += "s";
                }

                str += " ";
            }

            if (parts.minutes) {
                str += parts.minutes + " minute";
                if (parts.minutes > 1) {
                    str += "s";
                }

                str += " ";
            }

            return str.trim();
        },

        prettyDateFormat: function(date, format) {
            try {
                var date = Date.parse(date);
                var format = format || 'fullDate';

                if (_.isNumber(date)) {
                    date = new Date(date);
                }

                return date.format(format);

            } catch(err) {
                return '';
            }
        },

        prettyDateTime: function(date, format) {
            try {
                var date = Date.parse(date);
                var format = format || 'fullDate';

                if (_.isNumber(date)) {
                    date = new Date(date);
                }

                return date.format(format) + ' ' + date.format('shortTime');
            } catch(err) {
                return '';
            }
        },


        prettyElapsedTime: function(date1, date2) {

            if (_.isNumber(date1)) {
                date1 = new Date(date1);
                date2 = new Date(date2);
            } else {
                date1 = (Date.parse(date1));
                date2 = (Date.parse(date2));
            }

            // Convert to seconds
            date1 = date1.getTime() / 1000;
            date2 = date2.getTime() / 1000;

            var diff = (date2 > date1 ? (date2 - date1) : (date1 - date2));
            var dayDiff = Math.floor(diff / 86400);

            var pretty = 'unknown';

            if (diff < 0) {
                return pretty;
            }

            if (dayDiff == 0) {

                if (diff < 10) {
                    pretty = diff +' secs';
                } else if (diff < 60) {
                    pretty = diff + " secs";
                } else if (diff < 120) {
                    pretty = "a minute";
                } else if (diff < 3600) {
                    pretty = (Math.floor(diff / 60) + " minutes");
                } else if (diff < 7200) {
                    pretty = "1 hour";
                } else if (diff < 86400) {
                    pretty = (Math.floor(diff / 3600) + " hours");
                }

            } else {

                if (dayDiff == 1) {
                    pretty = "1 day";
                } else if (dayDiff < 7) {
                    pretty = (dayDiff + " days");
                } else if (dayDiff <= 90) {
                    pretty = (Math.ceil(dayDiff / 7) + " weeks");
                } else if (dayDiff <= 730) {
                    pretty = Math.ceil(dayDiff / 30) + " months";
                } else if (dayDiff > 730) {
                    pretty = Math.ceil(dayDiff / 365) + " years";
                }
            }

            return pretty;
        },


        prettyLabel: function(field) {

            var field = field + '';

            field = field.replace(/([a-z])([A-Z])/, '$1 $2');
            field = field.replace('__c', '');
            field = field.replace('i__', '');
            field = field.replace('_', '');
            field = field = $.trim(field);
            field = field.charAt(0).toUpperCase() + field.slice(1);

            return field;
        },

        prettyOp: function(op) {

            var operator = '';

            switch(op) {

                case 'eq':
                    operator = 'equals';
                    break;

                case 'gte':
                    operator = 'greater than or equal to';
                    break;

                case 'lte':
                    operator = 'less than or equal to';
                    break;

                case 'neq':
                    operator = 'not equal to';
                    break;

                case 'cn':
                    operator = 'contains';
                    break;
                case 'nempt':
                    operator = 'provided';
                    break;

            }

            return operator;

        },


        prettyLocation: function(locationInfo, glue) {

            var location = [];
            var glue = glue || '<br/>';

            if (!_.empty(locationInfo['street'])) {
                location.push(locationInfo['street']);
            }

            if (!_.empty(locationInfo['city']) && !_.empty(locationInfo['state'])) {
                location.push(locationInfo['city'] + ', ' + locationInfo['state']);
            } else if (!_.empty(locationInfo['state'])) {
                location.push(locationInfo['state']);
            } else if (!_.empty(locationInfo['city'])) {
                location.push(locationInfo['city']);
            }

            if (!_.empty(locationInfo['zipcode'])) {
                location.push(locationInfo['zipcode']);
            }

            if (!_.empty(locationInfo['country'])) {
                location.push(locationInfo['country']);
            }

            location = location.join(glue);

            return _.orEqual(location, 'Location not provided');

        },

        prettyPhone: function(phone) {
            var phoneNum = "" + phone;
            var startsWithPlus = phoneNum.charAt(0) === '+';
            var s2 = phoneNum.replace(/\D/g, '');
            var m;
            if (!startsWithPlus) {
                m = s2.match(/^1?(\d{3})(\d{3})(\d{4})$/);
            }
            return (!m) ? phone : "(" + m[1] + ") " + m[2] + "-" + m[3];
        },

        // cleanup number to use inside a callto: link
        // this doesn't generate the link itself
        skypePhone: function(phone, prefix) {
            var phoneNum = '' + phone;
            var startsWithPlus = phoneNum.charAt(0) === '+';
            var s2 = phoneNum.replace(/\D/g, '');
            var m;

            if (!startsWithPlus) {
                m = s2.match(/^1?(\d{3})(\d{3})(\d{4})$/);
                s2 = (!m) ? null : '' + m[1] + '-' + m[2] + '-' + m[3];
            }

            if (s2) {
                if (prefix) {
                    s2 = prefix + s2;
                }
                if (startsWithPlus) {
                    s2 = '+' + s2;
                }
            }

            return s2;
        },

        ensureHttp: function(url) {
            var protomatch = /^(https?|ftp):\/\//;
            return 'http://' + url.replace(protomatch, '');
        },

        toWebLink: function(url, fallback) {
            var link = fallback || 'Website not provided';

            if (!_.empty(url)) {
                var goto = _.ensureHttp(url + "");
                var link = '<a href="' + goto + '" target="_blank">' + url + '</a>';
            }

            return link;
        },

        toPhoneLink: function(phone, fallback, isInternational) {
            var link = fallback || 'Phone not provided';

            if (!_.empty(phone)) {
                if (!isInternational) {
                    phone = _.prettyPhone(phone);
                }
                link = '<a href="tel: ' + phone + '">' + phone + '</a>';
            }

            return link;
        },

        toEmailLink: function(email, fallback) {
            var link = fallback || 'Email not provided';

            if (!_.empty(email)) {
                var link = '<a href="mailto:' + encodeURI($.trim(email)) + '">' + encodeURI($.trim(email)) + '</a>';
            }

            return link;
        },

        objToString: function(obj, justValues) {

            var justValues = justValues || true;
            var strings = [];
            for (var prop in obj) {
                strings.push(obj[prop]);
            }

            return strings.join(', ');
        },

        dateToFormat: function(dateString, format) {

            var format = format ? format : 'm/d/yyyy';
            var date = new Date(dateString);
            return date.format(format);

        },


        getDocType: function(node) {

            var doctype = node;

            if (node && node.name) {
                doctype =  "<!DOCTYPE "
                    + node.name
                    + (node.publicId ? ' PUBLIC "' + node.publicId + '"' : '')
                    + (!node.publicId && node.systemId ? ' SYSTEM' : '')
                    + (node.systemId ? ' "' + node.systemId + '"' : '')
                    + '>';
            } else {
                doctype = '<!DOCTYPE html>';
            }

            return doctype;
        },

        orEqual: function(item1, item2) {

            if (_.isString(item1)) {
                item1 = $.trim(item1);
                return item1.length ? item1 : item2;
            }

            return item1 || item2;
        },

        toKeys: function(values) {

            var keys = [];
            for(var i in values) {
                if (values.hasOwnProperty(i)) {
                    keys.push(values[i] + '');
                }
            }

            return keys;

        },

        commaSepStringContains: function (needle, haystack) {
            var safeNeedle = needle.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
            var r = new RegExp('(^|, ?)' + safeNeedle + '(,|$)');
            return haystack.match(r) !== null;
        },

        // flatten an group of objects values at a property
        pickValues: function(object, keys, valueKey) {

            var object = _.pick(object, keys);
            var values = [];

            for (var o in object) {
                if (object[o].hasOwnProperty(valueKey)) {
                    values.push(object[o][valueKey]);
                }
            }

            return values;
        },


        // get the value of an object by safely descending, returns the value or null if not a valid chain
        valueAt: function(obj, chain) {

            var value = obj;
            var chain = _.isArray(chain) ? chain : Array.prototype.slice.call(arguments, 1);
            var index;

            while (chain.length) {

                index = chain.shift();

                if (value && value.hasOwnProperty(index)) {
                    value = value[index];
                } else {
                    return null;
                }

            }

            return value;
        },

        valuesAt: function(obj, chain) {
            var values = [];
            var chain = _.isArray(chain) ? chain : Array.prototype.slice.call(arguments, 1);

            for (var index in obj) {

                if (obj.hasOwnProperty(index)) {
                    values.push(_.valueAt(obj[index], chain.concat()));
                }

            }

            return values;
        },

        setValueAt: function(obj, value, chain) {

            var cursor = obj;
            var chain = _.isArray(chain) ? chain : Array.prototype.slice.call(arguments, 2);
            var index;

            try {
                while (chain.length > 1) {
                    index = chain.shift();

                    if (cursor.hasOwnProperty(index)) {
                        cursor = cursor[index];
                    } else {
                        cursor[index] = {};
                        cursor = cursor[index];
                    }
                }

                index = chain.shift();
                cursor[index] = value;

                return true;

            } catch (error) {
                return false;
            }

        },

        parseIntArray: function(arr, radix) {
            var result = [];
            var radix = radix || 10;

            for (var i=0; i<arr.length; i++) {
                result.push(parseInt(arr[i], radix));
            }

            return result;
        },

        objToArray: function(obj, sort) {

            var payload = [];
            for (var i in obj) {
                if (obj.hasOwnProperty(i)) {
                    payload.push(obj[i]);
                }
            }

            if (sort && typeof sort === 'function') {
                payload.sort(sort);
            }

            return payload;
        },

        arrayToObj: function(arr, field) {

            var payload = {};

            for (var i in arr) {
                if (arr.hasOwnProperty(i)) {
                    payload[arr[i][field]] = arr[i];
                }
            }

            return payload;

        },

        fill: function(obj, keys, value) {

            for (var i in keys) {
                if (keys.hasOwnProperty(i)) {
                    obj[keys[i]] = value;
                }
            }

            return obj;

        },

        sortOnProperty: function(property, direction) {

            return (function(a, b) {

                if (_.isString(a[property]) && _.isString(b[property])) {
                    var at = a[property].toLowerCase();
                    var bt = b[property].toLowerCase();

                    if (direction === 'asc') {
                        return at.localeCompare(bt);
                    } else {
                        return bt.localeCompare(at);
                    }
                }

                if (a[property] > b[property]) {
                    return (direction === 'asc' ? 1 : -1);
                } else if (b[property] > a[property]) {
                    return (direction === 'asc' ? -1 : 1);
                } else {
                    return 0;
                }

            });
        },

        gravatar: function(email, size, defaultURL) {
            if (defaultURL) {
                return defaultURL;
            }

            imgSrc = '/includes/img/avatars/default-avatar-128.png';
            size = size || 32;

            if (email && email.length) {
                imgSrc = 'https://secure.gravatar.com/avatar/' + md5(email) + '/?size=' + size;
                imgSrc += '&default=' + encodeURI('https://app.sharpspring.com/includes/img/avatars/default-avatar-128.png');
            }

            return imgSrc;
        },

        getUploadThumb: function(url) {
            if (_.isString(url)) {
                return url.replace(/uploads\/(.*\/)?([^\/]*)/, 'uploads/$1mcith/mcith_$2');
            }
        },

        getEmailThumbnailPath: function(email) {
            return (email['hasSnapshot'] && email['thumbnail'] ?  email['thumbnail'] : 'https://s3.amazonaws.com/ss-usa/basic.png');
        },

        plainTextToHTML: function(plainText, defaultText) {

            var html = '';
            var defaultText = defaultText || '';
            var plainText = plainText == 'null' ? null : plainText;
            plainText = _.orEqual(plainText, defaultText);

            if (plainText && plainText.length) {
                html = plainText.replace(/[\r\n]{2,}/g, '</p><p>');
                html = html.replace(/[\r\n]/g, '<br/>');

                html = ('<p>' + html + '</p>');
            }

            return html;
        },

        decay: function(score, timestamp, halflife, halfLives) {

            var now = new Date();
            var then = new Date(timestamp);
            var halflife = _.orEqual(halflife, 5184000);
            var halfLives = _.orEqual(halfLives, 2);

            // 2592000 = 1 month, 5184000 = 2 months, 7776000 = 3 months, 15552000 = 6 months
            elapsed = Math.min(now.getTime()/1000 - then.getTime()/1000, halflife * halfLives);
            decayedScore = score * Math.pow(2, -(elapsed / halflife));

            return Math.floor(decayedScore);

        },

        hasPicklist: function(fieldType) {

            var hasPicklist = false;
            switch (fieldType) {

                case 'picklist':
                case 'multipicklist':
                case 'radio':
                case 'checkbox':
                    hasPicklist = true;
                    break;

            }

            return hasPicklist;
        },

        getFieldTypeIcon: function(fieldType)
        {
            var icon = '';
            switch (fieldType) {

                case 'currency':
                    icon = 'icon-dollar';
                    break;

                case 'double':
                case 'int':
                    icon = 'icon-hash';
                    break;

                case 'date':
                    icon = 'icon-calendar';
                    break;

                case 'picklist':
                case 'multipicklist':
                case 'state':
                    icon = 'icon-dropmenu';
                    break;

                case 'phone':
                case 'phone number':
                case 'mobile phone':
                case 'office phone number':
                    icon = 'icon-phone';
                    break;

                case 'radio':
                    icon = 'icon-radio-checked';
                    break;

                case 'checkbox':
                    icon = 'icon-checkbox-checked';
                    break;

                case 'textarea':
                    icon = 'icon-paragraph-justify';
                    break;

                case 'email':
                    icon = 'icon-email';
                    break;

                case 'url':
                    icon = 'icon-link';
                    break;

                case 'hidden':
                    icon = 'icon-radio-unchecked';
                    break;

                default:
                    icon = 'icon-input';
                    break;
            }

            return icon;
        },

        parser: document.createElement('a'),

        validURL: function(url) {
            _.parser.href = url;
            var collapse = _.parser.protocol + '//' + _.parser.hostname;
            return (url.indexOf(collapse) === 0);
        },

        validateURLByRegex: function(url) {
            var regex = /^(http(s)?)(:\/\/)[^\s^.]+(\.[^\s]+)+$/;
            return url.match(regex);
        },

        pageHasChanges: false,
        preventPageChange: function(change) {
            var msg = 'You have some unsaved changes.';
            var callback = function() { return change === true ? msg : change; };

            if ($) {
                $('.btn-updatable').toggleClass('btn-success', !!change);
            }

            window.onbeforeunload = (change ? callback : null);
            _.pageHasChanges = (change ? true : false);
        },

        preventPageBack: function(doc) {
            // Prevent back from going back in iframes
            $(doc).unbind('keydown').bind('keydown', function (event) {
                var doPrevent = false;
                if (event.keyCode === 8) {
                    var d = event.srcElement || event.target;
                    if ((d.tagName.toUpperCase() === 'INPUT' && (d.type.toUpperCase() === 'TEXT' || d.type.toUpperCase() === 'PASSWORD' || d.type.toUpperCase() === 'FILE'))
                        || d.tagName.toUpperCase() === 'TEXTAREA') {
                        doPrevent = d.readOnly || d.disabled;
                    } else {
                        doPrevent = true;
                    }
                }

                if (doPrevent) {
                    event.preventDefault();
                }
            });
        },

        leftPad: function(base, minLength, paddingChar) {
            if (typeof base !== 'string') {
                base = String(base);
            }
            if (base.length >= minLength) {
                return base;
            }

            var padLength = minLength - base.length;
            return (new Array(padLength + 1)).join(paddingChar) + base;
        },

        rightPad: function(base, minLength, paddingChar) {
            if (typeof base !== 'string') {
                base = String(base);
            }
            if (base.length >= minLength) {
                return base;
            }

            var padLength = minLength - base.length;
            return base + (new Array(padLength + 1)).join(paddingChar);
        },

        // Make sure all SFDC links are build correctly
        sfdcLink: function(id, endpoint, tooltip) {

        var className = "class = 'tip'";
            if (!_.valueAt(tooltip)) {
                className = '';
            }

            return "<a href=\"https://" + endpoint + "/" + id + "\" target = '_blank'" + className + " title='View in SalesForce'>"
                + "<i class=\"icon-new-window\"></i>" + t('contacts_contactrow_viewinsfdc') + "</a>";
        },

        // Amplify shortcuts
        pub: amplify.publish,
        sub: amplify.subscribe,
        unsub: amplify.unsubscribe,
        req: amplify.request,
        store: amplify.store

    });


    var _Templating = _.template;
    _.template = function() {
        try {
            arguments[0] = $.trim(arguments[0]);
            return _Templating.apply(_, arguments);
        } catch (err) { console.error('Failed to parse template', err, arguments); }

        return (function() { return ''});

    };

    // Because safari sucks at parsing dates
    var parseDate = function(input, format) {

        format = format || 'yyyy-mm-dd'; // default format
        var parts = input.match(/(\d+)/g),
            i = 0, fmt = {};
        // extract date-part indexes from the format
        format.replace(/(yyyy|dd|mm)/g, function(part) { fmt[part] = i++; });

        return new Date(parts[fmt['yyyy']], parts[fmt['mm']]-1, parts[fmt['dd']]);

    };


    String.prototype.capitalize = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    };



    /*
     * Date Format 1.2.3
     * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
     * MIT license
     *
     * Includes enhancements by Scott Trenda <scott.trenda.net>
     * and Kris Kowal <cixar.com/~kris.kowal/>
     *
     * Accepts a date, a mask, or a date and a mask.
     * Returns a formatted version of the given date.
     * The date defaults to the current date/time.
     * The mask defaults to dateFormat.masks.default.
     */

    var dateFormat = function () {
        var	token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
            timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
            timezoneClip = /[^-+\dA-Z]/g,
            pad = function (val, len) {
                val = String(val);
                len = len || 2;
                while (val.length < len) val = "0" + val;
                return val;
            };

        // Regexes and supporting functions are cached through closure
        return function (date, mask, utc) {
            var dF = dateFormat;
            var dateObj;

            // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
            if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
                mask = date;
                date = undefined;
            }

            // Passing date through Date applies Date.parse, if necessary
            date = date ? new Date(date) : new Date;

            if (isNaN(date)) {

                throw SyntaxError("invalid date");

            }

            mask = String(dF.masks[mask] || mask || dF.masks["default"]);

            // Allow setting the utc argument via the mask
            if (mask.slice(0, 4) == "UTC:") {
                mask = mask.slice(4);
                utc = true;
            }

            var	_ = utc ? "getUTC" : "get",
                d = date[_ + "Date"](),
                D = date[_ + "Day"](),
                m = date[_ + "Month"](),
                y = date[_ + "FullYear"](),
                H = date[_ + "Hours"](),
                M = date[_ + "Minutes"](),
                s = date[_ + "Seconds"](),
                L = date[_ + "Milliseconds"](),
                o = utc ? 0 : date.getTimezoneOffset(),
                flags = {
                    d:    d,
                    dd:   pad(d),
                    ddd:  dF.i18n.dayNames[D],
                    dddd: dF.i18n.dayNames[D + 7],
                    m:    m + 1,
                    mm:   pad(m + 1),
                    mmm:  dF.i18n.monthNames[m],
                    mmmm: dF.i18n.monthNames[m + 12],
                    yy:   String(y).slice(2),
                    yyyy: y,
                    h:    H % 12 || 12,
                    hh:   pad(H % 12 || 12),
                    H:    H,
                    HH:   pad(H),
                    M:    M,
                    MM:   pad(M),
                    s:    s,
                    ss:   pad(s),
                    l:    pad(L, 3),
                    L:    pad(L > 99 ? Math.round(L / 10) : L),
                    t:    H < 12 ? "a"  : "p",
                    tt:   H < 12 ? "am" : "pm",
                    T:    H < 12 ? "A"  : "P",
                    TT:   H < 12 ? "AM" : "PM",
                    Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
                    o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
                    S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
                };

            return mask.replace(token, function ($0) {
                return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
            });
        };
    }();

    // Some common format strings
    dateFormat.masks = {
        "default":      "ddd mmm dd yyyy HH:MM:ss",
        shortDate:      "m/d/yy",
        mediumDate:     "mmm d, yyyy",
        longDate:       "mmmm d, yyyy",
        longDateTime:   "mmmm d, yyyy h:MM TT Z",
        fullDate:       "dddd, mmmm d, yyyy",
        shortTime:      "h:MM TT",
        mediumTime:     "h:MM:ss TT",
        longTime:       "h:MM:ss TT Z",
        isoDate:        "yyyy-mm-dd",
        isoTime:        "HH:MM:ss",
        isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
        isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
    };

    // Internationalization strings
    dateFormat.i18n = {
        dayNames: [
            "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
            "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
        ],
        monthNames: [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
            "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
        ]
    };

    // For convenience...
    Date.prototype.format = function (mask, utc) {
        return dateFormat(this, mask, utc);
    };

    Date.prototype.max = function(d1, d2) {
        return (d1 < d2) ? d2 : d1;
    };

    Date.prototype.min = function(d1, d2) {
        return (d1 < d2) ? d1 : d2;
    };

    Date.prototype.toSQL = function(includeTime) {
        return this.format(includeTime ? 'yyyy-mm-dd HH:MM:ss': 'yyyy-mm-dd');
    };

    var origParse = Date.parse, numericKeys = [ 1, 4, 5, 6, 7, 10, 11 ];
    Date.parse = function (date) {
        var timestamp, struct, minutesOffset = 0;

        // ES5 §15.9.4.2 states that the string should attempt to be parsed as a Date Time String Format string
        // before falling back to any implementation-specific date parsing, so that’s what we do, even if native
        // implementations could be faster
        //              1 YYYY                2 MM       3 DD           4 HH    5 mm       6 ss        7 msec        8 Z 9 ±    10 tzHH    11 tzmm
        if ((struct = /^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(date))) {
            // avoid NaN timestamps caused by “undefined” values being passed to Date.UTC
            for (var i = 0, k; (k = numericKeys[i]); ++i) {
                struct[k] = +struct[k] || 0;
            }

            // allow undefined days and months
            struct[2] = (+struct[2] || 1) - 1;
            struct[3] = +struct[3] || 1;

            if (struct[8] !== 'Z' && struct[9] !== undefined) {
                minutesOffset = struct[10] * 60 + struct[11];

                if (struct[9] === '+') {
                    minutesOffset = 0 - minutesOffset;
                }
            }

            timestamp = Date.UTC(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]);
        }
        else {
            timestamp = origParse ? origParse(date) : NaN;
        }

        return timestamp;
    };


    // MD5 ---------------------------------------------------------


    function md5cycle(x, k) {
        var a = x[0], b = x[1], c = x[2], d = x[3];

        a = ff(a, b, c, d, k[0], 7, -680876936);
        d = ff(d, a, b, c, k[1], 12, -389564586);
        c = ff(c, d, a, b, k[2], 17,  606105819);
        b = ff(b, c, d, a, k[3], 22, -1044525330);
        a = ff(a, b, c, d, k[4], 7, -176418897);
        d = ff(d, a, b, c, k[5], 12,  1200080426);
        c = ff(c, d, a, b, k[6], 17, -1473231341);
        b = ff(b, c, d, a, k[7], 22, -45705983);
        a = ff(a, b, c, d, k[8], 7,  1770035416);
        d = ff(d, a, b, c, k[9], 12, -1958414417);
        c = ff(c, d, a, b, k[10], 17, -42063);
        b = ff(b, c, d, a, k[11], 22, -1990404162);
        a = ff(a, b, c, d, k[12], 7,  1804603682);
        d = ff(d, a, b, c, k[13], 12, -40341101);
        c = ff(c, d, a, b, k[14], 17, -1502002290);
        b = ff(b, c, d, a, k[15], 22,  1236535329);

        a = gg(a, b, c, d, k[1], 5, -165796510);
        d = gg(d, a, b, c, k[6], 9, -1069501632);
        c = gg(c, d, a, b, k[11], 14,  643717713);
        b = gg(b, c, d, a, k[0], 20, -373897302);
        a = gg(a, b, c, d, k[5], 5, -701558691);
        d = gg(d, a, b, c, k[10], 9,  38016083);
        c = gg(c, d, a, b, k[15], 14, -660478335);
        b = gg(b, c, d, a, k[4], 20, -405537848);
        a = gg(a, b, c, d, k[9], 5,  568446438);
        d = gg(d, a, b, c, k[14], 9, -1019803690);
        c = gg(c, d, a, b, k[3], 14, -187363961);
        b = gg(b, c, d, a, k[8], 20,  1163531501);
        a = gg(a, b, c, d, k[13], 5, -1444681467);
        d = gg(d, a, b, c, k[2], 9, -51403784);
        c = gg(c, d, a, b, k[7], 14,  1735328473);
        b = gg(b, c, d, a, k[12], 20, -1926607734);

        a = hh(a, b, c, d, k[5], 4, -378558);
        d = hh(d, a, b, c, k[8], 11, -2022574463);
        c = hh(c, d, a, b, k[11], 16,  1839030562);
        b = hh(b, c, d, a, k[14], 23, -35309556);
        a = hh(a, b, c, d, k[1], 4, -1530992060);
        d = hh(d, a, b, c, k[4], 11,  1272893353);
        c = hh(c, d, a, b, k[7], 16, -155497632);
        b = hh(b, c, d, a, k[10], 23, -1094730640);
        a = hh(a, b, c, d, k[13], 4,  681279174);
        d = hh(d, a, b, c, k[0], 11, -358537222);
        c = hh(c, d, a, b, k[3], 16, -722521979);
        b = hh(b, c, d, a, k[6], 23,  76029189);
        a = hh(a, b, c, d, k[9], 4, -640364487);
        d = hh(d, a, b, c, k[12], 11, -421815835);
        c = hh(c, d, a, b, k[15], 16,  530742520);
        b = hh(b, c, d, a, k[2], 23, -995338651);

        a = ii(a, b, c, d, k[0], 6, -198630844);
        d = ii(d, a, b, c, k[7], 10,  1126891415);
        c = ii(c, d, a, b, k[14], 15, -1416354905);
        b = ii(b, c, d, a, k[5], 21, -57434055);
        a = ii(a, b, c, d, k[12], 6,  1700485571);
        d = ii(d, a, b, c, k[3], 10, -1894986606);
        c = ii(c, d, a, b, k[10], 15, -1051523);
        b = ii(b, c, d, a, k[1], 21, -2054922799);
        a = ii(a, b, c, d, k[8], 6,  1873313359);
        d = ii(d, a, b, c, k[15], 10, -30611744);
        c = ii(c, d, a, b, k[6], 15, -1560198380);
        b = ii(b, c, d, a, k[13], 21,  1309151649);
        a = ii(a, b, c, d, k[4], 6, -145523070);
        d = ii(d, a, b, c, k[11], 10, -1120210379);
        c = ii(c, d, a, b, k[2], 15,  718787259);
        b = ii(b, c, d, a, k[9], 21, -343485551);

        x[0] = add32(a, x[0]);
        x[1] = add32(b, x[1]);
        x[2] = add32(c, x[2]);
        x[3] = add32(d, x[3]);

    }

    function cmn(q, a, b, x, s, t) {
        a = add32(add32(a, q), add32(x, t));
        return add32((a << s) | (a >>> (32 - s)), b);
    }

    function ff(a, b, c, d, x, s, t) {
        return cmn((b & c) | ((~b) & d), a, b, x, s, t);
    }

    function gg(a, b, c, d, x, s, t) {
        return cmn((b & d) | (c & (~d)), a, b, x, s, t);
    }

    function hh(a, b, c, d, x, s, t) {
        return cmn(b ^ c ^ d, a, b, x, s, t);
    }

    function ii(a, b, c, d, x, s, t) {
        return cmn(c ^ (b | (~d)), a, b, x, s, t);
    }

    function md51(s) {
        txt = '';
        var n = s.length,
            state = [1732584193, -271733879, -1732584194, 271733878], i;
        for (i=64; i<=s.length; i+=64) {
            md5cycle(state, md5blk(s.substring(i-64, i)));
        }
        s = s.substring(i-64);
        var tail = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
        for (i=0; i<s.length; i++)
            tail[i>>2] |= s.charCodeAt(i) << ((i%4) << 3);
        tail[i>>2] |= 0x80 << ((i%4) << 3);
        if (i > 55) {
            md5cycle(state, tail);
            for (i=0; i<16; i++) tail[i] = 0;
        }
        tail[14] = n*8;
        md5cycle(state, tail);
        return state;
    }

    /* there needs to be support for Unicode here,
     * unless we pretend that we can redefine the MD-5
     * algorithm for multi-byte characters (perhaps
     * by adding every four 16-bit characters and
     * shortening the sum to 32 bits). Otherwise
     * I suggest performing MD-5 as if every character
     * was two bytes--e.g., 0040 0025 = @%--but then
     * how will an ordinary MD-5 sum be matched?
     * There is no way to standardize text to something
     * like UTF-8 before transformation; speed cost is
     * utterly prohibitive. The JavaScript standard
     * itself needs to look at this: it should start
     * providing access to strings as preformed UTF-8
     * 8-bit unsigned value arrays.
     */
    function md5blk(s) { /* I figured global was faster.   */
        var md5blks = [], i; /* Andy King said do it this way. */
        for (i=0; i<64; i+=4) {
            md5blks[i>>2] = s.charCodeAt(i)
                + (s.charCodeAt(i+1) << 8)
                + (s.charCodeAt(i+2) << 16)
                + (s.charCodeAt(i+3) << 24);
        }
        return md5blks;
    }

    var hex_chr = '0123456789abcdef'.split('');

    function rhex(n)
    {
        var s='', j=0;
        for(; j<4; j++)
            s += hex_chr[(n >> (j * 8 + 4)) & 0x0F]
                + hex_chr[(n >> (j * 8)) & 0x0F];
        return s;
    }

    function hex(x) {
        for (var i=0; i<x.length; i++)
            x[i] = rhex(x[i]);
        return x.join('');
    }

    function md5(s) {
        return hex(md51(s));
    }

    /* this function is much faster,
     so if possible we use it. Some IEs
     are the only ones I know of that
     need the idiotic second function,
     generated by an if clause.  */

    function add32(a, b) {
        return (a + b) & 0xFFFFFFFF;
    }

    if (md5('hello') != '5d41402abc4b2a76b9719d911017c592') {
        function add32(x, y) {
            var lsw = (x & 0xFFFF) + (y & 0xFFFF),
                msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            return (msw << 16) | (lsw & 0xFFFF);
        }
    }

    if (!Array.prototype.filter) {
        Array.prototype.filter = function(fun/*, thisArg*/) {
            'use strict';

            if (this === void 0 || this === null) {
              throw new TypeError();
            }

            var t = Object(this);
            var len = t.length >>> 0;
            if (typeof fun !== 'function') {
              throw new TypeError();
            }

            var res = [];
            var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
            for (var i = 0; i < len; i++) {
              if (i in t) {
                var val = t[i];

                // NOTE: Technically this should Object.defineProperty at
                //       the next index, as push can be affected by
                //       properties on Object.prototype and Array.prototype.
                //       But that method's new, and collisions should be
                //       rare, so use the more-compatible alternative.
                if (fun.call(thisArg, val, i, t)) {
                  res.push(val);
                }
              }
            }

            return res;
        };
    }

    _.md5 = md5;


})(jQuery);
