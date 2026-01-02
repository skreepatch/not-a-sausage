import React, { useState } from 'react';
import { BagelMenu } from '../react/BagelMenu';
import { RadialItem, BagelConfig } from '../types';
import { BagelTheme, MODERN_NEON_THEME, GLASS_THEME, DEFAULT_THEME } from '../types/theme';

// --- Demo Data ---

const CREATOR_ITEMS: RadialItem[] = [
  { id: 'brushes', label: 'Brushes', children: [
      { id: 'oil', label: 'Oil', action: () => console.log('Oil Brush') },
      { id: 'watercolor', label: 'Watercolor', action: () => console.log('Watercolor Brush') },
      { id: 'pencil', label: 'Pencil', action: () => console.log('Pencil Brush') },
  ]},
  { id: 'eraser', label: 'Eraser', action: () => console.log('Eraser Tool') },
  { id: 'layers', label: 'Layers', action: () => console.log('Layers Panel') },
  { id: 'filters', label: 'Filters', children: [
      { id: 'blur', label: 'Blur' },
      { id: 'sharpen', label: 'Sharpen' }
  ]}
];

const COMMUTER_ITEMS: RadialItem[] = [
  { id: 'play', label: '▶', action: () => console.log('Play/Pause') },
  { id: 'skip', label: '⏭', action: () => console.log('Skip') },
  { id: 'like', label: '♥', action: () => console.log('Like') },
  { id: 'playlist', label: 'Lists', children: [
      { id: 'rock', label: 'Rock' },
      { id: 'jazz', label: 'Jazz' },
      { id: 'lofi', label: 'Lo-Fi' }
  ]}
];

const POWER_USER_ITEMS: RadialItem[] = [
  { id: 'cpu', label: 'CPU', action: () => console.log('CPU Stats') },
  { id: 'net', label: 'Net', action: () => console.log('Network') },
  { id: 'sec', label: 'Sec', children: [
      { id: 'scan', label: 'Scan' },
      { id: 'firewall', label: 'Firewall' }
  ]},
  { id: 'logs', label: 'Logs', action: () => console.log('View Logs') }
];

type Scenario = 'creator' | 'commuter' | 'power';

export const App = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [debug, setDebug] = useState(false);
  const [scenario, setScenario] = useState<Scenario>('creator');
  
  // Config State
  const [innerRadius, setInnerRadius] = useState(50);
  const [ringWidth, setRingWidth] = useState(60);
  const [gap, setGap] = useState(2);
  
  // Derived Data
  const getScenarioData = () => {
    switch (scenario) {
      case 'creator': return { items: CREATOR_ITEMS, theme: GLASS_THEME, bg: 'bg-gradient-to-br from-gray-200 to-gray-400' };
      case 'commuter': return { items: COMMUTER_ITEMS, theme: DEFAULT_THEME, bg: 'bg-gray-900' };
      case 'power': return { items: POWER_USER_ITEMS, theme: MODERN_NEON_THEME, bg: 'bg-black' };
    }
  };
  
  const { items, theme, bg } = getScenarioData();
  
  const config: BagelConfig = {
    innerRadius,
    ringWidth,
    gap,
    startAngle: -Math.PI / 2
  };

  return (
    <div className={`min-h-screen flex flex-row ${bg} text-white font-sans transition-colors duration-500`}>
      
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 p-6 flex flex-col gap-6 shadow-xl z-10 overflow-y-auto">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
          The Bagel
        </h1>
        <p className="text-gray-400 text-sm">Radial Menu System</p>
        
        {/* Scenario Switcher */}
        <div className="flex flex-col gap-2">
           <label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Scenario</label>
           <div className="flex gap-2">
              {(['creator', 'commuter', 'power'] as Scenario[]).map(s => (
                <button 
                   key={s}
                   onClick={() => setScenario(s)}
                   className={`flex-1 py-2 text-sm rounded border border-gray-600 transition-all ${scenario === s ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                >
                   {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
           </div>
        </div>
        
        {/* Sliders */}
        <div className="space-y-4 border-t border-gray-700 pt-4">
           <div className="flex flex-col gap-1">
             <label className="text-xs text-gray-400 flex justify-between">
               Inner Radius <span>{innerRadius}px</span>
             </label>
             <input 
               type="range" min="10" max="100" 
               value={innerRadius} onChange={(e) => setInnerRadius(Number(e.target.value))} 
               className="w-full accent-blue-500"
             />
           </div>
           
           <div className="flex flex-col gap-1">
             <label className="text-xs text-gray-400 flex justify-between">
               Ring Width <span>{ringWidth}px</span>
             </label>
             <input 
               type="range" min="30" max="120" 
               value={ringWidth} onChange={(e) => setRingWidth(Number(e.target.value))} 
               className="w-full accent-blue-500"
             />
           </div>
           
           <div className="flex flex-col gap-1">
             <label className="text-xs text-gray-400 flex justify-between">
               Gap <span>{gap}px</span>
             </label>
             <input 
               type="range" min="0" max="20" 
               value={gap} onChange={(e) => setGap(Number(e.target.value))} 
               className="w-full accent-blue-500"
             />
           </div>
        </div>
        
        {/* Toggles */}
        <div className="flex items-center justify-between border-t border-gray-700 pt-4">
            <span className="text-sm">Debug Mode</span>
            <button 
              onClick={() => setDebug(!debug)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${debug ? 'bg-green-500' : 'bg-gray-600'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${debug ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
        </div>

        <div className="mt-auto text-xs text-gray-500">
           <code>npm install @your-repo/bagel</code>
           <button className="ml-2 text-blue-400 hover:underline">Copy</button>
        </div>
      </div>
      
      {/* Playground Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
         {/* Background pattern for Power User */}
         {scenario === 'power' && (
             <div className="absolute inset-0 opacity-10 pointer-events-none" 
                  style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, #0f0 25%, #0f0 26%, transparent 27%, transparent 74%, #0f0 75%, #0f0 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #0f0 25%, #0f0 26%, transparent 27%, transparent 74%, #0f0 75%, #0f0 76%, transparent 77%, transparent)', backgroundSize: '50px 50px' }}>
             </div>
         )}
         
         <div className="text-center z-0">
            <h2 className="text-4xl font-light mb-4 text-white drop-shadow-md">
               {isOpen ? 'Menu Open' : 'Right Click / Tap to Open'}
            </h2>
            <button 
               onClick={() => setIsOpen(!isOpen)}
               className="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full hover:bg-white/20 transition-all text-white font-medium"
            >
               Toggle Menu
            </button>
         </div>

         {/* The Bagel */}
         <BagelMenu 
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            items={items}
            config={config}
            theme={theme}
            debug={debug}
            onSelect={(path) => {
                console.log('Selected:', path.map(i => i.label).join(' > '));
                // setIsOpen(false); // Optional: close on select
            }}
            width={600}
            height={600}
         />
      </div>
    </div>
  );
};

