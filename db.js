const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 数据库文件路径
const DB_PATH = path.join(__dirname, 'data', 'database.sqlite');

// 确保数据目录存在
if (!fs.existsSync('./data')) {
  fs.mkdirSync('./data');
}

// 创建数据库连接
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('连接到SQLite数据库失败:', err.message);
  } else {
    console.log('已成功连接到SQLite数据库');
    // 初始化数据库表
    initDatabase();
  }
});

// 初始化数据库表结构
function initDatabase() {
  // 创建用户表
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT,
    avatarId TEXT,
    createdAt INTEGER
  )`, (err) => {
    if (err) {
      console.error('创建用户表失败:', err.message);
    } else {
      console.log('用户表已创建或已存在');
    }
  });

  // 创建消息表
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    text TEXT,
    userId TEXT NOT NULL,
    username TEXT NOT NULL,
    avatar TEXT,
    time INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    fileInfo TEXT,
    recalled BOOLEAN DEFAULT 0,
    recallTime INTEGER,
    FOREIGN KEY (userId) REFERENCES users(id)
  )`, (err) => {
    if (err) {
      console.error('创建消息表失败:', err.message);
    } else {
      console.log('消息表已创建或已存在');
    }
  });
}

// 数据库操作函数
const dbOps = {
  // 用户相关操作
  users: {
    findByUsername: (username) => {
      return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      });
    },
    findById: (id) => {
      return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      });
    },
    create: (user) => {
      return new Promise((resolve, reject) => {
        const { id, username, password, avatar, avatarId, createdAt } = user;
        db.run(
          'INSERT INTO users (id, username, password, avatar, avatarId, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
          [id, username, password, avatar, avatarId, createdAt],
          function(err) {
            if (err) {
              reject(err);
            } else {
              resolve(user);
            }
          }
        );
      });
    },
    update: (id, updates) => {
      return new Promise((resolve, reject) => {
        // 构建更新语句
        const fields = Object.keys(updates);
        const values = Object.values(updates);
        
        if (fields.length === 0) {
          resolve(null);
          return;
        }
        
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const sql = `UPDATE users SET ${setClause} WHERE id = ?`;
        
        // 添加ID到值数组的末尾
        values.push(id);
        
        db.run(sql, values, function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            resolve(null);
          } else {
            // 获取更新后的用户
            dbOps.users.findById(id).then(resolve).catch(reject);
          }
        });
      });
    },
    getAll: () => {
      return new Promise((resolve, reject) => {
        db.all('SELECT * FROM users', (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });
    }
  },
  
  // 消息相关操作
  messages: {
    findById: (id) => {
      return new Promise((resolve, reject) => {
        db.get('SELECT * FROM messages WHERE id = ?', [id], (err, row) => {
          if (err) {
            reject(err);
          } else {
            // 解析fileInfo字段（如果存在）
            if (row && row.fileInfo) {
              try {
                row.fileInfo = JSON.parse(row.fileInfo);
              } catch (e) {
                console.error('解析fileInfo失败:', e);
              }
            }
            resolve(row);
          }
        });
      });
    },
    create: (message) => {
      return new Promise((resolve, reject) => {
        const { id, type, text, userId, username, avatar, time, timestamp, fileInfo } = message;
        
        // 如果fileInfo存在，将其转换为JSON字符串
        const fileInfoStr = fileInfo ? JSON.stringify(fileInfo) : null;
        
        db.run(
          'INSERT INTO messages (id, type, text, userId, username, avatar, time, timestamp, fileInfo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, type, text, userId, username, avatar, time, timestamp, fileInfoStr],
          function(err) {
            if (err) {
              reject(err);
            } else {
              resolve(message);
            }
          }
        );
      });
    },
    update: (id, updates) => {
      return new Promise((resolve, reject) => {
        // 处理fileInfo字段（如果存在）
        if (updates.fileInfo) {
          updates.fileInfo = JSON.stringify(updates.fileInfo);
        }
        
        // 构建更新语句
        const fields = Object.keys(updates);
        const values = Object.values(updates);
        
        if (fields.length === 0) {
          resolve(null);
          return;
        }
        
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const sql = `UPDATE messages SET ${setClause} WHERE id = ?`;
        
        // 添加ID到值数组的末尾
        values.push(id);
        
        db.run(sql, values, function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            resolve(null);
          } else {
            // 获取更新后的消息
            dbOps.messages.findById(id).then(resolve).catch(reject);
          }
        });
      });
    },
    delete: (id) => {
      return new Promise((resolve, reject) => {
        // 先获取要删除的消息
        dbOps.messages.findById(id).then(message => {
          if (!message) {
            resolve(null);
            return;
          }
          
          db.run('DELETE FROM messages WHERE id = ?', [id], function(err) {
            if (err) {
              reject(err);
            } else if (this.changes === 0) {
              resolve(null);
            } else {
              resolve(message);
            }
          });
        }).catch(reject);
      });
    },
    getAll: () => {
      return new Promise((resolve, reject) => {
        db.all('SELECT * FROM messages ORDER BY time ASC', (err, rows) => {
          if (err) {
            reject(err);
          } else {
            // 解析所有消息的fileInfo字段（如果存在）
            rows.forEach(row => {
              if (row.fileInfo) {
                try {
                  row.fileInfo = JSON.parse(row.fileInfo);
                } catch (e) {
                  console.error('解析fileInfo失败:', e);
                }
              }
            });
            resolve(rows);
          }
        });
      });
    }
  }
};

// 数据迁移函数 - 将JSON数据导入到SQLite
async function migrateData() {
  const USERS_FILE = path.join(__dirname, 'data', 'users.json');
  const CHAT_HISTORY_FILE = path.join(__dirname, 'data', 'chat_history.json');
  
  try {
    // 迁移用户数据
    if (fs.existsSync(USERS_FILE)) {
      const userData = fs.readFileSync(USERS_FILE, 'utf8');
      const users = JSON.parse(userData);
      
      console.log(`开始迁移 ${users.length} 个用户到SQLite数据库...`);
      
      // 使用事务进行批量插入
      await new Promise((resolve, reject) => {
        db.run('BEGIN TRANSACTION', async (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          try {
            for (const user of users) {
              await dbOps.users.create(user);
            }
            
            db.run('COMMIT', (err) => {
              if (err) {
                reject(err);
              } else {
                console.log('用户数据迁移完成');
                resolve();
              }
            });
          } catch (error) {
            db.run('ROLLBACK', () => {
              reject(error);
            });
          }
        });
      });
    }
    
    // 迁移消息数据
    if (fs.existsSync(CHAT_HISTORY_FILE)) {
      const chatHistoryData = fs.readFileSync(CHAT_HISTORY_FILE, 'utf8');
      const messages = JSON.parse(chatHistoryData);
      
      console.log(`开始迁移 ${messages.length} 条消息到SQLite数据库...`);
      
      // 使用事务进行批量插入
      await new Promise((resolve, reject) => {
        db.run('BEGIN TRANSACTION', async (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          try {
            for (const message of messages) {
              await dbOps.messages.create(message);
            }
            
            db.run('COMMIT', (err) => {
              if (err) {
                reject(err);
              } else {
                console.log('消息数据迁移完成');
                resolve();
              }
            });
          } catch (error) {
            db.run('ROLLBACK', () => {
              reject(error);
            });
          }
        });
      });
    }
    
    console.log('数据迁移完成！');
    return true;
  } catch (error) {
    console.error('数据迁移失败:', error);
    return false;
  }
}

// 关闭数据库连接
function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        console.error('关闭数据库连接失败:', err.message);
        reject(err);
      } else {
        console.log('数据库连接已关闭');
        resolve();
      }
    });
  });
}

module.exports = {
  db,
  dbOps,
  migrateData,
  closeDatabase
};