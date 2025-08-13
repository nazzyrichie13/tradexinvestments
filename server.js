import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';

// Load environment variables
dotenv.config();

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Import your routes in ESM style
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';
import contactRoutes from './routes/contact.js';
import userRoutes from "./routes/user.js";
import withdrawalRoutes from "./routes/withdrawals.js";

// ...
app.use("/api/user", userRoutes);
app.use("/api/withdrawals", withdrawalRoutes);
// Routes
app.get('/', (req, res) => {
  res.send('TradexInvest backend running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', uploadRoutes);
app.use('/api/contact', contactRoutes);
app.use("/api/user", userRoutes);
app.use("/api/withdrawals", withdrawalRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ====== Chat Schema ======
const chatSchema = new mongoose.Schema({
  senderId: String,
  name: String,
  email: String,
  senderType: String,
  message: String,
  read: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});
const Chat = mongoose.model("Chat", chatSchema);

// ====== Socket.IO ======
io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("userInfo", ({ senderId, name, email }) => {
    socket.data.senderId = senderId;
    socket.data.name = name;
    socket.data.email = email;
  });

  socket.on("sendMessage", async (data) => {
    const newMsg = new Chat(data);
    await newMsg.save();
    io.emit("newMessage", newMsg);
  });

  socket.on("markAsRead", async (senderId) => {
    await Chat.updateMany({ senderId, read: false }, { read: true });
  });

  socket.on("getMessages", async (senderId) => {
    const messages = await Chat.find({ senderId }).sort({ timestamp: 1 });
    socket.emit("chatHistory", messages);
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
  });
});

// ====== Admin Users List ======
app.get("/api/users", async (req, res) => {
  try {
    const messages = await Chat.aggregate([
      {
        $group: {
          _id: "$senderId",
          name: { $first: "$name" },
          email: { $first: "$email" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$senderType", "user"] }, { $eq: ["$read", false] }] },
                1,
                0
              ]
            }
          },
        },
      },
    ]);
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ====== MongoDB connection ======
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
