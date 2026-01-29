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
            // console.log('value:', value); // [100, 22, 33, ...]

            // 바이너리 데이터 => 문자열로 변환 (디코딩)
            const chunk = decoder.decode(value, {stream: true});
            // console.log(chunk); // data: JSON문자열{~~~~}\n\ndata: JSON문자열{~~~~}\n
            // console.log('-----------------------------------');

            const lines = chunk.split('\n'); // ['data: JSON문자열{~~~~}', ..]
            for(const line of lines){
              // console.log('line -',line);
              const data = line.slice(6); // JSON문자열 || [DONE]

              if(data === '[DONE]'){
                controller.close();
                return;
              }

              try {
                const json = JSON.parse(data);  // JSON 객체 (data가 빈문자열일 경우 에러 => catch)
                // console.log(json);

                const content = json.choices[0]?.delta?.content || ''; // "안"

                if(content){
                  // 프론트엔드로 SSE 방식으로 content 전달 (data: JSON문자열\n\n)
                  const sseData = `data: ${JSON.stringify({ content })}\n\n`;
                  controller.enqueue(new TextEncoder().encode(sseData)); // JSON문자열=>바이너리데이터=>프론트로 흘려보내기
                }
              }catch(error){
                // JSON 문자열 파싱 오류는 스킵 (별도의 과정 x)
              }
            }
          }

        }catch(error){
          console.log('스트림 처리 오류:', error);
          controller.error(error);
        }finally {
          reader.releaseLock();
        }

      }
    })

    // 5. 클라이언트측으로 응답 (body: stream객체, headers: SSE방식지정)
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    })

  }catch(error){
    return NextResponse.json({
      error: '서버 측에 오류가 발생하였습니다.'
    }, { status: 500 })
  }

}