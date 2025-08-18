// 1️⃣ Import everything first




// Fix __dirname



// Middleware


import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';

import authRoutes from "./routes/auth.js";       // all auth + admin routes
import contactRoutes from "./routes/contact.js"; // contact route

dotenv.config();

// Fix __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ==========================
// Middleware
// ==========================
app.use(cors({
  origin: ["http://127.0.0.1:5500", "http://localhost:5500"], // frontend origins
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ==========================
// Routes
// ==========================
app.get("/", (req, res) => res.send("TradexInvest backend is running"));

// Auth + admin + user routes all in auth.js
app.use("/api", authRoutes);

// Contact route separate
app.use("/api/contact", contactRoutes);

// ==========================
// MongoDB connection & server start
// ==========================
const PORT = process.env.PORT || 10000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
  });
