
const Reservation = require("../models/Reservation");

// Create a reservation
const createReservation = async (req, res) => {
  try {
    const {
      restaurantName,
      numberOfGuests,
      reservationDate,
      reservationSlot,
      tableNumber,
      preOrderItems,
      occasion,
      specialRequest,
      specialRequests,
      dietaryPreferences,
      dietaryPrefs
    } = req.body;

    // Validate required reservation fields
    if (
      !restaurantName ||
      !numberOfGuests ||
      !reservationDate ||
      !reservationSlot ||
      !tableNumber
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Restaurant, guests, date, time slot, and table are required."
      });
    }

    const guests = Number(numberOfGuests);

    if (!Number.isInteger(guests) || guests < 1) {
      return res.status(400).json({
        success: false,
        message: "Number of guests must be a positive whole number."
      });
    }

    // Normalize the new optional fields
    const normalizedOccasion =
      typeof occasion === "string" ? occasion.trim() : "";

    const normalizedSpecialRequest = String(
      specialRequest ?? specialRequests ?? ""
    ).trim();

    const normalizedDietaryPreferences = String(
      dietaryPreferences ?? dietaryPrefs ?? "None"
    ).trim();

    if (normalizedSpecialRequest.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Special requests cannot exceed 500 characters."
      });
    }

    // Prevent duplicate confirmed reservations for the same table,
    // restaurant, date, and time slot.
    const normalizedRestaurantName = restaurantName.trim();
    const normalizedDate = reservationDate.trim();
    const normalizedSlot = reservationSlot.trim();
    const normalizedTable = String(tableNumber).trim();

    const existingReservation = await Reservation.findOne({
      restaurantName: normalizedRestaurantName,
      reservationDate: normalizedDate,
      reservationSlot: normalizedSlot,
      tableNumber: normalizedTable,
      status: "confirmed"
    });

    if (existingReservation) {
      return res.status(409).json({
        success: false,
        message: "This table is already reserved for that time slot."
      });
    }

    // Validate pre-order items
    const items = Array.isArray(preOrderItems)
      ? preOrderItems.map((item) => ({
          name: String(item.name || "").trim(),
          quantity: Number(item.quantity),
          price: Number(item.price ?? 0)
        }))
      : [];

    if (
      items.some(
        (item) =>
          !item.name ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          !Number.isFinite(item.price) ||
          item.price < 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "One or more pre-order items are invalid."
      });
    }

    // Calculate the pre-order total on the server
    const preOrderTotal = items.reduce(
      (total, item) => total + item.quantity * item.price,
      0
    );

    // Save the reservation and its additional details
    const reservation = await Reservation.create({
      customer: req.user.userId,
      restaurantName: normalizedRestaurantName,
      numberOfGuests: guests,
      reservationDate: normalizedDate,
      reservationSlot: normalizedSlot,
      tableNumber: normalizedTable,
      occasion: normalizedOccasion,
      specialRequest: normalizedSpecialRequest,
      dietaryPreferences: normalizedDietaryPreferences,
      preOrderItems: items,
      preOrderTotal
    });

    return res.status(201).json({
      success: true,
      message: "Reservation created successfully.",
      reservation
    });
  } catch (error) {
    console.error("Create reservation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not create reservation."
    });
  }
};

// Get reservations belonging to the logged-in customer
const getMyReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find({
      customer: req.user.userId
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      reservations
    });
  } catch (error) {
    console.error("Get reservations error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve reservations."
    });
  }
};

// Cancel a reservation belonging to the logged-in customer
const cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      customer: req.user.userId
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found."
      });
    }

    if (reservation.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "This reservation is already cancelled."
      });
    }

    reservation.status = "cancelled";
    await reservation.save();

    return res.status(200).json({
      success: true,
      message: "Reservation cancelled successfully.",
      reservation
    });
  } catch (error) {
    console.error("Cancel reservation error:", error.message);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid reservation ID."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Could not cancel reservation."
    });
  }
};

module.exports = {
  createReservation,
  getMyReservations,
  cancelReservation
};
