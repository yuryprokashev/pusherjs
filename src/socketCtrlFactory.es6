/**
 *Created by py on 31/01/2017
 */

'use strict';
const EventEmitter = require('events').EventEmitter;
const io = require('socket.io');
const express = require('express');

module.exports = configService => {

    let socketCtrl;

    let arrivedRecipients = new Map(); //TODO. NEVER STORE OBJECTS IN CONTROLLER!!!

    let protocol,
        port;

    let httpServer,
        socketServer;

    // Starting Socket Server

    protocol = configService.read('pusher.protocol');
    port = configService.read('pusher.port');

    httpServer = require(protocol).Server(express());
    httpServer.listen(port);

    socketServer = io(httpServer);
    // Socket Server now must be ready to accept connections.

    // Creating Socket Controller
    socketCtrl = new EventEmitter();

    socketCtrl.hasArrived = recipientId => {
        return arrivedRecipients.has(recipientId);
    };

    socketCtrl.sendPush = (recipientId, push) => {
        let recipient = arrivedRecipients.get(recipientId);
        recipient.emit('client-payload-new', push);
        recipient.emit('reset-id', {_id: recipientId});
        arrivedRecipients.delete(recipientId);
    };

    let registerConnection = (recipient) => {
        let registerRecipient = (eventData) => {
            arrivedRecipients.set(eventData._id, recipient);
            socketCtrl.emit('recipient-arrived', {id: eventData._id});
        };
        recipient.on('set-id', registerRecipient);
    };

    socketCtrl.start = () => {
        socketServer.on('connection', registerConnection);
    };

    return socketCtrl;

};