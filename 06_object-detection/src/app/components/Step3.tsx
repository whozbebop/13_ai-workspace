"use client";

// 1. 웹캠 켜기(웹캠 스트림 연결): navigator.mediaDevice.getUserMedia 활용 
// 2. 실시간 웹캠 프레임처리: requestAnimationFrame 루프 함수 활용 
//     => 실시간 객체 탐지 결과 처리

import { useEffect, useRef, useState } from "react";
import "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

type DetectedObject = {
  bbox: [number, number, number, number];
  class: string;
  score: number;
};

export default function Step3() {

  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string>("");
  const [detections, setDetections] = useState<DetectedObject[]>([]);

  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);

  const startCamera = async () => {
    setStatus("loading");
    setError("");

    try {
      modelRef.current = await cocoSsd.load();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      })
      const video = videoRef.current;
      if(!video) return;
      video.srcObject = stream; 
      video.onloadedmetadata = () => {
        video.play();
        setStatus("ready");
      }

    }catch(error){
      setError(error instanceof Error ? error.message : '웹캠 또는 모델 로드 실패');
      setStatus("error");
    }
  }

  useEffect(() => {
    return () => {
      if(videoRef.current?.srcObject){
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
      if(modelRef.current){
        modelRef.current.dispose();
        modelRef.current = null;
      }
    }
  }, []);

  // 실시간 객체 탐지 
  useEffect(() => {
    const model = modelRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current; // +

    if(status !== "ready" || !model || !video || !canvas) return; // +

    // canvas 그리기 준비
    const ctx = canvas.getContext('2d');
    if(!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const detectFrame = async () => {

      try{
        const detections = await model.detect(video, 20, 0.5); // [{bbox, class, score}, {}, ..]
        setDetections(detections);

        // Canvas 활용해서 바운딩박스 & 라벨 그리기 -------------
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // 이전에 그린거 지우기 

        for(const detObj of detections){
          const [x, y, width, height] = detObj.bbox; // 바운딩박스 위치(x, y)와 크기(width, height)
          const label = `${detObj.class} ${(detObj.score * 100).toFixed(0)}%`; // 라벨텍스트 

          // 사각형 테두리 (바운딩박스)
          ctx.strokeStyle = "#00ff00";
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, width, height);

          // 라벨 박스 
          const textWidth = ctx.measureText(label).width; // 텍스트 가로길이 측정
          const padding = 4;
          ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
          ctx.fillRect(x, y - 24, textWidth + padding * 2, 24);

          // 라벨 텍스트 
          ctx.font = "14px sans-serif";
          ctx.fillStyle = "#000";
          ctx.fillText(label, x + padding, y - 8)
        }

        // ------------------------------------------------------

      }catch(error){
      }
      rafRef.current = requestAnimationFrame(detectFrame); 
    }
    rafRef.current = requestAnimationFrame(detectFrame);

    return () => {
      if(rafRef.current)
        cancelAnimationFrame(rafRef.current);
    }

  }, [status])


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
        웹캠 연결 + 감지 결과 확인 + 바운딩 박스 & 라벨 그리기
      </h2>
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        getUserMedia · COCO-SSD · 감지 데이터를 Canvas API 활용해서 바운딩 박스 그리기
      </p>

      <div className="relative mb-4 overflow-hidden rounded-lg bg-zinc-900">
        {/* 웹캠 영상 */}
        <video ref={videoRef} className="w-full h-full" />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      </div>

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