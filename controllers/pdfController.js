const Pdf = require("../models/Pdf");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const uploadPdf = async (req, res) => {
  try {
    const { title, description, password } = req.body;

    if (!title || !password || !req.file) {
      if (req.file) fs.unlinkSync(req.file.path);

      return res.status(400).json({
        success: false,
        message: "Title, PDF file and password are required",
      });
    }

    if (password.length < 6) {
      fs.unlinkSync(req.file.path);

      return res.status(400).json({
        success: false,
        message: "PDF password must contain at least 6 characters",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const pdf = await Pdf.create({
      title,
      description: description || "",
      fileName: req.file.filename,
      filePath: req.file.path,
      password: hashedPassword,
      uploadedBy: req.admin._id,
    });

    res.status(201).json({
      success: true,
      message: "PDF uploaded successfully",
      pdf: {
        id: pdf._id,
        title: pdf.title,
        description: pdf.description,
        createdAt: pdf.createdAt,
      },
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error("PDF Upload Error:", error);

    res.status(500).json({
      success: false,
      message: "PDF upload failed",
    });
  }
};

const getAdminPdfs = async (req, res) => {
  try {
    const pdfs = await Pdf.find()
      .select("-password -filePath -extractedText")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: pdfs.length,
      pdfs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to fetch PDFs",
    });
  }
};


const searchPdfs = async (req, res) => {
  try {
    const query = (req.query.q || "").trim();

    let filter = {};

    if (query) {
      const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter = {
        $or: [
          { title: { $regex: safeQuery, $options: "i" } },
          { description: { $regex: safeQuery, $options: "i" } }
        ]
      };
    }

    const pdfs = await Pdf.find(filter)
      .select("title description createdAt")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.status(200).json({
      success: true,
      count: pdfs.length,
      pdfs
    });

  } catch (error) {
    console.error("Search PDFs Error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch PDF documents"
    });
  }
};


const verifyPdfPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "PDF password is required",
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid PDF ID",
      });
    }

    const pdf = await Pdf.findById(id).select("+password");

    if (!pdf) {
      return res.status(404).json({
        success: false,
        message: "PDF not found",
      });
    }

    const isMatch = await bcrypt.compare(password, pdf.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect PDF password",
      });
    }

    req.session.unlockedPdfs =
      req.session.unlockedPdfs || [];

    if (!req.session.unlockedPdfs.includes(id)) {
      req.session.unlockedPdfs.push(id);
    }

    res.json({
      success: true,
      message: "Password verified successfully",
      redirectUrl: `/pdf/view/${id}`,
    });

  } catch (error) {
    console.error("Password Verification Error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to verify password",
    });
  }
};


const getPdfDetails = async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id)
      .select("title description");

    if (!pdf) {
      return res.status(404).send("PDF not found");
    }

    res.json({
      success: true,
      pdf,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to get PDF",
    });
  }
};

const servePdfFile = async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id);

    if (!pdf) {
      return res.status(404).send("PDF not found");
    }

    const path = require("path");
    const fs = require("fs");

    const filePath = path.resolve(pdf.filePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send("PDF file not found");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${path.basename(pdf.fileName)}"`
    );

    res.setHeader("X-Content-Type-Options", "nosniff");

    res.sendFile(filePath);

  } catch (error) {
    console.error(error);

    res.status(500).send("Unable to open PDF");
  }
};


// Admin: View PDF without entering its password
const adminViewPdf = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).send("Invalid PDF ID");
    }

    const pdf = await Pdf.findById(id).select("filePath fileName");

    if (!pdf) {
      return res.status(404).send("PDF not found");
    }

    const filePath = path.resolve(pdf.filePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send("PDF file not found on server");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${path.basename(pdf.fileName)}"`
    );
    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.sendFile(filePath);

  } catch (error) {
    console.error("Admin PDF View Error:", error);
    return res.status(500).send("Unable to open PDF");
  }
};


// Admin: Update PDF password
const updatePdfPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid PDF ID"
      });
    }

    if (typeof password !== "string" || password.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 6 characters"
      });
    }

    const pdf = await Pdf.findById(id).select("+password");

    if (!pdf) {
      return res.status(404).json({
        success: false,
        message: "PDF not found"
      });
    }

    pdf.password = await bcrypt.hash(password, 12);
    await pdf.save();

    // Existing unlocked sessions should not retain access
    // after the password has been changed.
    if (req.session.unlockedPdfs) {
      req.session.unlockedPdfs =
        req.session.unlockedPdfs.filter(pdfId => pdfId !== id);
    }

    return res.status(200).json({
      success: true,
      message: "PDF password updated successfully"
    });

  } catch (error) {
    console.error("Update PDF Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update PDF password"
    });
  }
};


// Admin: Delete PDF and its physical file
const deletePdf = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid PDF ID"
      });
    }

    const pdf = await Pdf.findById(id);

    if (!pdf) {
      return res.status(404).json({
        success: false,
        message: "PDF not found"
      });
    }

    const filePath = path.resolve(pdf.filePath);

    // Delete database record first
    await Pdf.findByIdAndDelete(id);

    // Then remove physical file, if it still exists
    try {
      await fs.promises.unlink(filePath);
    } catch (fileError) {
      if (fileError.code !== "ENOENT") {
        console.error("PDF File Delete Error:", fileError);
      }
    }

    // Remove access from this admin session
    if (req.session.unlockedPdfs) {
      req.session.unlockedPdfs =
        req.session.unlockedPdfs.filter(pdfId => pdfId !== id);
    }

    return res.status(200).json({
      success: true,
      message: "PDF deleted successfully"
    });

  } catch (error) {
    console.error("Delete PDF Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete PDF"
    });
  }
};


module.exports = {
  uploadPdf,
  getAdminPdfs,
  searchPdfs,
  verifyPdfPassword,
  getPdfDetails,
  servePdfFile,
  adminViewPdf,
  updatePdfPassword,
  deletePdf
};