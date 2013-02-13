var messages = {};

messages['channel'] = function message$channel(socket, data, callback) {
    // leave the old channel
    var helpers = this.get('helpers'),
        log = helpers['log'],
        logClients = helpers['logClients'],
        send = helpers['send'],
        clients = this.get('clients'),
        client = clients[socket.id],
        newChannel = data,
        oldChannel = client.channel,
        channels = this.get('channels'),
        drawings = this.get('drawings'),
        morphs = this.get('morphs'),
        changes = this.get('changes'),
        join = false,
        leave = false;

    if (oldChannel && oldChannel !== newChannel) {
        var idx = channels.get(oldChannel).indexOf(socket.id);
        if (idx !== -1) {
            channels.get(oldChannel).splice(idx, 1);
        }
        socket.leave(oldChannel);
        log(oldChannel + ': client ' + socket.id + ' disconnected', 2);
        log(oldChannel + ': currently connected clients:\n' + channels.get(oldChannel));
        data = {};
        data.broadcast = true;
        data.message = {};
        data.message.nick = client.nick;
        data.message.id = socket.id;
        data.message.color = clients.get(socket.id).color;
        send(socket, oldChannel, 'clientDisconnect', data);
        leave = true;
    }
    // join the new channel
    clients.get(socket.id).channel = newChannel;
    var color = (function message$() {
        var otherClientsInChannel = channels.get(newChannel),
            otherClientId,
            otherClient,
            color = {
                isNearTo: function message$(HSBcolor, optThreshold) {
                    // returns true or false depending whether on of its
                    // components differs at minimum by the threshold or
                    // not
                    var threshold = optThreshold || 25;
                    if (Math.abs(this.h - HSBcolor.h) > threshold
                        || Math.abs(this.s - HSBcolor.s) > threshold
                        || Math.abs(this.b - HSBcolor.b) > threshold) {
                        return false;
                    }
                    return true;
                }
            },
            i,
            recalculateColor;
        do {
            recalculateColor = false;
            color.h = Math.round(Math.random() * 360);
            color.s = (Math.random() * 0.5) + 0.5;
            color.b = (Math.random() * 0.5) + 0.5;
            for (i = 0; i < channels.get(newChannel).length; i++) {
                otherClientId = otherClientsInChannel[i];
                otherClient = clients.get(otherClientId);
                recalculateColor = color.isNearTo(otherClient.color);
            }
        } while (recalculateColor);
        return color;
    })();
    client.color = color;
    channels[newChannel].push(socket.id);
    socket.join(newChannel);
    log(newChannel + ': client ' + socket.id + ' connected', 2);
    logClients(newChannel);
    send(socket, newChannel, 'clientConnect', {
        message: {
            nick: client.nick,
            color: color
        },
        broadcast: true
    });
    join = true;
    // call callback to complete
    callback(join, newChannel, leave, oldChannel,
                drawings.get(newChannel), morphs.get(newChannel),
                changes.get(newChannel));
};

messages['disconnect'] = function message$disconnect(socket) {
    var clients = this.get('clients'),
        channels = this.get('channels'),
        channel = clients[socket.id].channel,
        helpers = this.get('helpers'),
        log = helpers['log'],
        logClients = helpers['logClients'],
        send = helpers['send'],
        nick = clients.get(socket.id).nick,
        idx = channels.get(channel).indexOf(socket.id),
        data = {};
    if (idx !== -1) {
        channels.get(channel).splice(idx, 1);
    }
    delete clients[socket.id];
    socket.leave(channel);
    data.broadcast = true;
    data.message = {};
    data.message.nick = nick;
    data.message.id = socket.id;
    data.message.color = clients.get(socket.id).color;
    send(socket, channel, 'clientDisconnect', data);
    log(channel + ': client ' + socket.id + ' disconnected', 2);
    logClients(channel);
};

messages['nick'] = function message$nick(socket, data) {
    var clients = this.get('clients'),
        helpers = this.get('helpers'),
        log = helpers['log'],
        send = helpers['send'],
        newNick = data.message,
        oldNick = clients.get(socket.id).nick;
    if (newNick !== oldNick) {
        log('got new name ' + data.message + ' for socket ' + socket.id, 2);
        clients.get(socket.id).nick = newNick;
        data.message = {
            id: socket.id,
            old: oldNick,
            new: newNick,
            color: clients.get(socket.id).color
        };
        send(socket, clients.get(socket.id).channel, 'nick', data);
    } else {
        log('got same name ' + data.message + ' for socket ' + socket.id, 2);
    }
};

messages['ping'] = function message$ping(socket, data) {
    var clients = this.get('clients'),
        helpers = this.get('helpers'),
        send = helpers['send'];
    send(socket, clients.get(socket.id).channel, 'pong', data);
};

messages['chat'] = function message$chat(socket, data) {
    var helpers = this.get('helpers'),
        send = helpers['send'],
        clients = this.get('clients'),
        client = clients[socket.id],
        channel = client.channel,
        chat = this.get('chat'),
        chatMessage = {};
    chatMessage.message = {
        time: new Date().getTime(),
        nick: client.nick,
        text: data.message
    };
    chat[channel].push(chatMessage);
    chatMessage.message.color = client.color;
    chatMessage.broadcast = data.broadcast;
    chatMessage.me = data.me;
    send(socket, channel, 'chat', chatMessage);
};

messages['names'] = function message$names(socket, data) {
    var helpers = this.get('helpers'),
        log = helpers['log'],
        send = helpers['send'],
        clients = this.get('clients'),
        client = clients[socket.id],
        channels = this.get('channels'),
        channel = channels[client.channel];
    log('names', 3);
    send(socket, channel, 'names', {
        message: channel.map(function message$(id) {
            var client = clients[id];
            return {nick: client.nick, color: client.color};
        }),
        me: true,
        broadcast: false
    });
};

messages['draw'] = function message$draw(socket, data) {
    var helpers = this.get('helpers'),
        log = helpers['log'],
        send = helpers['send'],
        clients = this.get('clients'),
        client = clients[socket.id],
        drawings = this.get('drawings'),
        channel = client.channel;
    log('draw: ' + data.message.identifier + 'socket: ' + socket.id, 2);
    drawings.get(channel).push(data.message);
    send(socket, channel, 'draw', data);
};

messages['morph'] = function message$morph(socket, data) {
    var helpers = this.get('helpers'),
        send = helpers['send'],
        clients = this.get('clients'),
        client = clients[socket.id],
        channel = client.channel;
    data.message.id = socket.id;
    send(socket, channel, 'morph', data);
};

messages['clear'] = function message$clear(socket, data) {
    var helpers = this.get('helpers'),
        log = helpers['log'],
        send = helpers['send'],
        clients = this.get('clients'),
        client = clients[socket.id],
        channel = client.channel,
        drawings = this.get('drawings'),
        morphs = this.get('morphs'),
        changes = this.get('changes');
    log('clear', 2);
    send(socket, channel, 'clear', data);
    drawings.set(channel, drawings.get(channel).filter(function message$(ea) {
        return false;
    }));
    morphs.set(channel, morphs.get(channel).filter(function message$(ea) {
        return false;
    }));
    changes.set(channel, changes.get(channel).filter(function message$(ea) {
        return false;
    }));
};

messages['delete'] = function message$delete(socket, data) {
    var helpers = this.get('helpers'),
        log = helpers['log'],
        send = helpers['send'],
        clients = this.get('clients'),
        client = clients[socket.id],
        channel = client.channel,
        drawings = this.get('drawings');
    log('delete: ' + data.message + 'socket: ' + socket.id, 2);
    drawings.set(channel, drawings.get(channel).filter(function message$(ea) {
        return ea.identifier !== data.message;
    }));
    send(socket, channel, 'delete', data);
};

messages['change'] = function message$change(socket, data) {
    var helpers = this.get('helpers'),
        send = helpers['send'],
        clients = this.get('clients'),
        client = clients[socket.id],
        channel = client.channel,
        changes = this.get('changes');
    changes.get(channel).push(data.message);
    send(socket, clients.get(socket.id).channel, 'change', data);
};

messages['mouse'] = function message$mouse(socket, data) {
    var helpers = this.get('helpers'),
        send = helpers['send'],
        clients = this.get('clients'),
        client = clients[socket.id],
        channel = client.channel,
        morphs = this.get('morphs'),
        i;
    data.message.id = socket.id;
    data.message.nick = client.nick;
    data.message.color = client.color;
    if (data.message.morphs) {
        for (i = 0; i < data.message.morphs.length; i++) {
            if (data.message.morphs[i].morph) {
                data.message.morphs[i].position = {
                    x: data.message.x + data.message.morphs[i].offset.x,
                    y: data.message.y + data.message.morphs[i].offset.y
                };
                morphs.get(channel).push(data.message.morphs[i]);
            }
        }
    }
    else if (data.message.isNewMorphPosition) {
        morphs.get(channel).forEach(function message$(ea) {
            if (ea.morph
                && data.message.ids.indexOf(ea.identifier) >= 0
            ) {
                ea.position =  {
                    x: data.message.x + data.message.offset.x,
                    y: data.message.y + data.message.offset.y
                };
            }
        });
    }
    else if (data.message.remove) {
        var channelMorphs = morphs[channel],
            morph,
            id;
        for (i = 0; i < channelMorphs.length; i++) {
            morph = channelMorphs[i],
            id = morph.identifier;
            if (data.message.remove.indexOf(id) >= 0) {
                console.log(morph);
                channelMorphs.splice(i, 1);
            }
        }
    }
    send(socket, clients.get(socket.id).channel, 'mouse', data);
};

module.exports = messages;
