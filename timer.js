const Queue = require("./queue");

let Timer = {
    exec: null,
    timeSpentInSeconds: 0,
    rateInSeconds: 10,
    run() {
        this.exec = setInterval(() => {
            this.timeSpentInSeconds += 10;

            Queue.getQueues().forEach((queue, index) => {
                if (!queue.players) {
                    return;
                }

                if (queue.players.length >= 20) {
                    Queue.getQueues()[index].timerLimit = 30;
                } else {
                    Queue.getQueues()[index].timerLimit = 60;
                }

                if (this.timeSpentInSeconds % queue.timerLimit === 0) {
                    console.log("Starting match");
                    Queue.startMatch(queue.eventId);
                }
            });

            console.log({
                timeSpentInSeconds: this.timeSpentInSeconds
            });
            Queue.logQueues();

            if (this.timeSpentInSeconds === 60) {
                this.timeSpentInSeconds = 0;
            }
        }, this.rateInSeconds * 1000);
    }
};

module.exports = Timer;