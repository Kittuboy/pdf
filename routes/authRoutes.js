const express = require("express");
const router = express.Router();

const {
  loginAdmin,
  logoutAdmin,
  getAdminProfile,
} = require("../controllers/authController");

const isAdmin = require("../middleware/authMiddleware");

router.post("/login", loginAdmin);
router.post("/logout", isAdmin, logoutAdmin);
router.get("/profile", isAdmin, getAdminProfile);

module.exports = router;