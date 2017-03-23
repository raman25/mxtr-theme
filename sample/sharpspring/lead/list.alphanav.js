;(function() {
    /*
    This plugin requires underscore and jQuery
    */

    /*
    How to use this:

    Options:

        itemSize - Used in the math to determine how many Letter links can fit
        valueNames - valid properties for List sorting for this plugin to be enabled (see sortedBy)
        sortedBy - don't worry about passing this in, it will get it off the List whenever the sort changes. If this is NOT in valueNames, the plugin will disable
        scrollParent - the parent scrollable container is NOT body, you can pass in a selector
        stickTo - the nav elements are 'sticky' when you scroll. if the offset it should stick to is not 0 (ie, there is a header or something) you can change the value here
        hasFixedParent - if one of the parents of the list has position:fixed, please provide a selector for it so we can account for that
        enabled - dont pass in, but this will change as the plugin is enabled/disable by the current List sort
        usePaging - set this to true for seamless integration with the pagination plugin
        alphabet - by default this is the standard 26 letter English alphabet. If you want a different set of characters, you can pass that in
        minItems - if this is set, the alphaNav will disable itself when the list has fewer than minItems displayed
        disableOnFilter - if true, will disable if the parent list is filtered or searched (either though ListJS api or searchGroup)

        NOTES ON SORTING
        This plugin only makes sense when the list is sorted by a property that is a string
        When the current sort makes no sense, this plugin will set options.enabled to false and toggle the 'disabled' class on it's element
        When enabled changes, it also fires an event from the PARENT list -

        An example:

        var pagingOptions = {*snip*};
        var alphaNavOptions = {
            usePaging: true,
            itemSize: 50,
            valueNames: ['firstName', 'lastName']
        };
        var myList = new List('listEl', {
            page: 25,
            plugins: [
                ListPagination(pagingOptions),
                AlphaNav(alphaNavOptions)
            ]
        });
        myList.on('alphaNavUpdated', function(list, state) {
            if (state == 'enabled') {
                // List sort has changed to either firstName or lastName
                // Make any changes you need for the AlphaNav being visible
            } else if (state == 'disabled') {
                // Or vice versa
            }
        });
    */

    var defaultOptions = {
        itemSize: 20,
        valueNames: [],
        sortedBy: '',
        scrollParent: 'body',
        stickTo: 0,
        hasFixedParent: false,
        enabled: false,
        usePaging: false,
        minItems: null,
        disableOnFilter: false,
        alphabet: ['#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'X', 'Y', 'Z']
    };

    function AlphaNav(opts) {
        var options = _.defaults(opts || {}, defaultOptions),
            list, alphaList, itemLookup,
            lastWindowHeight, lastWindowWidth,
            $searchGroupInput;


        function getFirstItemForLetter(letter) {
            var i, l, item, tempVal, letterCompareItem;

            if (letter === '#') {
                letter = '0';
            }
            letter = letter.toUpperCase();

            //make a fake item that will work with list sort
            tempVal = {};
            tempVal[options.sortedBy] = letter;
            letterCompareItem = {
                values: function() {
                    return tempVal;
                }
            };

            for (i = 0, l = list.items.length; i < l; i++) {
                item = list.items[i];
                
                // if reached end of list, return last item
                if (i == (l - 1)) {
                    return {item : item, index: i};
                }
                // make sure we use same sort as list cause ugh
                var sortFunc = lastSortOptions.sortFunction || list.sortFunction;
                if (sortFunc(item, letterCompareItem, lastSortOptions) >= 0) {
                    return {item : item, index: i};
                }
            }
            return null;
        }

        function getStickyPos() {
            return _.isFunction(options.stickTo) ? options.stickTo() : options.stickTo;
        }

        function scrollToItem(item) {
            var $scrollParent = $(options.scrollParent),
                $el = $(item.elm),
                parentScrollTop = $scrollParent.scrollTop(),
                elOffset = $el.offset(),
                scrollParentOffset = $scrollParent.offset(),
                parentCorrection = 0,
                $list, fixedOffset;

            if (options.hasFixedParent) {
                $list = $(alphaList.list);
                fixedOffset = $list.closest(options.hasFixedParent).offset();
                if (fixedOffset) {
                    parentCorrection = parentScrollTop - fixedOffset.top;
                }

            } else if (options.scrollParent != 'body') {
                parentCorrection = parentScrollTop;
            }

            elOffset = elOffset ? elOffset.top : 0;
            elOffset -= getStickyPos();
            elOffset += parentCorrection;

            $scrollParent.animate({
                scrollTop: Math.floor(elOffset)
            }, Math.min(500, Math.abs(parentScrollTop - elOffset)));
        }

        function buildItems(alphabet) {
            var lookup = {};
            _.each(alphabet, function(letter) {
                lookup[letter] = {letter: letter};
            });
            return lookup;
        }

        function calculateItems(height) {
            var numItems = Math.max(2, Math.floor(height/options.itemSize)),
                items, numToRemove, skipInc, skipTracker, numSkips, i, l;

            if (numItems >= options.alphabet.length) {
                items = options.alphabet;
            } else {
                // We always want first and last, then attempt our best to evenly skip items through the middle
                items = [options.alphabet[0]];
                l = options.alphabet.length - 1;

                numToRemove = options.alphabet.length - numItems;
                skipInc = l/numToRemove;
                numSkips = 0;
                skipTracker = 0;

                for (i = 0; i < l; i ++) {

                    if (Math.ceil(skipTracker) == i && numSkips < numToRemove) {
                        numSkips++;
                    } else if (i !== 0 && items.length < (numItems - 1)) {
                        items.push(options.alphabet[i]);
                    }

                    while (skipTracker < i) {
                        skipTracker += skipInc;
                    }
                }

                items.push(options.alphabet[l]);
            }

            return _.map(items, function(l) {
                return itemLookup[l];
            });
        }

        function updateNavList() {
            if (!options.enabled) {
                return;
            }

            var $list = $(alphaList.list),
                $scrollParent = $(options.scrollParent),
                listOffset = $list.offset(),
                scrollParentOffset = $scrollParent.offset(),
                scrollPos = $scrollParent.scrollTop(),
                topAdjustment = 0,
                bottomAdjustment = 0,
                spHeight, sppHeight, spPad, sppPad, leftToScroll,
                availSpace, newItems, $fixedParent, fixedOffset, fixedPosition;

            if (!listOffset || !scrollParentOffset) {
                return;
            }

            spHeight = $scrollParent.innerHeight();
            spPadBottom = parseInt($scrollParent.css('padding-bottom'), 10);
            spPadTop = parseInt($scrollParent.css('padding-top'), 10);
            sppHeight = $scrollParent.parent().innerHeight();
            sppPadBottom = parseInt($scrollParent.parent().css('padding-bottom'), 10);
            sppPadTop = parseInt($scrollParent.parent().css('padding-top'), 10);

            if (!$list.hasClass('sticky')) {
                topAdjustment = Math.max(0, listOffset.top - scrollParentOffset.top - scrollPos);
                spHeight -= spPadTop;
                sppHeight -= sppPadTop;

                if ($scrollParent.css('position') == 'absolute') {
                    topAdjustment += $scrollParent.position().top;
                }
            } else {
                if (options.hasFixedParent) {
                    $fixedParent = $list.closest(options.hasFixedParent);
                    fixedOffset = $fixedParent.offset();
                    fixedPosition = $fixedParent.position();
                    topAdjustment = Math.max(0, options.stickTo - (fixedOffset ? fixedOffset.top : 0));
                } else if ($scrollParent.css('position') !== 'absolute') {
                    topAdjustment = options.stickTo;
                }
            }
            if (!options.hasFixedParent) {
                leftToScroll = Math.max(0, spHeight - sppHeight - scrollPos);

                if (leftToScroll < spPadBottom) {
                    bottomAdjustment = spPadBottom - leftToScroll;
                }
            }

            availSpace = Math.floor(Math.min(spHeight, sppHeight) - topAdjustment - bottomAdjustment);
            //console.warn('heights and adjusts', spHeight, sppHeight, topAdjustment, bottomAdjustment);

            alphaList.clear();
            alphaList.add(calculateItems(availSpace));
            $list.height(availSpace);
        }

        var updateNavListThrottled = _.throttle(updateNavList, 100);

        function onResize() {
            if (!options.enabled) {
                return;
            }

            var newWindowHeight = $(window).innerHeight(),
                newWindowWidth = $(window).innerWidth();
            if (typeof lastWindowHeight === 'undefined' || Math.abs(newWindowHeight - lastWindowHeight) > options.itemSize ||
                typeof lastWindowWidth === 'undefined' || newWindowWidth !== lastWindowWidth) {
                lastWindowHeight = newWindowHeight;
                lastWindowWidth = newWindowWidth;
                // If we were sticky we need onScroll to recalc position
                $(alphaList.list).removeClass('sticky').css({top: '', left: ''});
                onScroll();
                updateNavListThrottled();
            }
        }

        function onScroll() {
            if (!options.enabled) {
                return;
            }

            var $list = $(alphaList.list),
                $scrollParent = $(options.scrollParent),
                $listParent = $list.parent(),
                listOffset = $list.offset(),
                scrollParentOffset = $scrollParent.offset(),
                scrollParentPosition = $scrollParent.position(),
                scrollParentPadding = parseInt($scrollParent.css('padding'), 10),
                scrollPos = $scrollParent.scrollTop(),
                parentOffset = $listParent.offset(),
                isSticky = $list.hasClass('sticky'),
                stickyPos = getStickyPos(),
                shouldBeSticky, $fixedParent, fixedPosition, fixedOffset;

            if (!listOffset || !scrollParentPosition || !parentOffset) {
                return;
            }

            if (options.hasFixedParent) {
                $fixedParent = $list.closest(options.hasFixedParent);
                fixedPosition = $fixedParent.position();
                fixedOffset = $fixedParent.offset();
                if (fixedPosition && fixedOffset) {
                    listOffset.top -= (fixedOffset.top + fixedPosition.top);
                    parentOffset.top -= (fixedOffset.top + fixedPosition.top);
                }
            }

            if ($scrollParent.css('position') == 'absolute') {
                scrollParentPosition.top = scrollParentOffset.top;
            }

            if (!isSticky) {
                shouldBeSticky = listOffset.top - scrollPos <= stickyPos - scrollParentPosition.top;
            } else {
                shouldBeSticky = parentOffset.top - scrollPos <= stickyPos - scrollParentPosition.top;
            }

            if (shouldBeSticky && !isSticky) {
                if (fixedPosition) {
                    stickyPos += fixedPosition.top;
                }
                $list.addClass('sticky').css({top: stickyPos, left: listOffset.left});
            } else if (!shouldBeSticky) {
                if (isSticky) {
                    $list.removeClass('sticky').css({top: '', left: ''});
                }
            }

            updateNavListThrottled();
        }

        function onLetterClick(ev) {
            var letter = $(ev.target).text(),
                itemInfo = getFirstItemForLetter(letter),
                pageSize = list.page,
                pageNum;

            if (itemInfo) {
                // we have to make sure we're on the right page first
                if (options.usePaging) {
                    pageNum = Math.floor(itemInfo.index / pageSize);
                    list.show(pageNum * pageSize + 1, pageSize);
                }

                _.defer(scrollToItem, itemInfo.item);

            } else {
                console.warn('no item from letter click', letter);
            }
        }

        function updateSortedBy(sortedBy) {
            list.handlers.alphaNavUpdated = list.handlers.alphaNavUpdated || [];

            if (sortedBy && _.indexOf(options.valueNames, sortedBy) !== -1) {
                options.sortedBy = sortedBy;
            } else {
                options.sortedBy = '';
            }
            updateEnabled();
        }

        function updateEnabled() {
            var currentlyEnabled = options.enabled,
                enabled = true;

            if (!options.sortedBy) {
                //console.warn('disable: sort');
                enabled = false;

            } else if (options.disableOnFilter &&
                (list.filtered || list.searched || $searchGroupInput.val())) {
                //console.warn('disable: filter', list.filtered, list.searched, $searchGroupInput.val());
                enabled = false;

            } else if (_.isNumber(options.minItems) && list.items.length < options.minItems) {
                //console.warn('disable: minItems', list.items.length);
                enabled = false;
            }

            options.enabled = enabled;

            if (enabled != currentlyEnabled) {
                if (enabled) {
                    updateNavList();
                    _.defer(onScroll);  //need to do this after items get populated
                    list.trigger('alphaNavUpdated', 'enabled');
                } else {
                    list.trigger('alphaNavUpdated', 'disabled');
                }
                $(alphaList.list).toggleClass('disabled', !enabled);
            }
        }

        function onListUpdate() {
            updateEnabled();
            onResize();
        }

        var throttledScroll = _.throttle(onScroll, 100);
        var debouncedResize = _.debounce(onResize, 100);
        var lastSortOptions = {};

        var self = {
            name: options.name || 'alphanav',

            init: function(parentList) {
                list = parentList;
                alphaList = new List(options.alphaNavContainer || list.listContainer.id, {
                    listClass: options.alphaNavClass || 'alphanav',
                    item: "<li><a class='letter'></a></li>",
                    valueNames: ['letter'],
                    searchClass: 'alphanav-search-that-is-not-supposed-to-exist',
                    sortClass: 'alphanav-sort-that-is-not-supposed-to-exist'
                });

                itemLookup = buildItems(options.alphabet);

                list.on('sortComplete', function(list, options) {
                    lastSortOptions = options;
                    var sortedBy = options.valueName || '';
                    updateSortedBy(sortedBy);
                });

                // We might need to change height/enabled status if the list contents change
                list.on('updated', onListUpdate);
                list.on('filterComplete', onListUpdate);
                list.on('searchComplete', onListUpdate);

                // Too many ways to filter!!!
                $searchGroupInput = $(list.list).closest('.searchGroup').find('.searchFilter input');
                if ($searchGroupInput.length) {
                    $searchGroupInput.on('input', function() {
                        // ugh this change is animated, defer is not enough
                        _.delay(onListUpdate, 250);
                    });
                }

                window.addEventListener('resize', debouncedResize);
                $(window).on('scroll', throttledScroll);
                $(options.scrollParent).on('scroll', throttledScroll);
                $(alphaList.list).on('click', '.letter', onLetterClick);

                //start disabled, updateSortedBy will call updateEnabled
                $(alphaList.list).addClass('disabled');
                updateSortedBy(options.sortedBy);
            }

        };

        return self;
    }

    window.AlphaNav = AlphaNav;
})();