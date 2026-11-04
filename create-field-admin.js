"use strict";

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { models } = require("./field-service-api");

const { FieldTechnician } = models;

async function main() {
  const email = (process.env.TSB_FIELD_ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  const name = (process.env.TSB_FIELD_ADMIN_NAME || "Davin Kelly").trim();
  const password = process.env.TSB_FIELD_ADMIN_PASSWORD || "";

  if (!email.includes("@")) {
    throw new Error("Enter a valid email address in the PowerShell prompt.");
  }

  if (password.length < 10) {
    throw new Error("Password must be at least 10 characters.");
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set.");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const existing = await FieldTechnician.findOne({ email });
  if (existing) {
    throw new Error("An account with that email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const technician = await FieldTechnician.create({
    name,
    email,
    passwordHash,
    role: "Admin",
    active: true,
  });

  console.log("");
  console.log("Name:", technician.name);
  console.log("Email:", technician.email);
  console.log("Role:", technician.role);
  console.log("Active:", technician.active);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
