import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],server:{proxy:{'/api':{target:'http://localhost:3000',changeOrigin:true},'/app.js':{target:'http://localhost:3000'},'/events.js':{target:'http://localhost:3000'},'/dice3d.js':{target:'http://localhost:3000'},'/style.css':{target:'http://localhost:3000'},'/vendor':{target:'http://localhost:3000'},'/dice-models':{target:'http://localhost:3000'}}},test:{environment:'jsdom',setupFiles:['./src/tests/setup.ts'],css:true}});
