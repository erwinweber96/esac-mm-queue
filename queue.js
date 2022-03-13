const util = require('util');
const api = require('./esacApi');

let Queue = {
    queues: [],

    /**
     * @param data.eventId      Matchmaking ladder ID
     * @param data.player       Player data
     */
    addPlayerToQueue(data) {
        if (Queue.queues.length === 0) {
            Queue.queues.push({
                eventId: data.eventId,
                timerLimit: 60,
                players: []
            });
        } else {
            let queueFound = Queue.queues.filter(queue => queue.eventId === data.eventId);
            if (!queueFound.length) {
                Queue.queues.push({
                    eventId: data.eventId,
                    timerLimit: 60,
                    players: []
                });
            }
        }

        let playerFound = Queue.queues.filter(queue => {
           let playerFoundTarget = queue.players.filter(player => player.userId === data.player.id);

           if (playerFoundTarget.length) {
               return queue;
           }
        });

        if (playerFound.length) {
            data.player.socket.send(JSON.stringify({
                'type': 'error',
                'data': 'You are already in a queue.'
            }));
            return;
        }

        this.queues = Queue.queues.map(queue => {
            if (queue.eventId === data.eventId) {
                if (queue.players.length >= 1) {
                    data.player.eloDiff = Math.abs(queue.players[0].elo - data.player.elo);
                } else {
                    data.player.eloDiff = 0;
                }

                queue.players.push(data.player);
                queue.players.sort((player1, player2) => {
                    if (player1.eloDiff === player2.eloDiff) {
                        return 0;
                    }

                    if (player1.eloDiff > player2.eloDiff) {
                        return 1;
                    }

                    return -1;
                });
            }

            return queue;
        });
    },

    removePlayerFromQueue(socketId) {
        console.log(`removing: ${socketId}`);
        let eventId;
        this.queues = Queue.queues.map(queue => {
            queue.players.forEach((player, index) => {
                if (player.socket.id === socketId) {
                    eventId = queue.eventId;
                    queue.players.splice(index, 1);
                }
            });

            return queue;
        });

        this.reindex(eventId);
    },

    getQueues() {
        return Queue.queues;
    },

    logQueues() {
        console.log(Queue.getQueues());
    },

    startMatch(eventId) {
        Queue.queues = Queue.queues.map(queue => {
            if (queue.eventId === eventId && queue.players.length >= 4) {
                //Get top 2 players
                let player1 = queue.players[0];
                let player2 = queue.players[1];
                let player3 = queue.players[2];
                let player4 = queue.players[3];

                let serverCount;
                try {
                    serverCount = api.getAvailableServers();
                } catch (err) {
                    console.log(err.message);
                    return;
                }

                if (serverCount < 1) {
                    console.log("No server available");
                    return;
                }

                api.getAvailableServers().then(response => {
                    let data = response.data;
                    if (data.count < 1) {
                        console.log("No server available");
                        return;
                    }

                    api
                        .startMatch(queue.eventId, [
                            {"user_id": player1.id},
                            {"user_id": player2.id},
                            {"user_id": player3.id},
                            {"user_id": player4.id}
                        ])
                        .then(match => {
                            //Send match data to players
                            player1.socket.send(JSON.stringify({
                                type: "matchData",
                                data: match.data
                            }));
                            player2.socket.send(JSON.stringify({
                                type: "matchData",
                                data: match.data
                            }));
                            player3.socket.send(JSON.stringify({
                                type: "matchData",
                                data: match.data
                            }));
                            player4.socket.send(JSON.stringify({
                                type: "matchData",
                                data: match.data
                            }));

                            //Remove top 2 players
                            queue.players.shift();
                            queue.players.shift();
                            queue.players.shift();
                            queue.players.shift();

                            this.reindex(queue.eventId);
                        })
                        .catch(err => {
                            console.log(err.message);
                        });
                });
            }

            return queue;
        });
    },

    reindex(eventId) {
        Queue.queues = Queue.queues.map(queue => {
            if (queue.eventId !== eventId) {
                return queue;
            }

            //Set top player TODO: shuffle
            if (queue.players.length > 0) {
                queue.players[0].eloDiff = 0;
            }
            if (queue.players.length > 1) {
                //Recalculate elo diff
                for (let i = 1; i < queue.players.length; i++) {
                    queue.players[i].eloDiff = Math.abs(queue.players[i].elo - queue.players[0].elo);
                }

                //Sort by elo diff
                queue.players.sort((player1, player2) => {
                    if (player1.eloDiff === player2.eloDiff) {
                        return 0;
                    }

                    if (player1.eloDiff > player2.eloDiff) {
                        return 1;
                    }

                    return -1;
                });
            }

            return queue;
        });
    }
};

module.exports = Queue;