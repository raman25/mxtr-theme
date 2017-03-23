var FilterJS = function(el, options) {

    var self = this;
    var dropdownTpl = _.template($('#dropdownFilterTpl').text());
    var data = options || {};

    var requiredParams = [
        'title',
        'items',
        'valueArray',
        'labelIndex',
        'valueIndex'
    ];

    self.el = el;
    self.$el = $(el);
    self.selectedItems = [];

    self.clear = function () {
        self.selectedItems = [];
        self.$el.find('.filterJS_toggle-link.toggle-link').removeClass('checked');
        checkIsActive();
        self.$el.trigger('filter.update', self);
    };

    self.setTitle = function(title) {
        self.$el.find('.filterJS_title').html(title);
    };

    function initCheckboxes(el, data) {
        var id = el.attr('id');
        var items = $('.toggleBox-' + id);
        var filteredItems = items.filter(function() {
            var value = parseInt($(this).attr('data-value'), 10);
            return _.indexOf(self.selectedItems, value) != -1;
        });
        filteredItems.addClass('checked');
        filteredItems.each(function() {
            $('#divider-' + id).after($(this).parent());
        });
    }

    function checkIsActive() {
        $('.btn', el).toggleClass(data.btnActiveClass, self.selectedItems.length !== 0);
    }

    var init = function(el, data) {

        for (var i = 0; i < requiredParams.length; i++) {
            if (typeof data[requiredParams[i]] == 'undefined') {
                el.remove();
                return;
            }
        }

        data.btnClass = data.btnClass || '';
        data.activeBtnClass = data.btnActiveClass || 'btn-success';
        data.title = '<span class="filterJS_title">' + data.title + '</span>';

        var id = el.attr('id');
        data.toggleClass = id;

        var html = $(dropdownTpl({data: data}));
        el.html(html);

        function dataItemsHasID(value) {
            for (var i = 0; i < data.items.length; i++) {
                if (data.items[i].id === value) {
                    return true;
                }
            }
            return false;
        }

        // You should only be able to select items that exist.
        self.selectedItems = _.filter(data.valueArray, function (value) {
            return data.items.hasOwnProperty(value) || dataItemsHasID(value);
        });

        initCheckboxes(el);

        if (self.selectedItems.length > 0) {
            // Added new parameter to differentiate between init update event and normal update event. Maybe should be a separate event entirely,
            // 'filter.init' or something.
            $(el).trigger('filter.update', [self, 'init']);
            $(el).css('display', 'inline-block');
        }

        checkIsActive();
    };

    $(el).on('click', '.filterJS_toggle-link.toggle-link', function(ev) {
        ev.stopImmediatePropagation();
        var toggleClass = $(this).attr('data-toggle');
        var value = parseInt($(this).attr('data-value'), 10);
        var id = $('#' + toggleClass).attr('id');

        if ($(this).hasClass('checked')) {
            self.selectedItems.splice(self.selectedItems.indexOf(value), 1);
            $(this).removeClass('checked');
            $(id).trigger();
        } else {
            self.selectedItems.push(value);
            $(this).addClass('checked');
            $('#divider-' + id).after($(this).parent());
        }

        $(el).trigger('filter.update', self);

        checkIsActive();

    });

    init(el, data);
    return self;

};
