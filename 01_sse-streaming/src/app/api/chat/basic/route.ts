// endpoint: /api/chat/basic 

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {

  try {

    // 1. 프론트에서 전달되는 메세지 받기 
    const { message } = await request.json(); // { message: '~~~~~' }
    if(!message){ // 입력값 검증 
      return NextResponse.json({
        error: '메세지가 누락되었습니다.'
      }, { status: 400 });
    }

    // 2. OpenAI API 연동을 위한 Key 가져오기 (환경변수)
    const apiKey = process.env.OPENAI_API_KEY;
    if(!apiKey) {
      return NextResponse.json({
        error: 'OpenAI API Key가 설정되어있지 않습니다.'
      }, { status: 500 })
    }

    // 3. OpenAI 연동 (SDK vs "API요청")
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Respond in Korean.'
          },
          {
            role: 'user',
            content: message
          }
        ],
        stream: false, // 일반 REST API 방식 (스트리밍 비활성화, 전체 응답 받기)
      })
    })

    if(!response.ok){
      return NextResponse.json({
        error: 'Open AI API 오류'
      }, { status: response.status })
    }

    // 4. OpenAI의 응답 프론트 전달 
    const data = await response.json(); // { .., choices: [{message: {content: 'AI답변'}}] }

    return NextResponse.json({
      success: true,
      message: data.choices[0].message.content
    })

  }catch(error){
    console.error('서버 측 오류:', error);
    return NextResponse.json({
      error: '서버 측에서 오류가 발생했습니다.'
    }, {
      status: 500
    })
  }

}
