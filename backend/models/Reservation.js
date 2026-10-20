
const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    // Customer who created the reservation
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    // Link to a restaurant record for staff dashboard access.
    // Nullable so existing reservations continue to work.
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      default: null,
      index: true
    },

    // Keep the restaurant name for compatibility with existing bookings
    restaurantName: {
      type: String,
      required: true,
      trim: true
    },

    numberOfGuests: {
      type: Number,
      required: true,
      min: 1
    },

    reservationDate: {
      type: String,
      required: true,
      trim: true
    },

    reservationSlot: {
      type: String,
      required: true,
      trim: true
    },

    tableNumber: {
      type: String,
      required: true,
      trim: true
    },

    // Special occasion selected by the customer
    occasion: {
      type: String,
      trim: true,
      default: ""
    },

    // Additional requests from the customer
    specialRequest: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },

    // Dietary preference selected by the customer
    dietaryPreferences: {
      type: String,
      trim: true,
      default: "None"
    },

    // Food items ordered with the reservation
    preOrderItems: [
      {
        name: {
          type: String,
          required: true,
          trim: true
        },
        quantity: {
          type: Number,
          required: true,
          min: 1
        },
        price: {
          type: Number,
          min: 0,
          default: 0
        }
      }
    ],

    preOrderTotal: {
      type: Number,
      min: 0,
      default: 0
    },

    // Existing customer booking statuses
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
      index: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Reservation", reservationSchema);
