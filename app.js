//Imports
const queue     = require("./queue");
const timer     = require("./timer");
const WebSocket = require('ws');
const api       = require('./esacApi');
const fs        = require('fs');
const https     = require('https');
const http      = require('http');
 
//Init
const wss = new WebSocket.Server({port: 8079});

//Secure
let privateKey  = fs.readFileSync('./key.pem', 'utf8');
let certificate = fs.readFileSync('./cert.pem', 'utf8');

let credentials = {
    key: privateKey,
    cert: certificate
};

http
    .createServer(credentials)
    .listen(80);

const server = https.createServer(credentials);

//Connections
wss.on("connection", (socket, request) => {
    console.log("connection");
    ping(socket);
    socket.id = request.headers['sec-websocket-key'];
    console.log(socket.id);

    socket.on("message", data => {
        let response = JSON.parse(data);

        if (response.pong) {
            pong(socket);
            return;
        }

        switch(response.type) {
            case "joinQueue":
                api.validateEvent({eventId: response.data.eventId, userId: response.data.userId})
                    .then(apiResponse => {
                        let data = apiResponse.data;

                        if (!data.validation) {
                            socket.send(JSON.stringify({
                                'type': 'error',
                                'data': 'Could not validate.'
                            }));
                        }

                        if (data.validation === 'fail') {
                            socket.send(JSON.stringify({
                                'type': 'error',
                                'data': data.message
                            }));
                            socket.close();
                            return;
                        }

                        queue.addPlayerToQueue({
                            eventId: response.data.eventId,
                            player: {
                                id: response.data.userId,
                                elo: response.data.elo,
                                socket: socket
                            }
                        });

                        socket.send(JSON.stringify({
                            'type': 'validationPassed'
                        }));
                    })
                    .catch(err => {
                        console.log(err);
                        socket.send(JSON.stringify({
                            'type': 'error',
                            'data': 'Could not validate.'
                        }));
                    });

                break;
        }
    });

    socket.on("close", data => {
        console.log(socket.id);
        console.log("closed");
        queue.removePlayerFromQueue(socket.id);
    });

    socket.on("error", data => {
        console.log(socket.id);
        console.log("closed");
        queue.removePlayerFromQueue(socket.id);
    });
});

function ping(ws) {
    try {
        ws.send(JSON.stringify({
            'ping': 'ping'
        }));
    } catch (err) {
        ws.close();
    }
}

function pong(ws) {
    //TODO: if no response disconnect
    setTimeout(() => {
        ping(ws);
    }, 3000);
}

//Exec
timer.run();

server.on('upgrade', function upgrade(request, socket, head) {
    wss.handleUpgrade(request, socket, head, function done(ws) {
        wss.emit('connection', ws, request);
    });
});
server.listen(443);

console.log("Server running.");