const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Delivery quote backend is running.");
});

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
      subject: "New Delivery Quote Request",
      html: `
        <h2>New Delivery Quote Request</h2>
        <p><strong>Name:</strong> ${data.firstName} ${data.middleInitial || ""} ${data.lastName}</p>
        <p><strong>Phone:</strong> ${data.phone}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Pickup:</strong> ${data.pickup}</p>
        <p><strong>Dropoff:</strong> ${data.dropoff}</p>
        <p><strong>Retailer/Seller:</strong> ${data.sellerName || "Not provided"}</p>
        <p><strong>Order Number:</strong> ${data.orderNumber || "Not provided"}</p>
        <p><strong>Item Type:</strong> ${data.itemType}</p>
        <p><strong>Description:</strong> ${data.description || "Not provided"}</p>
        <p><strong>Pickup Authorization:</strong> ${data.pickupAuthorization || "Customer authorized pickup."}</p>
        <p><strong>Stairs:</strong> ${data.stairs}</p>
      `
    });

    res.json({ success: true });

  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ success: false });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
