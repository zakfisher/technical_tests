(function() {
    var D = this;
    var defaultLocation = {};
    var defaultsLoaded = false;
    var centreMap = {};
    var dealMap = {};

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
                                    centreMap[abbr] = centres;
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

                                // Once states have been filtered, fetch
                                if (count == statesOriginalLength) {
                                    if (callback) {
                                        callback(defaultLocation);
                                    }
                                    // Cache Deals
                                    for (var k in centreMap) {
                                        $(centreMap[k].models).each(function(j, centre) {
                                            c.setCentre(centre.attributes.code);
                                            var dealsCollection = new D.collections.Deals();
                                            dealsCollection.fetch({
                                                success: function (deals) {
                                                    dealMap[centre.attributes.code] = deals;
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
            $(view.$el).find('a[href="#' + location.country + '/' + location.state + '"]').parents('li').addClass('active');
        }
    });
    D.tabNavView = new tabNavView();

    var listView = Backbone.View.extend({
        el: '#list',
//        events: {
//            'submit .edit-user-form': 'saveUser',
//            'click .delete': 'deleteUser'
//        },
        render: function (location) {
            var view = this;
            function renderDeals(centres) {
                console.log(location);
                console.log('centres');
                console.log(centres);

                D.tabNavView.render(location);
                var context = {centres:centres.models};
                $(context.centres).each(function(i, v) {
                    v.location = location;
                });
                Handlebars.renderTemplate('list', context, view.$el);
                var deals = dealMap[location.centre];
                // Deals have not been cached
                if (!deals) {
                    D.collections.setCentre(location.centre);
                    var dealsCollection = new D.collections.Deals();
                    dealsCollection.fetch({
                        success: function (d) {
                            deals = d;
                            console.log('deals');
                            console.log(deals);
                            context = {deals:deals.models,location:location};
                            Handlebars.renderTemplate('deals', context, 'li[data-centre=' + location.centre + ']', 'after');
                            $(view.$el).find('li[data-centre=' + location.centre + '].deals').show();
                        }
                    });
                }
                // Deals have been cached
                else {
                    console.log('deals');
                    console.log(deals);
                    context = {deals:deals.models,location:location};
                    Handlebars.renderTemplate('deals', context, 'li[data-centre=' + location.centre + ']', 'after');
                    $(view.$el).find('li[data-centre=' + location.centre + '].deals').show();
                }
            }
            // Centre has not been specified
            if (!location.centre) {
                // Centre has not been cached yet
                if (!centreMap[location.state]) {
                    D.collections.setState(location.state);
                    var centresCollection = new D.collections.Centres();
                    centresCollection.fetch({
                        success:function(centres, response) {
                            location.centre = centresCollection.at(0).attributes.code;
                            console.log(location);
                            renderDeals(centresCollection);
                        }
                    });
                }
                // Centre has been cached
                else {
                    location.centre = centreMap[location.state].at(0).attributes.code;
                    renderDeals(centreMap[location.state]);
                }
            }
            // Centre has been specified
            else {
                renderDeals(centreMap[location.state]);
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
            ":country": "deals",
            ":country/:state": "deals",
            ":country/:state/:centre": "deals"
        },
        initialize: function(options) {
            D.headerView.render(options.title);
            Handlebars.renderTemplate('loading', {}, '#tab-nav');
            $.extend(defaultLocation, options.location);
        }
    });
    $.get('js/data.json', function(data) {
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
    });
})();