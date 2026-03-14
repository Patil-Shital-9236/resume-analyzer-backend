const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser
} = require("../controllers/authController");

const { parseResume } = require("../controllers/resumeController");

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected test route
router.get("/profile", authMiddleware, (req, res) => {
  res.json({
    message: "Protected route accessed successfully",
    userId: req.user.id
  });
});

// Resume upload + parse
router.post(
  "/upload-resume",
  authMiddleware,
  upload.single("resume"),
  parseResume
);

module.exports = router;
