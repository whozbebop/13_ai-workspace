'use client';

import { useState } from 'react';

export default function ChatStreaming() {

  const [message, setMessage] = useState(''); // 사용자 입력 메세지 
  const [loading, setLoading] = useState(false); // 로딩 상태
  const [error, setError] = useState(''); // 에러 메시지
  const [response, setResponse] = useState(''); // 응답 메시지 (대기중일 때는 빈 문자열)

  // 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError('');
    setResponse('');

    try{

      await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      })

    }catch(error) {

    }
    

  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        스트리밍 방식 (SSE) - Latency Masking
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        응답이 생성되는 동안 실시간으로 볼 수 있습니다. (타자 치듯이)
      </p>

      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '스트리밍 중...' : '전송'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {response && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-semibold mb-2 text-gray-800">응답 (실시간):</h3>
          <p className="text-gray-700 whitespace-pre-wrap">
            {response}
            {loading && (
              <span className="inline-block w-2 h-4 bg-green-500 ml-1 animate-pulse" />
            )}
          </p>
        </div>
      )}

      {loading && !response && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-green-700">스트리밍을 시작하는 중...</p>
        </div>
      )}
    </div>
  );
}