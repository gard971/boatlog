const express = require("express");
const prisma = require("../db");

const router = express.Router();

// Oversikt over service (kun åpne instanser)
router.get("/", async (req, res) => {
  const now = new Date();
  const days = Math.max(1, Math.min(365, Number(req.query.days) || 60));
  const soon = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const overdue = await prisma.todo.findMany({
    where: {
      servicePlanId: { not: null },
      status: "TODO",
      dueAt: { lt: now },
    },
    orderBy: { dueAt: "asc" },
  });

  const dueSoon = await prisma.todo.findMany({
    where: {
      servicePlanId: { not: null },
      status: "TODO",
      dueAt: { gte: now, lte: soon },
    },
    orderBy: { dueAt: "asc" },
  });

  res.render("service/index", { overdue, dueSoon, days });
});

// Form for nytt servicepunkt
router.get("/new", (req, res) => {
  res.render("service/new");
});

// Opprett servicepunkt + første instans
router.post("/plans", async (req, res) => {
  const title = (req.body.title || "").trim();
  const description = (req.body.description || "").trim();
  const intervalDays = Number(req.body.intervalDays);

  const firstDueAtStr = (req.body.firstDueAt || "").trim();
  const firstDueAt = firstDueAtStr ? new Date(firstDueAtStr) : null;

  if (!title || !Number.isFinite(intervalDays) || intervalDays <= 0) {
    return res.status(400).send("Tittel og intervall (dager) må fylles ut.");
  }

  const plan = await prisma.servicePlan.create({
    data: {
      title,
      description: description || null,
      intervalDays,
    },
  });

  const dueAt = firstDueAt ?? new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);

  await prisma.todo.create({
    data: {
      title: plan.title,
      description: plan.description,
      status: "TODO",
      servicePlanId: plan.id,
      dueAt,
      cycleNumber: 1,
    },
  });

  res.redirect("/service");
});

module.exports = router;
