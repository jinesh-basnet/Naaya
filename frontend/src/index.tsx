import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './i18n';

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

console.log(" ");
console.log(" Naaya App Initializing...");
console.log("Environment: Production");
console.log(" ");

const rootElement = document.getElementById('root') as HTMLElement;
const root = ReactDOM.createRoot(rootElement);

console.log(" ");
console.log(" Naaya App Booting up...");
console.log("Developed for College Project purposes.");
console.log(" ");

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


reportWebVitals();

