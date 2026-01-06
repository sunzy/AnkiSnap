import React, { useState, useEffect, useCallback } from 'react'
import { Settings as SettingsIcon, Image as ImageIcon, Trash2, Play, CheckCircle2, Pin, PinOff, AlertCircle } from 'lucide-react'
import SettingsPage from './pages/SettingsPage'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { addNoteToAnki, checkAnkiConnection } from './services/AnkiService'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface LLMResult {
  english: string;
  chinese: string;
  grammar: string;
}

function App() {
  const [image, setImage] = useState<string | null>(null)
  const [results, setResults] = useState<LLMResult[]>([])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false)
  const [ankiError, setAnkiError] = useState<string | null>(null)

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
    } catch (error: any) {
      console.error('Analysis failed', error)
      alert(`Analysis failed: ${error.message || 'Check your API key and network'}`)
    } finally {
      setLoading(false)
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
      for (const result of results) {
        await addNoteToAnki({
          deckName: settings.ankiDeckName,
          modelName: 'Basic', // Or a custom model if preferred
          fields: {
            Front: result.chinese,
            Back: `${result.english}<br><br><div style="font-size: 0.8em; color: gray;">${result.grammar}</div>`,
          },
        })
      }
      alert('Successfully synced to Anki!')
      setResults([])
      setImage(null)
    } catch (error: any) {
      alert(`Sync failed: ${error.message}`)
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
    <div className="flex flex-col h-full w-full bg-white text-slate-800 font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-slate-50 border-b drag">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
          <h1 className="text-sm font-bold tracking-tight">AnkiSnap</h1>
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

        {!image ? (
          <div className="h-48 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-50">
            <ImageIcon size={32} />
            <p className="text-xs">Paste (Ctrl+V) image here</p>
          </div>
        ) : (
          <div className="relative group">
            <img src={image} className="w-full rounded-xl shadow-sm border border-slate-200" alt="Pasted" />
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => setImage(null)}
                className="p-1.5 bg-white/90 backdrop-blur text-red-500 rounded-full shadow-lg hover:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )}

        {image && results.length === 0 && !loading && (
          <button
            onClick={startAnalysis}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
          >
            <Play size={18} fill="currentColor" /> Start AI Analysis
          </button>
        )}

        {loading && (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Processing...</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Analysis Results</h3>
            {results.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                <div className="text-sm font-semibold text-slate-800 leading-tight">
                  <input 
                    className="w-full bg-transparent focus:outline-none" 
                    value={item.english} 
                    onChange={(e) => {
                      const newResults = [...results]
                      newResults[idx].english = e.target.value
                      setResults(newResults)
                    }}
                  />
                </div>
                <div className="text-xs text-slate-600">
                  <input 
                    className="w-full bg-transparent focus:outline-none" 
                    value={item.chinese} 
                    onChange={(e) => {
                      const newResults = [...results]
                      newResults[idx].chinese = e.target.value
                      setResults(newResults)
                    }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 italic bg-white p-2 rounded-lg border border-slate-100">
                  <textarea 
                    className="w-full bg-transparent focus:outline-none resize-none" 
                    rows={2}
                    value={item.grammar} 
                    onChange={(e) => {
                      const newResults = [...results]
                      newResults[idx].grammar = e.target.value
                      setResults(newResults)
                    }}
                  />
                </div>
              </div>
            ))}
            <button
              onClick={syncToAnki}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-md shadow-green-200"
            >
              <CheckCircle2 size={18} /> Sync to Anki
            </button>
          </div>
        )}
      </div>

      {isSettingsOpen && <SettingsPage onClose={() => setIsSettingsOpen(false)} />}
      
      <style>{`
        .drag { -webkit-app-region: drag; }
        .no-drag { -webkit-app-region: no-drag; }
      `}</style>
    </div>
  )
}

export default App


