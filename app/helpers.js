var helpers = {};
        
helpers['log'] = function helper$log(logText, optLevel) {
    var logLevel = optLevel || 1;
    if (this.logLevel >= logLevel) {
        console.log(logText);
    }
};

helpers['send'] = function helper$send(socket, channel, messageType, data) {
    if (data.broadcast) {
        socket.broadcast.to(channel).emit(messageType, data);
    }
    if (data.me) {
        socket.emit(messageType, data);
    }
};

helpers['logClients'] = function helper$logClients(channelName) {
    var clients = this.get("clients"),
        channels = this.get("channels"),
        channel = channels[channelName];
    this.log(
        channelName + ': currently ' + channel.length
        + ' client' + (channel.length > 1 ? 's' : '')
        + ' connected:\n' + channel.map(
            function helper$(clientId) {
                return clients.get(clientId).nick;
            }).join(", ")
    );
};

module.exports = helpers;
