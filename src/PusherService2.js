/**
 * Created by py on 23/09/16.
 */

"use strict";

const KafkaAdapter = require('./KafkaAdapter2');
const guid = require('./guid');
const EventEmitter = require('events').EventEmitter;
const KAFKA_TEST = "54.154.211.165";
const KAFKA_PROD = "54.154.226.55";
const io = require('socket.io');

class PusherService2 {
    //@param: server instance
    constructor(s, isProd){
        var _this = this;
        if(isProd === undefined){
            throw new Error('isProd flag is missing');
        }
        this.serviceName = 'Pusher-Service';
        this.kafkaHost = (function(bool){
            let result = bool ? KAFKA_PROD : KAFKA_TEST;
            console.log(result);
            return result;
        })(isProd);
        this.emitter = new EventEmitter();
        this.bus = new KafkaAdapter(this.kafkaHost, this.serviceName, 2);
        let requestId = guid();
        this.bus.producer.on('ready', function () {
            _this.bus.subscribe('get-config-response', _this.configure);
            _this.bus.send('get-config-request', {requestId: requestId});
        });
        this.configure = function (msg) {
            let message = JSON.parse(msg.value);
            if(message.requestId === requestId){
                // console.log(message);
                let port = message.responsePayload[0].pusher.port;
                let protocol = message.responsePayload[0].pusher.protocol;
                _this.emitter.emit('config-ready', {port: port, protocol:protocol})
            }
        };
        this.setPusher = function(args){
            // console.log(args);
            _this.pusher = require(args.protocol).Server(s);
            _this.pusher.listen(args.port);
            _this.io = io(_this.pusher);
            _this.recipientsWaiting = new Map();
            _this.arrivedBusMessages = new Map();
            _this.emitter.emit('pusher-ready');
        };
        this.emitter.on('config-ready', _this.setPusher);
        this.emitter.on('pusher-ready', function(){
            console.log(`${_this.serviceName} bootstrapped`);
            _this.listen();
        });
    }

    //@param: void
    //@function: starts listening for Bus and Socket messages
    listen(){
        this.listenBus()
            .listenConnection();
        return this;
    }
    //@param: void
    //@function: start listening for Socket connections from client
    listenConnection(){
        let _this = this;
        function listenRecipient(recipient) {
            recipient.on('set-id', function(data){
                console.log(`new pusher session created with id = ${data._id}`);
                _this.recipientsWaiting.set(data._id, recipient);
                _this.emitter.emit(`recipient-arrived-${data._id}`, {id: data._id});
            });
        }
        this.io.on('connection', listenRecipient);
        return this;
    }
    //@param: void
    //@function: start listening for Bus
    listenBus(){
        let _this = this;
        function handle (busMessage) {
            // console.log('payload-done arrived. running handle()...');
            let id = readRecipientId(busMessage);
            let msg = readRecipientMessage(busMessage);
            if(isRecipientWaiting(id) === true){
                // console.log('isRecipientWaiting = true. Sending message...');
                send(`client-payload-new-${id}`, id, msg);
            }
            else if(isRecipientWaiting(id) === false){
                // console.log('isRecipientWaiting = false. Waiting for recipient arrival.');
                sendOnArrival(id, busMessage);
            }
        }

        function send(topic, recipientId, pusherMessage){
            let recipient = _this.recipientsWaiting.get(recipientId);
            recipient.emit(topic, pusherMessage);
            recipient.emit('reset-id', {_id: recipientId});
            // console.log(`session closed for ${recipientId}`);
            _this.recipientsWaiting.delete(recipientId);
            _this.arrivedBusMessages.delete(recipientId);
        }

        function sendOnArrival(recipientId, busMessage){
            _this.arrivedBusMessages.set(recipientId, busMessage);
            // console.log(`we have stored the busMessage for id = ${recipientId}`);
            _this.emitter.once(`recipient-arrived-${recipientId}`, function(data){
                let id = data.id;
                console.log(`we request id = ${id} from ArrivedBusMessages`);
                let bmsg = _this.arrivedBusMessages.get(id);
                console.log(bmsg);
                let msg = readRecipientMessage(bmsg);
                // send(`client-payload-new-${id}`, id, msg);
                send(`client-payload-new-${id}`, id, msg);

            });
        }

        function readRecipientId(busMessage) {
            let v = JSON.parse(busMessage.value);
            return v.commandId || v.userToken;
        }

        function readRecipientMessage(busMessage){
            let v = JSON.parse(busMessage.value);
            return v.commandId !== null ? v.monthCode : v.dayCode;
        }

        function isRecipientWaiting(recipientId){
            return _this.recipientsWaiting.has(recipientId);
        }

        this.bus.subscribe('create-message-response-processed', handle);
        return this;
    }
}

module.exports = PusherService2;