/**
 *Created by py on 31/01/2017
 */

'use strict';

module.exports = (socketCtrl, kafkaService) => {

    let pusherCtrl = {};

    let messagesWaitingForRecipients = new Map();

    pusherCtrl.handleKafkaMessage = (kafkaMessage) => {

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

    pusherCtrl.handleNewRecipient = (eventArgs) => {
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

    socketCtrl.on('recipient-arrived', pusherCtrl.handleNewRecipient);

    return pusherCtrl;

};