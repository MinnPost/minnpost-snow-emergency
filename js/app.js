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
      this.data = {};

      // Determine day and some defaults
      this.data.snowEmergencyDay = 3;
      this.data.isSnowEmergency = true;
      this.data.isLoading = false;
      this.data.nearParking = undefined;
      this.data.chooseDay = undefined;

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
        thisApp.resetSearch();

        // Use geolocation
        navigator.geolocation.getCurrentPosition(function(position) {
          thisApp.closestRoutes(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
        }, function(error) {
          // error.code === 3
          thisApp.mainView.set('messages', 'There was an error trying to find your position.');
        }, {
          // Options
        });
      });
    },

    // Make the map
    makeMap: function() {
      // Initialize map
      this.map = new L.Map('snow-emergency-map', {
        center: [44.970753517451946, -93.26185335000002],
        zoom: 12,
        minZoom: 10,
        maxZoom: 17
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
        // Log error
      });
    },

    // Search address
    searchAddress: function(address) {
      var thisApp = this;

      if (address) {
        thisApp.resetSearch();

        // Geocode address
        $.getJSON(this.options.mapQuestQuery.replace('[[[ADDRESS]]]', address), function(response) {
          var latlng;

          if (_.size(response.results[0].locations) > 0 &&
            _.isObject(response.results[0].locations[0].latLng)) {
            latlng = response.results[0].locations[0].latLng;
            thisApp.closestRoutes(latlng.lat, latlng.lng);
          }
        });
      }
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
      SQL = 'SELECT * FROM snow_routes ORDER BY ST_SetSRID(the_geom, 4326) <-> ST_SetSRID(ST_MakePoint(' + lon + ', ' + lat + ') , 4326) LIMIT 50';

      // Query CartoDB
      $.getJSON('http://zzolo-minnpost.cartodb.com/api/v2/sql?format=GeoJSON&q=' + SQL + '', function(data) {
        thisApp.renderRoutes(data);
      });
    },

    // Show routes
    renderRoutes: function(geoJSON) {
      var thisApp = this;

      // Remove any existing layers
      if (_.isObject(this.routeLayer)) {
        this.map.removeLayer(this.routeLayer);
        this.map.removeLayer(this.locationLayer);
      }

      // Use the closest one to suggest what is close
      this.mainView.set('isLoading', false);
      this.mainView.set('nearParking', undefined);
      this.data.closestRoute = _.clone(geoJSON.features[0]);
      this.mainView.set('nearParking', (this.data.closestRoute.properties['day' + this.data.snowEmergencyDay.toString()] === 0) ? true : false);

      // Filter out only dont park places
      geoJSON.features = _.filter(geoJSON.features, function(f, fi) {
        if (f.properties['day' + thisApp.data.snowEmergencyDay.toString()] === 0) {
          return true;
        }
        return false;
      });

      // Make layer and style
      this.routeLayer = new L.geoJson(geoJSON, {
        style: function(feature) {
          return {
            fillColor: thisApp.options.colors.dontPark,
            color: thisApp.options.colors.dontPark,
            weight: 1,
            opacity: 0.5,
            fillOpacity: 0.75
          };
        },
        onEachFeature: function(feature, layer) {
          layer.bindPopup('<p>Do not park here.</p>');
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

    // Default options
    defaultOptions: {
      projectName: 'minnpost-snow-emergency',
      // Please do not steal
      mapQuestQuery: 'http://www.mapquestapi.com/geocoding/v1/address?key=Fmjtd%7Cluub2d01ng%2C8g%3Do5-9ua20a&outFormat=json&callback=?&countrycodes=us&maxResults=1&location=[[[ADDRESS]]]',
      colors: {
        day1: '#009BC2',
        day2: '#7525BB',
        day3: '#FF7424',
        dontPark: '#B22715'
      }
    }
  });

  return App;
});
