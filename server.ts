import express from "express";
import { createServer as createViteServer } from "vite";
import db from "./db";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes

  // Signup
  app.post("/api/signup", (req, res) => {
    const { name, email, password, role, specialty, branch } = req.body;
    
    // Basic validation
    if (!name || !email || !password || !role || !specialty || !branch) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    // Check if email exists
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ success: false, error: "Email already exists" });
    }

    try {
      const insert = db.prepare('INSERT INTO users (name, email, password, role, specialty, branch) VALUES (?, ?, ?, ?, ?, ?)');
      const result = insert.run(name, email, password, role, specialty, branch);
      
      const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      res.json({ success: true, user: newUser });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Login
  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, password);
    
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, error: "Invalid email or password" });
    }
  });

  // Get all users (for substitute selection)
  app.get("/api/users", (req, res) => {
    const users = db.prepare('SELECT * FROM users').all();
    res.json(users);
  });

  // Get requests (with filters)
  app.get("/api/requests", (req, res) => {
    const { userId } = req.query;
    let query = `
      SELECT r.*, 
             u.name as userName, u.specialty as userSpecialty, u.branch as userBranch,
             s.name as substituteName
      FROM requests r
      JOIN users u ON r.userId = u.id
      LEFT JOIN users s ON r.substituteId = s.id
    `;
    
    const params: any[] = [];

    if (userId) {
      query += ` WHERE r.userId = ?`;
      params.push(userId);
    }
    
    query += ` ORDER BY r.createdAt DESC`;

    const requests = db.prepare(query).all(...params);
    res.json(requests);
  });

  // Create leave request
  app.post("/api/requests", (req, res) => {
    const { userId, date, startTime, endTime, reason, substituteId, branch } = req.body;

    if (!branch) {
      return res.status(400).json({ error: "Branch is required" });
    }

    // Update User's branch to the selected one
    db.prepare('UPDATE users SET branch = ? WHERE id = ?').run(branch, userId);

    // Get fresh user data with updated branch
    const requester = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    
    if (requester.specialty === 'GP') {
      const totalGPs = db.prepare("SELECT count(*) as count FROM users WHERE specialty = 'GP' AND branch = ?").get(requester.branch) as { count: number };
      
      // Find other GPs on leave during this date (simplified overlap check)
      const gpsOnLeave = db.prepare(`
        SELECT count(*) as count 
        FROM requests r
        JOIN users u ON r.userId = u.id
        WHERE r.date = ? 
        AND r.status != 'rejected'
        AND u.specialty = 'GP'
        AND u.branch = ?
        AND r.userId != ?
      `).get(date, requester.branch, userId) as { count: number };

      const remainingGPs = totalGPs.count - gpsOnLeave.count - 1; // -1 for the current requester

      if (remainingGPs < 1) {
         // We allow it but mark it with a warning, or block it. 
         // The prompt says "Specify that there must be at least 1 GP". 
         // Let's return a warning but allow submission if they insist, or block. 
         // Let's block for strictness.
         return res.status(400).json({ 
           error: `Cannot request leave. At least 1 GP must be on duty at ${requester.branch} branch.`,
           details: `Total GPs: ${totalGPs.count}, Others on leave: ${gpsOnLeave.count}`
         });
      }
    }

    const insert = db.prepare(`
      INSERT INTO requests (userId, date, startTime, endTime, reason, substituteId)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = insert.run(userId, date, startTime, endTime, reason, substituteId);
    
    // Simulate Email Notification
    console.log(`[Email Sent] To: Head Vet. Subject: New Leave Request from ${requester.name}`);
    
    // Return the updated user so frontend can update state
    res.json({ id: result.lastInsertRowid, success: true, updatedUser: requester });
  });

  // Approve/Reject request
  app.patch("/api/requests/:id", (req, res) => {
    const { status, adminComment } = req.body;
    const { id } = req.params;

    const update = db.prepare(`
      UPDATE requests 
      SET status = ?, adminComment = ?
      WHERE id = ?
    `);
    
    update.run(status, adminComment, id);

    // Get request details for email simulation
    const request = db.prepare(`
      SELECT r.*, u.email, u.name 
      FROM requests r 
      JOIN users u ON r.userId = u.id 
      WHERE r.id = ?
    `).get(id) as any;

    if (request) {
      console.log(`[Email Sent] To: ${request.email}. Subject: Leave Request ${status}. Comment: ${adminComment}`);
    }

    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
