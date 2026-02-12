const express = require("express");
const prisma = require("../db");
const router = express.Router();

const statusLabel = (s) => (s === "TODO" ? "Å gjøre" : "Ferdig");

router.get("/", async (req, res) => {
  const todos = await prisma.todo.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  res.render("todos/list", { todos, statusLabel });
});

router.get("/new", (req, res) => {
  res.render("todos/new");
});

router.post("/", async (req, res) => {
  const { title, description } = req.body;

  const todo = await prisma.todo.create({
    data: {
      title,
      description: description || null,
    },
  });

  res.redirect(`/todos/${todo.id}`);
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
const todo = await prisma.todo.findUnique({
  where: { id },
  include: {
    issues: { include: { issue: true } },
    attachments: true,
    parts: { include: { part: true } },
  },
});

const allParts = await prisma.part.findMany({ orderBy: { updatedAt: "desc" } });
if (!todo) return res.status(404).send("Fant ikke todo.");
res.render("todos/detail", { todo, allParts, statusLabel });


});

router.put("/:id/toggle", async (req, res) => {
  const { id } = req.params;

  const todo = await prisma.todo.findUnique({ where: { id } });
  if (!todo) return res.status(404).send("Fant ikke todo.");

  const goingDone = todo.status !== "DONE";

  // Ikke-service todo: enkel toggle
  if (!todo.servicePlanId) {
    await prisma.todo.update({
      where: { id },
      data: {
        status: goingDone ? "DONE" : "TODO",
        completedAt: goingDone ? new Date() : null,
      },
    });
    return res.redirect(`/todos/${id}`);
  }

  // Service-instans: ved DONE -> lag neste instans
  await prisma.$transaction(async (tx) => {
    const updated = await tx.todo.update({
      where: { id },
      data: {
        status: goingDone ? "DONE" : "TODO",
        completedAt: goingDone ? new Date() : null,
      },
    });

    if (!goingDone) return; // hvis man angrer, lag ikke ny

    const plan = await tx.servicePlan.findUnique({
      where: { id: updated.servicePlanId },
    });

    const nextCycle = (updated.cycleNumber || 1) + 1;
    const baseDue = updated.dueAt ?? new Date();
    const nextDue = new Date(baseDue.getTime() + plan.intervalDays * 24 * 60 * 60 * 1000);

    // Sikkerhet mot duplikat
    const existing = await tx.todo.findFirst({
      where: { servicePlanId: plan.id, cycleNumber: nextCycle },
    });

    if (!existing) {
      await tx.todo.create({
        data: {
          title: plan.title,
          description: plan.description,
          status: "TODO",
          servicePlanId: plan.id,
          dueAt: nextDue,
          cycleNumber: nextCycle,
        },
      });
    }
  });

  res.redirect(`/todos/${id}`);
});


module.exports = router;
