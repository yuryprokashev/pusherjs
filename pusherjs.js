/**
 * Created by py on 12/08/16.
 */

const PusherService = require('./src/PusherService2');
const express = require( 'express' );
const server = express();

var app = new PusherService(server);
app.listen();