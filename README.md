# 叶叙 聊天室

一个基于 Node.js 和 Socket.io 构建的实时聊天应用，支持用户认证、多媒体文件分享和实时消息互动。设计简洁、功能丰富、部署便捷。

![叶叙聊天室](https://img.shields.io/badge/叶叙-聊天室-brightgreen)
![版本](https://img.shields.io/badge/版本-1.0.0-blue)
![协议](https://img.shields.io/badge/协议-MIT-orange)
![Node.js](https://img.shields.io/badge/Node.js-14%2B-green)
![Socket.io](https://img.shields.io/badge/Socket.io-4.0%2B-yellowgreen)

## 📝 项目简介

叶叙聊天室是一个功能丰富而架构简洁的实时通讯应用，专为需要即时沟通的团队和社区设计。它提供完整的用户认证系统、实时消息传递、多媒体文件分享、消息引用回复、消息撤回与编辑等功能。界面采用响应式设计，支持在各种设备上流畅使用。

项目采用轻量级技术栈，使用SQLite数据库存储数据，无需复杂数据库配置，一键部署即可使用，非常适合小型团队或个人项目快速搭建聊天系统。

## ✨ 核心功能

### 用户系统
- **注册与登录**：支持用户注册、登录和"记住我"功能
- **个性化头像**：集成随机头像API，一键更换个人头像
- **用户状态**：实时显示在线用户列表和用户头像
- **Cookie认证**：支持会话保持，无需频繁登录

### 消息功能
- **实时通讯**：基于Socket.io的即时消息传递，无延迟体验
- **多媒体分享**：支持图片、视频、音频和文档等多种格式文件上传与在线预览
- **消息互动**：支持引用回复、表情选择、消息撤回和编辑
- **历史记录**：自动加载聊天历史，保持对话连贯性

### 界面体验
- **响应式设计**：完美适配移动端和桌面端
- **实时状态更新**：用户加入/离开提醒，消息已读状态
- **媒体文件预览**：支持图片缩放、视频播放等功能
- **侧边栏管理**：可折叠式侧边栏，优化小屏幕体验

### 系统特性
- **数据持久化**：聊天记录和用户信息本地存储
- **轻量级架构**：使用SQLite数据库，无需额外数据库服务
- **即插即用**：简单几步操作即可完成部署
- **容器化支持**：提供Docker部署方案，环境隔离

## 💪 技术优势

- **简洁高效**
  - 原生JavaScript开发，无需复杂框架，代码清晰易懂
  - 模块化设计，结构清晰，易于理解和维护
  - 精简依赖，减少冗余代码和潜在漏洞
  - 高性能Socket通信，支持大量并发连接

- **易于部署**
  - 一键安装依赖：仅需一条npm命令即可安装所有依赖
  - 零配置启动：无需复杂环境变量配置即可运行
  - 自动创建必要目录：首次运行自动生成所需文件结构
  - 支持快速迁移：整个应用可在不同环境间轻松迁移
  - 低系统资源需求：适用于各种规格的服务器环境
  - Docker支持：提供容器化部署方案，避免环境问题

## 🛠️ 技术栈

- **前端**：HTML5, CSS3, JavaScript (原生)
- **后端**：Node.js, Express
- **实时通信**：Socket.io
- **文件处理**：Multer
- **数据存储**：SQLite 数据库
- **其他工具**：UUID, dotenv, sqlite3
- **容器化**：Docker

## 🚀 安装和运行

### 前提条件

- Node.js (v12.0.0 或更高版本)
- npm (v6.0.0 或更高版本)
- 或者 Docker (用于容器化部署)

### 方式一：传统部署

1. 克隆仓库

```bash
git clone https://github.com/Aiky156/yexu-chat.git
cd yexu-chat
```

2. 安装依赖

```bash
npm install
```

3. 启动服务器

```bash
npm start
```

4. 访问应用

打开浏览器，访问 `http://localhost:3000`

### 方式二：Docker部署

使用Docker Hub官方镜像快速部署：

```bash
# 拉取官方镜像并运行
docker pull aiky156/yexu-chat:latest
docker run -d -p 3000:3000 -v yexu-data:/app/data -v yexu-uploads:/app/uploads --name yexu-chat aiky156/yexu-chat:latest
```

访问应用：打开浏览器，访问 `http://localhost:3000`

> **提示**：
> - 默认端口映射是3000:3000，如需修改可使用 `-p 8080:3000` 将容器3000端口映射到主机的8080端口
> - 生产环境建议使用Nginx反向代理，支持HTTPS访问增强安全性
> - 使用卷挂载 `-v` 参数可确保数据持久化，即使容器重启数据也不会丢失

## 📱 使用指南

### 用户认证

1. **首次访问**：系统会自动生成随机头像并提示用户注册或登录
2. **注册流程**：
   - 点击"注册"选项卡
   - 输入用户名（至少2个字符）和密码（至少6个字符）
   - 可点击头像区域或"更换头像"按钮随机更换头像
   - 点击"注册"按钮完成账号创建
3. **登录流程**：
   - 点击"登录"选项卡
   - 输入已注册的用户名和密码
   - 可选择"记住我"保持登录状态（7天有效期）
   - 点击"登录"按钮进入聊天室

### 聊天功能

1. **发送文本消息**：
   - 在底部输入框中输入内容
   - 点击发送按钮或按回车键发送消息

2. **发送文件**：
   - 点击文件上传按钮（回形针图标）
   - 选择要上传的文件
   - 系统会显示文件预览
   - 点击发送按钮上传并分享文件

3. **使用表情**：
   - 点击表情按钮（笑脸图标）
   - 从表情选择器中选择表情
   - 点击发送按钮或按回车键发送

4. **引用回复**：
   - 点击要回复的消息右上角的回复按钮
   - 输入回复内容
   - 点击发送按钮或按回车键发送引用回复

5. **撤回消息**：
   - 点击自己发送的消息右上角的撤回按钮
   - 可在30秒内选择"重新编辑"按钮修改消息内容
   - 30秒后消息将被完全撤回

6. **查看在线用户**：
   - 点击侧边栏切换按钮（左上角三横线图标）
   - 查看当前在线用户列表和头像网格
   - 再次点击可隐藏侧边栏

7. **查看媒体文件**：
   - 点击聊天中的媒体文件缩略图
   - 在弹出的模态框中查看大图或播放媒体文件
   - 支持图片缩放、视频和音频播放

## 📁 项目结构

```
yexu-chat/
├── data/               # 数据存储目录（项目启动自动生成）
│   └── database.sqlite # SQLite数据库文件
├── public/             # 前端静态资源
│   ├── css/            # 样式文件
│   │   └── style.css   # 主样式文件
│   ├── js/             # JavaScript文件
│   │   └── app.js      # 主应用逻辑
│   └── index.html      # 主HTML文件
├── uploads/            # 上传文件存储目录（自动生成）
├── server.js           # 服务器入口文件
├── db.js               # 数据库操作模块
├── package.json        # 项目配置和依赖
└── README.md           # 项目说明文档
```

## 📄 文件说明

### 前端文件

- **index.html**: 应用的主HTML结构，包含用户界面元素和模态框
- **style.css**: 定义应用的样式和响应式布局，支持移动端适配
- **app.js**: 前端主逻辑，处理用户交互、Socket.io通信和UI更新

### 后端文件

- **server.js**: 服务器入口文件，包含Express配置、Socket.io事件处理和API路由
- **db.js**: 数据库操作模块，处理用户数据和聊天历史的读写
- **package.json**: 项目依赖和脚本配置

### 数据库文件

- **database.sqlite**: SQLite数据库文件，包含以下表：
  - **users**: 存储用户账号信息，包括用户名、密码哈希和头像URL
  - **messages**: 存储聊天历史记录，包括文本消息和文件信息

## 🔧 API接口

### 认证接口

- `POST /api/auth/login`: 用户登录
  - 请求体: `{ username, password }`
  - 响应: `{ success, user, message }`

- `POST /api/auth/register`: 用户注册
  - 请求体: `{ username, password, avatar }`
  - 响应: `{ success, user, message }`

### 文件接口

- `POST /upload`: 上传文件
  - 请求: `multipart/form-data`
  - 响应: `{ success, file, message }`

### Socket.io事件

| 事件名 | 方向 | 描述 | 数据格式 |
|-------|------|------|----------|
| `connection` | 客户端→服务器 | 用户连接 | - |
| `user joined` | 客户端→服务器 | 用户加入 | `{ id, username, avatar }` |
| `chat message` | 双向 | 发送/接收消息 | `{ id, userId, username, avatar, text, type, timestamp, quoted }` |
| `chat history` | 服务器→客户端 | 获取聊天历史 | `[消息对象数组]` |
| `online users count` | 服务器→客户端 | 在线用户数量 | `number` |
| `online users list` | 服务器→客户端 | 在线用户列表 | `[用户对象数组]` |
| `recall message` | 客户端→服务器 | 撤回消息 | `{ messageId, userId }` |
| `message recalled` | 服务器→客户端 | 消息已撤回 | `{ messageId, userId }` |
| `edit recalled message` | 客户端→服务器 | 编辑已撤回消息 | `{ messageId, userId, newText }` |
| `message edited` | 服务器→客户端 | 消息已编辑 | `{ messageId, newText }` |

## 🛡️ 安全特性

- **密码安全**: 用户密码经过加密存储，不以明文保存
- **输入验证**: 对所有用户输入进行验证，防止恶意输入
- **文件上传限制**: 限制上传文件大小和类型，防止恶意文件
- **会话管理**: 使用安全的Cookie存储用户会话信息

## 🔍 未来计划

- [ ] 添加端到端加密功能
- [ ] 支持创建多个聊天室/频道
- [ ] 实现用户权限管理系统
- [ ] 添加消息搜索功能
- [ ] 支持更多文件格式的在线预览
- [ ] 优化移动端体验
- [ ] 添加国际化支持

## 📝 许可证

[MIT](LICENSE)

## 👥 贡献指南

欢迎提交问题和功能请求！如果您想为项目做出贡献，请遵循以下步骤：

1. Fork 项目
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个 Pull Request

## 📧 联系方式

如有任何问题或建议，请通过以下方式联系我们：

- 项目仓库: [GitHub Issues](https://github.com/Aiky156/yexu-chat/issues)
- 电子邮件: example@example.com

---

感谢使用叶叙聊天室！希望它能为您的团队或社区带来便捷的沟通体验。
