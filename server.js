```js
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
NEW LOGISTICS CARRIER LLC REQUEST

Tracking Number: ${trackingNumber}

FORM TYPE
${data.formType || "Quote Request"}

==================================================
CUSTOMER / BUSINESS INFORMATION
==================================================

Business Name: ${data.businessName || "N/A"}
Contact Person: ${data.contactPerson || "N/A"}
Customer Name: ${data.customerName || "N/A"}
Phone: ${data.phone || data.customerPhone || "N/A"}
Email: ${data.email || data.customerEmail || "N/A"}
Preferred Contact: ${data.contactMethod || "N/A"}

==================================================
COMMERCIAL ACCOUNT INFORMATION
==================================================

Business Type: ${data.businessType || "N/A"}
Business Address: ${data.businessAddress || "N/A"}
Business City: ${data.businessCity || "N/A"}
Business State: ${data.businessState || "N/A"}
Business Zip: ${data.businessZip || "N/A"}
Website: ${data.website || "N/A"}
Number of Locations: ${data.numberOfLocations || "N/A"}
Multiple Locations: ${data.multipleLocations || "N/A"}

Job Title: ${data.jobTitle || "N/A"}
Mobile Number: ${data.mobileNumber || "N/A"}
Contact Email: ${data.contactEmail || "N/A"}

Delivery Types: ${data.deliveryTypes || "N/A"}
Delivery Area: ${data.deliveryArea || "N/A"}
Estimated Deliveries Per Month: ${data.estimatedDeliveries || "N/A"}

Typical Items: ${data.typicalItems || "N/A"}
Item Types: ${data.itemTypes || "N/A"}
Weight Range: ${data.weightRange || "N/A"}
Loading Assistance: ${data.loadingAssistance || "N/A"}
Liftgate Service: ${data.liftgateService || "N/A"}
TWIC Support: ${data.twicSupport || "N/A"}

Legal Business Name: ${data.legalBusinessName || "N/A"}
Billing Address: ${data.billingAddress || "N/A"}
Billing City: ${data.billingCity || "N/A"}
Billing State: ${data.billingState || "N/A"}
Billing Zip: ${data.billingZip || "N/A"}
Accounts Payable Contact: ${data.accountsPayableContact || "N/A"}
Accounts Payable Email: ${data.accountsPayableEmail || "N/A"}
Billing Method: ${data.billingMethod || "N/A"}
Purchase Order Required: ${data.purchaseOrderRequired || "N/A"}
Tax Exempt: ${data.taxExempt || "N/A"}

Delivery Needs: ${data.deliveryNeeds || "N/A"}
Lead Source: ${data.leadSource || "N/A"}
Preferred Start Date: ${data.preferredStartDate || "N/A"}
Commercial Account Consent: ${data.commercialAccountConsent || "N/A"}

==================================================
PICKUP INFORMATION
==================================================

Store / Seller: ${data.sellerName || data.storeName || "N/A"}
Order Number: ${data.orderNumber || "N/A"}
Pickup Address: ${data.pickupAddress || data.pickup || "N/A"}
Pickup Date: ${data.pickupDate || "N/A"}
Pickup Time Window: ${data.pickupTime || "N/A"}
Pickup Dock Available: ${data.pickupDock || "N/A"}
Forklift Available At Pickup: ${data.forklift || "N/A"}
Pickup Ready: ${data.pickupReady || "N/A"}
Item Paid For: ${data.isPaid || "N/A"}
Pickup Instructions: ${data.pickupInstructions || "N/A"}

==================================================
DELIVERY INFORMATION
==================================================

Delivery Address: ${data.deliveryAddress || data.dropoff || "N/A"}
Delivery Date: ${data.deliveryDate || "N/A"}
Delivery Time Window: ${data.deliveryTime || "N/A"}
Delivery Dock Available: ${data.deliveryDock || "N/A"}
Forklift Available At Delivery: ${data.deliveryForklift || "N/A"}
Delivery Location Type: ${data.deliveryLocationType || "N/A"}
Delivery Distance Type: ${data.deliveryDistanceType || "N/A"}
Someone Present: ${data.someonePresent || "N/A"}
Delivery Instructions: ${data.deliveryInstructions || "N/A"}
Drop-Off Agreement: ${data.dropoffAgreement || "N/A"}

==================================================
FREIGHT / ITEM DETAILS
==================================================

Freight Description: ${data.freightDescription || data.description || data.itemDescription || "N/A"}
Pieces / Number of Items: ${data.pieces || data.itemCount || "N/A"}
Weight: ${data.weight || data.estimatedWeight || "N/A"}
Dimensions: ${data.dimensions || "N/A"}
Stackable: ${data.stackable || "N/A"}

Additional Freight Items:
${data.additionalFreightItemsText || data.pickupItemsText || "N/A"}

Total Pickup Item Quantity: ${data.totalPickupItemQuantity || "N/A"}
Item Category: ${data.itemCategory || "N/A"}

==================================================
SPECIAL REQUIREMENTS
==================================================

Driver Assist: ${data.driverAssist || "No"}
TWIC Required: ${data.twic || "No"}
Fragile Freight: ${data.fragile || "No"}
Hazmat: ${data.hazmat || "No"}
Hazmat Weight: ${data.hazmatWeight || "N/A"}
Stairs: ${data.stairs || "N/A"}

==================================================
VEHICLE CAPACITY
==================================================

Service Vehicle: ${data.serviceVehicle || "Sprinter Van / High-Roof Van"}
Max Payload: ${data.maxPayload || "Up to 3,000 lbs"}
Max Cargo Length: ${data.maxCargoLength || '120"'}
Max Cargo Width: ${data.maxCargoWidth || '53"'}
Max Cargo Height: ${data.maxCargoHeight || '72"'}
Pallet Capacity: ${data.palletCapacity || 'Up to 2 standard 48" x 40" pallets'}

==================================================
QUOTE CALCULATION
==================================================

Quote Amount: ${data.quoteAmount || "N/A"}
Loaded Miles: ${data.loadedMiles || data.miles || "N/A"}
Estimated Drive Time: ${data.estimatedDriveTime || "N/A"}
Distance Surcharge Miles: ${data.distanceSurchargeMiles || data.deadheadMiles || "N/A"}
Distance Surcharge Charge: $${data.distanceSurchargeCharge || data.deadheadCharge || "0.00"}
Base Rate: $${data.baseRate || "0.00"}
Loaded Mileage Charge: $${data.loadedMileageCharge || "0.00"}
Weight Fee: $${data.weightFee || "0.00"}
Stairs Fee: $${data.stairsFee || "0.00"}
Fragile Fee: $${data.fragileFee || "0.00"}
Additional Items Fee: $${data.additionalItemsFee || "0.00"}
Service Speed: ${data.serviceSpeed || "N/A"}
Stops: ${data.stops || "N/A"}

==================================================
AGREEMENTS
==================================================

Quote Estimate Agreement: ${data.quoteEstimateAgreement || "N/A"}
Pickup Authorization: ${data.authorizationAgreement || "N/A"}
Accuracy Agreement: ${data.accuracyAgreement || "N/A"}
Quote Agreement: ${data.quoteAgreement || "N/A"}
Contact Agreement: ${data.contactAgreement || "N/A"}
Cancellation Agreement: ${data.cancellationAgreement || "N/A"}
Refund Agreement: ${data.refundAgreement || "N/A"}
Non-Refundable Agreement: ${data.nonRefundableAgreement || "N/A"}

==================================================
TRACKING DEFAULTS
==================================================

Status: ${data.status || "Quote Submitted"}
Payment Status: ${data.payment_status || "Payment Link Not Sent"}
Delivery Status: ${data.delivery_status || "Not Scheduled"}
`;

    await transporter.sendMail({
      from: `"Logistics Carrier LLC" <${process.env.EMAIL_USER}>`,
      to: process.env.QUOTE_RECEIVER_EMAIL || process.env.EMAIL_USER,
      subject: `New Logistics Carrier Request - ${trackingNumber}`,
      text: emailBody
    });

    res.json({
      success: true,
      message: "Request submitted successfully",
      trackingNumber
    });

  } catch (error) {
    console.error("Submit quote error:", error);

    res.status(500).json({
      success: false,
      error: error.message || "Unable to submit request"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```
