require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const bcrypt = require("bcrypt");
const path = require("path");

const connectDB = require("./config/db");
const Admin = require("./models/Admin");

const authRoutes = require("./routes/authRoutes");
const pdfRoutes = require("./routes/pdfRoutes");
const checkPdfAccess = require("./middleware/pdfAccessMiddleware");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    name: "pdf.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
    }),

    cookie: {
      httpOnly: true,
      secure: false, // Use true with HTTPS in production
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Static assets only - never expose uploads folder
app.use("/assets", express.static(path.join(__dirname, "public")));

// HTML pages
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views/index.html"));
});

app.get("/admin/login", (req, res) => {
  if (req.session.adminId) {
    return res.redirect("/admin/dashboard");
  }

  res.sendFile(path.join(__dirname, "views/login.html"));
});
app.get("/admin/dashboard", (req, res) => {
  if (!req.session.adminId) {
    return res.redirect("/admin/login");
  }

  res.sendFile(path.join(__dirname, "views/dashboard.html"));
});


app.get("/pdf/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "views/pdf-password.html"));
});

app.get("/pdf/view/:id", checkPdfAccess, (req, res) => {
  res.sendFile(path.join(__dirname, "views/viewer.html"));
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/pdfs", pdfRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "PDF Search Server is running",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.message);

  res.status(err instanceof require("multer").MulterError ? 400 : 400).json({
    success: false,
    message: err.message || "Request failed",
  });
});




// Create initial admin
const createInitialAdmin = async () => {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Admin";

  if (!email || !password || !process.env.SESSION_SECRET) {
    throw new Error("Admin credentials and SESSION_SECRET are required in .env");
  }

  if (password.length < 12) {
    throw new Error("Set an admin password of at least 12 characters");
  }

  const existingAdmin = await Admin.findOne({ email });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(password, 12);

    await Admin.create({
      name,
      email,
      password: hashedPassword,
    });

    console.log("Initial Admin Created Successfully");
  } else {
    console.log("Admin Account Already Exists");
  }
};

// Start server
const startServer = async () => {
  try {
    await connectDB();
    await createInitialAdmin();

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server Startup Error:", error.message);
    process.exit(1);
  }
};

startServer();