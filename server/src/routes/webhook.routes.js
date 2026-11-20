const express = require("express");
const router = express.Router();
router.use((req, res, next) => {
  // CORS headers skip karein webhook ke liye
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});
router.post("/supabase", (req, res) => {
  // 1. Verify shared secret (security)
  const secret = req.headers["x-webhook-secret"];
  if (secret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // 2. Process payload
  const { type, table, record, old_record } = req.body;
  console.log(`[webhook] ${type} on ${table}:`, record?.id);

  // Example: if auction ended, notify seller
  if (table === "auctions" && type === "UPDATE" && record.status === "ended") {
    // Aap yahan email/notification bhej sakte hain
    // (optional: emailService.send(...))
  }

  res.status(200).json({ received: true });
});

module.exports = router;
