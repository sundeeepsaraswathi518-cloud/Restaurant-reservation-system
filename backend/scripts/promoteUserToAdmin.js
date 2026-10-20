
require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/User");

async function promoteUserToAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL;

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from your .env file.");
    }

    if (!email) {
      throw new Error("ADMIN_EMAIL is not set.");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user) {
      throw new Error(
        "Admin account not found. Register that account first."
      );
    }

    user.role = "admin";
    await user.save();

    console.log("Admin role assigned successfully.");
    console.log("Admin email:", user.email);
  } catch (error) {
    console.error("Admin setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

promoteUserToAdmin();
