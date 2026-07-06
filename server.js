const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();

const PORT = process.env.PORT || 10000;

// Your live website domains allowed to send requests to this backend.
const ALLOWED_ORIGINS = [
  "https://logistics-carrier.com",
  "https://www.logistics-carrier.com"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allows Render checks, Postman, and testing.
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS."));
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
  })
);

app.use(express.json({ limit: "1mb" }));

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const QUOTE_RECEIVER_EMAIL =
  process.env.QUOTE_RECEIVER_EMAIL || EMAIL_USER;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

function clean(value) {
  const text = String(value || "").trim();
  return text || "N/A";
}

function generateReferenceNumber(prefix) {
  const date = new Date();
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(100000 + Math.random() * 900000);

  return `${prefix}-${yyyymmdd}-${random}`;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(email || "").trim()
  );
}

function isValidPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function missingFields(data, fields) {
  return fields.filter((field) => !String(data[field] || "").trim());
}

function formatItems(data) {
  if (Array.isArray(data.pickupItems) && data.pickupItems.length > 0) {
    return data.pickupItems
      .map((item, index) => {
        return `Item ${index + 1}
Quantity: ${clean(item.quantity)}
Description: ${clean(item.description)}
Size / Notes: ${clean(item.notes)}`;
      })
      .join("\n\n");
  }

  return clean(data.pickupItemsText || data.description);
}

function sendEmail(subject, text, replyTo) {
  if (!EMAIL_USER || !EMAIL_PASS || !QUOTE_RECEIVER_EMAIL) {
    throw new Error(
      "Email settings are missing. Add EMAIL_USER, EMAIL_PASS, and QUOTE_RECEIVER_EMAIL in Render."
    );
  }

  return transporter.sendMail({
    from: `"Logistics Carrier LLC" <${EMAIL_USER}>`,
    to: QUOTE_RECEIVER_EMAIL,
    replyTo: replyTo || EMAIL_USER,
    subject,
    text
  });
}

function validateQuote(data) {
  const required = [
    "customerName",
    "customerPhone",
    "customerEmail",
    "contactMethod",
    "storeName",
    "pickupAddress",
    "pickupDate",
    "pickupWindow",
    "deliveryAddress",
    "deliveryLocationType",
    "someonePresent",
    "deliveryInstructions",
    "signatureName"
  ];

  const missing = missingFields(data, required);

  if (missing.length > 0) {
    return `Missing required quote fields: ${missing.join(", ")}`;
  }

  if (!isValidEmail(data.customerEmail)) {
    return "Please enter a valid customer email address.";
  }

  if (!isValidPhone(data.customerPhone)) {
    return "Please enter a valid customer phone number.";
  }

  const requiredAgreements = [
    "authorizationAgreement",
    "accuracyAgreement",
    "quoteAgreement",
    "contactAgreement",
    "cancellationAgreement",
    "refundAgreement",
    "nonRefundableAgreement",
    "electronicSignatureAgreement"
  ];

  for (const agreement of requiredAgreements) {
    if (data[agreement] !== "Yes") {
      return `Required agreement missing: ${agreement}`;
    }
  }

  if (
    ["No", "Not Sure"].includes(data.someonePresent) &&
    data.dropoffAgreement !== "Yes"
  ) {
    return "Unattended drop-off authorization is required.";
  }

  return null;
}

function validateCommercialAccount(data) {
  const required = [
    "businessName",
    "businessType",
    "businessAddress",
    "businessCity",
    "businessState",
    "businessZip",
    "phone",
    "email",
    "numberOfLocations",
    "multipleLocations",
    "contactPerson",
    "mobileNumber",
    "contactEmail",
    "contactMethod",
    "deliveryTypes",
    "deliveryArea",
    "estimatedDeliveries",
    "legalBusinessName",
    "billingAddress",
    "billingCity",
    "billingState",
    "billingZip",
    "billingMethod",
    "deliveryNeeds",
    "authorizedSignatureName"
  ];

  const missing = missingFields(data, required);

  if (missing.length > 0) {
    return `Missing required commercial account fields: ${missing.join(", ")}`;
  }

  if (!isValidEmail(data.email) || !isValidEmail(data.contactEmail)) {
    return "Please enter valid business and contact email addresses.";
  }

  if (!isValidPhone(data.phone) || !isValidPhone(data.mobileNumber)) {
    return "Please enter valid business and mobile phone numbers.";
  }

  if (data.commercialAccountConsent !== "Yes") {
    return "Commercial account consent is required.";
  }

  if (data.electronicSignatureAgreement !== "Yes") {
    return "Electronic signature agreement is required.";
  }

  return null;
}

function buildQuoteEmail(data, trackingNumber) {
  return `
NEW LOGISTICS CARRIER LLC QUOTE REQUEST

Tracking Number: ${trackingNumber}
Submitted At: ${new Date().toLocaleString("en-US")}

==================================================
CUSTOMER INFORMATION
==================================================

Customer Name: ${clean(data.customerName)}
Phone: ${clean(data.customerPhone)}
Email: ${clean(data.customerEmail)}
Preferred Contact Method: ${clean(data.contactMethod)}

==================================================
PICKUP INFORMATION
==================================================

Store / Seller: ${clean(data.storeName || data.sellerName)}
Order Number: ${clean(data.orderNumber)}
Pickup Address: ${clean(data.pickupAddress || data.pickup)}
Preferred Pickup Date: ${clean(data.pickupDate)}
Preferred Pickup Window: ${clean(
  data.pickupWindow || data.preferredPickupWindow
)}
Item Paid For: ${clean(data.isPaid)}
Pickup Ready: ${clean(data.pickupReady)}
Pickup Instructions: ${clean(data.pickupInstructions)}
Pickup Authorization: ${clean(data.authorizationAgreement)}

==================================================
DELIVERY INFORMATION
==================================================

Delivery Address: ${clean(data.deliveryAddress || data.dropoff)}
Pickup State: ${clean(data.pickupState)}
Delivery State: ${clean(data.deliveryState)}
Automatic Delivery Type: ${clean(data.deliveryDistanceType)}
Delivery Location Type: ${clean(data.deliveryLocationType)}
Recipient Present: ${clean(data.someonePresent)}
Delivery Instructions: ${clean(data.deliveryInstructions)}
Unattended Drop-Off Authorization: ${clean(data.dropoffAgreement)}

==================================================
ITEM DETAILS
==================================================

${formatItems(data)}

Total Item Quantity: ${clean(data.totalPickupItemQuantity)}

==================================================
QUOTE CALCULATION
==================================================

Estimated Quote: ${clean(data.quoteAmount || data.estimatedQuote)}
Loaded Miles: ${clean(data.loadedMiles)}
Estimated Drive Time: ${clean(data.estimatedDriveTime)}
Distance Surcharge Miles: ${clean(
  data.distanceSurchargeMiles || data.deadheadMiles
)}
Distance Surcharge Charge: $${clean(
  data.distanceSurchargeCharge || data.deadheadCharge || "0.00"
)}
Base Rate: $${clean(data.baseRate || "0.00")}
Loaded Mileage Charge: $${clean(data.loadedMileageCharge || "0.00")}
Additional Items Fee: $${clean(data.additionalItemsFee || "0.00")}

==================================================
AGREEMENTS & ELECTRONIC SIGNATURE
==================================================

Accuracy Agreement: ${clean(data.accuracyAgreement)}
Quote Agreement: ${clean(data.quoteAgreement)}
Contact Agreement: ${clean(data.contactAgreement)}
Cancellation Agreement: ${clean(data.cancellationAgreement)}
Refund Agreement: ${clean(data.refundAgreement)}
Completed Delivery Non-Refundable Agreement: ${clean(
  data.nonRefundableAgreement
)}
Typed Electronic Signature: ${clean(data.signatureName)}
Electronic Signature Agreement: ${clean(
  data.electronicSignatureAgreement
)}
Signed At: ${clean(data.signedAt)}

==================================================
INITIAL STATUS
==================================================

Status: Quote Submitted
Payment Status: Payment Link Not Sent
Delivery Status: Not Scheduled
`;
}

function buildCommercialEmail(data, accountReference) {
  return `
NEW LOGISTICS CARRIER LLC COMMERCIAL ACCOUNT REQUEST

Account Reference: ${accountReference}
Submitted At: ${new Date().toLocaleString("en-US")}

==================================================
BUSINESS INFORMATION
==================================================

Business Name: ${clean(data.businessName)}
Business Type: ${clean(data.businessType)}
Business Address: ${clean(data.businessAddress)}
Business City: ${clean(data.businessCity)}
Business State: ${clean(data.businessState)}
Business ZIP: ${clean(data.businessZip)}
Business Phone: ${clean(data.phone)}
Business Email: ${clean(data.email)}
Website: ${clean(data.website)}
Number of Locations: ${clean(data.numberOfLocations)}
Multiple Locations Needed: ${clean(data.multipleLocations)}

==================================================
PRIMARY CONTACT
==================================================

Contact Name: ${clean(data.contactPerson)}
Job Title: ${clean(data.jobTitle)}
Mobile Number: ${clean(data.mobileNumber)}
Contact Email: ${clean(data.contactEmail)}
Preferred Contact Method: ${clean(data.contactMethod)}

==================================================
DELIVERY NEEDS
==================================================

Delivery Types: ${clean(data.deliveryTypes)}
Delivery Area: ${clean(data.deliveryArea)}
Estimated Deliveries Per Month: ${clean(data.estimatedDeliveries)}
Typical Items: ${clean(data.typicalItems)}
Item Types: ${clean(data.itemTypes)}
Weight Range: ${clean(data.weightRange)}
Loading Assistance: ${clean(data.loadingAssistance)}
Liftgate Service: ${clean(data.liftgateService)}
TWIC / Secure Access Support: ${clean(data.twicSupport)}

==================================================
BILLING INFORMATION
==================================================

Legal Business Name: ${clean(data.legalBusinessName)}
Billing Address: ${clean(data.billingAddress)}
Billing City: ${clean(data.billingCity)}
Billing State: ${clean(data.billingState)}
Billing ZIP: ${clean(data.billingZip)}
Accounts Payable Contact: ${clean(data.accountsPayableContact)}
Accounts Payable Email: ${clean(data.accountsPayableEmail)}
Billing Method Requested: ${clean(data.billingMethod)}
Invoice Terms Requested: ${clean(data.invoiceTermsRequested)}
Purchase Order Required: ${clean(data.purchaseOrderRequired)}
Tax Exempt: ${clean(data.taxExempt)}

==================================================
FINAL REQUEST
==================================================

Delivery Needs: ${clean(data.deliveryNeeds)}
Lead Source: ${clean(data.leadSource)}
Preferred Start Date: ${clean(data.preferredStartDate)}

==================================================
AUTHORIZED REPRESENTATIVE
==================================================

Commercial Account Consent: ${clean(data.commercialAccountConsent)}
Typed Authorized Signature: ${clean(data.authorizedSignatureName)}
Electronic Signature Agreement: ${clean(
  data.electronicSignatureAgreement
)}
Signed At: ${clean(data.signedAt)}

==================================================
INTERNAL STATUS
==================================================

Status: Commercial Account Request Submitted
Payment Status: Not Applicable
Delivery Status: Not Scheduled
`;
}

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logistics Carrier LLC backend is running"
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy"
  });
});

app.post("/api/submit-quote", async (req, res) => {
  try {
    const data = req.body || {};
    const error = validateQuote(data);

    if (error) {
      return res.status(400).json({
        success: false,
        error
      });
    }

    const trackingNumber = generateReferenceNumber("LC");

    await sendEmail(
      `New Delivery Quote Request — ${trackingNumber}`,
      buildQuoteEmail(data, trackingNumber),
      data.customerEmail
    );

    return res.status(201).json({
      success: true,
      message: "Quote request submitted successfully.",
      trackingNumber
    });
  } catch (error) {
    console.error("Quote request error:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to submit quote request. Please try again."
    });
  }
});

app.post("/api/submit-commercial-account", async (req, res) => {
  try {
    const data = req.body || {};
    const error = validateCommercialAccount(data);

    if (error) {
      return res.status(400).json({
        success: false,
        error
      });
    }

    const accountReference = generateReferenceNumber("BIZ");

    await sendEmail(
      `New Commercial Account Request — ${accountReference}`,
      buildCommercialEmail(data, accountReference),
      data.contactEmail || data.email
    );

    return res.status(201).json({
      success: true,
      message: "Commercial account request submitted successfully.",
      accountReference
    });
  } catch (error) {
    console.error("Commercial account request error:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to submit commercial account request. Please try again."
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found."
  });
});

app.use((error, req, res, next) => {
  console.error("Server error:", error);

  if (error.message === "Origin not allowed by CORS.") {
    return res.status(403).json({
      success: false,
      error: "This website is not authorized to use this API."
    });
  }

  return res.status(500).json({
    success: false,
    error: "Unexpected server error."
  });
});

app.listen(PORT, () => {
  console.log(`Logistics Carrier LLC server running on port ${PORT}`);
});
