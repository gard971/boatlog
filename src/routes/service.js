const express = require("express");
const prisma = require("../db");

const router = express.Router();

router.get("/", async (req, res) => {
  const now = new Date();
  const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const overdue = await prisma.todo.findMany({
    where: { nextDueAt: { lt: now } },
    orderBy: { nextDueAt: "asc" },
  });

  const dueSoon = await prisma.todo.findMany({
    where: { nextDueAt: { gte: now, lte: soon } },
    orderBy: { nextDueAt: "asc" },
  });

  res.render("service/index", { overdue, dueSoon });
});

module.exports = router;
