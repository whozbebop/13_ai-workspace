"use client";

/*
  [실습] 
  탐지된 객체에 book이 있을 경우 가장 점수가 높은 book 객체 crop 후 파일로 관리 

  1. 스크린샷 캡쳐 버튼 활성/비활성 먼저 해보기 
    - 실시간 탐지시 탐지된 객체들에 book이 있을 경우 버튼 활성화 
    - 어떤 상태관리를 해야될지 생각 
      (Hint:  book객체감지여부, 감지된 book객체중에 신뢰도가 가장 높은 bbox)

  2. 버튼 클릭시 스크린 캡처를 위한 함수 작업 
    1) 가상의 canvas 요소 생성 
    2) 가상의 canvas 요소에 drawImage를 통해 "감지된 book객체의 바운딩박스"를 참조하여 이미지로 그리기 
        (Hint: canvas.drawImage)
    3) 해당 canvas를 Blob 형태의 파일로 만들기 
        (Hint: canvas.toBlob)
    4) 만들어진 파일들을 상태로 관리하기 => 화면에 다운로드 / 삭제로 제공
*/

import { useEffect, useRef, useState } from "react";
import "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

type DetectedObject = {
  bbox: [number, number, number, number];
  class: string;
  score: number;
};

// 캡처된 파일 한 건에 대한 타입 
type CapturedFile = {
  id: number;        // 파일 고유 ID 
  blob: Blob;        // 파일 데이터 
  filename: string;  // 파일명 - 임의 생성
  objectUrl: string; // 파일 URL 
}

export default function Practice() {

  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string>("");
  const [detections, setDetections] = useState<DetectedObject[]>([]);

  // book 감지 여부 
  const [hasBook, setHasBook] = useState(false);
  // book 으로 감지된 객체의 바운딩 박스 영역 
  const [bookBbox, setBookBbox] = useState<[number, number, number, number] | null>(null);
  // 캡처된 파일 목록
  const [capturedFiles, setCapturedFiles] = useState<CapturedFile[]>([]);

  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if(videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
      if(modelRef.current) {
        modelRef.current.dispose();
        modelRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    const model = modelRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if(status !== "ready" || !video || !model || !canvas) return;

    const ctx = canvas.getContext("2d");
    if(!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const detectFrame = async () => {
      try {
        const detections = await model.detect(video, 20, 0.5);
        setDetections(detections);

        // 감지된 객체들 중 book인 객체만
        const books = detections.filter((d) => d.class === "book");
        if(books.length > 0) {
          setHasBook(true);
          // book 감지 결과 중 신뢰도 가장 높은 것 하나만 사용
          setBookBbox(books.reduce((a, b) => (a.score >= b.score ? a : b)).bbox);
        }else {
          setHasBook(false);
          setBookBbox(null);
        }

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        for(const detObj of detections) {
          const [x, y, width, height] = detObj.bbox;  
          const label = `${detObj.class} ${(detObj.score * 100).toFixed(0)}%`; 

          ctx.strokeStyle = "#00ff00";
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, width, height);

          const textWidth = ctx.measureText(label).width;
          const padding = 4; 
          ctx.fillStyle = "rgba(0, 255, 0, 0.8)"; 
          ctx.fillRect(x, y - (20 + padding), textWidth + padding * 2, 20 + padding);
          ctx.font = "14px sans-serif";
          ctx.fillStyle = "#000";
          ctx.fillText(label, x + padding, y - 8)
        }


      }catch(error){ }
      rafRef.current = requestAnimationFrame(detectFrame); 
    }
    rafRef.current = requestAnimationFrame(detectFrame);

    return () => {
      if(rafRef.current) cancelAnimationFrame(rafRef.current);
    }
  }, [status]);

  const startCamera = async () => {
    setStatus("loading");
    setError(""); 
    try{
      modelRef.current = await cocoSsd.load();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      const video = videoRef.current;
      if(!video) return; 
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        setStatus("ready");
      }
    }catch(error) {
      setError(error instanceof Error ? error.message : "웹캠 또는 모델 로드 실패");
      setStatus("error");
    }

  }

  // book 감지시 활성화된 스크린샷 버튼 클릭시 실행될 함수 
  // 1) book 감지 여부 재확인
  // 2) drawImage를 활용하여 가상의 canvas 요소에 비디오의 book bbox 영역만 잘라서 그리기 
  // 3) 가상의 canvas에 그려진 이미지를 Blob 형태로 변환하여 파일로 생성하기 
  const captureScreenshot = () => {
    const video = videoRef.current;
    if(!hasBook || !bookBbox || !video) return;

    // 감지된 book 객체의 바운딩 박스 위치, 크기 
    const [x, y, width, height] = bookBbox;

    // crop할 영역의 좌표와 크기 (혹여라도 프레임 밖을 벗어났을 경우 대비)
    const sx = Math.max(0, x);
    const sy = Math.max(0, y);
    const sw = Math.max(1, width);
    const sh = Math.max(1, height);

    // 현재 웹캠(video)의 위의 영역을 가상의 canvas에 그리기 
    // - 가상 Canvas 요소 생성 (크기는 crop할 크기만큼)
    const sCanvas = document.createElement("canvas");
    sCanvas.width = sw;
    sCanvas.height = sh;
    // - 해당 요소에 그리기 위해 2d Context 얻기 
    const sCtx = sCanvas.getContext("2d"); 
    // - drawImage를 활용하여 그리기
    sCtx?.drawImage(
      // 어떤 소스를 그릴껀지: video의 위치 (sx, sy) 크기 (sw, sh) 영역
      video,           
      sx, sy, sw, sh, 
      // sCtx의 어디에 그려낼껀지: 좌표 (0, 0) 크기 (sw, sh) 영역
      0, 0, sw, sh
    );

    // 가상의 canvas에 그려진 이미지를 Blob 형태로 변환하여 파일로 저장 
    sCanvas.toBlob( // toBlob: canvas 요소의 이미지를 Blob 형태로 변환하는 메서드
      // - 변환된 Blob 형태의 파일을 처리할 콜백 함수
      (blob) => {
        if(!blob) return;
        const filename = `book-capture-${Date.now()}.png`;
        const objectUrl = URL.createObjectURL(blob);
        setCapturedFiles((prev) => [
          ...prev,
          { id: Date.now(), blob, filename, objectUrl },
        ]);
      }, 
      // - 파일 형식
      "image/png", 
      // - 파일 품질 (0.0 ~ 1.0)
      0.92
    );

  }

  const removeCaptured = (id: number) => {
    setCapturedFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item) URL.revokeObjectURL(item.objectUrl);
      return prev.filter((f) => f.id !== id);
    });
  };


  // error 상태일 경우 
  if (status === "error") {
    return (
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
          <p className="font-medium">오류</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            type="button"
            onClick={startCamera}
            className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="mb-2 text-lg font-semibold text-zinc-800 dark:text-zinc-100">
        웹캠 연결 + 감지 결과 바운딩 박스 & 라벨 그리기 (Canvas API 활용)
      </h2>
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        getUserMedia · COCO-SSD · Canvas API 활용
      </p>

      <div className="relative mb-4 overflow-hidden rounded-lg bg-zinc-900">
        <video ref={videoRef} className="w-full h-full" />
        {/* 1. 투명한 Canvas를 video 위에 겹치기 */}
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none" />
      </div>

      {/* book 감지 시에만 활성화되는 캡처 버튼 */}
      {status === "ready" && (
        <div className="mb-4">
          <button
            type="button"
            onClick={captureScreenshot}
            disabled={!hasBook}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none dark:bg-emerald-700 dark:hover:bg-emerald-600"
          >스크린샷 캡처</button>
        </div>
      )}

      {/* 캡처된 파일 목록: 미리보기 + 다운로드 + 삭제 */}
      {capturedFiles.length > 0 && (
        <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800/50">
          <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            캡처된 파일 (다운로드 또는 FormData 로 서버 전송 가능)
          </p>
          <ul className="flex flex-wrap gap-3">
            {capturedFiles.map((f) => (
              <li
                key={f.id}
                className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-600 dark:bg-zinc-800"
              >
                <img
                  src={f.objectUrl}
                  alt={f.filename}
                  className="h-20 w-auto rounded object-contain"
                />
                <a
                  href={f.objectUrl}
                  download={f.filename}
                  className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  다운로드
                </a>
                <button
                  type="button"
                  onClick={() => removeCaptured(f.id)}
                  className="text-xs text-zinc-500 hover:text-red-600 dark:hover:text-zinc-400 dark:hover:text-red-400"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            서버 전송 예: formData.append(&quot;file&quot;, blob, filename)
          </p>
        </div>
      )}

      {/* idle 상태일 경우 === 웹캠실행 전 & 모델로딩 전 */}
      {status === "idle" && (
        <button
          type="button"
          onClick={startCamera}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
        >
          웹캠 켜기
        </button>
      )}

      {/* loading 상태일 경우 === 모델로딩 & 웹캠스트림 연결 중 */}
      {status === "loading" && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          모델 로딩 및 웹캠 연결 중…
        </p>
      )}
    </div>
  );
}