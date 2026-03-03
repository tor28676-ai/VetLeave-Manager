import Database from 'better-sqlite3';

const db = new Database('vet_leave.db');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL DEFAULT '1234',
    role TEXT NOT NULL CHECK(role IN ('vet', 'head')),
    specialty TEXT NOT NULL CHECK(specialty IN ('GP', 'Specialist', 'None')),
    branch TEXT NOT NULL DEFAULT 'Thonglor'
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    date TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    reason TEXT NOT NULL,
    substituteId INTEGER,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    adminComment TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (substituteId) REFERENCES users(id)
  );
`);

// Seed data if empty
const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };

if (userCount.count === 0) {
  const insertUser = db.prepare('INSERT INTO users (name, email, password, role, specialty, branch) VALUES (?, ?, ?, ?, ?, ?)');
  
  insertUser.run('Dr. Somchai (GP)', 'somchai@vet.com', '1234', 'vet', 'GP', 'Thonglor');
  insertUser.run('Dr. Somsri (GP)', 'somsri@vet.com', '1234', 'vet', 'GP', 'Langsuan');
  insertUser.run('Dr. John (Specialist)', 'john@vet.com', '1234', 'vet', 'Specialist', 'Thonglor');
  insertUser.run('Dr. Jane (Head)', 'jane@head.com', '1234', 'head', 'GP', 'Thonglor');
  insertUser.run('Dr. David (GP)', 'david@vet.com', '1234', 'vet', 'GP', 'Phuket');
}

export default db;
