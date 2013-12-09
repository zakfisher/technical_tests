(function() {
    var D = this;

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
    var Deals = Backbone.Collection.extend({
        url: 'http://www.westfield.com.au/api/deal/master/deals'
    });
    var States = Backbone.Collection.extend({
        url: 'http://www.westfield.com.au/api/centre/master/states.json?country=au'
    });
    var Centres = Backbone.Collection.extend({
        url: 'http://www.westfield.com.au/api/centre/master/centres.json?state=NSW'
    });

    /***************
     * Models
     ***************/
    var Deal = Backbone.Model.extend({
        urlRoot: 'http://www.westfield.com.au/api/deal/master/deals'
    });

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
            if (options.id) { // One Deal
                var dealModel = new Deal(options);
                dealModel.fetch({
                    success: function (deal) {
                        console.log('loaded model #' + options.id);
                        console.log(dealModel);
                    }
                });
            }
            else { // All Deals
                var dealsCollection = new Deals();
                dealsCollection.fetch({
                    success: function (deals) {
                        console.log('loaded all models');
                        console.log(dealsCollection);
                    }
                });
            }
        }
    });
    D.dealsView = new DealsView();

    /***************
     * Router
     ***************/
    var Router = Backbone.Router.extend({
        routes: {
            "": "deals",
            ":id": "deals"
        },
        initialize: function(options) {
            Handlebars.renderTemplate('header', {logo:'logo',title:'Deals'}, '#header');
        }
    });
    D.router = new Router({});
    D.router.on('route:deals', function(id) {
        D.dealsView.render({id:id});
    });
    Backbone.history.start();
})();