/*
    Run After All necessary language files are loaded using define
 */
(function() {
    window.app = window.app || {};
    window.app.localesReady = $.Deferred();

    window.app.locales = {
        'en_US': ['en_US'],
        'nl_NL': ['en_US', 'nl_NL'], // Dutch
        'fr_FR': ['en_US', 'fr_FR'], // French
        'de_DE': ['en_US', 'de_DE'], // German
        'it_IT': ['en_US', 'it_IT'], // Italian
        'pt_PT': ['en_US', 'pt_PT'], // Portuguese
        'ro_RO': ['en_US', 'ro_RO'], // Romanian
        'es_ES': ['en_US', 'es_ES'], // Spanish
        'tr_TR': ['en_US', 'tr_TR']  // Turkish
    };

    if (!window.app.locale) {
        window.app.locale = 'en_US';
    }

    require(app.locales[app.locale] ? app.locales[app.locale] : app.locales['en_US'], function() {
        Array.prototype.unshift.call(arguments, app.lang);
        app.lang = $.extend.apply(this, arguments);
        app.localesReady.resolve();
    });

    var mustache = new RegExp("[^\{]*(\{([^\{]+)\})");
    function translate(key, data, defaultText)
    {
        var string = app.lang && app.lang[key] ? app.lang[key] : null;

        if (string && data) {

            var matches, replace;
            while (matches = mustache.exec(string)) {
                replace = data.hasOwnProperty(matches[2]) ? data[matches[2]] : '';
                string = string.replace(matches[1], replace);
            }

        }

        string = string || defaultText || '';

        if (window.app.reverseText) {
            string = string.split('').reverse().join('');
        }

        return string;
    }

    window.t = translate;

})();