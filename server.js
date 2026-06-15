const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 10000;

function generateTrackingNumber() {
  const date = new Date();
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `LC-${yyyymmdd}-${random}`;
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Logistics Carrier LLC backend is running"
  });
});

app.post("/api/submit-quote", async (req, res) => {
  try {
    const data = req.body;
    const trackingNumber = generateTrackingNumber();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const emailBody = `
NEW QUOTE REQUEST
Tracking Number: ${trackingNumber}

FORM TYPE:
${data.formType || "Pickup & Delivery Quote Request"}

CUSTOMER INFORMATION
Name: ${data.customerName || data.businessName || "N/A"}
Phone: ${data.phone || data.customerPhone || "N/A"}
Email: ${data.email || data.customerEmail || "N/A"}
Preferred Contact: ${data.contactMethod || "N/A"}

STORE / PICKUP INFORMATION
Store / Seller: ${data.sellerName || data.storeName || "N/A"}
Order Number: ${data.orderNumber || "N/A"}
Pickup Address: ${data.pickup || data.pickupAddress || "N/A"}
Pickup Date: ${data.pickupDate || "N/A"}
Pickup Time: ${data.pickupTime || "N/A"}
Pickup Ready: ${data.pickupReady || "N/A"}
Item Paid For: ${data.isPaid || "N/A"}
Pickup Instructions: ${data.pickupInstructions || "N/A"}

DROP-OFF INFORMATION
Drop-Off Address: ${data.dropoff || data.deliveryAddress || "N/A"}
Delivery Date: ${data.deliveryDate || "N/A"}
Delivery Time: ${data.deliveryTime || "N/A"}
Delivery Location Type: ${data.deliveryLocationType || "N/A"}
Delivery Distance Type: ${data.deliveryDistanceType || "N/A"}
Someone Present: ${data.someonePresent || "N/A"}
Drop-Off Instructions: ${data.deliveryInstructions || "N/A"}
Drop-Off Agreement: ${data.dropoffAgreement || "N/A"}

ITEM INFORMATION
Item Category: ${data.itemCategory || "N/A"}
Main Description: ${data.description || data.itemDescription || "N/A"}
Number of Items: ${data.itemCount || "N/A"}
Total Pickup Item Quantity: ${data.totalPickupItemQuantity || "N/A"}
Pickup Item Details: ${data.pickupItemsText || "N/A"}
Estimated Weight: ${data.estimatedWeight || "N/A"}
Fragile: ${data.fragile || "N/A"}
Stairs: ${data.stairs || "N/A"}

QUOTE CALCULATION
Quote Amount: ${data.quoteAmount || "N/A"}
Loaded Miles: ${data.loadedMiles || "N/A"}
Estimated Drive Time: ${data.estimatedDriveTime || "N/A"}
Distance Surcharge Miles: ${data.distanceSurchargeMiles || data.deadheadMiles || "N/A"}
Distance Surcharge Charge: $${data.distanceSurchargeCharge || data.deadheadCharge || "0.00"}
Base Rate: $${data.baseRate || "0.00"}
Loaded Mileage Charge: $${data.loadedMileageCharge || "0.00"}
Weight Fee: $${data.weightFee || "0.00"}
Stairs Fee: $${data.stairsFee || "0.00"}
Fragile Fee: $${data.fragileFee || "0.00"}
Additional Items Fee: $${data.additionalItemsFee || "0.00"}

AGREEMENTS
Pickup Authorization: ${data.authorizationAgreement || "N/A"}
Accuracy Agreement: ${data.accuracyAgreement || "N/A"}
Quote Agreement: ${data.quoteAgreement || "N/A"}
Contact Agreement: ${data.contactAgreement || "N/A"}
Cancellation Agreement: ${data.cancellationAgreement || "N/A"}
Refund Agreement: ${data.refundAgreement || "N/A"}
Non-Refundable Agreement: ${data.nonRefundableAgreement || "N/A"}

TRACKING DEFAULTS
Status: Quote Submitted
Payment Status: Payment Link Not Sent
Delivery Status: Not Scheduled
`;

    await transporter.sendMail({
      from: `"Logistics Carrier LLC" <${process.env.EMAIL_USER}>`,
      to: process.env.QUOTE_RECEIVER_EMAIL || process.env.EMAIL_USER,
      subject: `New Quote Request - ${trackingNumber}`,
      text: emailBody
    });

    res.json({
      success: true,
      message: "Quote request submitted successfully",
      trackingNumber
    });

  } catch (error) {
    console.error("Submit quote error:", error);

    res.status(500).json({
      success: false,
      error: error.message || "Unable to submit quote request"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
