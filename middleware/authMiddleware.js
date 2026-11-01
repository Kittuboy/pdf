const Admin = require("../models/Admin");

const isAdmin = async (req, res, next) => {
  try {
    if (!req.session || !req.session.adminId) {
      return res.status(401).json({
        success: false,
        message: "Please login as admin",
      });
    }

    const admin = await Admin.findById(req.session.adminId);

    if (!admin) {
      req.session.destroy(() => {});
      return res.status(401).json({
        success: false,
        message: "Admin account not found",
      });
    }

    req.admin = admin;

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

module.exports = isAdmin;