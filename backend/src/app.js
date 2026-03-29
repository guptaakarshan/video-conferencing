import express from "express";
import { createServer } from "node:http";
import "dotenv/config";

import { Server } from "socket.io";

import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketManager.js";

import cors from "cors";
import userRoutes from "./routes/users.routes.js";

const app = express();
const server = createServer(app);
const io = connectToSocket(server);
const port = process.env.PORT || 8000;
const mongoUri = process.env.MONGO_URI;

app.set("port", port);

// Restrict CORS in production if CLIENT_URL is provided.
app.use(
  cors({
    origin: process.env.CLIENT_URL || true,
    credentials: true,
  })
);
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use("/api/v1/users", userRoutes);
app.get("/home", (req, res) => {
  return res.json({ hello: "world" });
});

const start = async () => {
  if (!mongoUri) {
    throw new Error("MONGO_URI is not set in environment variables");
  }

  app.set("mongo_user");
  const connectionDb = await mongoose.connect(mongoUri);

  console.log(`MONGO Connected DB Host: ${connectionDb.connection.host}`);
  server.listen(app.get("port"), () => {
    console.log("listening on port 8000");
  });
};
start();
