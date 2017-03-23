;
(function () {

    /**
     * Require the given path.
     *
     * @param {String} path
     * @return {Object} exports
     * @api public
     */

    function require(path, parent, orig) {
        var resolved = require.resolve(path);

        // lookup failed
        if (resolved == null) {
            orig = orig || path;
            parent = parent || 'root';
            var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
            err.path = orig;
            err.parent = parent;
            err.require = true;
            throw err;
        }

        var module = require.modules[resolved];

        // perform real require()
        // by invoking the module's
        // registered function
        if (!module._resolving && !module.exports) {
            var mod = {};
            mod.exports = {};
            mod.client = mod.component = true;
            module._resolving = true;
            module.call(this, mod.exports, require.relative(resolved), mod);
            delete module._resolving;
            module.exports = mod.exports;
        }

        return module.exports;
    }

    /**
     * Registered modules.
     */

    require.modules = {};

    /**
     * Registered aliases.
     */

    require.aliases = {};

    /**
     * Resolve `path`.
     *
     * Lookup:
     *
     *   - PATH/index.js
     *   - PATH.js
     *   - PATH
     *
     * @param {String} path
     * @return {String} path or null
     * @api private
     */

    require.resolve = function (path) {
        if (path.charAt(0) === '/') path = path.slice(1);

        var paths = [
            path,
            path + '.js',
            path + '.json',
            path + '/index.js',
            path + '/index.json'
        ];

        for (var i = 0; i < paths.length; i++) {
            var path = paths[i];
            if (require.modules.hasOwnProperty(path)) return path;
            if (require.aliases.hasOwnProperty(path)) return require.aliases[path];
        }
    };

    /**
     * Normalize `path` relative to the current path.
     *
     * @param {String} curr
     * @param {String} path
     * @return {String}
     * @api private
     */

    require.normalize = function (curr, path) {
        var segs = [];

        if (path.charAt(0) != '.') return path;

        curr = curr.split('/');
        path = path.split('/');

        for (var i = 0; i < path.length; ++i) {
            if (path[i] == '..') {
                curr.pop();
            } else if (path[i] != '.' && path[i] != '') {
                segs.push(path[i]);
            }
        }

        return curr.concat(segs).join('/');
    };

    /**
     * Register module at `path` with callback `definition`.
     *
     * @param {String} path
     * @param {Function} definition
     * @api private
     */

    require.register = function (path, definition) {
        require.modules[path] = definition;
    };

    /**
     * Alias a module definition.
     *
     * @param {String} from
     * @param {String} to
     * @api private
     */

    require.alias = function (from, to) {
        if (!require.modules.hasOwnProperty(from)) {
            throw new Error('Failed to alias "' + from + '", it does not exist');
        }
        require.aliases[to] = from;
    };

    /**
     * Return a require function relative to the `parent` path.
     *
     * @param {String} parent
     * @return {Function}
     * @api private
     */

    require.relative = function (parent) {
        var p = require.normalize(parent, '..');

        /**
         * lastIndexOf helper.
         */

        function lastIndexOf(arr, obj) {
            var i = arr.length;
            while (i--) {
                if (arr[i] === obj) return i;
            }
            return -1;
        }

        /**
         * The relative require() itself.
         */

        function localRequire(path) {
            var resolved = localRequire.resolve(path);
            return require(resolved, parent, path);
        }

        /**
         * Resolve relative to the parent.
         */

        localRequire.resolve = function (path) {
            var c = path.charAt(0);
            if (c == '/') return path.slice(1);
            if (c == '.') return require.normalize(p, path);

            // resolve deps by returning
            // the dep in the nearest "deps"
            // directory
            var segs = parent.split('/');
            var i = lastIndexOf(segs, 'deps') + 1;
            if (!i) i = 0;
            path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
            return path;
        };

        /**
         * Check if module is defined at `path`.
         */

        localRequire.exists = function (path) {
            return require.modules.hasOwnProperty(localRequire.resolve(path));
        };

        return localRequire;
    };
    require.register("component-classes/index.js", function (exports, require, module) {
        /**
         * Module dependencies.
         */

        var index = require('indexof');

        /**
         * Whitespace regexp.
         */

        var re = /\s+/;

        /**
         * toString reference.
         */

        var toString = Object.prototype.toString;

        /**
         * Wrap `el` in a `ClassList`.
         *
         * @param {Element} el
         * @return {ClassList}
         * @api public
         */

        module.exports = function (el) {
            return new ClassList(el);
        };

        /**
         * Initialize a new ClassList for `el`.
         *
         * @param {Element} el
         * @api private
         */

        function ClassList(el) {
            if (!el) throw new Error('A DOM element reference is required');
            this.el = el;
            this.list = el.classList;
        }

        /**
         * Add class `name` if not already present.
         *
         * @param {String} name
         * @return {ClassList}
         * @api public
         */

        ClassList.prototype.add = function (name) {
            // classList
            if (this.list) {
                this.list.add(name);
                return this;
            }

            // fallback
            var arr = this.array();
            var i = index(arr, name);
            if (!~i) arr.push(name);
            this.el.className = arr.join(' ');
            return this;
        };

        /**
         * Remove class `name` when present, or
         * pass a regular expression to remove
         * any which match.
         *
         * @param {String|RegExp} name
         * @return {ClassList}
         * @api public
         */

        ClassList.prototype.remove = function (name) {
            if (toString.call(name) == '[object RegExp]') {
                return this.removeMatching(name);
            }

            // classList
            if (this.list) {
                this.list.remove(name);
                return this;
            }

            // fallback
            var arr = this.array();
            var i = index(arr, name);
            if (~i) arr.splice(i, 1);
            this.el.className = arr.join(' ');
            return this;
        };

        /**
         * Remove all classes matching `re`.
         *
         * @param {RegExp} re
         * @return {ClassList}
         * @api private
         */

        ClassList.prototype.removeMatching = function (re) {
            var arr = this.array();
            for (var i = 0; i < arr.length; i++) {
                if (re.test(arr[i])) {
                    this.remove(arr[i]);
                }
            }
            return this;
        };

        /**
         * Toggle class `name`, can force state via `force`.
         *
         * For browsers that support classList, but do not support `force` yet,
         * the mistake will be detected and corrected.
         *
         * @param {String} name
         * @param {Boolean} force
         * @return {ClassList}
         * @api public
         */

        ClassList.prototype.toggle = function (name, force) {
            // classList
            if (this.list) {
                if (typeof force !== "undefined") {
                    if (force !== this.list.toggle(name, force)) {
                        this.list.toggle(name); // toggle again to correct
                    }
                } else {
                    this.list.toggle(name);
                }
                return this;
            }

            // fallback
            if (typeof force !== "undefined") {
                if (!force) {
                    this.remove(name);
                } else {
                    this.add(name);
                }
            } else {
                if (this.has(name)) {
                    this.remove(name);
                } else {
                    this.add(name);
                }
            }

            return this;
        };

        /**
         * Return an array of classes.
         *
         * @return {Array}
         * @api public
         */

        ClassList.prototype.array = function () {
            var str = this.el.className.replace(/^\s+|\s+$/g, '');
            var arr = str.split(re);
            if (arr[0] === '') arr.shift();
            return arr;
        };

        /**
         * Check if class `name` is present.
         *
         * @param {String} name
         * @return {ClassList}
         * @api public
         */

        ClassList.prototype.has =
            ClassList.prototype.contains = function (name) {
                return this.list ?
                    this.list.contains(name) :
                    !!~index(this.array(), name);
            };

    });
    require.register("component-event/index.js", function (exports, require, module) {
        var bind = window.addEventListener ? 'addEventListener' : 'attachEvent';
        var unbind = window.removeEventListener ? 'removeEventListener' : 'detachEvent';
        var prefix = bind !== 'addEventListener' ? 'on' : '';

        /**
         * Bind `el` event `type` to `fn`.
         *
         * @param {Element} el
         * @param {String} type
         * @param {Function} fn
         * @param {Boolean} capture
         * @return {Function}
         * @api public
         */

        exports.bind = function (el, type, fn, capture) {
            el[bind](prefix + type, fn, capture || false);
            return fn;
        };

        /**
         * Unbind `el` event `type`'s callback `fn`.
         *
         * @param {Element} el
         * @param {String} type
         * @param {Function} fn
         * @param {Boolean} capture
         * @return {Function}
         * @api public
         */

        exports.unbind = function (el, type, fn, capture) {
            el[unbind](prefix + type, fn, capture || false);
            return fn;
        };
    });
    require.register("component-indexof/index.js", function (exports, require, module) {
        module.exports = function (arr, obj) {
            if (arr.indexOf) return arr.indexOf(obj);
            for (var i = 0; i < arr.length; ++i) {
                if (arr[i] === obj) return i;
            }
            return -1;
        };
    });
    require.register("list.extendedpagination.js/index.js", function (exports, require, module) {
        var classes = require('classes');

        module.exports = function (options) {
            options = options || {};

            var pagingList,
                jumpSize,
                pageSize,
                totalListSize,
                currentPage,
                list;

            var listBuilder = options['listBuilder'] || 'undefined';

            // this needs to function in a similar manner to the existing pagination
            // the issue is, it also needs to fetch data via api calls and whatnot

            // the 'refresh' function sets up the pagination for an updated list:
            var refresh = function () {
                var item;
                var l = list.matchingItems.length;
                var index = list.i;
                var page = list.page;
                var pages = Math.ceil(l / page);
                var currentPage = Math.ceil((index / page));
                var innerWindow = options.innerWindow || 4;
                var left = 0;
                var right = 0;

                right = pages - right;
                pageSize = page;
                jumpSize = (innerWindow * 2) + 1;
                totalListSize = l;

                pagingList.clear();
                for (var i = 1; i <= pages; i++) {
                    var className = (currentPage === i) ? "active" : "";

                    //console.log(i, left, right, currentPage, (currentPage - innerWindow), (currentPage + innerWindow), className);

                    if (is.number(i, left, right, currentPage, innerWindow)) {
                        item = pagingList.add({
                            page: i,
                            dotted: false,
                            doubleArrow: false
                        })[0];

                        if (className) {
                            classes(item.elm).add(className);
                        }
                        addEvent($(item.elm), i, page);
                    } else if (is.doubleArrowLeft(i, left, right, currentPage, innerWindow, pagingList.size())) {
                        item = pagingList.add({
                            page: "<<",
                            dotted: false,
                            doubleArrow: true
                        })[0];
                        // the double arrows are selected by this class
                        // TODO: selecting by class means we can't have two of these pagination lists on one page
                        classes(item.elm).add("doubleArrowLeft");
                    } else if (is.doubleArrowRight(i, left, right, currentPage, innerWindow, pagingList.size())) {
                        item = pagingList.add({
                            page: ">>",
                            dotted: false,
                            doubleArrow: true
                        })[0];
                        classes(item.elm).add("doubleArrowRight");
                    }
                }

                if (pagingList.size() && is.finalDoubleArrowRight(pagingList.size())) {
                    item = pagingList.add({
                        page: '>>',
                        dotted: false,
                        doubleArrow: true
                    })[0];
                    classes(item.elm).add("doubleArrowRight");
                }

                // make sure list updates also refresh the links for the jump events
                refreshJump();
            };

            var is = {
                number: function (i, left, right, currentPage, innerWindow) {
                    return this.left(i, left) || this.right(i, right) || this.innerWindow(i, currentPage, innerWindow);
                },
                left: function (i, left) {
                    return (i <= left);
                },
                right: function (i, right) {
                    return (i > right);
                },
                innerWindow: function (i, currentPage, innerWindow) {
                    return (i >= (currentPage - innerWindow) && i <= (currentPage + innerWindow));
                },
                doubleArrow: function (i, left, right, currentPage, innerWindow, currentPageItem) {
                    return this.doubleArrowRight(i, left, right, currentPage, innerWindow, currentPageItem) || this.doubleArrowLeft(i, left, right, currentPage, innerWindow, currentPageItem);
                },
                doubleArrowLeft: function (i, left, right, currentPage, innerWindow) {
                    return ((i == (left + 1)) && !this.innerWindow(i, currentPage, innerWindow) && !this.right(i, right));
                },
                doubleArrowRight: function (i, left, right, currentPage, innerWindow, currentPageItem) {
                    if (pagingList.items[currentPageItem - 1].values().doubleArrow) {
                        return false;
                    } else {
                        return ((i == (right)) && !this.innerWindow(i, currentPage, innerWindow) && !this.right(i, right));
                    }
                },
                finalDoubleArrowRight: function (currentPageItem) {
                    if (pagingList.items[currentPageItem - 1].values().doubleArrow) {
                        return false;
                    } else {
                        return (!list.isComplete && typeof list.listBuilder == 'function');
                    }
                }
            };

            var addEvent = function (elm, i, page) {
                elm.on('click', function () {
                    list.show((i - 1) * page + 1, page);
                    sessionStorage.setItem('currentSearchItem', list.i);
                    list.pageChange();
                    updateCurrentPage();
                });
            };

            // A little strange here:
            // To ensure the doubleArrow button behavior is consistent, the event handler is divorced
            // from the specific implementation.
            // TODO: by selecting via a generic class name, this plugin cannot be used more than once per page

            // first, a function to grab the currently selected page
            // needed because, unlike the regular page numbers, the double arrow is a dynamic link
            var updateCurrentPage = function () {
                var index = list.i;
                currentPage = Math.ceil((index / pageSize));
            };

            // removes the dated event handler, and adds a new one with the proper links
            var refreshJump = function () {
                var $doubleArrowForward = $('li.doubleArrowRight > a.page');
                var $doubleArrowBack = $('li.doubleArrowLeft > a.page');

                // remove current handlers, as their references are no longer correct
                $doubleArrowForward.off();
                $doubleArrowBack.off();

                // make sure the current page is correct:
                updateCurrentPage();

                $doubleArrowForward.on('click', function () {
                    jump(currentPage, true);
                });
                $doubleArrowBack.on('click', function () {
                    jump(currentPage, false);
                });
            };

            var jump = function (currentPage, forward) {
                // actually jump to the desired page
                var currentIndex = (currentPage - 1) * pageSize + 1;
                // to actually jump, we use the item index, so convert the page jump size to an indexJumpSize
                var indexJumpSize = (pageSize * jumpSize);
                var newIndex;
                if (!forward) {
                    // going back is easy, but first check to make sure we wouldn't go out of bounds
                    newIndex = (currentIndex - indexJumpSize) <= 0 ? 1 : currentIndex - indexJumpSize;
                } else {
                    // going forward is a little more complex
                    newIndex = currentIndex + indexJumpSize;
                    if (newIndex >= totalListSize) {
                        // we're trying to access more data than we have
                        if ((list.isComplete !== true) && typeof list.listBuilder == 'function') {
                            return list.fetch();
                        }
                        newIndex = totalListSize - (totalListSize % pageSize) + 1;
                    }
                }

                // whatever else is done, go ahead and show the desired page
                list.show(newIndex, pageSize);
                list.pageChange();
                sessionStorage.setItem('currentSearchItem', newIndex);
                // remove the initial event handler
                refreshJump();
            };

            return {
                init: function (parentList) {
                    list = parentList;
                    pagingList = new List(list.listContainer.id, {
                        listClass: options.paginationClass || 'extendedpagination',
                        item: "<li><a class='page' href='javascript:function Z(){Z=\"\"}Z()'></a></li>",
                        valueNames: ['page', 'dotted', 'doubleArrow'],
                        searchClass: 'pagination-search-that-is-not-supposed-to-exist',
                        sortClass: 'pagination-sort-that-is-not-supposed-to-exist'
                    });
                    list.on('updated', refresh);
                    refresh();
                },
                name: options.name || "extendedpagination"
            };
        };
    });

    require.alias("component-classes/index.js", "list.extendedpagination.js/deps/classes/index.js");
    require.alias("component-classes/index.js", "classes/index.js");
    require.alias("component-indexof/index.js", "component-classes/deps/indexof/index.js");

    require.alias("component-event/index.js", "list.extendedpagination.js/deps/event/index.js");
    require.alias("component-event/index.js", "event/index.js");

    require.alias("component-indexof/index.js", "list.extendedpagination.js/deps/indexof/index.js");
    require.alias("component-indexof/index.js", "indexof/index.js");

    require.alias("list.extendedpagination.js/index.js", "list.extendedpagination.js/index.js");
    if (typeof exports == "object") {
        module.exports = require("list.extendedpagination.js");
    } else if (typeof define == "function" && define.amd) {
        define(function () {
            return require("list.extendedpagination.js");
        });
    } else {
        this["ListExtendedPagination"] = require("list.extendedpagination.js");
    }
})();
