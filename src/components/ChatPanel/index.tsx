'use client'

import { useState, useRef, useEffect } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { usePlanStore } from '@/stores/planStore'
import { Message } from './Message'
import TaskQueue from './TaskQueue'

interface ChatPanelProps {
  onSeek: (time: number) => void
  onExecuteInstruction: (instruction: unknown) => void
}

export function ChatPanel({ onSeek, onExecuteInstruction }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { messages, video, overlays, addMessage, addInstruction } = useEditorStore()
  const { currentPlan } = usePlanStore()
  const hasPlan = !!currentPlan

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !video) return

    const userMessage = {
      id: `user_${Date.now()}`,
      role: 'user' as const,
      content: input,
      timestamp: new Date()
    }
    addMessage(userMessage)
    setInput('')
    setIsLoading(true)

    try {
      const messagesToSend = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: input }
      ]

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesToSend,
          videoId: video.id,
          overlays: overlays.filter(o => o.type === 'text')
        })
      })

      const data = await response.json()
      console.log('[ChatPanel] API response:', data)

      const assistantMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant' as const,
        content: data.response,
        timestamp: new Date()
      }
      addMessage(assistantMessage)

      if (data.instruction) {
        console.log('[ChatPanel] Received instruction:', data.instruction)
        const instruction = {
          id: `instruction_${Date.now()}`,
          ...data.instruction,
          status: 'pending' as const,
          createdAt: new Date()
        }

        console.log('[ChatPanel] Adding instruction to store:', instruction)
        addInstruction(instruction)
        console.log('[ChatPanel] Calling onExecuteInstruction')
        onExecuteInstruction(instruction)

        // Handle seek instruction immediately
        if (data.instruction.type === 'seek') {
          onSeek(data.instruction.params.time)
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error processing your request.',
        timestamp: new Date()
      }
      addMessage(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-lg">
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <div className="flex flex-col min-h-full">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-500">
              <svg
                className="w-12 h-12 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p>Start a conversation about editing your video</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4">
                {messages.map(msg => (
                  <Message key={msg.id} message={msg} />
                ))}
              </div>
              {isLoading && (
                <div className="flex items-center gap-2 text-gray-400 py-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {hasPlan && <TaskQueue />}

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={
              video ? 'Ask to edit your video...' : 'Upload a video first'
            }
            disabled={!video || isLoading}
            className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!video || !input.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}
