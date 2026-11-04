"use strict";

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const technicianSchema = new mongoose.Schema(
  {
    employeeNumber: { type: String, unique: true, sparse: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: "", trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["Technician", "Lead Technician", "Supervisor", "Admin"],
      default: "Technician",
    },
    active: { type: Boolean, default: true },
    skills: { type: [String], default: [] },
  },
  { timestamps: true }
);

const equipmentSchema = new mongoose.Schema(
  {
    qrCode: { type: String, unique: true, sparse: true, index: true },
    customerName: { type: String, required: true, trim: true },
    company: { type: String, default: "", trim: true },
    siteName: { type: String, default: "", trim: true },
    siteAddress: { type: String, default: "", trim: true },

    equipmentType: {
      type: String,
      enum: ["Generator", "ATS", "Other"],
      default: "Generator",
    },

    manufacturer: { type: String, default: "Rehlko", trim: true },
    model: { type: String, default: "", trim: true },
    serialNumber: { type: String, default: "", trim: true, index: true },
    engineModel: { type: String, default: "", trim: true },
    engineSerial: { type: String, default: "", trim: true },
    controller: { type: String, default: "", trim: true },

    ratingKW: { type: Number, default: null },
    ratingKVA: { type: Number, default: null },
    voltage: { type: String, default: "", trim: true },
    phase: { type: String, default: "", trim: true },
    frequencyHz: { type: Number, default: 60 },
    fuelType: { type: String, default: "", trim: true },

    atsManufacturer: { type: String, default: "", trim: true },
    atsModel: { type: String, default: "", trim: true },
    atsSerial: { type: String, default: "", trim: true },

    notes: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const checklistItemSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    status: {
      type: String,
      enum: ["Not Checked", "Pass", "Attention", "Fail", "N/A"],
      default: "Not Checked",
    },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const materialSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    partNumber: { type: String, default: "" },
    description: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 0 },
    unit: { type: String, default: "ea" },
  },
  { _id: true }
);

const recommendationSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    priority: {
      type: String,
      enum: ["Routine", "Soon", "Urgent", "Critical"],
      default: "Routine",
    },
    quoteRequired: { type: Boolean, default: false },
    quoteSent: { type: Boolean, default: false },
    completed: { type: Boolean, default: false },
  },
  { _id: true }
);

const photoSchema = new mongoose.Schema(
  {
    url: { type: String, default: "" },
    storageKey: { type: String, default: "" },
    caption: { type: String, default: "" },
    type: {
      type: String,
      enum: ["Before", "During", "After", "Nameplate", "Problem", "Other"],
      default: "Other",
    },
  },
  { _id: true }
);

const workOrderSchema = new mongoose.Schema(
  {
    workOrderNumber: { type: String, required: true, unique: true, index: true },

    customerName: { type: String, required: true, trim: true },
    company: { type: String, default: "", trim: true },
    contactName: { type: String, default: "", trim: true },
    contactPhone: { type: String, default: "", trim: true },
    siteAddress: { type: String, default: "", trim: true },

    equipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FieldEquipment",
      default: null,
    },

    assignedTechnicians: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FieldTechnician",
      },
    ],

    scheduledFor: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },

    jobType: {
      type: String,
      enum: [
        "Preventive Maintenance",
        "Corrective Maintenance",
        "Emergency Call",
        "Inspection",
        "Load Bank Test",
        "ATS Service",
        "Installation",
        "Commissioning",
        "Rental Service",
        "Other",
      ],
      default: "Preventive Maintenance",
    },

    status: {
      type: String,
      enum: [
        "New",
        "Assigned",
        "In Progress",
        "Needs Follow-up",
        "Completed",
        "Invoiced",
        "Cancelled",
      ],
      default: "New",
      index: true,
    },

    complaint: { type: String, default: "" },
    scope: { type: String, default: "" },
    technicianNotes: { type: String, default: "" },

    generatorReadings: {
      engineHours: { type: Number, default: null },
      batteryVdc: { type: Number, default: null },
      frequencyHz: { type: Number, default: null },

      voltageL1L2: { type: Number, default: null },
      voltageL2L3: { type: Number, default: null },
      voltageL3L1: { type: Number, default: null },

      voltageL1N: { type: Number, default: null },
      voltageL2N: { type: Number, default: null },
      voltageL3N: { type: Number, default: null },

      currentL1: { type: Number, default: null },
      currentL2: { type: Number, default: null },
      currentL3: { type: Number, default: null },

      oilPressure: { type: Number, default: null },
      coolantTemperature: { type: Number, default: null },
      fuelLevelPercent: { type: Number, default: null },
    },

    checklist: { type: [checklistItemSchema], default: [] },
    materialsUsed: { type: [materialSchema], default: [] },
    recommendations: { type: [recommendationSchema], default: [] },
    photos: { type: [photoSchema], default: [] },

    customerSignature: { type: String, default: "" },
    technicianSignature: { type: String, default: "" },
    customerSignedAt: { type: Date, default: null },
    technicianSignedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const FieldTechnician =
  mongoose.models.FieldTechnician ||
  mongoose.model("FieldTechnician", technicianSchema);

const FieldEquipment =
  mongoose.models.FieldEquipment ||
  mongoose.model("FieldEquipment", equipmentSchema);

const FieldWorkOrder =
  mongoose.models.FieldWorkOrder ||
  mongoose.model("FieldWorkOrder", workOrderSchema);

const DEFAULT_CHECKLIST = [
  ["visual_leaks", "Check for oil, coolant and fuel leaks"],
  ["oil_level", "Engine oil level / condition"],
  ["coolant_level", "Coolant level / condition"],
  ["fuel_system", "Fuel system / hoses / fittings"],
  ["battery", "Battery condition / terminals / charger"],
  ["belts_hoses", "Belts and hoses"],
  ["air_filter", "Air filter condition"],
  ["radiator", "Radiator / louvers / ventilation"],
  ["exhaust", "Exhaust system"],
  ["wiring", "Electrical wiring / terminations"],
  ["breaker", "Generator output breaker"],
  ["controller", "Controller alarms / event history"],
  ["voltage", "Output voltage"],
  ["frequency", "Frequency"],
  ["ats", "ATS visual / operation check"],
  ["exercise", "Exercise / functional run"],
];

function makeChecklist() {
  return DEFAULT_CHECKLIST.map(([key, label]) => ({
    key,
    label,
    status: "Not Checked",
    note: "",
  }));
}

function signTechnician(technician) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      sub: technician._id.toString(),
      kind: "field-technician",
      role: technician.role,
      name: technician.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );
}

function authenticateField(req, res, next) {
  try {
    const auth = req.headers.authorization || "";

    if (!auth.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = auth.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.kind !== "field-technician") {
      return res.status(403).json({ error: "Invalid field-service token" });
    }

    req.fieldUser = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function hasAccessToWorkOrder(req, workOrder) {
  if (["Supervisor", "Admin"].includes(req.fieldUser.role)) return true;

  return workOrder.assignedTechnicians.some(
    (id) => id.toString() === req.fieldUser.sub
  );
}

function cleanTechnician(doc) {
  const item = doc.toObject ? doc.toObject() : { ...doc };
  delete item.passwordHash;
  return item;
}

async function nextWorkOrderNumber() {
  const year = new Date().getFullYear();
  const prefix = `WO-${year}-`;

  const last = await FieldWorkOrder.findOne({
    workOrderNumber: { $regex: `^${prefix}` },
  })
    .sort({ workOrderNumber: -1 })
    .lean();

  const previous = last
    ? parseInt(last.workOrderNumber.slice(prefix.length), 10) || 0
    : 0;

  return `${prefix}${String(previous + 1).padStart(5, "0")}`;
}

function register(app) {
  app.post("/api/field/login", async (req, res) => {
    try {
      const email = String(req.body.email || "").trim().toLowerCase();
      const password = String(req.body.password || "");

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const technician = await FieldTechnician.findOne({ email });

      if (!technician || !technician.active) {
        return res.status(401).json({ error: "Invalid login" });
      }

      const valid = await bcrypt.compare(password, technician.passwordHash);

      if (!valid) {
        return res.status(401).json({ error: "Invalid login" });
      }

      res.json({
        token: signTechnician(technician),
        technician: cleanTechnician(technician),
      });
    } catch (err) {
      console.error("Field login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/field/me", authenticateField, async (req, res) => {
    try {
      const technician = await FieldTechnician.findById(req.fieldUser.sub);

      if (!technician || !technician.active) {
        return res.status(404).json({ error: "Technician not found" });
      }

      res.json(cleanTechnician(technician));
    } catch (err) {
      res.status(500).json({ error: "Unable to load technician profile" });
    }
  });

  app.get("/api/field/work-orders", authenticateField, async (req, res) => {
    try {
      const query = ["Supervisor", "Admin"].includes(req.fieldUser.role)
        ? {}
        : { assignedTechnicians: req.fieldUser.sub };

      if (req.query.status) query.status = req.query.status;

      const workOrders = await FieldWorkOrder.find(query)
        .populate("equipment")
        .populate("assignedTechnicians", "name email phone role")
        .sort({ scheduledFor: 1, createdAt: -1 });

      res.json(workOrders);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Unable to load work orders" });
    }
  });

  app.get("/api/field/work-orders/:id", authenticateField, async (req, res) => {
    try {
      const workOrder = await FieldWorkOrder.findById(req.params.id)
        .populate("equipment")
        .populate("assignedTechnicians", "name email phone role");

      if (!workOrder) {
        return res.status(404).json({ error: "Work order not found" });
      }

      if (!hasAccessToWorkOrder(req, workOrder)) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(workOrder);
    } catch (err) {
      res.status(400).json({ error: "Invalid work order ID" });
    }
  });

  app.patch(
    "/api/field/work-orders/:id/status",
    authenticateField,
    async (req, res) => {
      try {
        const allowed = [
          "Assigned",
          "In Progress",
          "Needs Follow-up",
          "Completed",
        ];

        const status = req.body.status;

        if (!allowed.includes(status)) {
          return res.status(400).json({ error: "Invalid technician status" });
        }

        const workOrder = await FieldWorkOrder.findById(req.params.id);

        if (!workOrder) {
          return res.status(404).json({ error: "Work order not found" });
        }

        if (!hasAccessToWorkOrder(req, workOrder)) {
          return res.status(403).json({ error: "Access denied" });
        }

        workOrder.status = status;

        if (status === "In Progress" && !workOrder.startedAt) {
          workOrder.startedAt = new Date();
        }

        if (status === "Completed") {
          workOrder.completedAt = new Date();
        }

        await workOrder.save();
        res.json(workOrder);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Unable to update status" });
      }
    }
  );

  app.patch(
    "/api/field/work-orders/:id/service",
    authenticateField,
    async (req, res) => {
      try {
        const workOrder = await FieldWorkOrder.findById(req.params.id);

        if (!workOrder) {
          return res.status(404).json({ error: "Work order not found" });
        }

        if (!hasAccessToWorkOrder(req, workOrder)) {
          return res.status(403).json({ error: "Access denied" });
        }

        const allowedFields = [
          "generatorReadings",
          "checklist",
          "materialsUsed",
          "recommendations",
          "photos",
          "technicianNotes",
          "customerSignature",
          "technicianSignature",
          "customerSignedAt",
          "technicianSignedAt",
        ];

        for (const field of allowedFields) {
          if (Object.prototype.hasOwnProperty.call(req.body, field)) {
            workOrder[field] = req.body[field];
          }
        }

        await workOrder.save();
        res.json(workOrder);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Unable to save service data" });
      }
    }
  );

  app.get("/api/field/equipment/:id", authenticateField, async (req, res) => {
    try {
      const equipment = await FieldEquipment.findById(req.params.id);

      if (!equipment) {
        return res.status(404).json({ error: "Equipment not found" });
      }

      const history = await FieldWorkOrder.find({ equipment: equipment._id })
        .select(
          "workOrderNumber jobType status scheduledFor completedAt recommendations technicianNotes"
        )
        .sort({ completedAt: -1, scheduledFor: -1 })
        .limit(25);

      res.json({ equipment, history });
    } catch (err) {
      res.status(400).json({ error: "Invalid equipment ID" });
    }
  });

  app.get(
    "/api/field/equipment/by-qr/:qrCode",
    authenticateField,
    async (req, res) => {
      try {
        const equipment = await FieldEquipment.findOne({
          qrCode: req.params.qrCode,
          active: true,
        });

        if (!equipment) {
          return res.status(404).json({ error: "Equipment not found" });
        }

        res.json(equipment);
      } catch (err) {
        res.status(500).json({ error: "Unable to load equipment" });
      }
    }
  );

  app.post("/api/field/admin/work-orders", authenticateField, async (req, res) => {
    if (!["Supervisor", "Admin"].includes(req.fieldUser.role)) {
      return res.status(403).json({ error: "Supervisor or Admin required" });
    }

    try {
      const workOrderNumber =
        req.body.workOrderNumber || (await nextWorkOrderNumber());

      const workOrder = new FieldWorkOrder({
        ...req.body,
        workOrderNumber,
        checklist:
          Array.isArray(req.body.checklist) && req.body.checklist.length
            ? req.body.checklist
            : makeChecklist(),
      });

      await workOrder.save();
      res.status(201).json(workOrder);
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err.message || "Unable to create work order" });
    }
  });

  app.post("/api/field/admin/equipment", authenticateField, async (req, res) => {
    if (!["Supervisor", "Admin"].includes(req.fieldUser.role)) {
      return res.status(403).json({ error: "Supervisor or Admin required" });
    }

    try {
      const equipment = new FieldEquipment(req.body);
      await equipment.save();
      res.status(201).json(equipment);
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err.message || "Unable to create equipment" });
    }
  });

  console.log("TSB Field Service API registered");
}

module.exports = {
  register,
  models: {
    FieldTechnician,
    FieldEquipment,
    FieldWorkOrder,
  },
  helpers: {
    makeChecklist,
    nextWorkOrderNumber,
  },
};
