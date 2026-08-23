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

// Rooms
const rooms = {};


// =========================
// HOME
// =========================

app.get("/", (req, res) => {
    res.send("I DON'T THINK SO server is online!");
});


// =========================
// CREATE ROOM CODE
// =========================

function generateRoomCode() {

    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 4; i++) {

        code += characters[
            Math.floor(Math.random() * characters.length)
        ];

    }

    return code;
}


// =========================
// FIND UNIQUE ROOM
// =========================

function createRoomCode() {

    let code;

    do {

        code = generateRoomCode();

    } while (rooms[code]);

    return code;
}


// =========================
// SOCKET CONNECTION
// =========================

io.on("connection", (socket) => {

    console.log("Player connected:", socket.id);


    // =========================
    // CREATE ROOM
    // =========================

    socket.on("createRoom", (playerName) => {

        const roomCode = createRoomCode();

        rooms[roomCode] = {

            host: socket.id,

            players: [
                {
                    id: socket.id,
                    name: playerName || "Player 1"
                }
            ]

        };


        socket.join(roomCode);

        socket.roomCode = roomCode;


        socket.emit("roomCreated", {

            roomCode: roomCode,

            players: rooms[roomCode].players

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
            String(data.roomCode || "").toUpperCase();

        const playerName =
            data.playerName || "Player";


        const room =
            rooms[roomCode];


        // Room doesn't exist

        if (!room) {

            socket.emit(
                "joinError",
                "Room not found!"
            );

            return;

        }


        // Maximum 8 players

        if (room.players.length >= 8) {

            socket.emit(
                "joinError",
                "Room is full!"
            );

            return;

        }


        // Add player

        room.players.push({

            id: socket.id,

            name: playerName

        });


        socket.join(roomCode);

        socket.roomCode = roomCode;


        // Send success to new player

        socket.emit("roomJoined", {

            roomCode: roomCode,

            players: room.players

        });


        // Update everyone in room

        io.to(roomCode).emit(
            "playersUpdated",
            room.players
        );


        console.log(
            playerName,
            "joined",
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


        // Delete empty room

        if (room.players.length === 0) {

            delete rooms[roomCode];

            console.log(
                "Room deleted:",
                roomCode
            );

            return;

        }


        // If host left,
        // make first remaining player host

        if (room.host === socket.id) {

            room.host =
                room.players[0].id;

        }


        io.to(roomCode).emit(
            "playersUpdated",
            room.players
        );

    });

});


// =========================
// START SERVER
// =========================

server.listen(PORT, () => {

    console.log(
        `Server running on port ${PORT}`
    );

});
