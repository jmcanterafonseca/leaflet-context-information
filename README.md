# Leaflet plugin for displaying real time context information

A Leaflet plugin + infrastructure for getting access to Context Information exposed using the FIWARE NGSIv2 APIs. 

# How to use it

```js
var ngsiv2Layer = L.fiwareContextLayer({
    endPoint: 'http://localhost:1026',
    tenant:   'Bicycle',
    subTenant: '/Barcelona',
    entityType: 'BikeHireDockingStation',
    iconUrl: 'imgs/marker.png',
    attrs: ['availableBikeNumber']
});

ngsiv2Layer.addTo(map);
```
