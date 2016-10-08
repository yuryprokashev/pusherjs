/**
 * Created by py on 12/08/16.
 */
"use strict";

var PusherService;

var KafkaAdapter = require('./KafkaAdapter');
var BusConstructor = require('./BusService');
var Bus = new BusConstructor(new KafkaAdapter());

const EventEmitter = require('events').EventEmitter;

PusherService = function () {



    var pusher = require('http').Server(server);
    pusher.listen(80);
    const io = require('socket.io')(pusher);

    const emitter = new EventEmitter();

    var sockets = {};

    var messages = new Map();

    // var self = this;

    function parseValue(message){
        return JSON.parse(message.value);
    }

    function isMessageArrived(token) {
        return messages.has(token);
    }


    function isCommand(message){
        return parseValue(message).commandId !== null;
    }

    function decidePushArgs(message){
        console.log('-----decide push args ----');
        let push = messages.get(message._id);
        console.log(push);
        if(isCommand(push)){
            let args = {id: parseValue(push).commandId, dayCode: parseValue(push).monthCode};
            console.log(args);
            console.log('------------------');
            return args;
        }
        else {
            let args = {id: parseValue(push).userToken, dayCode: parseValue(push).dayCode};
            console.log(args);
            console.log('------------------');
            return args;
        }
    }

    function sendPush(message){
        let args = decidePushArgs(message);
        sockets[args.id].emit('client-payload-new-1', {push: "client-payload-new", dayCode: args.dayCode});
        messages.delete(args.id);
    }

    function sendPushAsync(message, timeout){
        setTimeout(sendPush(message), timeout);
    }


    io.on('connection', function (socket) {
        socket.on("set-id", function(data) {

            if(isMessageArrived(data._id)){
                console.log('message already arrived');
                sendPushAsync(data, 1500);
            }
            else {
                console.log('message is not arrived yet');
                emitter.once('client-payload-new', function(msg){
                    console.log('--------emitting...');
                    console.log(msg);
                    console.log('-----------------');
                    sendPushAsync(msg, 1500);
                })
            }

        });
    });


    // io.on('connection', function (socket) {
    //
    //     socket.on("set-id", function(data) {
    //         console.log('adding to sockets array');
    //         console.log(data._id);
    //         sockets[data._id] = socket;
    //
    //         if(isMessageArrived(data._id)){
    //             console.log('payload-done already arrived - sending push');
    //             var push = messages.get(data._id);
    //             var id = parseValue(push).userToken;
    //             var dayCode = parseValue(push).dayCode;
    //             setTimeout(function(){
    //                 sockets[id].emit("client-payload-new-1", {push: "client-payload-new", dayCode: dayCode});
    //                 messages.delete(id);
    //                 console.log(`is Message Still in Map? ${messages.has(id)}`);
    //             }, 1500);
    //         }
    //         else {
    //             console.log('payload-done has not yet arrived - waiting for emitter notification');
    //             emitter.once("client-payload-new", function (msg) {
    //                 setTimeout(function () {
    //                     console.log('emitter force socket to fire payload to client');
    //                     var value = JSON.parse(msg.value);
    //                     var id = value.userToken;
    //                     var dayCode = value.dayCode;
    //                     sockets[id].emit("client-payload-new-1", {push: "client-payload-new", dayCode: dayCode});
    //                     // sockets[id].emit('disconnect', {id: id});
    //                 }, 1500);
    //             } );
    //         }
    //     });
    // });


    var handleNewPayload = function (msg) {
        try {
            var token = parseValue(msg).userToken || parseValue(msg).commandId;
            messages.set(token, msg);
            console.log(messages);
            emitter.emit('client-payload-new', msg);
        }
        catch (err){
            console.error(err);
        }

    };
    Bus.subscribe('payload-done', handleNewPayload);
};

module.exports = PusherService;