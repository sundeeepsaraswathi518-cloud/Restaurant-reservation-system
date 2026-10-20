
const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      trim: true,
      default: ""
    },

    cuisineType: {
      type: String,
      trim: true,
      default: ""
    },

    address: {
      type: String,
      trim: true,
      default: ""
    },

    phone: {
      type: String,
      trim: true,
      default: ""
    },

    // The user who owns this restaurant
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    // Staff members assigned to this restaurant
    staff: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    // New restaurants require admin approval
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
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

// Helps avoid duplicate restaurant names for the same owner.
restaurantSchema.index(
  { owner: 1, name: 1 },
  { unique: true }
);

module.exports = mongoose.model("Restaurant", restaurantSchema);
