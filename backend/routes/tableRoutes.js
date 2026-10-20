
const express = require("express");
const router = express.Router();

const Table = require("../models/Table");
const Restaurant = require("../models/Restaurant");
const authMiddleware = require("../middleware/authMiddleware");

// List tables belonging to a restaurant the user can manage
router.get("/:restaurantId", authMiddleware, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(
      req.params.restaurantId
    );

    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found or inactive."
      });
    }

    const userId = req.user.userId;
    const isOwner = restaurant.owner.toString() === userId;
    const isStaff = restaurant.staff.some(
      id => id.toString() === userId
    );
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isStaff && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You cannot manage this restaurant's tables."
      });
    }

    const tables = await Table.find({
      restaurant: restaurant._id
    }).sort({ tableNumber: 1 });

    res.json({ success: true, tables });
  } catch (error) {
    console.error("List tables error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not retrieve tables."
    });
  }
});

// Create a table
router.post("/:restaurantId", authMiddleware, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(
      req.params.restaurantId
    );

    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found or inactive."
      });
    }

    const userId = req.user.userId;
    const canManage =
      restaurant.owner.toString() === userId ||
      restaurant.staff.some(id => id.toString() === userId) ||
      req.user.role === "admin";

    if (!canManage) {
      return res.status(403).json({
        success: false,
        message: "You cannot manage this restaurant's tables."
      });
    }

    const { tableNumber, capacity, area } = req.body;

    if (
      typeof tableNumber !== "string" ||
      !tableNumber.trim() ||
      !Number.isInteger(Number(capacity)) ||
      Number(capacity) < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "A table number and positive whole-number capacity are required."
      });
    }

    const table = await Table.create({
      restaurant: restaurant._id,
      tableNumber: tableNumber.trim(),
      capacity: Number(capacity),
      area: typeof area === "string" && area.trim()
        ? area.trim()
        : "Main Hall"
    });

    res.status(201).json({
      success: true,
      message: "Table created successfully.",
      table
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "That table number already exists for this restaurant."
      });
    }

    console.error("Create table error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not create table."
    });
  }
});

// Update table occupancy or record a walk-in
router.patch("/:restaurantId/:tableId", authMiddleware, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(
      req.params.restaurantId
    );

    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found or inactive."
      });
    }

    const userId = req.user.userId;
    const canManage =
      restaurant.owner.toString() === userId ||
      restaurant.staff.some(id => id.toString() === userId) ||
      req.user.role === "admin";

    if (!canManage) {
      return res.status(403).json({
        success: false,
        message: "You cannot manage this restaurant's tables."
      });
    }

    const table = await Table.findOne({
      _id: req.params.tableId,
      restaurant: restaurant._id
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Table not found."
      });
    }

    const { status, currentGuests, walkIn } = req.body;

    if (status !== undefined) {
      if (!["available", "reserved", "occupied", "cleaning"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid table status."
        });
      }
      table.status = status;
    }

    if (currentGuests !== undefined) {
      if (
        !Number.isInteger(currentGuests) ||
        currentGuests < 0 ||
        currentGuests > table.capacity
      ) {
        return res.status(400).json({
          success: false,
          message: "Guest count must be between zero and table capacity."
        });
      }
      table.currentGuests = currentGuests;
    }

    if (walkIn === true) {
      if (
        currentGuests === undefined ||
        currentGuests < 1
      ) {
        return res.status(400).json({
          success: false,
          message: "Provide the number of walk-in guests."
        });
      }
      table.walkIn = true;
      table.seatedAt = new Date();
      table.status = "occupied";
    }

    if (status === "available") {
      table.currentGuests = 0;
      table.walkIn = false;
      table.seatedAt = null;
    }

    await table.save();

    res.json({
      success: true,
      message: "Table updated successfully.",
      table
    });
  } catch (error) {
    console.error("Update table error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not update table."
    });
  }
});

module.exports = router;
