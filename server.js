const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Delivery quote backend is running.");
});

function yesNo(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return value || "Not provided";
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

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.QUOTE_RECEIVER_EMAIL,
      subject: `New Pickup & Delivery Quote Request - ${data.customerName || "Customer"}`,
      html: `
        <h2>New Pickup & Delivery Quote Request</h2>

        <h3>Customer Information</h3>
        <p><strong>Customer Name:</strong> ${data.customerName || "Not provided"}</p>
        <p><strong>Phone:</strong> ${data.phone || data.customerPhone || "Not provided"}</p>
        <p><strong>Email:</strong> ${data.email || data.customerEmail || "Not provided"}</p>
        <p><strong>Preferred Contact Method:</strong> ${data.contactMethod || "Not provided"}</p>

        <h3>Store / Pickup Information</h3>
        <p><strong>Store / Seller Name:</strong> ${data.sellerName || data.storeName || "Not provided"}</p>
        <p><strong>Order Number / Pickup Number:</strong> ${data.orderNumber || "Not provided"}</p>
        <p><strong>Pickup Address:</strong> ${data.pickup || data.pickupAddress || "Not provided"}</p>
        <p><strong>Pickup Date:</strong> ${data.pickupDate || "Not provided"}</p>
        <p><strong>Pickup Time:</strong> ${data.pickupTime || "Not provided"}</p>
        <p><strong>Already Paid:</strong> ${data.isPaid || "Not provided"}</p>
        <p><strong>Item Ready For Pickup:</strong> ${data.pickupReady || "Not provided"}</p>
        <p><strong>Pickup Instructions:</strong> ${data.pickupInstructions || "None"}</p>
        <p><strong>Pickup Authorization Agreement:</strong> ${yesNo(data.authorizationAgreement)}</p>

        <h3>Drop-Off Information</h3>
        <p><strong>Drop-Off Address:</strong> ${data.dropoff || data.deliveryAddress || "Not provided"}</p>
        <p><strong>Delivery Date:</strong> ${data.deliveryDate || "Not provided"}</p>
        <p><strong>Delivery Time:</strong> ${data.deliveryTime || "Not provided"}</p>
        <p><strong>Drop-Off Location Type:</strong> ${data.deliveryLocationType || "Not provided"}</p>
        <p><strong>Someone Present At Delivery:</strong> ${data.someonePresent || "Not provided"}</p>
        <p><strong>Drop-Off Instructions:</strong> ${data.deliveryInstructions || "None"}</p>
        <p><strong>Unattended Drop-Off Agreement:</strong> ${yesNo(data.dropoffAgreement)}</p>
        <p><strong>Signature Required:</strong> ${data.signatureRequired || "No"}</p>

        <h3>Item Information</h3>
        <p><strong>Item Category:</strong> ${data.itemCategory || "Not provided"}</p>
        <p><strong>Item Count:</strong> ${data.itemCount || "Not provided"}</p>
        <p><strong>Item Description:</strong> ${data.description || data.itemDescription || "Not provided"}</p>
        <p><strong>Estimated Weight:</strong> ${data.estimatedWeight || "Not provided"}</p>
        <p><strong>Large / Oversized Item:</strong> ${data.largeItem || "Not provided"}</p>
        <p><strong>Fragile:</strong> ${data.fragile || "Not provided"}</p>
        <p><strong>Stairs:</strong> ${data.stairs || "Not provided"}</p>

        <h3>Quote & Pricing Breakdown</h3>
        <p><strong>Loaded Miles:</strong> ${data.loadedMiles || "Not calculated"}</p>
        <p><strong>Estimated Drive Time:</strong> ${data.estimatedDriveTime || "Not calculated"}</p>
        <p><strong>Billable Deadhead Miles:</strong> ${data.deadheadMiles || "Not calculated"}</p>

        <p><strong>Base Rate:</strong> $${data.baseRate || "0.00"}</p>
        <p><strong>Loaded Mileage Charge:</strong> $${data.loadedMileageCharge || "0.00"}</p>
        <p><strong>Deadhead Charge:</strong> $${data.deadheadCharge || "0.00"}</p>
        <p><strong>Item Category Fee:</strong> $${data.categoryFee || "0.00"}</p>
        <p><strong>Weight Fee:</strong> $${data.weightFee || "0.00"}</p>
        <p><strong>Stairs Fee:</strong> $${data.stairsFee || "0.00"}</p>
        <p><strong>Large Item Fee:</strong> $${data.largeItemFee || "0.00"}</p>
        <p><strong>Fragile Fee:</strong> $${data.fragileFee || "0.00"}</p>
        <p><strong>Signature Fee:</strong> $${data.signatureFee || "0.00"}</p>
        <p><strong>Additional Items Fee:</strong> $${data.additionalItemsFee || "0.00"}</p>

        <h2>Total Quote: ${data.quoteAmount || "$" + (data.estimatedQuote || "0.00")}</h2>

        <h3>Customer Agreements</h3>
        <p><strong>Accuracy Agreement:</strong> ${yesNo(data.accuracyAgreement)}</p>
        <p><strong>Quote Agreement:</strong> ${yesNo(data.quoteAgreement)}</p>
        <p><strong>Contact Agreement:</strong> ${yesNo(data.contactAgreement)}</p>
      `
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
