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
    // CartoDB's local copy is not the same as remote :(
    'cartodb': 'http://libs.cartocdn.com/cartodb.js/v3/cartodb',
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

      // Hack around bug
      //_.delay(function() {
      //  map.invalidateSize();
      //}, 800);

      /*

    // Add route layer
    var layerUrl = 'http://zzolo-minnpost.cartodb.com/api/v2/viz/3fb9a154-9604-11e3-b5ac-0e625a1c94a6/viz.json';
    cartodb.createLayer(map, layerUrl).addTo(map)
    .on('done', function(layer) {
      // thing
    })
    .on('error', function() {
      //log the error
    });

    this.$el.find('form').on('submit', function(e) {
      e.preventDefault();
    });

    this.$el.find('.geolocate-button').on('click', function(e) {
      e.preventDefault();
      navigator.geolocation.getCurrentPosition(function(position) {
        map.setView([position.coords.latitude, position.coords.longitude], 16);

        var SQL = 'SELECT * FROM snow_routes ORDER BY ST_SetSRID(the_geom, 4326) <-> ST_SetSRID(ST_MakePoint(' + position.coords.longitude + ', ' + position.coords.latitude + ') , 4326) LIMIT 25';

        $.getJSON('http://zzolo-minnpost.cartodb.com/api/v2/sql?format=GeoJSON&q=' + SQL + '', function(data) {

          L.geoJson(data).addTo(map);
        });
      });
    });
      */
    },

    // Default options
    defaultOptions: {
      projectName: 'minnpost-snow-emergency'
    }
  });

  return App;
});



