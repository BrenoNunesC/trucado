import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
// fontes embutidas: o jogo roda offline, sem Google Fonts
import '@fontsource/yanone-kaffeesatz/latin-500.css';
import '@fontsource/yanone-kaffeesatz/latin-600.css';
import '@fontsource/yanone-kaffeesatz/latin-700.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/bowlby-one/latin-400.css';
import './ui/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
