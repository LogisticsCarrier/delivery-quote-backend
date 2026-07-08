const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const { createClient } = require("@supabase/supabase-js");

const app = express();

const PORT = process.env.PORT || 10000;

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const QUOTE_RECEIVER_EMAIL =
  process.env.QUOTE_RECEIVER_EMAIL || EMAIL_USER;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED_ORIGINS = [
  "https://logistics-carrier.com",
  "https://www.logistics-carrier.com"
];

app.use(
  cors({
    origin: function (origin, callback) {
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

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

const supabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_SECRET_KEY || "placeholder-key",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

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

function ensureServerSettings() {
  const missing = [];

  if (!EMAIL_USER) missing.push("EMAIL_USER");
  if (!EMAIL_PASS) missing.push("EMAIL_PASS");
  if (!QUOTE_RECEIVER_EMAIL) missing.push("QUOTE_RECEIVER_EMAIL");
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SUPABASE_SECRET_KEY) missing.push("SUPABASE_SECRET_KEY");

  if (missing.length > 0) {
    throw new Error(
      `Missing Render environment variables: ${missing.join(", ")}`
    );
  }
}

function sendEmail(subject, text, replyTo) {
  return transporter.sendMail({
    from: `"Logistics Carrier LLC" <${EMAIL_USER}>`,
    to: QUOTE_RECEIVER_EMAIL,
    replyTo: replyTo || EMAIL_USER,
    subject,
    text
  });
}

function moneyToNumber(value) {
  const numberValue = Number(
    String(value || "")
      .replace("$", "")
      .replace(",", "")
      .trim()
  );

  return Number.isNaN(numberValue) ? null : numberValue;
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
Preferred Pickup Window: ${clean(data.pickupWindow || data.preferredPickupWindow)}
Item Paid For: ${clean(data.isPaid)}
Pickup Ready: ${clean(data.pickupReady)}
Pickup Instructions: ${clean(data.pickupInstructions)}

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
Distance Surcharge Miles: ${clean(data.distanceSurchargeMiles || data.deadheadMiles)}
Distance Surcharge Charge: $${clean(data.distanceSurchargeCharge || data.deadheadCharge || "0.00")}
Base Rate: $${clean(data.baseRate || "0.00")}
Loaded Mileage Charge: $${clean(data.loadedMileageCharge || "0.00")}
Additional Items Fee: $${clean(data.additionalItemsFee || "0.00")}

==================================================
ELECTRONIC SIGNATURE
==================================================

Typed Electronic Signature: ${clean(data.signatureName)}
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
TWIC Support: ${clean(data.twicSupport)}

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

Typed Authorized Signature: ${clean(data.authorizedSignatureName)}
Signed At: ${clean(data.signedAt)}
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
    ensureServerSettings();

    const data = req.body || {};
    const validationError = validateQuote(data);

    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError
      });
    }

    const trackingNumber = generateReferenceNumber("LC");

    const estimatedQuoteNumber = moneyToNumber(
      data.quoteAmount || data.estimatedQuote
    );

    const { error: supabaseError } = await supabase
      .from("quote_requests")
      .insert({
        tracking_number: trackingNumber,
        form_type: data.formType || "Pickup & Delivery Quote Request",

        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        customer_email: data.customerEmail,
        contact_method: data.contactMethod,

        store_name: data.storeName,
        order_number: data.orderNumber || null,

        pickup_address: data.pickupAddress,
        pickup_date: data.pickupDate,
        pickup_window: data.pickupWindow,
        pickup_state: data.pickupState || null,

        delivery_address: data.deliveryAddress,
        delivery_state: data.deliveryState || null,
        delivery_type: data.deliveryDistanceType || null,
        delivery_location_type: data.deliveryLocationType,
        someone_present: data.someonePresent,
        delivery_instructions: data.deliveryInstructions,

        loaded_miles: Number(data.loadedMiles) || null,
        estimated_drive_time: data.estimatedDriveTime || null,
        distance_surcharge_miles:
          Number(data.distanceSurchargeMiles || data.deadheadMiles) || null,
        distance_surcharge_charge:
          Number(data.distanceSurchargeCharge || data.deadheadCharge) || null,

        base_rate: Number(data.baseRate) || null,
        loaded_mileage_charge: Number(data.loadedMileageCharge) || null,
        additional_items_fee: Number(data.additionalItemsFee) || null,

        estimated_quote: estimatedQuoteNumber,
        quote_amount: data.quoteAmount || data.estimatedQuote || null,

        status: "Quote Submitted",
        payment_status: "Payment Link Not Sent",
        delivery_status: "Not Scheduled",

        signature_name: data.signatureName,
        signed_at: data.signedAt || new Date().toISOString(),

        form_data: data
      });

    if (supabaseError) {
      throw new Error(`Supabase error: ${supabaseError.message}`);
    }

    try {
      await sendEmail(
        `New Delivery Quote Request — ${trackingNumber}`,
        buildQuoteEmail(data, trackingNumber),
        data.customerEmail
      );
    } catch (emailError) {
      console.error("Quote saved, but email failed:", emailError.message);
    }

    return res.status(201).json({
      success: true,
      message: "Quote request submitted successfully.",
      trackingNumber
    });

  } catch (error) {
    console.error("Quote request error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Unable to submit quote request. Please try again."
    });
  }
});

app.post("/api/submit-commercial-account", async (req, res) => {
  try {
    ensureServerSettings();

    const data = req.body || {};
    const validationError = validateCommercialAccount(data);

    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError
      });
    }

    const accountReference = generateReferenceNumber("BIZ");

    const { error: supabaseError } = await supabase
      .from("commercial_account_requests")
      .insert({
        account_reference: accountReference,
        business_name: data.businessName,
        business_type: data.businessType,
        business_address: data.businessAddress,
        business_city: data.businessCity,
        business_state: data.businessState,
        business_zip: data.businessZip,
        business_phone: data.phone,
        business_email: data.email,
        contact_person: data.contactPerson,
        contact_email: data.contactEmail,
        contact_phone: data.mobileNumber,
        contact_method: data.contactMethod,
        delivery_types: data.deliveryTypes,
        delivery_area: data.deliveryArea,
        estimated_deliveries: data.estimatedDeliveries,
        billing_method: data.billingMethod,
        delivery_needs: data.deliveryNeeds,
        authorized_signature_name: data.authorizedSignatureName,
        signed_at: data.signedAt || new Date().toISOString(),
        status: "Commercial Account Request Submitted",
        form_data: data
      });

    if (supabaseError) {
      throw new Error(`Supabase error: ${supabaseError.message}`);
    }

    try {
      await sendEmail(
        `New Commercial Account Request — ${accountReference}`,
        buildCommercialEmail(data, accountReference),
        data.contactEmail || data.email
      );
    } catch (emailError) {
      console.error(
        "Commercial account saved, but email failed:",
        emailError.message
      );
    }

    return res.status(201).json({
      success: true,
      message: "Commercial account request submitted successfully.",
      accountReference
    });

  } catch (error) {
    console.error("Commercial account request error:", error);

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "Unable to submit commercial account request. Please try again."
    });
  }
});

/*
  TRACKING LOOKUP ROUTE

  This route lets your tracking page search Supabase by tracking number.
  Your tracking page calls:
  https://delivery-quote-backend-5bxl.onrender.com/api/track/LC-XXXXXXXX-XXXXXX
*/
app.get("/api/track/:trackingNumber", async (req, res) => {
  try {
    ensureServerSettings();

    const trackingNumber = String(req.params.trackingNumber || "")
      .trim()
      .toUpperCase();

    if (!trackingNumber) {
      return res.status(400).json({
        success: false,
        error: "Tracking number is required."
      });
    }

    const { data, error } = await supabase
      .from("quote_requests")
      .select(`
        tracking_number,
        customer_name,
        pickup_address,
        delivery_address,
        status,
        payment_status,
        delivery_status,
        estimated_quote,
        quote_amount,
        created_at,
        form_data
      `)
      .eq("tracking_number", trackingNumber)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: "Tracking number not found."
      });
    }

    return res.status(200).json({
      success: true,
      tracking: {
        tracking_number: data.tracking_number,
        customer_name: data.customer_name,
        pickup_address: data.pickup_address,
        delivery_address: data.delivery_address,
        status: data.status || "Quote Submitted",
        payment_status: data.payment_status || "Payment Link Not Sent",
        delivery_status: data.delivery_status || "Not Scheduled",
        estimated_quote: data.estimated_quote,
        quote_amount: data.quote_amount,
        created_at: data.created_at,
        pod_photo_url: data.form_data?.pod_photo_url || null
      }
    });

  } catch (error) {
    console.error("Tracking lookup error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Unable to look up tracking information."
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
