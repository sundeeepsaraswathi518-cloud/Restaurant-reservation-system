
const mongoose = require("mongoose");

const tableSchema = new mongoose.Schema(
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

    area: {
      type: String,
      default: "Main Hall",
      trim: true
    },

    status: {
      type: String,
      enum: [
        "available",
        "reserved",
        "occupied",
        "cleaning"
      ],
      default: "available"
    },

    isActive: {
      type: Boolean,
      default: true
    },

    currentGuests: {
      type: Number,
      default: 0,
      min: 0
    },

    walkIn: {
      type: Boolean,
      default: false
    },

    seatedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

tableSchema.index(
  { restaurant: 1, tableNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model("Table", tableSchema);
