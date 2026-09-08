require("dotenv").config();

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const { Resend } = require("resend");
const crypto = require("crypto");
const { buildDocumentPdf } = require("./document-pdf");

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

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
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  family: 4,
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

/* =========================================================
   SITE ASSESSMENT SCHEMA
========================================================= */

const siteAssessmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  company: {
    type: String,
    default: "",
    trim: true,
  },

  email: {
    type: String,
    required: true,
    trim: true,
  },

  phone: {
    type: String,
    required: true,
    trim: true,
  },

  location: {
    type: String,
    required: true,
    trim: true,
  },

  propertyType: {
    type: String,
    default: "",
  },

  siteStatus: {
    type: String,
    default: "",
  },

  generatorBrand: {
    type: String,
    default: "",
  },

  generatorModel: {
    type: String,
    default: "",
  },

  generatorRating: {
    type: String,
    default: "",
  },

  generatorSerial: {
    type: String,
    default: "",
  },

  voltage: {
    type: String,
    default: "",
  },

  phase: {
    type: String,
    default: "",
  },

  breaker: {
    type: String,
    default: "",
  },

  fuel: {
    type: String,
    default: "",
  },

  assessmentType: {
    type: [String],
    default: [],
  },

  requirements: {
    type: String,
    required: true,
  },

  status: {
    type: String,
    default: "New",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const SiteAssessment = mongoose.model(
  "SiteAssessment",
  siteAssessmentSchema
);

/* =========================================================
   QUOTE MANAGEMENT SYSTEM
========================================================= */

const quoteItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "Part",
        "Labor",
        "Rental",
        "Service",
        "Miscellaneous",
      ],
      default: "Service",
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    quantity: {
      type: Number,
      default: 1,
      min: 0,
    },

    unitPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      default: 0,
      min: 0,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    partNumber: {
      type: String,
      default: "",
    },
  },
  { _id: true }
);

/* =========================================================
   QUOTE SCHEMA
========================================================= */

const quoteSchema = new mongoose.Schema(
  {
    shareToken: { type: String, unique: true, sparse: true, index: true },
    sharedAt: { type: Date, default: null },
    customerRespondedAt: { type: Date, default: null },
    quoteNumber: {
      type: String,
      required: true,
      unique: true,
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    company: {
      type: String,
      default: "",
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    sourceType: {
      type: String,
      enum: ["Manual", "RFQ", "SiteAssessment"],
      default: "Manual",
    },

    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    items: {
      type: [quoteItemSchema],
      default: [],
    },

    subtotal: {
      type: Number,
      default: 0,
    },

    discountType: {
      type: String,
      enum: ["None", "Fixed", "Percent"],
      default: "None",
    },

    discountValue: {
      type: Number,
      default: 0,
    },

    discountAmount: {
      type: Number,
      default: 0,
    },

    taxableAmount: {
      type: Number,
      default: 0,
    },

    taxRate: {
      type: Number,
      default: 10,
    },

    taxAmount: {
      type: Number,
      default: 0,
    },

    total: {
      type: Number,
      default: 0,
    },

    notes: {
      type: String,
      default: "",
    },

    terms: {
      type: String,
      default: "",
    },

    validUntil: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "Draft",
        "Sent",
        "Accepted",
        "Declined",
        "Expired",
      ],
      default: "Draft",
    },
  },
  {
    timestamps: true,
  }
);

const Quote = mongoose.model("Quote", quoteSchema);

/* =========================================================
   QUOTE NUMBER COUNTER
========================================================= */

const quoteCounterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },

  sequence: {
    type: Number,
    default: 0,
  },
});

const QuoteCounter = mongoose.model(
  "QuoteCounter",
  quoteCounterSchema
);

/* =========================================================
   QUOTE NUMBER GENERATOR
========================================================= */

async function generateQuoteNumber() {
  const year = new Date().getFullYear();

  const counter = await QuoteCounter.findOneAndUpdate(
    { name: `quote-${year}` },
    { $inc: { sequence: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  const sequence = String(counter.sequence).padStart(4, "0");

  return `TSB-${year}-${sequence}`;
}

/* =========================================================
   QUOTE TOTAL CALCULATOR
========================================================= */

function calculateQuoteTotals(quoteData) {
  const items = Array.isArray(quoteData.items)
    ? quoteData.items
    : [];

  let subtotal = 0;

  const calculatedItems = items.map((item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;

    const total = Number(
      (quantity * unitPrice).toFixed(2)
    );

    subtotal += total;

    return {
      ...item,
      quantity,
      unitPrice,
      total,
    };
  });

  subtotal = Number(subtotal.toFixed(2));

  const discountType =
    quoteData.discountType || "None";

  const discountValue =
    Number(quoteData.discountValue) || 0;

  let discountAmount = 0;

  if (discountType === "Fixed") {
    discountAmount = discountValue;
  }

  if (discountType === "Percent") {
    discountAmount =
      subtotal * (discountValue / 100);
  }

  discountAmount = Math.min(
    Math.max(discountAmount, 0),
    subtotal
  );

  discountAmount = Number(
    discountAmount.toFixed(2)
  );

  const taxableAmount = Number(
    (subtotal - discountAmount).toFixed(2)
  );

  const taxRate =
    Number(quoteData.taxRate) || 0;

  const taxAmount = Number(
    (taxableAmount * (taxRate / 100)).toFixed(2)
  );

  const total = Number(
    (taxableAmount + taxAmount).toFixed(2)
  );

  return {
    items: calculatedItems,
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    total,
  };
}

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
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: "Username and password are required",
      });
    }

    if (username !== process.env.ADMIN_USER) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      process.env.ADMIN_PASSWORD_HASH
    );

    if (!passwordMatch) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        username,
        role: "admin",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "8h",
      }
    );

    res.json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      error: "Login failed",
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

/* =========================================================
   SITE ASSESSMENT â€” CREATE
========================================================= */

app.post(
  "/site-assessments",
  async (req, res) => {
    try {
      const {
        name,
        company,
        email,
        phone,
        location,
        propertyType,
        siteStatus,
        generatorBrand,
        generatorModel,
        generatorRating,
        generatorSerial,
        voltage,
        phase,
        breaker,
        fuel,
        assessmentType,
        requirements,
      } = req.body;

      if (
        !name ||
        !email ||
        !phone ||
        !location ||
        !requirements
      ) {
        return res.status(400).json({
          error:
            "Name, email, phone, location, and requirements are required",
        });
      }

      let normalizedAssessmentType = [];

      if (Array.isArray(assessmentType)) {
        normalizedAssessmentType =
          assessmentType;
      } else if (assessmentType) {
        normalizedAssessmentType = [
          assessmentType,
        ];
      }

      const assessment =
        new SiteAssessment({
          name,
          company,
          email,
          phone,
          location,
          propertyType,
          siteStatus,
          generatorBrand,
          generatorModel,
          generatorRating,
          generatorSerial,
          voltage,
          phase,
          breaker,
          fuel,
          assessmentType:
            normalizedAssessmentType,
          requirements,
        });

      await assessment.save();

      if (
        process.env.EMAIL_USER &&
        process.env.EMAIL_PASS &&
        process.env.ADMIN_EMAIL
      ) {
        try {
          await mailer.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.ADMIN_EMAIL,
            subject: `New Site Assessment - ${name}`,
            text: `
New Total Services Site Assessment

Name: ${name}
Company: ${company || "N/A"}
Email: ${email}
Phone: ${phone}
Location: ${location}

Property Type:
${propertyType || "N/A"}

Generator:
${generatorBrand || "N/A"} ${generatorModel || ""}

Generator Rating:
${generatorRating || "N/A"}

Generator Serial:
${generatorSerial || "N/A"}

Voltage:
${voltage || "N/A"}

Phase:
${phase || "N/A"}

Breaker:
${breaker || "N/A"}

Fuel:
${fuel || "N/A"}

Assessment Type:
${normalizedAssessmentType.join(", ") || "N/A"}

Requirements:
${requirements}
            `,
          });
        } catch (emailError) {
          console.error(
            "Assessment email error:",
            emailError.message
          );
        }
      }

      res.status(201).json({
        message:
          "Site assessment submitted successfully",
        assessment,
      });
    } catch (error) {
      console.error(
        "Site assessment error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to submit site assessment",
      });
    }
  }
);

/* =========================================================
   SITE ASSESSMENTS â€” GET
========================================================= */

app.get(
  "/site-assessments",
  authenticateToken,
  async (req, res) => {
    try {
      const assessments =
        await SiteAssessment.find()
          .sort({ createdAt: -1 })
          .lean();

      res.json(assessments);
    } catch (error) {
      console.error(
        "Get site assessments error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to retrieve site assessments",
      });
    }
  }
);

/* =========================================================
   SITE ASSESSMENTS â€” STATUS
========================================================= */

app.patch(
  "/site-assessments/:id/status",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const allowedStatuses = [
        "New",
        "Contacted",
        "Scheduled",
        "Assessment Complete",
        "Quoted",
        "Completed",
        "Archived",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          error:
            "Invalid site assessment status",
        });
      }

      const assessment =
        await SiteAssessment.findByIdAndUpdate(
          id,
          { status },
          { new: true }
        );

      if (!assessment) {
        return res.status(404).json({
          error: "Site assessment not found",
        });
      }

      res.json(assessment);
    } catch (error) {
      console.error(
        "Update assessment status error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to update assessment status",
      });
    }
  }
);

/* =========================================================
   SITE ASSESSMENTS â€” DELETE
========================================================= */

app.delete(
  "/site-assessments/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error:
            "Invalid site assessment ID",
        });
      }

      const deleted =
        await SiteAssessment.findByIdAndDelete(
          id
        );

      if (!deleted) {
        return res.status(404).json({
          error:
            "Site assessment not found",
        });
      }

      res.json({
        message:
          "Site assessment deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete assessment error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to delete site assessment",
      });
    }
  }
);

/* =========================
   INVOICES
========================= */

const invoiceSchema = new mongoose.Schema({
  quoteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quote",
    required: true,
    unique: true
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  quote: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    enum: ["Unpaid", "Paid"],
    default: "Unpaid"
  },
  issuedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

invoiceSchema.add({
  payments: [{
    requestId: { type: String, required: true },
    receiptNumber: { type: String, required: true },
    amountCents: { type: Number, required: true, min: 1 },
    method: {
      type: String,
      enum: ["Cash", "Bank transfer", "Card", "Cheque", "Other"],
      required: true
    },
    reference: { type: String, default: "" },
    recordedAt: { type: Date, default: Date.now },
    balanceAfterCents: { type: Number, required: true, min: 0 }
  }]
});

invoiceSchema.add({
  lastEmailedAt: {
    type: Date,
    default: null
  }
});

invoiceSchema.path("payments").schema.add({
  lastEmailedAt: {
    type: Date,
    default: null
  }
});

const Invoice = mongoose.model("Invoice", invoiceSchema);

app.post(
  "/quotes/:id/invoice",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: "Invalid quote ID"
        });
      }

      await Invoice.init();

      const existing = await Invoice.findOne({
        quoteId: id
      }).lean();

      if (existing) {
        return res.json({ invoice: existing });
      }

      const quote = await Quote.findById(id).lean();

      if (!quote) {
        return res.status(404).json({
          error: "Quote not found"
        });
      }

      if (quote.status !== "Accepted") {
        return res.status(409).json({
          error: "Accept the quote before creating an invoice"
        });
      }

      const data = {
        quoteId: quote._id,
        invoiceNumber: `INV-${quote.quoteNumber}`,
        quote: customerQuoteView(quote),
        status: "Unpaid",
        issuedAt: new Date()
      };

      let invoice;

      try {
        invoice = await Invoice.findOneAndUpdate(
          { quoteId: quote._id },
          { $setOnInsert: data },
          {
            upsert: true,
            new: true,
            runValidators: true
          }
        );
      } catch (error) {
        if (error.code !== 11000) throw error;

        invoice = await Invoice.findOne({
          quoteId: quote._id
        });

        if (!invoice) throw error;
      }

      res.json({ invoice });
    } catch (error) {
      console.error("Invoice error:", error);
      res.status(500).json({
        error: "Unable to create or load invoice"
      });
    }
  }
);

function paymentSummary(invoice) {
  const totalCents = Math.round(Number(invoice.quote.total) * 100);
  const paidCents = (invoice.payments || []).reduce(
    (sum, payment) => sum + payment.amountCents,
    0
  );

  if (!Number.isSafeInteger(totalCents) || totalCents < 0 ||
      !Number.isSafeInteger(paidCents) || paidCents < 0 ||
      paidCents > totalCents) {
    throw new Error("Invalid invoice totals");
  }

  return {
    totalCents,
    paidCents,
    balanceCents: totalCents - paidCents
  };
}

app.get(
  "/invoices/:id/payments",
  authenticateToken,
  async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: "Invalid invoice ID" });
      }

      const invoice = await Invoice.findById(req.params.id).lean();
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });

      res.json({ invoice, ...paymentSummary(invoice) });
    } catch {
      res.status(500).json({ error: "Unable to load payments" });
    }
  }
);

app.post(
  "/invoices/:id/payments",
  authenticateToken,
  async (req, res) => {
    try {
      const { amount, method, reference = "", requestId } = req.body || {};

      if (!mongoose.Types.ObjectId.isValid(req.params.id) ||
          typeof requestId !== "string" || !/^[a-f0-9-]{36}$/.test(requestId)) {
        return res.status(400).json({ error: "Invalid invoice or payment request ID" });
      }

      const methods = ["Cash", "Bank transfer", "Card", "Cheque", "Other"];
      if (typeof amount !== "string" || !/^\d{1,9}(\.\d{1,2})?$/.test(amount) ||
          !methods.includes(method) || typeof reference !== "string" || reference.length > 200) {
        return res.status(400).json({ error: "Enter a valid amount, method and reference" });
      }

      const amountCents = Math.round(Number(amount) * 100);
      if (amountCents <= 0) return res.status(400).json({ error: "Amount must be greater than zero" });

      for (let attempt = 0; attempt < 5; attempt++) {
        const invoice = await Invoice.findById(req.params.id).lean();
        if (!invoice) return res.status(404).json({ error: "Invoice not found" });

        const existing = (invoice.payments || []).find(payment => payment.requestId === requestId);
        if (existing) {
          if (existing.amountCents !== amountCents || existing.method !== method || existing.reference !== reference.trim()) {
            return res.status(409).json({ error: "This request ID belongs to a different payment" });
          }
          return res.json({ payment: existing, ...paymentSummary(invoice) });
        }

        const summary = paymentSummary(invoice);
        if (amountCents > summary.balanceCents) {
          return res.status(409).json({ error: "Payment exceeds the remaining invoice balance" });
        }

        const payment = {
          requestId,
          amountCents,
          method,
          reference: reference.trim(),
          receiptNumber: `RCP-${new mongoose.Types.ObjectId()}`,
          recordedAt: new Date(),
          balanceAfterCents: summary.balanceCents - amountCents
        };

        const filter = { _id: invoice._id };
        filter.__v = invoice.__v == null ? { $exists: false } : invoice.__v;

        const updated = await Invoice.findOneAndUpdate(
          filter,
          {
            $push: { payments: payment },
            $inc: { __v: 1 },
            $set: { status: payment.balanceAfterCents === 0 ? "Paid" : "Unpaid" }
          },
          { new: true, runValidators: true }
        );

        if (updated) return res.json({ payment, ...paymentSummary(updated) });
      }

      res.status(409).json({ error: "Invoice changed. Retry the same payment request." });
    } catch {
      res.status(500).json({ error: "Unable to confirm payment. Retry the same request to avoid duplication." });
    }
  }
);

app.get("/invoices", authenticateToken, async (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    const documents = await Invoice.find()
      .select(
        "invoiceNumber issuedAt quote.customerName " +
        "quote.company quote.total payments.amountCents"
      )
      .sort({ issuedAt: -1, _id: -1 })
      .lean();

    const invoices = documents.map(invoice => {
      const totals = paymentSummary(invoice);

      return {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        issuedAt: invoice.issuedAt,
        customerName: invoice.quote.customerName,
        company: invoice.quote.company,
        ...totals,
        paymentStatus:
          totals.balanceCents === 0
            ? "Paid"
            : totals.paidCents > 0
              ? "Partially Paid"
              : "Unpaid"
      };
    });

    res.json({ invoices });
  } catch {
    res.status(500).json({
      error: "Unable to load invoices"
    });
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

/* =========================================================
   QUOTES â€” CREATE
========================================================= */

app.post(
  "/quotes",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        customerName,
        company,
        email,
        phone,
        sourceType,
        sourceId,
        items,
        discountType,
        discountValue,
        taxRate,
        notes,
        terms,
        validUntil,
        status,
      } = req.body;

      if (!customerName || !email) {
        return res.status(400).json({
          error:
            "Customer name and email are required",
        });
      }

      const allowedSourceTypes = [
        "Manual",
        "RFQ",
        "SiteAssessment",
      ];

      const selectedSourceType =
        sourceType || "Manual";

      if (
        !allowedSourceTypes.includes(
          selectedSourceType
        )
      ) {
        return res.status(400).json({
          error: "Invalid quote source type",
        });
      }

      const allowedStatuses = [
        "Draft",
        "Sent",
        "Accepted",
        "Declined",
        "Expired",
      ];

      const selectedStatus =
        status || "Draft";

      if (
        !allowedStatuses.includes(
          selectedStatus
        )
      ) {
        return res.status(400).json({
          error: "Invalid quote status",
        });
      }

      const allowedDiscountTypes = [
        "None",
        "Fixed",
        "Percent",
      ];

      const selectedDiscountType =
        discountType || "None";

      if (
        !allowedDiscountTypes.includes(
          selectedDiscountType
        )
      ) {
        return res.status(400).json({
          error:
            "Invalid discount type",
        });
      }

      if (
        selectedSourceType === "RFQ" &&
        sourceId
      ) {
        if (
          !mongoose.Types.ObjectId.isValid(
            sourceId
          )
        ) {
          return res.status(400).json({
            error: "Invalid RFQ source ID",
          });
        }

        const rfq = await RFQ.findById(sourceId);

        if (!rfq) {
          return res.status(404).json({
            error: "Source RFQ not found",
          });
        }
      }

      if (
        selectedSourceType ===
          "SiteAssessment" &&
        sourceId
      ) {
        if (
          !mongoose.Types.ObjectId.isValid(
            sourceId
          )
        ) {
          return res.status(400).json({
            error:
              "Invalid site assessment source ID",
          });
        }

        const assessment =
          await SiteAssessment.findById(
            sourceId
          );

        if (!assessment) {
          return res.status(404).json({
            error:
              "Source site assessment not found",
          });
        }
      }

      const totals = calculateQuoteTotals({
        items,
        discountType:
          selectedDiscountType,
        discountValue,
        taxRate:
          taxRate !== undefined
            ? taxRate
            : 10,
      });

      const quoteNumber =
        await generateQuoteNumber();

      const quote = new Quote({
        quoteNumber,

        customerName,
        company,
        email,
        phone,

        sourceType:
          selectedSourceType,

        sourceId:
          sourceId || null,

        items: totals.items,

        subtotal:
          totals.subtotal,

        discountType:
          selectedDiscountType,

        discountValue:
          Number(discountValue) || 0,

        discountAmount:
          totals.discountAmount,

        taxableAmount:
          totals.taxableAmount,

        taxRate:
          Number(taxRate) || 0,

        taxAmount:
          totals.taxAmount,

        total:
          totals.total,

        notes,
        terms,
        validUntil:
          validUntil || null,

        status:
          selectedStatus,
      });

      await quote.save();

      res.status(201).json({
        message:
          "Quote created successfully",
        quote,
      });
    } catch (error) {
      console.error(
        "Create quote error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to create quote",
      });
    }
  }
);

/* =========================================================
   QUOTES â€” GET ALL
========================================================= */

app.get(
  "/quotes",
  authenticateToken,
  async (req, res) => {
    try {
      const quotes =
        await Quote.find()
          .sort({ createdAt: -1 })
          .lean();

      res.json(quotes);
    } catch (error) {
      console.error(
        "Get quotes error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to retrieve quotes",
      });
    }
  }
);

/* =========================================================
   QUOTES â€” GET ONE
========================================================= */

app.get(
  "/quotes/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          error: "Invalid quote ID",
        });
      }

      const quote =
        await Quote.findById(id).lean();

      if (!quote) {
        return res.status(404).json({
          error: "Quote not found",
        });
      }

      res.json(quote);
    } catch (error) {
      console.error(
        "Get quote error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to retrieve quote",
      });
    }
  }
);

/* =========================================================
   QUOTES â€” GET RFQ SOURCE
========================================================= */

app.get(
  "/quotes/source/rfq/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          error: "Invalid RFQ ID",
        });
      }

      const rfq =
        await RFQ.findById(id).lean();

      if (!rfq) {
        return res.status(404).json({
          error: "RFQ not found",
        });
      }

      res.json({
        sourceType: "RFQ",
        sourceId: rfq._id,

        customerName: rfq.name,
        company: rfq.company,
        email: rfq.email,

        product: {
          productId: rfq.productId,
          name: rfq.productName,
          category: rfq.productCategory,
          manufacturer:
            rfq.productManufacturer,
          partNumber:
            rfq.productPartNumber,
          compatibleModels:
            rfq.productCompatibleModels,
        },

        message: rfq.message,
        status: rfq.status,
        createdAt: rfq.createdAt,
      });
    } catch (error) {
      console.error(
        "Get RFQ source error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to retrieve RFQ source",
      });
    }
  }
);

/* =========================================================
   QUOTES â€” GET SITE ASSESSMENT SOURCE
========================================================= */

app.get(
  "/quotes/source/site-assessment/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          error:
            "Invalid site assessment ID",
        });
      }

      const assessment =
        await SiteAssessment.findById(
          id
        ).lean();

      if (!assessment) {
        return res.status(404).json({
          error:
            "Site assessment not found",
        });
      }

      res.json({
        sourceType: "SiteAssessment",
        sourceId: assessment._id,

        customerName:
          assessment.name,

        company:
          assessment.company,

        email:
          assessment.email,

        phone:
          assessment.phone,

        location:
          assessment.location,

        propertyType:
          assessment.propertyType,

        siteStatus:
          assessment.siteStatus,

        generator: {
          brand:
            assessment.generatorBrand,

          model:
            assessment.generatorModel,

          rating:
            assessment.generatorRating,

          serial:
            assessment.generatorSerial,

          voltage:
            assessment.voltage,

          phase:
            assessment.phase,

          breaker:
            assessment.breaker,

          fuel:
            assessment.fuel,
        },

        assessmentType:
          assessment.assessmentType,

        requirements:
          assessment.requirements,

        status:
          assessment.status,

        createdAt:
          assessment.createdAt,
      });
    } catch (error) {
      console.error(
        "Get assessment source error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to retrieve site assessment source",
      });
    }
  }
);

/* =========================================================
   QUOTES â€” UPDATE
========================================================= */

app.put(
  "/quotes/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          error: "Invalid quote ID",
        });
      }

      const existingQuote =
        await Quote.findById(id);

      if (!existingQuote) {
        return res.status(404).json({
          error: "Quote not found",
        });
      }

      const data = req.body;

      const customerName =
        data.customerName ??
        existingQuote.customerName;

      const company =
        data.company ??
        existingQuote.company;

      const email =
        data.email ??
        existingQuote.email;

      const phone =
        data.phone ??
        existingQuote.phone;

      const sourceType =
        data.sourceType ??
        existingQuote.sourceType;

      const sourceId =
        data.sourceId ??
        existingQuote.sourceId;

      const items =
        data.items ??
        existingQuote.items;

      const discountType =
        data.discountType ??
        existingQuote.discountType;

      const discountValue =
        data.discountValue ??
        existingQuote.discountValue;

      const taxRate =
        data.taxRate !== undefined
          ? data.taxRate
          : existingQuote.taxRate;

      const totals =
        calculateQuoteTotals({
          items,
          discountType,
          discountValue,
          taxRate,
        });

      existingQuote.customerName =
        customerName;

      existingQuote.company =
        company;

      existingQuote.email =
        email;

      existingQuote.phone =
        phone;

      existingQuote.sourceType =
        sourceType;

      existingQuote.sourceId =
        sourceId || null;

      existingQuote.items =
        totals.items;

      existingQuote.subtotal =
        totals.subtotal;

      existingQuote.discountType =
        discountType;

      existingQuote.discountValue =
        Number(discountValue) || 0;

      existingQuote.discountAmount =
        totals.discountAmount;

      existingQuote.taxableAmount =
        totals.taxableAmount;

      existingQuote.taxRate =
        Number(taxRate) || 0;

      existingQuote.taxAmount =
        totals.taxAmount;

      existingQuote.total =
        totals.total;

      if (data.notes !== undefined) {
        existingQuote.notes =
          data.notes;
      }

      if (data.terms !== undefined) {
        existingQuote.terms =
          data.terms;
      }

      if (data.validUntil !== undefined) {
        existingQuote.validUntil =
          data.validUntil || null;
      }

      if (data.status !== undefined) {
        const allowedStatuses = [
          "Draft",
          "Sent",
          "Accepted",
          "Declined",
          "Expired",
        ];

        if (
          !allowedStatuses.includes(
            data.status
          )
        ) {
          return res.status(400).json({
            error:
              "Invalid quote status",
          });
        }

        existingQuote.status =
          data.status;
      }

      await existingQuote.save();

      res.json({
        message:
          "Quote updated successfully",
        quote: existingQuote,
      });
    } catch (error) {
      console.error(
        "Update quote error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to update quote",
      });
    }
  }
);

/* =========================================================
   QUOTES â€” STATUS
========================================================= */

app.patch(
  "/quotes/:id/status",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const allowedStatuses = [
        "Draft",
        "Sent",
        "Accepted",
        "Declined",
        "Expired",
      ];

      if (
        !allowedStatuses.includes(status)
      ) {
        return res.status(400).json({
          error:
            "Invalid quote status",
        });
      }

      const quote =
        await Quote.findByIdAndUpdate(
          id,
          { status },
          { new: true }
        );

      if (!quote) {
        return res.status(404).json({
          error: "Quote not found",
        });
      }

      res.json(quote);
    } catch (error) {
      console.error(
        "Update quote status error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to update quote status",
      });
    }
  }
);

/* =========================================================
   QUOTES â€” DELETE
========================================================= */

app.delete(
  "/quotes/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          error: "Invalid quote ID",
        });
      }

      const deleted =
        await Quote.findByIdAndDelete(id);

      if (!deleted) {
        return res.status(404).json({
          error: "Quote not found",
        });
      }

      res.json({
        message:
          "Quote deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete quote error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to delete quote",
      });
    }
  }
);

/* =========================================================
   CUSTOMER QUOTE SHARING
========================================================= */

function customerQuoteView(quote) {
  const fields = [
    "quoteNumber",
    "customerName",
    "company",
    "email",
    "phone",
    "subtotal",
    "discountType",
    "discountValue",
    "discountAmount",
    "taxableAmount",
    "taxRate",
    "taxAmount",
    "total",
    "notes",
    "terms",
    "validUntil",
    "status",
    "createdAt",
    "customerRespondedAt",
  ];

  const result = Object.fromEntries(
    fields.map((key) => [
      key,
      quote[key],
    ])
  );

  result.items = (quote.items || []).map(
    (item) => ({
      type: item.type,
      description: item.description,
      partNumber: item.partNumber,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    })
  );

  return result;
}

function validQuoteToken(token) {
  return (
    typeof token === "string" &&
    /^[a-f0-9]{64}$/.test(token)
  );
}

/* =========================================================
   QUOTES â€” CREATE CUSTOMER LINK
========================================================= */

app.post(
  "/quotes/:id/share",
  authenticateToken,
  async (req, res) => {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return res.status(400).json({
          error: "Invalid quote ID",
        });
      }

      const now = new Date();

      let quote =
        await Quote.findById(req.params.id);

      if (!quote) {
        return res.status(404).json({
          error: "Quote not found",
        });
      }

      if (
        quote.status === "Expired" ||
        (
          quote.validUntil &&
          new Date(quote.validUntil) <= now
        )
      ) {
        return res.status(410).json({
          error:
            "This quotation has expired",
        });
      }

      if (!quote.shareToken) {
        await Quote.findOneAndUpdate(
          {
            _id: quote._id,
            shareToken: null,
          },
          {
            $set: {
              shareToken:
                crypto
                  .randomBytes(32)
                  .toString("hex"),
              sharedAt: now,
            },
          },
          {
            new: true,
            runValidators: true,
          }
        );
      }

      await Quote.findOneAndUpdate(
        {
          _id: quote._id,
          status: "Draft",
        },
        {
          $set: {
            status: "Sent",
          },
        },
        {
          runValidators: true,
        }
      );

      quote =
        await Quote.findById(req.params.id);

      if (
        !quote ||
        !quote.shareToken
      ) {
        return res.status(404).json({
          error:
            "Quote no longer available",
        });
      }

      const base =
        process.env.PUBLIC_BASE_URL ||
        `http://localhost:${PORT}`;

      const url = new URL(
        "/customer-quote.html",
        base
      );

      url.searchParams.set(
        "token",
        quote.shareToken
      );

      res.set(
        "Cache-Control",
        "no-store"
      );

      res.json({
        message:
          "Customer link ready",
        url: url.href,
        shareUrl: url.href,
        customerUrl: url.href,
        quoteNumber:
          quote.quoteNumber,
      });
    } catch (error) {
      console.error(
        "Create customer link error:",
        error
      );

      res.status(500).json({
        error:
          "Unable to create customer link",
      });
    }
  }
);

/* =========================================================
   PUBLIC QUOTE â€” VIEW
========================================================= */

app.get(
  "/public/quotes/:token",
  async (req, res) => {
    res.set(
      "Cache-Control",
      "no-store"
    );

    try {
      if (
        !validQuoteToken(
          req.params.token
        )
      ) {
        return res.status(404).json({
          error:
            "Quote link not found",
        });
      }

      const quote =
        await Quote.findOne({
          shareToken:
            req.params.token,
        }).lean();

      if (
        !quote ||
        quote.status === "Draft"
      ) {
        return res.status(404).json({
          error:
            "Quote link not found",
        });
      }

      if (
        quote.status === "Expired" ||
        (
          quote.status === "Sent" &&
          quote.validUntil &&
          new Date(
            quote.validUntil
          ) <= new Date()
        )
      ) {
        return res.status(410).json({
          error:
            "This quotation has expired",
        });
      }

      res.json({
        quote:
          customerQuoteView(quote),
      });
    } catch (error) {
      console.error(
        "Public quote error:",
        error
      );

      res.status(500).json({
        error:
          "Unable to load quotation",
      });
    }
  }
);

/* =========================================================
   PUBLIC QUOTE â€” ACCEPT / DECLINE
========================================================= */

app.post(
  "/public/quotes/:token/respond",
  async (req, res) => {
    res.set(
      "Cache-Control",
      "no-store"
    );

    try {
      if (
        !validQuoteToken(
          req.params.token
        )
      ) {
        return res.status(404).json({
          error:
            "Quote link not found",
        });
      }

      const decision =
        req.body &&
        req.body.decision;

      if (
        ![
          "Accepted",
          "Declined",
        ].includes(decision)
      ) {
        return res.status(400).json({
          error:
            "Decision must be Accepted or Declined",
        });
      }

      const now = new Date();

      const quote =
        await Quote.findOneAndUpdate(
          {
            shareToken:
              req.params.token,
            status: "Sent",
            customerRespondedAt: null,
            $or: [
              {
                validUntil: null,
              },
              {
                validUntil: {
                  $gt: now,
                },
              },
            ],
          },
          {
            $set: {
              status: decision,
              customerRespondedAt:
                now,
            },
          },
          {
            new: true,
            runValidators: true,
          }
        );

      if (quote) {
        return res.json({
          message:
            `Quotation ${decision.toLowerCase()}`,
          quote:
            customerQuoteView(
              quote
            ),
        });
      }

      const existing =
        await Quote.findOne({
          shareToken:
            req.params.token,
        }).lean();

      if (
        !existing ||
        existing.status === "Draft"
      ) {
        return res.status(404).json({
          error:
            "Quote link not found",
        });
      }

      if (
        existing.status === decision
      ) {
        return res.json({
          message:
            "Response already recorded",
          quote:
            customerQuoteView(
              existing
            ),
        });
      }

      if (
        existing.status === "Expired" ||
        (
          existing.status === "Sent" &&
          existing.validUntil &&
          new Date(
            existing.validUntil
          ) <= now
        )
      ) {
        return res.status(410).json({
          error:
            "This quotation has expired",
        });
      }

      return res.status(409).json({
        error:
          "This quotation already has a response or is unavailable",
      });
    } catch (error) {
      console.error(
        "Quote response error:",
        error
      );

      res.status(500).json({
        error:
          "Unable to save quote response",
      });
    }
  }
);

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


/* =========================
   INVOICE / RECEIPT EMAIL
========================= */

app.post(
  "/invoices/:id/email",
  authenticateToken,
  async (req, res) => {
    let submitted = false;

    try {
      const { paymentId, recipient } = req.body || {};

      if (
        !mongoose.Types.ObjectId.isValid(req.params.id) ||
        (
          paymentId !== undefined &&
          !mongoose.Types.ObjectId.isValid(paymentId)
        )
      ) {
        return res.status(400).json({
          error: "Invalid invoice or payment ID"
        });
      }

      const invoice = await Invoice.findById(
        req.params.id
      ).lean();

      if (!invoice) {
        return res.status(404).json({
          error: "Invoice not found"
        });
      }

      const email = String(
        invoice.quote.email || ""
      ).trim();

      if (!/^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(email)) {
        return res.status(400).json({
          error: "The invoice has no valid customer email address"
        });
      }

      if (recipient !== email) {
        return res.status(409).json({
          error: "Recipient changed. Reopen the invoice and confirm again."
        });
      }

      const payment = paymentId
        ? (invoice.payments || []).find(
            item => String(item._id) === paymentId
          )
        : null;

      if (paymentId && !payment) {
        return res.status(404).json({
          error: "Payment not found"
        });
      }

      if (!process.env.RESEND_API_KEY) {
        return res.status(503).json({
          error: "Email service is not configured"
        });
      }

      const q = invoice.quote;
      const totals = paymentSummary(invoice);

      const money = cents =>
        `BSD ${(cents / 100).toFixed(2)}`;

      const title = payment
        ? `Receipt ${payment.receiptNumber}`
        : `Invoice ${invoice.invoiceNumber}`;

      const lines = [
        "Total Services Bahamas",
        title,
        `Customer: ${q.customerName || ""}`,
        `Company: ${q.company || ""}`,
        `Invoice: ${invoice.invoiceNumber}`
      ];

      if (payment) {
        lines.push(
          `Recorded: ${new Date(payment.recordedAt).toISOString()}`,
          `Payment received: ${money(payment.amountCents)}`,
          `Method: ${payment.method}`,
          `Reference: ${payment.reference || "â€”"}`,
          `Balance after this payment: ${money(payment.balanceAfterCents)}`
        );

      } else {
        lines.push(
          `Issued: ${new Date(invoice.issuedAt).toISOString().slice(0, 10)}`,
          "",
          "Items:"
        );

        for (const item of q.items || []) {
          lines.push(
            `${item.description || ""} ${item.partNumber || ""}` +
            ` â€” ${item.quantity} Ã— ` +
            `${money(Math.round(item.unitPrice * 100))}` +
            ` = ${money(Math.round(item.total * 100))}`
          );
        }

        lines.push(
          "",
          `Subtotal: ${money(Math.round(q.subtotal * 100))}`,
          `Discount: ${money(Math.round(q.discountAmount * 100))}`,
          `VAT (${q.taxRate}%): ${money(Math.round(q.taxAmount * 100))}`,
          `Total: ${money(totals.totalCents)}`,
          `Payments received: ${money(totals.paidCents)}`,
          `Remaining balance: ${money(totals.balanceCents)}`
        );

        if (q.notes) {
          lines.push("", "Notes:", q.notes);
        }

        if (q.terms) {
          lines.push("", "Terms:", q.terms);
        }
      }

      const text = lines.join("\n");

      const escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      const pdfBuffer = await buildDocumentPdf(lines);

      const attachmentName =
        title.replace(/[^a-zA-Z0-9_-]/g, "_") + ".pdf";

      const { data, error: resendError } = await resend.emails.send({
        from: "Total Services Bahamas <onboarding@resend.dev>",
        to: [email],
        subject: `${title} — Total Services Bahamas`,
        text,
        html: `
          <div style="
            font-family:Arial,sans-serif;
            max-width:760px;
            margin:auto;
            color:#0b1f3b;
          ">
            <pre style="
              font-family:inherit;
              white-space:pre-wrap;
              line-height:1.6;
            ">${escaped}</pre>
          </div>
        `,
        attachments: [
          {
            filename: attachmentName,
            content: Buffer.from(pdfBuffer)
          }
        ]
      });

      if (resendError) {
        throw new Error(
          resendError.message || "Resend rejected the email"
        );
      }

      if (!data || !data.id) {
        throw new Error("Resend did not confirm the email");
      }

      submitted = true;

      const sentAt = new Date();

      const filter = {
        _id: invoice._id
      };

      const field = payment
        ? "payments.$.lastEmailedAt"
        : "lastEmailedAt";

      if (payment) {
        filter["payments._id"] = payment._id;
      }

      const updated = await Invoice.updateOne(
        filter,
        {
          $max: {
            [field]: sentAt
          }
        }
      );

      if (!updated.matchedCount) {
        throw new Error("Timestamp was not saved");
      }

      res.json({
        message: `Email submitted to ${email}.`,
        sentAt
      });

    } catch (error) {
      console.error("Invoice email error:", error);

      if (submitted) {
        return res.json({
          message:
            "Email submitted, but its timestamp could not be saved. " +
            "Do not resend just to fix the timestamp."
        });
      }

      res.status(502).json({
        error:
          "Email could not be confirmed. " +
          "Check your Sent folder before trying again."
      });
    }
  }
);
