/* secondary-map.javascript
    Description: 
    Simple Choropleth Map in leaflet

    Data format: 
    GeoJSON, each feature = one region of ethiopia, with count of historic IDP camps 
    between 2017 and 2023.

    Columns:
    RegionName, count, geometry
*/

// -------------------- INITIALIZE ------------------------------

// get path to geojson file
var GEOJSON_FILE = "data/processed/idp_by_region_wgs1984.geojson";

// initialize the map and set the center to ethiopia
var map = L.map('map').setView([9.14, 40.48], 5);

// load the tileset and add to the map
var tiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{
    subdomains: 'abcd',
    maxZoom: 19, 
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
}).addTo(map);

//-------------------- INFO CONTROL ------------------------------
var info = L.control();

info.onAdd = function(map){
    this._div = L.DomUtil.create('div', 'info');
    this.update();
    return this._div;
};

info.update = function(props){
    this._div.innerHTML = 
    '<h4>IDP camps by region </h4>' +
    (props
        ? '<b>' + props.RegionName + '</b><br />' + props.count + ' camps'
        : 'Hover over a region');
};

info.addTo(map)

//-------------------- COLOR FUNCTION ------------------------------

// define a function that returns a color based on # of idp camps
function getColor(d) {
    return d > 1000  ? '#54278f' :
           d > 500   ? '#756bb1' :
           d > 250   ? '#9e9ac8' :
           d > 100   ? '#9c9fca' :
           d > 50    ? '#bcbddc' :
           d > 25    ? '#dadaeb' :
                    '#f2f0f7';
}

// -------------------- LEGEND --------------------------------------

var legend = L.control({ position: 'bottomright' });

legend.onAdd = function (map) {

  var div = L.DomUtil.create('div', 'info legend'),
      grades = [0, 25, 50, 100, 250, 500, 1000];

  for (var i = 0; i < grades.length; i++) {
    div.innerHTML +=
      '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
      grades[i] +
      (grades[i + 1] ? ' &ndash; ' + grades[i + 1] + '<br>' : '+');
  }

  return div;
};

legend.addTo(map);


// --------------------- CHOROPLETH ---------------------------------

// define a styling function for GeoJSON layer so that its fillColor depends
// on feature.properties.count property
function style(feature){
    return{
        fillColor: getColor(feature.properties.count),
        weight: 2,
        opacity: 1, 
        color: 'white', 
        dashArray: '3', 
        fillOpacity: 0.7
    };
}

//-------------------- EVENTS ------------------------------------------

// decare the geojson variable
var geojson;

// define an event listener for layer mouseover event
function highlightFeature(e){
    var layer = e.target;

    layer.setStyle({
        weight: 4,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.8
    });

    layer.bringToFront()
    info.update(layer.feature.properties);
}

// define what happens when mouseout
function resetHighlight(e) {
    geojson.resetStyle(e.target); // resets the layer style to its default state
    info.update();
}

// use the onEachFeature option to add the listeners to our layers
function onEachFeature(feature, layer){
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight 
    })
}

// -------------------- FETCH ------------------------------

// fetch the geojson file, add it to the map
fetch(GEOJSON_FILE)
    .then(response => response.json())
    .then(data => {
    geojson = L.geoJson(data, {
        style: style,
        onEachFeature: onEachFeature
    }).addTo(map);
    })
     .catch(err => console.error("GeoJSON fetch failed:", err));


