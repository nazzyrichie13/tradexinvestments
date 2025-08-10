require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require("body-parser");
const cors = require('cors');
const path = require('path');
const http = require("http");
const { Server } = require("socket.io");
const rateLimit = require('express-rate-limit');

const Contact = require('./models/contact'); 
const transporter = require('./utils/mailer');

// ====== Import Routes ======
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.use('/api', require('./routes/upload'));

app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// ====== Middleware ======
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(bodyParser.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// ====== Contact Form ======
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const newContact = new Contact({ name, email, message });
    await newContact.save();

    const mailOptions = {
      from: `"Contact Form" <your.email@gmail.com>`,
      to: 'support@tradexinvest.com',
      subject: `New Contact Message from ${name}`,
      html: `
        <h3>New message from contact form</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(201).json({ message: 'Message saved but email notification failed.' });
      } else {
        console.log('Email sent: ' + info.response);
        res.status(201).json({ message: 'Message received and email sent!' });
      }
    });
  } catch (error) {
    console.error('Error saving contact message:', error);
    res.status(500).json({ message: 'Server error. Try again later.' });
  }
});

// ====== Connect to MongoDB ======
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// ====== Routes ======
// ====== ROUTES ======
app.get('/', (req, res) => {
  res.send('TradexInvest backend running...');
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/upload'));
app.use("/api/contact", require("./routes/contact"));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// ====== Serve Frontend ======
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for SPA routes — FIXED VERSION
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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

// ====== Start Server ======
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
