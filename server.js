const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

const PORT = process.env.PORT || 3000;

const rooms = {};


// =========================
// QUESTIONS
// =========================

const questions = [

    "What is the tallest building in the world?",

    "Who has scored the most goals in football history?",

    "What is the biggest animal in the world?",

    "What is the fastest animal in the world?",

    "What is the biggest country in the world?",

    "What is the most popular sport in the world?",

    "What is the longest river in the world?",

    "What is the biggest planet in our solar system?",

    "What is the hottest place on Earth?",

    "What is the most expensive car in the world?",

    "What is the strongest animal in the world?",

    "What is the smallest country in the world?",

    "What is the biggest ocean in the world?",

    "Who is the most famous football player?",

    "What is the fastest car in the world?"

];


function getRandomQuestion() {

    return questions[
        Math.floor(
            Math.random() * questions.length
        )
    ];

}


// =========================
// HOME
// =========================

app.get("/", (req, res) => {

    res.send(
        "I DON'T THINK SO server is online!"
    );

});


// =========================
// ROOM CODE
// =========================

function generateRoomCode() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 4; i++) {

        code += characters[
            Math.floor(
                Math.random() * characters.length
            )
        ];

    }

    return code;
}


function createRoomCode() {

    let code;

    do {

        code = generateRoomCode();

    } while (rooms[code]);

    return code;

}


// =========================
// SEND ROOM PLAYERS
// =========================

function sendPlayers(roomCode) {

    const room = rooms[roomCode];

    if (!room) return;

    io.to(roomCode).emit(
        "playersUpdated",
        room.players
    );

}


// =========================
// SOCKET CONNECTION
// =========================

io.on("connection", (socket) => {

    console.log(
        "Player connected:",
        socket.id
    );


    // =========================
    // CREATE ROOM
    // =========================

    socket.on("createRoom", (playerName) => {

        const roomCode =
            createRoomCode();


        rooms[roomCode] = {

            host: socket.id,

            players: [
                {
                    id: socket.id,
                    name: playerName || "Player"
                }
            ],

            state: "lobby",

            round: 0,

            question: "",

            answers: {},

            receivedAnswers: {},

            votes: {}

        };


        socket.join(roomCode);

        socket.roomCode = roomCode;


        socket.emit("roomCreated", {

            roomCode: roomCode,

            players:
                rooms[roomCode].players

        });


        console.log(
            "Room created:",
            roomCode
        );

    });


    // =========================
    // JOIN ROOM
    // =========================

    socket.on("joinRoom", (data) => {

        const roomCode =
            String(data.roomCode || "")
                .toUpperCase();

        const playerName =
            data.playerName || "Player";


        const room =
            rooms[roomCode];


        if (!room) {

            socket.emit(
                "joinError",
                "Room not found!"
            );

            return;

        }


        if (room.state !== "lobby") {

            socket.emit(
                "joinError",
                "Game already started!"
            );

            return;

        }


        if (room.players.length >= 8) {

            socket.emit(
                "joinError",
                "Room is full!"
            );

            return;

        }


        room.players.push({

            id: socket.id,

            name: playerName

        });


        socket.join(roomCode);

        socket.roomCode = roomCode;


        socket.emit("roomJoined", {

            roomCode: roomCode,

            players: room.players

        });


        sendPlayers(roomCode);


        console.log(
            playerName,
            "joined",
            roomCode
        );

    });


    // =========================
    // START ONLINE GAME
    // =========================

    socket.on("startOnlineGame", () => {

        const roomCode =
            socket.roomCode;

        const room =
            rooms[roomCode];


        if (!room) return;


        // Only host can start

        if (room.host !== socket.id) {

            return;

        }


        if (room.players.length < 3) {

            socket.emit(
                "gameError",
                "You need at least 3 players!"
            );

            return;

        }


        room.state = "answering";

        room.round = 1;

        room.question =
            getRandomQuestion();

        room.answers = {};

        room.receivedAnswers = {};

        room.votes = {};


        io.to(roomCode).emit(
            "onlineGameStarted",
            {
                round: room.round,
                question: room.question
            }
        );


        console.log(
            "Online game started:",
            roomCode
        );

    });


    // =========================
    // DISCONNECT
    // =========================

    socket.on("disconnect", () => {

        console.log(
            "Player disconnected:",
            socket.id
        );


        const roomCode =
            socket.roomCode;

        if (!roomCode) return;


        const room =
            rooms[roomCode];

        if (!room) return;


        room.players =
            room.players.filter(
                player =>
                    player.id !== socket.id
            );


        if (room.players.length === 0) {

            delete rooms[roomCode];

            return;

        }


        if (room.host === socket.id) {

            room.host =
                room.players[0].id;

        }


        sendPlayers(roomCode);

    });

});


server.listen(PORT, () => {

    console.log(
        `Server running on port ${PORT}`
    );

});
