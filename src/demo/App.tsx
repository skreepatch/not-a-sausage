import { useState, useEffect } from 'react';
import { BagelMenu } from '../react/BagelMenu';
import { RadialItem, BagelConfig } from '../types';
import { CREATOR_THEME, COMMUTER_THEME, POWER_USER_THEME, BagelTheme } from '../types/theme';

// --- Demo Data ---

const CREATOR_ITEMS: RadialItem[] = [
  {
    id: 'brushes', label: 'Brushes',
    color: 'rgba(200, 180, 255, 0.8)',
    children: [
      { id: 'oil', label: 'Oil', action: () => console.log('Oil Brush') },
      { id: 'watercolor', label: 'Watercolor', action: () => console.log('Watercolor Brush') },
      { id: 'pencil', label: 'Pencil', action: () => console.log('Pencil Brush') },
    ]
  },
  { id: 'eraser', label: 'Eraser', color: 'rgba(255, 200, 230, 0.8)', action: () => console.log('Eraser Tool') },
  { id: 'layers', label: 'Layers', color: 'rgba(150, 120, 200, 0.8)', action: () => console.log('Layers Panel') },
  {
    id: 'filters', label: 'Filters',
    color: 'rgba(180, 160, 220, 0.8)',
    children: [
      { id: 'blur', label: 'Blur' },
      { id: 'sharpen', label: 'Sharpen' }
    ]
  }
];

const COMMUTER_ITEMS: RadialItem[] = [
  { id: 'play', label: '▶', color: 'rgba(59, 130, 246, 0.8)', action: () => console.log('Play/Pause') },
  { id: 'skip', label: '⏭', color: 'rgba(34, 197, 94, 0.8)', action: () => console.log('Skip') },
  { id: 'like', label: '♥', color: 'rgba(236, 72, 153, 0.8)', action: () => console.log('Like') },
  {
    id: 'playlist', label: 'Lists',
    color: 'rgba(99, 102, 241, 0.8)',
    children: [
      { id: 'rock', label: 'Rock' },
      { id: 'jazz', label: 'Jazz' },
      { id: 'lofi', label: 'Lo-Fi' }
    ]
  }
];

const POWER_USER_ITEMS: RadialItem[] = [
  { id: 'cpu', label: 'CPU', color: 'rgba(0, 255, 255, 0.8)', action: () => console.log('CPU Stats') },
  { id: 'net', label: 'Net', color: 'rgba(255, 0, 255, 0.8)', action: () => console.log('Network') },
  {
    id: 'sec', label: 'Sec',
    color: 'rgba(0, 255, 128, 0.8)',
    children: [
      { id: 'scan', label: 'Scan' },
      { id: 'firewall', label: 'Firewall' }
    ]
  },
  { id: 'logs', label: 'Logs', color: 'rgba(255, 128, 0, 0.8)', action: () => console.log('View Logs') }
];

type Scenario = 'creator' | 'commuter' | 'power';

// Helper to convert hex to rgba
const hexToRgba = (hex: string, alpha: number = 1): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Helper to extract color from rgba string
const rgbaToHex = (rgba: string): string => {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
  return '#ffffff';
};

export const App = () => {
  const [debug, setDebug] = useState(false);
  const [scenario, setScenario] = useState<Scenario>('creator');

  // Sidebar collapse state (persisted in localStorage)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('bagel-sidebar-open');
    return saved ? JSON.parse(saved) : true;
  });

  // Main config panel collapse state (persisted in localStorage)
  const [configPanelOpen, setConfigPanelOpen] = useState(() => {
    const saved = localStorage.getItem('bagel-config-panel-open');
    return saved ? JSON.parse(saved) : true;
  });

  // Accordion states
  const [configOpen, setConfigOpen] = useState(true);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);

  // Config State
  const [innerRadius, setInnerRadius] = useState(50);
  const [ringWidth, setRingWidth] = useState(60);
  const [gap, setGap] = useState(2); // Pixels

  // Theme state
  const [customTheme, setCustomTheme] = useState<Partial<BagelTheme>>({});

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('bagel-sidebar-open', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  // Get base theme for scenario
  const getBaseTheme = (): BagelTheme => {
    switch (scenario) {
      case 'creator': return CREATOR_THEME;
      case 'commuter': return COMMUTER_THEME;
      case 'power': return POWER_USER_THEME;
    }
  };

  // Merge base theme with custom overrides
  const getTheme = (): BagelTheme => {
    const base = getBaseTheme();
    return { ...base, ...customTheme };
  };

  // Reset theme to base
  const resetTheme = () => {
    setCustomTheme({});
  };

  // Update theme color
  const updateThemeColor = (key: keyof BagelTheme, value: string) => {
    setCustomTheme(prev => ({ ...prev, [key]: value }));
  };

  // Derived Data
  const getScenarioData = () => {
    switch (scenario) {
      case 'creator':
        return {
          items: CREATOR_ITEMS,
          bg: 'bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900'
        };
      case 'commuter':
        return {
          items: COMMUTER_ITEMS,
          bg: 'bg-gradient-to-br from-blue-900 to-indigo-900'
        };
      case 'power':
        return {
          items: POWER_USER_ITEMS,
          bg: 'bg-black'
        };
    }
  };

  const { items, bg } = getScenarioData();
  const theme = getTheme();

  const config: BagelConfig = {
    innerRadius,
    ringWidth,
    gap,
    startAngle: -Math.PI / 2
  };

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row ${bg} text-white font-sans transition-colors duration-500`}>

      {/* Mobile Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-12 h-12 bg-gray-800 rounded-lg shadow-lg flex items-center justify-center text-white hover:bg-gray-700 transition-colors"
        aria-label="Toggle sidebar"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {sidebarOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Backdrop overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static
        top-0 left-0
        w-80 h-full
        bg-gray-800
        flex flex-col
        shadow-xl z-40
        transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header with collapse button */}
        <div className="p-6 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
                The Bagel
              </h1>
              <p className="text-gray-400 text-sm">Radial Menu System</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfigPanelOpen(!configPanelOpen)}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label={configPanelOpen ? 'Collapse panel' : 'Expand panel'}
              >
                <svg
                  className={`w-5 h-5 transition-transform ${configPanelOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-400 hover:text-white"
                aria-label="Close sidebar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable content area */}
        {configPanelOpen && (
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="flex flex-col gap-6">
              {/* Scenario Switcher */}
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Scenario</label>
                <div className="flex gap-2">
                  {(['creator', 'commuter', 'power'] as Scenario[]).map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        setScenario(s);
                        resetTheme(); // Reset to base theme when switching scenarios
                      }}
                      className={`flex-1 py-2 text-sm rounded border transition-all ${scenario === s
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                        }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Configuration Section (Accordion) */}
              <div className="border-t border-gray-700 pt-4">
                <button
                  onClick={() => setConfigOpen(!configOpen)}
                  className="w-full flex items-center justify-between text-sm font-semibold text-gray-300 hover:text-white transition-colors"
                >
                  <span>Configuration</span>
                  <svg
                    className={`w-5 h-5 transition-transform ${configOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {configOpen && (
                  <div className="mt-4 space-y-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-400 flex justify-between">
                        Inner Radius <span>{innerRadius}px</span>
                      </label>
                      <input
                        type="range" min="10" max="100"
                        value={innerRadius}
                        onChange={(e) => setInnerRadius(Number(e.target.value))}
                        className="w-full accent-blue-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-400 flex justify-between">
                        Ring Width <span>{ringWidth}px</span>
                      </label>
                      <input
                        type="range" min="30" max="120"
                        value={ringWidth}
                        onChange={(e) => setRingWidth(Number(e.target.value))}
                        className="w-full accent-blue-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-400 flex justify-between">
                        Gap <span>{gap}px</span>
                      </label>
                      <input
                        type="range" min="0" max="20" step="1"
                        value={gap}
                        onChange={(e) => setGap(Number(e.target.value))}
                        className="w-full accent-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Appearance Section (Accordion) */}
              <div className="border-t border-gray-700 pt-4">
                <button
                  onClick={() => setAppearanceOpen(!appearanceOpen)}
                  className="w-full flex items-center justify-between text-sm font-semibold text-gray-300 hover:text-white transition-colors"
                >
                  <span>Appearance</span>
                  <svg
                    className={`w-5 h-5 transition-transform ${appearanceOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {appearanceOpen && (
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Theme Preset</span>
                      <button
                        onClick={resetTheme}
                        className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                      >
                        Reset
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-400">Active Background</label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            value={rgbaToHex(theme['--bagel-bg-active'] || '#ffffff')}
                            onChange={(e) => {
                              const rgba = hexToRgba(e.target.value, 0.8);
                              updateThemeColor('--bagel-bg-active', rgba);
                            }}
                            className="w-12 h-8 rounded border border-gray-600 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={theme['--bagel-bg-active'] || ''}
                            onChange={(e) => updateThemeColor('--bagel-bg-active', e.target.value)}
                            className="flex-1 px-2 py-1 bg-gray-700 rounded text-xs text-white border border-gray-600"
                            placeholder="rgba(...)"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-400">Inactive Background</label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            value={rgbaToHex(theme['--bagel-bg-inactive'] || '#ffffff')}
                            onChange={(e) => {
                              const rgba = hexToRgba(e.target.value, 0.6);
                              updateThemeColor('--bagel-bg-inactive', rgba);
                            }}
                            className="w-12 h-8 rounded border border-gray-600 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={theme['--bagel-bg-inactive'] || ''}
                            onChange={(e) => updateThemeColor('--bagel-bg-inactive', e.target.value)}
                            className="flex-1 px-2 py-1 bg-gray-700 rounded text-xs text-white border border-gray-600"
                            placeholder="rgba(...)"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-400">Text Color</label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            value={theme['--bagel-text-color']?.replace('#', '') ? `#${theme['--bagel-text-color'].replace('#', '')}` : '#ffffff'}
                            onChange={(e) => updateThemeColor('--bagel-text-color', e.target.value)}
                            className="w-12 h-8 rounded border border-gray-600 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={theme['--bagel-text-color'] || ''}
                            onChange={(e) => updateThemeColor('--bagel-text-color', e.target.value)}
                            className="flex-1 px-2 py-1 bg-gray-700 rounded text-xs text-white border border-gray-600"
                            placeholder="#ffffff"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-400">Glow Color</label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            value={rgbaToHex(theme['--bagel-glow-color'] || '#ffffff')}
                            onChange={(e) => {
                              const rgba = hexToRgba(e.target.value, 0.6);
                              updateThemeColor('--bagel-glow-color', rgba);
                            }}
                            className="w-12 h-8 rounded border border-gray-600 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={theme['--bagel-glow-color'] || ''}
                            onChange={(e) => updateThemeColor('--bagel-glow-color', e.target.value)}
                            className="flex-1 px-2 py-1 bg-gray-700 rounded text-xs text-white border border-gray-600"
                            placeholder="rgba(...)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Debug Section (Accordion) */}
              <div className="border-t border-gray-700 pt-4">
                <button
                  onClick={() => setDebugOpen(!debugOpen)}
                  className="w-full flex items-center justify-between text-sm font-semibold text-gray-300 hover:text-white transition-colors"
                >
                  <span>Debug</span>
                  <svg
                    className={`w-5 h-5 transition-transform ${debugOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {debugOpen && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Debug Mode</span>
                      <button
                        onClick={() => setDebug(!debug)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${debug ? 'bg-green-500' : 'bg-gray-600'
                          }`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${debug ? 'translate-x-6' : 'translate-x-0'
                          }`} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="text-xs text-gray-500 pt-4 border-t border-gray-700">
                <code className="block mb-2">npm install @your-repo/bagel</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('npm install @your-repo/bagel');
                  }}
                  className="text-blue-400 hover:underline"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Playground Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden min-h-screen lg:min-h-0">
        {/* Background pattern for Power User */}
        {scenario === 'power' && (
          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(0deg, transparent 24%, #0f0 25%, #0f0 26%, transparent 27%, transparent 74%, #0f0 75%, #0f0 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #0f0 25%, #0f0 26%, transparent 27%, transparent 74%, #0f0 75%, #0f0 76%, transparent 77%, transparent)',
              backgroundSize: '50px 50px'
            }}>
          </div>
        )}

        {/* The Bagel - Always visible */}
        <BagelMenu
          isOpen={true}
          onClose={() => { }}
          items={items}
          config={config}
          theme={theme}
          debug={debug}
          onSelect={(path) => {
            console.log('Selected:', path.map(i => i.label).join(' > '));
          }}
          width={600}
          height={600}
        />
      </div>
    </div>
  );
};
