
const express = require("express");
const router = express.Router();

const {
  createReservation,
  getMyReservations,
  cancelReservation
} = require("../controllers/reservationController");

// JWT authentication middleware
const authMiddleware = require("../middleware/authMiddleware");

// All reservation endpoints require login
router.post("/", authMiddleware, createReservation);
router.get("/my", authMiddleware, getMyReservations);
router.patch("/:id/cancel", authMiddleware, cancelReservation);

module.exports = router;
