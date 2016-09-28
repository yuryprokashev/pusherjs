/**
 * Created by py on 11/08/16.
 */

var BusService;

BusService = function (adapter) {
    var self = this;
    self.adapter = adapter;
    return {
        send: function(topic, message) {
            self.adapter.send(topic, {message: message});
        },
        subscribe: function(topic, callback) {
            self.adapter.subscribe(topic, callback);
        }
    }
};

module.exports = BusService;