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
const EventEmitter = require('events').EventEmitter;
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

let bootstrapComponents,
    handleError;

bootstrapComponents = () => {
    configObject = configObjectFactory(SERVICE_NAME, EventEmitter);
    configService = configServiceFactory(configObject, EventEmitter);
    configCtrl = configCtrlFactory(configService, kafkaService, EventEmitter);

    configCtrl.on('ready', () => {

        socketCtrl = socketCtrlFactory(configService);
        pusherCtrl = pusherCtrlFactory(socketCtrl, configService, kafkaService);

    });

    configCtrl.on('error', (args) => {
        handleError(args);
    })
};

handleError = (err) => {
    //TODO. Implement centralized error logging.
    console.log(err);
};


kafkaBus = kafkaBusFactory(kafkaHost, SERVICE_NAME, EventEmitter);
kafkaService = kafkaServiceFactory(kafkaBus, EventEmitter);

kafkaBus.producer.on('ready', bootstrapComponents);