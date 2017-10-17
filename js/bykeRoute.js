var keyGraphopper = "5e826b21-c5c7-4bc6-9bca-065ee4d76687"; //CHANGE GRAPHOOPPER API KEY. This is one of my own for testing
var bykeElementsData;

/**
* This function makes the request to graphhopper for best route by byke
*/
function drawBikePath(latFrom,lngFrom,latTo,lngTo){
	var httpRequest = "https://graphhopper.com/api/1/route?point="
	+ latFrom + "%2C" + lngFrom + "&point=" + latTo + "%2C" + lngTo + "&vehicle=bike&locale=de&key=" + keyGraphopper + "&points_encoded=false&instructions=false";
	httpGetAsync(httpRequest,loadBikeData);
}

function loadBikeData(graphData){
	var data = JSON.parse(graphData);
	bykeElementsData = data.paths[0].points.coordinates;
	calculateBykeAverageAndSetColorRoutes();
}

/**
* Similar as we did for calculating average for google maps routes, this is for bykes routes. Really Similar but not equal
*/
function calculateBykeAverageAndSetColorRoutes() {
	if(bykeElementsData == null) return;
	var result = bykeElementsData;
	var table = "<table style='width: 100%''><colgroup><col span='1' style='width: 50%;'><col span='1' style='width: 50%;'></colgroup><tr><th>Route</th><th>Average Quality Air</th>"; //This line makes the HTML table for the routes and averages
	var sumAirValues = 0;
	var cantAirValues = 0;
	var previous = {};
	for (var x = 0; x < result.length; x++) { //For each point in the route
		var lat = result[x][1];
		var lng = result[x][0];
		var point = NearestAirPointValue(lat,lng); //Method that returns the nearest quality air point
		if(point == undefined) return; //Air api data is not ready
		if(previous != {} && (point.gps_lat != previous.gps_lat || point.gps_lon != previous.gps_lon)){ //This condition is for not calculating the same point if it was the same as the previous
			sumAirValues = sumAirValues + point.s_d0;
			cantAirValues++;
		}
		previous = point;
	}
	var average = manageBykeRoutesColor(sumAirValues,cantAirValues,result); //This method will calculate average and paint routes
	table += "<tr><td>1</td><td>" + Math.round(average * 100) / 100  + "</td></tr>";
	var root = document.getElementById("directions-panel");
	root.innerHTML = table +  "</table>"
}

function manageBykeRoutesColor(sumAirValues,cantAirValues,result){
	result = formatDataForPolilyne(result);
	var average = sumAirValues/cantAirValues;
	var map = getMap();
	if (average < closerMargin.value) {
		paintMyBestRouteByke(result, closerMargin.color, map);
	} else if(average < mediumMargin.value){
		paintMyBestRouteByke(result, mediumMargin.color, map);
	} else{
		paintMyBestRouteByke(result, higherMargin.color, map);
	}
	return average;
}

function formatDataForPolilyne(result){
	var arr = [];
	for (var i = 0; i < result.length; i++) {
		arr.push(new google.maps.LatLng(result[i][1],result[i][0]));
	}
	return arr;
}

function paintMyBestRouteByke(arrCoord, color, map){
	var bestAirApiPath = new google.maps.Polyline({
		path: arrCoord,
		strokeColor: color,
		strokeOpacity: 1.0,
		strokeWeight: lineWeight
	});
	centerManually(arrCoord, map);
	bestAirApiPath.setMap(map);
	var polilynes = getPolilynes();
	polilynes.push(bestAirApiPath);
}

/**
* This function center the map on the route created. For google maps routes we have this behaviour automatically, but for graphhopper routes we have to do it by hand
*/
function centerManually(arrCoord, map){
	var midLat = (arrCoord[0].lat() + arrCoord[arrCoord.length - 1].lat())/2;
	var midLng = (arrCoord[0].lng() + arrCoord[arrCoord.length - 1].lng())/2;
	var pos = {
		lat: midLat,
		lng: midLng,
	};
	map.setCenter(pos);
}
