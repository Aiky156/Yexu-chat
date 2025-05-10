// 全局变量
let socket;
let currentUser = null;
let selectedFile = null;
let avatarUrl = null;
let avatarId = null;
let quotedMessage = null; // 存储被引用的消息
let chatHistory = []; // 存储聊天历史
let newMessagesCount = 0;
let lastSeenMessageIndex = 0;

// DOM元素
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-btn');
const fileInput = document.getElementById('file-input');
const fileUploadBtn = document.getElementById('file-upload-btn');
const filePreview = document.getElementById('file-preview');
const previewContent = document.getElementById('preview-content');
const removeFileBtn = document.getElementById('remove-file');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const sidebar = document.getElementById('sidebar');
const userSetupModal = document.getElementById('user-setup-modal');
const mediaModal = document.getElementById('media-modal');
const modalContentContainer = document.getElementById('modal-content-container');
const closeModal = document.querySelector('.close-modal');
const emojiBtn = document.getElementById('emoji-btn');
const emojiPicker = document.getElementById('emoji-picker');
const replyPreview = document.getElementById('reply-preview');
const cancelReplyBtn = document.getElementById('cancel-reply');
const onlineAvatars = document.getElementById('online-avatars');

// 认证相关DOM元素
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginUsername = document.getElementById('login-username');
const loginPassword = document.getElementById('login-password');
const rememberMe = document.getElementById('remember-me');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const registerUsername = document.getElementById('register-username');
const registerPassword = document.getElementById('register-password');
const confirmPassword = document.getElementById('confirm-password');
const registerBtn = document.getElementById('register-btn');
const registerError = document.getElementById('register-error');
const selectedAvatar = document.getElementById('selected-avatar');
const changeAvatarBtn = document.getElementById('change-avatar');

// Cookie操作函数
function setCookie(name, value, days) {
  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = '; expires=' + date.toUTCString();
  }
  document.cookie = name + '=' + encodeURIComponent(JSON.stringify(value)) + expires + '; path=/';
}

function getCookie(name) {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      try {
        return JSON.parse(decodeURIComponent(c.substring(nameEQ.length, c.length)));
      } catch (e) {
        return null;
      }
    }
  }
  return null;
}

function eraseCookie(name) {
  document.cookie = name + '=; Max-Age=-99999999; path=/';
}

// 用户信息管理
function loadUserInfo() {
  // 尝试从cookie中获取用户信息
  const savedUser = getCookie('user_info');
  
  if (savedUser) {
    currentUser = savedUser;
    document.getElementById('username').textContent = currentUser.username;
    document.getElementById('user-avatar').src = currentUser.avatar;
    return true;
  }
  return false;
}

function saveUserInfo(user, remember = false) {
  currentUser = user;
  
  // 如果选择了记住我，则保存到cookie中，有效期7天
  if (remember) {
    setCookie('user_info', currentUser, 7);
  }
  
  document.getElementById('username').textContent = currentUser.username;
  document.getElementById('user-avatar').src = currentUser.avatar;
}

function logout() {
  currentUser = null;
  eraseCookie('user_info');
  userSetupModal.classList.remove('hidden');
  if (socket) {
    socket.disconnect();
  }
  // 重置用户名和头像
  document.getElementById('username').textContent = '未登录';
  document.getElementById('user-avatar').src = '';
  // 清空在线用户列表
  document.getElementById('users-list').innerHTML = '';
  document.getElementById('online-avatars').innerHTML = '';
  // 重新初始化用户认证
  initUserAuth();
}

// 随机头像生成
async function getRandomAvatar() {
  try {
    const response = await fetch('https://v2.xxapi.cn/api/head');
    const data = await response.json();
    
    if (data.code === 200 && data.data) {
      avatarUrl = data.data;
      return avatarUrl;
    } else {
      console.error('获取头像失败:', data);
      return 'https://via.placeholder.com/100';
    }
  } catch (error) {
    console.error('获取头像API错误:', error);
    return 'https://via.placeholder.com/100';
  }
}

// 初始化用户认证
async function initUserAuth() {
  const hasUser = loadUserInfo();
  
  if (!hasUser) {
    const randomAvatar = await getRandomAvatar();
    selectedAvatar.src = randomAvatar;
    userSetupModal.classList.remove('hidden');
  } else {
    initSocketConnection();
  }
  
  // 登录/注册标签切换
  loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  });
  
  registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  });
  
  // 更换头像按钮
  changeAvatarBtn.addEventListener('click', async () => {
    const newAvatar = await getRandomAvatar();
    selectedAvatar.src = newAvatar;
  });
  
  // 点击头像框也可以更换头像
  const currentAvatarContainer = document.querySelector('.current-avatar');
  if (currentAvatarContainer) {
    currentAvatarContainer.addEventListener('click', async () => {
      const newAvatar = await getRandomAvatar();
      selectedAvatar.src = newAvatar;
    });
    currentAvatarContainer.style.cursor = 'pointer'; // 添加指针样式，提示可点击
  }
  
  // 登录按钮
  loginBtn.addEventListener('click', async () => {
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();
    const remember = rememberMe.checked;
    
    if (username.length < 2) {
      loginError.textContent = '请输入至少2个字符的用户名';
      loginError.classList.remove('hidden');
      return;
    }
    
    if (password.length < 6) {
      loginError.textContent = '请输入至少6个字符的密码';
      loginError.classList.remove('hidden');
      return;
    }
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        saveUserInfo(data.user, remember);
        userSetupModal.classList.add('hidden');
        initSocketConnection();
      } else {
        loginError.textContent = data.message || '登录失败，请检查用户名和密码';
        loginError.classList.remove('hidden');
      }
    } catch (error) {
      console.error('登录错误:', error);
      loginError.textContent = '登录失败，请稍后再试';
      loginError.classList.remove('hidden');
    }
  });
  
  // 注册按钮
  registerBtn.addEventListener('click', async () => {
    const username = registerUsername.value.trim();
    const password = registerPassword.value.trim();
    const confirmPwd = confirmPassword.value.trim();
    
    if (username.length < 2) {
      registerError.textContent = '请输入至少2个字符的用户名';
      registerError.classList.remove('hidden');
      return;
    }
    
    if (password.length < 6) {
      registerError.textContent = '请输入至少6个字符的密码';
      registerError.classList.remove('hidden');
      return;
    }
    
    if (password !== confirmPwd) {
      registerError.textContent = '两次输入的密码不一致';
      registerError.classList.remove('hidden');
      return;
    }
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password,
          avatar: selectedAvatar.src,
          avatarId: null
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        saveUserInfo(data.user, true);
        userSetupModal.classList.add('hidden');
        initSocketConnection();
      } else {
        registerError.textContent = data.message || '注册失败，请尝试其他用户名';
        registerError.classList.remove('hidden');
      }
    } catch (error) {
      console.error('注册错误:', error);
      registerError.textContent = '注册失败，请稍后再试';
      registerError.classList.remove('hidden');
    }
  });
}

// 初始化Socket连接
function initSocketConnection() {
  // 断开可能存在的之前的连接
  if (socket) {
    console.log('断开现有连接并创建新连接');
    socket.disconnect();
  }
  
  // 连接到Socket.io服务器
  socket = io();
  
  // 监听连接事件
  socket.on('connect', () => {
    console.log('已连接到服务器');
    // 发送系统消息
    addSystemMessage(`${currentUser.username} 加入了聊天室`);
    
    // 发送用户加入事件
    socket.emit('user joined', currentUser);
  });
  
  // 绑定退出登录按钮事件
  document.getElementById('logout-btn').addEventListener('click', () => {
    logout();
  });
  
  // 监听聊天历史
  socket.on('chat history', (history) => {
    messagesContainer.innerHTML = '';
    // 保存聊天历史
    chatHistory = history;
    history.forEach(msg => {
      addMessageToUI(msg);
    });
    scrollToBottom();
  });
  
  // 监听新消息
  socket.on('chat message', (msg) => {
    // 添加到本地聊天历史
    chatHistory.push(msg);
    addMessageToUI(msg);
    scrollToBottom();
  });
  
  // 监听在线用户数量更新
  socket.on('online users count', (count) => {
    updateOnlineUsersCount(count);
    // 请求在线用户列表
    socket.emit('get online users');
  });
  
  // 监听在线用户列表更新
  socket.on('online users list', (usersList) => {
    updateOnlineUsersList(usersList);
  });
  
  // 监听消息撤回
  socket.on('message recalled', (data) => {
    const { messageId, userId } = data;
    console.log('收到消息撤回事件:', { messageId, userId, isSelf: userId === currentUser.id });
    handleMessageRecall(messageId, userId);
  });
  
  // 监听消息编辑
  socket.on('message edited', (data) => {
    const { messageId, newText } = data;
    handleMessageEdit(messageId, newText);
    scrollToBottom();
  });
  
  // 监听断开连接
  socket.on('disconnect', () => {
    console.log('与服务器断开连接');
  });
  
  // 初始化表情选择器
  initEmojiPicker();
  
  // 初始化引用回复功能
  initReplyFeature();
  
  // 初始化自动滚动
  initAutoScroll();
}

// 更新在线用户数量显示
function updateOnlineUsersCount(count) {
  const onlineUsersTitle = document.querySelector('.online-users h3');
  onlineUsersTitle.textContent = `在线用户 (${count})`;
}

// 更新在线用户列表
function updateOnlineUsersList(usersList) {
  // 清空现有列表
  const usersList_el = document.getElementById('users-list');
  usersList_el.innerHTML = '';
  onlineAvatars.innerHTML = '';
  
  // 添加用户到列表
  usersList.forEach(user => {
    // 添加到头像网格
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'online-avatar-container';
    avatarDiv.title = user.username;
    
    const avatar = document.createElement('img');
    avatar.className = 'online-avatar';
    avatar.src = user.avatar;
    avatar.alt = user.username;
    
    const statusDot = document.createElement('span');
    statusDot.className = 'user-status';
    
    avatarDiv.appendChild(avatar);
    avatarDiv.appendChild(statusDot);
    onlineAvatars.appendChild(avatarDiv);
    
    // 添加到用户列表
    const li = document.createElement('li');
    
    const userAvatar = document.createElement('img');
    userAvatar.className = 'user-avatar-small';
    userAvatar.src = user.avatar;
    userAvatar.alt = user.username;
    
    const userName = document.createElement('span');
    userName.textContent = user.username;
    
    li.appendChild(userAvatar);
    li.appendChild(userName);
    usersList_el.appendChild(li);
  });
}

// 处理消息撤回
function handleMessageRecall(messageId, userId) {
  const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
  if (messageElement) {
    console.log('找到要撤回的消息元素:', messageId);
    const username = messageElement.querySelector('.message-sender').textContent;
    const recalledDiv = document.createElement('div');
    recalledDiv.className = 'message-recalled';
    recalledDiv.dataset.messageId = messageId;
    
    // 查找消息在聊天历史中的索引
    const messageIndex = chatHistory.findIndex(msg => msg.id === messageId);
    const messageData = messageIndex !== -1 ? chatHistory[messageIndex] : null;
    
    console.log('消息数据:', messageData ? {
      type: messageData.type,
      id: messageData.id,
      userId: messageData.userId,
      hasFileInfo: !!messageData.fileInfo,
      hasFile: !!messageData.file
    } : 'Not found in chat history');
    
    // 如果是当前用户撤回的消息
    if (userId === currentUser.id) {
      // 获取消息类型
      let isFileMessage = false;
      let fileData = null;
      let originalText = '';
      
      if (messageData) {
        if (messageData.type === 'text') {
          originalText = messageData.text;
        } else if (messageData.type === 'file') {
          isFileMessage = true;
          fileData = messageData.fileInfo || messageData.file;
        }
      } else {
        const textElement = messageElement.querySelector('.message-text');
        if (textElement) {
          originalText = textElement.textContent;
        }
      }
      
      // 如果是文件消息，直接显示撤回提示，不提供重新编辑选项
      if (isFileMessage) {
        recalledDiv.textContent = `你撤回了一条文件消息`;
        
        // 替换原消息元素
        messageElement.parentNode.replaceChild(recalledDiv, messageElement);
        
        // 从聊天历史中删除消息并通知服务器删除文件
        if (messageIndex !== -1) {
          const fileInfo = messageData.fileInfo || messageData.file || {};
          // 通知服务器删除文件（虽然recallMessage函数已经通知过，但为了保险，这里再通知一次）
          socket.emit('delete file', {
            fileId: fileInfo.filename,
            filePath: fileInfo.path
          });
          
          // 从聊天历史中删除
          chatHistory.splice(messageIndex, 1);
        }
      } else {
        // 文本消息才显示重新编辑选项
        const recalledText = document.createElement('span');
        recalledText.textContent = `你撤回了一条消息 `;
        
        const editBtn = document.createElement('a');
        editBtn.className = 'edit-recalled';
        editBtn.textContent = '重新编辑';
        editBtn.href = '#';
      
        // 30秒倒计时
        let countdown = 30;
        const countdownSpan = document.createElement('span');
        countdownSpan.className = 'recall-countdown';
        countdownSpan.textContent = `(${countdown}s)`;
        
        // 添加点击事件处理重新编辑
        editBtn.addEventListener('click', (e) => {
          e.preventDefault();
          
          // 将原消息内容填入输入框
          messageInput.value = originalText;
          messageInput.focus();
          
          // 点击重新编辑后立即更新撤回提示
          recalledDiv.textContent = `你撤回了一条消息`;
          
          // 创建一个函数来处理编辑后的发送
          const handleEdit = () => {
            const newText = messageInput.value.trim();
            if (newText) {
              // 发送编辑后的消息到服务器
              socket.emit('edit recalled message', {
                messageId: messageId,
                userId: currentUser.id,
                newText: newText
              });
              messageInput.value = '';
              // 移除事件监听器
              sendButton.removeEventListener('click', handleEdit);
            }
          };
          
          // 添加一次性事件监听器
          sendButton.addEventListener('click', handleEdit);
        });
      
        // 添加元素到撤回提示中
        recalledDiv.appendChild(recalledText);
        recalledDiv.appendChild(editBtn);
        recalledDiv.appendChild(countdownSpan);
        
        // 设置倒计时
        const timer = setInterval(() => {
          countdown--;
          if (countdown <= 0) {
            clearInterval(timer);
            // 30秒后更新UI并从聊天历史中删除消息
            recalledDiv.textContent = `你撤回了一条消息`;
            
            // 从聊天历史中删除消息
            if (messageIndex !== -1) {
              // 从聊天历史中删除
              chatHistory.splice(messageIndex, 1);
            }
          } else {
            countdownSpan.textContent = `(${countdown}s)`;
          }
        }, 1000);
        
        // 替换原消息
        messageElement.parentNode.replaceChild(recalledDiv, messageElement);
      }
    } else {
      // 其他用户撤回的消息
      recalledDiv.textContent = `${username} 撤回了一条消息`;
      
      // 从聊天历史中删除消息
      if (messageIndex !== -1) {
        chatHistory.splice(messageIndex, 1);
      }
      
      // 替换原消息
      messageElement.parentNode.replaceChild(recalledDiv, messageElement);
    }
  } else {
    console.error('未找到要撤回的消息元素:', messageId);
  }
}

// 处理消息编辑
function handleMessageEdit(messageId, newText) {
  const recalledElement = document.querySelector(`.message-recalled[data-message-id="${messageId}"]`);
  if (recalledElement) {
    // 查找原始消息的发送者信息
    const messageData = chatHistory.find(msg => msg.id === messageId);
    if (messageData) {
      // 创建新的消息元素
      displayMessage({
        ...messageData,
        text: newText,
        recalled: false
      });
      
      // 移除撤回提示
      recalledElement.remove();
    }
  }
}

// 撤回消息
function recallMessage(messageId) {
  if (socket && currentUser) {
    // 查找消息在聊天历史中的索引
    const messageIndex = chatHistory.findIndex(msg => msg.id === messageId);
    const messageData = messageIndex !== -1 ? chatHistory[messageIndex] : null;
    
    console.log('准备撤回消息:', { messageId, messageData });
    
    // 构建撤回消息数据
    const recallData = {
      messageId: messageId,
      userId: currentUser.id
    };
    
    // 如果是文件消息，添加文件信息
    if (messageData && messageData.type === 'file') {
      // 兼容性处理：如果消息使用旧格式(file字段)，则尝试从file字段获取信息
      const fileInfo = messageData.fileInfo || messageData.file || {};
      const filePathInfo = fileInfo.path || '';
      const filename = fileInfo.filename || '';
      
      console.log('检测到文件消息撤回:', { 
        path: filePathInfo, 
        filename: filename
      });
      
      recallData.fileInfo = {
        fileId: filename,
        filePath: filePathInfo
      };
      
      // 同时发送删除文件请求
      socket.emit('delete file', {
        fileId: filename,
        filePath: filePathInfo
      });
    }
    
    console.log('发送撤回消息请求:', recallData);
    socket.emit('recall message', recallData);
  }
}

// 引用消息
function quoteMessage(msg) {
  quotedMessage = msg;
  
  // 显示引用预览
  const replyContent = replyPreview.querySelector('.reply-content');
  replyContent.innerHTML = '';
  
  const senderEl = document.createElement('div');
  senderEl.className = 'reply-sender';
  senderEl.textContent = msg.username;
  
  const textEl = document.createElement('div');
  textEl.className = 'reply-text';
  textEl.textContent = msg.type === 'text' ? msg.text : '媒体文件';
  
  replyContent.appendChild(senderEl);
  replyContent.appendChild(textEl);
  
  // 显示引用预览
  showReplyPreview();
  messageInput.focus();
}

// 显示引用预览
function showReplyPreview() {
  if (quotedMessage) {
    replyPreview.classList.remove('hidden');
  }
}

// 隐藏引用预览
function hideReplyPreview() {
  replyPreview.classList.add('hidden');
  quotedMessage = null;
}

// 初始化表情选择器
function initEmojiPicker() {
  // 清空原有内容
  emojiPicker.innerHTML = '';
  
  // 确保emoji选择器初始状态为隐藏
  emojiPicker.classList.add('hidden');
  
  // 使用picmo创建选择器
  try {
    const picker = picmo.createPicker({
      rootElement: emojiPicker,
      i18n: {
        search: '搜索表情',
        categories: {
          recents: '最近使用',
          smileys: '表情与情感',
          people: '人物',
          animals: '动物与自然',
          food: '食物与饮料',
          activities: '活动',
          travel: '旅行与地点',
          objects: '物品',
          symbols: '符号',
          flags: '旗帜'
        },
        notFound: '未找到表情',
        skinTones: {
          1: '默认肤色',
          2: '浅肤色',
          3: '中浅肤色',
          4: '中等肤色',
          5: '中深肤色',
          6: '深肤色'
        },
        recents: {
          none: '您还没有使用过表情。'
        },
        clear: '清除',
        error: {
          load: '加载表情失败'
        },
        categoryNavLabel: '表情分类',
        skinToneButton: '选择肤色',
        searchDescription: '搜索结果',
        searchResultsLabel: '搜索结果',
        searchPlaceholder: '搜索表情...'
      },
      // 根据屏幕大小调整表情的大小
      emojiSize: window.innerWidth < 360 ? '1.4em' : 
                window.innerWidth < 480 ? '1.6em' : '1.8em',
      // 根据设备调整类别选择器的大小
      categoryButtonSize: window.innerWidth < 480 ? '1.2em' : '1.5em'
    });
    
    // 监听emoji选择事件
    picker.addEventListener('emoji:select', event => {
      // 将选中的emoji插入到输入框
      const cursorPos = messageInput.selectionStart;
      const text = messageInput.value;
      const newText = text.slice(0, cursorPos) + event.emoji + text.slice(cursorPos);
      messageInput.value = newText;
      messageInput.setSelectionRange(cursorPos + event.emoji.length, cursorPos + event.emoji.length);
      messageInput.focus();
      
      // 选择后立即隐藏选择器
      emojiPicker.classList.add('hidden');
    });
  
    // 移除之前的事件监听以避免重复
    emojiBtn.removeEventListener('click', toggleEmojiPicker);
    document.removeEventListener('click', hideEmojiPickerOnClickOutside);
    
    // 设置新的事件监听
    emojiBtn.addEventListener('click', toggleEmojiPicker);
    document.addEventListener('click', hideEmojiPickerOnClickOutside);
    
    // 监听窗口大小变化，适应表情选择器位置
    window.addEventListener('resize', () => {
      // 如果表情选择器是可见的，调整其位置
      if (!emojiPicker.classList.contains('hidden')) {
        // 延迟执行以等待布局更新
        setTimeout(() => {
          adjustEmojiPickerPosition();
        }, 100);
      }
    });
    
  } catch (error) {
    console.error('初始化Emoji选择器失败:', error);
  }
}

// 调整表情选择器位置
function adjustEmojiPickerPosition() {
  // 获取视口宽度
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // 移动设备上调整表情选择器的位置
  if (windowWidth <= 768) {
    // 根据不同的屏幕大小和方向调整
    if (windowHeight < 480 && windowWidth > windowHeight) {
      // 横屏模式
      emojiPicker.style.maxHeight = '50vh';
      emojiPicker.style.bottom = '50px';
    } else if (windowWidth <= 360) {
      // 超小屏幕
      emojiPicker.style.maxHeight = '30vh';
      emojiPicker.style.bottom = '55px';
    } else if (windowWidth <= 480) {
      // 小屏幕
      emojiPicker.style.maxHeight = '35vh';
      emojiPicker.style.bottom = '60px';
    } else {
      // 正常移动设备
      emojiPicker.style.maxHeight = '250px';
      emojiPicker.style.bottom = '80px';
    }
  }
}

// 切换表情选择器显示/隐藏
function toggleEmojiPicker(e) {
    e.stopPropagation(); // 阻止事件冒泡
  
  // 如果当前是隐藏状态，则在显示前调整位置
  if (emojiPicker.classList.contains('hidden')) {
    adjustEmojiPickerPosition();
  }
  
    emojiPicker.classList.toggle('hidden');
}
  
  // 点击其他地方关闭表情选择器
function hideEmojiPickerOnClickOutside(e) {
    if (!emojiBtn.contains(e.target) && !emojiPicker.contains(e.target)) {
      emojiPicker.classList.add('hidden');
    }
}

// 初始化引用回复功能
function initReplyFeature() {
  // 初始化时确保引用预览是隐藏的
  hideReplyPreview();
  
  // 取消引用回复
  cancelReplyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideReplyPreview();
  });
  
  // 发送消息后清除引用
  sendButton.addEventListener('click', () => {
    if (messageInput.value.trim() !== '' || selectedFile) {
      // 消息发送后清除引用
      setTimeout(hideReplyPreview, 100);
    }
  });
  
  // 监听enter键发送消息
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && (messageInput.value.trim() !== '' || selectedFile)) {
      setTimeout(hideReplyPreview, 100);
    }
  });
  
  // 在文档加载和窗口大小改变时检查
  document.addEventListener('DOMContentLoaded', () => {
    if (!quotedMessage) {
      hideReplyPreview();
    }
  });
}

// 添加系统消息到UI
function addSystemMessage(text) {
  const systemMsg = document.createElement('div');
  systemMsg.className = 'system-message';
  systemMsg.textContent = text;
  messagesContainer.appendChild(systemMsg);
  scrollToBottom();
}

// 添加消息到UI
function addMessageToUI(msg) {
  // 如果是文件消息，确保fileInfo对象包含有效信息
  if (msg.type === 'file') {
    // 兼容性处理：如果消息使用旧格式(file字段)，则转换为新格式(fileInfo字段)
    if (msg.file && !msg.fileInfo) {
      msg.fileInfo = msg.file;
    }
    
    // 如果fileInfo无效，则跳过显示
    if (!msg.fileInfo) {
      console.error('无效的文件消息:', msg);
      return;
    }
  }
  
  // 如果消息已被撤回，显示撤回提示
  if (msg.recalled) {
    const recalledDiv = document.createElement('div');
    recalledDiv.className = 'message-recalled';
    recalledDiv.textContent = `${msg.username} 撤回了一条消息`;
    recalledDiv.dataset.messageId = msg.id;
    messagesContainer.appendChild(recalledDiv);
    return;
  }
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${msg.userId === currentUser.id ? 'outgoing' : ''}`;
  messageDiv.dataset.messageId = msg.id;
  
  // 创建头像元素
  const avatar = document.createElement('img');
  avatar.className = 'message-avatar';
  avatar.src = msg.avatar;
  avatar.alt = msg.username;
  
  // 创建消息内容容器
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  // 添加消息操作菜单
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'message-actions';
  
  // 引用回复按钮
  const quoteBtn = document.createElement('button');
  quoteBtn.className = 'message-action-btn';
  quoteBtn.innerHTML = '<i class="fas fa-quote-right"></i>';
  quoteBtn.title = '引用回复';
  quoteBtn.addEventListener('click', () => quoteMessage(msg));
  actionsDiv.appendChild(quoteBtn);
  
  // 如果是自己发送的消息，添加撤回按钮
  if (msg.userId === currentUser.id) {
    const recallBtn = document.createElement('button');
    recallBtn.className = 'message-action-btn';
    recallBtn.innerHTML = '<i class="fas fa-undo"></i>';
    recallBtn.title = '撤回消息';
    recallBtn.addEventListener('click', () => recallMessage(msg.id));
    actionsDiv.appendChild(recallBtn);
  }
  
  contentDiv.appendChild(actionsDiv);
  
  // 如果是引用回复，添加引用内容
  if (msg.quotedMessage) {
    const quotedDiv = document.createElement('div');
    quotedDiv.className = 'message-quoted';
    
    const quotedSender = document.createElement('div');
    quotedSender.className = 'quoted-sender';
    quotedSender.textContent = msg.quotedMessage.username;
    quotedDiv.appendChild(quotedSender);
    
    const quotedText = document.createElement('div');
    quotedText.className = 'quoted-text';
    quotedText.textContent = msg.quotedMessage.text || '媒体文件';
    quotedDiv.appendChild(quotedText);
    
    contentDiv.appendChild(quotedDiv);
  }
  
  // 添加发送者名称
  const senderDiv = document.createElement('div');
  senderDiv.className = 'message-sender';
  senderDiv.textContent = msg.username;
  contentDiv.appendChild(senderDiv);
  
  // 根据消息类型添加不同内容
  if (msg.type === 'text') {
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = msg.text;
    contentDiv.appendChild(textDiv);
  } else if (msg.type === 'file') {
    const fileMessageDiv = document.createElement('div');
    fileMessageDiv.className = 'file-message';
    
    // 根据文件类型处理预览
    if (msg.fileInfo.mimetype.startsWith('image/')) {
      // 图片预览
      const imgPreview = document.createElement('img');
      imgPreview.className = 'media-preview';
      imgPreview.src = msg.fileInfo.path;
      imgPreview.alt = msg.fileInfo.originalname;
      imgPreview.addEventListener('click', () => openMediaPreview(msg.fileInfo));
      fileMessageDiv.appendChild(imgPreview);
    } else if (msg.fileInfo.mimetype.startsWith('video/')) {
      // 视频预览
      const videoPreview = document.createElement('video');
      videoPreview.className = 'media-preview';
      videoPreview.src = msg.fileInfo.path;
      videoPreview.controls = true;
      fileMessageDiv.appendChild(videoPreview);
    } else if (msg.fileInfo.mimetype.startsWith('audio/')) {
      // 音频预览
      const audioPreview = document.createElement('audio');
      audioPreview.className = 'audio-preview';
      audioPreview.src = msg.fileInfo.path;
      audioPreview.controls = true;
      fileMessageDiv.appendChild(audioPreview);
    }
    
    // 文件信息
    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-info';
    fileInfo.addEventListener('click', () => openMediaPreview(msg.fileInfo));
    
    // 文件图标
    const fileIcon = document.createElement('i');
    fileIcon.className = getFileIcon(msg.fileInfo.mimetype);
    fileIcon.classList.add('file-icon');
    fileInfo.appendChild(fileIcon);
    
    // 文件详情
    const fileDetails = document.createElement('div');
    fileDetails.className = 'file-details';
    
    const fileName = document.createElement('div');
    fileName.className = 'file-name';
    fileName.textContent = msg.fileInfo.originalname;
    fileDetails.appendChild(fileName);
    
    const fileSize = document.createElement('div');
    fileSize.className = 'file-size';
    fileSize.textContent = formatFileSize(msg.fileInfo.size);
    fileDetails.appendChild(fileSize);
    
    fileInfo.appendChild(fileDetails);
    fileMessageDiv.appendChild(fileInfo);
    
    contentDiv.appendChild(fileMessageDiv);
  }
  
  // 添加时间
  const timeDiv = document.createElement('div');
  timeDiv.className = 'message-time';
  timeDiv.textContent = formatTime(msg.time);
  contentDiv.appendChild(timeDiv);
  
  // 组装消息
  messageDiv.appendChild(avatar);
  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);
  
  // 如果消息在可视区域，标记为已读
  if (isElementInViewport(messageDiv)) {
    lastSeenMessageIndex = chatHistory.length - 1;
    newMessagesCount = 0;
    updateNewMessagesBadge();
  }
}

// 获取文件图标
function getFileIcon(mimetype) {
  if (mimetype.startsWith('image/')) {
    return 'fas fa-image';
  } else if (mimetype.startsWith('video/')) {
    return 'fas fa-video';
  } else if (mimetype.startsWith('audio/')) {
    return 'fas fa-music';
  } else if (mimetype.includes('pdf')) {
    return 'fas fa-file-pdf';
  } else if (mimetype.includes('word') || mimetype.includes('document')) {
    return 'fas fa-file-word';
  } else if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) {
    return 'fas fa-file-excel';
  } else if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) {
    return 'fas fa-file-powerpoint';
  } else if (mimetype.includes('zip') || mimetype.includes('compressed')) {
    return 'fas fa-file-archive';
  } else {
    return 'fas fa-file';
  }
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes < 1024) {
    return bytes + ' B';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  } else if (bytes < 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  } else {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
}

// 格式化时间
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// 滚动到底部
function scrollToBottom() {
  // 检查用户是否已经滚动到接近底部
  const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 100;
  
  // 如果用户接近底部或者是新消息，则滚动到底部
  if (isNearBottom) {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

// 强制滚动到底部（无论用户在哪个位置）
function forceScrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 监听新消息和DOM变化，自动滚动到底部
function initAutoScroll() {
  // 创建一个观察器实例
  const observer = new MutationObserver((mutations) => {
    // 检查是否有新消息添加
    let hasNewMessage = false;
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        hasNewMessage = true;
      }
    });
    
    // 如果有新消息，滚动到底部
    if (hasNewMessage) {
      // 如果是自己发送的消息，强制滚动到底部
      const lastMessage = messagesContainer.lastElementChild;
      if (lastMessage && lastMessage.classList.contains('outgoing')) {
        forceScrollToBottom();
      } else {
        scrollToBottom();
      }
    }
  });
  
  // 配置观察选项
  const config = { childList: true, subtree: true };
  
  // 开始观察消息容器
  observer.observe(messagesContainer, config);
  
  // 监听消息容器的滚动事件
  messagesContainer.addEventListener('scroll', () => {
    // 当用户手动滚动到底部时，记录这个状态
    const isAtBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 20;
    messagesContainer.dataset.userAtBottom = isAtBottom;
  });
}

// 发送消息
function sendMessage() {
  const text = messageInput.value.trim();
  
  if (text === '' && !selectedFile) {
    return;
  }
  
  if (selectedFile) {
    sendFile();
    return;
  }
  
  const message = {
    type: 'text',
    text: text,
    userId: currentUser.id,
    username: currentUser.username,
    avatar: currentUser.avatar,
    time: Date.now()
  };
  
  // 如果有引用消息，添加到消息对象中
  if (quotedMessage) {
    message.quotedMessage = {
      id: quotedMessage.id,
      text: quotedMessage.text,
      username: quotedMessage.username,
      userId: quotedMessage.userId
    };
    
    // 清除引用消息
    quotedMessage = null;
    hideReplyPreview();
  }
  
  socket.emit('chat message', message);
  messageInput.value = '';
  
  // 重置输入框高度
  messageInput.style.height = 'auto';
  
  // 强制滚动到底部
  setTimeout(forceScrollToBottom, 100);
}

// 发送文件
async function sendFile() {
  if (!selectedFile) return;
  
  const formData = new FormData();
  formData.append('file', selectedFile);
  
  try {
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('文件上传失败');
    }
    
    const fileInfo = await response.json();
    
    const message = {
      type: 'file',
      fileInfo: fileInfo,
      userId: currentUser.id,
      username: currentUser.username,
      avatar: currentUser.avatar,
      time: Date.now()
    };
    
    socket.emit('chat message', message);
    clearFileSelection();
  } catch (error) {
    console.error('上传错误:', error);
    alert('文件上传失败，请重试');
  }
}

// 处理文件选择
function handleFileSelect(event) {
  selectedFile = event.target.files[0];
  if (!selectedFile) return;
  
  filePreview.classList.remove('hidden');
  previewContent.innerHTML = '';
  
  // 根据文件类型创建预览
  if (selectedFile.type.startsWith('image/')) {
    const img = document.createElement('img');
    img.className = 'preview-img';
    img.src = URL.createObjectURL(selectedFile);
    previewContent.appendChild(img);
  } else {
    const icon = document.createElement('i');
    icon.className = getFileIcon(selectedFile.type);
    icon.classList.add('preview-icon');
    previewContent.appendChild(icon);
  }
  
  const name = document.createElement('span');
  name.textContent = selectedFile.name;
  previewContent.appendChild(name);
}

// 清除文件选择
function clearFileSelection() {
  selectedFile = null;
  fileInput.value = '';
  filePreview.classList.add('hidden');
  previewContent.innerHTML = '';
}

// 打开媒体预览
function openMediaPreview(file) {
  modalContentContainer.innerHTML = '';
  
  if (file.mimetype.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = file.path;
    modalContentContainer.appendChild(img);
  } else if (file.mimetype.startsWith('video/')) {
    const video = document.createElement('video');
    video.src = file.path;
    video.controls = true;
    video.autoplay = true;
    modalContentContainer.appendChild(video);
  } else if (file.mimetype.startsWith('audio/')) {
    const audio = document.createElement('audio');
    audio.src = file.path;
    audio.controls = true;
    modalContentContainer.appendChild(audio);
  } else if (file.mimetype.includes('pdf')) {
    const iframe = document.createElement('iframe');
    iframe.src = file.path;
    iframe.style.width = '100%';
    iframe.style.height = '70vh';
    modalContentContainer.appendChild(iframe);
  } else {
    // 对于其他类型的文件，提供下载链接
    const link = document.createElement('a');
    link.href = file.path;
    link.textContent = `下载 ${file.originalname}`;
    link.target = '_blank';
    link.className = 'download-link';
    modalContentContainer.appendChild(link);
  }
  
  mediaModal.classList.remove('hidden');
}

// 输入框自动调整高度
function adjustInputHeight() {
  // 重置高度，以便正确计算新的高度
  messageInput.style.height = 'auto';
  // 设置新的高度，最小高度为原始高度，最大高度为150px
  const newHeight = Math.min(Math.max(messageInput.scrollHeight, 40), 150);
  messageInput.style.height = newHeight + 'px';
}

// 判断一个元素是否在可视区域内
function isElementInViewport(el) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// 更新新消息提示
function updateNewMessagesBadge() {
  if (newMessagesCount > 0) {
    // 可以在这里添加未读消息提示，例如标题或底部新消息通知
    // 以下代码为示例，可以根据需要实现
    const title = document.title;
    if (!title.startsWith('(')) {
      document.title = `(${newMessagesCount}) ${title}`;
    } else {
      document.title = `(${newMessagesCount}) ${title.substr(title.indexOf(') ') + 2)}`;
    }
  } else {
    // 清除未读消息提示
    const title = document.title;
    if (title.startsWith('(')) {
      document.title = title.substr(title.indexOf(') ') + 2);
    }
  }
}

// 当页面加载时设置初始状态
document.addEventListener('DOMContentLoaded', () => {
  // 确保初始状态下用户头像是隐藏的（如果没有登录）
  document.getElementById('user-avatar').src = '';
  document.getElementById('username').textContent = '未登录';
  
  // 立即强制隐藏引用预览
  const replyPreview = document.getElementById('reply-preview');
  if (replyPreview) {
    replyPreview.classList.add('hidden');
  }
  
  // 初始化用户认证
  initUserAuth();
  
  // 发送消息
  sendButton.addEventListener('click', sendMessage);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
  
  // 监听输入事件调整高度
  messageInput.addEventListener('input', adjustInputHeight);
  
  // 在发送消息后重置输入框高度
  sendButton.addEventListener('click', () => {
    setTimeout(() => {
      messageInput.style.height = 'auto';
    }, 100);
  });
  
  // 在页面加载时初始化输入框高度
  adjustInputHeight();
  
  // 文件上传
  fileUploadBtn.addEventListener('click', () => {
    fileInput.click();
  });
  
  // 文件选择
  fileInput.addEventListener('change', handleFileSelect);
  
  // 移除文件
  removeFileBtn.addEventListener('click', clearFileSelection);
  
  // 修改密码按钮事件
  const changePasswordBtn = document.getElementById('change-password-btn');
  const changePasswordModal = document.getElementById('change-password-modal');
  const cancelPasswordChange = document.getElementById('cancel-password-change');
  const submitPasswordChange = document.getElementById('submit-password-change');
  const currentPasswordInput = document.getElementById('current-password');
  const newPasswordInput = document.getElementById('new-password');
  const confirmNewPasswordInput = document.getElementById('confirm-new-password');
  const changePasswordError = document.getElementById('change-password-error');
  const changePasswordSuccess = document.getElementById('change-password-success');
  
  // 打开修改密码模态框
  changePasswordBtn.addEventListener('click', () => {
    // 重置表单
    currentPasswordInput.value = '';
    newPasswordInput.value = '';
    confirmNewPasswordInput.value = '';
    changePasswordError.classList.add('hidden');
    changePasswordSuccess.classList.add('hidden');
    
    // 显示模态框
    changePasswordModal.classList.remove('hidden');
  });
  
  // 取消修改密码
  cancelPasswordChange.addEventListener('click', () => {
    changePasswordModal.classList.add('hidden');
  });
  
  // 提交修改密码
  submitPasswordChange.addEventListener('click', async () => {
    // 获取输入值
    const currentPassword = currentPasswordInput.value.trim();
    const newPassword = newPasswordInput.value.trim();
    const confirmNewPassword = confirmNewPasswordInput.value.trim();
    
    // 验证输入
    if (!currentPassword) {
      changePasswordError.textContent = '请输入当前密码';
      changePasswordError.classList.remove('hidden');
      return;
    }
    
    if (!newPassword) {
      changePasswordError.textContent = '请输入新密码';
      changePasswordError.classList.remove('hidden');
      return;
    }
    
    if (newPassword.length < 6) {
      changePasswordError.textContent = '新密码长度必须至少为6个字符';
      changePasswordError.classList.remove('hidden');
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      changePasswordError.textContent = '两次输入的新密码不一致';
      changePasswordError.classList.remove('hidden');
      return;
    }
    
    try {
      // 发送修改密码请求
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser.id,
          currentPassword,
          newPassword
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 修改成功
        changePasswordSuccess.textContent = '密码修改成功';
        changePasswordSuccess.classList.remove('hidden');
        changePasswordError.classList.add('hidden');
        
        // 3秒后关闭模态框
        setTimeout(() => {
          changePasswordModal.classList.add('hidden');
        }, 3000);
      } else {
        // 修改失败
        changePasswordError.textContent = data.message || '密码修改失败';
        changePasswordError.classList.remove('hidden');
        changePasswordSuccess.classList.add('hidden');
      }
    } catch (error) {
      console.error('修改密码错误:', error);
      changePasswordError.textContent = '服务器错误，请稍后再试';
      changePasswordError.classList.remove('hidden');
      changePasswordSuccess.classList.add('hidden');
    }
  });
  
  // 侧边栏切换
  toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
  });
  
  // 点击非菜单区域关闭侧边栏
  document.addEventListener('click', (e) => {
    // 检查点击的元素是否在侧边栏内部或是侧边栏切换按钮
    if (!sidebar.contains(e.target) && e.target !== toggleSidebarBtn && !toggleSidebarBtn.contains(e.target)) {
      // 如果侧边栏是打开的，则关闭它
      if (sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
      }
    }
  });
  
  // 关闭模态框
  closeModal.addEventListener('click', () => {
    mediaModal.classList.add('hidden');
  });
  
  // 点击模态框背景关闭
  mediaModal.addEventListener('click', (e) => {
    if (e.target === mediaModal) {
      mediaModal.classList.add('hidden');
    }
  });

  // 修复模态框在移动设备上的滚动问题
  const modalContent = document.querySelector('.user-setup-content');
  
  // 允许模态框内容滚动
  if(userSetupModal && modalContent) {
    userSetupModal.addEventListener('touchmove', function(e) {
      // 检查是否在模态内容之外
      if(!e.target.closest('.modal-content')) {
        e.preventDefault(); // 只有在模态框外才阻止滚动
      }
    }, { passive: false });
    
    // 确保点击注册标签时，如果表单高度超出视口，滚动到顶部
    document.getElementById('register-tab').addEventListener('click', function() {
      setTimeout(() => {
        if(modalContent.scrollHeight > modalContent.clientHeight) {
          modalContent.scrollTop = 0;
        }
      }, 100);
    });
  }

  // 处理注册按钮点击事件
  document.getElementById('register-btn').addEventListener('click', function() {
    // 确保按钮在视野中
    this.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  
  // 处理登录按钮点击事件
  document.getElementById('login-btn').addEventListener('click', function() {
    // 确保按钮在视野中
    this.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  
  // 为所有表单字段添加focus和blur事件处理
  const formFields = document.querySelectorAll('.auth-form input[type="text"], .auth-form input[type="password"]');
  formFields.forEach(field => {
    field.addEventListener('focus', function() {
      // 在移动设备上，输入框获得焦点时键盘会弹出，导致视觉上的变化
      // 延迟滚动以适应键盘弹出后的视图
      setTimeout(() => {
        this.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    });
    
    field.addEventListener('blur', function() {
      // 当用户点击完成或下一个时，可能需要查看下一个字段或按钮
      setTimeout(() => {
        // 检查当前活动元素是否为表单中的元素
        const activeElement = document.activeElement;
        if(activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'BUTTON')) {
          activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    });
  });

  // 表单提交处理
  const loginForm = document.getElementById('login-form-element');
  const registerForm = document.getElementById('register-form-element');
  
  // 添加登录表单提交事件处理
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      // 模拟点击登录按钮
      document.getElementById('login-btn').click();
      // 在移动设备上隐藏键盘
      document.activeElement.blur();
    });
  }
  
  // 添加注册表单提交事件处理
  if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
      e.preventDefault();
      // 模拟点击注册按钮
      document.getElementById('register-btn').click();
      // 在移动设备上隐藏键盘
      document.activeElement.blur();
    });
  }
  
  // 检测移动设备
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // 如果是移动设备，添加额外的优化
  if (isMobile) {
    // 输入完成时，自动跳转到下一个输入框
    const inputFields = document.querySelectorAll('input[type="text"], input[type="password"]');
    
    inputFields.forEach((input, index) => {
      input.addEventListener('keydown', function(e) {
        // 当用户按下回车键时
        if (e.key === 'Enter') {
          e.preventDefault();
          
          // 如果不是最后一个输入框，则跳到下一个
          if (index < inputFields.length - 1) {
            inputFields[index + 1].focus();
          } else {
            // 如果是最后一个输入框，则触发表单提交
            const form = this.closest('form');
            if (form) {
              const submitBtn = form.querySelector('button[type="submit"]');
              if (submitBtn) {
                submitBtn.click();
              }
            }
            // 隐藏键盘
            this.blur();
          }
        }
      });
    });

    // 修复iOS设备上的滚动问题
    document.querySelectorAll('.modal-content').forEach(modal => {
      modal.addEventListener('touchstart', function(e) {
        if (e.target.closest('input') || e.target.closest('button')) {
          return true; // 允许在表单元素上的正常触摸
        }
        
        const startY = e.touches[0].clientY;
        const scrollTop = modal.scrollTop;
        const contentHeight = modal.scrollHeight;
        const containerHeight = modal.clientHeight;
        
        // 监听触摸移动
        const touchmoveHandler = function(e) {
          // 计算滚动距离
          const touchY = e.touches[0].clientY;
          const touchDeltaY = touchY - startY;
          
          // 检查是否在滚动上下边界，如果是，就阻止默认行为
          if ((scrollTop === 0 && touchDeltaY > 0) || 
              (scrollTop + containerHeight >= contentHeight && touchDeltaY < 0)) {
            e.preventDefault();
          }
        };
        
        // 监听触摸结束
        const touchendHandler = function() {
          modal.removeEventListener('touchmove', touchmoveHandler);
          modal.removeEventListener('touchend', touchendHandler);
        };
        
        modal.addEventListener('touchmove', touchmoveHandler, { passive: false });
        modal.addEventListener('touchend', touchendHandler);
      });
    });
  }
});