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
    'cartodb': '../bower_components/cartodb.js/dist/cartodb',
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

      // Determine day
      this.snowEmergencyDay = 2;
      this.isSnowEmergency = true;

      // Create main application view
      this.mainView = new Ractive({
        el: this.$el,
        template: tApplication,
        data: {

        },
        partials: {
          loading: tLoading
        }
      });

      // Initialize map
      this.map = new L.Map('snow-emergency-map', {
        center: [44.970753517451946, -93.26185335000002],
        zoom: 12
      });
      L.tileLayer('//{s}.tiles.mapbox.com/v3/minnpost.map-wi88b700/{z}/{x}/{y}.png').addTo(this.map);

      // Add route layer
      cartodb.createLayer(this.map, 'http://zzolo-minnpost.cartodb.com/api/v2/viz/3fb9a154-9604-11e3-b5ac-0e625a1c94a6/viz.json').addTo(this.map)
      .on('done', function(layer) {
        // thing
      })
      .on('error', function() {
        //log the error
      });

      // Ensure regular form submission won't happen
      this.$el.find('form').on('submit', function(e) {
        e.preventDefault();
      });

      // Address search
      this.mainView.on('addressSearch', function(e) {
        e.original.preventDefault();
        var address = this.get('address');

        if (address) {
          $.getJSON(thisApp.options.mapQuestQuery.replace('[[[ADDRESS]]]', address), function(response) {
            var latlng;

            if (_.size(response.results[0].locations) > 0 &&
              _.isObject(response.results[0].locations[0].latLng)) {
              latlng = response.results[0].locations[0].latLng;
              thisApp.closestRoutes(latlng.lat, latlng.lng);
            }
          });
        }
      });

      // Geolocation
      this.mainView.on('geolocateSearch', function(e) {
        e.original.preventDefault();
        navigator.geolocation.getCurrentPosition(function(position) {
          thisApp.closestRoutes(position.coords.latitude, position.coords.longitude);
        });
      });
    },

    // Handle lat lon and get closest routes
    closestRoutes: function(lat, lon) {
      var thisApp = this;
      var SQL;

      // Set location
      this.location = [lat, lon];

      // Set view of map
      this.map.setView([lat, lon], 17);

      // Make query with lat/lon
      SQL = 'SELECT * FROM snow_routes WHERE day' + this.snowEmergencyDay.toString() + ' = 0 ORDER BY ST_SetSRID(the_geom, 4326) <-> ST_SetSRID(ST_MakePoint(' + lon + ', ' + lat + ') , 4326) LIMIT 20';

      // Query CartoDB
      $.getJSON('http://zzolo-minnpost.cartodb.com/api/v2/sql?format=GeoJSON&q=' + SQL + '', function(data) {
        thisApp.renderRoutes(data);
      });
    },

    // Show routes
    renderRoutes: function(geoJSON) {
      if (_.isObject(this.routeLayer)) {
        this.map.removeLayer(this.routeLayer);
        this.map.removeLayer(this.locationLayer);
      }

      // Make layer and style
      this.routeLayer = new L.geoJson(geoJSON, {
        style: function(feature) {
          var color = '#B21A10';

          //color = (feature.properties.day1 === 0) ? '#2167AB' : color;
          //color = (feature.properties.day2 === 0) ? '#6B0FB2' : color;
          //color = (feature.properties.day3 === 0) ? '#FF5C00' : color;

          return {
            fillColor: color,
            color: color,
            weight: 3,
            opacity: 0.55,
            fillOpacity: 0.75
          };
        }
      });

      // Make location marker
      this.locationLayer = L.circleMarker(this.location, {
        radius: 8,
        fillColor: '#10B21A',
        color: '#10B21A',
        weight: 10,
        opacity: 0.45,
        fillOpacity: 0.85
      });

      // Add layers
      this.map.addLayer(this.routeLayer);
      this.map.addLayer(this.locationLayer);
      this.map.fitBounds(this.routeLayer.getBounds());
    },

    // Default options
    defaultOptions: {
      projectName: 'minnpost-snow-emergency',
      // Please do not steal
      mapQuestQuery: 'http://www.mapquestapi.com/geocoding/v1/address?key=Fmjtd%7Cluub2d01ng%2C8g%3Do5-9ua20a&outFormat=json&callback=?&countrycodes=us&maxResults=1&location=[[[ADDRESS]]]'
    }
  });

  return App;
});
