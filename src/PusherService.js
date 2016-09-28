/**
 * Created by py on 12/08/16.
 */

var PusherService;

var KafkaAdapter = require('./KafkaAdapter');
var BusConstructor = require('./BusService');
var Bus = new BusConstructor(new KafkaAdapter());

const EventEmitter = require('events').EventEmitter;

PusherService = function () {

    const express = require( 'express' );
    var server = express();

    var pusher = require('http').Server(server);
    pusher.listen(80);
    const io = require('socket.io')(pusher);

    const emitter = new EventEmitter();

    var sockets = {};

    var messages = new Map();

    // var self = this;

    io.on('connection', function (socket) {

        socket.on("set-id", function(data) {
            console.log('adding to sockets array');
            console.log(data._id);
            sockets[data._id] = socket;

            emitter.once("client-payload-new", function (msg) {
                setTimeout(function () {
                    console.log('emitter force socket to fire payload to client');
                    var value = JSON.parse(msg.value);
                    var id = value.userToken;
                    var dayCode = value.dayCode;
                    sockets[id].emit("client-payload-new-1", {push: "client-payload-new", dayCode: dayCode});
                    // sockets[id].emit('disconnect', {id: id});
                }, 1500);
            } );
        });
    });


    var handleNewPayload = function (msg) {
        try {
            messages.set(msg.value.requestId, msg);
            console.log(JSON.stringify(messages));
            emitter.emit('client-payload-new', msg);
        }
        catch (err){
            console.error(err);
        }

    };
    Bus.subscribe('payload-done', handleNewPayload);
};

module.exports = PusherService;