const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Delivery quote backend is running.");
});

function value(data) {
  return data || "Not provided";
}

app.post("/api/submit-quote", async (req, res) => {
  try {
    const data = req.body;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const isFreightForm =
      data.formType === "Business & Expedited Freight Quote Request" ||
      data.businessName ||
      data.freightDescription;

    const subject = isFreightForm
      ? `New Freight Quote Request - ${value(data.businessName)}`
      : `New Delivery Quote Request - ${value(data.customerName)}`;

    const html = isFreightForm
      ? `
        <h2>New Business & Expedited Freight Quote Request</h2>

        <h3>Customer / Business Information</h3>
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
        <p><strong>Number of Pieces:</strong> ${value(data.pieces)}</p>
        <p><strong>Estimated Freight Value:</strong> $${value(data.freightValue)}</p>
        <p><strong>Length:</strong> ${value(data.length)} inches</p>
        <p><strong>Width:</strong> ${value(data.width)} inches</p>
        <p><strong>Height:</strong> ${value(data.height)} inches</p>
        <p><strong>Stackable:</strong> ${value(data.stackable)}</p>

        <h3>Pricing Details</h3>
        <p><strong>Estimated Loaded Miles:</strong> ${value(data.miles)}</p>
        <p><strong>Service Speed:</strong> ${value(data.serviceSpeed)}</p>
        <p><strong>Number of Stops:</strong> ${value(data.stops)}</p>
        <p><strong>Service Vehicle:</strong> ${value(data.serviceVehicle)}</p>
        <h2><strong>Estimated Quote:</strong> ${value(data.quoteAmount)}</h2>

        <h3>Special Requirements</h3>
        <p><strong>Inside Pickup:</strong> ${value(data.insidePickup)}</p>
        <p><strong>Inside Delivery:</strong> ${value(data.insideDelivery)}</p>
        <p><strong>Stairs Required:</strong> ${value(data.stairs)}</p>
        <p><strong>Driver Assist:</strong> ${value(data.driverAssist)}</p>
        <p><strong>TWIC Access Required:</strong> ${value(data.twic)}</p>
        <p><strong>Fragile Freight:</strong> ${value(data.fragile)}</p>
        <p><strong>High-Value Freight:</strong> ${value(data.highValue)}</p>
        <p><strong>Proof of Delivery Required:</strong> ${value(data.proofDelivery)}</p>
        <p><strong>Signature Required:</strong> ${value(data.signature)}</p>
        <p><strong>Return Trip Needed:</strong> ${value(data.returnTrip)}</p>

        <h3>Additional Notes</h3>
        <p>${value(data.notes)}</p>
      `
      : `
        <h2>New Delivery Quote Request</h2>

        <p><strong>Customer Name:</strong> ${value(data.customerName)}</p>
        <p><strong>Phone:</strong> ${value(data.phone || data.customerPhone)}</p>
        <p><strong>Email:</strong> ${value(data.email || data.customerEmail)}</p>
        <p><strong>Pickup:</strong> ${value(data.pickup || data.pickupAddress)}</p>
        <p><strong>Dropoff:</strong> ${value(data.dropoff || data.deliveryAddress)}</p>
        <p><strong>Pickup Date:</strong> ${value(data.pickupDate)}</p>
        <p><strong>Pickup Time:</strong> ${value(data.pickupTime)}</p>
        <p><strong>Delivery Date:</strong> ${value(data.deliveryDate)}</p>
        <p><strong>Delivery Time:</strong> ${value(data.deliveryTime)}</p>
        <p><strong>Item Description:</strong> ${value(data.description || data.itemDescription)}</p>
        <h2><strong>Estimated Quote:</strong> ${value(data.quoteAmount)}</h2>
      `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.QUOTE_RECEIVER_EMAIL,
      subject,
      html
    });

    res.json({ success: true });

  } catch (error) {
    console.error("Email error:", error);
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
