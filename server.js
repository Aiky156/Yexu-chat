const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const fs = require('fs');
const fetch = require('node-fetch');
const bcrypt = require('bcrypt');
require('dotenv').config();

// 密码哈希配置
const SALT_ROUNDS = 10;

// 导入数据库模块
const { dbOps, migrateData } = require('./db');

// 确保数据目录存在
if (!fs.existsSync('./data')) {
  fs.mkdirSync('./data');
}

// 确保上传目录存在
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    // 解决中文文件名编码问题
    const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const uniqueFilename = `${Date.now()}-${uuidv4()}${path.extname(originalname)}`;
    cb(null, uniqueFilename);
  }
});

const upload = multer({ storage });

// 处理文件上传
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有文件上传' });
  }
  
  // 解决中文文件名编码问题
  const originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  
  const fileInfo = {
    filename: req.file.filename,
    originalname: originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: `/uploads/${req.file.filename}`
  };
  
  res.json(fileInfo);
});

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 数据已迁移完成，不再执行迁移代码

// 用户认证API
app.post('/api/auth/login', express.json(), async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // 查找用户
    const user = await dbOps.users.findByUsername(username);
    
    if (!user) {
      return res.status(401).json({ success: false, message: '用户名不存在' });
    }
    
    // 检查密码是否已经哈希过
    let passwordMatch = false;
    
    if (user.password.startsWith('$2')) {
      // 密码已经哈希过，使用bcrypt比较
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      // 旧密码，直接比较
      passwordMatch = (user.password === password);
      
      // 如果匹配成功，自动升级为哈希密码
      if (passwordMatch) {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        await dbOps.users.update(user.id, { password: hashedPassword });
        console.log(`用户 ${username} 的密码已自动升级为哈希存储`);
      }
    }
    
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: '密码错误' });
    }
    
    // 返回用户信息（不包含密码）
    const userInfo = {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      avatarId: user.avatarId
    };
    
    res.json({ success: true, user: userInfo });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误，请稍后再试' });
  }
});

// 用户注册API
app.post('/api/auth/register', express.json(), async (req, res) => {
  const { username, password, avatar, avatarId } = req.body;
  
  try {
    // 检查用户名是否已存在
    const existingUser = await dbOps.users.findByUsername(username);
    
    if (existingUser) {
      return res.status(400).json({ success: false, message: '用户名已被占用' });
    }
    
    // 对密码进行哈希处理
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    // 创建新用户
    const newUser = {
      id: uuidv4(),
      username,
      password: hashedPassword,
      avatar: avatar || `https://images.xxapi.cn/images/head/${Math.floor(Math.random() * 1000000000).toString().padStart(10, '0')}.jpg`,
      avatarId: avatarId || null,
      createdAt: Date.now()
    };
    
    // 添加到用户列表
    await dbOps.users.create(newUser);
    
    // 返回用户信息（不包含密码）
    const userInfo = {
      id: newUser.id,
      username: newUser.username,
      avatar: newUser.avatar,
      avatarId: newUser.avatarId
    };
    
    res.status(201).json({ success: true, user: userInfo });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ success: false, message: '服务器错误，请稍后再试' });
  }
});

// 修改密码API
app.post('/api/auth/change-password', express.json(), async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  
  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: '缺少必要参数' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: '新密码长度必须至少为6个字符' });
  }
  
  try {
    // 查找用户
    const user = await dbOps.users.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 验证当前密码
    let passwordMatch = false;
    
    if (user.password.startsWith('$2')) {
      // 密码已经哈希过，使用bcrypt比较
      passwordMatch = await bcrypt.compare(currentPassword, user.password);
    } else {
      // 旧密码，直接比较
      passwordMatch = (user.password === currentPassword);
    }
    
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: '当前密码错误' });
    }
    
    // 对新密码进行哈希处理
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    // 更新密码
    await dbOps.users.update(userId, { password: hashedPassword });
    
    res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({ success: false, message: '服务器错误，请稍后再试' });
  }
});

// 获取随机头像API
app.get('/api/avatar/random', async (req, res) => {
  try {
    const response = await fetch('https://cn.apihz.cn/api/img/apihzimgtx.php?id=88888888&key=88888888&type=1');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('获取头像失败:', error);
    res.status(500).json({ success: false, message: '获取头像失败' });
  }
});

// 获取用户列表API
app.get('/api/users', async (req, res) => {
  try {
    const users = (await dbOps.users.getAll()).map(user => ({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      avatarId: user.avatarId
    }));
    res.json(users);
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误，请稍后再试' });
  }
});

// 获取消息历史API
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await dbOps.messages.getAll();
    res.json(messages);
  } catch (error) {
    console.error('获取消息历史失败:', error);
    res.status(500).json({ success: false, message: '服务器错误，请稍后再试' });
  }
});

// 存储在线用户
let onlineUsers = new Set();
// 存储socket.id和用户ID的映射关系
let socketUserMap = new Map();

// 处理Socket.io连接
io.on('connection', (socket) => {
  console.log('用户已连接');
  
  // 获取并发送聊天历史记录给新连接的用户
  dbOps.messages.getAll().then(messages => {
    socket.emit('chat history', messages);
  }).catch(error => {
    console.error('获取聊天历史失败:', error);
  });
  
  // 用户加入时更新在线用户数量
  socket.on('user joined', (userData) => {
    onlineUsers.add(userData.id);
    // 保存socket.id和用户ID的映射关系
    socketUserMap.set(socket.id, userData.id);
    io.emit('online users count', onlineUsers.size);
  });
  
  // 处理新消息
  socket.on('chat message', async (msg) => {
    console.log('收到消息:', msg);
    
    try {
      // 为消息添加唯一ID
      msg.id = uuidv4();
      msg.timestamp = msg.timestamp || Date.now();
      
      // 添加到数据库
      await dbOps.messages.create(msg);
      
      // 广播消息给所有客户端
      io.emit('chat message', msg);
    } catch (error) {
      console.error('保存消息失败:', error);
    }
  });
  
  // 处理消息
  socket.on('message', async (messageData) => {
    const message = {
      ...messageData,
      id: uuidv4(),
      timestamp: Date.now()
    };
    
    try {
      // 保存消息到数据库
      await dbOps.messages.create(message);
      
      // 广播消息给所有客户端
      io.emit('message', message);
    } catch (error) {
      console.error('保存消息失败:', error);
    }
  });
  
  // 处理消息撤回
  socket.on('recall message', async (data) => {
    const { messageId, userId, fileInfo } = data;
    console.log('收到撤回消息请求:', { messageId, userId, fileInfo });
    
    try {
      // 查找消息
      const message = await dbOps.messages.findById(messageId);
      
      if (message) {
        // 验证是否是消息发送者
        if (message.userId === userId) {
          // 标记消息为已撤回
          const recallTime = Date.now();
          await dbOps.messages.update(messageId, { recalled: true, recallTime });
          
          // 广播撤回消息给所有客户端
          io.emit('message recalled', { messageId, userId });
          
          // 如果客户端明确指示要立即删除文件（fileInfo存在）
          if (fileInfo && fileInfo.filePath) {
            console.log('尝试立即删除文件:', fileInfo);
            
            // 尝试删除文件
            let deleteResult = false;
            try {
              // 从filePath中提取文件名 - 兼容不同操作系统
              let filename;
              if (fileInfo.filePath.includes('/')) {
                filename = fileInfo.filePath.split('/').pop(); // 网址形式的路径
              } else if (fileInfo.filePath.includes('\\')) {
                filename = fileInfo.filePath.split('\\').pop(); // Windows形式的路径
              } else {
                filename = fileInfo.filePath; // 直接是文件名
              }
              
              if (filename) {
                console.log('尝试删除文件:', filename);
                // 构建完整的文件路径
                const fullFilePath = path.join(__dirname, 'uploads', filename);
                console.log('完整文件路径:', fullFilePath);
                
                // 检查文件是否存在
                if (fs.existsSync(fullFilePath)) {
                  console.log('文件存在，准备删除');
                  // 删除文件
                  fs.unlinkSync(fullFilePath); // 使用同步版本确保删除完成
                  console.log('成功立即删除文件:', filename);
                  deleteResult = true;
                  
                  // 从聊天历史中删除消息
                  await dbOps.messages.delete(messageId);
                } else {
                  console.log('文件不存在:', fullFilePath);
                }
              }
            } catch (error) {
              console.error('立即删除文件失败:', error);
            }
            
            if (deleteResult) {
              return; // 如果成功删除文件，则不需要后续处理
            }
          }
          
          // 如果是文件消息，30秒后删除文件（当没有fileInfo或立即删除失败时的后备策略）
          if (message.type === 'file' && message.file && message.file.filename) {
            setTimeout(async () => {
              // 检查消息是否仍然被标记为已撤回（没有被重新编辑）
              const currentMsg = await dbOps.messages.findById(messageId);
              if (currentMsg && currentMsg.recalled) {
                // 删除本地文件
                try {
                  const filePath = path.join(__dirname, 'uploads', message.file.filename);
                  console.log('30秒后尝试删除文件:', filePath);
                  if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath); // 使用同步方法确保删除成功
                    console.log('成功删除文件:', message.file.filename);
                    
                    // 从聊天历史中删除消息
                    await dbOps.messages.delete(messageId);
                  } else {
                    console.log('文件不存在，无法删除:', filePath);
                  }
                } catch (error) {
                  console.error('删除文件失败:', error);
                }
              }
            }, 30000); // 30秒后执行
          } else {
            // 文本消息30秒后从历史记录中删除
            setTimeout(async () => {
              // 检查消息是否仍然被标记为已撤回（没有被重新编辑）
              const currentMsg = await dbOps.messages.findById(messageId);
              if (currentMsg && currentMsg.recalled) {
                // 从聊天历史中删除消息
                await dbOps.messages.delete(messageId);
              }
            }, 30000); // 30秒后执行
          }
        }
      }
    } catch (error) {
      console.error('处理消息撤回失败:', error);
    }
  });
  
  // 处理消息重新编辑
  socket.on('edit recalled message', async (data) => {
    const { messageId, userId, newText } = data;
    
    try {
      // 查找消息
      const message = await dbOps.messages.findById(messageId);
      
      if (message) {
        // 验证是否是消息发送者且消息已被撤回
        if (message.userId === userId && message.recalled) {
          // 检查是否在30秒内重新编辑
          const now = Date.now();
          if (message.recallTime && now - message.recallTime <= 30000) {
            // 更新消息内容
            await dbOps.messages.update(messageId, {
              text: newText,
              recalled: false,
              recallTime: null
            });
            
            // 广播更新后的消息给所有客户端
            io.emit('message edited', { messageId, newText });
          }
        }
      }
    } catch (error) {
      console.error('编辑消息失败:', error);
    }
  });
  
  // 获取在线用户列表
  socket.on('get online users', () => {
    getUsersList().then(list => {
      socket.emit('online users list', list);
    }).catch(error => {
      console.error('获取在线用户列表失败:', error);
    });
  });
  
  // 辅助函数：获取在线用户列表
  async function getUsersList() {
    try {
      const onlineUsersList = [];
      const uniqueUsers = new Set(); // 用于去重
      
      for (const userId of onlineUsers) {
        const user = await dbOps.users.findById(userId);
        if (user && !uniqueUsers.has(user.id)) {
          uniqueUsers.add(user.id);
          onlineUsersList.push({
            id: user.id,
            username: user.username,
            avatar: user.avatar
          });
        }
      }
      
      // 确保在线用户数量与返回列表数量一致
      if (onlineUsers.size !== onlineUsersList.length) {
        console.log(`实际在线用户数量(${onlineUsers.size})与列表数量(${onlineUsersList.length})不一致，已修正`);
        // 清理onlineUsers集合，确保只包含有效用户
        onlineUsers = new Set(uniqueUsers);
      }
      
      return onlineUsersList;
    } catch (error) {
      console.error('获取用户列表失败:', error);
      return [];
    }
  }
  
  // 处理断开连接
  socket.on('disconnect', () => {
    console.log('用户已断开连接');
    
    // 用户离开时更新在线用户数量
    const userId = socketUserMap.get(socket.id);
    if (userId) {
      // 从在线用户集合中移除
      onlineUsers.delete(userId);
      // 从映射关系中移除
      socketUserMap.delete(socket.id);
      // 广播更新后的在线用户数量
      io.emit('online users count', onlineUsers.size);
      // 广播更新后的在线用户列表
      getUsersList().then(list => {
        io.emit('online users list', list);
      }).catch(error => {
        console.error('获取在线用户列表失败:', error);
      });
    }
  });

  // 处理文件删除
  socket.on('delete file', (data) => {
    const { fileId, filePath } = data;
    
    console.log('收到文件删除请求:', { fileId, filePath });
    
    if (filePath) {
      try {
        // 从filePath中提取文件名 - 兼容不同操作系统
        let filename;
        if (filePath.includes('/')) {
          filename = filePath.split('/').pop(); // 网址形式的路径
        } else if (filePath.includes('\\')) {
          filename = filePath.split('\\').pop(); // Windows形式的路径
        } else {
          filename = filePath; // 直接是文件名
        }
        
        if (filename) {
          console.log('尝试删除文件:', filename);
          // 构建完整的文件路径
          const fullFilePath = path.join(__dirname, 'uploads', filename);
          console.log('完整文件路径:', fullFilePath);
          
          // 检查文件是否存在
          if (fs.existsSync(fullFilePath)) {
            console.log('文件存在，准备删除');
            // 删除文件
            fs.unlinkSync(fullFilePath); // 使用同步版本确保删除完成
            console.log('成功删除文件:', filename);
            return true;
          } else {
            console.log('文件不存在:', fullFilePath);
          }
        }
      } catch (error) {
        console.error('删除文件出错:', error);
      }
    }
    return false;
  });
  
  // 处理消息删除
  socket.on('deleteMessage', async (messageId) => {
    try {
      const deletedMessage = await dbOps.messages.delete(messageId);
      if (deletedMessage) {
        io.emit('messageDeleted', messageId);
      }
    } catch (error) {
      console.error('删除消息失败:', error);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});