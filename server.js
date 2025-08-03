// 添加缺失的express导入
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// 初始化Express应用
const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'build')));

// 创建HTTP服务器
const server = http.createServer(app);

// 初始化Socket.io
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 数据文件路径
const dataFilePath = path.join(__dirname, 'kanban-data.json');

// 读取存储的数据
let kanbanData = {
  'column-1': {
    id: 'column-1',
    title: 'To-do',
    tasks: []
  },
  'column-2': {
    id: 'column-2',
    title: 'Doing',
    tasks: []
  },
  'column-3': {
    id: 'column-3',
    title: 'Done',
    tasks: []
  }
};

// 尝试加载保存的数据
try {
  if (fs.existsSync(dataFilePath)) {
    const data = fs.readFileSync(dataFilePath, 'utf8');
    kanbanData = JSON.parse(data);
  }
} catch (error) {
  console.error('Error loading data:', error);
}

// 保存数据到文件
function saveData() {
  try {
    // 确保目录存在
    const dir = path.dirname(dataFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dataFilePath, JSON.stringify(kanbanData, null, 2));
    console.log('Data saved successfully:', JSON.stringify(kanbanData, null, 2));
  } catch (error) {
    console.error('Error saving data:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// 处理Socket连接
io.on('connection', (socket) => {
  console.log('A user connected');

  // 发送当前看板数据给新连接的客户端
  socket.emit('initial-data', kanbanData);

  // 处理拖拽事件
  socket.on('task-dragged', (data) => {
    const { source, destination, taskId } = data;

    if (!destination) return;

    // 查找任务
    let taskToMove;
    let sourceColumn = kanbanData[source.droppableId];
    let destColumn = kanbanData[destination.droppableId];

    // 从源列移除任务
    for (let i = 0; i < sourceColumn.tasks.length; i++) {
      if (sourceColumn.tasks[i].id === taskId) {
        taskToMove = sourceColumn.tasks.splice(i, 1)[0];
        break;
      }
    }

    // 添加到目标列
    if (taskToMove) {
      destColumn.tasks.splice(destination.index, 0, taskToMove);

      // 保存数据
      saveData();

      // 广播更新给所有客户端
      io.emit('data-updated', kanbanData);
    }
  });

  // 处理添加新任务
  socket.on('add-task', (taskData) => {
    console.log('Received new task:', taskData);
    const newTaskId = `task-${Date.now()}`;
    const newTask = {
      id: newTaskId,
      content: taskData.content,
      assignee: taskData.assignee || '未分配',
      dueDate: taskData.dueDate || '',
      createdAt: taskData.createdAt || new Date().toISOString(),
      priority: taskData.priority || 'medium'
    };
  
    kanbanData['column-1'].tasks.push(newTask);
    console.log('Added task to column-1:', newTask);
  
    // 保存数据
    saveData();
  
    // 广播更新给所有客户端
    io.emit('data-updated', kanbanData);
    console.log('Broadcasted data update');
  });

  // 处理断开连接
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });

  // 处理删除任务
  socket.on('delete-task', (data) => {
    const { taskId, columnId } = data;
    console.log('Received delete task request:', taskId, 'from column:', columnId);

    // 查找并删除任务
    const column = kanbanData[columnId];
    if (column) {
      const initialLength = column.tasks.length;
      column.tasks = column.tasks.filter(task => task.id !== taskId);

      if (column.tasks.length !== initialLength) {
        // 保存数据
        saveData();

        // 广播更新给所有客户端
        io.emit('data-updated', kanbanData);
        console.log('Deleted task and broadcasted update');
      }
    }
  });
});

// 为所有其他路由提供React应用
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// 启动服务器
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  // 获取本机IP地址
  const os = require('os');
  const interfaces = os.networkInterfaces();
  let localIp = 'localhost';
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
        localIp = alias.address;
        break;
      }
    }
  }
  console.log(`Local network access: http://${localIp}:${PORT}`);
});