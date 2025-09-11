import express from "express";
import mongoose from "mongoose";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.disable("x-powered-by");

const cfg = {
    DB_URL: process.env.DB_URL,
    PORT: process.env.PORT,
    FLW_SECRET_HASH: process.env.FLW_SECRET_HASH
};

//mongoosesraet
const UserSchema = new mongoose.Schema({
    gmail: { type: String, unique: true },
    phone: Number,
    password: String,
    mate: String,
    faculty: String,
    department: String,
    tokens: { type: Number, default: 0 },
    OTP: Number,
    details: {
        type: Object,
        default: {
            Transactions: Array
        }
    }
});
const PermiumUser = mongoose.model("PermiumUser", UserSchema);

const tokenBuySchema = new mongoose.Schema({
    gmail: String,
    dept: String,

    cost: Number,
    bal: Number,

    ref: String
});
const tokenBought = mongoose.model("tokenBought", tokenBuySchema);

//connect to database
async function connectDB() {
    //DB_URL
    await mongoose.connect(cfg.DB_URL).then(() => console.log("connected"));
}

function getDateOnly(locale = "en-US", options = {}) {
    return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
        ...options
    }).format(new Date());
}
// Example output: "November 15, 2023"

function getTimeOnly(locale = "en-US", options = {}) {
    return new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        ...options
    }).format(new Date());
}
// Example output: "02:30:45 PM"
function reFined(gmail) {
    if (typeof gmail !== "string") {
        throw new Error("Input must be a string");
    }

    // Remove spaces, tabs, and newlines, then convert to lowercase
    return gmail
        .replace(/\s+/g, "") // Remove all whitespace
        .toLowerCase(); // Convert to lowercase
}

//Increase tokens
async function increaseTokens(gmail, amount, notes, ref) {
    try {
        gmail = reFined(gmail);

        let user = await PermiumUser.findOne({ gmail: gmail });
        if (!user) throw new Error(`User ${gmail} not found`);

        // Initialize details if not exists
        if (!user.details) user.details = { Transactions: [] };
        if (!user.details.Transactions) user.details.Transactions = [];

        //The user Transactions
        let userTransactions = user.details.Transactions;
        let thisTrans = {
            transId: ref,
            status: "successful",
            action: notes,
            cost: amount,
            balance: user.tokens + amount / 10,
            date: getDateOnly(),
            time: getTimeOnly()
        }; //This Transactions

        userTransactions.unshift(thisTrans);

        //Increase Tokens and save
        user.tokens += amount / 10;
        user.markModified("details"); // Important for mixed types
        await user.save();

        //Save Funding in action not very neccessary
        try {
            await saveFunding(
                user.gmail,
                user.department,
                amount,
                user.tokens,
                ref
            );
        } catch (err) {
            console.log(`Failed to save ${err.message}`);
        }

        return user;
    } catch (error) {
        console.error(`Error in deductTokens for ${gmail}:`, error);
        throw error;
    }
}
//save Funding in action
async function saveFunding(gmail, department, cost, tokens, ref) {
    let fundAction = new tokenBought({
        gmail: gmail,
        dept: department,
        cost: cost,
        bal: tokens,
        ref: ref
    });
    await fundAction.save();
}

app.get("/", (req, res) => {
    res.send({
        body: "req",
        message: "welcome"
    });
});

app.post("/flw", async (req, res) => {
    const payload = req.body;
    try {
        const secretHash = cfg.FLW_SECRET_HASH;
        const signature = req.headers["verif-hash"];

        if (!signature || signature !== secretHash) {
            // This response is not from Flutterwave; discard
            return res.status(401).end();
        }

        console.log(payload);
        if (payload.event === "charge.completed") {
            console.log("Starting");

            let gmail = payload.meta_data.gmail;
            let amt = Number(payload.data.amount);
            let ref = "Ref_" + payload.data.id;

            await increaseTokens(gmail, amt, `Bought Tokens`, ref);
            console.log(gmail, amt, ref);
        } else {
            //was not a successful Transactions
            console.log("err");

            console.log(req.body);
        }
    } catch (err) {
        console.log("err");
        console.log(err);

        console.log(req.body);
    }

    res.status(200).send("good");
});

app.use("/", (req, res) => {
    res.send({
        body: req,
        message: "Resourse not found"
    });
});

app.listen(cfg.PORT, async () => {
    await connectDB();

    console.log(`Server running on port http://localhost:${cfg.PORT}`);
});
