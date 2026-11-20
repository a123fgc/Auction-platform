const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const env = require("./config/env");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const csrfProtection = require("./middleware/csrf");
const supabase = require("./config/supabase");

const authRoutes = require("./routes/auth.routes");
const auctionRoutes = require("./routes/auction.routes");
const sellerRoutes = require("./routes/seller.routes");
const bidRoutes = require("./routes/bid.routes");
const adminRoutes = require("./routes/admin.routes");
const profileRoutes = require("./routes/profile.routes");

const app = express();
const webhookRoutes = require("./routes/webhook.routes");
app.use("/api/webhooks", webhookRoutes);

app.use(
  cors({
    origin: env.CLIENT_ORIGINS,
    credentials: true,
  }),
);
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
app.use(csrfProtection);

// Liveness only: the process is accepting HTTP requests.
app.get("/api/health", (req, res) => res.json({ ok: true }));
// Readiness includes the database dependency and is suitable for deployment probes.
app.get("/api/ready", async (req, res) => {
  try {
    const { error } = await supabase
      .from("users")
      .select("id", { head: true })
      .limit(1);
    if (error) throw error;
    return res.json({ ok: true });
  } catch (error) {
    console.error("[readiness] database check failed:", error.message);
    return res.status(503).json({ ok: false });
  }
});
app.use("/api/auth", authRoutes);
app.use("/api/auctions", auctionRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api", bidRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", profileRoutes);
app.use("/api/webhooks", webhookRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
