require("dotenv").config();

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

const app = express();

/* =========================
   MIDDLEWARE
========================= */

app.use(express.json());

app.use(cors({
  origin: [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "https://totalservicesbahamas.com"
  ]
}));

app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   EMAIL CONFIGURATION
========================= */

const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* =========================
   DATABASE CONNECTION
========================= */

mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log("MongoDB Connected");
})
.catch((err) => {
  console.error("MongoDB Connection Error:", err);
});

/* =========================
   RFQ SCHEMA
========================= */

const rfqSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  company: {
    type: String,
    default: ""
  },

  email: {
    type: String,
    required: true
  },

  message: {
    type: String,
    required: true
  },

  status: {
    type: String,
    default: "New"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const RFQ = mongoose.model("RFQ", rfqSchema);

/* =========================
   PRODUCTS SCHEMA
========================= */

const productSchema = new mongoose.Schema({
  name: String,
  category: String,
  description: String,
  image: String
});

const Product = mongoose.model("Product", productSchema);

/* =========================
   AUTH MIDDLEWARE
========================= */

function authenticateToken(req, res, next) {

  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({
      error: "Access denied"
    });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {

    if (err) {
      return res.status(403).json({
        error: "Invalid token"
      });
    }

    req.user = user;

    next();
  });
}

/* =========================
   LOGIN ROUTE
========================= */

app.post("/login", async (req, res) => {

  try {

    const { user, pass } = req.body;

    if (!user || !pass) {
      return res.status(400).json({
        error: "Username and password required"
      });
    }

    if (user !== process.env.ADMIN_USER) {
      return res.status(401).json({
        error: "Invalid credentials"
      });
    }

    const validPassword = await bcrypt.compare(
      pass,
      process.env.ADMIN_PASSWORD_HASH
    );

    if (!validPassword) {
      return res.status(401).json({
        error: "Invalid credentials"
      });
    }

    const token = jwt.sign(
      { user },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      message: "Login successful",
      token
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Server error"
    });
  }
});

/* =========================
   RFQ ROUTES
========================= */

app.post("/rfq", async (req, res) => {

  try {

    const {
      name,
      company,
      email,
      message
    } = req.body;

    /* VALIDATION */

    if (!name || !email || !message) {

      return res.status(400).json({
        error: "Required fields missing"
      });
    }

    const rfq = new RFQ({
      name,
      company,
      email,
      message
    });

    await rfq.save();

    // Send email notification (don't fail RFQ if email fails)
    try {
      await mailer.sendMail({
        from: `"Total Services Website" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: "New RFQ Submitted - Total Services Bahamas",
        html: `
          <h2>New RFQ Submitted</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Company:</strong> ${company || "N/A"}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `
      });
      console.log("Email notification sent successfully");
    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);
      // Continue with RFQ submission even if email fails
    }

    console.log("RFQ Saved:", rfq);

    res.status(201).json({
      message: "RFQ submitted successfully"
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "RFQ submission failed"
    });
  }
});

/* =========================
   GET RFQs (Protected)
========================= */

app.get("/rfq", authenticateToken, async (req, res) => {

  try {

    const rfqs = await RFQ.find()
      .sort({ createdAt: -1 });

    res.json(rfqs);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Failed to fetch RFQs"
    });
  }
});

app.delete("/rfq/:id", authenticateToken, async (req, res) => {
  try {
    const deleted = await RFQ.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: "RFQ not found" });
    }

    res.json({ message: "RFQ deleted" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete RFQ" });
  }
});

app.patch("/rfq/:id/status", authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ["New", "Quoted", "In Progress", "Completed", "Archived"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid RFQ status" });
    }

    const updated = await RFQ.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "RFQ not found" });
    }

    res.json({
      message: "RFQ status updated",
      rfq: updated
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update RFQ status" });
  }
});

/* =========================
   PRODUCTS ROUTES
========================= */

app.get("/products", async (req, res) => {

  try {

    const products = await Product.find();

    res.json(products);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Failed to fetch products"
    });
  }
});

app.post("/products", authenticateToken, async (req, res) => {

  try {

    const product = new Product(req.body);

    await product.save();

    res.status(201).json({
      message: "Product added",
      product
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Failed to add product"
    });
  }
});

app.delete("/products/:id", authenticateToken, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ message: "Product deleted" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

/* =========================
   AI ASSISTANT ROUTE
========================= */

const knowledgeBase = [
  {
    keywords: ["generator", "genset", "backup power"],
    response: "We can assist with generator rentals, sales, servicing, diagnostics, load assessments, transfer switches, and installation planning. Please provide the generator size, voltage, fuel type, and site location."
  },
  {
    keywords: ["parts", "filter", "oil", "avr", "controller", "sensor", "belt"],
    response: "For parts requests, please provide the generator brand, model, serial number, part number if available, and a photo of the data plate. We supply filters, oil, AVR units, controllers, belts, sensors, breakers, and ATS components."
  },
  {
    keywords: ["electrical", "panel", "breaker", "wiring", "ats", "transfer switch"],
    response: "For electrical work, we can assist with panels, wiring, ATS installation, troubleshooting, service upgrades, and commercial or residential electrical repairs. Please describe the issue and include voltage, phase, and photos if possible."
  },
  {
    keywords: ["rental", "rent", "temporary power"],
    response: "For generator rentals, please provide the load requirement, site location, rental duration, voltage, phase, fuel preference, and whether delivery and hookup are required."
  },
  {
    keywords: ["quote", "price", "cost", "estimate"],
    response: "To prepare a quote, we need your name, company, location, service type, urgency, equipment details, and any photos or model numbers available."
  },
  {
    keywords: ["rehlko", "kohler"],
    response: "Total Services supports Rehlko/Kohler power systems, including parts, service support, generator systems, and lifecycle maintenance. Please provide the model and serial number for accurate support."
  }
];

app.post("/ai", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question required" });
    }

    const q = question.toLowerCase();

    const match = knowledgeBase.find(item =>
      item.keywords.some(keyword => q.includes(keyword))
    );

    const response = match
      ? match.response
      : "I can help with generator service, electrical work, parts, rentals, RFQs, Rehlko/Kohler systems, and site assessments. Please describe what you need, including equipment size, model number, location, and urgency.";

    res.json({ response });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI assistant failed" });
  }
});

/* =========================
   HEALTH CHECK
========================= */

app.get("/", (req, res) => {

  res.sendFile(path.join(__dirname, "index.html"));
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(`Server running on port ${PORT}`);
});
