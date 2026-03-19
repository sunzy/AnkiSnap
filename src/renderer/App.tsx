import React, { useState, useEffect, useCallback } from 'react'
import { Settings as SettingsIcon, Image as ImageIcon, Trash2, Play, CheckCircle2, Pin, PinOff, AlertCircle, Minus, X, Volume2, Music } from 'lucide-react'
import SettingsPage from './pages/SettingsPage'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { addNoteToAnki, checkAnkiConnection } from './services/AnkiService'
import Logo from './components/Logo'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface LLMResult {
  english: string;
  chinese: string;
  grammar: string;
  audioPath?: string;
}

function App() {
  const [image, setImage] = useState<string | null>(null)
  const [results, setResults] = useState<LLMResult[]>([])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ttsLoading, setTtsLoading] = useState(false)
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false)
  const [ankiError, setAnkiError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

  const playAudio = (path: string) => {
    const audio = new Audio(`file://${path}`);
    audio.play().catch(e => console.error('Failed to play audio:', e));
  }

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile()
        if (blob) {
          const reader = new FileReader()
          reader.onload = (event) => {
            setImage(event.target?.result as string)
            setResults([])
          }
          reader.readAsDataURL(blob)
        }
      }
    }
  }, [])

  useEffect(() => {
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [handlePaste])

  useEffect(() => {
    // Initial check or sync could go here
  }, [])

  const startAnalysis = async () => {
    if (!image) return
    setLoading(true)
    try {
      const settings = await window.electronAPI.getSettings()
      const provider = settings.currentProvider
      const config = settings.providers[provider]
      const base64 = image.split(',')[1]
      
      const res = await window.electronAPI.analyzeImage(provider, base64, config)
      if (!res || res.length === 0) {
        throw new Error('AI returned empty results. Please try a different image or provider.')
      }
      
      setResults(res)
      
      // TTS Synthesis
      if (settings.tts && settings.tts.currentProvider) {
        setTtsLoading(true)
        const ttsResults = [...res]
        const ttsProvider = settings.tts.currentProvider
        let ttsConfig = { ...settings.tts.providers[ttsProvider] }

        // Special handling for OpenAI TTS: fallback to general OpenAI key if empty
        if (ttsProvider === 'openai' && !ttsConfig.apiKey) {
          ttsConfig.apiKey = settings.providers.openai?.apiKey
        }
        // Special handling for DashScope TTS: fallback to general DashScope key if empty
        if (ttsProvider === 'dashscope' && !ttsConfig.apiKey) {
          ttsConfig.apiKey = settings.providers.dashscope?.apiKey
        }

        for (let i = 0; i < ttsResults.length; i++) {
          try {
            const audioPath = await window.electronAPI.ttsSynthesize({
              text: ttsResults[i].english,
              provider: ttsProvider,
              config: ttsConfig
            })
            ttsResults[i].audioPath = audioPath
            setResults([...ttsResults]) // Update state one by one to show progress
          } catch (e: any) {
            console.error('TTS synthesis failed for sentence:', i, e)
            showToast(`TTS Failed: ${e.message || 'Unknown error'}`, 'error')
            break; // Stop trying if it fails once to avoid multiple error toasts
          }
        }
        setTtsLoading(false)
      }
    } catch (error: any) {
      console.error('Analysis failed', error)
      showToast(error.message || 'Check your API key and network', 'error')
    } finally {
      setLoading(false)
      setTtsLoading(false)
    }
  }

  const syncToAnki = async () => {
    const isAnkiRunning = await checkAnkiConnection()
    if (!isAnkiRunning) {
      setAnkiError('Anki is not running. Please open Anki with AnkiConnect installed.')
      return
    }

    setLoading(true)
    try {
      const settings = await window.electronAPI.getSettings()
      let addedCount = 0;
      let updatedCount = 0;

      for (const result of results) {
        const syncResult = await addNoteToAnki({
          deckName: settings.ankiDeckName,
          modelName: 'Basic', // Or a custom model if preferred
          fields: {
            Front: result.chinese,
            Back: `${result.english}<br><br><div style="font-size: 0.8em; color: gray;">${result.grammar}</div>`,
          },
          audioPath: result.audioPath
        })
        
        if (syncResult === 'updated') {
          updatedCount++;
        } else {
          addedCount++;
        }
      }

      let message = 'Successfully synced to Anki!';
      if (updatedCount > 0 && addedCount > 0) {
        message = `Synced: ${addedCount} added, ${updatedCount} updated.`;
      } else if (updatedCount > 0) {
        message = `Updated ${updatedCount} existing notes in Anki.`;
      } else if (addedCount > 0) {
        message = `Added ${addedCount} new notes to Anki.`;
      }

      showToast(message)
      setResults([])
      setImage(null)
    } catch (error: any) {
      showToast(`Sync failed: ${error.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const toggleAlwaysOnTop = async () => {
    try {
      const state = await window.electronAPI.toggleAlwaysOnTop()
      setIsAlwaysOnTop(state)
    } catch (err) {
      console.error('Toggle always on top failed:', err)
    }
  }

  return (
    <div className="h-screen w-screen bg-[#f5f5f7] flex flex-col overflow-hidden text-[#1d1d1f] font-sans select-none border border-gray-300/50 rounded-lg shadow-inner">
      {/* Custom Title Bar */}
       <div className="h-10 flex items-center justify-between px-4 bg-white/80 backdrop-blur-md border-b border-gray-200/80 drag shrink-0">
         <div className="flex items-center gap-2">
           <Logo size={20} />
           <span className="text-xs font-bold text-gray-700 tracking-tight">AnkiSnap</span>
         </div>
        <div className="flex items-center gap-1 no-drag">
          <button 
            onClick={toggleAlwaysOnTop}
            className={cn("p-1.5 rounded-md transition-colors", isAlwaysOnTop ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:bg-slate-200")}
          >
            {isAlwaysOnTop ? <Pin size={16} /> : <PinOff size={16} />}
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-md transition-colors"
          >
            <SettingsIcon size={16} />
          </button>
          <button 
            onClick={() => window.electronAPI.minimizeWindow()}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-500"
          >
            <Minus size={14} />
          </button>
          <button 
            onClick={() => window.electronAPI.closeWindow()}
            className="p-1.5 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-md transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {ankiError && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-red-600 text-xs">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              {ankiError}
              <button onClick={() => setAnkiError(null)} className="ml-2 underline">Dismiss</button>
            </div>
          </div>
        )}

        <div className="flex flex-col space-y-4">
          <div className="h-[280px] w-full relative shrink-0">
            {!image ? (
              <div className="h-full w-full border-2 border-dashed border-blue-100 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-4 bg-white/50 backdrop-blur-sm transition-all hover:border-blue-200 hover:bg-white/80">
                <div className="relative">
                  <Logo size={64} className="opacity-80" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white border-2 border-white shadow-sm">
                    <ImageIcon size={12} />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-slate-600">Snap & Learn</p>
                  <p className="text-[10px] text-slate-400">Paste (Ctrl+V) any image to start</p>
                </div>
              </div>
            ) : (
              <div className="h-full w-full relative group bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center">
                <img src={image} className="max-h-full max-w-full object-contain" alt="Pasted" />
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      setImage(null)
                      setResults([])
                    }}
                    className="p-1.5 bg-white/90 backdrop-blur text-red-500 rounded-full shadow-lg hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {loading && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Processing...</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-3 pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Analysis Results</h3>
                <button 
                  onClick={() => {
                    setResults([])
                    setImage(null)
                  }}
                  className="text-[10px] text-red-500 hover:underline"
                >
                  Discard All
                </button>
              </div>
              {results.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2 relative group/item">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 text-sm font-semibold text-slate-800 leading-tight">
                      <textarea 
                        className="w-full bg-transparent focus:outline-none resize-none overflow-hidden break-words" 
                        value={item.english} 
                        rows={1}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = target.scrollHeight + 'px';
                        }}
                        ref={(tag) => {
                          if (tag) {
                            tag.style.height = 'auto';
                            tag.style.height = tag.scrollHeight + 'px';
                          }
                        }}
                        onChange={(e) => {
                          const newResults = [...results]
                          newResults[idx].english = e.target.value
                          setResults(newResults)
                        }}
                      />
                    </div>
                    {item.audioPath ? (
                      <button 
                        onClick={() => playAudio(item.audioPath!)}
                        className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors shrink-0"
                        title="Play Audio"
                      >
                        <Volume2 size={16} />
                      </button>
                    ) : (
                      ttsLoading && (
                        <div className="p-1 text-slate-300 animate-pulse shrink-0">
                          <Music size={16} />
                        </div>
                      )
                    )}
                  </div>
                  <div className="text-xs text-slate-600">
                    <textarea 
                      className="w-full bg-transparent focus:outline-none resize-none overflow-hidden break-words" 
                      value={item.chinese} 
                      rows={1}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                      ref={(tag) => {
                        if (tag) {
                          tag.style.height = 'auto';
                          tag.style.height = tag.scrollHeight + 'px';
                        }
                      }}
                      onChange={(e) => {
                        const newResults = [...results]
                        newResults[idx].chinese = e.target.value
                        setResults(newResults)
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 bg-white p-3 rounded-lg border border-slate-100 leading-relaxed overflow-y-auto max-h-[200px]" 
                    dangerouslySetInnerHTML={{ __html: item.grammar }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Footer Actions */}
      <div className="p-4 bg-white border-t border-gray-100 shrink-0">
        {results.length === 0 ? (
          <button
            onClick={startAnalysis}
            disabled={!image || loading}
            className={cn(
              "w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-md",
              image && !loading
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200" 
                : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
            )}
          >
            {!loading && <Play size={18} fill="currentColor" />}
            {loading ? "Analyzing..." : "Start AI Analysis"}
          </button>
        ) : (
          <button
            onClick={syncToAnki}
            disabled={loading}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-md shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!loading && <CheckCircle2 size={18} />}
            {loading ? "Syncing..." : "Sync to Anki"}
          </button>
        )}
      </div>

      {isSettingsOpen && <SettingsPage onClose={() => setIsSettingsOpen(false)} />}

      {/* Toast Notification */}
      {toast && (
        <div className={cn(
          "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-3 rounded-2xl shadow-2xl text-white text-sm font-bold transition-all animate-in fade-in zoom-in duration-300 z-50 flex flex-col items-center gap-3 min-w-[120px]",
          toast.type === 'success' ? "bg-green-600/95 backdrop-blur-md" : "bg-red-600/95 backdrop-blur-md"
        )}>
          {toast.type === 'success' ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}

export default App


