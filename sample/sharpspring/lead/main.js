(function($, app) {

    var version = '1.110'; // for cache busting
    var windowHeight = $(window).height();
    var windowWidth = $(window).width();
    var helpOverlays = window.helpOverlays || false;

    // on ready
    $(function() {

        $("body").removeClass("loading");
        $(window).unload(function() {
            $("body").addClass("loading");
        });

        var ajaxCount = 0;
        var ajaxLoaderHide = _.debounce(function() {
            if (ajaxCount == 0) {
                $("body").removeClass("loading-ajax");
                $('#page-ajax-loading-indicator').hide();
            }
        }, 500);


        _.sub('api.loading', function(req) {
            ajaxCount++;
            $("body").addClass("loading-ajax");
            $('#page-ajax-loading-indicator').show();
        });

        _.sub('api.loaded', function(req) {
            ajaxCount--;
            if (!ajaxCount) {
                ajaxLoaderHide();
            }
        });

        // Enable the sidebar
        if ($('#sideBar').is('.sidebar-fixed')) {
            app.modules.sidebar = new Sidebar({});
        }

        // Setup momentjs
        app.localesReady.done(function setupMoment() {
            moment.locale(app.locale);
        });

        /*
         *
         *        Prevent Defaults
         *
         */
        var keyStop = {
            8: ":not(:focus)", // stop backspace = back
            13: "input:text, input:password", // stop enter = submit
            end: null
        };

        $(document).bind("keydown", function(event) {
            var selector = keyStop[event.which];
            var $el = $(event.target);
            var $parent = $el.parent();

            if (selector !== undefined && $el.is(selector) && $el.is(':not(.submitOnEnter)') && $parent.is(':not(.bootstrap-tagsinput)')) {
                event.preventDefault(); //stop event
            }
            return true;
        });


        /*
         *
         *      Parseable Links
         *
         */

        var dynamicUrlRegex = /({([^{.]*)})/gi;
        $('body').on('click', 'a.parseURL', function(ev) {
            var $el = $(ev.target);
            var href = $el.attr('data-href');
            var match = null, data = null;

            dynamicUrlRegex.lastIndex = 0;

            while (match = dynamicUrlRegex.exec(href)) {
                data = $el.attr(match[2]);
                href = href.replace(match[0], data);
            }
            location = href;
        });

        var dataAttrRegex = /^data-(.*)/i;
        $('body').on('click', '[data-bind]', function(ev) {
            var bind = $(ev.target).attr('data-bind').split('=');

            if (dataAttrRegex.test(bind[0])) {
                $('[' + bind[0] + ']').attr(bind[0], bind[1]);
            } else {
                $( bind[0] ).text(bind[1]);
            }

        });


        /*
         *
         *      Tooltips & Popouts
         *
         */


        $('body').on('click', '.popover-close', function(ev) {
            $('.popover').remove();
        });


        // Tooltips
        $('body').on('mouseenter', '.tip', function(ev) {
            var $tip = $(ev.target).closest('.tip');
            var placement = $tip.attr('data-placement') || 'top';
            var classes = $tip.attr('data-classes') || '';

            if (!$tip.data('tooltip')) {
                $tip.tooltip({placement: placement, classes: classes, trigger:'manual'});
            }

            if ($tip.data('tip-timeout')) { clearTimeout(parseInt($tip.attr('data-tip-timeout'), 10)); }
            $tip.tooltip('show');

            // Set a timeout for much later
            $tip.attr('data-tip-timeout', setTimeout(function(){
                $tip.tooltip('hide');
            }, 1000 * 60));

        });

        $('body').on('mouseleave', '.tip', function(ev) {

            var $tip = $(ev.target).closest('.tip');
            if ($tip.data('tooltip')) {

                $tip.attr('data-tip-timeout', setTimeout(function(){
                    $tip.tooltip('hide');
                }, 50));

            }

        });

        // Popovers
        $('body').on('mouseover', '.popout', function(ev){

            $tip = $(this);
            var trigger = $tip.attr('data-trigger') || 'hover';
            var placement = $tip.attr('data-placement') || 'top';

            if (!$tip.is('.popover-created')) {
                var content = $tip.find('.popout-content').html();
                var popout = $tip.popover({trigger: trigger, content: content, placement: placement});

                $tip.addClass('popover-created');
                if (trigger === 'hover') {
                    $tip.popover('show');
                }

            }

        });

        $('body').on('click', '.popout-click', function(ev) {
            ev.stopImmediatePropagation();
            var $tip = $(this);

            if (!$tip.is('.popover-open')) {
                $('.popover.in').remove();
                var content = $tip.find('.popout-content').html();
                var popout = $tip.popover({trigger: 'click', content: content, html: true});
                $tip.addClass('popover-open');
                $tip.popover('show');
            } else {
                $tip.removeClass('popover-open');
                $tip.popover('hide');
            }
        });

        $('body').on('click', function(ev) {
            $link = $('.popover-open');
            $content = $('.popout-content');

            if($link[0] && $(this) != $content) {
                $link.removeClass('popover-open');
                $link.popover('hide');
            }
        });


        /*
         *
         *      Fixed Panels
         *
         */

        var scrollSafeDelta = 50;
        var bodyTop = parseInt($('body').css('padding-top'), 10);

        var affixBlock = function(index, el) {

            var windowPos = $(window).scrollTop();
            var $affix = $(this);
            var $affixedTo = $affix.closest('.affixTo') || $('body');

            var originalPos = $affix.attr('data-original-position');
            var originalWidth = $affix.attr('data-original-width');

            if (!($affix.attr('position') === 'fixed') && !parseInt(originalWidth, 10) && $affix.is(':visible')) {
                originalPos = $affix.offset().top;
                originalWidth = $affix.width();

                $affix.attr('data-original-position', originalPos);
                $affix.attr('data-original-width', originalWidth);

                if ($affix.is('tr')) {
                    var $td;
                    $affix.children().each(function() {
                        $td = $(this);
                        $td.outerWidth($td.outerWidth());
                    });
                }
            }


            //console.warn(windowPos, originalPos, $(window).height(), $affix.outerHeight(), $affixedTo.height(), $affixedTo);
            //console.warn(windowPos > originalPos, $(window).height() > $affix.outerHeight(), $affix.height() < $affixedTo.height());

            // TODO: Allow affixed item to scroll out of view when the affixedTo is scrolled out of view
            if ($(window).height() > ($affix.outerHeight() + scrollSafeDelta) && (windowPos + bodyTop) > originalPos && $affix.outerHeight() < $affixedTo.height() - scrollSafeDelta) {
                $affix.parent().css('min-height', $affix.height() + originalPos); // if this item was used to determine the height of the page
                $affix.css({position: 'fixed', top: bodyTop + 20 , 'width': originalWidth }).addClass('fixed');
            } else {
                $affix.css({position: 'relative', top: 0}).removeClass('fixed');
            }

        };

        $(window).on('scroll', function() {
            $('.affix').each(affixBlock);
        });


        /*
         *
         *      ScrollTo Navigation (ScrollSpy)
         *      Can only have one per screen
         *
         */

        var scrollSpy = function(ev) {

            if (!$('.scrollspy').length) {
                return;
            }

            $el = $(this);

            var windowPos = $(window).scrollTop();
            var scrollHeight = document.body.scrollHeight;
            var $nav = $('.scrolltarget:visible', '.scrollspy');
            var $active = null, $anchor, link;
            var $topOffset = $($nav.get(0)).offset().top;
            var offset, nextOffset;

            $active = $($nav.get(0));

            if ( windowPos >= scrollHeight - $(window).height() ) {
                $active = $($nav.last());
            } else {

                for (var i=$nav.length-1; i > 0; i--) {
                    $anchor = $($nav.get(i));

                    $target = $($anchor.attr('href'));
                    offset = $target.offset();

                    $prevTarget = (i == 0) ? null : $($($nav.get(i-1)).attr('href'));
                    nextOffset = $prevTarget ? $prevTarget.offset() : 0;

                    if (windowPos <= offset.top + $target.height() && (!$prevTarget || windowPos > nextOffset.top + $target.height())) {
                        $active = $anchor;
                        break;
                    }
                }
            }

            $target = $($active.attr('href'));
            changeHash($active.attr('href')); // change hash but don't move the page
            $target.addClass('active').siblings('.active').removeClass('active');
            $active.closest('li').addClass('active').siblings().removeClass('active');
        };

        $('body').on('click', '.scrolltarget', function(ev) {
            ev.preventDefault();

            var target = $(ev.target).closest('.scrolltarget').attr('href');
            var offsetTop = $(this).attr('data-offset-top') ? parseInt($(this).attr('data-offset-top'), 10) : 0;
            $(window).scrollTo(target, 700, {offset: {top: offsetTop, left: 0}});

            return false;
        });

        if ($('.scrollspy')) {
            $(window).on('scroll', scrollSpy);
        }

        // Changes the hash without moving the page
        var changeHash = function (hash) {

            if (!hash) { return; }

            hash = hash.replace( /^#/, '' );
            var fx, node = $( '#' + hash );
            if ( node.length ) {
                node.attr( 'id', '' );
                fx = $( '<div></div>' )
                    .css({
                        position:'absolute',
                        visibility:'hidden',
                        top: $(window).scrollTop() + 'px'
                    })
                    .attr( 'id', hash )
                    .appendTo( document.body );
            }
            document.location.hash = hash;
            if ( node.length ) {
                fx.remove();
                node.attr( 'id', hash );
            }

            $('body').trigger('location.hash.change', hash);
        };


        /*
         *
         *      Scrollable Regions
         *
         */

        var resizeScrollbars = _.debounce(function(ev) {
            windowHeight = $(window).height();
            windowWidth = $(window).width();

            $('.scrollable').each(function(i, el) {
                var $el = $(el);
                var data = $el.data();
                var $viewport = $('.viewport', $el);
                var scrollY = typeof window.scrollY == 'undefined' ? 0 : window.scrollY;
                var spaceAtBottom = 0;

                $('.overview', $viewport).css({'top':0}); // reset position

                if (data.spaceAtBottom) {
                    spaceAtBottom = parseInt(data.spaceAtBottom, 10);
                }

                $viewport.height((windowHeight - $viewport.offset().top + scrollY - spaceAtBottom));

                if ($el.data('tsb')) {
                    $el.tinyscrollbar_update('relative');
                } else {
                    $el.tinyscrollbar();
                }

            });
        }, 100);

        $(window).resize(resizeScrollbars);

        $('.scrollable').each(function(i, el) {

            var $el = $(el);
            var $viewport = $('.viewport', $el);
            var $parent = $el.parent();

            var spaceAtBottom = Math.max(0, Math.min(0, $parent.height() - $viewport.height()));
            $viewport.height((windowHeight - $viewport.offset().top + window.scrollY - spaceAtBottom));

            $el.tinyscrollbar();
        });


        /*
         *
         *      Help Panel
         *
         */

        $('.helpPanel-close').on('click', function(ev) {

            if ($('#helpPanel').css('top') != '0px') {
                $('#helpPanel').stop().animate({top: 0}, 80);
            } else {
                $('#helpPanel').stop().animate({top: -190}, 80);
            }

        });

        /*
         *
         *      Show Landing Pages
         *
         */

        $('body').on('click', '.show-landing', function (ev) {
            // ev.preventDefault();
            var $el = $(this);
            var $pages = $el.parent().siblings('.cpn-pages');

            // $pages.toggleClass('open');
            $pages.slideToggle().toggleClass('open');
        });


        /*
         *
         *      Notifications
         *
         */
        var notificationSound;
        var notificationTpl = $('#page_notification_tpl').text();
        var showNotification = function(info, data) {

            if (!_.isFunction(notificationTpl)) {
                notificationTpl = _.template(notificationTpl);
            }

            var info = $.extend({autohide: true, title: null, message: null, lifetime: 5000, sound: false}, info);
            var notification = notificationTpl(info);

            if (data) {
                notification = _.template(notification)(data); // if the message needs to parse data
            }

            if (info.sound) {
                if (notificationSound && !notificationSound.ended) { notificationSound.pause(); }
                var admins = [941, 12, 45, 214, 911];
                notificationSound = new Audio("/includes/sounds/popup.wav"); // buffers automatically when created
                notificationSound.play();
            }

            notification = $(notification);

            $('#pageNotifications').append(notification);
            notification.fadeIn(200).delay(100).fadeIn(100);

            if (info.autohide) {
                notification.delay(info.lifetime).slideUp(100, function() { $(this).remove(); });
            }
            return notification;
        };

        $('body').on('click', '#openTaskBarNotificationLink', function(ev) {
            $el = $(this);
            $notice = $el.closest('.page-notification');
            $('#schedulerButton').click();
            $('.notification-close', $notice).click();
        });

        var showApiErrors = function(data) {

            var hasErrors = false, error, err;
            if (data && data.errors) {

                for (var index in data.errors) {

                    if (data.errors.hasOwnProperty(index)) {
                        error = data.errors[index];

                        if (_.isString(error)) {
                            showNotification({ message: error });
                            hasErrors = true;
                        } else {

                            for (var errKey in error) {

                                err = error[errKey];

                                if (_.isObject(err) && err.message && err.data) {
                                    showNotification({ autohide: false, message: err.message }, err );
                                } else {
                                    showNotification({ message: err });
                                }

                                hasErrors = true;
                            }
                        }
                    }
                }
            }

            return hasErrors;
        };

        $('#pageNotifications').on('click', 'a.notification-close', function(ev) {
            $a = $(ev.target);

            $notification = $a.closest('.page-notification');
            $notification.stop().slideUp(200, function() { $(this).remove(); });
        });

        var showFlashMessage = function(msg, isError) {
            var $el = $('.site-flash');
            if ($el.length) {
                if (isError && !$el.hasClass('error')) {
                    $el.removeClass('help').addClass('error');
                } else if (!isError && !$el.hasClass('help')) {
                    $el.removeClass('error').addClass('help');
                }
                $el.show().text(msg);
                return;
            }
            $el = '<div class="site-flash ' + (isError ? 'error' : 'help') + '">' + msg + '</div>';
            $('.manager-section').after($el);
        };

        /*
         *
         *      Modals
         *
         */

        var modalQueue = [];
        var queueModal = function(modal, opts) {
            modal = $(modal);
            opts = opts || {};

            if ($('.modal.in').length) {
                modalQueue.push(modal);
            } else {
                modal.modal('show');
            }

            modal.on('hidden', function () {
                var lastModal = modalQueue.pop();
                if (lastModal) {
                    queueModal(lastModal);
                }

                modal.empty().remove();

                if (_.isFunction(opts.closeCallback)) {
                    opts.closeCallback(opts.callbackParams || null);
                }
            });

            if (_.isFunction(opts.readyCallback)) {
                opts.readyCallback(modal);
            }

            return modal;
        };

        var showModal = window.showModal = function(url, opts) {
            if (!_.isObject(opts)) {
                // Legacy conversion. clickToClose used to be the only option available to this function, so treat any
                // non-object as that individual option
                opts = {clickToClose: !!opts};
            }

            $.get(url, function(data, textStatus, jqXHR) {
                if (jqXHR.getResponseHeader("X-Login")) {
                    location.replace('/');
                }

                var $modal = $(data);
                var className = url.replace(/[\/]/g, '-').substr(1);
                var shown = false;

                if ($modal.length > 1 || !$modal.is('div') || !$modal.hasClass('modal')) {
                    $modal = $('<div class="modal hide fade ' + className + '" ' + (opts.clickToClose ? 'data-keyboard="false" data-backdrop="static"' : '') + ' ></div>').append($modal);
                } else {
                    $modal.addClass(className);
                }

                $modal.on('shown', function() {
                    if (!shown) {
                        $('.modal input:text:visible:first:not(.noautofocus)').focus();
                        $('body').trigger('modal-loaded', [url]);
                        shown = !shown;
                    }
                });

                queueModal($modal, opts);
            });
        };

        var callbackModal = function(html, onCloseCallback) {
            var modal = $(html);
            queueModal(modal, {closeCallback: onCloseCallback});
        };

        var confirmTpl = $('#confirmTpl').text();

        var confirmModal = function(data, callback, onClose) {
            if (!_.isFunction(confirmTpl)) {
                confirmTpl = _.template(confirmTpl);
            }
            data = $.extend({
                confirmText: t('settings_settingsemailmonitor_ok'),
                title: t('settings_settingsemailmonitor_areyousure'),
                message: t('no_undo'),
                danger: 1,
                clickToClose: 0,
                needsFeedback: 0,
                feedbackLabel: t('feedback'),
                cancel: t('btn_cancel'),
                typeConfirm: false,
                dataPass: false // data to pass through to the callback function
            }, data);

            var modal = $(confirmTpl(data));
            queueModal(modal);

            if (typeof onClose == 'function') {
                modal.on('hidden', onClose);
            }

            modal.on('click', '.confirm', function(ev) {
                callback(ev, data.dataPass);
                modal.modal('hide');
            });

            if (data.typeConfirm) {
                var confirm = t('confirm_confirm');
                $('.confirm-soconfirmed').keyup(function() {
                    var isConfirmed = this.value.trim().toUpperCase() === confirm.toUpperCase();
                    modal.find('button.confirm').prop('disabled', !isConfirmed);
                });
            }
            return modal;
        };


        $('body').on('click', 'a.modal-link', function(ev) {
            ev.preventDefault();
            var url = $(ev.currentTarget).attr('href');
            if (url.indexOf('#') == 0) {
                queueModal($(url));
            } else {
                showModal(url);
            }
        });

        $('body').on('click', 'a.page-modal-link', function(ev) {
            ev.preventDefault();
            var url = $(ev.currentTarget).attr('href');
            if (url.indexOf('#') == 0) {
                showPageModal($(url));
            } else {

                getPageContents(url).done(function(data, textStatus, jqXHR) {
                    showPageModal(data);
                });

            }
        });

        var getPageContents = function(url) {
            return $.get(url, function(data, textStatus, jqXHR) {
                if (jqXHR.getResponseHeader("X-Login")) {
                    location.replace('/');
                }
            });
        }

        // Page modals
        var showPageModal = function(html) {

            app.ignoreHashChange = true;

            html = _.isString(html) ? $.trim(html) : html;
            var $html = $(html);

            if (!$html.is('.modal')) {
                $html.wrap('<div class="modal"></div>');
            }

            $('#full_page_modal_content').html($html);

            if (!$('#full_page_modal').is('.open')) {
                $('#full_page_modal').addClass('open').hide().fadeIn(250);
            }

            $('body').addClass('page-modal-open');
            _.pub('page.modal.open', {});

            return $html;
        };

        var openPageModal = function(url) {
            $.get(url, function(data) {
                utils.showPageModal(data);
            });
        };

        var pageMessage = 'You have unsaved changes. Press OK to go back and save them. Press Cancel to discard your changes and leave the page.';
        var dismissPageModal = function(suppressWarning) {

            if (suppressWarning === true || !_.pageHasChanges || !confirm(pageMessage)) {

                if (!suppressWarning) { _.preventPageChange(false); }

                $('body').removeClass('page-modal-open trueFullPageModal');
                $('#full_page_modal').removeClass('open').fadeOut(500);
                $('#full_page_modal_content').html('');

                $('#full_page_modal').trigger('hidden');
                if (location.hash.length) {
                    location.hash = '';
                };

            }

        };

        var dismissModal = function(suppressWarning) {

            if (suppressWarning === true || !_.pageHasChanges || !confirm(pageMessage)) {

                if (!suppressWarning) { _.preventPageChange(false); }

                $('body').removeClass('modal-open');
                $('.modal').fadeOut(500).remove();
                $('.modal-backdrop').fadeOut(500).remove();

            }

        };

        $('#full_page_modal .close').on('click', dismissPageModal);
        $('#full_page_modal').on('click', '[data-dismiss=modal]', dismissPageModal);

        $('body').on('click', '#sendDuplicate', function(e) {
            var $target = $(e.target);
            if ($target.is(':checked')) {
                $('#sendDuplicatesWarning').hide();
                return;
            }
            $('#sendDuplicatesWarning').show();
        });

        /*
         *
         *      Player Controls
         *
         */
        var twilioRecordingURL = function(accountSID, recordingSID) {

            return 'http://api.twilio.com/2010-04-01/Accounts/' + accountSID + '/Recordings/' + recordingSID + '.mp3';

        }

        var player = null;
        $('body').on('click', '.playTip_icon', function(ev) {
            ev.preventDefault();

            try {
                var url = this.href;
                var title = $(this).attr('data-rec-title') || 'Unknown';


                $('#playerControls').css({'bottom': -120}).show();
                $('#flashControls').show();

                if (!player) {
                    var flashvars = {'fileLocation': encodeURIComponent(url), 'fileName': encodeURIComponent(title)};
                    var params = {"wmode": "transparent"};
                    player = swfobject.embedSWF("/includes/flash/player.swf?fileLocation=" + encodeURIComponent(url)
                        + '&fileName=' + encodeURIComponent(title),
                        "flashControls", "300", "120", "10", null, flashvars, params);

                    $('#playerControls').delay(1000).animate({bottom: 0}, 250);
                }
            } catch (error) { console.warn('embed failure', error); }

            return false;
        });

        $('#player_close').click(hideControls);

        function hideControls() {
            $('#playerControls').delay(500).animate({'bottom': -120}, 250, 'linear', function(){ $('#flashControls').hide(); });
        }


        /*
         *
         *      Video Launcher
         *
         */

        function changeVideo(video) {

            var loading = $('#videoLoading');
            var iframe = $('#videoContainer iframe');

            loading.show();
            iframe.attr("src", "https://player.vimeo.com/video/" + video);
            iframe.load( function () {
                loading.hide();
            });
        }

        function isActive (ev) {
            var tabs = $('.change-video');
            var el = $(ev.currentTarget);

            tabs.removeClass('active');
            el.addClass('active');
        }

        var extractFormData = function(form) {
            var $form = form instanceof jQuery ? form : $(form),
                formData = $form.serializeArray(),
                params = {},
                i = 0;

            for (; i < formData.length; i++) {
                params[formData[i].name] = formData[i].value;
            }

            return params;
        };

        $('body').on('click', '.change-video-set', function (ev) {
            ev.preventDefault();

            var el = $(ev.currentTarget);
            var set = el.attr('id');

            if (set == 'setupVideos') {
                changeVideo('66355915');
                $('.change-video').removeClass('active');
                $('#setupVisitorIDVideo').addClass('active');
            }

            if (set == 'overviewVideos') {
                changeVideo('66322506');
                $('.change-video').removeClass('active');
                $('#overviewInsightsVideo').addClass('active');
            }


        });

        $('body').on('click', '.change-video', function (ev) {
            var el = $(ev.currentTarget);
            var video = el.attr('id');
            var videoID;

            switch(video) {

                case 'setupFormsVideo':
                    videoID = '84712254';
                    break;

                case 'setupVisitorIDVideo':
                    videoID = '65052600';
                    break;

                case 'setupCampaignsVideo':
                    videoID = '66355917';
                    break;

                case 'setupUsersVideo':
                    videoID = '66355914';
                    break;

                case 'setupLeadVideo':
                    videoID = '84418596';
                    break;

                case 'setupLeadsVideo':
                    videoID = '84418479';
                    break;

                case 'setupEmailsVideo':
                    videoID = '84417770';
                    break;

            }

            if (videoID) {
                changeVideo(videoID);
                isActive(ev);
            }

        });

        // Hide on start
        $('body').on('click', '#toggleIntroVideo', function(ev) {
            var checked = $('#toggleIntroVideo').is(':checked');
            var btn = $('#confirmDontShow');
            api.setIntroVideoToggle(checked, function(){ /*console.log('Please hide this?', checked);*/ });

            if (checked) {
                btn.removeClass('hide');
            } else {
                btn.addClass('hide');
            }
        });

        /*
         *
         *      Form Previews
         *
         */

        var handleMessage = function(ev) {

            var data = ev.data;

            if (data && data.formID && data.formID && (iframe = document.getElementById('ssf_' + data.formID))) {

                iframe.height = data.height || iframe.height;

                // Go at least to layers up to make sure they adjust to the iframe size
                if (iframe.parentNode) {
                    iframe.parentNode.style.minHeight = data.height + 'px';
                    if (iframe.parentNode.parentNode) {
                        iframe.parentNode.parentNode.style.minHeight = data.height + 'px';
                    }
                }

            }

        };

        if(typeof window.addEventListener != 'undefined') {
            window.addEventListener('message', handleMessage, false);
        }
        else if(typeof window.attachEvent != 'undefined') {
            window.attachEvent('onmessage', handleMessage);
        }



        /*
         *
         *      Buttons
         *
         */
        $('body').on('click.button.data-api', '[data-toggle^=button]', function (ev) {

            ev.preventDefault();
            ev.stopImmediatePropagation();

            var $btn = $(ev.target);
            if (!$btn.hasClass('btn')) {
                $btn = $btn.closest('.btn,.tab,.filter');
            }

            var $parent = $btn.parent('[data-toggle="buttons-radio"]');
            $parent && $parent.find('.active').removeClass('active');

            var $li = $btn.parent('li');
            if ($li.length) {
                $li.addClass('active').siblings().removeClass('active');
            }

            $btn.toggleClass('active');
            $btn.trigger('btn-change', [$btn.attr('data-value'), $btn.hasClass('active')]);

        });

        $('body').on('click.button.toggle','[data-toggle=block]', function(ev) {
            ev.preventDefault();
            var $btn = $(ev.target);
            $btn = $btn.closest('a');
            $btn.toggleClass('open');

            var displayMode = $btn.attr('data-display') || 'block';
            var toggleAction = $btn.attr('data-toggle-action') || 'slideToggle';

            var $link = $($btn.attr('href'));

            if ($link.is(':visible')) {
                (toggleAction == 'slideToggle') ? $link.slideToggle('fast') : $link.hide();
            } else {
                (toggleAction == 'slideToggle') ? $link.slideToggle('fast').css('display', displayMode) : $link.show().css('display', displayMode);
            }

        });


        // Accordians
        $('body').on('click', 'a.list-heading', function (ev) {
            var $this = $(this);
            var $icon = $this.children('i.toggle');
            if ($this.hasClass('collapsed')) {
                $icon.removeClass('icon-caret-down').addClass('icon-caret-up');
            } else {
                $icon.removeClass('icon-caret-up').addClass('icon-caret-down');
            }
        });

        $('body').on('hidden', '.collapse', function(ev) {
            $scrollable = $(ev.target).closest('.scrollable');
            if ($scrollable.length) {
                $scrollable.tinyscrollbar_update('relative');
            }
        });

        $('body').on('shown', '.collapse', function(ev) {
            $scrollable = $(ev.target).closest('.scrollable');
            if ($scrollable.length) {
                $scrollable.tinyscrollbar_update('relative');
            }
        });

        $('body').on('shown', '.nav-tabs li', function(ev) {
            $scrollable = $(ev.target).closest('.sidebar-content').find('.tab-pane.active .scrollable');
            if ($scrollable.length) {
                $scrollable.tinyscrollbar_update('relative');
            }
        });


        // Tabs
        $('body').on('click.button.data-api', '[data-toggle=tab]', function (ev) {
            ev.preventDefault();

            var $btn = $(ev.target);

            // Global var
            activeToggle = $btn.attr('id');

            if (!$btn.hasClass('btn')) {
                $btn = $btn.closest('.btn,.tab,a');
            }
            $btn.trigger('tab.btn.change');
            $btn.addClass('active').siblings().removeClass('active');


            $tab = $($btn.attr('href'));
            $tab.siblings().hide();
            $tab.show().addClass('active').siblings().removeClass('active');

            if (!$btn.hasClass('hide-history')) {
                changeHash($btn.attr('href'));
            }

            $tab.trigger('tab.change'); // trigger after the hash is ready
            $(window).resize();

        });

        // Tree
        $('body').on('click.button.tree', '[data-tree-toggle]', function(ev) {

            var $el = $(ev.target).closest('a');
            var $row = $el.closest('.tr');
            var rowClass = $el.attr('data-tree-toggle');
            var levelClass = $el.attr('data-tree-level');

            if ($row.next().is(':visible')) {
                $row.siblings(rowClass).addClass('hide');
            } else {
                $row.siblings(rowClass+levelClass).removeClass('hide');
            }

        });


        /*
         *
         *      Pager
         *
         */
        $('body').on('click', '.changePage', function(ev) {

            $pageButton = $(ev.target).closest('.page');
            var page = 0;
            var pageID = '.forPage-';
            var pageGroup = 0;


            if ($pageButton.is('.prev')) {
                $pageButton = $pageButton.nextUntil(':visible').last();
            } else if ($pageButton.is('.next')) {
                $pageButton = $pageButton.prevUntil(':visible').last();
            }

            page = $pageButton.attr('data-page');
            pageID += page;
            pageGroup = $pageButton.attr('data-page-group');

            $pageButton.siblings('.page-group' + pageGroup).show();
            $pageButton.siblings().not('.page-group' + pageGroup).hide();

            $pageButton.show().addClass('active');
            $pageButton.siblings().removeClass('active');


            $(pageID).addClass('show').siblings().not(pageID).removeClass('show');

        });

        // Make sure you're on the right page to start
        var changePageFromHash = function() {

            var page = 0;

            if (location.hash && location.hash.indexOf('/') == -1) {
                try {
                    // wow the hash value could be literally anything why do we assume it's a valid jquery identifier
                    $el = $(location.hash);
                } catch (e) {
                    return;
                }

                // Hide siblings if within a tab group
                if ($el.closest('.tabs').length) {
                    $el.show().siblings().hide();
                }

                $('a[href=' + location.hash+'],li[href=' + location.hash + ']').addClass('active').siblings().removeClass('active');
                $('a[href=' + location.hash+'],li[href=' + location.hash + ']').parent().addClass('active').siblings().removeClass('active');

                if ($el.is('.forPage')) {
                    page = $el.attr('data-page');

                    $button = $('.page[data-page=' + page + '] .changePage').trigger('click');
                }

            }

            $('body').trigger('location.hash.change', location.hash);

        };

        if (location.hash) {
            changePageFromHash();
        }


        /*
         *
         * Task Overlays
         *
         */
        var toggleSchedulerOpen = function() {
            $('#schedulerPullout').toggleClass('open');
        };
        $('body').on('click', '#schedulerButton, .scheduler-open, .scheduler-close', toggleSchedulerOpen);

        /*
         *
         * Help Overlays
         *
         */

        var $flyout = $('#helpFlyout');

        generateHelpOverlay = function(helpOverlays) {
            var item = null;

            for (var i=0; i < helpOverlays.length; i++) {
                item = helpOverlays[i];

                var itemData = item.introData || null;
                $(item.id).attr('data-intro', t(item.introKey, itemData)).attr('data-position',item.position || 'bottom');
            }
        };

        $('body').on('click', '#overlayHelp', function (ev) {
            ev.preventDefault();
            generateHelpOverlay(window['helpOverlays']);
            $('body').chardinJs('start');
            $flyout.toggleClass('open');
        });

        require(app.localeChain, function() {
            if (!helpOverlays || !helpOverlays.length) {
                $('#overlayHelp').addClass('hide');
            }
        });

        $('body').on('click', function (ev) {

            $el = $(ev.target);
            $btn = $el.closest('.toggleHelp');

            if (!$btn.length && !$el.closest('#helpFlyout').length) {
                $flyout.removeClass('open');
                $('.help-me').removeClass('open');
            }
        });

        $('body').on('click', '.toggleHelp', function (ev) {
            ev.preventDefault();
            $flyout.toggleClass('open');
            $('.help-me').toggleClass('open');
        });


        /*
         *
         *      Dropdowns
         *
         */
        var toggle = '[data-toggle="dropdown"]';
        var selectOption = 'a.dropdown-select';
        var $window = $(window);

        $('body').on('mouseover', '.dropdown-toggle', function() {

            var $el = $(this);
            var $dropdown = $el.siblings('.dropdown-menu');
            var offset = $el.offset();

            if (!$dropdown.hasClass('pull-right')) {
                if (offset.left + $dropdown.width() > windowWidth + $window.scrollLeft()) {
                    $dropdown.addClass('pull-right').removeClass('pull-left');
                } else {
                    $dropdown.removeClass('pull-right');
                }
            }
        });

        $('body').on('mouseover click', '.dropdown-submenu', function(ev) {
            ev.stopPropagation();

            var $el = $(this);
            var offset = $el.offset();

            if ((offset.left + $el.width()*2.5) > windowWidth + $window.scrollLeft()) {
                $(this).addClass('pull-left').removeClass('pull-right');
            }
        });


        $('body').on('click.dropdown.data-api', toggle, function(ev) {

            $this = $(this);
            if ($this.is('.disabled, :disabled'))  { return; }
            if ($(ev.currentTarget).is('input')) { return; }

            $parent = $this.parent();
            isActive = $parent.hasClass('open');
            clearMenus();
            if (!isActive) { $parent.toggleClass('open'); }

            return false;
        });

        function clearMenus(ev) {
            if (ev && ev.target && $(ev.target).closest('.btn-group.open').length && $(ev.target).is('input')) { return; }
            $(toggle).parent().removeClass('open');
        }


        $('body').on('click.dropdown.select', selectOption, function(ev) {
            $this = $(this);
            var text = $this.html();
            var parent = $this.closest('.btn-group');
            var value = $this.attr('data-value');
            var active = !$this.hasClass('active');
            var selected = (parent.attr('data-value') ? parent.attr('data-value').split(',') : []);
            var mulitselect = parent.hasClass('dropdown-multiselect');

            if (mulitselect && value.length) {
                $this.toggleClass('active', active);

                if (active) {
                    selected.push(value);
                } else {
                    selected = _.without(selected, value);
                    //text = parent.find('a.active').text();
                }

                if (selected.length > 1) {
                    parent.find('.dropdown-toggle .text').text('Multiple Selected');
                } else if (active) {
                    parent.find('.dropdown-toggle .text').text(text);
                }

                parent.attr('data-value', selected.join(','));

            } else {
                $this.parent().find('a').removeClass('active');
                parent.attr('data-value', value);
                parent.find('.dropdown-toggle .text').html(text);
            }

            $this.trigger('dropdown.select.change', [value, active, selected]);
        });

        $('html').on('click.dropdown.data-api', clearMenus);


        $('body').on('click', '.menu-collapse', function(ev) {
            ev.stopImmediatePropagation();
            $(this).closest('li').next().children().toggleClass('hide').css('display', '');
        });


        /*
         *
         *      Date range dropdown
         *
         */
        var customDateRanges = {
            'thisMonth': 'This Month', 'lastMonth': 'Last Month',
            'thisQuarter': 'This Quarter', 'lastQuarter': 'Last Quarter',
            'thisYear': 'This Year', 'lastYear': 'Last Year'
        };
        var dateFormat = 'mediumDate';

        setDateRangePicker = function(el, defaultFrom, defaultTo, hide) {
            var $el = $(el);
            $('.datepicker-calendar', $el).DatePickerSetDate([defaultFrom, defaultTo]);
            $el.find('.date-range-field .value').text(defaultFrom.format(dateFormat) +' - '+ defaultTo.format(dateFormat));
            if (hide) {
                $el.hide();
            }
        };

        initDateRangePicker = function(el, from, to, onChange, customRange, allTime) {
            var $el = $(el);
            allTime = allTime || false;

            // Saved date states
            var savedTo = to = to.addHours(12);
            var savedFrom = from = from.addHours(12);

            if (customDateRanges[customRange]) {
                $('.date-range-field .value', $el).text(customDateRanges[customRange]);
            } else {
                $('.date-range-field .value', $el).text(from.format(dateFormat) +' - '+ to.format(dateFormat));
            }

            var datepicker = $('.datepicker-calendar', $el).DatePicker({
                inline: true,
                date: [from, to],
                calendars: 3,
                mode: 'range',
                allTime: allTime,
                current: new Date(to.getFullYear(), to.getMonth() - 1, 1),
                onChange: function(dates, el, datepicker, customRange) {
                    $(this).trigger('dropdown.daterange-change', dates);
                }
            });

            // Called when the date selection is changed
            $('.datepicker-calendar', $el).bind('dropdown.daterange-change', onChange);

            // Called before a date is reset
            $el.bind('date.selection.reset', function() {
                $('.datepicker-calendar', this).DatePickerSetDate([savedFrom, savedTo]);
            });

            // Called before a date is submitted
            $el.bind('date.selection.save', function(el, dates) {
                savedFrom = dates[0];
                savedTo = dates[1];
                $(this).trigger('date.selection.close', dates);
            });

            return datepicker;
        };

        $('.date-range-field').on('click', function() {
            var $parent = $(this).parent();
            if ($parent.hasClass('open')) {
                $parent.trigger('date.selection.reset');
            }
            $parent.toggleClass('open');
            return false;
        });

        $('html').on('click', function(ev) {
            var $el = $(ev.target);
            var $openDatePicker = $('.date-range.open');

            if (!$el || !$openDatePicker) { return; }

            if ($el.hasClass('dismiss')) {
                // Submit date
                var datePicker = $('.datepicker-calendar', $openDatePicker).DatePickerGetDate();
                var dates = datePicker[0];
                var from = dates[0];
                var to = dates[1];

                $openDatePicker.trigger('date.selection.save', datePicker).removeClass('open');
                $openDatePicker.find('.date-range-field .value').text(from.format(dateFormat) +' - '+ to.format(dateFormat));
            } else if ($el.parents('.datepicker-calendar').length < 1) {
                // Reset date to previously saved state
                $openDatePicker.trigger('date.selection.reset').removeClass('open');
            }
        });

        /*
         *
         *      Show / Hide
         *
         */
        $('.showPages').on('click', function(ev) {
            var active = false;
            $link = $(ev.target);
            $link.siblings('.more_info').slideToggle('fast', function() {
                active = !$(this).is(':hidden');
                $link.text(active ? 'Collapse' : 'Expand');
                $link.closest('li').toggleClass('active', active);
            });
        });

        /*
         *
         *      Change View All Text
         *
         */

        $('body').on('click', '.show-more', function (ev) {
            var $el = $(this);
            var $toggle = $el.siblings('.sidebar-list');
            var $btn = $('span', $el);

            if (!$toggle.hasClass('in')) {
                $el.text('Show Less');
            } else {
                $el.text('View All');
            }
        });


        /*
         *
         *      AutoSelect
         *
         */
        $('body').on('focus', '.autoselect', function(){
            var $this = $(this);
            $this.select();
            // Work around Chrome's little problem
            $this.mouseup(function() {
                // Prevent further mouseup intervention
                $this.unbind("mouseup");
                return false;
            });
        });


        /*
         *
         *      Search Filters
         *
         */
        var searchFilter = function(ev) {
            var $el = $(ev.target).closest('input');
            var filter = $el.closest('.searchFilter');
            var group = $el.closest('.searchGroup');
            var useDetach = group.data('useDetach') ? true : false;
            var list = group.find('.searchable');
            var folders = group.find('.folder');

            var groupParent = null;
            if (useDetach) {
                groupParent = group.parent();
                group.detach();
            }

            try {
                var val = $el.val();
                var regex = new RegExp(val, 'i');

                if (group.is('.scrollable')) {
                    group.tinyscrollbar_update(0);
                }

                if (val.length) {

                    list.each(function () {

                        var $el = $(this);
                        var searchText = this.innerText;
                        if (regex.test(searchText) || $el.find(':checked, .link-active').length) {
                            $el.slideDown().fadeIn().parent().show();
                            $el.addClass('open');
                            $('.search-expandable', $el).show();
                        } else {
                            $el.hide().removeClass('open');
                        }

                    });

                    folders.each(function () {

                        var $folder = $(this);

                        if ($('.searchable:visible, .searchable :checked, .searchable .checked, .searchable.open', $folder).length) {
                            $folder.show().addClass('open');
                        } else {
                            $folder.hide().removeClass('open');
                        }

                    });

                } else {
                    list.css({display: ''});
                    list.filter('.hideByDefault').addClass('hide');
                    folders.show();

                    list.each(function () {
                        var $el = $(this);
                        if ($el.find(':checked, .link-active').length) {
                            $el.slideDown().fadeIn().parent().show();
                            $el.addClass('open');
                            $('.search-expandable', $el).show();
                            return;
                        }
                        $el.removeClass('open');
                    });
                }

                if (group.is('.scrollable')) {
                    group.tinyscrollbar_update(0);
                }
            } finally {
                if (useDetach) {
                    groupParent.append(group);
                }
            }
        };

        var searchFilterTimed = _.debounce(searchFilter, 250);
        $('body').on('input', '.searchFilter input', searchFilterTimed);

        $('body').on('click', '.clearSearch', function() {
            $(this).siblings('input').val('').trigger('change').trigger('focus');
        });


        // company selector filter override
        $('.companies-filter').on('click', function (event) {
            $(this).parent().toggleClass('open');
        });

        $('body').on('click', function (e) {
            if (!$('.searchGroup.sensible-list').is(e.target)
                && $('.searchGroup.sensible-list').has(e.target).length === 0
                && $('.open').has(e.target).length === 0
            ) {
                $('.companies-filter').parent().removeClass('open');
            }
        });

        /*
         *
         *      Cascading Filters
         *
         */

        $('body').on('click', '.cascade', function(ev) {
            var $el = $(this);
            var selector = $el.attr('data-selector');

            if ($el.hasClass('isRadio')) {
                $el.siblings().each(function() {
                    var antiSelector = $(this).attr('data-selector');
                    $(antiSelector).hide();
                });
            }

            $(selector).css('display', 'inline-block');
        });


        /*
         *
         *      Autocomplete (currently for tags)
         *
         */
        var tagEntryTpl = $('#tagEntry').text();
        var addTag = function(ev, tag) {
            $el = $(ev.target);
            $group = $el.closest('.autocomplete-group');
            $('.autocomplete-results', $group).hide();

            var campaignID = parseInt($group.data('campaignId'), 10);

            if (campaignID) {
                api.setCampaignTag(campaignID, tag, function(resp) {

                    if (resp && resp.data && resp.data.success) {
                        if (!_.isFunction(tagEntryTpl)) {
                            tagEntryTpl = _.template(tagEntryTpl);
                        }
                        tpl = $(tagEntryTpl({tag: resp.data.tag.tagName, tagID: resp.data.tag.tagID})).hide();

                        $('.tags', $group).prepend(tpl);
                        tpl.fadeIn();

                        $('.autocomplete-input', $group).val('').trigger('change');
                        $('.autocomplete-results', $group).find('a.visible').show();
                    }
                });
            }
        };

        var addEmailTag = function(ev, tag) {
            $el = $(ev.target);
            $group = $el.closest('.autocomplete-group');
            $('.autocomplete-results', $group).hide();

            var emailID = parseInt($group.data('emailId'), 10);

            if (emailID) {
                api.setTag('email', emailID, tag, function(resp) {
                    if (resp && resp.data && resp.data.success) {
                        if ($('#tagWrapper > a[data-tag-id=' + resp.data.tag.tagID + ']').length) {
                            // Don't add duplicate tags to DOM. Return early from handler here since the API happily
                            // returns a "success" when attempting to insert duplicates
                            return;
                        }

                        if (!_.isFunction(tagEntryTpl)) {
                            tagEntryTpl = _.template(tagEntryTpl);
                        }
                        tpl = $(tagEntryTpl({tag:resp.data.tag.label, tagID: resp.data.tag.tagID})).hide();
                        tagHTML = "<a data-tag-id='" + resp.data.tag.tagID + "' data-tag='" + _.escape(tag) + "'><i class='icon-tag'></i> " +  resp.data.tag.label +  "</a>";
                        $('.tags', $group).prepend(tpl);
                        tpl.fadeIn();
                        $('#tagWrapper').prepend(tagHTML);

                        $('.autocomplete-input', $group).val('').trigger('change');
                        $('.autocomplete-results', $group).find('a.visible').show();
                    }
                });
            }

        };

        var addListTag = function(ev, tag) {
            $el = $(ev.target);
            $group = $el.closest('.autocomplete-group');
            $('.autocomplete-results', $group).hide();

            var listID = parseInt($group.data('listId'), 10);

            if (listID) {
                api.setTag('list', listID, tag, function(resp) {
                    if (resp && resp.data && resp.data.success) {
                        if ($('#tagWrapper > a[data-tag-id=' + resp.data.tag.tagID + ']').length) {
                            // Don't add duplicate tags to DOM. Return early from handler here since the API happily
                            // returns a "success" when attempting to insert duplicates
                            return;
                        }

                        if (!_.isFunction(tagEntryTpl)) {
                            tagEntryTpl = _.template(tagEntryTpl);
                        }
                        tpl = $(tagEntryTpl({tag:resp.data.tag.label, tagID: resp.data.tag.tagID})).hide();
                        tagHTML = "<a href='/automationlist/tag/" + resp.data.tag.tagID + "' data-tag='" + _.escape(tag) + "' data-tag-id='" + resp.data.tag.tagID + "'><i class='icon-tag'></i> " +  resp.data.tag.label +  "</a>";
                        $('.tags', $group).prepend(tpl);
                        tpl.fadeIn();
                        $('#tagWrapper').prepend(tagHTML);

                        $('.autocomplete-input', $group).val('').trigger('change');
                        $('.autocomplete-results', $group).find('a.visible').show();
                    }
                });
            }
        };

        var addLeadTag = function(ev, tag) {
            $el = $(ev.target);
            $group = $el.closest('.autocomplete-group');
            $('.autocomplete-results', $group).hide();

            var leadID = parseInt($group.data('leadId'), 10);

            if (leadID) {
                api.setTag('lead', leadID, tag, function(resp) {
                    if (resp && resp.data && resp.data.success) {
                        if ($('#tagWrapper > a[data-tag-id=' + resp.data.tag.tagID + ']').length) {
                            // Don't add duplicate tags to DOM. Return early from handler here since the API happily
                            // returns a "success" when attempting to insert duplicates
                            return;
                        }

                        if (!_.isFunction(tagEntryTpl)) {
                            tagEntryTpl = _.template(tagEntryTpl);
                        }
                        tpl = $(tagEntryTpl({tag:resp.data.tag.label, tagID: resp.data.tag.tagID})).hide();
                        tagHTML = "<a data-tagID='" + resp.data.tag.tagID + "' data-tag='" +  + "'><i class='icon-tag'></i> " +  resp.data.tag.label +  "</a>";
                        tagHTML = "<a data-tag-id='" + resp.data.tag.tagID + "' data-tag='" + _.escape(tag) + "'><i class='icon-tag'></i> " +  resp.data.tag.label +  "</a>";
                        $('.tags', $group).prepend(tpl);
                        tpl.fadeIn();
                        $('#tagWrapper').prepend(tagHTML);

                        $('.autocomplete-input', $group).val('').trigger('change');
                        $('.autocomplete-results', $group).find('a.visible').show();
                    }
                });
            }
        };

        var addAccountTag = function(ev, tag) {
            $el = $(ev.target);
            $group = $el.closest('.autocomplete-group');
            $('.autocomplete-results', $group).hide();

            var accountID = parseInt($group.data('accountId'), 10);

            if (accountID) {
                api.setTag('account', accountID, tag, function(resp) {
                    if (resp && resp.data && resp.data.success) {
                        if ($('#tagWrapper > a[data-tag-id=' + resp.data.tag.tagID + ']').length) {
                            // Don't add duplicate tags to DOM. Return early from handler here since the API happily
                            // returns a "success" when attempting to insert duplicates
                            return;
                        }

                        if (!_.isFunction(tagEntryTpl)) {
                            tagEntryTpl = _.template(tagEntryTpl);
                        }

                        tpl = $(tagEntryTpl({tag:resp.data.tag.label, tagID: resp.data.tag.tagID})).hide();
                        tagHTML = "<a data-tag-id='" + resp.data.tag.tagID + "' data-tag='" + _.escape(tag) + "'><i class='icon-tag'></i> " +  resp.data.tag.label +  "</a>";
                        $('.tags', $group).prepend(tpl);
                        tpl.fadeIn();
                        $('#tagWrapper').prepend(tagHTML);

                        $('.autocomplete-input', $group).val('').trigger('change');
                        $('.autocomplete-results', $group).find('a.visible').show();
                    }
                });
            }
        };

        var addUserTag = function(ev, tag) {
            $el = $(ev.target);
            $group = $el.closest('.autocomplete-group');
            $('.autocomplete-results', $group).hide();

            var userID = parseInt($group.data('userId'), 10);

            if (userID) {
                api.setTag('user', userID, tag, function(resp) {
                    if (resp && resp.data && resp.data.success) {
                        if ($('#tagWrapper > a[data-tag-id=' + resp.data.tag.tagID + ']').length) {
                            // Don't add duplicate tags to DOM. Return early from handler here since the API happily
                            // returns a "success" when attempting to insert duplicates
                            return;
                        }

                        if (!_.isFunction(tagEntryTpl)) {
                            tagEntryTpl = _.template(tagEntryTpl);
                        }

                        tpl = $(tagEntryTpl({tag:resp.data.tag.label, tagID: resp.data.tag.tagID})).hide();
                        tagHTML = "<a data-tag-id='" + resp.data.tag.tagID + "' data-tag='" + _.escape(tag) + "'><i class='icon-tag'></i> " +  resp.data.tag.label +  "</a>";
                        $('.tags', $group).prepend(tpl);
                        tpl.fadeIn();
                        $('#tagWrapper').prepend(tagHTML);

                        $('.autocomplete-input', $group).val('').trigger('change');
                        $('.autocomplete-results', $group).find('a.visible').show();
                    }
                });
            }
        };

        var shareEmailTemplate = function(templateID, isPublic) {
            api.setTemplatePublic(templateID, isPublic, function(resp) {
                if (resp && resp.data && resp.data.success) {
                    message = '';
                    if (isPublic == 2) {
                        message = 'Succesfully sharing email template with clients.';
                    } else {
                        message = 'No longer sharing email template with clients.';
                    }
                    templates[templateID]['isPublic'] = isPublic;
                    utils.showNotification({message: message});
                }
            });
        };

        // Share Template Option
        $('body').on('click', '.template-share-client', function() {
            var $el = $(this);
            var templateID = $el.attr('data-itemID');
            var template = templates[templateID];
            var title = "";
            var message = "";

            if (template['isPublic'] == 2) {
                isPublic = 0;
                title = "Don't Share Email Template?";
                message = 'Are you sure you no longer with to share this email template with your client?';
            } else {
                isPublic = 2;
                title = "Share Email Template?";
                message = "The template will be located in the \"Agency Shared\" folder in each of your client's instances of SharpSpring. </br></br>Please confirm that you would like to take this action.";
            }
            data = {
                message: message,
                title: title,
                danger: 0,
                confirmText: 'Confirm'
            };
            confirmModal(data, function() {
                shareEmailTemplate(templateID, isPublic);
            });
        });

        $('body').on('keyup', '.autocomplete-input', function(ev) {
            var $el = $(this);
            var tag = $.trim($el.val());
            var regex = new RegExp(tag,'i');
            var $group = $el.closest('.autocomplete-group');
            var dataType = $group.attr("data-Type");

            if (ev.which == _.keyboard.ENTER && tag.length > 2) {
                // All tags are sent to the DB with slashes, usually added by PHP.
                if (dataType === 'list') {
                    addListTag(ev, tag);
                } else if (dataType === 'email') {
                    addEmailTag(ev, tag);
                } else if (dataType === 'lead') {
                    addLeadTag(ev, tag);
                } else if (dataType === 'account') {
                    addAccountTag(ev, tag);
                } else if (dataType === 'user') {
                    addUserTag(ev, tag);
                } else {
                    addTag(ev, tag);
                }
            } else if (tag.length > 0) {
                $('.autocomplete-results', $group).find('a').each(function(index, el) {
                    var $tag = $(el);
                    var text = $.trim($tag.text());

                    if (regex.test(text) || $tag.is('.link-active')) {
                        $tag.show();
                    } else {
                        $tag.hide();
                    }
                });
            } else {
                $('.autocomplete-results', $group).find('a.visible,a.link-active').show();
            }
        });

        $('body').on('focus', '.autocomplete-input', function(ev) {
            var $el = $(this);
            var $group = $el.closest('.autocomplete-group');
            $('.autocomplete-results', $group).show();
        });

        $('body').on('click', function(ev) {
            var $el = $(ev.target);
            var $group = $el.closest('.autocomplete-group');
            var $groups = $('.autocomplete-group').not($group);

            $('.autocomplete-results', $groups).delay(250).fadeOut('fast');
        });

        $('body').on('click', '.autocomplete-tags a', function(ev) {
            var $el = $(ev.target);
            var tag = $.trim($el.data('tag'));
            var tagID = $el.data('tagId');
            var $group = $el.closest('.autocomplete-group');
            var dataType = $group.data("type");

            if (tag.length > 2) {
                if (dataType === 'list') {
                    addListTag(ev, tag);
                } else if (dataType === 'email') {
                    addEmailTag(ev, tag);
                } else if (dataType === 'lead') {
                    addLeadTag(ev, tag);
                } else if (dataType === 'account') {
                    addAccountTag(ev, tag);
                } else if (dataType === 'user') {
                    addUserTag(ev, tag);
                } else {
                    addTag(ev, tag);
                }
                $el.removeClass('visible');
            }
        });

        $('body').on('click', '#campaign_tags a.remove', function(ev) {
            var $el = $(ev.target).closest('.tag');
            var tag = $.trim($el.attr('data-tag'));
            var $group = $el.closest('.autocomplete-group');

            var campaignID = parseInt($group.data('campaignId'), 10);

            if (campaignID) {
                api.deleteCampaignTag(campaignID, tag, function(resp) {
                    if (resp && resp.data && resp.data.success) {
                        $el.remove();
                    }
                });
            }
        });

        $('body').on('click', '#list_tags a.remove', function(ev) {
            var $el = $(ev.target).closest('.tag');
            var tag = $.trim($el.data('tag'));
            var $group = $el.closest('.autocomplete-group');

            var tagID = parseInt($el.data('tagId'), 10);
            var listID = parseInt($group.data('listId'), 10);

            if (listID) {
                api.deleteTag('list', listID, tagID, function(resp) {
                    if (resp && resp.data && resp.data.success) {
                        $link = $('a[data-tag-id=' + tagID + ']', '#tagWrapper', 'body');
                        $link.remove();
                        $el.remove();
                    }
                });
            }
        });

        $('body').on('click', '#lead_tags a.remove', function(ev) {
            var $el = $(ev.target).closest('.tag');
            var tag = $.trim($el.data('tag'));
            var $group = $el.closest('.autocomplete-group');

            var tagID = parseInt($el.data('tagId'), 10);
            var leadID = parseInt($group.data('leadId'), 10);

            if (leadID) {
                api.deleteTag('lead', leadID, tagID, function(resp) {
                    if (resp && resp.data && resp.data.success) {
                        $link = $('a[data-tag-id=' + tagID + ']', '#tagWrapper', 'body');
                        $link.remove();
                        $el.remove();
                    }
                });
            }
        });

        $('body').on('click', '#email_tags a.remove', function(ev) {
            var $el = $(ev.target).closest('.tag');
            var tag = $.trim($el.data('tag'));
            var $group = $el.closest('.autocomplete-group');

            var tagID = parseInt($el.data('tagId'), 10);
            var emailID = parseInt($group.data('emailId'), 10);

            if (emailID) {
                api.deleteTag('email', emailID, tagID, function(resp) {
                    if (resp && resp.data && resp.data.success) {
                        $link = $('a[data-tag-id=' + tagID + ']', '#tagWrapper', 'body');
                        $link.remove();
                        $el.remove();
                    }
                });
            }
        });

        $('body').on('click', '#account_tags a.remove', function(ev) {
            var $el = $(ev.target).closest('.tag');
            var tag = $.trim($el.data('tag'));
            var $group = $el.closest('.autocomplete-group');

            var tagID = parseInt($el.data('tagId'), 10);
            var accountID = parseInt($group.data('accountId'), 10);

            if (accountID) {
                api.deleteTag('account', accountID, tagID, function(resp) {
                    if (resp && resp.data && resp.data.success) {
                        $link = $('a[data-tag-id=' + tagID + ']', '#tagWrapper', 'body');
                        $link.remove();
                        $el.remove();
                    }
                });
            }
        });

        $('body').on('click', '#user_tags a.remove', function(ev) {
            var $el = $(ev.target).closest('.tag');
            var tag = $.trim($el.data('tag'));
            var $group = $el.closest('.autocomplete-group');

            var tagID = parseInt($el.data('tagId'), 10);
            var userID = parseInt($group.data('userId'), 10);

            if (userID) {
                api.deleteTag('user', userID, tagID, function(resp) {
                    if (resp && resp.data && resp.data.success) {
                        $link = $('a[data-tag-id=' + tagID + ']', '#tagWrapper', 'body');
                        $link.remove();
                        $el.remove();
                    }
                });
            }
        });

        $('body').on('click', '#btn-submitAddToList', function(event) {
            event.preventDefault();
            var $el = $(this);
            var $modal = $el.closest('.modal');
            leadID = $('.leadID', $modal).val();
            listID = $('#leadLists li.active').val();

            event.stopImmediatePropagation();
            if (!listID) {
                utils.showNotification({message: 'You must select a list'});
            } else {

                api.addLeadToList(leadID, listID, function(resp) {
                    if (resp.data && resp.data.success) {
                        $('.modal').modal('hide');
                        utils.showNotification({message: "Successfully added lead to list."});
                    } else {
                        utils.showNotification({message: "There was an error adding lead to list"});
                    }
                });
            }
        });

        $('body').on('click', '.callResultSelect', function(ev) {
            var $el = $(this);
            var $modal = $el.closest('.modal');
            var $callNote = $('.call-note', $modal);
            var outcome = $el.attr('data-value');

            if (outcome == 'noAnswerMessage' || outcome == 'answered') {
                $callNote.removeClass('hide');
            } else if (!$callNote.hasClass('hide')) {
                $callNote.addClass('hide');
            }
        });

        /*
         *
         *      Embeds
         *
         */
        var matchPercentOrNumber = /^\d+%?$/;
        $('body').on('keyup', '.embedSize', function(ev) {
            var embed = $('#embedCode');
            var guid = embed.attr('data-guid');

            var width = $('#embedWidth').val();
            var height = $('#embedHeight').val();

            if (guid && matchPercentOrNumber.test(width) && matchPercentOrNumber.test(height)) {
                $.get('/form/embedCode/'+ guid + '/?w=' + width + '&h=' + height, function(data) {
                    embed.val(data);
                });
            }
        });

        /*
         *
         *      Uploads
         *
         */
        $('body').on('change', '.input-upload', function() {

            var $el = $(this);
            if ( $el.val() && $el.val().length ) {
                var filepath = $el.val();
                var splitPath = filepath.split('\\');
                var fileName = splitPath.pop();
                $el.closest('label').addClass('selected');
                $('.upload-text').text(t('contacts_importtool_upload_filechosen', { fileName: fileName }));
                $el.prev('i').addClass('icon-ok').removeClass('icon-upload2');
                $el.closest('div.btn').addClass('btn-success');
            } else {
                $el.closest('label').removeClass('selected');
                $('.upload-text').text(t('supportal_techtab_choosefile'));
                $el.text('Choose a File').prev('i').addClass('icon-upload2').removeClass('icon-ok');
                $el.closest('div.btn').removeClass('btn-success');
            }
        });


        /*
         *
         *      Clocks
         *
         */
        var clockCountdown = function(selector) {
            selector = selector || '.countdownClock';
            (function f() {
                $(selector).each(function() {
                    var clockCountdownRemaining = Number($(this).data('countdown'));
                    if (!clockCountdownRemaining) {
                        return;
                    }
                    var ts = $(this).data('clock-timestamp');
                    var now = Date.now() / 1000;
                    if (ts) {
                        clockCountdownRemaining = Math.max(clockCountdownRemaining + ts - now, 0);
                    }
                    var clock = Math.ceil(clockCountdownRemaining);
                    if (clockCountdownRemaining <= 0) {
                        clock = 0;
                        $(this).removeData('countdown');
                    }
                    var hours = Math.floor(clock / 3600);
                    var minutes = Math.floor((clock % 3600) / 60);
                    var seconds = clock % 60;
                    // no fancy printf in javascript :(
                    if (hours < 10) {
                        hours = "0" + hours;
                    }
                    if (minutes < 10) {
                        minutes = "0" + minutes;
                    }
                    if (seconds < 10) {
                        seconds = "0" + seconds;
                    }
                    $(this)
                        .html("(" + (hours > 0 ? hours + ":" : "") + minutes + ":" + seconds + ")")
                        .data('countdown', clockCountdownRemaining)
                        .data('clock-timestamp', now);
                });
                setTimeout(f, 500);
            })()
        };

        /*
         *
         *      Toggle Favorite
         *
         */

        var favoriteThis = function(ev) {
            var $el = $(this);
            var favoriteType = $el.attr('data-type');
            var id = $el.attr('data-id');
            var isFavorite = $el.is('.favorite');

            if (id && favoriteType) {
                api.setFavorite(favoriteType, id, !isFavorite, function(resp) {
                    var favorites = _.valueAt(resp, 'data', 'favorites');
                    if (_.valueAt(resp, 'data', 'success')) {
                        $el.toggleClass('favorite', !isFavorite);

                        try {
                            if (!isFavorite) {

                                if (_.isArray(app.user.favorites[favoriteType])) {
                                    app.user.favorites[favoriteType] = {};
                                }
                                app.user.favorites[favoriteType][id] = Date.now() / 1000;

                                // Only show the notification the first few times by type
                                if (app.currentURL != 'dashboard' && _.keys(app.user.favorites[favoriteType]).length < 3) {
                                    utils.showNotification({message: t('notification_favorite_added_to_dashboard', {dashboardURL: '/dashboard/#'}), lifetime: 10000});
                                }

                            } else {
                                delete app.user.favorites[favoriteType][id];
                            }
                        } catch(err) { }

                        _.pub('item.favorite.update', {favoriteID: id, favoriteType: favoriteType, isFavorite: !isFavorite, favorites: favorites});
                    }
                });
            }
        };

        $('body').on('click', '.favorite-this', favoriteThis);


        // Toggle Sidebar

        $('#collapseSidebar').on('click', function() {
            $('body').toggleClass('sidebar-collapsed');
            setTimeout(function() {
                $(window).resize();
                window.dispatchEvent(new Event('resize'));
            }, 600);
        });

        $('body').on('mouseleave', '#companies', function(ev) {
            $(this).removeClass('in');
            $(this).height('0px');
            $('#companyDropdown').addClass('collapsed');
        });

        // Roll-ups
        $('body').on('click', '.roll-upper', function(ev) {

            var $el = $(this);
            var $roller = $el.closest('.page-roll-up');
            var $roll = $roller.prev('.page-roll');

            if ($roll.length) {
                if ($roll.hasClass('closed')) {
                    $roll.removeClass('closed');
                    $roller.removeClass('closed');
                } else {
                    $roll.height($roll.height());
                    _.delay(function() {
                        $roll.addClass('closed');
                        $roller.addClass('closed');
                    }, 50);
                }
            }
        });


        // Media Uploader
        var openMoxi = function() {
            moxman.browse({
                no_host: true,
                title: 'Media Upload',
                insert: false,
                view: 'thumbs'
            });
        };

        $('#uploadGlobalImage').on('click', openMoxi);

        // email select lists select
        $('body').on('click', 'input:checkbox, input:radio', '.email-select-list', function() {
            var $els = $('input:checkbox, input:radio', '.email-select-list');

            $els.each(function(){
                if ($(this).is(':checked')) {
                    $(this).closest('.searchable').addClass('selected');
                } else {
                    $(this).closest('.searchable').removeClass('selected');
                }
            });
        });

        //Global email schedule modal
        var openScheduleEmailJobModal = function(ev) {
            ev.preventDefault();

            if (app.needsBillingBeforeSend) {
                app.billing.getccBillingInfoModalTpl();
                return;
            }

            if (!app.spamCompliant) {
                showModal('/help/spamcompliance', true);
                return;
            }

            var $this = $(this);

            var emailID = $this.attr('data-emailID');
            var emailTitle = $this.attr('data-emailTitle');
            var listID = $this.attr('data-listID');
            var listName = $this.attr('data-listName');
            var tagID = $this.attr('data-tagID');
            var tagName = $this.attr('data-tagName');

            var options = {};
            if (emailID) {
                options.email = {
                    id: emailID,
                    title: emailTitle
                };
            }

            if (listID) {
                options.recipient = {
                    type: 'list',
                    id: listID,
                    name: listName
                };
            } else if (tagID) {
                options.recipient = {
                    type: 'listTag',
                    id: tagID,
                    label: tagName
                };
            }

            var modal = new ScheduleEmailModal(options);
            modal.open();
        };

        $('body').on('click', '.open-schedule-email-modal', openScheduleEmailJobModal);

        var openDomainVerifyModal = function(ev) {
            ev.preventDefault();

            var $this = $(this);

            var emailAddress = $this.attr('data-emailAddress');
            var domain = $this.attr('data-domain');
            var reload = $this.attr('data-reload') === '1';
            var createNew = false;

            if (domain == '_newDomain') {
                createNew = true;
                domain = null;
            }

            var modal = new DomainVerifyModal({
                emailAddress: emailAddress,
                domain: domain,
                createNew: createNew,
                reloadOnSuccess: reload
            });
            modal.open();
        };

        $('body').on('click', '.open-domain-verify-modal', openDomainVerifyModal);

        // Creating funnels
        var createFunnel = function createFunnel(ev) {

            var $el = $(this);
            var $modal = $el.closest('.modal');
            var funnelName = $('.funnelName', '.modal').val();
            var funnelTemplateID = parseInt($('.funnelTemplateID').val(), 10);
            var funnelPageTemplateID = $('.funnelPageTemplateID').val();
            var newPages = parseInt($('.newPages', $modal).val(), 10);

            var funnel = {
                name: funnelName
            };

            var options = {
                newPages: newPages,
                funnelPageTemplateID: funnelPageTemplateID
            };

            if (!funnelName) {
                utils.showNotification({message: t('pages_funnel_error_name_required')});
                return;
            }
            var funnelCallback = function(resp) {
                var funnelID = _.valueAt(resp, 'data', 'funnelID');

                if (funnelID) {
                    var destination = '/pages/editor/' + funnelID;
                    var limit = _.valueAt(resp, 'data', 'funnelLimit');
                    if (limit != null) {
                        utils.dismissModal();
                        var funnelCount = _.valueAt(resp, 'data', 'funnelCount');
                        var pageLimit = _.valueAt(resp, 'data', 'pageLimit');
                        var url = _.valueAt(resp, 'data', 'url');
                        utils.callbackModal(funnelLimitWarningModal({funnelLimit: limit, funnelCount: funnelCount, pageLimit: pageLimit, url: url}), function() {
                            window.location = destination;
                        });
                    } else {
                        window.location = destination;
                    }
                } else if (resp.errors) {
                    utils.showApiErrors(resp);
                } else {
                    utils.showNotification({message: t('db_error')});
                }
            };

            if (funnelTemplateID) {
                api.setFunnelFromTemplate(funnelTemplateID, funnelName, options, funnelCallback);
            } else if (newPages) {
                api.setFunnel(null, funnel, options, funnelCallback);
            }
        };

        $('body').on('click', '.pages-create-funnel', createFunnel);

        // ------------------ Global Search -------------------

        var showGlobalSearch = function() {
            $('#global-search').addClass('show');
            $('.global-search-box input').focus();
            $('body').addClass('page-modal-open');
        };

        var hideGlobalSearch = function() {
            $('#global-search').removeClass('show');
            $('body').removeClass('page-modal-open');
        };

        var currentSearch;
        var globalSearchResultsTpl = _.template($('#globalSearchResultsTpl').text());
        var doGlobalSearch = _.debounce(function() {

            var searchString = $('.global-search-text').val();

            if (searchString && searchString.length > 2) {
                currentSearch = api.getGlobalSearch(searchString, {}, function(resp) {

                    var $html = globalSearchResultsTpl(resp);

                    if (resp.data.total) {
                        $('.global-search-content').addClass('has-results');
                        $('.global-search-results').hide();
                    }

                    _.delay(function() {
                        $('.global-search-results').html($html).fadeIn('fast');
                    }, 500);

                });
            } else {
                $('.global-search-content').removeClass('has-results');
                $('.global-search-results').html('');
            }

        }, 500);

        $('.global-search-text').on('keyup', doGlobalSearch);

        // Listen for notifications
        var otto = new Otto();
        var socket = {emit: $.noop, on: $.noop};
        var socketAttempts = 0;
        // If the pdfOutput cookie is set, don't use websockets to prevent issues
        if (!document.cookie || !document.cookie.match(/(\W+|^)pdfOutput=1(\W+|$)/)) {
            socket = io.connect(app.websocketServer, {
                reconnectionAttempts: 5
            });
            socket.on('connect_error', function(error) {
                if (socketAttempts++ > 1) {
                    socket.close();
                }
            });
            socket.on('reconnect_failed', function(error) {
                otto.dispatch({
                    type: 'connectionError'
                });
            });
            socket.on('notification', function(data) {
                otto.dispatch(data);
            });
        }

        otto.socket = socket;
        app.otto = otto;

        /*
         *
         *      Make any Utils Public
         *
         */
        var utils = {};
        utils.initDateRangePicker = initDateRangePicker;
        utils.setDateRangePicker = setDateRangePicker;
        utils.showModal = showModal;
        utils.showNotification = showNotification;
        utils.showApiErrors = showApiErrors;
        utils.showFlashMessage = showFlashMessage;
        utils.resizeScrollbars = resizeScrollbars;
        utils.queueModal = queueModal;
        utils.callbackModal = callbackModal;
        utils.confirmModal = confirmModal;
        utils.showPageModal = showPageModal;
        utils.getPageContents = getPageContents;
        utils.dismissPageModal = dismissPageModal;
        utils.openMoxi = openMoxi;
        utils.twilioRecordingURL = twilioRecordingURL;
        utils.dismissModal = dismissModal;
        utils.openPageModal = openPageModal;
        utils.clockCountdown = clockCountdown;
        utils.extractFormData = extractFormData;

        window.utils = utils;
        window.app.version = version;

        var init = function() {

            app.modules.emailModule = new EmailModule();

            if (_.hasFeature('sales') && window.CrossriderAPI) {
                CrossriderAPI.isAppInstalled(74343, function (isInstalled) {
                    var link = '//sharpspring.com/features/social-assistant';
                    if (!isInstalled && (navigator.userAgent.indexOf('Chrome') !== -1 || navigator.userAgent.indexOf('Firefox') !== -1)) {
                        $('.extension-promo-button').show().attr('href', link);
                    }
                });
            }

            if (window.ZeroClipboard) {
                ZeroClipboard.config({swfPath: "/includes/js/core/zeroclipboard/ZeroClipboard.swf"});
                ZeroClipboard.on('copy', function (ev) {
                    utils.showNotification({message: 'Copied to clipboard.', lifetime: 1000});
                });
            }

            if (!app['inToolshed']) {
                var scheduler = new Scheduler();
                window.app.scheduler = scheduler;

                var supportController = new Support_Controller({});
                window.app.support = supportController;

                var billingController = new Billing_Controller({});
                window.app.billing = billingController;
            }

            /* Initial Modals */

            if ((app.pageURI != '/billing') && app.receivedNotice == 0) {
                showModal('/settings/billing_notification', true);
            }

            if (app.showSpamNotice && app.pageURI != '/welcome') {
                showModal('/help/spamcompliance', true);
            }

            if (app.isTempPassWarning && app.pageURI != '/welcome' && app.pageURI != '/setup' && app.pageURI != '/settings/account') {
                message = app.overTwoWeeksOld ? '' : 'You are currently using a temporary password. ';
                message += 'For security reasons, we recommend you change your password immediately.';
                title = app.overTwoWeeksOld ? 'Change Password' : 'Change Temporary Password';
                data = {
                    confirmText: 'Change Password',
                    message: message,
                    title: title,
                    clickToClose: 1
                };

                app.localesReady.done(function() {
                    confirmModal(data, function() {
                        location = '/settings/account';
                    });
                });
            }

            $('body').konami(showGlobalSearch, {
                code: [186, 186], // ;;
                delay: 500
            });

            $('.global-search-close').on('click', hideGlobalSearch);
            $('#global-search').on('keyup', function(ev) {
               if (_.keyboard.ESC == ev.keyCode) {
                   hideGlobalSearch();
               }
            });

            $('body').on('click', '#delayNotification', function(ev) {
                $.ajax({
                    type: "POST",
                    url: "/settings/dismissNotification"
                });
            });

            setTimeout(function(){ $(window).resize(); }, 1200);
        };

        init();
    });
})(jQuery, app);
