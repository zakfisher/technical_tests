(function() {

    var D = this;
    var defaultLocation = {};
    var defaultsLoaded = false;
    var pageLoaded = false;
    var centreCache = {};
    var dealCache = {};
    var storeCache = {};
    var lastState = '';
    var crossDomain = true;

    /***************
     * Browser
     ***************/
    (function() {
        var N= navigator.appName, ua= navigator.userAgent, tem;
        var M= ua.match(/(opera|chrome|safari|firefox|msie)\/?\s*(\.?\d+(\.\d+)*)/i);
        if(M && (tem= ua.match(/version\/([\.\d]+)/i))!= null) M[2]= tem[1];
        M= M? [M[1], M[2]]: [N, navigator.appVersion,'-?'];
        D.browser = $.extend({}, {
            platform : (function() {
                var OSName="Unknown OS";
                if (navigator.appVersion.indexOf("Win")!=-1) OSName="Windows";
                if (navigator.appVersion.indexOf("Mac")!=-1) OSName="Mac";
                if (navigator.appVersion.indexOf("iPhone")!=-1) OSName="iPhone";
                if (navigator.appVersion.indexOf("Android")!=-1) OSName="Android";
                return OSName;
            })(),
            name : M[0],
            version : M[1]
        });
    })();
    $('html').attr('data-platform', D.browser.platform).attr('data-browser', D.browser.name).attr('data-version', D.browser.version);
    if (D.browser.name === 'MSIE' && D.browser.version === '9.0') {
        crossDomain = false;
        $.get('js/msie.js');
    }

    /***************
     * Collections
     ***************/
    var statesCollection;
    D.collections = new function() {
        var c = this;
        c.setCountry = function(country, callback) {
            defaultsLoaded = false;
            pageLoaded = false;
            var States = Backbone.Collection.extend({
                url: 'centre/master/states.json?country=' + country
            });
            statesCollection = new States();
            statesCollection.fetch({
                success: function(states, response) {

                    // Set Default State from Country
                    defaultLocation.state = statesCollection.at(0).attributes.abbreviation;
                    c.setState(defaultLocation.state);
                    cacheCentres();
                    function cacheCentres() {
                        // Load Centres, cache them, and filter out states w/o any centres
                        var count = 0;
                        var statesOriginalLength = states.length;
                        $(states.models).each(function(i, state) {
                            var abbr = state.attributes.abbreviation;
                            c.setState(abbr);
                            var centresCollection = new c.Centres();
                            centresCollection.fetch({
                                success:function(centres, response) {
                                    if (centres.length > 0) {
                                        centreCache[abbr] = centres;
                                        // Set Default Centre from State
                                        if (defaultLocation.state === abbr) {
                                            defaultLocation.centre = centresCollection.at(0).attributes.code;
                                            defaultsLoaded = true;
                                        }
                                    }
                                    // If state has no centres, remove
                                    else {
                                        statesCollection.remove(state);
                                    }
                                    count++;

                                    // Once states have been filtered
                                    if (count == statesOriginalLength) {
                                        if (callback) {
                                            callback(defaultLocation);
                                        }
                                        cacheDealsAndStores();
                                    }
                                }
                            });
                        });
                    }
                    function cacheDealsAndStores() {
                        for (var state in centreCache) {
                            $(centreCache[state].models).each(function(j, centre) {
                                c.setCentre(centre.attributes.code);

                                // Cache Deals
                                var dealsCollection = new D.collections.Deals();
                                dealsCollection.fetch({
                                    success: function(deals) {
                                        dealCache[centre.attributes.code] = deals;

                                        // Add custom data to deals
                                        if (deals.length > 0) {
                                            $(dealCache[centre.attributes.code].models).each(function(i, m) {

                                                // Set Dates
                                                m.attributes.from = moment(m.attributes.available_from).format('MM/DD/YYYY');
                                                m.attributes.to = moment(m.attributes.available_to).format('MM/DD/YYYY');

                                                var storeId = m.attributes.deal_stores[0].store_service_id;
                                                var store = storeCache[storeId];

                                                // Store has not been cached
                                                if (!store) {
                                                    var Store = Backbone.Model.extend({
                                                        urlRoot: 'store/master/stores/' + storeId + '.json'
                                                    });
                                                    var storeModel = new Store();
                                                    storeModel.fetch({
                                                        success: function(s) {
                                                            m.attributes.store = s.attributes.name;
                                                            m.attributes.logoHref = s.attributes._links.logo.href;
                                                            m.storeDataLoaded = true;
                                                        }
                                                    });
                                                }

                                                // Store has been cached
                                                else {
                                                    m.attributes.store = store.attributes.name;
                                                    m.attributes.logoHref = store.attributes._links.logo.href;
                                                    m.storeDataLoaded = true;
                                                }
                                            });
                                        }
                                    }
                                });

                                // Cache Stores
                                var storesCollection = new D.collections.Stores();
                                storesCollection.fetch({
                                    success: function(stores) {
                                        $(stores.models).each(function(i, s) {
                                            storeCache[s.id] = s;
                                        });
                                    }
                                });
                            });
                        }
                    }
                }
            });
        };
        c.setState = function(state) {
            c.Centres = Backbone.Collection.extend({
                url: 'centre/master/centres.json?state=' + state
            });
        };
        c.setCentre = function(centre) {
            c.Deals = Backbone.Collection.extend({
                url: 'deal/master/deals.json?centre=' + centre + '&state=published'
            });
            c.Stores = Backbone.Collection.extend({
                url: 'store/master/stores.json?centre_id=' + centre
            });
        };
    };

    /***************
     * Views
     ***************/
    var headerView = Backbone.View.extend({
        el: '#header',
        render: function(title) {
            var view = this;
            Handlebars.renderTemplate('header', {logo:'logo',title:title}, view.$el);
            $(view.$el).fadeIn('slow');
        }
    });
    D.headerView = new headerView();

    var tabNavView = Backbone.View.extend({
        el: '#tab-nav',
        events: {
            'click ul.nav-tabs li' : 'selectTab'
        },
        selectTab : function(e) {
            var view = this;
            $(view.$el).find('li').removeClass('active');
            $(e.currentTarget).addClass('active');
        },
        render: function(location) {
            var view = this;
            var states = statesCollection.models;
            Handlebars.renderTemplate('tab-nav', {states:states,value:$(view.$el).find('input[type=search]').val()}, view.$el);
            $(view.$el).find('a[href="#!/' + location.country + '/' + location.state + '"]').parents('li').addClass('active');
        }
    });
    D.tabNavView = new tabNavView();

    var listView = Backbone.View.extend({
        el: '#list',
        events: {
            'click li.centres': 'toggleDealsDisplay'
        },
        toggleDealsDisplay : function(e) {
            var view = this;

            // Get Centre Model
            var centres = centreCache[$(e.currentTarget).attr('data-state')];
            var model = {};
            for (var i = 0; i < centres.length; i++) {
                if (centres.models[i].attributes.code === $(e.currentTarget).attr('data-centre')) {
                    model = centres.models[i];
                    break;
                }
            }

            // Toggle Display
            if ($(e.currentTarget).is('.active')) {
                model.active = false;
                $(e.currentTarget).removeClass('active').find('i').removeClass('icon-minus').addClass('icon-plus');
                $(view.$el).find('li.deals[data-centre=' + $(e.currentTarget).attr('data-centre') + ']').hide();
                $(view.$el).find('li.waiting[data-centre=' + $(e.currentTarget).attr('data-centre') + ']').remove();
            }
            else {
                D.router.navigate('!/' + defaultLocation.country + '/' + $(e.currentTarget).attr('data-state') + '/' + $(e.currentTarget).attr('data-centre'));
                model.active = true;
                $(e.currentTarget).addClass('active').find('i').addClass('icon-minus').removeClass('icon-plus');

                // If deals are in dom show, otherwise show loading gif
                var dealsLI = 'li.deals[data-centre=' + $(e.currentTarget).attr('data-centre') + ']';
                if ($(view.$el).find(dealsLI).length === 0) {
                    $(e.currentTarget).after('<li class="waiting" data-centre="' + $(e.currentTarget).attr('data-centre') + '"><img class="loading" src="images/loading.gif" /></li>');
                }
                else $(view.$el).find(dealsLI).show();
            }
        },
        render: function (location) {
            var view = this;
            var centres = centreCache[location.state];
            var firstRender = (lastState != location.state || lastState.length === 0);

            // Centre has not been specified
            if (!location.centre) {
                // Centre has not been cached yet
                if (!centres) {
                    D.collections.setState(location.state);
                    centres = new D.collections.Centres();
                    centres.fetch({
                        success:function(c, response) {
                            if (centres.length === 0) {
                                D.router.navigate('', {trigger:true});
                                return false;
                            }
                            location.centre = centres.at(0).attributes.code;
                            renderCentres();
                        }
                    });
                }
                // Centre has been cached
                else {
                    location.centre = centres.at(0).attributes.code;
                    renderCentres();
                }
            }
            // Centre has been specified
            else {
                renderCentres();
            }
            function renderCentres() {

                // If different state, render tabs and centre headers
                if (firstRender) {

                    // Render tabs & centre headers
                    D.tabNavView.render(location);
                    var context = {centres:centres.models};
                    $(context.centres).each(function(i, v) {

                        // If current centre and active == null, set active = true (to display the current centre by default)
                        if (location.centre === v.attributes.code && typeof v.active === 'undefined') {
                            v.active = true;
                        }
                        v.location = location;
                    });
                    Handlebars.renderTemplate('list', context, view.$el);
                    $(view.$el).fadeIn('slow');

                    // Render deals for each active centre
                    $(centres.models).each(function(i, v) {
                        if (v.active) {
                            checkDealCache(v);
                        }
                    });

                    // Render deals for each inactive centre
                    $(centres.models).each(function(i, v) {
                        if (!v.active) {
                            checkDealCache(v);
                        }
                    });
                }

                // Page is already cached, hide/show correct centres
                else {
                    $(centres.models).each(function(i, v) {
                        var centre = location.centre;
                        v.active = (location.centre === v.attributes.code);
                        $(view.$el).find('li.centres').removeClass('active').find('i').addClass('icon-plus').removeClass('icon-minus');
                        $(view.$el).find('li.centres[data-centre=' + centre + ']').addClass('active').find('i').removeClass('icon-plus').addClass('icon-minus');
                        $(view.$el).find('li.deals').hide();
                        $(view.$el).find('li.deals[data-centre=' + centre + ']').show();
                        $(view.$el).find('li.waiting:not([data-centre=' + centre + '])').remove();

                        // Show loading for active centres that haven't finished caching deals
                        if (v.active && $('li.deals[data-centre=' + centre + ']').length === 0) {
                            if ($('li.waiting[data-centre=' + centre + ']').length === 0) {
                                $(view.$el).find('li.centres[data-centre=' + centre + ']').after('<li class="waiting" data-centre="' + centre + '"><img class="loading" src="images/loading.gif" /></li>');
                            }
                        }
                    });
                }

                lastState = location.state;
            }
            function checkDealCache(centre) {
                var centreId = centre.attributes.code;
                var deals = dealCache[centreId];

                // Add loading gif if centre is active
                var centreLI = 'li[data-centre=' + centreId + '].centres';
                var loading = 'li[data-centre=' + centreId + '].waiting';
                if (centre.active && $(loading).length === 0) {
                    $(centreLI).after('<li class="waiting" data-centre="' + centreId + '"><img class="loading" src="images/loading.gif" /></li>');
                }

                // Deals have not been cached
                if (!deals) {
                    D.collections.setCentre(centreId);
                    var dealsCollection = new D.collections.Deals();
                    dealsCollection.fetch({
                        success: function (d) {
                            deals = d;
                            loadDeals(centreId, deals);
                        }
                    });
                }

                // Deals have been cached
                else {
                    loadDeals(centreId, deals);
                }
            }
            function loadDeals(centre, deals) {
                D.collections.setCentre(centre);

                // Deals have been cached
                if (deals.length > 0) {

                    // Add custom data to deals
                    var dealsLoaded = 0;
                    var dealsCount = deals.length;

                    $(deals.models).each(function(i, m) {

                        // Custom data has not been added
                        if (!m.storeDataLoaded) {

                            // Set Dates
                            m.attributes.from = moment(m.attributes.available_from).format('MM/DD/YYYY');
                            m.attributes.to = moment(m.attributes.available_to).format('MM/DD/YYYY');

                            var storeId = m.attributes.deal_stores[0].store_service_id;
                            var store = storeCache[storeId];

                            // Store has not been cached
                            if (!store) {
                                var Store = Backbone.Model.extend({
                                    urlRoot: 'store/master/stores/' + storeId + '.json'
                                });
                                var storeModel = new Store();
                                storeModel.fetch({
                                    success: function(s) {
                                        storeCache[storeId] = s;
                                        m.attributes.store = s.attributes.name;
                                        m.attributes.logoHref = s.attributes._links.logo.href;
                                        m.storeDataLoaded = true;
                                        dealsLoaded++;
                                        if (dealsLoaded === dealsCount) renderDeals(centre, deals);
                                    }
                                });
                            }

                            // Store has been cached
                            else {
                                m.attributes.store = store.attributes.name;
                                m.attributes.logoHref = store.attributes._links.logo.href;
                                m.storeDataLoaded = true;
                                dealsLoaded++;
                                if (dealsLoaded === dealsCount) renderDeals(centre, deals);
                            }
                        }

                        // Custom data has been added
                        else {
                            dealsLoaded++;
                            if (dealsLoaded === dealsCount) renderDeals(centre, deals);
                        }
                    });
                }

                // No deals for this centre
                else {
                    renderDeals(centre, deals);
                }
            }
            function renderDeals(centre, deals) {
                var template = 'no-deals';
                var context = {location:location};
                context.location.centre = centre;
                if (deals.length > 0) {
                    template = 'deals';
                    context.deals = deals.models;
                }
                var centreLI = 'li[data-centre=' + centre + '].centres';
                var dealsLI = 'li[data-centre=' + centre + '].deals';
                var loadingLI = 'li[data-centre=' + centre + '].waiting';
                $(loadingLI).remove();
                Handlebars.renderTemplate(template, context, centreLI, 'after');
                if ($(centreLI).is('.active')) {
                    $(dealsLI).show();
                }
            }
        }
    });
    D.listView = new listView();

    /***************
     * Router
     ***************/
    var Router = Backbone.Router.extend({
        routes: {
            "": "deals",
            "!/:country": "deals",
            "!/:country/:state": "deals",
            "!/:country/:state/:centre": "deals"
        },
        initialize: function(options) {
            D.headerView.render(options.title);
            Handlebars.renderTemplate('loading', {}, '#tab-nav');
            $.extend(defaultLocation, options.location);
        }
    });
    D.router = new Router({
        "title" : "Deals",
        "location" : {
            "country" : "au"
        }
    });
    D.router.on('route:deals', function(country, state, centre) {
        var renderDefaults = (!country || !state);
        var location = {
            country : country,
            state   : state,
            centre  : centre
        };

        // Default location not loaded, fetch default data and render
        if (!defaultsLoaded) {
            if (renderDefaults) {
                D.collections.setCountry(defaultLocation.country, function(defaultLoc) {
                    D.listView.render(defaultLoc);
                });
            }
            else {
                D.collections.setCountry(defaultLocation.country, function() {
                    D.listView.render(location);
                });
            }
        }

        // Country & State not provided, render default view
        else if (renderDefaults) {
            D.listView.render(defaultLocation);
        }

        // Render new location
        else {
            D.listView.render(location);
        }
    });

    $.ajaxPrefilter( function( options, originalOptions, jqXHR ) {
        options.crossDomain = crossDomain;
        options.url = 'http://www.westfield.com.au/api/' + options.url;
    });
    Backbone.history.start();
})();