
/**
 * Helpers functions such as formatters or extensions
 * to libraries.
 */
define('helpers', ['jquery', 'underscore'],
  function($, _) {

  _.mixin({
    deepClone: function(obj) {
      return JSON.parse(JSON.stringify(obj));
    }
  });

  // Create object of methods to use
  return {
    /**
     * Formats number
     */
    formatNumber: function(num, decimals) {
      decimals = (_.isUndefined(decimals)) ? 2 : decimals;
      var rgx = (/(\d+)(\d{3})/);
      split = num.toFixed(decimals).toString().split('.');

      while (rgx.test(split[0])) {
        split[0] = split[0].replace(rgx, '$1' + ',' + '$2');
      }
      return (decimals) ? split[0] + '.' + split[1] : split[0];
    },

    /**
     * Formats number into currency
     */
    formatCurrency: function(num) {
      return '$' + this.formatNumber(num, 2);
    },

    /**
     * Formats percentage
     */
    formatPercent: function(num) {
      return this.formatNumber(num * 100, 1) + '%';
    },

    /**
     * Formats percent change
     */
    formatPercentChange: function(num) {
      return ((num > 0) ? '+' : '') + this.formatPercent(num);
    },

    /**
     * Converts string into a hash (very basically).
     */
    hash: function(str) {
      return Math.abs(_.reduce(str.split(''), function(a, b) {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0));
    },

    /**
     * Creates identifier for things like CSS classes.
     */
    identifier: function(str) {
      return str.toLowerCase().replace(/[^\w ]+/g,'').replace(/ +/g,'-').replace(/[^\w-]+/g,'');
    },

    /**
     * Returns version of MSIE.
     */
    isMSIE: function() {
      var match = /(msie) ([\w.]+)/i.exec(navigator.userAgent);
      return match ? parseInt(match[2], 10) : false;
    },

    /**
     * Wrapper for a JSONP request
     */
    jsonpRequest: function() {
      var options = arguments[0];

      options.dataType = 'jsonp';
      options.jsonpCallback = 'mpServerSideCachingHelper' +
        _.hash(options.url);
      return $.ajax.apply($, [options]);
    },

    /**
     * Data source handling.  For development, we can call
     * the data directly from the JSON file, but for production
     * we want to proxy for JSONP.
     *
     * `name` should be relative path to dataset minus the .json
     *
     * Returns jQuery's defferred object.
     */
    getLocalData: function(name, options) {
      var thisHelper = this;
      var proxyPrefix = options.jsonpProxy;
      var useJSONP = false;
      var defers = [];

      this.data = this.data || {};
      name = (_.isArray(name)) ? name : [ name ];

      // If the data path is not relative, then use JSONP
      if (options && options.dataPath.indexOf('http') === 0) {
        useJSONP = true;
      }

      // Go through each file and add to defers
      _.each(name, function(d) {
        var defer;
        if (_.isUndefined(thisHelper.data[d])) {

          if (useJSONP) {
            defer = thisHelper.jsonpRequest({
              url: proxyPrefix + encodeURI(options.dataPath + d + '.json')
            });
          }
          else {
            defer = $.getJSON(options.dataPath + d + '.json');
          }

          $.when(defer).done(function(data) {
            thisHelper.data[d] = data;
          });
          defers.push(defer);
        }
      });

      return $.when.apply($, defers);
    },

    /**
     * Get remote data.  Provides a wrapper around
     * getting a remote data source, to use a proxy
     * if needed, such as using a cache.
     */
    getRemoteData: function(options) {
      options.dataType = 'jsonp';

      if (this.options.remoteProxy) {
        options.url = options.url + '&callback=proxied_jqjsp';
        options.url = app.options.remoteProxy + encodeURIComponent(options.url);
        options.callback = 'proxied_jqjsp';
        options.cache = true;
      }

      return $.ajax(options);
    }
  };
});


define('text!templates/application.mustache',[],function () { return '<div class="message-container"></div>\n\n<div class="content-container {{#isNotCapable.toUseArrays}}no-cartodb{{/isNotCapable.toUseArrays}}">\n  {{^isSnowEmergency}}\n    <div class="narrative">\n      <h3>There is no snow emergency at the moment</h3>\n      <p>To plan ahead, set a snow emergency day:\n        <select value="{{ chooseDay }}">\n          <option value="">&lt;pick a day&gt;</option>\n          <option value="1">Day 1</option>\n          <option value="2">Day 2</option>\n          <option value="3">Day 3</option>\n        </select>\n      </p>\n    </div>\n  {{/isSnowEmergency}}\n\n  {{#isSnowEmergency}}\n    <div class="narrative">\n      <h3>It is Day {{ snowEmergencyDay }} of the snow emergency</h3>\n\n      <div class="snow-emergency-day-status">\n        {{#(snowEmergencyDay === 1)}}\n          <p>That means from 9PM to 8AM (overnight), you cannot park on streets that are marked as snow emergency routes.  These are routes with specific signs or blue street signs.</p>\n        {{/()}}\n\n        {{#(snowEmergencyDay === 2)}}\n          <p>That means from 8AM to 8PM, you cannot park on the even side of the street or parkways on non-snow emergency routes.</p>\n        {{/()}}\n\n        {{#(snowEmergencyDay === 3)}}\n          <p>That means from 8AM to 8PM, you cannot park on the odd side of the street on non-snow emergency routes.</p>\n        {{/()}}\n      </div>\n    </div>\n\n    <form proxy-submit="formSubmit" class="location-search-form">\n      <p>Search for an address or use your location to see parking restrictions near you.</p>\n\n      <input type="text" class="address-input" value="{{ address }}" placeholder="Enter address, ex. 900 6th Ave SE, Minneapolis, MN 55414" />\n\n      <button type="submit" class="address-button" title="Search address" on-tap="addressSearch">Search</button>\n\n      {{#canGeoLocate}}\n        <button type="submit" class="geolocation-button" title="Use the location of your device" on-tap="geolocateSearch"></button>\n      {{/canGeoLocate}}\n    </form>\n\n    <div class="narrative focus-found">\n      {{#(isLoading === true)}}\n        {{>loading}}\n      {{/())}}\n\n      {{#messages}}\n        <p class="messages">{{ messages }}</p>\n      {{/messages}}\n\n      {{#(nearParking !== undefined)}}\n        {{#nearParking}}\n          <p>Looks like you shouldn\'t park here.  Check the map to be sure.</p>\n        {{/nearParking}}\n\n        {{^nearParking}}\n          <p>Looks like you are clear to park here.  Check the map to be sure.</p>\n        {{/nearParking}}\n\n        <div class="note">And follow any other posted parking signs.</div>\n      {{/()}}\n    </div>\n\n    <div id="snow-emergency-map"></div>\n  {{/isSnowEmergency}}\n\n</div>\n\n<div class="footnote-container">\n  <div class="footnote">\n    <p>Some map data &copy; OpenStreetMap contributors; licensed under the <a href="http://www.openstreetmap.org/copyright" target="_blank">Open Data Commons Open Database License</a>.  Some map design &copy; MapBox; licensed according to the <a href="http://mapbox.com/tos/" target="_blank">MapBox Terms of Service</a>.  Location geocoding provided by <a href="http://www.mapquest.com/" target="_blank">Mapquest</a> and is not guaranteed to be accurate.  Some mapping services provided by <a href="http://cartodb.com/attributions" target="_blank">CartoDB</a>.  Snow plow route data provided by the City of Minneapolis.  Some code, techniques, and data on <a href="https://github.com/zzolo/minnpost-snow-emergency" target="_blank">Github</a>.  <a href="http://thenounproject.com/term/snowed-in/30065/">Snowed In</a> designed by Claire Jones from the Noun Project.</p>\n\n  </div>\n</div>\n';});


define('text!templates/loading.mustache',[],function () { return '<div class="loading-container">\n  <div class="loading"><span>Loading...</span></div>\n</div>';});

/**
 * Main application file for: minnpost-snow-emergency
 *
 * This pulls in all the parts
 * and creates the main object for the application.
 */

/**
 * RequireJS config which maps out where files are and shims
 * any non-compliant libraries.
 */
require.config({
  shim: {
    // CartoDB is multiple libraries in one and
    // will usually export Leaflet.  Shim doesn't
    // seem to fix it so we just manually
    // use window.cartodb
    cartodb: {
      exports: 'cartodb'
    }
  },
  baseUrl: 'js',
  paths: {
    'requirejs': '../bower_components/requirejs/require',
    'text': '../bower_components/text/text',
    'jquery': '../bower_components/jquery/jquery.min',
    'underscore': '../bower_components/underscore/underscore',
    'Ractive': '../bower_components/ractive/build/Ractive-legacy.min',
    'Ractive-events-tap': '../bower_components/ractive-events-tap/Ractive-events-tap.min',
    'moment': '../bower_components/moment/min/moment.min',
    'cartodb': '../bower_components/cartodb.js/dist/cartodb.uncompressed',
    'minnpost-snow-emergency': 'app'
  }
});

// Create main application
define('minnpost-snow-emergency', [
  'jquery', 'underscore', 'helpers',
  'Ractive', 'Ractive-events-tap', 'cartodb',
  'text!templates/application.mustache',
  'text!templates/loading.mustache'
], function(
  $, _, helpers,
  Ractive, RactiveEventsTap, cartodb,
  tApplication, tLoading
) {

  // Get the correct cartodb and leaflet
  var L = window.L;
  cartodb = window.cartodb;

  // Constructor for app
  var App = function(options) {
    this.options = _.extend(this.defaultOptions, options);
    this.el = this.options.el;
    if (this.el) {
      this.$el = $(this.el);
      this.$content = this.$el.find('.content-container');
    }
  };

  // Extend with custom methods
  _.extend(App.prototype, {
    // Start function
    start: function() {
      var thisApp = this;
      this.data = {};

      // Determine day and some defaults
      this.data.snowEmergencyDay = 3;
      this.data.isSnowEmergency = true;
      this.data.isLoading = false;
      this.data.nearParking = undefined;
      this.data.chooseDay = undefined;
      this.data.isNotCapable = this.options.isNotCapable;

      // See if we can geo locat
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
          _.defer(_.bind(thisApp.makeMap(), thisApp));
        }
      }, { defer: true });

      // Allow for "testing"
      this.mainView.observe('chooseDay', function(n, o) {
        n = parseInt(n, 10);
        if (!_.isNaN(n)) {
          this.set('snowEmergencyDay', n);
          this.set('isSnowEmergency', true);
        }
      });

      // Ensure regular form submission won't happen
      this.mainView.on('formSubmit', function(e) {
        e.original.preventDefault();
        thisApp.searchAddress(this.get('address'));
      });

      // Address search
      this.mainView.on('addressSearch', function(e) {
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
      cartodb.createLayer(this.map, 'http://zzolo-minnpost.cartodb.com/api/v2/viz/3fb9a154-9604-11e3-b5ac-0e625a1c94a6/viz.json').addTo(this.map)
      .on('done', function(layer) {
        // Something
      })
      .on('error', function() {
        this.issue('There was an error loading the snow route information.');
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
        $.getJSON(this.options.mapQuestQuery.replace('[[[ADDRESS]]]', address), function(response) {
          var latlng;

          if (_.size(response.results[0].locations) > 0 &&
            _.isObject(response.results[0].locations[0].latLng)) {
            latlng = response.results[0].locations[0].latLng;
            thisApp.closestRoutes(latlng.lat, latlng.lng);
          }
          else {
            this.issue('That address could not be found, please try another or more specific one.');
          }
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
      distance = 'ST_Distance(ST_SetSRID(the_geom, 4326), ST_SetSRID(ST_MakePoint(' + lon + ', ' + lat + ') , 4326))';
      closestSQL = 'SELECT the_geom, day1, day2, day3, cartodb_id, id, ' + distance + ' AS distance FROM snow_routes ORDER BY ' + distance + ' LIMIT 1';
      noParkingSQL = 'SELECT the_geom, day1, day2, day3, cartodb_id, id, ' + distance + ' AS distance FROM snow_routes WHERE day' + this.data.snowEmergencyDay + ' = 0 ORDER BY ' + distance + ' LIMIT 20';

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

    // Default options
    defaultOptions: {
      projectName: 'minnpost-snow-emergency',
      minneapolisExtent: [-93.3292, 44.8896, -93.1978, 45.0512],
      // Please do not steal
      mapQuestQuery: 'http://www.mapquestapi.com/geocoding/v1/address?key=Fmjtd%7Cluub2d01ng%2C8g%3Do5-9ua20a&outFormat=json&callback=?&countrycodes=us&maxResults=1&location=[[[ADDRESS]]]',
      cartoDBQuery: 'http://zzolo-minnpost.cartodb.com/api/v2/sql?format=GeoJSON&callback=?&q=[[[QUERY]]]',
      defaultAccuracy: 15,
      colors: {
        day1: '#009BC2',
        day2: '#7525BB',
        day3: '#FF7424',
        dontPark: '#B22715'
      },
      isNotCapable: {
        toUseArrays: (helpers.isMSIE() <= 8 && helpers.isMSIE() > 4)
      }
    }
  });

  return App;
});

