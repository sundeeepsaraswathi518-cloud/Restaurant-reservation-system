
const OwnerApplication = require("../models/OwnerApplication");
const User = require("../models/User");
const Restaurant = require("../models/Restaurant");

// Submit a restaurant-owner application.
// The applicant must already have a customer account.
const submitOwnerApplication = async (req, res) => {
  try {
    const {
      restaurantName,
      address,
      phone,
      cuisineType,
      description
    } = req.body;

    if (
      typeof restaurantName !== "string" ||
      !restaurantName.trim() ||
      typeof address !== "string" ||
      !address.trim() ||
      typeof phone !== "string" ||
      !phone.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Restaurant name, address, and phone are required."
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Your account is unavailable."
      });
    }

    if (user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only customer accounts can submit an owner application."
      });
    }

    const existingPending = await OwnerApplication.findOne({
      applicant: user._id,
      status: "pending"
    });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: "You already have a pending owner application."
      });
    }

    const application = await OwnerApplication.create({
      applicant: user._id,
      restaurantName: restaurantName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      cuisineType:
        typeof cuisineType === "string" ? cuisineType.trim() : "",
      description:
        typeof description === "string" ? description.trim() : "",
      status: "pending"
    });

    return res.status(201).json({
      success: true,
      message: "Owner application submitted for admin review.",
      application
    });
  } catch (error) {
    console.error("Submit owner application error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not submit owner application."
    });
  }
};

// View the logged-in user's own applications
const getMyOwnerApplications = async (req, res) => {
  try {
    const applications = await OwnerApplication.find({
      applicant: req.user.userId
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      applications
    });
  } catch (error) {
    console.error("Get owner applications error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve owner applications."
    });
  }
};

// Admin-only: view applications awaiting review
const getPendingOwnerApplications = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access is required."
      });
    }

    const applications = await OwnerApplication.find({
      status: "pending"
    })
      .populate("applicant", "name email")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      applications
    });
  } catch (error) {
    console.error("Get pending applications error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve pending applications."
    });
  }
};

// Admin-only: approve or reject an application
const reviewOwnerApplication = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access is required."
      });
    }

    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved or rejected."
      });
    }

    const application = await OwnerApplication.findById(
      req.params.id
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Owner application not found."
      });
    }

    if (application.status !== "pending") {
      return res.status(409).json({
        success: false,
        message: "This application has already been reviewed."
      });
    }

    if (status === "approved") {
      const applicant = await User.findById(application.applicant);

      if (!applicant || !applicant.isActive) {
        return res.status(400).json({
          success: false,
          message: "The applicant account is unavailable."
        });
      }

      if (applicant.role !== "customer") {
        return res.status(409).json({
          success: false,
          message: "The applicant is no longer a customer account."
        });
      }

      const existingRestaurant = await Restaurant.findOne({
        owner: applicant._id,
        name: application.restaurantName
      });

      if (existingRestaurant) {
        return res.status(409).json({
          success: false,
          message: "This owner already has a restaurant with that name."
        });
      }

      const restaurant = await Restaurant.create({
        name: application.restaurantName,
        address: application.address,
        phone: application.phone,
        cuisineType: application.cuisineType,
        description: application.description,
        owner: applicant._id,
        approvalStatus: "approved",
        isActive: true
      });

      applicant.role = "owner";
      await applicant.save();

      application.status = "approved";
      application.reviewedBy = req.user.userId;
      application.reviewedAt = new Date();
      await application.save();

      return res.status(200).json({
        success: true,
        message: "Application approved and restaurant created.",
        application,
        restaurant
      });
    }

    application.status = "rejected";
    application.reviewedBy = req.user.userId;
    application.reviewedAt = new Date();
    await application.save();

    return res.status(200).json({
      success: true,
      message: "Owner application rejected.",
      application
    });
  } catch (error) {
    console.error("Review owner application error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not review owner application."
    });
  }
};

module.exports = {
  submitOwnerApplication,
  getMyOwnerApplications,
  getPendingOwnerApplications,
  reviewOwnerApplication
};
