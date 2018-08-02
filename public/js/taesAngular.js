var taesApp = angular.module("taesApp", ['ngAnimate', 'ngMap', 'ngStorage']);

var key_google = 'AIzaSyDAbsJp7koWeiyS9bSwytQELHhMR_xE920';

taesApp.controller("taesController", function ($scope, $http, NgMap, $localStorage) {

  var params = {};
  $scope.page = {};
  $scope.show = {};
  $scope.places = []; // List of places

  if (!$localStorage.favorites) {
    $localStorage.favorites = []; // Array of favorites, functions like places
  }

  $scope.favoritesPage = 0; // Current favorites page
  $scope.numberOfFavorites = 20; // The number of permitted favorites page

  $scope.$storage = $localStorage; // Allow page functions to use it

  // --------------------
  // Map helper methods
  // --------------------

  $scope.map = null;
  var uscLocation = { lat: 34.022366, lng: -118.285117 };
  $scope.initMap = function (map) {
    $scope.map = map;

    // global variables
    directionsService = new google.maps.DirectionsService();
    directionsDisplay = new google.maps.DirectionsRenderer({
      map: $scope.map
    });

    map.setCenter(uscLocation);
    map.setZoom(13);

    // marker is global
    markerDestination = new google.maps.Marker({
      position: uscLocation,
      map: map
    });

    $scope.$apply();
  }

  // Get the selected route
  $scope.geocodeMapLocationFrom = function () {

    clearErrors();

    var fromString = $scope.placeCurrent.maps.from;

    if (fromString.toUpperCase() == "Your location".toUpperCase() || fromString.toUpperCase() == "My location".toUpperCase()) {

      console.log("My location selected in maps locationFrom. using ip-api.");

      // ip-api
      var ipApiPromise = $http({
        url: "http://ip-api.com/json",
        method: "GET",
        params: params
      });

      // Handle ip-api response
      ipApiPromise.then(function mySuccess(response) {
        var location = {
          lat: response.data.lat,
          lng: response.data.lon
        };
        getDirections(location);

      }, function myFailure(response) {

        console.log("IP-API failed. Using USC coordinates.");
        var location = {
          lat: 34.007889,
          lng: -118.2585096
        };
        getDirections(location);

      });
    }

    else {

      // Geocode the location in the 
      var geocodePromise = $http({
        url: "/geocode",
        method: "GET",
        params: {
          address: fromString
        }
      });

      geocodePromise.then(function mySuccess(response) {

        // console.log("Geocoding API returned:")
        // console.log(response);

        var addresses = response.data.results;
        if (addresses.length == 0) {

          // Handle no source location
          console.log("Google Geocode API returned no results for Map's locationFrom.");
          $scope.show.errors.directions = true;
        }
        else {
          var location = addresses[0]["geometry"]["location"];
          getDirections(location);
        }

      }, function myFailure(response) {
        console.log("Google Geocode API failed for Map's locationFrom.");
        $scope.show.errors.directions = true;
      });
    }
  }

  // After obtaining geocode response,get directions
  function getDirections(locationFrom) {

    clearErrors();

    // Clear street view after successful location fetch
    if ($scope.map.getStreetView()) {
      $scope.map.getStreetView().setVisible(false);
    }
    $scope.show.streetView = false;
    $scope.show.directions = true;

    // Fetch map start point
    $scope.placeCurrent.locationFrom = locationFrom;
    mapCenter = locationFrom;
    mapDestination = $scope.placeCurrent.locationTo;

    var request = {
      origin: mapCenter,
      destination: mapDestination,
      travelMode: $scope.placeCurrent.maps.travelMode
    };

    // console.log(request);

    directionsDisplay.setMap($scope.map);
    directionsService.route(request, function (result, status) {
      if (status == 'OK') {

        // Clear existing markerDestination
        markerDestination.setMap(null);
        directionsDisplay.setDirections(result);
      }
    });
  }

  $scope.toggleStreetView = function () {

    clearErrors();

    if (!$scope.show.streetView) {

      var streetView = $scope.map.getStreetView();
      streetView.setPosition($scope.map.getCenter());
      streetView.setVisible(true);

      $scope.show.streetView = true;
    }
    else {
      $scope.map.getStreetView().setVisible(false);
      $scope.show.streetView = false;
    }
  }

  // --------------------
  // Display methods
  // --------------------

  function clearPageHistory() {
    // console.log("Clearing page history.");
    // Keep the last search parameters global
    params = {};
    $scope.page.tokens = ["", "", ""];
    $scope.page.currentPage = 0;
    $scope.page.showButton = function (buttonName) {
      var current = $scope.page.currentPage;

      if (buttonName === 'previous') {
        return (current > 0);

      } else if (buttonName === 'next') {

        return (current < 2 && $scope.page.tokens[current + 1] != "");
      }
    }
  }

  function clearSelectedPlace() { // Defines place defaults

    $scope.placeCurrent = {
      number: 0, // this has no actual meaning and is only used to copy a certain place in places into favorites
      name: "",
      id: "n/a", // no place is actually selected
      twitterURL: "https://twitter.com/",
      info: {
        address: "n/a",
        phoneNumber: "n/a",
        priceLevel: "n/a",
        rating: 0,
        ratingFontAwesome: [],
        googlePage: "n/a",
        website: "n/a",
        hours: {
          openNow: "n/a",
          dailyOpenHours: [
            // {
            //   day: "Monday",
            //   hours: "10:00 AM – 1:00 AM"
            // }
          ]
        }
      },
      locationFrom: null,
      locationTo: null,
      maps: {
        from: "Your location",
        to: "n/a",
        travelMode: "DRIVING"
      },
      photos: [[], [], [], []], // each of the columns in the stack
      reviews: {
        google: [],
        yelp: []
      }
    };

    // Default page parameters
    $scope.review.source = "Google Reviews";
    $scope.setReviewSortBasis(0);
  }

  function clearErrors() {
    $scope.show.errors = {
      nearbySearch: false,
      placeDetails: false,
      directions: false,
      yelp: false
    };
  }

  $scope.clearForm = function () {
    // Reset	the	form	fields,	clear	all	validation	errors	if	present,	switch	the	view to	the	results	tab	and	clear	the	results	area.

    clearPageHistory();
    clearErrors();

    // console.log("Form reset via clearForm().");

    // Initalize form control values
    $scope.searchFormValues = {};
    $scope.searchFormValues.keyword = "";
    $scope.searchFormValues.category = "default";
    $scope.searchFormValues.distance = "";
    $scope.searchFormValues.locationInputText = "";
    $scope.searchFormValues.locationInput = false; // Enables/disables the "Other" text box
    $scope.searchForm.$setUntouched();

    // Which panels are visible
    $scope.show.favorites = false;
    $scope.show.resultPlaces = false;
    $scope.show.resultPlaceDetails = false;
    $scope.show.resultPlaceDetailsPage = "info"; // can be info, photos, maps or reviews
    $scope.show.progressBar = false;
    $scope.show.errors = {
      noRecords: false,
      failed: false
    };

    $scope.show.streetView = false;
    $scope.show.directions = false;

    // When it's empty, display no records alert
    $scope.places = [];
    clearSelectedPlace();
  }

  // inputValidate
  $scope.isEmptyString = function (str) {
    if (str)
      return str.trim().length == 0;
    else
      return true;
  }

  // --------------------
  // Results
  // --------------------

  $scope.locationBeingObtained = false;
  $scope.submitForm = function (page) {

    clearErrors();

    $scope.places.length = 0; // Empty previous place list

    // Switch to results view
    $scope.show.favorites = false;

    // Start progressbar
    $scope.show.progressBar = true;
    $scope.show.resultPlaces = false;

    // Reset maps
    if ($scope.map.getStreetView()) {
      $scope.map.getStreetView().setVisible(false);
    }
    $scope.show.streetView = false;
    $scope.show.directions = false;

    // Clear selected place
    clearSelectedPlace();

    // Brand new request
    if (!page || page === "new" || page === "current") {

      clearPageHistory();

      // Get values for request
      params.radius = $scope.searchFormValues.distance * 1609.344;
      params.category = $scope.searchFormValues.category;
      params.keyword = $scope.searchFormValues.keyword;

      // Not specified???
      // if ($scope.searchFormValues.locationInputText == "My location") {
      //   $scope.searchFormValues.locationInputText = "Your location";
      // }

      if (!$scope.searchFormValues.locationInput) // || ($scope.searchFormValues.locationInputText.toUpperCase() == "Your location".toUpperCase())) 
      {

        console.log("My location selected. using ip-api.");
        $scope.locationBeingObtained = true;

        // ip-api
        var ipApiPromise = $http({
          url: "http://ip-api.com/json",
          method: "GET",
          params: params
        });

        // Handle ip-api response
        ipApiPromise.then(function mySuccess(response) {

          $scope.locationBeingObtained = false;

          // console.log(response);
          var lat = response.data.lat;
          var lng = response.data.lon;

          params.location = lat + "," + lng;
          nearbySearch(params);

        }, function myFailure(response) {

          $scope.locationBeingObtained = false;

          // Fallback co-ordinates
          console.log("IP-API failed. Using USC coordinates.");
          params.location = "34.007889,-118.2585096";
          nearbySearch(params);

        });
      }

      else {

        // If "other" location is specified     

        // Google Maps Geolocation performed on the server side. Call it
        var addressText = $scope.searchFormValues.locationInputText;
        console.log("Other location selected. Using Google Geocoding API for address " + addressText);

        var geocodePromise = $http({
          url: "/geocode",
          method: "GET",
          params: {
            address: addressText
          }
        });

        geocodePromise.then(function mySuccess(response) {

          // console.log("Geocoding API returned:")
          // console.log(response);

          var addresses = response.data.results;
          if (addresses.length == 0) {
            // Handle no addresses - shows as no records

            // End progressbar
            $scope.show.progressBar = false;
            $scope.show.resultPlaces = true;
          }

          else {
            var location = addresses[0]["geometry"]["location"];
            var lat = location.lat;
            var lng = location.lng;

            params.location = lat + "," + lng;
            nearbySearch(params);
          }

        }, function myFailure(response) {

          $scope.show.errors.nearbySearch = true;

          // Fallback co-ordinates: USC
          console.log("Google Geocode API failed.");

          // End progressbar
          $scope.show.progressBar = false;
          $scope.show.resultPlaces = true;
          $scope.show.resultPlaceDetails = false;

          // params.location = "34.007889,-118.2585096";
          // nearbySearch(params);
        });

      }
    }
    else {
      // Pagination: params.values all same except pagetoken
      if (page === "previous") {

        // console.log("Loading previous page...");
        $scope.page.currentPage = $scope.page.currentPage - 1;

        // if ($scope.page.tokens[$scope.page.currentPage] != "") {
        params.pagetoken = $scope.page.tokens[$scope.page.currentPage];
        // }
        nearbySearch(params);
      }
      else if (page === "next") {

        // console.log("Loading next page...");
        $scope.page.currentPage = $scope.page.currentPage + 1;

        params.pagetoken = $scope.page.tokens[$scope.page.currentPage];
        nearbySearch(params);
      }
    }
  }

  // Takes off after the ip-api result or otherwise has been fetched, using the original parameter list built up in submitForm()
  function nearbySearch(params) {
    // Make the nearby places search request
    $http({
      url: "/nearbysearch",
      method: "GET",
      params: params
    })
      .then(postNearbySearch,
      function nearbySearchFailure() {

        $scope.show.errors.nearbySearch = true;

        // End progressbar
        $scope.show.progressBar = false;
        $scope.show.resultPlaces = true;
        $scope.show.resultPlaceDetails = false;
      });
  }

  // Takes off after nearby search is completed
  function postNearbySearch(response) {
    var data = (response.data);

    // console.log(data.results);
    // console.log("There are " + data.results.length + " results.");

    var number = 0;
    data.results.forEach(function (result) {
      var place = {};
      place.number = number++;
      place.id = result.place_id;
      place.icon = result.icon;
      place.name = result.name;
      place.address = result.vicinity;
      place.location = {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng
      }

      $scope.places.push(place);
    });

    if (data.next_page_token) {

      // console.log("Page " + ($scope.page.currentPage + 1) + " token set to [" + data.next_page_token.substring(0, 10) + "...]");

      $scope.page.tokens[$scope.page.currentPage + 1] = data.next_page_token;
    }

    // Helps with details search
    if ($scope.searchFormValues.locationInput) {
      $scope.placeCurrent.maps.from = $scope.searchFormValues.locationInputText;
    } else {
      $scope.placeCurrent.maps.from = "Your location";
    }

    // End progressbar
    $scope.show.progressBar = false;
    $scope.show.resultPlaces = true;
    $scope.show.resultPlaceDetails = false;

    // console.log($scope.places.length);
  }

  // --------------------
  // Place details
  // --------------------

  function priceLevelToString(priceLevel) { // Converts numeric price ratings to $s
    var priceLevelString = "";

    for (var i = 0; i < priceLevel; i++) {
      priceLevelString = priceLevelString + "$";
    }
    return priceLevelString;
  }

  function ratingToFontAwesome(rating) { // Generates an array of fractions to morph rating star width
    var ratingFontAwesome = [];

    while (Math.floor(rating) > 0) {
      ratingFontAwesome.push(1);
      rating--;
    }
    if (rating > 0) {
      ratingFontAwesome.push(rating);
    }

    return ratingFontAwesome;
  }

  // --------------------
  // Photos helper methods
  // --------------------

  $scope.randomImageUrl = function () { // Testing only: Generates a random image
    var width = 300 + Math.round(Math.random() * 250);
    var height = 300 + Math.round(Math.random() * 250);

    return "https://picsum.photos/" + width + "/" + height;
  }

  // --------------------
  // Review helper methods
  // --------------------

  // Default review display settings
  $scope.review = {
    source: "Google Reviews",
    sortBasis: "number",
    reverse: false,
    sortOrder: 0
  };
  $scope.review.name = [
    "Default Order",
    "Highest Rating",
    "Lowest Rating",
    "Most Recent",
    "Least Recent"
  ];
  $scope.setReviewSortBasis = function (number) {
    console.log("Setting review sort basis to - " + number + ":" + $scope.review.name[number]);
    switch (number) {
      case 0:
        $scope.review.sortOrder = 0;
        $scope.review.sortBasis = "number";
        $scope.review.reverse = false;
        break;
      case 1:
        $scope.review.sortOrder = 1;
        $scope.review.sortBasis = "rating";
        $scope.review.reverse = true;
        break;
      case 2:
        $scope.review.sortOrder = 2;
        $scope.review.sortBasis = "rating";
        $scope.review.reverse = false;
        break;
      case 3:
        $scope.review.sortOrder = 3;
        $scope.review.sortBasis = "time";
        $scope.review.reverse = true;
        break;
      case 4:
        $scope.review.sortOrder = 4;
        $scope.review.sortBasis = "time";
        $scope.review.reverse = false;
        break;
    }
  }

  // --------------------
  // Place Details MAIN CALL
  // --------------------

  $scope.placeDetails = function (placeNumber, fromFavorites) {

    clearErrors();

    // Move to the info page
    $scope.show.resultPlaceDetailsPage = "info";

    // reset maps
    if ($scope.map.getStreetView()) {
      $scope.map.getStreetView().setVisible(false);
    }
    $scope.show.streetView = false;
    $scope.show.directions = false;

    // New version that uses client-side library

    if (fromFavorites) {
      var place_id = $localStorage.favorites[placeNumber].id;
    } else {
      var place_id = $scope.places[placeNumber].id;
    }

    // console.log("Attempting to show details for place " + placeNumber + ": " + place_id + ".");

    clearSelectedPlace(); // overrides $scope.placeCurrent

    // Start progressbar
    $scope.show.progressBar = true;
    $scope.show.resultPlaces = false;

    var request = { placeId: place_id };

    placesService = new google.maps.places.PlacesService($scope.map);
    placesService.getDetails(request, callback);

    function callback(resultPlace, status) {

      if (status == google.maps.places.PlacesServiceStatus.OK) {

        console.log(resultPlace);

        $scope.placeCurrent.number = placeNumber;

        $scope.placeCurrent.id = resultPlace.place_id; // All places MUST have a place_id

        $scope.placeCurrent.name = resultPlace.name;

        // --------------------
        // info tab
        // --------------------

        if (resultPlace.formatted_address) {
          $scope.placeCurrent.info.address = resultPlace.formatted_address;
        } else {
          $scope.placeCurrent.info.address = "n/a";
        }

        if (resultPlace.international_phone_number) {
          $scope.placeCurrent.info.phoneNumber = resultPlace.international_phone_number;
        } else {
          $scope.placeCurrent.info.phoneNumber = "n/a";
        }

        if (resultPlace.price_level) {
          $scope.placeCurrent.info.priceLevel = priceLevelToString(resultPlace.price_level);
        } else {
          $scope.placeCurrent.info.priceLevel = "n/a";
        }

        if (resultPlace.rating) {
          $scope.placeCurrent.info.rating = resultPlace.rating;
          $scope.placeCurrent.info.ratingFontAwesome = ratingToFontAwesome(resultPlace.rating);
        } else {
          $scope.placeCurrent.info.rating = 0;
          $scope.placeCurrent.info.ratingFontAwesome = 0;
        }

        if (resultPlace.url) {
          $scope.placeCurrent.info.googlePage = resultPlace.url;
        } else {
          $scope.placeCurrent.info.googlePage = "n/a";
        }

        if (resultPlace.website) {
          $scope.placeCurrent.info.website = resultPlace.website;
        } else {
          $scope.placeCurrent.info.website = "n/a";
        }

        if (resultPlace.opening_hours) {
          $scope.placeCurrent.info.hours.openNow = (resultPlace.opening_hours.open_now) ? "Open now" : "Closed"; // Current timings added later

          var weekday_text = resultPlace.opening_hours.weekday_text;
          weekday_text.forEach(function (timings) {
            var colonIndex = timings.indexOf(":");
            var day = timings.substring(0, colonIndex);
            var hours = timings.substring(colonIndex + 2);

            $scope.placeCurrent.info.hours.dailyOpenHours.push({
              day: day,
              hours: hours
            });

          })
          var utc_offset = resultPlace.utc_offset;

          // Get the local day at that place instead
          var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]; // in moment.js, days start from Sunday:0 through Saturday:6
          var localDayIndex = moment().utcOffset(utc_offset).day();
          var localDay = days[localDayIndex];
          // console.log("It's " + days[moment().day()] + " here, and " + localDay + " at this place.");

          // Match it against the days in the array: bump that one to the top and bold it
          var currentDailies = $scope.placeCurrent.info.hours.dailyOpenHours; // shorter name
          for (var i = 0; i < currentDailies.length; i++) {

            var currentDaily = currentDailies[i];
            if (currentDaily.day == localDay) {
              // let this day remain at the top
              break;
            }
            else {
              // Find this day, and push it to the bottom of the list
              var movedDay = currentDailies.splice(i, 1)[0];
              currentDailies.push(movedDay);
              i--; // resume from this new day now
            }
          }

          // Add current timings if open
          if (resultPlace.opening_hours.open_now) {
            $scope.placeCurrent.info.hours.openNow += (": " + currentDailies[0].hours);
          }

        } else {
          $scope.placeCurrent.info.hours = null;
        }

        // --------------------
        // Photos tab
        // --------------------

        if (resultPlace.photos) {
          var photos = resultPlace.photos;
          // console.log(photos);
          var n = photos.length;
          for (var i = 0; i < n; i++) {
            var columnNumber = i % 4;
            var photoOptions = { maxWidth: 800 };
            var photoURL = photos[i].getUrl(photoOptions);
            $scope.placeCurrent.photos[columnNumber].push(photoURL);
          }
        }
        else {
          // No photos
          console.log("No photos for this place.");
          $scope.placeCurrent.photos = null;
        }

        // --------------------
        // Maps tab
        // --------------------

        // Build locationTo using the results/favorites array places[] - resultPlace.geometry.location is empty.
        if (fromFavorites) {
          console.log($localStorage.favorites[placeNumber]);
          $scope.placeCurrent.locationTo = $localStorage.favorites[placeNumber].location;
        } else {
          $scope.placeCurrent.locationTo = $scope.places[placeNumber].location;
        }

        // locationFrom is set after searching
        $scope.placeCurrent.maps.to = resultPlace.name + ", " + resultPlace.formatted_address;
        $scope.placeCurrent.maps.travelMode = "DRIVING";

        // center the map to location
        mapDestination = $scope.placeCurrent.locationTo;
        console.log("Map destination: ");
        console.log(mapDestination);
        $scope.map.setCenter(mapDestination);
        $scope.map.setZoom(13);
        markerDestination.setMap($scope.map);
        markerDestination.setPosition(mapDestination);
        directionsDisplay.setMap(null);

        // --------------------
        // Reviews tab
        // -------------------- 

        // Google reviews
        $scope.placeCurrent.reviews.google = [];

        if (resultPlace.reviews) {
          var reviewsGoogle = resultPlace.reviews;
          var number = 0;
          reviewsGoogle.forEach(function (reviewGoogle) {
            var review = {
              number: number++,
              authorName: reviewGoogle.author_name,
              authorURL: reviewGoogle.author_url,
              profilePhotoURL: reviewGoogle.profile_photo_url,
              rating: reviewGoogle.rating,
              ratingFontAwesome: ratingToFontAwesome(reviewGoogle.rating),
              text: reviewGoogle.text,
              time: reviewGoogle.time,
              timeDisplay: moment(reviewGoogle.time, "X").format('YYYY-MM-DD kk:mm:ss')
            };
            // console.log(review);
            $scope.placeCurrent.reviews.google.push(review);
          });
        }

        // Yelp reviews
        $scope.placeCurrent.reviews.yelp = [];

        // Build a request to Yelp API
        var params = {
          name: resultPlace.name
        }

        var address_components = resultPlace.address_components;
        // console.log(resultPlace.name + "'s address components:");

        for (var i = 0; i < address_components.length; i++) {
          var address_component = address_components[i];
          var type = address_component.types[0];
          var name = address_component.short_name;
          // console.log(type + ": " + name);

          if (type == "locality") {
            params.city = name;
          }
          else if (type == "administrative_area_level_1") {
            params.state = name;
          }
          else if (type == "country") {
            params.country = name;
          }
          else if (type == "street_number" || type == "route") {
            if (!params.address1) {
              params.address1 = name;
            } else {
              params.address1 += " " + name;
            }
          }
          // else if (i == 2 || i == 3) {
          //   if (!params.address2) {
          //     params.address2 = name;
          //   } else {
          //     params.address2 += " " + name;
          //   }
          // }
        }

        // console.log("\nThe request to the Yelp APIs is:");
        // console.log(params);

        // Yelp request
        $http({
          url: "/yelpmatchreviews",
          method: "GET",
          params: params
        })
          .then(function mySuccess(response) {

            // console.log("Yelp API succeeded!");

            // console.log(response.data);

            var reviewsYelp = response.data;
            var number = 0;
            reviewsYelp.forEach(function (reviewYelp) {
              var review = {
                number: number++,
                authorName: reviewYelp.user.name,
                authorURL: reviewYelp.url,
                profilePhotoURL: reviewYelp.user.image_url,
                rating: reviewYelp.rating,
                ratingFontAwesome: ratingToFontAwesome(reviewYelp.rating),
                text: reviewYelp.text,
                time: moment(reviewYelp.time_created, "YYYY-MM-DD kk:mm:ss").format("X"),
                timeDisplay: reviewYelp.time_created
              };

              // console.log(review);

              $scope.placeCurrent.reviews.yelp.push(review);
            });

          },
            function myFailure(response) {
              console.log("Yelp API failed.");

              // TODO: Yelp API error
              $scope.show.errors.yelp = true;
            });

        // --------------------
        // Twitter
        // -------------------- 

        var url = ($scope.placeCurrent.info.website == "n/a") ? $scope.placeCurrent.info.googlePage : $scope.placeCurrent.info.website;
        var text = "Check out " + $scope.placeCurrent.name + " located at " + $scope.placeCurrent.info.address + ". Website:";

        $scope.placeCurrent.twitterURL = "https://twitter.com/intent/tweet?" + "text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(url) + "&hashtags=" + "TravelAndEntertainmentSearch";

        // console.log($scope.placeCurrent);

        // Either way, end the procedure
        $scope.show.resultPlaces = true;
        $scope.show.resultPlaceDetails = true;
        $scope.show.progressBar = false; // End progressbar
        $scope.$apply(); // $apply() is used to execute an expression in AngularJS from outside of the AngularJS framework - in this case the AngularJs Google Maps library
      }

      else {

        // Place Details API error
        console.log("Error fetching Place Details using Google Client-Side library.");

        $scope.show.errors.placeDetails = true;

        // Either way, end the procedure
        $scope.show.resultPlaces = true;
        $scope.show.resultPlaceDetails = true;
        $scope.show.progressBar = false; // End progressbar
        $scope.$apply();
      }
    }


  }

  // --------------------
  // Favorites
  // --------------------

  $scope.indexInFavorites = function (place_id) { // returns true if the given place_id is in the list of favorites

    for (var i = 0; i < $localStorage.favorites.length; i++) {

      var currentFavorite = $localStorage.favorites[i];

      if (currentFavorite.id == place_id) {
        return i;
      }
    }
    return -1;
  }

  $scope.addToFavorites = function (placeNumber) {

    // console.log($localStorage.favorites);

    // copy this place from the array into favorites
    var place = $scope.places[placeNumber];

    // check if it's already in the list?
    var inFavoriteIndex = $scope.indexInFavorites(place.id);
    if (inFavoriteIndex === -1) {

      // create a new object, update its number
      var favorite = {
        number: $localStorage.favorites.length,
        id: place.id,
        icon: place.icon,
        name: place.name,
        location: place.location,
        address: place.address
      };

      $localStorage.favorites.push(favorite);

      console.log(favorite.name + " added to the list of favorites.");
    }
    else {

      console.log($scope.places[placeNumber].name + " is already in the list of favorites. Removing it instead.");

      $scope.removeFromFavorites(inFavoriteIndex);
    }
  }

  $scope.removeFromFavorites = function (placeNumber) {

    if (placeNumber < $localStorage.favorites.length) {

      $localStorage.favorites.splice(placeNumber, 1);

      // adjust place numbers
      for (var i = placeNumber; i < $localStorage.favorites.length; i++) {
        $localStorage.favorites[i].number--;
      }

      // adjust favorite pagination
      var favoritesOnThisPageNow = $localStorage.favorites.length - ($scope.favoritesPage * $scope.numberOfFavorites);
      if (favoritesOnThisPageNow <= 0) {
        $scope.favoritesPage--;
      }

      return true;

    } else {
      console.log("Error deleting n-th favorite > length.")
      return false;
    }
  }

  $scope.clearFavorites = function () {

    console.log($localStorage.favorites);
    $localStorage.favorites = [];
    console.log("Favorites cleared from local storage.");
  }

  // Favorites Pagination
  $scope.showNextFavoritesButton = function () {

    var favoritesSoFar = ($scope.favoritesPage + 1) * $scope.numberOfFavorites;

    if (favoritesSoFar < $localStorage.favorites.length) {
      return true;
    } else {
      return false;
    }
  }
  $scope.showPreviousFavoritesButton = function () {
    return $scope.favoritesPage > 0;
  }

  // PAGE LOAD STARTS HERE!

  // Initialize the form
  $scope.$watch('searchForm', function (searchForm) {
    if (searchForm) {

      // ClearAll on startup
      $scope.clearForm();
    }
  });
});