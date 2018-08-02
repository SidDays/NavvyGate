var http = require('http');
var express = require('express');
var path = require('path');
var request = require('request');
var moment = require('moment');
var yelp = require('yelp-fusion');

var app = express();

// Redirect static file locations
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
app.use('/favicon.ico', express.static(path.join(__dirname, 'public', 'img', 'favicon.ico')));
app.use('/', express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

// function breakTheProgram(res) { // Debugging only
//   res.status(500);
//   res.send("None shall pass");
// }

// Routes
app.get('/', function (req, res) {
  res.render('index.html');
});

var key_google = 'AIzaSyDAbsJp7koWeiyS9bSwytQELHhMR_xE920';

// Geolocation
app.get("/geocode", function (req, res) {

  console.log("Geocode request query parameters");
  console.log(req.query);

  // Build query parameters object
  var qs = { key: key_google, address: req.query.address };
  request({
    url: 'https://maps.googleapis.com/maps/api/geocode/json',
    qs: qs
  }).pipe(res);

});

// Nearby Search
app.get('/nearbysearch', function (req, res, next) {

  // console.log(req.query);

  // Build query parameters object
  var qs = { key: key_google };

  if (req.query.keyword)
    qs.keyword = req.query.keyword;

  qs.location = req.query.location;
  // console.log(qs.location);

  if (!qs.location) {

    console.log("location unspecified in nearby search query:\n" + req.query);

    // Fallback coordinates - USC
    qs.location = "34.007889,-118.2585096";
  }

  if (req.query.distance) {
    qs.radius = req.query.distance; // Conversion to miles on cleint
  } else {
    qs.radius = 10 * 1609.344; // Default 10 miles
  }

  if (req.query.category) {
    qs.type = req.query.category;
  }

  if (req.query.pagetoken) {
    qs.pagetoken = req.query.pagetoken;
  }
  // console.log(qs);

  request({
    url: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
    qs: qs
  }).pipe(res);

});

// app.get("/placedetails", function (req, res) { // Place Details route NOT USED anymore - done on client side for speedup

//   // Build query parameters object
//   var qs = { key: key_google, placeid: req.query.placeId };

//   request({
//     url: 'https://maps.googleapis.com/maps/api/place/details/json',
//     qs: qs
//   }).pipe(res);
// });

// Yelp
var key_yelp = 'SlkkMJ8zmyIheejaX2GaCNih7sLDkM6WTyEur03q8P75hRttpTmJHOFNNlYtgdwYOWyb_5iAubkknf5eF-0mx5lwtsmQ1prDqyOHibSy9Fnr08zWHufUYhutjL23WnYx';
var yelpClient = yelp.client(key_yelp);

app.get("/yelpmatchreviews", function (req, res) {

  var reviews = [];

  // Required parameters
  var searchRequest = {
    name: req.query.name,
    city: req.query.city,
    state: req.query.state,
    country: req.query.country
  };

  // optional parameters
  if (req.query.address1) {
    searchRequest.address1 = req.query.address1;
    if (req.query.address2) {
      searchRequest.address2 = req.query.address2;
    }
  }

  // matchType can be 'lookup' or 'best'
  yelpClient.businessMatch('best', searchRequest).then(response => {

    // console.log(response.jsonBody);

    if(response.jsonBody.businesses.length > 0) {
      var business = response.jsonBody.businesses[0];
      var alias = business.alias;

      yelpClient.reviews(alias).then(response => {
        // console.log(response.jsonBody.reviews);

        reviews = response.jsonBody.reviews;
        res.send(reviews);
      }).catch(e => {
        console.log(e);
        res.send(reviews);
      });
    }
    else {
      res.send(reviews);
    }
    // res.send(response.jsonBody.businesses);
  }).catch(e => {
    console.log(e);
    res.send(reviews);
  });
});

// Tell Express to listen for requests (start server)
app.listen(8081, function () {
  console.log('Server started at ' + moment().format('h:mm a'));
});






