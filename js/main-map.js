/* main-map.javascript
    Description: 
    Proportional symbol animation with a time slider in leaflet.

    Data format: 
    GeoJSON, each feature = one site observation at one SurveyDate.

    Columns:
    SiteID, SiteName, RegionName, OpenDate, CloseDate, SurveyRound, SurveyDate,
    SiteType, IsSiteOpen, TotPop, TotHH
*/

// get path to geojson file
const GEOJSON_FILE = "data/processed/idp_sites_long.geojson";

// initialize the map
const map = L.map("map", {zoomControl: true}).setView([8.8, 38.8], 5);

// load in a basemap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors" 
}).addTo(map);

//