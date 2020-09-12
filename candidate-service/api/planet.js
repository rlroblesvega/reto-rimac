'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');
const R = require('ramda');
const axios = require('axios');

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.submit = (event, context, callback) => {
    console.log("Receieved request submit planet details. Event is", event);
    const requestBody = JSON.parse(event.body);

    const nombre = requestBody.nombre;
    const diametro = requestBody.diametro;
    const periodoRotacion = requestBody.periodoRotacion;
    const periodoOrbital = requestBody.periodoOrbital;
    const gravedad = requestBody.gravedad;
    const poblacion = requestBody.poblacion;
    const clima = requestBody.clima;
    const terreno = requestBody.terreno;
    const aguaSuperficial = requestBody.aguaSuperficial;
    const residentes = requestBody.residentes;
    const peliculas = requestBody.peliculas;
    const url = requestBody.url;
    

    const planet = planetInfo(nombre, diametro, periodoRotacion, periodoOrbital, gravedad, poblacion, clima, terreno, aguaSuperficial, residentes, peliculas, url);

    submitPlanetP(planet)
    .then(res => {
      callback(null, {
        statusCode: 201,
        body: JSON.stringify({
          message: `Sucessfully submitted planet with name ${nombre}`,
          planetId: res.id
        })
      });
    })
    .catch(err => {
      console.log(err);
      callback(null, {
        statusCode: 500,
        body: JSON.stringify({
          message: `Unable to submit planet with name ${nombre}`
        })
      })
    });

};


module.exports.list = (event, context, callback) => {
    console.log("Receieved request to list all planets. Event is", event);
    var params = {
        TableName: process.env.PLANET_TABLE,
        ProjectionExpression: "id, nombre, diametro, periodoRotacion, periodoOrbital, gravedad, poblacion, clima, terreno, aguaSuperficial, residentes, peliculas"
    };
    const onScan = (err, data) => {
        if (err) {
            console.log('Scan failed to load data. Error JSON:', JSON.stringify(err, null, 2));
            callback(err);
        } else {
            console.log("Scan succeeded.");
            return callback(null, successResponseBuilder(JSON.stringify({
                planetas: data.Items
            })
            ));
        }
    };
    dynamoDb.scan(params, onScan);
};

module.exports.get = (event, context, callback) => {
    const params = {
        TableName: process.env.PLANET_TABLE,
        Key: {
            id: event.pathParameters.id,
        },
    };
    dynamoDb.get(params)
        .promise()
        .then(result => {
            callback(null, successResponseBuilder(JSON.stringify(result.Item)));
        })
        .catch(error => {
            console.error(error);
            callback(new Error('Couldn\'t fetch planet.'));
            return;
        });
};


module.exports.getInfoPlanet = (event, context, callback) => {
    
    axios.get(`https://swapi.py4e.com/api/planets/${event.pathParameters.id}`)
    .then(function (response) {
        let data = response.data;
        let result = {
                "nombre": data.name,
                "diametro":data.diameter,
                "periodoRotacion": data.rotation_period,
                "periodoOrbital": data.orbital_period,
                "gravedad": data.gravity,
                "poblacion": data.population,
                "clima": data.climate,
                "terreno": data.terrain,
                "aguaSuperficial": data.surface_water,
                "residentes":  data.residents,
                "peliculas":  data.films,
                "url": data.url,
                "creado": data.created,
                "actualizado": data.edited
            }
            return callback(null, successResponseBuilder(JSON.stringify({
                    result
                })
            ));
    })
    .catch(function (error) {
        console.log(error);
        callback(new Error('Couldn\'t fetch planet.'));
        return;
    })
    .then(function () {
        console.log("Finish call");
    }); 

};


const checkPlanetExistsP = (planet) => {
    console.log('Checking if planet already exists...');
    const query = {
        TableName: process.env.PLANET_NAME_TABLE,
        Key: {
            "nombre": planet.nombre
        }
    };
    return dynamoDb.get(query)
        .promise()
        .then(res => {
            if (R.not(R.isEmpty(res))) {
                return Promise.reject(new Error('Planet already exists with name ' + nombre));
            }
            return planet;
        });
}

const submitPlanetP = planet => {
    console.log('submitPlanetP() Submitting planet to system');
    const planetItem = {
        TableName: process.env.PLANET_TABLE,
        Item: planet,
    };
    return dynamoDb.put(planetItem)
        .promise()
        .then(res => planet);
};


const successResponseBuilder = (body) => {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: body
    };
};

const failureResponseBuilder = (statusCode, body) => {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: body
    };
};


const submitPlanetNameP = planet => {
    console.log('Submitting planet name');
    const planetNameInfo = {
        TableName: process.env.PLANET_NAME_TABLE,
        Item: {
            planet_id: planet.id,
            nombre: planet.nombre
        },
    };
    return dynamoDb.put(planetNameInfo)
        .promise();
}

const planetInfo = (nombre, diametro, periodoRotacion, periodoOrbital, gravedad, poblacion, clima, terreno, aguaSuperficial, residentes, peliculas, url) => {
    const timestamp = new Date().getTime();
    return {
        id: uuid.v1(),
        nombre,
        diametro,
        periodoRotacion,
        periodoOrbital,
        gravedad,
        poblacion,
        clima,
        terreno,
        aguaSuperficial,
        residentes,
        peliculas,
        url,
        evaluated: false,
        submittedAt: timestamp,
        updatedAt: timestamp,
    };
};

