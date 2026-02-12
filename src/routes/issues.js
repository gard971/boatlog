const express = require("express");
const prisma = require("../db");
const router = express.Router();

const statusLabel = (s) =>
  s === "OPEN" ? "Åpen" : s === "INVESTIGATE" ? "Må finne årsak" : "Løst";

router.get("/", async (req, res) => {
  const issues = await prisma.issue.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.render("issues/list", { issues, statusLabel });
});

router.get("/new", (req, res) => {
  res.render("issues/new");
});

router.post("/", async (req, res) => {
  const { title, description } = req.body;
  const issue = await prisma.issue.create({ data: { title, description } });
  res.redirect(`/issues/${issue.id}`);
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  const issue = await prisma.issue.findUnique({
    where: { id },
    include: {
      todos: { include: { todo: true } },
      attachments: true,
    },
  });
  if (!issue) return res.status(404).send("Fant ikke issue.");

  const allTodos = await prisma.todo.findMany({ orderBy: { createdAt: "desc" } });

  res.render("issues/detail", { issue, allTodos, statusLabel });
});

router.put("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const data = { status };
  if (status === "RESOLVED") data.resolvedAt = new Date();
  if (status !== "RESOLVED") data.resolvedAt = null;

  await prisma.issue.update({ where: { id }, data });
  res.redirect(`/issues/${id}`);
});

router.post("/:id/link-todos", async (req, res) => {
  const { id } = req.params;
  let { todoIds } = req.body;

  // HTML form kan sende én string eller array
  if (!todoIds) return res.redirect(`/issues/${id}`);
  if (!Array.isArray(todoIds)) todoIds = [todoIds];

  // upsert koblinger
  for (const todoId of todoIds) {
    await prisma.issueTodo.upsert({
      where: { issueId_todoId: { issueId: id, todoId } },
      update: {},
      create: { issueId: id, todoId },
    });
  }

  res.redirect(`/issues/${id}`);
});

router.delete("/:id/unlink-todo/:todoId", async (req, res) => {
  const { id, todoId } = req.params;
  await prisma.issueTodo.delete({
    where: { issueId_todoId: { issueId: id, todoId } },
  });
  res.redirect(`/issues/${id}`);
});

module.exports = router;
