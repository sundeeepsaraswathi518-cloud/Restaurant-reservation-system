
const mongoose = require("mongoose");

const restaurantTableSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true
    },

    tableNumber: {
      type: String,
      required: true,
      trim: true
    },

    capacity: {
      type: Number,
      required: true,
      min: 1
    },

    location: {
      type: String,
      enum: ["indoor", "outdoor", "window", "private", "other"],
      default: "indoor"
    },

    status: {
      type: String,
      enum: ["available", "occupied", "maintenance"],
      default: "available",
      index: true
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate table numbers within one restaurant.
restaurantTableSchema.index(
  { restaurant: 1, tableNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "RestaurantTable",
  restaurantTableSchema
);
