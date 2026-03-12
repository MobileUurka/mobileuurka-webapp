import React, { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { BsPaperclip } from "react-icons/bs";
import { IoIosSend } from "react-icons/io";
import { HiDotsHorizontal } from "react-icons/hi";

// Types
import { type PatientData } from '../types/patient';

interface Message {
  id: string | number;
  text: string;
  sender: "user" | "bot";
  timestamp: string;
}

interface ChatProps {
  patient: PatientData;
  user: {
    id: string;
    name?: string;
    firstName?: string;
  };
}

const Chat: React.FC<ChatProps> = ({ patient, user }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const SERVER = import.meta.env.VITE_SERVER_URL;

  // --- Logic Hooks ---

  useEffect(() => {
    if (user?.id) {
      getChats();
    }
  }, [user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isBotTyping]);

  // --- Functions ---

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  const getChats = async () => {
    try {
      const response = await fetch(`${SERVER}/chatbot/`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      
      // Transform raw data from server to our Message format
      const transformed: Message[] = [];
      data.forEach((chat: any) => {
        const time = new Date(chat.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        transformed.push(
          { id: `${chat.chat_id}-user`, text: chat.inquiry, sender: "user", timestamp: time },
          { id: `${chat.chat_id}-bot`, text: chat.response, sender: "bot", timestamp: time }
        );
      });
      setMessages(transformed);
    } catch (error) {
      console.error("Error fetching chats:", error);
    }
  };

  // const handleSendMessage = async () => {
  //   if (!message.trim()) return;

  //   const userMsg: Message = {
  //     id: Date.now(),
  //     text: message,
  //     sender: "user",
  //     timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  //   };

  //   setMessages((prev) => [...prev, userMsg]);
  //   const currentInput = message;
  //   setMessage("");
  //   setIsBotTyping(true);

  //   try {
  //     const res = await fetch("https://healthcare-worker-chatbot-864851114868.europe-west4.run.app", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         "X-API-Key": "EKg84btQ8ySs3bbbUIm8Ut5y9uznO4Ookmsd-PGxwdg",
  //       },
  //       body: JSON.stringify({
  //         user_id: user.id,
  //         user_chat: currentInput,
  //         schema_name: "org",
  //       }),
  //     });

  //     const data = await res.json();
  //     const botResponseText = data.response || "Okay, I've noted that!";
      
  //     const botMsg: Message = {
  //       id: Date.now() + 1,
  //       text: botResponseText,
  //       sender: "bot",
  //       timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  //     };

  //     setMessages(prev => [...prev, botMsg]);
  //     setIsBotTyping(false);
      
  //     // Save to database
  //     await fetch(`${SERVER}/chatbot/`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ user_id: user.id, inquery: currentInput, response: botResponseText }),
  //       credentials: "include",
  //     });

  //   } catch (err) {
  //     console.error("Failed to send chat:", err);
  //     setIsBotTyping(false);
  //   }
  // };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    // 1. Create and add User Message
    const userMsg: Message = {
      id: Date.now(),
      text: message,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setMessage("");
    
    // 2. Start "Typing" state
    setIsBotTyping(true);

    // 3. Simulate a delay (1 second) then add Dummy Response
    setTimeout(() => {
      const dummyMsg: Message = {
        id: Date.now() + 1,
        text: "This is a dummy response. I've received your message about the patient records and I'm ready to help!",
        sender: "bot",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, dummyMsg]);
      setIsBotTyping(false);
    }, 1000); 
  };

  const adjustTextareaHeight = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const target = e.target;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[95%] mt-7.5 w-full bg-[#F6F6F6] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-6 border-b border-gray-100 sticky top-0 z-10">
        <div>Sabi</div>
        <HiDotsHorizontal className="text-gray-400 cursor-pointer text-xl" />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-10 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-[#f3eee7] rounded-2xl flex items-center justify-center mb-4">
              <img src="/images/logo.png" alt="Logo" className="w-1/2" />
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-[#e6d7c8] to-[#c2c2c2] bg-clip-text text-transparent">
              Hi, {user?.name?.split(" ")[0] || user?.firstName || 'User'}
            </h3>
            <h4 className="text-gray-500 mt-1">How can I help with {patient?.name}?</h4>
            
           
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                  msg.sender === "user" 
                    ? "bg-[#79b49a] text-white rounded-br-sm" 
                    : "bg-white text-gray-800 rounded-bl-sm border border-gray-100"
                }`}>
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
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1 tracking-tight">{msg.timestamp}</span>
              </div>
            ))}
            
            {isBotTyping && (
              <div className="flex items-start animate-in fade-in duration-300">
                <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1">
                  <div className="w-1.5 h-1.5 bg-[#79b49a] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-[#79b49a] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-[#79b49a] rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-2" />
          </div>
        )}
      </div>

      {/* Input Section */}
      <div className="p-4  border-t border-gray-50">
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

export default Chat;