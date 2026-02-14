/* main-map.javascript
    Description: 
    Proportional symbol animation with a time slider in leaflet.

    Data format: 
    GeoJSON, each feature = one site observation at one SurveyDate.

    Columns:
    SiteID, SiteName, RegionName, OpenDate, CloseDate, SurveyRound, SurveyDate,
    SiteType, IsSiteOpen, TotPop, TotHH
*/

//-------------------- INITIALIZE ------------------------------

// get path to geojson file
var GEOJSON_FILE = "data/processed/idp_sites_long_wgs1984.geojson";

// initialize the map and set the center to ethiopia
var map0 = L.map('map0').setView([9.14, 40.48], 5);

// load the tileset and add to the map
var tiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{
    subdomains: 'abcd',
    maxZoom: 19, 
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
}).addTo(map0);

// Layer group for markers
var markersLayer = L.layerGroup().addTo(map0);

// -------------------- UI ELEMENTS ------------------------------
var slider = document.getElementById("timeSlider");
var timeLabel = document.getElementById("timeLabel");
// -------------------- STATES ------------------------------
var dates = [];                 
var sitesById = new Map();       
var currentDateIndex = 0;

// -------------------- STATES ------------------------------
let maxPop = 0;
const MIN_RADIUS = 3;
const MAX_RADIUS = 28;

// -------------------- DATA LOAD ------------------------------
fetch(GEOJSON_FILE)
  .then(response => response.json())
  .then(geojson => {
    buildIndices(geojson);
    setupTimeSlider();
    addPropLegend();
    renderForDateIndex(currentDateIndex);          
  })
  .catch(err => {
    console.error(err);
    timeLabel.textContent = "Error loading data";
  });


// -------------------- INDEXING ------------------------------
function buildIndices(geojson) {
  dates = [];
  sitesById = new Map();
  maxPop = 0;

  var dateSet = new Set();
  var allLatLngs = [];

  (geojson.features || []).forEach(function (f) {
    if (!f || !f.geometry || f.geometry.type !== "Point") return;

    var p = f.properties || {};
    var siteId = p.SiteID;
    var dateStr = p.SurveyDate;

    if (!siteId || !dateStr) return;

    // track global max population for constant scaling
    if (typeof p.TotPop === "number" && p.TotPop > maxPop) {
      maxPop = p.TotPop;
    }

    dateSet.add(dateStr);

    if (!sitesById.has(siteId)) sitesById.set(siteId, []);
    sitesById.get(siteId).push(f);

    var coords = f.geometry.coordinates; // [lon, lat]
    if (Array.isArray(coords) && coords.length >= 2) {
      var lon = coords[0];
      var lat = coords[1];
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        allLatLngs.push(L.latLng(lat, lon));
      }
    }
  });

  // YYYY-MM-DD sorts chronologically as strings
  dates = Array.from(dateSet).sort();

  // sort each site series by SurveyDate
  sitesById.forEach(function (series) {
    series.sort(function (a, b) {
      return a.properties.SurveyDate.localeCompare(b.properties.SurveyDate);
    });
  });

  // default to latest date
  currentDateIndex = 0;

  // fit map once (optional)
  if (allLatLngs.length > 0) {
    map0.fitBounds(L.latLngBounds(allLatLngs).pad(0.12));
  }
}

// -------------------- SYMBOL SCALING ------------------------------
// sqrt scaling so symbol
function popToRadius(pop) {
  if (!maxPop || !pop || pop <= 0) return MIN_RADIUS;

  var x = Math.sqrt(pop) / Math.sqrt(maxPop); // 0..1
  return MIN_RADIUS + x * (MAX_RADIUS - MIN_RADIUS);
}

// -------------------- TIME SELECTION LOGIC ------------------------------
// return the most recent observation at or before selectedDate for a site
function latestObsAtOrBefore(series, selectedDateStr) {
  var best = null;

  for (var i = 0; i < series.length; i++) {
    var d = series[i].properties.SurveyDate;
    if (d <= selectedDateStr) best = series[i];
    else break;
  }
  return best;
}

// -------------------- RENDERING -------------------------------------------
function renderForDateIndex(idx) {
  if (!dates.length) return;

  var selectedDate = dates[idx];
  if (timeLabel) timeLabel.textContent = selectedDate;

  markersLayer.clearLayers();

  sitesById.forEach(function (series) {
    var obs = latestObsAtOrBefore(series, selectedDate);
    if (!obs) return;

    var p = obs.properties || {};
    if (p.CloseDate && selectedDate > p.CloseDate) return;


    // require population value
    if (typeof p.TotPop !== "number" || p.TotPop <= 0) return;

    var coords = obs.geometry.coordinates; // [lon, lat]
    var lon = coords[0];
    var lat = coords[1];
    var latlng = L.latLng(lat, lon);

    var radius = popToRadius(p.TotPop);

    var marker = L.circleMarker(latlng, {
      radius: radius,
      weight: 1,
      opacity: 1,
      fillOpacity: 0.6
    });

    // hover for exact numbers
    marker.bindTooltip(
      "<strong>" + (p.SiteName || "Unknown site") + "</strong><br>" +
      "Region: " + (p.RegionName || "—") + "<br>" +
      "Date: " + (p.SurveyDate || "—") + "<br>" +
      "TotPop: " + (typeof p.TotPop === "number" ? p.TotPop.toLocaleString() : "—") + "<br>" +
      "TotHH: " + (typeof p.TotHH === "number" ? p.TotHH.toLocaleString() : "—") + "<br>" +
      "Type: " + (p.SiteType || "—") + "<br>" +
      "Reason: " + (p.DispReason || "—") + "<br>",
      { sticky: false }
    );

    marker.addTo(markersLayer);
  });
}

// -------------------- SLIDER ------------------------------
function setupTimeSlider() {
  if (!slider) return;

  slider.min = 0;
  slider.max = Math.max(0, dates.length - 1);
  slider.value = String(currentDateIndex);
  slider.disabled = (dates.length === 0);

  slider.addEventListener("input", function () {
    currentDateIndex = Number(slider.value);
    renderForDateIndex(currentDateIndex);
  });
}

// -------------------- CONSTANT LEGEND ------------------------------
var LEGEND_VALUES = [50, 250, 1000, 2500, 10000, 50000, 87000];

function addPropLegend() {
  var propLegend = L.control({ position: "bottomright" });

  propLegend.onAdd = function () {
    var div = L.DomUtil.create("div", "info legend prop-legend");

    // prevent map drag/scroll when interacting with legend
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    div.innerHTML += "<div class='legend-title'>Population (TotPop)</div>";

    LEGEND_VALUES.forEach(function (v) {
      var r = popToRadius(v);
      var d = Math.max(6, Math.round(2 * r)); // diameter

      div.innerHTML +=
        "<div class='legend-row'>" +
          "<svg width='" + (d + 6) + "' height='" + (d + 6) + "'>" +
            "<circle cx='" + (d / 2 + 3) + "' cy='" + (d / 2 + 3) + "' r='" + r + "'" +
              " fill='rgba(0,0,0,0.35)' stroke='#000' stroke-width='1' />" +
          "</svg>" +
          "<span class='legend-label'>" + v.toLocaleString() + "</span>" +
        "</div>";
    });

    div.innerHTML += "<div class='legend-note'>Hover a circle for exact values.</div>";

    return div;
  };

  propLegend.addTo(map0);
}
