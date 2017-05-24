'use strict';

/* jslint node: true */
/* globals console, require */

const SERVER_PORT = 1028;

const IDM_SERVER = 'http://130.206.121.52:5001/v3/auth/tokens';

const GSMA_INSTANCE = 'http://130.206.118.244:1027/v2/entities';

const credentials = {
  'poi': {
    server: GSMA_INSTANCE,
    user: 'dev_poi',
    pass: 'dev_poi_pwd'
  },
  'airquality': {
    server: GSMA_INSTANCE,
    user: 'dev_airquality2',
    pass: 'dev_airquality2_pwd'
  },
  'Malaga': {
    server: 'http://217.172.12.177:1026/v2/entities'
  }
};

var express = require('express');
var Request = require('request');

var app = express();

app.get('/v2/entities', function (req, resp) {
  console.log('GET request received ...');
  
  var i = req.url.indexOf('?');
  var queryString = req.url.substr(i + 1);
  
  var tenant = req.headers['fiware-service'];
  
  var headers = {
    'Fiware-Service': tenant,
    'Fiware-Servicepath': req.headers['fiware-servicepath']
  };
  
  resp.setHeader('Access-Control-Allow-Origin', '*');
  
  getToken(tenant).then(function tokenReady(token) {
    headers['x-auth-token'] = token;
    headers['accept'] = 'application/json';
    
    var url = credentials[tenant].server + '?' + queryString;
    
    console.log('Invoking: ', url, JSON.stringify(headers));
    
    var getRequest = {
      url: url,
      headers: headers
    };
    
    Request(getRequest, function(error, response, body) {
      if (error) {
        console.error('Error while getting data: ', error);
        resp.sendStatus(500);
        
        return;
      }
      
      console.log('GET status code: ', response.statusCode);
      
      if(!error && response.statusCode === 200) {
        var headers = Object.keys(response.headers);
        for (var j = 0; j < headers.length; j++) {
          resp.setHeader(headers[j], response.headers[headers[j]]);
        }
        if (!body) {
          console.warn('Body is null or undefined!');
        }
        resp.send(body);
      }
      else {
        console.error('Error while retrieving data: ', response.statusCode);
        console.error('Output payload: ', body);
        resp.sendStatus(500);
      }
    });  
  }, function tokenFailed(errorCode) {
      console.error('Get token failed: ', errorCode);
      resp.sendStatus(500);
  });
});

app.options('/v2/entities', function(req, resp) {
  console.log('OPTIONS request received');
  
  resp.setHeader('Access-Control-Allow-Origin', '*');
  resp.setHeader('Access-Control-Allow-Methods', 'GET');
  resp.setHeader('Access-Control-Allow-Headers', 'fiware-service, fiware-servicepath');
  resp.setHeader('Access-Control-Max-Age', '86400');
  
  resp.sendStatus(200);
  
  console.log('OPTIONS request fulfilled');
});

function getToken(tenant) {
  if (!credentials[tenant].user) {
    return Promise.resolve('dummy_token');
  }
  
  return new Promise(function(resolve, reject) {
    
    // Payload needed to obtain a token
    var tokenPayload = {
      "auth": {
        "identity": {
          "methods": ["password"],
          "password": {
            "user": {
              "name": credentials[tenant].user,
              "domain": { "name": tenant},
              "password": credentials[tenant].pass
            }
          }
        }
      }
    };
    
    var requestParameters = {
      uri: IDM_SERVER,
      method: 'POST',
      json: tokenPayload
    };

    Request(requestParameters, function (error, response, body) {
      if (!error && response.statusCode === 201) {
        var token = response.headers['x-subject-token'];
        
        console.log('Token retrieved: ', token);
        
        if (token) {
          resolve(token);
        }
        else {
          reject('Token not defined');
        }
      }
      else {
        console.log('HTTP status code returned by getToken: ', response.statusCode);
        reject(response.statusCode);
      }
    });  // Request

  }); // Promise 
}

app.listen(SERVER_PORT);

console.log('Server up and running');