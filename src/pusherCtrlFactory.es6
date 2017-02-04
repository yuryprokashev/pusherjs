/**
 *Created by py on 31/01/2017
 */

'use strict';

module.exports = (socketCtrl, configService, kafkaService) => {

    let pusherCtrl = {};

    let kafkaListeners,
        isSignedMessage;

    let handleKafkaMessage,
        handleNewRecipient;

    let messagesWaitingForRecipients = new Map();

    handleKafkaMessage = kafkaMessage => {

        let context,
            recipientId,
            message;

        context = kafkaService.extractContext(kafkaMessage);
        recipientId = context.response.userToker || context.response.commandId;
        message = context.response.commandId ? context.response.monthCode : context.response.dayCode;

        if(socketCtrl.hasArrived(recipientId)) {
            socketCtrl.sendPush(recipientId, message);
        }
        else {
            messagesWaitingForRecipients.set(recipientId, message);
        }

    };

    handleNewRecipient = (eventArgs) => {
        let recipientId,
            message;
        recipientId = eventArgs.id;
        if(messagesWaitingForRecipients.has(recipientId)) {
            message = messagesWaitingForRecipients.get(recipientId);
            socketCtrl.sendPush(recipientId, message);
            messagesWaitingForRecipients.delete(recipientId);
        }
        else {
            console.log('kafkaMessage for this recipient has not yet arrived');
        }


    };

    socketCtrl.on('recipient-arrived', handleNewRecipient);

    kafkaListeners = configService.read('pusher.kafkaListeners');
    isSignedMessage = false;
    if(kafkaListeners !== undefined) {
        kafkaService.subscribe(kafkaListeners.notifyPayloadCreated, isSignedMessage, handleKafkaMessage);
    }

    return pusherCtrl;

};