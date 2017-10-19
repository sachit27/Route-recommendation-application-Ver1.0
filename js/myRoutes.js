//These are parametric configuration for best route algorithm. 
//The smaller the distance, the greater the presicion but the longer the waiting time
const distance_between_coordinates_far = 0.05; //Constant for distance between two adyacent points for long routes
const distance_between_coordinates_close = 0.005; //Constant for distance between two adyacent points for short routes
var margin_for_matrix_between_two_points= 0.1; //The larger the distance, the greater the route options but the longer the waiting time
var margin_for_each_side = margin_for_matrix_between_two_points/2 //This is the same margin for each side of points A and B.

var distance_between_coordinates;
var from_lat, from_lng, to_lat,to_lng;
from_lat = from_lng = to_lat = to_lng = null;
var addressFrom, addressTo;
addressFrom = addressTo = "";
var markers = [];
var average;
/**
* This function is the entry for new coordinates. It can be "from" or "to", depending on the "codeAddress" asynchronous request to get latitude and longitude
*/
function manageIncomingRoutes(location, fromOrTo,selectedMode, address){
  if(fromOrTo == "from"){
    from_lat = location.lat();
    from_lng = location.lng();
    if (selectedMode == "BICYCLING") setCustomMarker(address, "A","GREEN");
    addressFrom = address;
  } else if (fromOrTo == "to") {
    to_lat = location.lat();
    to_lng = location.lng();
    if (selectedMode == "BICYCLING") setCustomMarker(address, "B","RED");
    addressTo = address;
  } else {
    from = to = {};
  }
  if(from_lat != null && to_lat != null){ // When it has both "from" and "to" coordinates. It starts the algorithm
    startAlgorithmBestRoute();
    if (selectedMode == "BICYCLING"){
      drawBikePath(from_lat,from_lng,to_lat,to_lng,addressFrom,addressTo);
    }
  }
};

function setCustomMarker(title, msg, color){
  if(color=="GREEN"){
    var marker = new google.maps.Marker({
      position: {"lat": from_lat, "lng": from_lng},
      map: getMap(),
      title: title,
      label: msg
    });
    markers.push(marker);
  } else {
    var marker = new google.maps.Marker({
      position: {"lat": to_lat, "lng": to_lng},
      map: getMap(),
      title: title,
      label: msg
    });
    markers.push(marker)
  }
}

function clearMarkers() {
  for (var i = 0; i < markers.length; i++ ) {
    markers[i].setMap(null);
  }
  markers.length = 0;
}

/**
* This is function is for config the distance between two adyacent points. If the location from are too are far from each other, so we reduce the presicion for not taking too much time for searching
*/
function configDistances(){
  var a = from_lng - to_lng
  var b = from_lat - to_lat
  var distance = Math.sqrt( a*a + b*b );
  if(distance > 1)distance_between_coordinates = distance_between_coordinates_far;
  else distance_between_coordinates = distance_between_coordinates_close;
}

/**
* This is the function manager for creating the best route algorithm.
*/
function startAlgorithmBestRoute(){
  // Cero step
  configDistances();
  // First step
  var mat = createMatrix();
  // Second step
  mat = setWeightsToMap(mat);
  // Third step
  var res = calculateBestRoute(mat);
  //Fourth step
  average = calculateAverage(res);
  //Fifth step
  var resCoordinates = castArrPosToArrCoordinates(res);
  //Sixth step
  paintMyBestRoute(resCoordinates, average, getMap());
}

function addBestRouteToPanel() {
    var table = document.getElementById("routes_table");
    var row = table.insertRow(-1);
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    cell1.innerHTML = "Best route";
    cell2.innerHTML = average;
}

/**
* This is the first step of the algorithm. It creates the matrix for saving the air api values. Each cell of the matrix corresponds to a coordinate.
*/
//First step
function createMatrix(){
  var cols = Math.abs(from_lng - to_lng)/distance_between_coordinates + margin_for_matrix_between_two_points/distance_between_coordinates; //This equation if for amount of collumns of the matrix. It depends on parametric values
  cols = Math.ceil(cols);
  var rows = Math.abs(from_lat - to_lng)/distance_between_coordinates + margin_for_matrix_between_two_points/distance_between_coordinates; //Similar equation for amount of rows
  rows = Math.ceil(rows);
  var mat = new Array(rows);
  for (var i = 0; i < rows; i++) {
    mat[i] = new Array(cols);
  }
  console.log('mat', mat);
  return mat;
}

/**
* This is the second step of the algorithm. It loades each cell depending on latitude and longitude, and search for the nearest air api point value.
*/
//Second step
function setWeightsToMap(mat){
  var minLng = Math.min(from_lng,to_lng);
  var minLat = Math.min(from_lat,to_lat);

  for(var i = 0; i < mat.length ; i++ ){
    for(var j = 0; j < mat[i].length ; j++){
      var lng = minLng - margin_for_each_side + j * distance_between_coordinates; //Equation for geting the latitude based on position on matrix
      var lat = minLat - margin_for_each_side + i * distance_between_coordinates; //Equation for geting the longitude based on position on matrix
      // I left this comments as if you want to see the results
      // console.log("i",i);
      // console.log("j",j);
      // console.log("lng",lng);
      // console.log("lat",lat);
      var nearPoint = NearestAirPointValue(lat,lng).s_d0;
      if(nearPoint == 0) nearPoint = 0.001
      mat[i][j] = nearPoint;
    }
  }
  console.log(mat);
  return mat;
}

/**
* This is the third step of the algorithm. This function makes a new graph for calculating the best route with A* algorithm.
*/
//Third step
var pathStartFinishWeight;
function calculateBestRoute(mat){
  var minLng = Math.min(from_lng,to_lng);
  var minLat = Math.min(from_lat,to_lat);

  var graphRoutes = new Graph(mat, {diagonal: true});

  var jS = Math.round((from_lng - minLng + margin_for_each_side)/distance_between_coordinates); //Gets the collumn in the matrix based on the "from" latitude
  var iS = Math.round((from_lat - minLat + margin_for_each_side)/distance_between_coordinates); //Gets the row in the matrix based on the "from" longitude

  var start = graphRoutes.grid[iS][jS];

  var jF = Math.round((to_lng - minLng + margin_for_each_side)/distance_between_coordinates); //Gets the collumn in the matrix based on the "to" longitude
  var iF = Math.round((to_lat - minLat + margin_for_each_side)/distance_between_coordinates); //Gets the row in the matrix based on the "to" longitude

  var end = graphRoutes.grid[iF][jF];
  var result = astar.search(graphRoutes, start, end,{ heuristic: astar.heuristics.diagonal }); //Searchs for the best route

  pathStartFinishWeight = {weightS: mat[iS][jS], weightF: mat[iF][jF] };
  return result
}

//Fourth step
function calculateAverage(result){
  var sumAirValues = 0;
  var amount = 0;
  var previousWeight = null;
  for (var i = 0; i < result.length; i++) {
    var actualWeight = result[i].weight;
      sumAirValues += actualWeight;
      amount++;
  }
  var average;
  sumAirValues += pathStartFinishWeight.weightS;
  amount++;
  if(result.length == 0){
      sumAirValues += pathStartFinishWeight.weightF;
      amount++;
  }
  var average = sumAirValues/amount;
  return Math.round(average * 10000) / 10000
}

/**
* This is the fifth step of the algorithm. This function makes a new array with the correct format to google maps directions, converts the positions of matrix of the best route to latitude and longitude
*/
//Fifth step
function castArrPosToArrCoordinates(arr){
  var minLng = Math.min(from_lng,to_lng);
  var minLat = Math.min(from_lat,to_lat);
  var cantMore;
  var arrCoord = new Array(arr.length + 2);
  arrCoord[0] = {"lat":from_lat,"lng":from_lng};

  for(var pos = 0; pos < arr.length ; pos++ ){
    var i = arr[pos].x;
    var j = arr[pos].y;
    var lng = minLng - margin_for_each_side + j * distance_between_coordinates;
    var lat = minLat - margin_for_each_side + i * distance_between_coordinates;
    arrCoord[pos+1] = {"lat":lat,"lng":lng};
  }
  arrCoord[arrCoord.length - 1] = {"lat":to_lat,"lng":to_lng};
  return arrCoord;
}

/**
* This is the sixth step of the algorithm. This function creates a polilyne for drawing the best route in the map
*/
//Sixth step
function paintMyBestRoute(arrCoord, average, map){
  var color = getColorBasedOnAverage(average);
  var bestAirApiPath = new google.maps.Polyline({
    path: arrCoord,
    geodesic: true,
    strokeColor: color,
    strokeOpacity: 0.5,
    strokeWeight: 6
  });

  bestAirApiPath.setMap(map);
  var polilynes = getPolilynes();
  polilynes.push(bestAirApiPath);
}

/**
* This function is called when a new route is requested
*/
function cleanFromAndTo(){
  from_lat = from_lng = to_lat = to_lng = null;
}
