const express = require("express");
const axios = require("axios");
const multer = require("multer");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// 🔐 YOUR KEYS (PUT YOUR REAL ONES)
const consumerKey = "YOUR_CONSUMER_KEY";
const consumerSecret = "YOUR_CONSUMER_SECRET";
const shortcode = "3381097";
const passkey = "YOUR_PASSKEY";

let payments = {};

// 🔑 ACCESS TOKEN
async function getToken() {
    const auth = Buffer.from(consumerKey + ":" + consumerSecret).toString("base64");

    const res = await axios.get(
        "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
        { headers: { Authorization: `Basic ${auth}` } }
    );

    return res.data.access_token;
}

// 📊 ANALYZE CURRICULUM (FAKE AI FOR NOW)
app.post("/analyze", upload.single("file"), (req, res) => {
    res.json({
        resources: ["Textbook", "Charts", "Projector", "Lab Equipment"]
    });
});

// 💰 STK PUSH
app.post("/pay", async (req, res) => {
    try {
        const { phone, amount } = req.body;
        const token = await getToken();

        const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0,14);
        const password = Buffer.from(shortcode + passkey + timestamp).toString("base64");

        const stk = await axios.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            {
                BusinessShortCode: shortcode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: "CustomerPayBillOnline",
                Amount: amount,
                PartyA: phone,
                PartyB: shortcode,
                PhoneNumber: phone,
                CallBackURL: "https://yourdomain.com/callback",
                AccountReference: "SmartMwalimu",
                TransactionDesc: "Payment"
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        res.json({ id: stk.data.CheckoutRequestID });

    } catch (e) {
        console.log(e.response?.data || e.message);
        res.status(500).send("Error");
    }
});

// 🔁 CALLBACK
app.post("/callback", (req, res) => {
    const data = req.body.Body.stkCallback;

    if (data.ResultCode === 0) {
        payments[data.CheckoutRequestID] = true;
    }

    res.sendStatus(200);
});

// ✅ CONFIRM
app.get("/confirm/:id", (req, res) => {
    res.json({ paid: payments[req.params.id] || false });
});

// 📄 GENERATE FILE
app.post("/generate", (req, res) => {
    const { missing } = req.body;

    let improv = "Improvisation Ideas:\n";

    missing.forEach(r => {
        improv += "- Use local materials for " + r + "\n";
    });

    res.setHeader("Content-Disposition", "attachment; filename=SmartMwalimu.txt");
    res.send(improv);
});

// 🚀 START SERVER
app.listen(3000, () => console.log("Server running on port 3000"));
