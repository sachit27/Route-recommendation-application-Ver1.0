/**
* This are parametrical values that you can change for your bussiness.
*/
var closerMargin = { value: 10, color:"RED"};
var mediumMargin = { value: 48, color:"YELLOW"};
var higherMargin = { value: 50, color:"GREEN"};
var lineWeight = 11; //Route line weight
var timerToRefreshRoutes = 1000 * 60 * 6; // 6 minutes for refreshing average and color of routes in the map

var map; function getMap(){return map;};
var geocoder;
var actualRoutes;
var polilynes = []; function getPolilynes(){return polilynes;}
var refreshRoutesTask;

/**
* This method is called when Google maps script called the Google Maps Api.
*/
var selectedMode;
function initMap() {
	geocoder = new google.maps.Geocoder(); //Geocoder neccesary for getting the latitude and longitude based on text address. This is for byke routes
	map = new google.maps.Map(document.getElementById('map'), {
		zoom: 8,
		center: {lat: 23.69, lng: 120.96}
	});

	var directionsService = new google.maps.DirectionsService;
	var directionsDisplay = new google.maps.DirectionsRenderer({
		map: map,
		panel: document.getElementById('panel-routes') //Id where the panel of directions and suggestions will be shown. This panel is builded itself from Google Maps Api
	});

	var trafficLayer = new google.maps.TrafficLayer();
	trafficLayer.setMap(map);
	var transitLayer = new google.maps.TransitLayer();
	transitLayer.setMap(map);
	var bikeLayer = new google.maps.BicyclingLayer();
	bikeLayer.setMap(map);
	directionsDisplay.setMap(map);

	document.getElementById('submit').addEventListener('click', function() {
		cleanPolylinesAndAirAverages(directionsDisplay);
		directionsDisplay = new google.maps.DirectionsRenderer({
			map: map,
			panel: document.getElementById('panel-routes') //Id where the panel of directions and suggestions will be shown. This panel is builded itself from Google Maps Api
		});
		directionsDisplay.setMap(map);

		selectedMode = document.getElementById('media').value;
		var from = document.getElementById('txtFromId').value;
		var to = document.getElementById('txtToId').value;

		if (selectedMode != 'BICYCLING') {
			calculateAndDisplayRoute(directionsService, directionsDisplay, from,to);
		} else{
			codeAddressByke(from,"from",selectedMode);
			codeAddressByke(to,"to",selectedMode);
		};
		runRefreshTask(selectedMode);
		document.getElementById("info_route").style.visibility = "visible";
	});
	var inputFrom = document.getElementById('txtFromId');
	var inputTo = document.getElementById('txtToId');
	var autocompleteFrom = new google.maps.places.Autocomplete(inputFrom);
	var autocompleteTo = new google.maps.places.Autocomplete(inputTo);
	document.getElementById("info_route").style.visibility = "hidden";
}

function placeMarker(lat,lng) {
    var msg = NearestAirPointValue(lat,lng).s_d0 + "";

    var marker = new google.maps.Marker({
        position: {"lat": lat, "lng": lng},
        map: map,
        label:msg
    });
    markersArray.push(marker);
}

function clearOverlays() {
  for (var i = 0; i < markersArray.length; i++ ) {
    markersArray[i].setMap(null);
  }
  markersArray.length = 0;
}

/**
* This method is responsible of refreshing the routes when parametric time comes.
*/
function runRefreshTask(type){
	refreshRoutesTask = setInterval(function(){
		//The code inside this scope execute every timerToRefreshRoutes minutes.
		console.log("Refreshed");
		if(type != "BICYCLING"){
			calculateAverageAndSetColorRoutes(actualRoutes);
		} else{
			calculateBykeAverageAndSetColorRoutes();
		}
	}, timerToRefreshRoutes);
}

/**
* Cancel refreshing when new route is consulted for starting again for the new route
*/
function stopRefreshingRoutes(){
	clearInterval(refreshRoutesTask);
}

/**
* This method is responsible of getting latitude and longitude based on text direction, and sending to myRoutes.js to later calculate best route
*/
function codeAddress(result,selectedMode){
	var currentRouteArray = result.routes[0];
	var inputFrom = document.getElementById('txtFromId').value;
	var inputTo = document.getElementById('txtToId').value;
	var currentRoute = currentRouteArray.overview_path;
	var locationFrom = currentRoute[0];
	var locationTo = currentRoute[currentRoute.length - 1];
	manageIncomingRoutes(locationFrom,"from",selectedMode,inputFrom);
	manageIncomingRoutes(locationTo,"to",selectedMode,inputTo);
}

function codeAddressByke(address,fromOrTo,selectedMode){
	geocoder.geocode( {address:address}, function(results, status){
		if (status == google.maps.GeocoderStatus.OK){
			manageIncomingRoutes(results[0].geometry.location,fromOrTo,selectedMode,address);
		} else {
			alert('Geocode was not successful for the following reason: ' + status);
		}
	});
}

/**
* This listener is for adding the average to the routes panel. When all the routes are drawn and panel is builded by Google Maps Api, this listener is activated so
* it can add the average information to the Html. Maybe it is a bit cofusing, but the fact is that is getting in the html so it can add to the correct tag
* the average information.
*/
function calculateAndDisplayRoute(directionsService, directionsDisplay, from, to) {
	var selectedMode = document.getElementById('media').value; //This The travel Mode
	var request = {
		origin:from,
		destination:to,
		travelMode: google.maps.TravelMode[selectedMode],
		provideRouteAlternatives: true
	};
	directionsService.route(request, function(result, status) {
		if (status === 'OK') {
			calculateAverageAndSetColorRoutes(result); //If it is all OK, this method is going to calculate and paint the routes
			directionsDisplay.setDirections(result);
		} else {
			alert("There is no results");
		}
	});
}

function calculateAverageAndSetColorRoutes(result) {
	var table = "<table id='routes_table' style='width: 100%''><colgroup><col span='1' style='width: 50%;'><col span='1' style='width: 50%;'></colgroup><tr><th>Route</th><th>PM2.5</th>"; //This line makes the HTML table for the routes and averages
	codeAddress(result,selectedMode);
	for(var routePos = 0; routePos<result.routes.length; routePos++){ //Calculate average and paint route for each route
		var currentRouteArray = result.routes[routePos];
		var currentRoute = currentRouteArray.overview_path;
		var sumAirValues = 0;
		var cantAirValues = 0;
		var previous = null;
		for (var x = 0; x < currentRoute.length; x++) { //For each point in the route
			var lat = currentRoute[x].lat();
			var lng = currentRoute[x].lng();
			var point = NearestAirPointValue(lat,lng); //Method that returns the nearest quality air point
			if(point == undefined) return; //Air api data is not ready
				sumAirValues = sumAirValues + point.s_d0;
				cantAirValues++;
		}
		var average = manageRoutesColor(sumAirValues,cantAirValues, result.routes[routePos], routePos); //This method will calculate average and paint routes
		table += "<tr><td> "+ (routePos + 1) + "</td><td>" + Math.round(average * 10000) / 10000  + "</td></tr>";
	}
	var root = document.getElementById("directions-panel");
	root.innerHTML = table +  "</table>";
	addBestRouteToPanel();
	actualRoutes = result;
}


function manageRoutesColor(sumAirValues,cantAirValues, route,routePos){
	var average = sumAirValues/cantAirValues;
	//This conditions are for painting the routes with the color that was parametrized in the top of this file
	var color = getColorBasedOnAverage(average);
	paintRoute(color, route);
	return average;
}

function getColorBasedOnAverage(average){
	if (average < closerMargin.value) {
		return closerMargin.color;
	} else if(average < mediumMargin.value){
		return mediumMargin.color;
	} else{
		return higherMargin.color;
	}
}

/**
* This method paints the routes that are called Polylines
*/
function paintRoute(color, route){
	var polyline = new google.maps.Polyline({
		path: [],
		strokeColor: color,
		strokeWeight: lineWeight
	});
	var bounds = new google.maps.LatLngBounds();
	//This code takes the parts of the routes and paints it
	var legs = route.legs;
	for (i = 0; i < legs.length; i++) {
		var steps = legs[i].steps;
		for (j = 0; j < steps.length; j++) {
			var nextSegment = steps[j].path;
			for (k = 0; k < nextSegment.length; k++) {
				polyline.getPath().push(nextSegment[k]);
				bounds.extend(nextSegment[k]);
			}
		}
	}
	polyline.setMap(map); //This set the color routes to the map
	polilynes.push(polyline);
}

/**
* This method is for clear all the routes and averages array
*/
function cleanPolylinesAndAirAverages(directionsDisplay){
	actualRoutes = null;
	stopRefreshingRoutes();
	cleanFromAndTo();
	clearMarkers();
	document.getElementById("info_route").style.visibility = "hidden";
	directionsDisplay.setMap(null);
	var root = document.getElementById("panel-routes");
	root.innerHTML = "";
	for(var x = 0; x< polilynes.length; x++){
		polilynes[x].setMap(null);
	}
	polilynes= [];
}
