# 叶叙 聊天室

一个基于 Node.js 和 Socket.io 构建的实时聊天应用，支持多媒体文件分享和在线预览。设计简洁、部署便捷。

![叶叙聊天室](https://img.shields.io/badge/叶叙-聊天室-brightgreen)
![版本](https://img.shields.io/badge/版本-1.0.0-blue)
![协议](https://img.shields.io/badge/协议-MIT-orange)

## 📝 项目简介

叶叙聊天室是一个功能丰富而架构简洁的实时通讯应用，提供用户注册登录、实时消息传递、多媒体文件分享、消息引用回复、消息撤回与编辑等功能。界面响应式设计，支持移动端和桌面端访问。采用轻量级技术栈，无需复杂数据库配置，一键部署即可使用。

## ✨ 功能特点

- **用户系统**：支持注册、登录和记住登录状态
- **实时通讯**：基于 Socket.io 的即时消息传递
- **多媒体分享**：支持图片、视频、音频和文档等多种格式文件上传与预览
- **消息互动**：支持消息引用回复、表情选择、消息撤回和编辑
- **用户状态**：显示在线用户列表和用户头像
- **界面优化**：响应式设计，支持移动端和桌面端
- **数据持久化**：聊天记录和用户信息本地存储
- **轻量级架构**：无需数据库，使用JSON文件存储数据，系统资源占用少
- **即插即用**：简单几步操作即可完成部署，无需复杂配置
- **容器化部署**：支持Docker容器化部署，便于在各种环境快速启动

## 💪 项目优势

- **简洁性**
  - 原生JavaScript开发，无需复杂框架，代码清晰易懂
  - 使用JSON文件存储，无需配置数据库
  - 模块化设计，结构清晰，易于理解和维护
  - 精简依赖，减少冗余代码和潜在漏洞

- **部署便捷性**
  - 一键安装依赖：仅需一条npm命令即可安装所有依赖
  - 零配置启动：无需环境变量配置即可运行
  - 自动创建必要目录：首次运行自动生成所需文件结构
  - 支持快速迁移：整个应用可在不同环境间轻松迁移
  - 低系统资源需求：适用于各种规格的服务器环境
  - Docker支持：支持容器化部署，无需担心环境配置问题

## 🛠️ 技术栈

- **前端**：HTML5, CSS3, JavaScript (原生)
- **后端**：Node.js, Express
- **实时通信**：Socket.io
- **文件处理**：Multer
- **数据存储**：本地 JSON 文件
- **其他工具**：UUID, dotenv
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

```bash
# 方法1：使用Docker Hub镜像
docker pull aiky156/yexu-chat:latest
docker run -d -p 3000:3000 -v yexu-data:/app/data -v yexu-uploads:/app/uploads --name yexu-chat aiky156/yexu-chat:latest

# 方法2：本地构建镜像
git clone https://github.com/Aiky156/yexu-chat.git
cd yexu-chat
docker build -t yexu-chat .
docker run -d -p 3000:3000 -v yexu-data:/app/data -v yexu-uploads:/app/uploads --name yexu-chat yexu-chat
```

访问应用：打开浏览器，访问 `http://localhost:3000`

### Docker部署说明

- 数据持久化：应用的数据（聊天记录和用户信息）和上传文件通过Docker卷进行持久化
- 端口映射：默认将容器内的3000端口映射到主机的3000端口
- 环境变量：可通过环境变量配置应用参数（例如：`-e PORT=8080`）

| 环境变量 | 描述 | 默认值 |
|----------|------|--------|
| PORT | 应用监听端口 | 3000 |
| NODE_ENV | 环境模式 | production |
| MAX_UPLOAD_SIZE | 最大上传文件大小(MB) | 50 |

## 📱 使用流程

### 用户认证

1. 首次访问时，系统会自动生成随机头像并提示用户注册或登录
2. 注册：输入用户名和密码，可以更换随机头像
3. 登录：输入已注册的用户名和密码，可选择"记住我"保持登录状态

### 聊天功能

1. 发送文本消息：在输入框中输入内容，点击发送按钮或按回车键
2. 发送文件：点击文件上传按钮，选择文件后点击发送
3. 使用表情：点击表情按钮，从表情选择器中选择表情
4. 引用回复：点击消息右上角的回复按钮，输入回复内容后发送
5. 撤回消息：点击自己发送的消息右上角的撤回按钮，可在30秒内重新编辑
6. 查看在线用户：点击侧边栏切换按钮，查看当前在线用户列表
7. 查看媒体文件：点击聊天中的媒体文件缩略图，可在弹窗中查看大图或播放媒体

## 📁 项目结构

```
yexu-chat/
├── data/               # 数据存储目录
│   ├── chat_history.json  # 聊天历史记录
│   └── users.json      # 用户数据
├── public/             # 前端静态资源
│   ├── css/            # 样式文件
│   │   └── style.css   # 主样式文件
│   ├── js/             # JavaScript文件
│   │   └── app.js      # 主应用逻辑
│   └── index.html      # 主HTML文件
├── uploads/            # 上传文件存储目录
├── server.js           # 服务器入口文件
├── package.json        # 项目配置和依赖
└── README.md           # 项目说明文档
```

## 📄 文件说明

### 前端文件

- **index.html**: 应用的主HTML结构，包含用户界面元素
- **style.css**: 定义应用的样式和响应式布局
- **app.js**: 前端主逻辑，处理用户交互、Socket.io通信和UI更新

### 后端文件

- **server.js**: 服务器入口文件，包含Express配置、Socket.io事件处理和API路由
- **package.json**: 项目依赖和脚本配置

### 数据文件

- **users.json**: 存储用户账号信息
- **chat_history.json**: 存储聊天历史记录

## 🔧 API接口

### 认证接口

- `POST /api/auth/login`: 用户登录
- `POST /api/auth/register`: 用户注册
- `GET /api/avatar/random`: 获取随机头像

### 文件接口

- `POST /upload`: 上传文件

### Socket.io事件

- `connection`: 用户连接
- `chat message`: 发送/接收消息
- `user joined`: 用户加入
- `chat history`: 获取聊天历史
- `online users count`: 在线用户数量
- `online users list`: 在线用户列表
- `recall message`: 撤回消息
- `message recalled`: 消息已撤回
- `edit recalled message`: 编辑已撤回消息
- `message edited`: 消息已编辑

## 📝 许可证

[MIT](LICENSE)

## 贡献指南

欢迎提交问题和功能请求！
