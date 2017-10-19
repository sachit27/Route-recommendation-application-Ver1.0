var airElementsData = []; //Array for saving Air Api results

/**
* When the page is loaded, this method is called for making the Air Api consults. This method is called as soon as possible for making the services faster
*/
window.onload = function() {
  $('#loading').hide();
  httpGetAsync("https://pm25.lass-net.org/data/last-all-airbox.json", loadData);
}

/**
* This is a javascript get to the url of Air Api data
*/
function httpGetAsync(theUrl, callback){
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function() {
    if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
    callback(xmlHttp.responseText); //If everything is OK, loadData function is called for saving the results. This is the callback of Async Get that will trigger when the GET request is finished
  }
  xmlHttp.open("GET", theUrl, true); // true for asynchronous
  xmlHttp.send(null);
}

/**
* This method paints the routes that are called Polylines
*/
function loadData(airData){
  var data = JSON.parse(airData);
  airElementsData = data.feeds;
  console.log("Data Air Api", airElementsData);
}

/**
* This method is part of the algorithm to search closer points. It converts degrees to radians
*/
function Deg2Rad(deg) {
  return deg * Math.PI / 180;
}

/**
* This method is part of the algorithm to search closer points. It use Pythagoras to get the closer distance between the points
*/
function PythagorasEquirectangular(lat1, lon1, lat2, lon2) {
  lat1 = Deg2Rad(lat1);
  lat2 = Deg2Rad(lat2);
  lon1 = Deg2Rad(lon1);
  lon2 = Deg2Rad(lon2);
  var R = 6371; // earth radius in km
  var x = (lon2 - lon1) * Math.cos((lat1 + lat2) / 2);
  var y = (lat2 - lat1);
  var d = Math.sqrt(x * x + y * y) * R;
  return d;
}

/**
* This method is called for getting the closer Air Api point of the latitude and longitude in the parameters
*/
function NearestAirPointValue(latitude, longitude) {
  if(airElementsData.length ==0){
    alert("Air api data not ready");
    return;
  }
  var mindif = 99999;
  var closest;
  var elementMin;

  for (index = 0; index < airElementsData.length; ++index) {
    var element = airElementsData[index];
    var latAir = element.gps_lat;
    var longAir = element.gps_lon;
    var dif = PythagorasEquirectangular(latitude, longitude, latAir, longAir);
    if (dif < mindif) {
      closest = index;
      elementMin = element;
      mindif = dif;
    }
  }
  // I left this comments as if you want to see the results
  // console.log("Latitude and longitude of the points to search: ", latitude + " , " + longitude);
  // console.log(elementMin);
  // console.log(elementMin.s_d0);
  // console.log(elementMin.gps_lat);
  // console.log(elementMin.gps_lon);
  // console.log("--------------------");
  // console.log(closest);
  // console.log(airElementsData[closest]);
  // console.log(airElementsData[closest].s_d0);
  // console.log(airElementsData[closest].gps_lat);
  // console.log(airElementsData[closest].gps_lon);
  return elementMin;
}
