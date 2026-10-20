
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  submitOwnerApplication,
  getMyOwnerApplications,
  getPendingOwnerApplications,
  reviewOwnerApplication
} = require("../controllers/ownerApplicationController");

// A logged-in customer submits an owner application
router.post("/", authMiddleware, submitOwnerApplication);

// A logged-in user views their own applications
router.get("/my", authMiddleware, getMyOwnerApplications);

// Admin-only checks are also enforced inside the controller
router.get("/pending", authMiddleware, getPendingOwnerApplications);
router.patch("/:id/review", authMiddleware, reviewOwnerApplication);

module.exports = router;
