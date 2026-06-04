const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)
    : null;

app.get("/", (req, res) => {
  res.send("Delivery quote backend is running.");
});

function value(input) {
  return input === undefined || input === null || input === ""
    ? "Not provided"
    : input;
}

function generateTrackingNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `LC-${datePart}-${randomPart}`;
}

function isFreightQuote(data) {
  return (
    data.formType === "Business & Expedited Freight Quote Request" ||
    data.businessName ||
    data.freightDescription
  );
}

async function saveQuoteToSupabase(data, trackingNumber, freightForm) {
  if (!supabase) {
    console.warn("Supabase is not configured.");
    return;
  }

  const record = {
    tracking_number: trackingNumber,
    form_type: freightForm ? "freight" : "delivery",
    customer_name: data.customerName || data.contactPerson || null,
    business_name: data.businessName || null,
    phone: data.phone || data.customerPhone || null,
    email: data.email || data.customerEmail || null,
    pickup_address: data.pickupAddress || data.pickup || null,
    delivery_address: data.deliveryAddress || data.dropoff || null,
    quote_amount: data.quoteAmount || data.estimatedQuote || null,
    status: "Quote Submitted",
    payment_status: "Payment Link Not Sent",
    delivery_status: "Not Scheduled",
    full_request: data
  };

  const { error } = await supabase
    .from("quote_requests")
    .insert([record]);

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }
}

function buildFreightEmail(data, trackingNumber) {
  return `
    <h2>New Business & Expedited Freight Quote Request</h2>

    <h3>Tracking</h3>
    <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
    <p><strong>Status:</strong> Quote Submitted</p>

    <h3>Business Information</h3>
    <p><strong>Business Name:</strong> ${value(data.businessName)}</p>
    <p><strong>Contact Person:</strong> ${value(data.contactPerson)}</p>
    <p><strong>Phone:</strong> ${value(data.phone)}</p>
    <p><strong>Email:</strong> ${value(data.email)}</p>
    <p><strong>Business Type:</strong> ${value(data.businessType)}</p>

    <h3>Pickup Information</h3>
    <p><strong>Pickup Address:</strong> ${value(data.pickupAddress)}</p>
    <p><strong>Pickup Date:</strong> ${value(data.pickupDate)}</p>
    <p><strong>Pickup Time Window:</strong> ${value(data.pickupTime)}</p>
    <p><strong>Dock Available:</strong> ${value(data.pickupDock)}</p>
    <p><strong>Forklift Available:</strong> ${value(data.forklift)}</p>
    <p><strong>Pickup Instructions:</strong> ${value(data.pickupInstructions)}</p>

    <h3>Delivery Information</h3>
    <p><strong>Delivery Address:</strong> ${value(data.deliveryAddress)}</p>
    <p><strong>Delivery Date:</strong> ${value(data.deliveryDate)}</p>
    <p><strong>Delivery Time Window:</strong> ${value(data.deliveryTime)}</p>
    <p><strong>Delivery Dock Available:</strong> ${value(data.deliveryDock)}</p>
    <p><strong>Delivery Type:</strong> ${value(data.deliveryType)}</p>
    <p><strong>Delivery Instructions:</strong> ${value(data.deliveryInstructions)}</p>

    <h3>Freight Details</h3>
    <p><strong>Freight Description:</strong> ${value(data.freightDescription)}</p>
    <p><strong>Pieces:</strong> ${value(data.pieces)}</p>
    <p><strong>Freight Value:</strong> $${value(data.freightValue)}</p>
    <p><strong>Dimensions:</strong> ${value(data.length)}L x ${value(data.width)}W x ${value(data.height)}H inches</p>
    <p><strong>Stackable:</strong> ${value(data.stackable)}</p>

    <h3>Pricing Details</h3>
    <p><strong>Loaded Miles:</strong> ${value(data.miles)}</p>
    <p><strong>Service Speed:</strong> ${value(data.serviceSpeed)}</p>
    <p><strong>Stops:</strong> ${value(data.stops)}</p>
    <p><strong>Vehicle:</strong> ${value(data.serviceVehicle)}</p>
    <h2><strong>Estimated Quote:</strong> ${value(data.quoteAmount)}</h2>

    <h3>Special Requirements</h3>
    <p><strong>Inside Pickup:</strong> ${value(data.insidePickup)}</p>
    <p><strong>Inside Delivery:</strong> ${value(data.insideDelivery)}</p>
    <p><strong>Stairs:</strong> ${value(data.stairs)}</p>
    <p><strong>Driver Assist:</strong> ${value(data.driverAssist)}</p>
    <p><strong>TWIC Required:</strong> ${value(data.twic)}</p>
    <p><strong>Fragile:</strong> ${value(data.fragile)}</p>
    <p><strong>High Value:</strong> ${value(data.highValue)}</p>
    <p><strong>Proof of Delivery:</strong> ${value(data.proofDelivery)}</p>
    <p><strong>Signature Required:</strong> ${value(data.signature)}</p>
    <p><strong>Return Trip:</strong> ${value(data.returnTrip)}</p>

    <h3>Agreement</h3>
    <p><strong>Quote Estimate Agreement:</strong> ${value(data.quoteEstimateAgreement)}</p>

    <h3>Additional Notes</h3>
    <p>${value(data.notes)}</p>
  `;
}

function buildDeliveryEmail(data, trackingNumber) {
  return `
    <h2>New Pickup & Delivery Quote Request</h2>

    <h3>Tracking</h3>
    <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
    <p><strong>Status:</strong> Quote Submitted</p>

    <h3>Customer Information</h3>
    <p><strong>Name:</strong> ${value(data.customerName)}</p>
    <p><strong>Phone:</strong> ${value(data.phone || data.customerPhone)}</p>
    <p><strong>Email:</strong> ${value(data.email || data.customerEmail)}</p>

    <h3>Pickup / Drop-Off</h3>
    <p><strong>Pickup:</strong> ${value(data.pickup || data.pickupAddress)}</p>
    <p><strong>Drop-Off:</strong> ${value(data.dropoff || data.deliveryAddress)}</p>
    <p><strong>Pickup Date:</strong> ${value(data.pickupDate)}</p>
    <p><strong>Pickup Time:</strong> ${value(data.pickupTime)}</p>
    <p><strong>Delivery Date:</strong> ${value(data.deliveryDate)}</p>
    <p><strong>Delivery Time:</strong> ${value(data.deliveryTime)}</p>

    <h3>Item Information</h3>
    <p><strong>Description:</strong> ${value(data.description || data.itemDescription)}</p>
    <p><strong>Category:</strong> ${value(data.itemCategory)}</p>
    <p><strong>Weight:</strong> ${value(data.estimatedWeight)}</p>
    <p><strong>Stairs:</strong> ${value(data.stairs)}</p>
    <p><strong>Signature Required:</strong> ${value(data.signatureRequired)}</p>

    <h2><strong>Estimated Quote:</strong> ${value(data.quoteAmount)}</h2>
  `;
}

app.post("/api/submit-quote", async (req, res) => {
  try {
    const data = req.body;
    const trackingNumber = generateTrackingNumber();
    const freightForm = isFreightQuote(data);

    await saveQuoteToSupabase(data, trackingNumber, freightForm);

    const emailHtml = freightForm
      ? buildFreightEmail(data, trackingNumber)
      : buildDeliveryEmail(data, trackingNumber);

    const subject = freightForm
      ? `New Freight Quote Request ${trackingNumber} - ${value(data.businessName)}`
      : `New Delivery Quote Request ${trackingNumber} - ${value(data.customerName)}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.QUOTE_RECEIVER_EMAIL,
      subject,
      html: emailHtml
    });

    res.json({
      success: true,
      trackingNumber
    });

  } catch (error) {
    console.error("Submit quote error:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
