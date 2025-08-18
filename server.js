// 1️⃣ Import everything first
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import adminRoutes from "./routes/admin.js";  
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import contactRoutes from "./routes/contact.js";
import withdrawalRoutes from "./routes/withdrawals.js";
import User from "./models/User.js";


dotenv.config();

// Fix __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });



// Middleware

app.use(cors({
  origin: [
    "https://www.tradexinvest.net",   // production frontend
    "http://127.0.0.1:5500",          // local testing
    "http://localhost:5500"            // sometimes localhost works too
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get("/", (req, res) => res.send("TradexInvest backend is running"));

// API routes

app.use("/api", authRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/withdrawals", withdrawalRoutes);
app.use("/api/admin", adminRoutes);


// Start server after MongoDB connection
// Start server after MongoDB connection
const PORT = process.env.PORT || 10000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    // 🚀 Start Express server once DB is ready
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
  });
