import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, X, Save } from 'lucide-react';

interface ProviderConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

interface TTSProviderConfig {
  apiKey: string;
  region?: string;
  endpoint?: string;
  model?: string;
  voice?: string;
}

interface Settings {
  providers: {
    [key: string]: ProviderConfig;
  };
  tts?: {
    currentProvider: string;
    providers: {
      [key: string]: TTSProviderConfig;
    };
  };
  currentProvider: string;
  ankiDeckName: string;
}

export default function SettingsPage({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!window.electronAPI) {
      console.error('electronAPI not found');
      setLoading(false);
      return;
    }
    window.electronAPI.getSettings()
      .then((s) => {
        setSettings(s);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load settings:', err);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (settings) {
      await window.electronAPI.saveSettings(settings);
      onClose();
    }
  };

  if (loading) return (
    <div className="fixed inset-0 bg-white z-[60] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500">Loading settings...</p>
      </div>
    </div>
  );

  if (!settings) return (
    <div className="fixed inset-0 bg-white z-[60] flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-red-500 mb-2">Failed to load settings.</p>
        <button onClick={onClose} className="text-blue-600 underline">Close</button>
      </div>
    </div>
  );

  const currentProviderConfig = settings.providers[settings.currentProvider] || { apiKey: '', baseURL: '', model: '' };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col p-4 overflow-y-auto border border-gray-300/50 rounded-lg shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <SettingsIcon size={20} /> Settings
        </h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X size={20} />
        </button>
      </div>

      <div className="space-y-4 flex-1">
        <section>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Active Model Provider
          </label>
          <select
            value={settings.currentProvider}
            onChange={(e) => setSettings({ ...settings, currentProvider: e.target.value })}
            className="w-full p-2 border rounded bg-white"
          >
            <option value="openai">OpenAI (GPT-4o-mini)</option>
            <option value="dashscope">DashScope (Qwen-VL)</option>
            <option value="deepseek">DeepSeek (DeepSeek-VL)</option>
          </select>
        </section>

        <section className="p-3 bg-gray-50 rounded-lg space-y-3">
          <h3 className="font-semibold text-sm uppercase text-gray-500">Provider Config</h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
            <input
              type="password"
              value={currentProviderConfig.apiKey}
              onChange={(e) => {
                const newProviders = { ...settings.providers };
                newProviders[settings.currentProvider].apiKey = e.target.value;
                setSettings({ ...settings, providers: newProviders });
              }}
              className="w-full p-2 border rounded"
              placeholder="Enter API Key"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Base URL</label>
            <input
              type="text"
              value={currentProviderConfig.baseURL}
              onChange={(e) => {
                const newProviders = { ...settings.providers };
                newProviders[settings.currentProvider].baseURL = e.target.value;
                setSettings({ ...settings, providers: newProviders });
              }}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Model Name</label>
            <input
              type="text"
              value={currentProviderConfig.model}
              onChange={(e) => {
                const newProviders = { ...settings.providers };
                newProviders[settings.currentProvider].model = e.target.value;
                setSettings({ ...settings, providers: newProviders });
              }}
              className="w-full p-2 border rounded"
            />
          </div>
        </section>

        <section>
          <label className="block text-sm font-medium text-gray-700 mb-1">Anki Deck Name</label>
          <input
            type="text"
            value={settings.ankiDeckName}
            onChange={(e) => setSettings({ ...settings, ankiDeckName: e.target.value })}
            className="w-full p-2 border rounded"
          />
        </section>

        <section className="pt-4 border-t">
          <h3 className="text-lg font-bold mb-3">TTS Settings (Text-to-Speech)</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                TTS Provider
              </label>
              <select
                value={settings.tts?.currentProvider || 'azure'}
                onChange={(e) => {
                  const tts = settings.tts || { currentProvider: 'azure', providers: {} };
                  setSettings({ ...settings, tts: { ...tts, currentProvider: e.target.value } });
                }}
                className="w-full p-2 border rounded bg-white"
              >
                <option value="openai">OpenAI TTS (Stable)</option>
                <option value="azure">Azure Speech SDK (Needs Key)</option>
                <option value="volcengine">Volcengine (火山引擎)</option>
                <option value="dashscope">DashScope (阿里百炼/千问)</option>
              </select>
            </div>

            {settings.tts && settings.tts.providers[settings.tts.currentProvider] && (
              <div className="p-3 bg-blue-50 rounded-lg space-y-3">
                <h4 className="font-semibold text-xs uppercase text-blue-500">
                  {settings.tts.currentProvider.toUpperCase()} TTS Config
                </h4>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {settings.tts.currentProvider === 'volcengine' ? 'Access Token' : 'API Key / Token'}
                  </label>
                  <input
                    type="password"
                    value={settings.tts.providers[settings.tts.currentProvider].apiKey}
                    onChange={(e) => {
                      const tts = { ...settings.tts! };
                      tts.providers[tts.currentProvider].apiKey = e.target.value;
                      setSettings({ ...settings, tts });
                    }}
                    className="w-full p-2 border rounded"
                    placeholder={
                      settings.tts.currentProvider === 'openai' ? "Enter OpenAI API Key (leave empty to use general key)" : 
                      settings.tts.currentProvider === 'volcengine' ? "Enter Volcengine Access Token" :
                      settings.tts.currentProvider === 'dashscope' ? "Enter DashScope API Key" :
                      "Enter TTS API Key"
                    }
                  />
                  {settings.tts.currentProvider === 'volcengine' && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      * Note: Use "Access Token" from Volcengine Speech Synthesis project page, NOT Secret Key.
                    </p>
                  )}
                  {settings.tts.currentProvider === 'dashscope' && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      * Note: You can use your DashScope LLM API Key here.
                    </p>
                  )}
                </div>
                {settings.tts.currentProvider === 'openai' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Base URL (optional)</label>
                    <input
                      type="text"
                      value={settings.tts.providers[settings.tts.currentProvider].endpoint || ''}
                      onChange={(e) => {
                        const tts = { ...settings.tts! };
                        tts.providers[tts.currentProvider].endpoint = e.target.value;
                        setSettings({ ...settings, tts });
                      }}
                      className="w-full p-2 border rounded"
                      placeholder="https://api.openai.com/v1/audio/speech"
                    />
                  </div>
                )}
                {settings.tts.currentProvider === 'azure' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Region (e.g. eastasia)</label>
                      <input
                        type="text"
                        value={settings.tts.providers[settings.tts.currentProvider].region || ''}
                        onChange={(e) => {
                          const tts = { ...settings.tts! };
                          tts.providers[tts.currentProvider].region = e.target.value;
                          setSettings({ ...settings, tts });
                        }}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                  </>
                )}
                {settings.tts.currentProvider === 'volcengine' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">AppID</label>
                      <input
                        type="text"
                        value={settings.tts.providers[settings.tts.currentProvider].region || ''}
                        onChange={(e) => {
                          const tts = { ...settings.tts! };
                          tts.providers[tts.currentProvider].region = e.target.value;
                          setSettings({ ...settings, tts });
                        }}
                        className="w-full p-2 border rounded"
                        placeholder="e.g. 12345678"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Cluster ID (业务集群)</label>
                      <input
                        type="text"
                        value={settings.tts.providers[settings.tts.currentProvider].endpoint || ''}
                        onChange={(e) => {
                          const tts = { ...settings.tts! };
                          tts.providers[tts.currentProvider].endpoint = e.target.value;
                          setSettings({ ...settings, tts });
                        }}
                        className="w-full p-2 border rounded"
                        placeholder="volcano_tts (default) or volcano_mega_tts"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">
                        * Seed-TTS 2.0 usually uses "volcano_mega_tts" or "volcano_tts". Check console for Cluster ID.
                      </p>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {settings.tts.currentProvider === 'dashscope' ? 'Model Name' : 'Voice ID / Name / Lang'}
                  </label>
                  {settings.tts.currentProvider === 'dashscope' && (
                    <input
                      type="text"
                      value={settings.tts.providers[settings.tts.currentProvider].model || ''}
                      onChange={(e) => {
                        const tts = { ...settings.tts! };
                        tts.providers[tts.currentProvider].model = e.target.value;
                        setSettings({ ...settings, tts });
                      }}
                      className="w-full p-2 border rounded mb-2"
                      placeholder="cosyvoice-v1"
                    />
                  )}
                  <input
                    type="text"
                    value={settings.tts.providers[settings.tts.currentProvider].voice || ''}
                    onChange={(e) => {
                      const tts = { ...settings.tts! };
                      tts.providers[tts.currentProvider].voice = e.target.value;
                      setSettings({ ...settings, tts });
                    }}
                    className="w-full p-2 border rounded"
                    placeholder={
                      settings.tts.currentProvider === 'azure' ? 'en-US-AvaMultilingualNeural' : 
                      settings.tts.currentProvider === 'dashscope' ? 'longxiaochun' :
                      'bv001_streaming'
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 pt-4 border-t flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700"
        >
          <Save size={18} /> Save Settings
        </button>
      </div>
    </div>
  );
}
