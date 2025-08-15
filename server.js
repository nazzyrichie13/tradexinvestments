// 1️⃣ Import everything first
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import contactRoutes from "./routes/contact.js";
import withdrawalRoutes from "./routes/withdrawals.js";

// 2️⃣ Load environment variables
dotenv.config();

// 3️⃣ Fix __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 10000;

// 4️⃣ Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 5️⃣ API routes **before catch-all**
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/withdrawals", withdrawalRoutes);

// 6️⃣ Catch-all for SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 7️⃣ MongoDB connection + server start
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
