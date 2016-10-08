/**
 * Created by py on 23/09/16.
 */

"use strict";

const KafkaAdapter = require('./KafkaAdapter');
const BusConstructor = require('./BusService');
const Bus = new BusConstructor(new KafkaAdapter());
const EventEmitter = require('events').EventEmitter;

class PusherService2 {
    //@param: server instance
    constructor(s){
        this.pusher = require('http').Server(s);
        this.pusher.listen(50000);
        this.io = require('socket.io')(this.pusher);
        this.emitter = new EventEmitter();
        this.recipientsWaiting = new Map();
        this.arrivedBusMessages = new Map();
    }
    //@param: void
    //@function: starts listening for Bus and Socket messages
    listen(){
        this.listenBus();
        this.listenConnection();
    }
    //@param: void
    //@function: start listening for Socket connections from client
    listenConnection(){
        let _this = this;
        function listenRecipient(recipient) {
            recipient.on('set-id', function(data){
                // console.log(`new pusher session created with id = ${data._id}`);
                _this.recipientsWaiting.set(data._id, recipient);
                _this.emitter.emit(`recipient-arrived-${data._id}`, {id: data._id});
            });
        }
        this.io.on('connection', listenRecipient);
    }
    //@param: void
    //@function: start listening for Bus
    listenBus(){
        let _this = this;
        function handle (busMessage) {
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

        Bus.subscribe('payload-done', handle);
    }
}

module.exports = PusherService2;