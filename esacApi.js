const axios = require('axios');
const BASE_URL = "https://api.esac.gg/api/console";
const token = 'xxxxxxxxxxxxxxxxxxxxxxxx'; //TODO:

let EsacApi = {
    startMatch: (eventId, players) => {
        return axios.default.post(BASE_URL + "/matchmaking/match", {
            "token":   token,
            "eventId": eventId,
            "players": players
        });
    },
    getAvailableServers: () => {
        return axios.default.get(BASE_URL + `/servers/available?token=${token}`);
    },
    validateEvent: ({eventId, userId}) => {
        return axios.default.post(BASE_URL + `/matchmaking/validate`, {
            "token": token,
            "eventId": eventId,
            "userId": userId
        });
    }
};

module.exports = EsacApi;