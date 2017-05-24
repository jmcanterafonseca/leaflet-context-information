'use strict';

/* globals L, console, XMLHttpRequest, turf */

L.FIWARELayer = L.LayerGroup.extend({
    _options: null,
    
    /* Invoked at initialization time */
    initialize:  function (options) {
        console.log('Initialize called ...');
        
        this._options = options;
        
        console.log(JSON.stringify(options));
    },
    
    /* Invoked when layer added to a map */
    onAdd: function (map) {
        var self = this;
        
        console.log('OnAdd invoked');
        
        map.on('moveend', self._onMapMove.bind(this, map));
        
        var boundingBox = map.getBounds();
        
        console.log('Bounding box to be loaded: ', JSON.stringify(boundingBox));
        
        GeoHelper.addFeaturesToMap(map, boundingBox, this._options).then(function markersAdded() {
           self._visitedBounds.push(boundingBox); 
        }, function errorMarkers(e) {
            console.error('Error while adding markers: ', e);
        });
    },
    
    _onMapMove: function(map) {
        console.log('Map move invoked');
        
        GeoHelper.refreshMap(map, this);
    },
    
    _visitedBounds: []
});

L.fiwareContextLayer = function (options) {
    return new L.FIWARELayer(options || {});
};

/* Helper object to help with dealing with layer rendering and FIWARE connection */ 
var FiwareHelper = {
    /* Converts a leaflet bounding box to a NGSI bounding box (string representation) */
    toNgsiBoundingBox: function(boundingBox) {
        var out = {
            coordinates: [],
            geometry: 'box'
        };
        
        if (!boundingBox.type) {
            out.coordinates.push(boundingBox._southWest.lat + ',' + boundingBox._southWest.lng);
            out.coordinates.push(boundingBox._northEast.lat + ',' + boundingBox._northEast.lng);
        }
        else {
            out.geometry = boundingBox.geometry.type;
            var coords = boundingBox.geometry.coordinates[0];
            
            for (var idx = 0; idx < coords.length; idx++) {
                out.coordinates.push(coords[idx][1] + ',' + coords[idx][0]);
            }
        }
        
        return out;
    },
    
    /* Retrieves NGSI data according to the bounding box and the options */
    retrieveNgsiData: function(boundingBox, options) {
        if (!boundingBox) {
            return Promise.resolve();
        }
        
        var self = this;
        
        return new Promise(function(resolve, reject) {
            var url = options.endPoint;
            var entityType = options.entityType;
            url += '/v2/entities?type=' + entityType;
            
            var georel = 'coveredBy';
            var attrs = options.attrs.join(',');
            
            var bboxData = self.toNgsiBoundingBox(boundingBox);
            
            url += '&' + 'georel'   + '=' + georel;
            url += '&' + 'geometry' + '=' + bboxData.geometry.toLowerCase();
            url += '&' + 'coords'   + '=' + bboxData.coordinates.join(';');
            url += '&' + 'options'  + '=' + 'keyValues';
            // Location is always included
            url += '&' + 'attrs'    + '=' + attrs + ',' + 'location';
            
            var q = options.q;
            if (q) {
                url += '&' + 'q' + '=' + q;
            }
           
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.responseType = 'json';
            
            if (options.tenant) {
                xhr.setRequestHeader('Fiware-Service', options.tenant);
            }
            
            if (options.subTenant) {
                xhr.setRequestHeader('Fiware-Servicepath', options.subTenant);
            }
            
            xhr.send();
            
            xhr.onload = function() {
                if (xhr.status === 200) {
                    resolve(xhr.response);
                }
                else {
                    reject(xhr.status);
                }
            };
            
            xhr.onerror = function() {
                reject('XHR Error');
            };
        });
    }
};  
    
var GeoHelper = {
    
    calculateDifference: function(bounds1, bounds2) {
        var point1 = turf.point([bounds1._southWest.lng, bounds1._southWest.lat]);
        var point2 = turf.point([bounds1._northEast.lng, bounds1._northEast.lat]);
        
        var features = turf.featureCollection([point1, point2]);
        var boundingBox1 = turf.bbox(features);
        
        var point3 = turf.point([bounds2._southWest.lng, bounds2._southWest.lat]);
        var point4 = turf.point([bounds2._northEast.lng, bounds2._northEast.lat]);
        
        var features2 = turf.featureCollection([point3, point4]);
        var boundingBox2 = turf.bbox(features2);
        
        var difference = turf.difference(turf.bboxPolygon(boundingBox2), turf.bboxPolygon(boundingBox1));
        
        console.log(JSON.stringify(difference));
        
        return difference;
    },
    
    // Calculates the bounds to be loaded when the map is moved
    refreshMap: function (map, layer) {
        var self = this;
        
        if (map.hasLayer(layer)) {
            var newBounds = map.getBounds();
            
            var affectedBounds = this.calculateDifference(
                layer._visitedBounds[layer._visitedBounds.length - 1], newBounds);
            this.addFeaturesToMap(map, affectedBounds, layer._options).then(function markersAdded() {
                layer._visitedBounds.push(newBounds);
            }, function errorMarkers(e) {
                console.error('Markers error: ', e);
                layer._visitedBounds.push(newBounds);
            });
        }
        else {
            console.log('Map has not layer');
        }
    },
    
    addFeaturesToMap: function(map, boundingBox, options) {
        return new Promise(function(resolve, reject) {
            FiwareHelper.retrieveNgsiData(boundingBox, options).then(function dataRetrieved(data) {
                if (!data) {
                    console.warn('Data retrieved from the server is null or undefined');
                    resolve();
                    return;
                }
                
                var markerList = [];
                
                data.forEach(function(aResult) {
                    var attrList = options.attrs;
                    var markerContent = '';
                    for(var j = 0; j < attrList.length; j++) {
                        markerContent += aResult[attrList[j]];
                        
                        if (j < attrList.length - 1) {
                            markerContent += '<br>';
                        }
                    }
                    if (aResult.location.type == 'Point') {
                        var location = [aResult.location.coordinates[1], aResult.location.coordinates[0]];
                        var icon = L.icon({
                           iconUrl: options.iconUrl
                        });
                        var marker = L.marker(location, {
                            icon: icon
                        });
                        
                        marker.bindPopup(markerContent);
                        markerList.push(marker);
                    }
                    else if (aResult.location.type == 'MultiPolygon') {
                        var polygon = aResult.location.coordinates[0][0];
                        var correctedPolygon = [];

                        for (var p of polygon) {
                            var coords = [p[1], p[0]];
                            correctedPolygon.push(coords);
                        }

                        var lpolygon = L.polygon(correctedPolygon);
                        lpolygon.bindPopup(markerContent);
                        
                        markerList.push(lpolygon);
                    }
                });
                
                var markerGroup = L.layerGroup(markerList);
                markerGroup.addTo(map);
                
                resolve();
            }, function error(e) {
                console.error('Error while retrieving data: ', e);
                reject(e);
            });
        });
    }
};
