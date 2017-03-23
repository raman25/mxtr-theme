var Sidebar = function(options) {

    var self = this;

    var favorites = app.user.favorites || {
            lead: {},
            campaign: {},
            account: {},
            opportunity: {},
            form: {},
            list: {},
            email: {}
        };

    var favoritesLastSeen = app.user.favoritesLastSeen || {
            lead: 0,
            campaign: 0,
            account: 0,
            opportunity: 0,
            form: 0,
            list: 0,
            email: 0
        };

    var favoritesLastSeenCount = {};

    // Sidebar
    var sidebarContentTpl = _.template($('#sidebarContentTpl').text());
    var sidebarFavoritesTpl = _.template($('#sidebarFavoritesTpl').text());
    var sidebarSearchResultsTpl = _.template($('#sidebarSearchResultsTpl').text());
    var currentSidebar = null;


    // ------------------------------ SIDEBAR  -------------------------------

    var drawFavorites = function() {
        var html = sidebarFavoritesTpl({contentType: currentSidebar, favorites: favorites[currentSidebar], lastSeen: favoritesLastSeen[currentSidebar]});
        $('.sidebar-favorites').html(html);
        $(window).resize();
    };

    var onGetFavorites = function(resp) {
        var results = _.valueAt(resp, 'data', 'favorites');
        var type = _.valueAt(resp, 'data', 'favoriteType');
        var lastSeen = _.valueAt(resp, 'data', 'lastSeen');
        var lastSeenCount = _.valueAt(resp, 'data', 'lastSeenCount');

        favorites[type] = results;

        if (lastSeen) {
            favoritesLastSeen[type] = lastSeen;
            favoritesLastSeenCount[type] = lastSeenCount;
        }

        if (type == currentSidebar) {
            drawFavorites();
            updateSidebarIndicators();
        }
    };

    $('body').on('click', '.sidebar-tab', function(ev) {

        var $el = $(this);
        var sidebarType = $el.attr('data-type');
        var html = '';
        var open = false;
        var content = $('.sidebar-content');

        $el.tooltip('hide');

        if (sidebarType && currentSidebar != sidebarType) {
            html = sidebarContentTpl({contentType: sidebarType});
            api.getFavorites(sidebarType, {hasSeen: 1}, onGetFavorites);

            $('.sidebar-tab.active').removeClass('active');
            $el.addClass('active');
            content.removeClass('open').delay(100).queue(function() {
                content.addClass('open').dequeue();
            });
            content.html(html);
            $('.sidebar-search-type').focus();
            currentSidebar = sidebarType;
        } else if (currentSidebar && currentSidebar == sidebarType) {
            // toggle view
            open = $el.is('.active');
            $el.toggleClass('active', !open);
            $('.sidebar-content').toggleClass('open', !open);
            $('.sidebar-search-type').focus();
            currentSidebar = sidebarType;
        }

        $(window).resize();

    });

    $('body').on('click', function(ev) {

        var inSidebar = $(ev.target).closest('#sideBar');

        if (!inSidebar.length) {
            $('.sidebar-tab.active').removeClass('active');
            $('.sidebar-content').removeClass('open');
            sidebarType = false;
        }

    });


    _.sub('item.favorite.update', function(data) {
        if (data.isFavorite) {
            favorites[data.favoriteType] = $.extend(favorites[data.favoriteType], data.favorites);
        } else {
            delete favorites[data.favoriteType][data.favoriteID];
        }
    });


    // Sidebar Search by Type

    var clearSidebarSearch = function() {
        $('.sidebar-search-type').val('').focus();
        $('.sidebar-search-results').html('');
        drawFavorites();
    };

    var sidebarResults = function(resp) {
        var results = _.valueAt(resp, 'data', 'results');
        results = results.slice(0, 25); // just need the top 25
        var html = sidebarSearchResultsTpl({contentType: currentSidebar, results: results, favorites: favorites});
        $('.sidebar-search-results').html(html);
        $(window).resize();
    };

    var sidebarSearch = _.debounce(function() {

        var $search = $('.sidebar-search-type');
        var searchString = $search.val();
        var searchType = $search.attr('data-type');

        if (searchString.length > 2) {
            api.getSearch(searchType, searchString, {}, sidebarResults, function() {
                $('.sidebar-search-results').html(t('db_error'));
            });
        } else if (searchString.length == 0) {
            $('.sidebar-search-results').html('');
            drawFavorites();
        }

    }, 500);


    $('body').on('change', '.sidebar-search-type', sidebarSearch);
    $('body').on('keyup', '.sidebar-search-type', sidebarSearch);
    $('body').on('click', '.search-bar .icon-search', clearSidebarSearch);


    // Init -------------------------

    var updateSidebarIndicators = function() {

        $('.sidebar-tab').each(function() {
            var $el = $(this);
            var type = $el.attr('data-type');

            var lastSeenCount = favoritesLastSeenCount[type] || _.hasRecentFavorites(type, favoritesLastSeen[type]);
            $el.find('.sidebar-recently-active').toggleClass('hide', !lastSeenCount).text(Math.min(lastSeenCount, 9));
        });

    };

    var init = function() {
        updateSidebarIndicators();
        api.getFavorites('lead', {}, onGetFavorites);
    };

    app.localesReady.done(function() {
        init();
    });
    return self;
};