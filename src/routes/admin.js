const express = require("express");
const { runServiceNotifications } = require("../jobs/serviceNotifications");

const router = express.Router();

router.post("/run-service-notifications", async (req, res) => {
  const secret = req.headers["x-cron-secret"];
  if (!secret || secret !== process.env.CRON_SECRET) {
    return res.status(401).send("Unauthorized");
  }

  const result = await runServiceNotifications();
  res.json(result);
});

module.exports = router;
