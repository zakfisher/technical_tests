(function() {
    var D = this;

    var defaults = {
        country : 'au',
        state   : 'NSW',
        centre  : 'bondijunction'
    };

    /***************
     * Browser
     ***************/
    D.browser = $.extend({}, {
        features : $('html').attr('class').split(' '),
        hasFeature : function(feature) {
            return $.inArray(feature, D.browser.features) > -1;
        }
    });

    /***************
     * Collections
     ***************/
    D.collections = new function() {
        var c = this;
        c.setCountry = function(country) {
            c.States = Backbone.Collection.extend({
                url: 'http://www.westfield.com.au/api/centre/master/states.json?country=' + country
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
        c.init = function(options) {
            c.setCountry(options.country);
            c.setState(options.state);
            c.setCentre(options.centre);
        };
    };

    /***************
     * Views
     ***************/
    var DealsView = Backbone.View.extend({
        el: '#content',
//        events: {
//            'submit .edit-user-form': 'saveUser',
//            'click .delete': 'deleteUser'
//        },
        render: function (options) {
            if (!options.centre) {
                options.centre = defaults.centre;
            }
            D.collections.setCentre(options.centre);
            var dealsCollection = new D.collections.Deals();
            dealsCollection.fetch({
                success: function (deals) {
                    console.log('all deals');
                    console.log(dealsCollection.at(0).attributes.deal_stores[0].centre_id);
                }
            });
        }
    });
    D.dealsView = new DealsView();

    /***************
     * Router
     ***************/
    var Router = Backbone.Router.extend({
        routes: {
            "": "deals",
            ":centre": "deals"
        },
        initialize: function(options) {
            $.extend(defaults, options);
            D.collections.init(defaults);
            var statesCollection = new D.collections.States();
            statesCollection.fetch({
                success:function(states, response) {
                    console.log('states');
                    console.log(states);
                }
            });
            var centresCollection = new D.collections.Centres();
            centresCollection.fetch({
                success:function(centres, response) {
                    console.log('centres');
                    console.log(centres);
                }
            });
            Handlebars.renderTemplate('header', {logo:'logo',title:'Deals'}, '#header');
        }
    });
    D.router = new Router({});
    D.router.on('route:deals', function(centre) {
        D.dealsView.render({centre:centre});
    });
    Backbone.history.start();
})();