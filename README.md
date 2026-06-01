# delivery-quote-backend
Submit Quote
const express = require("express");
const Stripe = require("stripe");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(express.json());

app.use(cors({
  origin: "*"
}));

app.get("/", (req, res) => {
  res.send("Delivery Quote API Running");
});

app.post("/create-quote", async (req, res) => {
  try {

    const {
      pickup,
      dropoff,
      weight,
      deadheadMilesRaw,
      deliveryMiles,
      total
    } = req.body;

    if (!total) {
      return res.status(400).json({
        error: "Missing total amount"
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Delivery Service Quote",
              description: `${pickup} → ${dropoff}`
            },
            unit_amount: Math.round(total * 100)
          },
          quantity: 1
        }
      ],
      success_url: process.env.SUCCESS_URL,
      cancel_url: process.env.CANCEL_URL
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.CUSTOMER_EMAIL,
      subject: "New Delivery Quote",
      text: `
Pickup: ${pickup}

Dropoff: ${dropoff}

Weight: ${weight} lbs

Deadhead Miles: ${deadheadMilesRaw}

Delivery Miles: ${deliveryMiles}

Quote Total: $${total}
`
    });

    return res.json({
      url: session.url
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Server Error"
    });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
2. package.json

Create package.json:

{
  "name": "delivery-quote-backend",
  "version": "1.0.0",
  "description": "Delivery Quote Stripe Backend",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "nodemailer": "^6.10.0",
    "stripe": "^18.0.0"
  }
}
