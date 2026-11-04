import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/patrick-hand/400.css';
import '@fontsource/permanent-marker/400.css';
import '@fontsource/antonio/400.css';
import '@fontsource/antonio/600.css';
import './theme/tokens.css';
import './theme/base.css';
import './theme/textures.css';
import './theme/paper.css';
import { App } from './app/App';

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
