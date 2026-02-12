const express = require("express");
const prisma = require("../db");

const router = express.Router();

router.get("/", async (req, res) => {
  const q = (req.query.q || "").trim();
  const parts = await prisma.part.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
            { supplier: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { updatedAt: "desc" },
  });
  res.render("parts/list", { parts, q });
});

router.get("/new", (req, res) => res.render("parts/new"));

router.post("/", async (req, res) => {
  const priceNok = req.body.priceNok ? Math.round(Number(req.body.priceNok) * 100) : null;

  const part = await prisma.part.create({
    data: {
      name: req.body.name,
      sku: req.body.sku || null,
      supplier: req.body.supplier || null,
      priceNok: Number.isFinite(priceNok) ? priceNok : null,
      notes: req.body.notes || null,
    },
  });

  res.redirect(`/parts`);
});

// koble en part til en todo
router.post("/use", async (req, res) => {
  const { todoId, partId } = req.body;
  const quantity = req.body.quantity ? Number(req.body.quantity) : 1;

  await prisma.partUsage.upsert({
    where: { partId_todoId: { partId, todoId } },
    update: { quantity: quantity > 0 ? quantity : 1 },
    create: { partId, todoId, quantity: quantity > 0 ? quantity : 1 },
  });

  res.redirect(`/todos/${todoId}`);
});

router.post("/use/remove", async (req, res) => {
  const { todoId, partId } = req.body;
  await prisma.partUsage.delete({
    where: { partId_todoId: { partId, todoId } },
  });
  res.redirect(`/todos/${todoId}`);
});

module.exports = router;
