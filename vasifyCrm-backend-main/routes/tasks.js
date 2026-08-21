const express = require("express");
const router = express.Router();
const db = require("../config/database");

router.get("/", async (req, res) => {
  try {
    const [tasks] = await db.query(`
      SELECT
        t.*,
        u.name AS assigned_to_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      ORDER BY t.created_at DESC
    `);

    res.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error("Get tasks error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
    });
  }
});

router.get("/daily", async (req, res) => {
  try {
    const [tasks] = await db.query(`
      SELECT
        t.*,
        u.name AS assigned_to_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.task_type = 'daily'
      ORDER BY
        CASE
          WHEN t.status = 'pending' THEN 1
          WHEN t.status = 'in-progress' THEN 2
          WHEN t.status = 'completed' THEN 3
          ELSE 4
        END,
        t.due_date ASC
    `);

    res.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error("Get daily tasks error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch daily tasks",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [tasks] = await db.query(
      `
      SELECT
        t.*,
        u.name AS assigned_to_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.id = ?
      `,
      [req.params.id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.json({
      success: true,
      task: tasks[0],
    });
  } catch (error) {
    console.error("Get task error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch task",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      task_type,
      priority,
      status,
      assigned_to,
      related_type,
      related_id,
      due_date,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }

    const taskId = crypto.randomUUID();

    await db.query(
      `
      INSERT INTO tasks (
        id,
        title,
        description,
        type,
        task_type,
        priority,
        status,
        assigned_to,
        related_type,
        related_id,
        due_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        taskId,
        title.trim(),
        description || null,
        type || "other",
        task_type || "regular",
        priority || "medium",
        status || "pending",
        assigned_to || null,
        related_type || null,
        related_id || null,
        due_date || null,
      ]
    );

    const [tasks] = await db.query(
      `
      SELECT
        t.*,
        u.name AS assigned_to_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.id = ?
      `,
      [taskId]
    );

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      task: tasks[0],
    });
  } catch (error) {
    console.error("Create task error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create task",
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      task_type,
      priority,
      status,
      assigned_to,
      related_type,
      related_id,
      due_date,
    } = req.body;

    const [existing] = await db.query(
      "SELECT id FROM tasks WHERE id = ?",
      [req.params.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const completedAt =
      status === "completed"
        ? new Date()
        : null;

    await db.query(
      `
      UPDATE tasks
      SET
        title = ?,
        description = ?,
        type = ?,
        task_type = ?,
        priority = ?,
        status = ?,
        assigned_to = ?,
        related_type = ?,
        related_id = ?,
        due_date = ?,
        completed_at = ?
      WHERE id = ?
      `,
      [
        title,
        description || null,
        type || "other",
        task_type || "regular",
        priority || "medium",
        status || "pending",
        assigned_to || null,
        related_type || null,
        related_id || null,
        due_date || null,
        completedAt,
        req.params.id,
      ]
    );

    const [tasks] = await db.query(
      `
      SELECT
        t.*,
        u.name AS assigned_to_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.id = ?
      `,
      [req.params.id]
    );

    res.json({
      success: true,
      message: "Task updated successfully",
      task: tasks[0],
    });
  } catch (error) {
    console.error("Update task error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update task",
    });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "in-progress",
      "completed",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task status",
      });
    }

    const completedAt =
      status === "completed"
        ? new Date()
        : null;

    const [result] = await db.query(
      `
      UPDATE tasks
      SET
        status = ?,
        completed_at = ?
      WHERE id = ?
      `,
      [
        status,
        completedAt,
        req.params.id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.json({
      success: true,
      message: "Task status updated successfully",
    });
  } catch (error) {
    console.error("Update task status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update task status",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM tasks WHERE id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete task",
    });
  }
});

module.exports = router;