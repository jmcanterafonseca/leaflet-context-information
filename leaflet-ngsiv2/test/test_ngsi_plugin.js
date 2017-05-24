'use strict';

/* globals L */

var map = L.map('map').setView([41.390205, 2.154007], 13);
// var map = L.map('map').setView([36.7201600, -4.4203400], 13);

// OSM Base Layer
var osmMapNik = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});

osmMapNik.addTo(map);

var ngsiv2Layer = L.fiwareContextLayer({
    endPoint: 'http://localhost:1028',
    tenant:   'poi',
    subTenant: '/Spain',
    entityType: 'PointOfInterest',
    iconUrl: 'imgs/marker.png',
//    q: "category=='113'",
    attrs: ['name', 'description']
});

ngsiv2Layer.addTo(map);


var malagaLayer = L.fiwareContextLayer({
    endPoint:   'http://localhost:1028',
    tenant:     'Malaga',
    subTenant:  '/parking/harmonized',
    entityType: 'OffStreetParking',
    attrs: ['name', 'availableSpotNumber', 'totalSpotNumber']
});

malagaLayer.addTo(map);