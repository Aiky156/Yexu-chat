const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const fs = require('fs');
const fetch = require('node-fetch');
require('dotenv').config();

// 确保数据目录存在
if (!fs.existsSync('./data')) {
  fs.mkdirSync('./data');
}

// 用户数据和聊天记录文件路径
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const CHAT_HISTORY_FILE = path.join(__dirname, 'data', 'chat_history.json');

// 初始化用户数据和聊天记录文件
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(CHAT_HISTORY_FILE)) {
  fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify([]));
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 创建上传目录
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

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

// 读取聊天历史
let chatHistory = [];
try {
  const chatHistoryData = fs.readFileSync(CHAT_HISTORY_FILE, 'utf8');
  chatHistory = JSON.parse(chatHistoryData);
} catch (error) {
  console.error('读取聊天历史失败:', error);
  chatHistory = [];
}

const MAX_HISTORY = 100; // 最多保存100条消息

// 读取用户数据
let users = [];
try {
  const userData = fs.readFileSync(USERS_FILE, 'utf8');
  users = JSON.parse(userData);
} catch (error) {
  console.error('读取用户数据失败:', error);
  users = [];
}

// 存储在线用户
let onlineUsers = new Set();
// 存储socket.id和用户ID的映射关系
let socketUserMap = new Map();

// 用户认证API
app.post('/api/auth/login', express.json(), (req, res) => {
  const { username, password } = req.body;
  
  // 查找用户
  const user = users.find(u => u.username === username);
  
  if (!user) {
    return res.status(401).json({ success: false, message: '用户名不存在' });
  }
  
  if (user.password !== password) {
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
});

// 用户注册API
app.post('/api/auth/register', express.json(), (req, res) => {
  const { username, password, avatar, avatarId } = req.body;
  
  // 检查用户名是否已存在
  if (users.some(u => u.username === username)) {
    return res.status(400).json({ success: false, message: '用户名已被占用' });
  }
  
  // 创建新用户
  const newUser = {
    id: uuidv4(),
    username,
    password,
    avatar,
    avatarId,
    createdAt: Date.now()
  };
  
  // 添加到用户列表
  users.push(newUser);
  
  // 保存到文件
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  
  // 返回用户信息（不包含密码）
  const userInfo = {
    id: newUser.id,
    username: newUser.username,
    avatar: newUser.avatar,
    avatarId: newUser.avatarId
  };
  
  res.status(201).json({ success: true, user: userInfo });
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

// 处理Socket.io连接
io.on('connection', (socket) => {
  console.log('用户已连接');
  
  // 发送聊天历史记录给新连接的用户
  socket.emit('chat history', chatHistory);
  
  // 用户加入时更新在线用户数量
  socket.on('user joined', (userData) => {
    onlineUsers.add(userData.id);
    // 保存socket.id和用户ID的映射关系
    socketUserMap.set(socket.id, userData.id);
    io.emit('online users count', onlineUsers.size);
  });
  
  // 处理新消息
  socket.on('chat message', (msg) => {
    console.log('收到消息:', msg);
    
    // 为消息添加唯一ID
    msg.id = uuidv4();
    
    // 添加到历史记录
    chatHistory.push(msg);
    if (chatHistory.length > MAX_HISTORY) {
      chatHistory.shift(); // 移除最旧的消息
    }
    
    // 保存聊天历史到文件
    fs.writeFile(CHAT_HISTORY_FILE, JSON.stringify(chatHistory), (err) => {
      if (err) console.error('保存聊天历史失败:', err);
    });
    
    // 广播消息给所有客户端
    io.emit('chat message', msg);
  });
  
  // 处理消息撤回
  socket.on('recall message', (data) => {
    const { messageId, userId, fileInfo } = data;
    console.log('收到撤回消息请求:', { messageId, userId, fileInfo });
    
    // 查找消息
    const messageIndex = chatHistory.findIndex(msg => msg.id === messageId);
    
    if (messageIndex !== -1) {
      const message = chatHistory[messageIndex];
      
      // 验证是否是消息发送者
      if (message.userId === userId) {
        // 标记消息为已撤回
        message.recalled = true;
        message.recallTime = Date.now(); // 记录撤回时间
        
        // 保存聊天历史到文件
        fs.writeFile(CHAT_HISTORY_FILE, JSON.stringify(chatHistory), (err) => {
          if (err) console.error('保存聊天历史失败:', err);
        });
        
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
                chatHistory.splice(messageIndex, 1);
                // 保存聊天历史到文件
                fs.writeFile(CHAT_HISTORY_FILE, JSON.stringify(chatHistory), (err) => {
                  if (err) console.error('保存聊天历史失败:', err);
                });
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
          setTimeout(() => {
            // 检查消息是否仍然被标记为已撤回（没有被重新编辑）
            const currentMsg = chatHistory.find(msg => msg.id === messageId);
            if (currentMsg && currentMsg.recalled) {
              // 删除本地文件
              try {
                const filePath = path.join(__dirname, 'uploads', message.file.filename);
                console.log('30秒后尝试删除文件:', filePath);
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath); // 使用同步方法确保删除成功
                  console.log('成功删除文件:', message.file.filename);
                  
                  // 从聊天历史中删除消息
                  const msgIndex = chatHistory.findIndex(msg => msg.id === messageId);
                  if (msgIndex !== -1) {
                    chatHistory.splice(msgIndex, 1);
                    // 保存聊天历史到文件
                    fs.writeFile(CHAT_HISTORY_FILE, JSON.stringify(chatHistory), (err) => {
                      if (err) console.error('保存聊天历史失败:', err);
                    });
                  }
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
          setTimeout(() => {
            // 检查消息是否仍然被标记为已撤回（没有被重新编辑）
            const currentMsg = chatHistory.find(msg => msg.id === messageId);
            if (currentMsg && currentMsg.recalled) {
              // 从聊天历史中删除消息
              const msgIndex = chatHistory.findIndex(msg => msg.id === messageId);
              if (msgIndex !== -1) {
                chatHistory.splice(msgIndex, 1);
                // 保存聊天历史到文件
                fs.writeFile(CHAT_HISTORY_FILE, JSON.stringify(chatHistory), (err) => {
                  if (err) console.error('保存聊天历史失败:', err);
                });
              }
            }
          }, 30000); // 30秒后执行
        }
      }
    }
  });
  
  // 处理消息重新编辑
  socket.on('edit recalled message', (data) => {
    const { messageId, userId, newText } = data;
    
    // 查找消息
    const messageIndex = chatHistory.findIndex(msg => msg.id === messageId);
    
    if (messageIndex !== -1) {
      const message = chatHistory[messageIndex];
      
      // 验证是否是消息发送者且消息已被撤回
      if (message.userId === userId && message.recalled) {
        // 检查是否在30秒内重新编辑
        const now = Date.now();
        if (message.recallTime && now - message.recallTime <= 30000) {
          // 更新消息内容
          message.text = newText;
          message.recalled = false; // 取消撤回标记
          delete message.recallTime; // 删除撤回时间
          
          // 保存聊天历史到文件
          fs.writeFile(CHAT_HISTORY_FILE, JSON.stringify(chatHistory), (err) => {
            if (err) console.error('保存聊天历史失败:', err);
          });
          
          // 广播更新后的消息给所有客户端
          io.emit('message edited', { messageId, newText });
        }
      }
    }
  });
  
  // 获取在线用户列表
  socket.on('get online users', () => {
    socket.emit('online users list', getUsersList());
  });
  
  // 辅助函数：获取在线用户列表
  function getUsersList() {
    const onlineUsersList = [];
    for (const userId of onlineUsers) {
      const user = users.find(u => u.id === userId);
      if (user) {
        onlineUsersList.push({
          id: user.id,
          username: user.username,
          avatar: user.avatar
        });
      }
    }
    return onlineUsersList;
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
      io.emit('online users list', getUsersList());
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
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});