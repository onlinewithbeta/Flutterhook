import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.disable("x-powered-by");

const PORT = process.env.PORT || 2026;

app.get("/", (req, res) => {
    res.send({
        body: "req",
        message: "welcome"
    });
});

app.post("/flw-webhook", async (req, res) => {
	const payload = req.body;
	console.log(payload);
	res.status(200).end();
});


app.use("/", (req, res) => {
    res.send({
        body: req,
        message: "Resourse not found"
    });
});

app.listen(PORT, async () => {
    console.log(`Server running on port http://localhost:${PORT}`);
});
