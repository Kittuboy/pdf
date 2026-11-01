const mongoose = require("mongoose");

const checkPdfAccess = (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).send("Invalid PDF ID");
  }

  const unlockedPdfs = req.session.unlockedPdfs || [];

  if (!unlockedPdfs.includes(id)) {
    return res.redirect(`/pdf/${id}`);
  }

  next();
};

module.exports = checkPdfAccess;