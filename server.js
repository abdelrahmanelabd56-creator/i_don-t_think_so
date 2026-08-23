// ==========================================
// I DON'T THINK SO
// SERVER.JS
// ONLINE MULTIPLAYER SERVER
// ==========================================

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});


// ==========================================
// SERVER SETTINGS
// ==========================================

const PORT = process.env.PORT || 3000;

const MAX_PLAYERS = 8;

const MIN_PLAYERS = 3;


// ==========================================
// ROOMS
// ==========================================

const rooms = {};


// ==========================================
// QUESTIONS
// ==========================================

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


// ==========================================
// GENERATE ROOM CODE
// ==========================================

function generateRoomCode() {

    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    let code = "";

    for (let i = 0; i < 4; i++) {

        code += characters[
            Math.floor(
                Math.random() *
                characters.length
            )
        ];

    }

    return code;

}


// ==========================================
// CREATE UNIQUE ROOM CODE
// ==========================================

function createUniqueRoomCode() {

    let code;

    do {

        code =
            generateRoomCode();

    } while (rooms[code]);


    return code;

}


// ==========================================
// RANDOM QUESTION
// ==========================================

function getRandomQuestion() {

    return questions[
        Math.floor(
            Math.random() *
            questions.length
        )
    ];

}


// ==========================================
// ROOM PLAYER LIST
// ==========================================

function getPublicPlayers(room) {

    return room.players.map(
        player => ({

            id: player.id,

            name: player.name,

            score: player.score,

            isHost: player.id === room.hostId

        })
    );

}


// ==========================================
// SEND ROOM UPDATE
// ==========================================

function sendRoomUpdate(roomCode) {

    const room =
        rooms[roomCode];

    if (!room) return;


    io.to(roomCode).emit(
        "roomUpdate",
        {

            roomCode: roomCode,

            players:
                getPublicPlayers(room),

            hostId:
                room.hostId,

            totalRounds:
                room.totalRounds,

            gameStarted:
                room.gameStarted

        }
    );

}


// ==========================================
// SOCKET CONNECTION
// ==========================================

io.on(
    "connection",
    socket => {

        console.log(
            "Player connected:",
            socket.id
        );


        // ==================================
        // CREATE ROOM
        // ==================================

        socket.on(
            "createRoom",
            playerName => {

                playerName =
                    String(
                        playerName ||
                        "Player"
                    )
                    .trim()
                    .slice(0, 20);


                if (!playerName) {

                    playerName =
                        "Player";

                }


                const roomCode =
                    createUniqueRoomCode();


                rooms[roomCode] = {

                    hostId:
                        socket.id,

                    players: [],

                    totalRounds: 1,

                    currentRound: 0,

                    gameStarted: false,

                    question: "",

                    answers: {},

                    receivedAnswers: {},

                    votes: {},

                    phase:
                        "lobby"

                };


                rooms[roomCode]
                    .players
                    .push({

                        id:
                            socket.id,

                        name:
                            playerName,

                        score: 0

                    });


                socket.join(
                    roomCode
                );


                socket.roomCode =
                    roomCode;


                socket.emit(
                    "roomCreated",
                    {

                        roomCode:
                            roomCode,

                        players:
                            getPublicPlayers(
                                rooms[roomCode]
                            ),

                        hostId:
                            socket.id,

                        totalRounds:
                            1

                    }
                );


                console.log(
                    "Room created:",
                    roomCode
                );

            }
        );


        // ==================================
        // JOIN ROOM
        // ==================================

        socket.on(
            "joinRoom",
            data => {

                if (!data) return;


                const roomCode =
                    String(
                        data.roomCode ||
                        ""
                    )
                    .trim()
                    .toUpperCase();


                let playerName =
                    String(
                        data.playerName ||
                        "Player"
                    )
                    .trim()
                    .slice(0, 20);


                if (!playerName) {

                    playerName =
                        "Player";

                }


                const room =
                    rooms[roomCode];


                // --------------------------
                // ROOM DOES NOT EXIST
                // --------------------------

                if (!room) {

                    socket.emit(
                        "joinError",
                        {
                            message:
                                "Room not found."
                        }
                    );

                    return;

                }


                // --------------------------
                // GAME ALREADY STARTED
                // --------------------------

                if (
                    room.gameStarted
                ) {

                    socket.emit(
                        "joinError",
                        {
                            message:
                                "Game already started."
                        }
                    );

                    return;

                }


                // --------------------------
                // ROOM FULL
                // --------------------------

                if (
                    room.players.length >=
                    MAX_PLAYERS
                ) {

                    socket.emit(
                        "joinError",
                        {
                            message:
                                "Room is full."
                        }
                    );

                    return;

                }


                // --------------------------
                // ADD PLAYER
                // --------------------------

                room.players.push({

                    id:
                        socket.id,

                    name:
                        playerName,

                    score: 0

                });


                socket.join(
                    roomCode
                );


                socket.roomCode =
                    roomCode;


                socket.emit(
                    "roomJoined",
                    {

                        roomCode:
                            roomCode,

                        players:
                            getPublicPlayers(
                                room
                            ),

                        hostId:
                            room.hostId,

                        totalRounds:
                            room.totalRounds

                    }
                );


                sendRoomUpdate(
                    roomCode
                );


                console.log(
                    playerName +
                    " joined " +
                    roomCode
                );

            }
        );


        // ==================================
        // CHANGE ROUND COUNT
        // ==================================

        socket.on(
            "setRounds",
            rounds => {

                const roomCode =
                    socket.roomCode;


                const room =
                    rooms[roomCode];


                if (!room) return;


                // Only host can change it.

                if (
                    socket.id !==
                    room.hostId
                ) {

                    return;

                }


                rounds =
                    parseInt(rounds);


                if (
                    isNaN(rounds)
                ) {

                    rounds = 1;

                }


                rounds =
                    Math.max(
                        1,
                        Math.min(
                            10,
                            rounds
                        )
                    );


                room.totalRounds =
                    rounds;


                sendRoomUpdate(
                    roomCode
                );

            }
        );


        // ==================================
        // START ONLINE GAME
        // ==================================

        socket.on(
            "startOnlineGame",
            () => {

                const roomCode =
                    socket.roomCode;


                const room =
                    rooms[roomCode];


                if (!room) return;


                // Only host can start.

                if (
                    socket.id !==
                    room.hostId
                ) {

                    socket.emit(
                        "gameError",
                        {
                            message:
                                "Only the host can start the game."
                        }
                    );

                    return;

                }


                // Minimum players.

                if (
                    room.players.length <
                    MIN_PLAYERS
                ) {

                    socket.emit(
                        "gameError",
                        {
                            message:
                                "You need at least 3 players."
                        }
                    );

                    return;

                }


                room.gameStarted =
                    true;


                room.currentRound =
                    1;


                room.phase =
                    "answer";


                startOnlineRound(
                    roomCode
                );

            }
        );


        // ==================================
        // START ROUND
        // ==================================

        function startOnlineRound(
            roomCode
        ) {

            const room =
                rooms[roomCode];


            if (!room) return;


            room.question =
                getRandomQuestion();


            room.answers = {};

            room.receivedAnswers = {};

            room.votes = {};

            room.phase =
                "answer";


            room.players.forEach(
                player => {

                    player.ready =
                        false;

                }
            );


            io.to(roomCode).emit(
                "onlineRoundStarted",
                {

                    round:
                        room.currentRound,

                    totalRounds:
                        room.totalRounds,

                    question:
                        room.question,

                    phase:
                        "answer"

                }
            );

        }


        // ==================================
        // SUBMIT ANSWER
        // ==================================

        socket.on(
            "submitAnswer",
            answer => {

                const roomCode =
                    socket.roomCode;


                const room =
                    rooms[roomCode];


                if (!room) return;


                if (
                    !room.gameStarted
                ) return;


                if (
                    room.phase !==
                    "answer"
                ) return;


                const player =
                    room.players.find(
                        p =>
                            p.id ===
                            socket.id
                    );


                if (!player) return;


                answer =
                    String(
                        answer || ""
                    )
                    .trim()
                    .slice(0, 100);


                if (!answer) {

                    return;

                }


                room.answers[
                    socket.id
                ] = answer;


                io.to(roomCode).emit(
                    "answerProgress",
                    {

                        submitted:
                            Object.keys(
                                room.answers
                            ).length,

                        total:
                            room.players.length

                    }
                );


                // --------------------------
                // ALL ANSWERS RECEIVED
                // --------------------------

                if (
                    Object.keys(
                        room.answers
                    ).length ===
                    room.players.length
                ) {

                    distributeOnlineAnswers(
                        roomCode
                    );

                }

            }
        );


        // ==================================
        // DISTRIBUTE ONLINE ANSWERS
        // ==================================

        function distributeOnlineAnswers(
            roomCode
        ) {

            const room =
                rooms[roomCode];


            if (!room) return;


            const playerIds =
                room.players.map(
                    player =>
                        player.id
                );


            const answerObjects =
                playerIds.map(
                    id => ({

                        ownerId:
                            id,

                        answer:
                            room.answers[id]

                    })
                );


            shuffleArray(
                answerObjects
            );


            // Make sure nobody gets
            // their own answer.

            for (
                let i = 0;
                i < playerIds.length;
                i++
            ) {

                if (
                    answerObjects[i]
                        .ownerId ===
                    playerIds[i]
                ) {

                    let swap =
                        (i + 1) %
                        playerIds.length;


                    if (
                        answerObjects[swap]
                            .ownerId ===
                        playerIds[i]
                    ) {

                        swap =
                            (i + 2) %
                            playerIds.length;

                    }


                    [
                        answerObjects[i],
                        answerObjects[swap]

                    ] = [

                        answerObjects[swap],
                        answerObjects[i]

                    ];

                }

            }


            room.receivedAnswers =
                {};


            for (
                let i = 0;
                i < playerIds.length;
                i++
            ) {

                room.receivedAnswers[
                    playerIds[i]
                ] =
                    answerObjects[i]
                        .answer;

            }


            room.phase =
                "convince";


            // Send each player only
            // THEIR received answer.

            room.players.forEach(
                player => {

                    io.to(
                        player.id
                    ).emit(
                        "receivedAnswer",
                        {

                            answer:
                                room.receivedAnswers[
                                    player.id
                                ],

                            round:
                                room.currentRound

                        }
                    );

                }
            );


            io.to(roomCode).emit(
                "convincePhase",
                {

                    round:
                        room.currentRound,

                    total:
                        room.totalRounds

                }
            );

        }


        // ==================================
        // PLAYER READY
        // ==================================

        socket.on(
            "playerReady",
            () => {

                const roomCode =
                    socket.roomCode;


                const room =
                    rooms[roomCode];


                if (!room) return;


                if (
                    room.phase !==
                    "convince"
                ) return;


                const player =
                    room.players.find(
                        p =>
                            p.id ===
                            socket.id
                    );


                if (!player) return;


                player.ready =
                    true;


                const allReady =
                    room.players.every(
                        p =>
                            p.ready === true
                    );


                if (allReady) {

                    startOnlineVoting(
                        roomCode
                    );

                }

            }
        );


        // ==================================
        // START VOTING
        // ==================================

        function startOnlineVoting(
            roomCode
        ) {

            const room =
                rooms[roomCode];


            if (!room) return;


            room.phase =
                "voting";


            room.votes =
                {};


   
