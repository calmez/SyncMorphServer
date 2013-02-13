var io = require('socket.io'),
    express = require('express'),
    http = require('http');

var setupServer = function setupServer(config) {
        var defaultConfig = require('./app/defaultConfig'),
            messages = require('./app/messages'),
            helpers = require('./app/helpers'),
            app = express(),
            server = http.createServer(app);

        config.port = config.port || defaultConfig.port;
        config.logLevel = config.logLevel || defaultConfig.logLevel;

        // save config in app
        app.set('port', config.port);
        app.set('logLevel', config.logLevel);

        // socket.io behavior
        app.set('messages', messages);

        // helper functionality of the app
        app.set('helpers', helpers);

        // storage
        app.set('clients', {});
        app.set('channels', {});
        app.set('drawings', {});
        app.set('morphs', {});
        app.set('changes', {});
        app.set('chat', {});

        // let's open our ears ...
        io = io.listen(server);
        server.listen(app.get('port'));

        // ... and our eyes to socket connections
        io.configure(function () {
            io.set('transports', ['websocket', 'xhr-polling']);
            io.set('log level', 0);
            io.set('authorization', function (handshakeData, callback) {
                // TODO implement some sort of auth (maybe send cookie...)
                callback(null, true);
            });
            io.set('close timeout', 0);
        });

        io.sockets.on('connection', function (socket) {
            var message;
            function wrapper(message) {
                var messageFunc = app.get('messages')[message];
                return function (/* arguments */) {
                    var args = [socket].concat(
                            Array.prototype.slice.call(arguments)
                        );
                    return messageFunc.apply(app, args);
                };
            }
            for (message in app.get('messages')) {
                if (server.messages.hasOwnProperty(message)) {
                    socket.on(
                        message,
                        wrapper(message)
                    );
                }
            }
        });

        return server;
    };

module.exports = setupServer;
