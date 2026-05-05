/**
 * ChatStreamDemo
 *
 * Proof-of-concept streaming chatbot using SSE (Server-Sent Events).
 * This component is isolated from the production Chat component and is only
 * rendered when the VITE_CHATBOT_STREAM_ENABLED env var is set to "true".
 *
 * Behaviour:
 * - Streams the LLM response token-by-token via ReadableStream
 * - Shows a typing indicator while the stream is in progress
 * - Falls back gracefully to the hardcoded dummy response if the stream fails
 * - Does NOT affect the existing Chat component in any way
 *
 * To enable: set VITE_CHATBOT_STREAM_ENABLED=true in mobileuurka-webapp/.env
 */

import React, { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { BsPaperclip } from 'react-icons/bs';
import { IoIosSend } from 'react-icons/io';
import { HiDotsHorizontal } from 'react-icons/hi';
import { LuZap } from 'react-icons/lu';
import type { PatientData } from '../types/patient';

interface Message {
  id: string | number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
  streaming?: boolean;
}

interface ChatStreamDemoProps {
  patient: PatientData;
  user: {
    id: string;
    name?: string;
    firstName?: string;
  };
}

const FALLBACK_RESPONSE =
  "This is a dummy response. I've received your message about the patient records and I'm ready to help!";

const STREAM_ENABLED = import.meta.env.VITE_CHATBOT_STREAM_ENABLED === 'true';

const ChatStreamDemo: React.FC<ChatStreamDemoProps> = ({ patient, user }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const SERVER = import.meta.env.VITE_SERVER_URL;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isBotTyping]);

  // Clean up any in-flight stream on unmount
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const addUserMessage = (text: string): void => {
    const msg: Message = {
      id: Date.now(),
      text,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, msg]);
  };

  const appendBotToken = (botId: number, token: string): void => {
    setMessages(prev =>
      prev.map(m =>
        m.id === botId
          ? { ...m, text: m.text + token }
          : m
      )
    );
  };

  const finaliseBotMessage = (botId: number): void => {
    setMessages(prev =>
      prev.map(m => m.id === botId ? { ...m, streaming: false } : m)
    );
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isBotTyping) return;

    const userText = message.trim();
    addUserMessage(userText);
    setMessage('');
    setIsBotTyping(true);

    // If streaming is disabled, fall back to dummy immediately
    if (!STREAM_ENABLED) {
      setTimeout(() => {
        const botId = Date.now() + 1;
        setMessages(prev => [...prev, {
          id: botId,
          text: FALLBACK_RESPONSE,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }]);
        setIsBotTyping(false);
      }, 800);
      return;
    }

    // Create a placeholder bot message that we'll stream into
    const botId = Date.now() + 1;
    setMessages(prev => [...prev, {
      id: botId,
      text: '',
      sender: 'bot',
      streaming: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
    setIsBotTyping(false); // typing indicator replaced by streaming message

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${SERVER}/chatbot/stream/patient/${patient.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: userText }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.token) {
              appendBotToken(botId, payload.token);
            }
            if (payload.done) {
              finaliseBotMessage(botId);
            }
          } catch {
            // Malformed SSE line — skip
          }
        }
      }

      finaliseBotMessage(botId);

    } catch (err: any) {
      if (err?.name === 'AbortError') return;

      console.error('[ChatStreamDemo] Stream error:', err);
      // Replace the empty placeholder with the fallback text
      setMessages(prev =>
        prev.map(m =>
          m.id === botId
            ? { ...m, text: FALLBACK_RESPONSE, streaming: false }
            : m
        )
      );
    }
  };

  const adjustTextareaHeight = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full lg:h-[95%] mt-7.5 w-full bg-[#F6F6F6] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-6 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span>Sabi</span>
          {STREAM_ENABLED && (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]">
              <LuZap size={9} /> Streaming
            </span>
          )}
        </div>
        <HiDotsHorizontal className="text-gray-400 cursor-pointer text-xl" />
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-10 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-[#f3eee7] rounded-2xl flex items-center justify-center mb-4">
              <img src="/images/logo.png" alt="Logo" className="w-1/2" />
            </div>
            <h3 className="text-2xl font-bold bg-linear-to-r from-[#e6d7c8] to-[#c2c2c2] bg-clip-text text-transparent">
              Hi, {user?.name?.split(' ')[0] || user?.firstName || 'User'}
            </h3>
            <h4 className="text-gray-500 mt-1">How can I help with {patient?.name}?</h4>
            {STREAM_ENABLED && (
              <p className="text-[11px] text-[#16a34a] mt-2 flex items-center gap-1">
                <LuZap size={11} /> Streaming mode active — responses appear token by token
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#79b49a] text-white rounded-br-sm'
                    : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                }`}>
                  {msg.streaming && msg.text === '' ? (
                    // Show dots while waiting for first token
                    <div className="flex gap-1 py-1">
                      <div className="w-1.5 h-1.5 bg-[#79b49a] rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 bg-[#79b49a] rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 bg-[#79b49a] rounded-full animate-bounce" />
                    </div>
                  ) : (
                    <>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                          h3: ({ ...props }) => <h3 className="text-sm font-bold my-1" {...props} />,
                          p: ({ ...props }) => <p className="my-1" {...props} />,
                          ul: ({ ...props }) => <ul className="ml-4 list-disc space-y-1" {...props} />,
                          strong: ({ ...props }) => <strong className="font-semibold text-inherit" {...props} />,
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                      {/* Blinking cursor while streaming */}
                      {msg.streaming && (
                        <span className="inline-block w-0.5 h-3.5 bg-gray-400 ml-0.5 animate-pulse align-middle" />
                      )}
                    </>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1 tracking-tight">{msg.timestamp}</span>
              </div>
            ))}

            {/* Typing indicator — only shown before first token arrives */}
            {isBotTyping && (
              <div className="flex items-start animate-in fade-in duration-300">
                <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1">
                  <div className="w-1.5 h-1.5 bg-[#79b49a] rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-[#79b49a] rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-[#79b49a] rounded-full animate-bounce" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-2" />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-50">
        <div className="flex items-end gap-3">
          <div className="flex-1 flex items-end bg-white rounded-[24px] border-0 px-2 py-1 transition-all relative">
            <button className="p-2.5 mb-0.5 bg-[#F6F6F6] hover:bg-gray-200 rounded-full transition-colors shrink-0">
              <BsPaperclip className="text-gray-500" />
            </button>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={adjustTextareaHeight}
              onKeyDown={handleKeyPress}
              placeholder="Start typing..."
              rows={1}
              className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-sm px-3 py-2.5 resize-none max-h-40 overflow-y-auto"
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || isBotTyping}
            className="w-12 h-12 bg-[#008540] text-white rounded-full flex items-center justify-center hover:brightness-95 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 shrink-0"
          >
            <IoIosSend size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatStreamDemo;
