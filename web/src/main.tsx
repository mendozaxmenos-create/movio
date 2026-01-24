import React from 'react';
import ReactDOM from 'react-dom/client';
import { TodayScreen } from './TodayScreen';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <TodayScreen />
  </React.StrictMode>,
);

