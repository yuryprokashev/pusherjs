/**
 *Created by py on 31/01/2017
 */

'use strict';
// DEFINE KAFKA HOST TO CONNECT

const SERVICE_NAME = 'pusher';

const KAFKA_TEST = "54.154.211.165";
const KAFKA_PROD = "54.154.226.55";

const parseProcessArgs = require('./helpers/parseProcessArgs.es6');
let args = parseProcessArgs();
let kafkaHost = (function(bool){
    let result = bool ? KAFKA_PROD : KAFKA_TEST;
    console.log(result);
    return result;
})(args[0].isProd);

// WIRE EXTERNAL LIBRARIES
const express = require('express');
const bodyParser = require('body-parser');
const path = require ('path');
// CREATE APP
const app = module.exports = express();

// WIRE FACTORY MODULES
const kafkaBusFactory = require('my-kafka').kafkaBusFactory;
const kafkaServiceFactory = require('my-kafka').kafkaServiceFactory;

const configObjectFactory = require('my-config').configObjectFactory;
const configServiceFactory = require('my-config').configServiceFactory;
const configCtrlFactory = require('my-config').configCtrlFactory;

const socketCtrlFactory = require('./socketCtrlFactory.es6');

const pusherCtrlFactory =  require('./pusherCtrlFactory.es6');


// CREATE APP COMPONENT INSTANCES USING FACTORY MODULES
let kafkaBus,
    configObject;

let configService,
    kafkaService;

let configCtrl,
    pusherCtrl,
    socketCtrl;

let kafkaListeners;


kafkaBus = kafkaBusFactory(kafkaHost, SERVICE_NAME);
kafkaService = kafkaServiceFactory(kafkaBus);

kafkaBus.producer.on('ready', ()=> {

    configObject = configObjectFactory(SERVICE_NAME);
    configObject.init().then(
        (config) => {
            configService = configServiceFactory(config);
            configCtrl = configCtrlFactory(configService, kafkaService);
            kafkaService.subscribe('get-config-response', true, configCtrl.writeConfig);
            kafkaService.send('get-config-request', true, configObject);
            configCtrl.on('ready', () => {
                socketCtrl = socketCtrlFactory(configService);
                pusherCtrl = pusherCtrlFactory(socketCtrl, kafkaService);

                kafkaListeners = configService.read(SERVICE_NAME, 'kafkaListeners');
                kafkaService.subscribe(kafkaListeners.notifyPayloadCreated, false, pusherCtrl.handleKafkaMessage);

            });
            configCtrl.on('error', (args) => {
                console.log(args);
            });
        },
        (err) => {
            console.log(`ConfigObject Promise rejected ${JSON.stringify(err.error)}`);
        }
    );
});