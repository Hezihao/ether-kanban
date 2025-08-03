import React from 'react';
import ReactDOM from 'react-dom'; // 使用 React 17 的导入方式
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// 使用 React 17 的渲染方式
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
