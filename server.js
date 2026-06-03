const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
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

app.post("/api/create-checkout-session", async (req, res) => {
  try {

    const {
      amount,
      customerName,
      email,
      phone,
      pickup,
      dropoff
    } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        error: "Invalid amount"
      });
    }

    const session =
      await stripe.checkout.sessions.create({

        payment_method_types: ["card"],

        mode: "payment",

        customer_email: email || undefined,

        line_items: [
          {
            price_data: {
              currency: "usd",

              product_data: {
                name: "Delivery Service Payment",

                description:
                  `Pickup: ${pickup || "N/A"} | Dropoff: ${dropoff || "N/A"}`
              },

              unit_amount:
                Math.round(Number(amount) * 100)
            },

            quantity: 1
          }
        ],

        metadata: {
          customerName: customerName || "",
          phone: phone || "",
          pickup: pickup || "",
          dropoff: dropoff || ""
        },

        success_url:
          "https://YOUR-WEBSITE.com/payment-success.html",

        cancel_url:
          "https://YOUR-WEBSITE.com/payment-cancelled.html"
      });

    res.json({
      url: session.url
    });

  } catch (error) {

    console.error("Stripe error:", error);

    res.status(500).json({
      error: "Unable to create checkout session"
    });
  }
});
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
