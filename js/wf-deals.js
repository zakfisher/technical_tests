(function() {

    var D = this;
    var defaultLocation = {};
    var defaultsLoaded = false;
    var pageLoaded = false;
    var centreCache = {};
    var dealCache = {};
    var retailerCache = {};
    var lastState = '';

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
                if (navigator.appVersion.indexOf("X11")!=-1) OSName="UNIX";
                if (navigator.appVersion.indexOf("Linux")!=-1) OSName="Linux";
                return OSName;
            })(),
            name : M[0],
            version : M[1]
        });
    })();
    $('html').attr('data-platform', D.browser.platform).attr('data-name', D.browser.name).attr('data-version', D.browser.version);

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
                url: 'http://www.westfield.com.au/api/centre/master/states.json?country=' + country
            });
            statesCollection = new States();
            statesCollection.fetch({
                success:function(states, response) {

                    // Set Default State from Country
                    defaultLocation.state = statesCollection.at(0).attributes.abbreviation;
                    c.setState(defaultLocation.state);

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
                                    for (var k in centreCache) {
                                        $(centreCache[k].models).each(function(j, centre) {
                                            c.setCentre(centre.attributes.code);

                                            // Cache Deals
                                            var dealsCollection = new D.collections.Deals();
                                            dealsCollection.fetch({
                                                success: function(deals) {
                                                    dealCache[centre.attributes.code] = deals;
                                                }
                                            });

                                            // Cache Retailers
                                            var retailersCollection = new D.collections.Retailers();
                                            retailersCollection.fetch({
                                                success: function(retailers) {
                                                    $(retailers.models).each(function(i, r) {
                                                        retailerCache[r.attributes.id] = r;
                                                    });
                                                }
                                            });
                                        });
                                    }
                                }
                            }
                        });
                    });
                }
            });
        };
        c.setState = function(state) {
            c.Centres = Backbone.Collection.extend({
                url: 'http://www.westfield.com.au/api/centre/master/centres.json?state=' + state
            });
        };
        c.setCentre = function(centre) {
            c.Deals = Backbone.Collection.extend({
                url: 'http://www.westfield.com.au/api/deal/master/deals.json?centre=' + centre + '&state=published'
            });
            c.Retailers = Backbone.Collection.extend({
                url: 'http://www.westfield.com.au/api/store/master/stores.json?centre_id=' + centre
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
                $(view.$el).find('li.deals[data-centre=' + $(e.currentTarget).attr('data-centre') + ']').slideUp();
            }
            else {
                D.router.navigate('!/' + defaultLocation.country + '/' + $(e.currentTarget).attr('data-state') + '/' + $(e.currentTarget).attr('data-centre'));
                model.active = true;
                $(e.currentTarget).addClass('active').find('i').addClass('icon-minus').removeClass('icon-plus');
                $(view.$el).find('li.deals[data-centre=' + $(e.currentTarget).attr('data-centre') + ']').slideDown();
            }
        },
        render: function (location) {
            var view = this;
            var centres = centreCache[location.state];
            var deals = {};
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
                    D.tabNavView.render(location);
                    var context = {centres:centres.models};
                    $(context.centres).each(function(i, v) {

                        // If current centre and active == null, set active = true (to display the current centre by default)
                        if (location.centre === v.attributes.code && typeof v.active === 'undefined') v.active = true;
                        v.location = location;
                    });
                    Handlebars.renderTemplate('list', context, view.$el);
                    $(view.$el).fadeIn('slow');

                    // Render deals for each center
                    $(centres.models).each(function(i, v) {
                        deals = dealCache[v.attributes.code];

                        // Deals have not been cached
                        if (!deals) {
                            D.collections.setCentre(v.attributes.code);
                            var dealsCollection = new D.collections.Deals();
                            dealsCollection.fetch({
                                success: function (d) {
                                    deals = d;
                                    renderDeals(v.attributes.code);
                                }
                            });
                        }

                        // Deals have been cached
                        else {
                            console.log('using cache');
                            renderDeals(v.attributes.code);
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
                    });
                }

                lastState = location.state;
            }
            function renderDeals(centre) {
//                console.log(deals);

                D.collections.setCentre(centre);
//                console.log(centre);

                var template = 'no-deals';
                var context = {location:location};
                context.location.centre = centre;
                var centreLI = 'li[data-centre=' + centre + '].centres';
                var dealsLI = 'li[data-centre=' + centre + '].deals';

                // Deals have been cached
                if (deals.length > 0) {
                    template = 'deals';

//                            var retailers = retailerCache[location.centre];
//                            if (!retailers) {
//
//                            }
                    $(deals.models).each(function(i, m) {

                        m.attributes.from = moment(m.attributes.available_from).format('MM/DD/YYYY');
                        m.attributes.to = moment(m.attributes.available_to).format('MM/DD/YYYY');
                        m.attributes.retailer = retailerCache[m.attributes.deal_stores[0].store_service_id];
                        //console.log(retailerCache[m.attributes.deal_stores[0].store_service_id]);



                        // Add additional data from retailer
                        // Cache Retailers
//                    var retailersCollection = new D.collections.Retailers();
//                    retailersCollection.fetch({
//                        success: function(retailers) {
//                            $(retailers.models).each(function(i, r) {
//                                retailerCache[r.attributes.id] = r;
//                            });
//                        }
//                    });
                    });
                    context.deals = deals.models;
                }
                Handlebars.renderTemplate(template, context, centreLI, 'after');
                if ($(centreLI).is('.active')) {
                    if (!pageLoaded) {
                        pageLoaded = true;
                        $(dealsLI).slideDown();
                    }
                    else $(dealsLI).show();
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
            "!/:country/:state": "deals",
            "!/:country/:state/:centre": "deals"
        },
        initialize: function(options) {
            D.headerView.render(options.title);
            $.extend(defaultLocation, options.location);
        }
    });
    function init(data) {
        D.router = new Router(data);
        D.router.on('route:deals', function(country, state, centre) {
            var renderDefaults = (!country && !state);
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
        Backbone.history.start();
    }
    $.get('js/data.json', init);
    Handlebars.renderTemplate('loading', {}, '#tab-nav');
})();