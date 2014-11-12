
define('text!../bower.json',[],function () { return '{\n  "name": "minnpost-snow-emergency",\n  "version": "0.2.0",\n  "main": "index.html",\n  "homepage": "https://github.com/minnpost/minnpost-snow-emergency",\n  "repository": {\n    "type": "git",\n    "url": "https://github.com/minnpost/minnpost-snow-emergency"\n  },\n  "bugs": "https://github.com/minnpost/minnpost-snow-emergency/issues",\n  "license": "MIT",\n  "author": {\n    "name": "MinnPost",\n    "email": "data@minnpost.com"\n  },\n  "dependencies": {\n    "moment": "~2.8.3",\n    "jquery": "^1.11",\n    "ractive": "^0.5.8",\n    "ractive-events-tap": "~0.1.0",\n    "requirejs": "~2.1.11",\n    "text": "~2.0.10",\n    "underscore": "~1.7.0",\n    "cartodb.js": "~3.11.30",\n    "almond": "~0.3.0",\n    "backbone": "~1.1.2",\n    "minnpost-styles": "master",\n    "rgrove-lazyload": "*",\n    "ractive-backbone": "~0.2.0"\n  },\n  "dependencyMap": {\n    "requirejs": {\n      "rname": "requirejs",\n      "js": [\n        "requirejs/require"\n      ]\n    },\n    "almond": {\n      "rname": "almond",\n      "js": [\n        "almond/almond"\n      ]\n    },\n    "text": {\n      "rname": "text",\n      "js": [\n        "text/text"\n      ]\n    },\n    "jquery": {\n      "rname": "jquery",\n      "js": [\n        "jquery/dist/jquery"\n      ],\n      "returns": "$"\n    },\n    "underscore": {\n      "rname": "underscore",\n      "js": [\n        "underscore/underscore"\n      ],\n      "returns": "_"\n    },\n    "backbone": {\n      "rname": "backbone",\n      "js": [\n        "backbone/backbone"\n      ],\n      "returns": "Backbone"\n    },\n    "rgrove-lazyload": {\n      "rname": "lazyload",\n      "js": [\n        "rgrove-lazyload/lazyload"\n      ],\n      "returns": "Lazyload"\n    },\n    "ractive": {\n      "rname": "ractive",\n      "js": [\n        "ractive/ractive-legacy"\n      ],\n      "returns": "Ractive"\n    },\n    "ractive-backbone": {\n      "rname": "ractive-backbone",\n      "js": [\n        "ractive-backbone/ractive-adaptors-backbone"\n      ],\n      "returns": "RactiveBackbone"\n    },\n    "ractive-events-tap": {\n      "rname": "ractive-events-tap",\n      "js": [\n        "ractive-events-tap/ractive-events-tap"\n      ],\n      "returns": "RactiveEventsTap"\n    },\n    "moment": {\n      "rname": "moment",\n      "js": [\n        "moment/moment"\n      ],\n      "returns": "moment"\n    },\n    "cartodb": {\n      "rname": "cartodb",\n      "js": [\n        "cartodb.js/dist/cartodb.uncompressed"\n      ],\n      "css": [\n        "cartodb.js/themes/css/cartodb"\n      ],\n      "ie": [\n        "cartodb.js/themes/css/cartodb.ie"\n      ],\n      "returns": "cartodb"\n    },\n    "mpConfig": {\n      "rname": "mpConfig",\n      "js": [\n        "minnpost-styles/dist/minnpost-styles.config"\n      ],\n      "returns": "mpConfig"\n    },\n    "mpFormatters": {\n      "rname": "mpFormatters",\n      "js": [\n        "minnpost-styles/dist/minnpost-styles.formatters"\n      ],\n      "returns": "mpFormatters"\n    }\n  }\n}\n';});

/**
 * Base class(es) for applications.
 */

// Create main application
define('base',['jquery', 'underscore', 'backbone', 'lazyload', 'mpFormatters', 'text!../bower.json'],
  function($, _, Backbone, Lazyload, formatters, bower) {
  

  var Base = {};
  bower = JSON.parse(bower);

  // Base App constructor
  Base.BaseApp = function(options) {
    // Attach options
    this.options = _.extend(this.baseDefaults || {}, this.defaults || {}, options || {});
    this.name = this.options.name;

    // Handle element if in options
    if (this.options.el) {
      this.el = this.options.el;
      this.$el = $(this.el);
      this.$ = function(selector) { return this.$el.find(selector); };
    }

    // Determine paths and get assesets
    this.determinePaths();
    this.renderAssests();

    // Run an initializer once CSS has been loaded
    this.on('cssLoaded', function() {
      this.initialize.apply(this, arguments);
    });
  };

  // Extend with Backbone Events and other properties
  _.extend(Base.BaseApp.prototype, Backbone.Events, {
    // Attach bower info
    bower: bower,

    // Default options
    baseDefaults: {
      jsonpProxy: '//mp-jsonproxy.herokuapp.com/proxy?url=',
      availablePaths: {
        local: {
          css: ['.tmp/css/main.css'],
          images: 'images/',
          data: 'data/'
        },
        build: {
          css: [
            'dist/[[[PROJECT_NAME]]].libs.min.css',
            'dist/[[[PROJECT_NAME]]].latest.min.css'
          ],
          images: 'dist/images/',
          data: 'dist/data/'
        },
        deploy: {
          css: [
            '//s3.amazonaws.com/data.minnpost/projects/' +
              '[[[PROJECT_NAME]]]/[[[PROJECT_NAME]]].libs.min.css',
            '//s3.amazonaws.com/data.minnpost/projects/' +
              '[[[PROJECT_NAME]]]/[[[PROJECT_NAME]]].latest.min.css'
          ],
          images: '//s3.amazonaws.com/data.minnpost/projects/[[[PROJECT_NAME]]]/images/',
          data: '//s3.amazonaws.com/data.minnpost/projects/[[[PROJECT_NAME]]]/data/'
        }
      }
    },

    // Determine paths.  A bit hacky.
    determinePaths: function() {
      var query;

      // Only handle once
      if (_.isObject(this.options.paths) && !_.isUndefined(this.options.deployment)) {
        return this.options.paths;
      }

      // Deploy by default
      this.options.deployment = 'deploy';

      if (window.location.host.indexOf('localhost') !== -1) {
        this.options.deployment = 'local';

        // Check if a query string forces something
        query = this.parseQueryString();
        if (_.isObject(query) && _.isString(query.mpDeployment)) {
          this.options.deployment = query.mpDeployment;
        }
      }

      this.options.paths = this.options.availablePaths[this.options.deployment];
      return this.options.paths;
    },

    // Get assests.  We use the rgrove lazyload library since it is simple
    // and small, but it is unmaintained.
    renderAssests: function() {
      var thisApp = this;
      var scripts = [];

      // Add CSS from bower dependencies
      _.each(this.bower.dependencyMap, function(c, ci) {
        if (c.css) {
          _.each(c.css, function(s, si) {
            // If local, add script, else only add external scripts
            if (thisApp.options.deployment === 'local') {
              s = (s.match(/^(http|\/\/)/)) ? s : 'bower_components/' + s + '.css';
              scripts.push(thisApp.makePath(s));
            }
            else if (s.match(/^(http|\/\/)/)) {
              scripts.push(thisApp.makePath(s));
            }
          });
        }
      });

      // Add app CSS
      _.each(this.options.paths.css, function(c, ci) {
        scripts.push(thisApp.makePath(c));
      });

      // Load and fire event when done
      Lazyload.css(scripts, function() {
        this.trigger('cssLoaded');
      }, null, this);
    },

    // Make path
    makePath: function(path) {
      path = path.split('[[[PROJECT_NAME]]]').join(this.name);
      if (this.options.basePath && !path.match(/^(http|\/\/)/)) {
        path = this.options.basePath + path;
      }
      return path;
    },

    // Override Backbone's ajax call to use JSONP by default as well
    // as force a specific callback to ensure that server side
    // caching is effective.
    overrideBackboneAJAX: function() {
      Backbone.ajax = function() {
        var options = arguments[0];
        if (options.dataTypeForce !== true) {
          return this.jsonpRequest(options);
        }
        return Backbone.$.ajax.apply(Backbone.$, [options]);
      };
    },

    // Unfortunately we need this more often than we should
    isMSIE: function() {
      var match = /(msie) ([\w.]+)/i.exec(navigator.userAgent);
      return match ? parseInt(match[2], 10) : false;
    },

    // Read query string
    parseQueryString: function() {
      var assoc  = {};
      var decode = function(s) {
        return decodeURIComponent(s.replace(/\+/g, " "));
      };
      var queryString = location.search.substring(1);
      var keyValues = queryString.split('&');

      _.each(keyValues, function(v, vi) {
        var key = v.split('=');
        if (key.length > 1) {
          assoc[decode(key[0])] = decode(key[1]);
        }
      });

      return assoc;
    },

    // Wrapper for a JSONP request, the first set of options are for
    // the AJAX request, while the other are from the application.
    //
    // JSONP is hackish, but there are still data sources and
    // services that we don't have control over that don't fully
    // support CORS
    jsonpRequest: function(options) {
      options.dataType = 'jsonp';

      // If no callback, use proxy
      if (this.options.jsonpProxy && options.url.indexOf('callback=') === -1) {
        options.jsonpCallback = 'mpServerSideCachingHelper' +
          formatters.hash(options.url);
        options.url = this.options.jsonpProxy + encodeURIComponent(options.url) +
          '&callback=' + options.jsonpCallback;
        options.cache = true;
      }

      return $.ajax.apply($, [options]);
    },


    // Project data source handling for data files that are not
    // embedded in the application itself.  For development, we can call
    // the data directly from the JSON file, but for production
    // we want to proxy for JSONP.
    //
    // Takes single or array of paths to data, relative to where
    // the data source should be.
    //
    // Returns jQuery's defferred object.
    dataRequest: function(datas) {
      var thisApp = this;
      var useJSONP = false;
      var defers = [];
      datas = (_.isArray(name)) ? datas : [ datas ];

      // If the data path is not relative, then use JSONP
      if (this.options.paths.data.indexOf('http') === 0) {
        useJSONP = true;
      }

      // Go through each file and add to defers
      _.each(datas, function(d) {
        var defer = (useJSONP) ?
          thisApp.jsonpRequest(thisApp.options.paths.data + d) :
          $.getJSON(thisApp.options.paths.data + d);
        defers.push(defer);
      });

      return $.when.apply($, defers);
    },

    // Empty initializer
    initialize: function() { }
  });

  // Add extend from Backbone
  Base.BaseApp.extend = Backbone.Model.extend;


  return Base;
});


define('text!templates/application.mustache',[],function () { return '<div class="message-container"></div>\n\n<div class="content-container ">\n  {{#winterParkingRestriction}}\n    <p class="parking-restrictions"><strong>Winter parking restrictions in effect.</strong>  This means that you cannot park on the even side of the street until April 1st or until notified by the City. This does not apply during snow emergencies.</p>\n  {{/winterParkingRestriction}}\n\n  {{^isSnowEmergency}}\n    <div class="narrative">\n      <h3>There is no snow emergency at the moment</h3>\n      <p>To plan ahead, set a snow emergency day:\n        <select value="{{ chooseDay }}">\n          <option value="">&lt;pick a day&gt;</option>\n          <option value="1">Day 1</option>\n          <option value="2">Day 2</option>\n          <option value="3">Day 3</option>\n        </select>\n      </p>\n    </div>\n  {{/isSnowEmergency}}\n\n  {{#isSnowEmergency}}\n    <div class="narrative">\n      <h3>{{ snowEmergencyTitle }}</h3>\n\n      <div class="snow-emergency-day-status">\n        <p>{{ snowEmergencyText }}\n          {{#(lastSnowEmergencyDay !== null)}}\n            The current snow emergency began on {{ lastSnowEmergencyDay.format(\'MMMM Do\') }} at 9 p.m.\n          {{/()}}\n        </p>\n      </div>\n    </div>\n\n    <form on-submit="formSubmit" class="location-search-form">\n      <p>Search for an address or use your location to see parking restrictions near you.</p>\n\n      <input type="text" class="address-input" value="{{ address }}" placeholder="Enter address, ex. 900 6th Ave SE, Minneapolis, MN 55414" />\n\n      <button type="submit" class="address-button" title="Search address" on-tap="addressSearch">Search</button>\n\n      {{#canGeoLocate}}\n        <button type="submit" class="geolocation-button" title="Use the location of your device" on-tap="geolocateSearch"></button>\n      {{/canGeoLocate}}\n    </form>\n\n    <div class="narrative focus-found">\n      {{#(isLoading === true)}}\n        {{>loading}}\n      {{/())}}\n\n      {{#messages}}\n        <p class="messages">{{ messages }}</p>\n      {{/messages}}\n\n      {{#(nearParking !== undefined)}}\n        {{#nearParking}}\n          <p>Looks like you shouldn\'t park here<sup>&dagger;</sup>.  Check the map for more detail.</p>\n        {{/nearParking}}\n\n        {{^nearParking}}\n          <p>Looks like you are clear to park here<sup>&dagger;</sup>.  Check the map for more detail.</p>\n        {{/nearParking}}\n\n        <div class="note">And follow any other posted parking signs.</div>\n      {{/()}}\n    </div>\n\n    <div id="snow-emergency-map"></div>\n  {{/isSnowEmergency}}\n\n</div>\n\n<div class="footnote-container">\n  <div class="footnote">\n    <p><sup>&dagger;</sup>\n      Snow plow route data provided by the City of Minneapolis, last received on {{ routeLastUpdate.format(\'MMM DD, YYYY\') }}.\n      Though we try to keep the route data up to date, it may be subject to changes.  An offical map is also available from the City\'s <a href="http://www.ci.minneapolis.mn.us/snow/snowstreetlookup" target="_blank">street lookup service</a>.\n      MinnPost is not responsible for any traffic violations that may occur as a result of using this application.\n    </p>\n\n    <p>\n      Some map data &copy; OpenStreetMap contributors; licensed under the <a href="http://www.openstreetmap.org/copyright" target="_blank">Open Data Commons Open Database License</a>.\n      Some map design &copy; MapBox; licensed according to the <a href="http://mapbox.com/tos/" target="_blank">MapBox Terms of Service</a>.\n      Location geocoding provided by <a href="http://www.mapquest.com/" target="_blank">Mapquest</a> and is not guaranteed to be accurate.\n      Some mapping services provided by <a href="http://cartodb.com/attributions" target="_blank">CartoDB</a>.\n      <a href="http://thenounproject.com/term/snowed-in/30065/" target="_blank">Snowed In</a> designed by Claire Jones from the Noun Project.\n      Some code, techniques, and data on <a href="https://github.com/minnpost/minnpost-snow-emergency" target="_blank">Github</a>.\n    </p>\n  </div>\n</div>\n';});


define('text!templates/loading.mustache',[],function () { return '<div class="loading-container">\n  <div class="loading"><span>Loading...</span></div>\n</div>';});

/**
 * Main application file for: minnpost-snow-emergency
 * * This pulls in all the parts
 * and creates the main object for the application.
 */

// Create main application
require([
  'jquery', 'underscore', 'backbone', 'ractive', 'ractive-events-tap',
  'cartodb', 'moment', 'base',
  'text!templates/application.mustache',
  'text!templates/loading.mustache'
], function(
  $, _, Backbone, Ractive, RactiveEventsTap, cartodb, moment, Base,
  tApplication, tLoading
  ) {
  

  // Get the correct cartodb and leaflet
  var L = window.L;
  cartodb = window.cartodb;

  // Create new class for app
  var App = Base.BaseApp.extend({

    defaults: {
      name: 'minnpost-snow-emergency',
      el: '.minnpost-snow-emergency-container',
      routeLastUpdate: moment('2014-11-10'),
      lastSnowEmergencyDay: moment('2014-01-01'),
      minneapolisExtent: [-93.3292, 44.8896, -93.1978, 45.0512],
      // Please don't steal/abuse
      mapQuestQuery: 'http://open.mapquestapi.com/geocoding/v1/address?key=Fmjtd%7Cluur20a7n0%2C8n%3Do5-9a1s9f&outFormat=json&countrycodes=us&maxResults=1&location=[[[ADDRESS]]]&callback=?',
      cartoDBQuery: 'http://zzolo-minnpost.cartodb.com/api/v2/sql?format=GeoJSON&callback=?&q=[[[QUERY]]]',
      cartoDBLayer: 'http://zzolo-minnpost.cartodb.com/api/v2/viz/3fb9a154-9604-11e3-b5ac-0e625a1c94a6/viz.json',
      cartoDBTable: 'snow_routes_20141110',
      defaultAccuracy: 15,
      colors: {
        day1: '#009BC2',
        day2: '#7525BB',
        day3: '#FF7424',
        dontPark: '#B22715'
      },
      restrictions: {
        day1: 'That means from 9 p.m. to 8 a.m. (overnight), you cannot park on streets that are marked as snow emergency routes.  These are routes with specific signs or blue street signs.',
        day2: 'That means from 8 a.m. to 8 p.m., you cannot park on the even side of non-snow emergency routes or on either side of parkways.',
        day3: 'That means from 8 a.m. to 8 p.m., you cannot park on the odd side of non-snow emergency routes.'
      },
      winterParkingRestriction: false
    },

    initialize: function() {
      var thisApp = this;
      this.data = {};

      // Determine day
      this.snowEmergencyState();

      // Set some values for the template
      this.data.routeLastUpdate = this.options.routeLastUpdate;
      this.data.snowEmergencyDay = this.options.snowEmergencyDay;
      this.data.isSnowEmergency = this.options.isSnowEmergency;
      this.data.lastSnowEmergencyDay = this.options.lastSnowEmergencyDay;
      this.data.snowEmergencyTitle = this.options.snowEmergencyTitle;
      this.data.snowEmergencyText = this.options.snowEmergencyText;
      this.data.winterParkingRestriction = this.options.winterParkingRestriction;
      this.data.isLoading = false;
      this.data.nearParking = undefined;
      this.data.chooseDay = undefined;
      this.data.canGeoLocate = this.checkGeolocate();

      // Create main application view
      this.mainView = new Ractive({
        el: this.$el,
        template: tApplication,
        data: this.data,
        partials: {
          loading: tLoading
        }
      });

      // Is emergency
      this.mainView.observe('isSnowEmergency', function(n, o) {
        if (n === true) {
          // Defer just to make sure dom is ready
          _.defer(_.bind(thisApp.makeMap, thisApp));
        }
      }, { defer: true });

      // Allow for "testing"
      this.mainView.observe('chooseDay', function(n, o) {
        n = parseInt(n, 10);
        if (!_.isNaN(n)) {
          this.set('lastSnowEmergencyDay', null);
          this.set('snowEmergencyDay', n);
          this.set('isSnowEmergency', true);
          this.set('snowEmergencyTitle', 'It is Day ' + n + ' of the snow emergency');
          this.set('snowEmergencyText', thisApp.options.restrictions['day' + n]);
        }
      });

      // Ensure regular form submission won't happen
      this.mainView.on('formSubmit', function(e) {
        e.original.preventDefault();
        thisApp.searchAddress(this.get('address'));
      });

      // Geolocation
      this.mainView.on('geolocateSearch', function(e) {
        e.original.preventDefault();

        if (!thisApp.watchID) {
          thisApp.geolocate();
        }
      });
    },

    // Make the map
    makeMap: function() {
      var thisApp = this;

      // Initialize map
      this.map = new L.Map('snow-emergency-map', {
        center: [44.970753517451946, -93.26185335000002],
        zoom: 12,
        minZoom: 10,
        maxZoom: 17,
        scrollWheelZoom: false
      });
      L.tileLayer('//{s}.tiles.mapbox.com/v3/minnpost.map-wi88b700/{z}/{x}/{y}.png').addTo(this.map);

      // Remove attribution
      this.map.removeControl(this.map.attributionControl);

      // Add route layer
      cartodb.createLayer(this.map, this.options.cartoDBLayer).addTo(this.map)
      .on('done', function(layer) {
        // Something
      })
      .on('error', function() {
        thisApp.issue('There was an error loading the snow route information.');
      });
    },

    // Geolocate
    geolocate: function() {
      var thisApp = this;
      var id;
      this.resetSearch();

      // Use geolocation
      this.watchID = navigator.geolocation.watchPosition(function(position) {
        thisApp.closestRoutes(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
      }, function(error) {
        // timeout: error.code === 3
        thisApp.issue('There was an error trying to find your position.');
      }, {
        maximumAge: 5000
        //enableHighAccuracy: true
      });
    },

    // Search address
    searchAddress: function(address) {
      var thisApp = this;

      if (address) {
        thisApp.resetSearch();

        // Turn off any geocode watching
        if (this.watchID) {
          navigator.geolocation.clearWatch(this.watchID);
          this.watchID = undefined;
        }

        // Geocode address
        $.getJSON(this.options.mapQuestQuery.replace('[[[ADDRESS]]]', encodeURIComponent(address)))
          .done(function(response) {
            var latlng;
            if (_.size(response.results[0].locations) > 0 &&
              _.isObject(response.results[0].locations[0].latLng)) {
              latlng = response.results[0].locations[0].latLng;
              thisApp.closestRoutes(latlng.lat, latlng.lng);
            }
            else {
              thisApp.issue('That address could not be found, please try another or more specific one.');
            }
          })
          .error(function() {
            thisApp.issue('That address could not be found, please try another or more specific one.');
          });
      }
    },

    // Handle lat lon and get closest routes
    closestRoutes: function(lat, lon, meters) {
      var thisApp = this;
      var closestSQL, noParkingSQL, distance;

      // Check if in Minneapolis
      if (lat < this.options.minneapolisExtent[1] ||
        lat > this.options.minneapolisExtent[3] ||
        lon < this.options.minneapolisExtent[0] ||
        lon > this.options.minneapolisExtent[2]) {
        this.issue('This location does not seem to be in Minneapolis.');
        return;
      }

      // Set location
      this.location = [lat, lon];
      this.accuracy = meters || this.options.defaultAccuracy;

      // Set view of map
      this.map.setView([lat, lon], 17);

      // Make queryies
      distance = 'ST_Distance(ST_SetSRID(the_geom, 4326), ' +
        'ST_SetSRID(ST_MakePoint(' + lon + ', ' + lat + ') , 4326))';
      closestSQL = 'SELECT the_geom, day1, day2, day3, cartodb_id, id, ' + distance +
        ' AS distance FROM ' + this.options.cartoDBTable + ' ORDER BY ' + distance + ' LIMIT 1';
      noParkingSQL = 'SELECT the_geom, day1, day2, day3, cartodb_id, id, ' + distance +
        ' AS distance FROM ' + this.options.cartoDBTable +
        ' WHERE day' + this.data.snowEmergencyDay + ' = 0 ORDER BY ' + distance + ' LIMIT 20';

      // Get queries
      $.when(
        $.getJSON(this.options.cartoDBQuery.replace('[[[QUERY]]]', encodeURIComponent(closestSQL))),
        $.getJSON(this.options.cartoDBQuery.replace('[[[QUERY]]]', encodeURIComponent(noParkingSQL)))
        ).done(function(closest, noParking) {
          if (closest[1] === 'success' && noParking[1] === 'success') {
            thisApp.renderRoutes(closest[0], noParking[0]);
          }
        }).fail(function() {
          thisApp.issue('There was an issue determining the closest snow emergency routes.');
        });
    },

    // Show routes
    renderRoutes: function(closest, noParking) {
      var thisApp = this;
      var nearParking;
      this.mainView.set('messages', '');

      // Remove any existing layers
      if (_.isObject(this.routeLayer)) {
        this.map.removeLayer(this.routeLayer);
        this.map.removeLayer(this.locationLayer);
      }

      // Use the closest one to suggest what is close
      this.mainView.set('isLoading', false);
      nearParking = (closest.features[0].properties['day' + this.data.snowEmergencyDay.toString()] === 0) ? true : false;
      this.mainView.set('nearParking', nearParking);

      // Make layer and style
      this.routeLayer = new L.geoJson(noParking, {
        style: function(feature) {
          return {
            fillColor: thisApp.options.colors.dontPark,
            color: thisApp.options.colors.dontPark,
            weight: 1,
            opacity: 0.5,
            fillOpacity: 0.75,
            clickable: false
          };
        }
      });

      // Make location marker
      this.locationLayer = L.circleMarker(this.location, {
        radius: 8,
        fillColor: '#10B21A',
        color: '#10B21A',
        weight: this.accuracy / 3,
        opacity: 0.25,
        fillOpacity: 0.85,
        clickable: false
      });

      // Add layers
      this.map.addLayer(this.routeLayer);
      this.map.addLayer(this.locationLayer);

      // Scoll page.  Scroll if not currently watching
      if (!this.watchID || !this.scrolled) {
        $('html, body').stop().animate({
          scrollTop: this.$el.find('.focus-found').offset().top - 15
        }, 750);
        this.scrolled = (this.watchID) ? true : false;
      }
    },

    // Reset search stuff
    resetSearch: function() {
      this.mainView.set('isLoading', true);
      this.mainView.set('nearParking', undefined);
      this.mainView.set('messages', false);
    },

    // Check if can geolocate
    checkGeolocate: function() {
      return (_.isObject(navigator) && _.isObject(navigator.geolocation));
    },

    // Issue with location
    issue: function(message) {
      this.mainView.set('isLoading', false);
      this.mainView.set('messages', message);
    },

    // Determine snow emergency state
    snowEmergencyState: function() {
      var now = moment().zone(-3600).local();
      var sDay = moment(this.options.lastSnowEmergencyDay).zone(-3600).local();
      var points = {};
      var restrictions = {};

      // Ensure we were given a good date
      if (moment.isMoment(this.options.lastSnowEmergencyDay)) {
        // The different points for calculating when in the snow
        // emergency we are
        points = {
          day1before: moment(sDay).hour(2).minute(0),
          day1start: moment(sDay).hour(21).minute(0),
          day2start: moment(sDay).add(1, 'd').hour(8).minute(0),
          day2over: moment(sDay).add(1, 'd').hour(20).minute(0),
          day3start: moment(sDay).add(2, 'd').hour(8).minute(0),
          day3over: moment(sDay).add(2, 'd').hour(20).minute(0)
        };

        // The last date should be within 3 days of now
        if (now.isAfter(points.day3over) || now.isBefore(points.day1before)) {
          this.options.isSnowEmergency = false;
        }
        else {
          this.options.isSnowEmergency = true;

          // Before Day 1 restrictions start
          if (now.isAfter(points.day1before) && now.isBefore(points.day1start)) {
            this.options.snowEmergencyDay = 1;
            this.options.snowEmergencyTitle = 'Snow emergency declared, Day 1 restrictions start at 9 p.m.';
            this.options.snowEmergencyText = this.options.restrictions.day1;
          }
          // Day 1 in effect
          else if ((now.isAfter(points.day1start) || now.isSame(points.day1start)) && now.isBefore(points.day2start)) {
            this.options.snowEmergencyDay = 1;
            this.options.snowEmergencyTitle = 'It is Day 1 of a snow emergency';
            this.options.snowEmergencyText = this.options.restrictions.day1;
          }
          // Day 2 in effect
          else if ((now.isAfter(points.day2start) || now.isSame(points.day2start)) && now.isBefore(points.day2over)) {
            this.options.snowEmergencyDay = 2;
            this.options.snowEmergencyTitle = 'It is Day 2 of a snow emergency';
            this.options.snowEmergencyText = this.options.restrictions.day2;
          }
          // Between Day 2 and Day 3
          else if ((now.isAfter(points.day2over) || now.isSame(points.day2over)) && now.isBefore(points.day3start)) {
            this.options.snowEmergencyDay = 3;
            this.options.snowEmergencyTitle = 'Snow emergency in effect, Day 3 restrictions start at 8 a.m.';
            this.options.snowEmergencyText = this.options.restrictions.day3;
          }
          // Day 3
          else if ((now.isAfter(points.day3start) || now.isSame(points.day3start)) && now.isBefore(points.day3over)) {
            this.options.snowEmergencyDay = 3;
            this.options.snowEmergencyTitle = 'It is Day 3 of a snow emergency';
            this.options.snowEmergencyText = this.options.restrictions.day3;
          }
        }
      }
    }
  });

  // Create instance and return
  return new App({});
});

define("app", function(){});

