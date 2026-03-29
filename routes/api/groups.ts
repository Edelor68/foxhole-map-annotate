import { Router } from "express";
import {
  addGroup,
  updateGroup,
  deleteGroup,
  getUserGroups,
} from "../../lib/Groups/saveGroups.ts";

const router = Router();


/* =========================
   GET all groups
========================= */

router.get("/", async (req, res) => {
  if (!req.session?.userId) {
    return res.sendStatus(401);
  }

  const groups = await getUserGroups(req.session.userId);
  res.json(groups);
});

/* =========================
   CREATE group
========================= */

router.post("/", async (req, res) => {
  try {
    
    const groups = await addGroup(req.session.userId, req.body);

    res.json(groups);
  } catch (err) {
    console.error("POST /groups error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* =========================
   UPDATE group
========================= */

router.put("/:id", async (req, res, next) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.sendStatus(401);
    const groupId = req.params.id;
    let updated;

    switch (req.headers["update-type"]) {
      case "add_member":
        updated = await updateGroup(req.session, groupId, "add", req.body);
        res.json(updated);
        break;
      case "remove_member":
        updated = await updateGroup(req.session, groupId, "remove", req.body);
        res.json(updated);
        break;
      case "add_role":
        updated = await updateGroup(req.session, groupId, "add", req.body);
        res.json(updated);
        break;
      case "remove_role":
        updated = await updateGroup(req.session, groupId, "remove", req.body);
        res.json(updated);
        break;
      case "new_group_name":
        updated = await updateGroup(req.session, groupId, "add", req.body);
        res.json(updated);
        break;
      default:
        return res.status(400).json({ error: "Invalid or missing Update-Type header" });
    }
  } catch (err) {
    console.error("PUT /groups error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


/* =========================
   DELETE group
========================= */

router.delete("/:id", async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.sendStatus(401);
    const groupId = req.params.id;
    const result = await deleteGroup(userId, groupId);

    res.json(result);
  } catch (err) {
    console.error("delete /groups error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
