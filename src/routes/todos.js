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
  const todo = await prisma.todo.create({ data: { title, description } });
  res.redirect(`/todos/${todo.id}`);
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const todo = await prisma.todo.findUnique({
    where: { id },
    include: {
      issues: { include: { issue: true } },
      attachments: true,
    },
  });
  if (!todo) return res.status(404).send("Fant ikke todo.");

  res.render("todos/detail", { todo, statusLabel });
});

router.put("/:id/toggle", async (req, res) => {
  const { id } = req.params;
  const todo = await prisma.todo.findUnique({ where: { id } });
  if (!todo) return res.status(404).send("Fant ikke todo.");

  const goingDone = todo.status !== "DONE";
  await prisma.todo.update({
    where: { id },
    data: {
      status: goingDone ? "DONE" : "TODO",
      completedAt: goingDone ? new Date() : null,
    },
  });

  res.redirect(`/todos/${id}`);
});

module.exports = router;
