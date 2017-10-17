//These are parametric configuration for best route algorithm. You can see the image attached in fiverr conversation for better understanding of these
var distance_between_coordinates = 0.1; //The smaller the distance, the greater the presicion but the longer the waiting time
var margin_for_matrix_between_two_points= 1; //The larger the distance, the greater the route options but the longer the waiting time
var margin_for_each_side = margin_for_matrix_between_two_points/2 //This is the same margin for each side of points A and B.
var colorOfBestRoute = "#FF0000";

var from_lat, from_lng, to_lat,to_lng;
from_lat = from_lng = to_lat = to_lng = null;

/**
* This function is the entry for new coordinates. It can be "from" or "to", depending on the "codeAddress" asynchronous request to get latitude and longitude
*/
function manageIncomingRoutes(location, fromOrTo,selectedMode){
  if(fromOrTo == "from"){
    from_lat = location.lat();
    from_lng = location.lng();
  } else if (fromOrTo == "to") {
    to_lat = location.lat();
    to_lng = location.lng();
  } else {
    from = to = {};
  }
  if(from_lat != null && to_lat != null){ // When it has both "from" and "to" coordinates. It starts the algorithm
    startAlgorithmBestRoute();
    if (selectedMode == "BICYCLING"){
			drawBikePath(from_lat,from_lng,to_lat,to_lng);
		}
  }
};

/**
* This is the function manager for creating the best route algorithm.
*/
function startAlgorithmBestRoute(){
  // First step
  var mat = createMatrix();
  // Second step
  mat = setWeightsToMap(mat);
  // Third step
  var res = calculateBestRoute(mat);
  // Four step
  var resCoordinates = castArrPosToArrCoordinates(res);
  // Five step
  paintMyBestRoute(resCoordinates, colorOfBestRoute, getMap());
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
  return result
}

/**
* This is the fourth step of the algorithm. This function makes a new array with the correct format to google maps directions, converts the positions of matrix of the best route to latitude and longitude
*/
//Four step
function castArrPosToArrCoordinates(arr){
  var minLng = Math.min(from_lng,to_lng);
  var minLat = Math.min(from_lat,to_lat);

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
* This is the fifth step of the algorithm. This function creates a polilyne for drawing the best route in the map
*/
//Five step
function paintMyBestRoute(arrCoord, color, map){
  var bestAirApiPath = new google.maps.Polyline({
    path: arrCoord,
    geodesic: true,
    strokeColor: color,
    strokeOpacity: 1.0,
    strokeWeight: 2
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
