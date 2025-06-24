'use client';

import { useChat } from 'ai/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto max-w-4xl py-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Weather Chat Assistant</h1>
          <p className="text-gray-300">Ask me about the weather in any city around the world!</p>
          <p className="text-sm text-gray-400 mt-2">Powered by Mastra Weather Agent</p>
        </div>
        
        <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
          {/* Messages */}
          <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-800">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <p>👋 Hi! I'm your weather assistant powered by Mastra.</p>
                <p>Ask me about the weather in any city!</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`${
                    message.role === 'user' 
                      ? 'max-w-xs lg:max-w-md' 
                      : 'max-w-sm lg:max-w-lg xl:max-w-xl'
                  } px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-100 border border-gray-600'
                  }`}
                >
                  {message.role === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                  ) : (
                    <div className="text-sm prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h2: ({node, ...props}) => <h2 className="text-base font-semibold text-white mb-2 mt-3 first:mt-0" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-sm font-semibold text-white mb-1 mt-2" {...props} />,
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0 text-gray-100" {...props} />,
                          ul: ({node, ...props}) => <ul className="mb-2 pl-4 space-y-1" {...props} />,
                          li: ({node, ...props}) => <li className="text-gray-100" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
                          code: ({node, ...props}: any) => {
                            const isInline = !props.className?.includes('language-');
                            return isInline 
                              ? <code className="bg-gray-600 px-1 py-0.5 rounded text-xs font-mono text-gray-200" {...props} />
                              : <code className="block bg-gray-600 p-2 rounded text-xs font-mono text-gray-200 overflow-x-auto" {...props} />;
                          },
                          a: ({node, ...props}) => <a className="text-blue-300 hover:text-blue-200 underline" target="_blank" rel="noopener noreferrer" {...props} />,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 text-gray-100 border border-gray-600 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-gray-300">Mastra agent is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-gray-700 bg-gray-800">
            <div className="flex items-center p-4">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Ask about weather in any city..."
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="ml-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 