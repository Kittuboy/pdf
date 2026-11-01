const express = require("express");
const router = express.Router();

const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const isAdmin = require("../middleware/authMiddleware");
const checkPdfAccess = require("../middleware/pdfAccessMiddleware");

const {
  uploadPdf,
  getAdminPdfs,
  searchPdfs,
  verifyPdfPassword,
  getPdfDetails,
  servePdfFile,
  adminViewPdf,
  updatePdfPassword,
  deletePdf
} = require("../controllers/pdfController");

// Upload folder
const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName = crypto.randomUUID();

    cb(
      null,
      uniqueName + path.extname(file.originalname).toLowerCase()
    );
  },
});

// PDF filter
const fileFilter = (req, file, cb) => {
  const isPdf =
    file.mimetype === "application/pdf" &&
    path.extname(file.originalname).toLowerCase() === ".pdf";

  if (isPdf) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

router.post("/upload", isAdmin, upload.single("pdf"), uploadPdf);

router.get("/admin", isAdmin, getAdminPdfs);

router.get("/search", searchPdfs);

router.post("/:id/verify-password", verifyPdfPassword);

router.get("/:id/details", checkPdfAccess, getPdfDetails);

router.get("/:id/file", checkPdfAccess, servePdfFile);

router.get("/:id/public-details", async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id)
      .select("title description");

    if (!pdf) {
      return res.status(404).json({
        success: false,
        message: "PDF not found",
      });
    }

    res.json({
      success: true,
      pdf,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to load PDF details",
    });
  }
});

router.get("/:id/admin-view", isAdmin, adminViewPdf);
router.patch("/:id/password", isAdmin, updatePdfPassword);
router.delete("/:id", isAdmin, deletePdf);

// Existing password-protected public viewer routes
router.get("/:id/details", checkPdfAccess, getPdfDetails);
router.get("/:id/file", checkPdfAccess, servePdfFile);


module.exports = router;