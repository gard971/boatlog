const express = require("express");
const multer = require("multer");
const prisma = require("../db");
const { uploadToR2, deleteFromR2 } = require("../r2");

const router = express.Router();

// Memory storage: filen ligger i RAM, vi sender den videre til R2
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

// (valgfritt men anbefalt) basic allowlist på mime
function isAllowed(mime) {
  if (!mime) return false;
  return (
    mime.startsWith("image/") ||
    mime === "application/pdf" ||
    mime.startsWith("text/") ||
    mime === "application/zip" ||
    mime.startsWith("video/") ||
    mime.startsWith("audio/")
  );
}

router.post("/issue/:issueId", upload.single("file"), async (req, res) => {
  const { issueId } = req.params;
  const file = req.file;
  if (!file) return res.status(400).send("Ingen fil mottatt.");
  if (!isAllowed(file.mimetype)) return res.status(400).send("Filtype ikke tillatt.");

  const { key, url } = await uploadToR2({
    buffer: file.buffer,
    mimeType: file.mimetype,
    originalName: file.originalname,
  });

  await prisma.attachment.create({
    data: {
      targetType: "ISSUE",
      issueId,
      originalName: file.originalname,
      filename: key,                 // vi bruker filename-feltet til å lagre R2 key
      mimeType: file.mimetype,
      size: file.size,
      storagePath: url || key,       // hvis public base url finnes: full url, ellers key
    },
  });

  res.redirect(`/issues/${issueId}`);
});

router.post("/todo/:todoId", upload.single("file"), async (req, res) => {
  const { todoId } = req.params;
  const file = req.file;
  if (!file) return res.status(400).send("Ingen fil mottatt.");
  if (!isAllowed(file.mimetype)) return res.status(400).send("Filtype ikke tillatt.");

  const { key, url } = await uploadToR2({
    buffer: file.buffer,
    mimeType: file.mimetype,
    originalName: file.originalname,
  });

  await prisma.attachment.create({
    data: {
      targetType: "TODO",
      todoId,
      originalName: file.originalname,
      filename: key,
      mimeType: file.mimetype,
      size: file.size,
      storagePath: url || key,
    },
  });

  res.redirect(`/todos/${todoId}`);
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const att = await prisma.attachment.findUnique({ where: { id } });
  if (!att) return res.status(404).send("Fant ikke vedlegg.");

  // Slett fra R2 med key (vi lagrer key i filename)
  try {
    await deleteFromR2(att.filename);
  } catch (e) {
    // best-effort: ikke lås DB-sletting om R2 feiler midlertidig
    console.error("R2 delete failed:", e?.message || e);
  }

  await prisma.attachment.delete({ where: { id } });

  res.redirect(req.get("Referrer") || "/");
});

module.exports = router;
