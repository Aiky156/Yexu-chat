const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const readline = require('readline');
const bcrypt = require('bcrypt');

// 盐轮数常量
const SALT_ROUNDS = 10;

// 数据库文件路径
const DB_PATH = path.join(__dirname, 'data', 'database.sqlite');

// 创建数据库连接
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('连接到SQLite数据库失败:', err.message);
    process.exit(1);
  } else {
    console.log('已成功连接到SQLite数据库');
  }
});

// 创建命令行接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 查询用户
function findUserByUsername(username) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// 更新用户密码
async function updateUserPassword(userId, newPassword) {
  try {
    // 生成密码哈希
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    return new Promise((resolve, reject) => {
      db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId], function(err) {
        if (err) {
          reject(err);
        } else if (this.changes === 0) {
          reject(new Error('未找到用户'));
        } else {
          resolve(true);
        }
      });
    });
  } catch (error) {
    console.error('哈希密码失败:', error.message);
    throw new Error('密码加密失败，请检查bcrypt库是否正确安装');
  }
}

// 主函数
async function resetPassword() {
  try {
    // 获取用户名
    const username = await new Promise(resolve => {
      rl.question('请输入要重置密码的用户名: ', answer => {
        resolve(answer.trim());
      });
    });
    
    if (!username) {
      console.error('用户名不能为空');
      return resetPassword();
    }
    
    // 查找用户
    const user = await findUserByUsername(username);
    if (!user) {
      console.error(`用户 "${username}" 不存在`);
      return resetPassword();
    }
    
    console.log(`已找到用户: ${username} (ID: ${user.id})`);
    
    // 获取新密码或使用默认密码
    const useDefault = await new Promise(resolve => {
      rl.question('是否使用默认密码 "123456"? (y/n): ', answer => {
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === '');
      });
    });
    
    let newPassword = '123456';
    
    if (!useDefault) {
      newPassword = await new Promise(resolve => {
        rl.question('请输入新密码: ', answer => {
          resolve(answer.trim());
        });
      });
      
      if (newPassword.length < 6) {
        console.error('密码长度必须至少为6个字符');
        return resetPassword();
      }
    }
    
    // 确认重置
    const confirm = await new Promise(resolve => {
      rl.question(`确认将用户 "${username}" 的密码重置为 "${newPassword}"? (y/n): `, answer => {
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === '');
      });
    });
    
    if (!confirm) {
      console.log('已取消密码重置');
      return resetPassword();
    }
    
    // 更新密码
    await updateUserPassword(user.id, newPassword);
    console.log(`用户 "${username}" 的密码已成功重置为 "${newPassword}"`);
    
    // 询问是否继续
    const continueReset = await new Promise(resolve => {
      rl.question('是否继续重置其他用户密码? (y/n): ', answer => {
        resolve(answer.toLowerCase() === 'y');
      });
    });
    
    if (continueReset) {
      return resetPassword();
    } else {
      rl.close();
      db.close();
      console.log('密码重置工具已退出');
    }
  } catch (error) {
    console.error('密码重置失败:', error.message);
    const retry = await new Promise(resolve => {
      rl.question('是否重试? (y/n): ', answer => {
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === '');
      });
    });
    
    if (retry) {
      return resetPassword();
    } else {
      rl.close();
      db.close();
      console.log('密码重置工具已退出');
    }
  }
}

// 启动密码重置流程
console.log('=== 用户密码重置工具 ===');
console.log('数据库路径:', DB_PATH);
resetPassword().catch(err => {
  console.error('程序出错:', err);
  rl.close();
  db.close();
  process.exit(1);
});