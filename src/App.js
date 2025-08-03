// 添加缺失的React钩子导入
import React, { useState, useEffect } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable
} from 'react-beautiful-dnd';
import './App.css';
import io from 'socket.io-client';

// 移除硬编码的localhost连接
// const socket = io('http://localhost:4000');

// 使用相对路径连接，自动适应不同的访问地址
const socket = io();

function App() {
  const [columns, setColumns] = useState({
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
  });

  const [newTaskContent, setNewTaskContent] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [showTaskForm, setShowTaskForm] = useState(false);

  // 初始化数据
  useEffect(() => {
    // 监听连接状态
    socket.on('connect', () => {
      console.log('Connected to server with ID:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
      console.error('Error details:', error);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    // 监听初始数据
    socket.on('initial-data', (data) => {
      console.log('Received initial data:', data);
      setColumns(data);
    });

    // 监听数据更新
    socket.on('data-updated', (data) => {
      console.log('Received data update:', data);
      setColumns(data);
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('initial-data');
      socket.off('data-updated');
    };
  }, []);

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // 发送拖拽事件到服务器
    socket.emit('task-dragged', {
      source,
      destination,
      taskId: draggableId
    });
  };

  // 在组件内部已经定义了这些函数，确保它们能正确访问状态设置函数
  const handleNewTaskChange = (e) => {
    setNewTaskContent(e.target.value);
  };

  // 添加其他表单字段的处理函数
  // 在组件内部定义正确的处理函数
  const handleNewTaskContentChange = (e) => {
    setNewTaskContent(e.target.value);
  };

  const handleNewTaskAssigneeChange = (e) => {
    setNewTaskAssignee(e.target.value);
  };

  const handleNewTaskDueDateChange = (e) => {
    setNewTaskDueDate(e.target.value);
  };

  const handleNewTaskPriorityChange = (e) => {
    setNewTaskPriority(e.target.value);
  };

  const addNewTask = () => {
    if (!newTaskContent.trim()) {
      console.log('Task content cannot be empty');
      return;
    }

    // 验证计划时间格式
    let formattedDueDate = newTaskDueDate;
    if (formattedDueDate) {
      // 确保日期格式为ISO格式
      const date = new Date(formattedDueDate);
      if (!isNaN(date.getTime())) {
        formattedDueDate = date.toISOString().split('T')[0];
      } else {
        formattedDueDate = '';
        console.log('Invalid due date format, setting to empty');
      }
    }

    const newTask = {
      content: newTaskContent,
      assignee: newTaskAssignee || '未分配',
      dueDate: formattedDueDate,
      createdAt: new Date().toISOString(),
      priority: newTaskPriority
    };

    console.log('Sending new task:', newTask);
    // 发送添加任务事件到服务器
    socket.emit('add-task', newTask);

    // 清空输入框
    setNewTaskContent('');
    setNewTaskAssignee('');
    setNewTaskDueDate('');
    setNewTaskPriority('medium');
    setShowTaskForm(false);
  };

  // 添加删除任务函数 - 移到组件顶层
  const deleteTask = (taskId, columnId) => {
    console.log('Deleting task:', taskId, 'from column:', columnId);
    socket.emit('delete-task', { taskId, columnId });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addNewTask();
    }
  };

  return (
    <div className="App">
      <h1>Kanban Board</h1>

      {/* 新任务按钮 */}
      <button onClick={() => setShowTaskForm(!showTaskForm)} className="add-task-button">
        {showTaskForm ? '取消' : '添加新任务'}
      </button>

      {/* 新任务表单 */}
      {showTaskForm && (
        <div className="task-form-container">
          <div className="task-form">
            <div className="form-header">
              <h3>添加新任务</h3>
              <button
                className="close-button"
                onClick={() => setShowTaskForm(false)}
                aria-label="关闭"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="form-group">
              <label>任务内容:</label>
              <input
                type="text"
                value={newTaskContent}
                onChange={handleNewTaskContentChange}
                placeholder="输入任务内容"
              />
            </div>
            <div className="form-group">
              <label>责任人:</label>
              <input
                type="text"
                value={newTaskAssignee}
                onChange={handleNewTaskAssigneeChange}
                placeholder="输入责任人"
              />
            </div>
            <div className="form-group">
              <label>计划时间:</label>
              <input
                type="date"
                value={newTaskDueDate}
                onChange={handleNewTaskDueDateChange}
              />
            </div>
            <div className="form-group">
              <label>紧急程度:</label>
              <select
                value={newTaskPriority}
                onChange={handleNewTaskPriorityChange}
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">紧急</option>
              </select>
            </div>
            <button onClick={addNewTask}>确认添加</button>
          </div>
        </div>
      )}

      {/* 添加一个容器来包装看板，优化整体布局 */}
      <div className="board-container">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-board">
            {Object.values(columns).map((column) => (
              <Droppable key={column.id} droppableId={column.id} type="task">
                {(provided) => (
                  <div
                    className="column"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    <h2>{column.title}</h2>
                    <div className="task-list">
                      {column.tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided) => (
                            <div
                              className={`task priority-${task.priority || 'medium'}`}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <div className="task-content">{task.content || '无内容'}</div>
                              <div className="task-assignee">👤 {task.assignee || '未分配'}</div>
                              <div className="task-due-date">📅 {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '无截止日期'}</div>
                              <div className="task-created-at">创建于: {task.createdAt ? new Date(task.createdAt).toLocaleString() : '未知时间'}</div>
                              <div className={`task-priority-badge priority-${task.priority || 'medium'}`}>
                                {task.priority === 'low' && '低'}
                                {task.priority === 'medium' && '中'}
                                {task.priority === 'high' && '高'}
                                {task.priority === 'urgent' && '紧急'}
                              </div>
                              <button 
                                className="delete-button"
                                onClick={() => deleteTask(task.id, column.id)}
                                aria-label="删除任务"
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18"/>
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                                  <line x1="10" y1="11" x2="10" y2="17"/>
                                  <line x1="14" y1="11" x2="14" y2="17"/>
                                </svg>
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}

export default App;

// 删除或注释掉文件末尾的外部函数定义
// const handleNewTaskDueDateChange = (e) => {
//   setNewTaskDueDate(e.target.value);
//   console.log('Task due date changed:', e.target.value);
// };

// const handleNewTaskPriorityChange = (e) => {
//   setNewTaskPriority(e.target.value);
//   console.log('Task priority changed:', e.target.value);
// };
