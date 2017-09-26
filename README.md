# Leaflet plugin for displaying real time context information

[![MIT license][license-image]][license-url]

A Leaflet plugin + infrastructure for getting access to Context Information exposed using the FIWARE NGSIv2 APIs. 

# How to use it

```
bower install leaflet-context-information
```

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

[license-image]: https://img.shields.io/badge/license-MIT-blue.svg
[license-url]: LICENSE
