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
  'use strict';

  // Get the correct cartodb and leaflet
  var L = window.L;
  cartodb = window.cartodb;

  // Create new class for app
  var App = Base.BaseApp.extend({

    defaults: {
      name: 'minnpost-snow-emergency',
      el: '.minnpost-snow-emergency-container',
      isSnowEmergency: true,
      snowEmergencyDay: 1,
      lastSnowEmergencyDay: moment('2014-02-20'),
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

      // Determine some capabilities
      this.options.isNotCapable = {
        toUseArrays: (this.isMSIE() <= 8 && this.isMSIE() > 4)
      };

      // Determine day
      this.snowEmergencyState();

      // Set some values for the template
      this.data.snowEmergencyDay = this.options.snowEmergencyDay;
      this.data.isSnowEmergency = this.options.isSnowEmergency;
      this.data.lastSnowEmergencyDay = this.options.lastSnowEmergencyDay;
      this.data.snowEmergencyTitle = this.options.snowEmergencyTitle;
      this.data.snowEmergencyText = this.options.snowEmergencyText;
      this.data.isNotCapable = this.options.isNotCapable;
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
          _.defer(_.bind(thisApp.makeMap(), thisApp));
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
          day2start: moment(sDay).add('d', 1).hour(8).minute(0),
          day2over: moment(sDay).add('d', 1).hour(20).minute(0),
          day3start: moment(sDay).add('d', 2).hour(8).minute(0),
          day3over: moment(sDay).add('d', 2).hour(20).minute(0)
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
