import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
import paymentRoutes from './routes/paymentRoutes.js'

// Import routes
import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import instructorRoutes from './routes/instructorRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import contentRoutes from './routes/contentRoutes.js'
import downloadRoutes from './routes/downloadRoutes.js';
import liveClassRoutes from './routes/liveClassRoutes.js'
import progressRoutes from './routes/progressRoutes.js'

dotenv.config();
const app = express();

// Database Connection
const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
  }
};

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB Disconnected");
});

// Middleware
app.use(
  cors({
    origin: "*",
    methods: "GET,POST,PUT,DELETE,PATCH",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true })); // for form-data



// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/instructors', instructorRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/contacts', contactRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/certificates', certificateRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/content', contentRoutes);
app.use('/api/v1/downloads', downloadRoutes);
app.use('/api/v1/live-classes', liveClassRoutes);
app.use('/api/v1/progress', progressRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    const status = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({ success: false, message });
});
  

const PORT = process.env.PORT || 6600;
app.listen(PORT, () => {
  connect();
  console.log(`Server Running on Port ${PORT}`);
});