$X = new function() {
    var X = this;
    var dropdown = new function() {
        var d = this;
        var dropdown = 'div.navbar div.dropdown';
        var display = dropdown + ' div.display';
        var list = dropdown + ' div.list';
        var option = list + ' a';
        var listItems = {};
        d.renderList = function(items) {
            listItems = items;
            $(list).html('<a>&nbsp;</a>');
            $(listItems).each(function(i, li) {
                $(list).append('<a data-key="' + i + '">' + li.header + '</a>');
            });
        };
        function hideList() {
            $(list).hide();
        }
        function toggleListDisplay() {
            if ($(list).css('display') === 'none') $(list).show();
            else hideList();
        }
        function selectOption(e) {
            hideList();
            var content = 'div.container div.content';
            var item = listItems[$(e.currentTarget).attr('data-key')];
            if (typeof item === 'undefined') {
                $(content).html('<h1 class="pull-right">For Examples, Pick an API.</h1>');
                location.hash = '';
                $(display).find('span').html('&nbsp;');
                return false;
            }
            $(display).find('span').text(item.header);
            location.hash = (item.header).toLowerCase().split(' ').join('-');
            Handlebars.renderTemplate('content', item, content);
        }
        $(document).on('click', display, toggleListDisplay);
        $(document).on('click', option, selectOption);
        $(document).on('keydown', document, function(e) {
            if (e.keyCode == 27) hideList();
        });
    };
    X.init = function(data) {
        dropdown.renderList(data);
    };
};
(function() {
    $.get('js/data.json', function(data) {
        $X.init(data.howtos);
    });
})();
