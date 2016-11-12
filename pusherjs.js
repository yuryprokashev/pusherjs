/**
 * Created by py on 12/08/16.
 */

const PusherService = require('./src/PusherService2');
const parseProcessArgs = require('./src/parseProcessArgs');
const express = require('express');
var args = parseProcessArgs();

var server = express();
var app = new PusherService(server, args[0].isProd);
