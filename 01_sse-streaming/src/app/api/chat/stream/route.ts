import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {

  try {

    // 1. 사용자 입력 메세지 전달받기 
    const { message } = await request.json();
    if(!message){
      return NextResponse.json({
        error: '메세지가 누락되었습니다.'
      }, { status: 400 })
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
        stream: true, // 스트리밍 응답을 받기 위해서 활성화
      })
    });

    if(!response.ok){
      return NextResponse.json({
        error: 'Open AI API 오류'
      }, { status: response.status })
    }

    // 4. OpenAI 응답(response.body) ReadableStream
    const stream = new ReadableStream({
      // start: 스트림이 시작될 때 (클라이언트가 연결시) 자동으로 호출되는 함수
      // controller: 스트림 청크 데이터를 전송(push)/종료(close)할 수 있는 컨트롤러 객체
      start: async (controller) => {

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if(!reader) {
          controller.close(); // 만약 응답body가 없으면 스트림을 종료
          return;
        }

        try {
          // reader 객체를 통해 청크단위의 모든 데이터들을 읽어들이는 과정 
          while(true){

            const { done, value } = await reader.read(); // { done: 데이터 읽기 완료 여부, value: 읽어들인 데이터(청크) }
            if(done) {
              controller.close();
              break;
            }

            // value : Unit8Array (바이너리 데이터)
            // console.log('value:', value);

            // 바이너리 데이터 => 문자열로 변환 (디코딩)
            const chunk = decoder.decode(value, {stream: true});
            console.log(chunk);
            console.log('-----------------------------------');

          }

        }catch(error){
          console.log('스트림 처리 오류:', error);
          controller.error(error);
        }finally {
          reader.releaseLock();
        }

      }
    })




  }catch(error){
    return NextResponse.json({
      error: '서버 측에 오류가 발생하였습니다.'
    }, { status: 500 })
  }

}