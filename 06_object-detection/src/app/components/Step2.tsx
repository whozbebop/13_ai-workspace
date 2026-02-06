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

export default function Step2() {

  // 초기상태 => 모델 및 웹캠 준비중 상태 => 모델 및 웹캠 준비완료 상태, 에러상태
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  // 에러 메세지 
  const [error, setError] = useState<string>("");

  // 감지된 객체 목록
  const [detections, setDetections] = useState<DetectedObject[]>([]);

  // 모델 참조 
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);

  // 비디오 요소(<video/>) 참조
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // requestAnimationFrame 루프 참조
  const rafRef = useRef<number>(0);


  // 웹캠 켜기 버튼 클릭시 실행되는 함수 => 모델 로딩 및 웹캠 스트림 연결 
  const startCamera = async () => {
    setStatus("loading");
    setError("");

    try {
      // 1) 모델 준비 
      modelRef.current = await cocoSsd.load();
      // 2) 웹캠 스트림 연결 
      // - 사용자의 카메라(웹캠) 스트림 객체 생성
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      })
      // - 출력시키기 위해 video 요소에 스트림 연결
      const video = videoRef.current;
      if(!video) return;
      video.srcObject = stream; // 비디오 소스로 스트림 지정
      // - 메타데이터 로드시 비디오 재생
      video.onloadedmetadata = () => {
        video.play();
        setStatus("ready");
      }

    }catch(error){
      setError(error instanceof Error ? error.message : '웹캠 또는 모델 로드 실패');
      setStatus("error");
    }
  }

  // 컴포넌트 언마운트시: 웹캠 스트림 자원 반납, 모델 리소스 반납
  useEffect(() => {
    return () => {
      // - 웹캠 스트림 자원 반납(카메라 끄기)
      if(videoRef.current?.srcObject){
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
      // - 모델 리소스 해제
      if(modelRef.current){
        modelRef.current.dispose();
        modelRef.current = null;
      }
    }
  }, []);

  // 실시간 객체 탐지 
  // - 매 프레임마다 model.detect(video)를 통해 객체 감지 결과 획득
  // - requestAnimationFrame 루프 함수 활용
  useEffect(() => {
    const model = modelRef.current;
    const video = videoRef.current;
    if(status !== "ready" || !model || !video) return;

    // 매 프레임마다 반복적으로 수행할 함수 
    const detectFrame = async () => {

      try{
        const detections = await model.detect(video, 20, 0.5); // [{bbox, class, score}, {}, ..]
        setDetections(detections);
      }catch(error){
        // 한 프레임이 실패해도 루프 유지
      }
      rafRef.current = requestAnimationFrame(detectFrame); // 그 다음 프레임 그릴때 예약 (루프)
    }
    rafRef.current = requestAnimationFrame(detectFrame); // 최초의 프레임 그릴때 예약

    // status 변경시 또는 언마운트시: 감지루프 종료 (마지막 예약 함수 없애기)
    return () => {
      if(rafRef.current)
        cancelAnimationFrame(rafRef.current);
    }

  }, [status])



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
        웹캠 연결 + 감지 결과 확인
      </h2>
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        getUserMedia · COCO-SSD · 감지 데이터만 텍스트로 표시 
      </p>

      <div className="relative mb-4 overflow-hidden rounded-lg bg-zinc-900">
        {/* 웹캠 영상 */}
        <video ref={videoRef} className="w-full h-full" />
      </div>

      {/* 감지된 객체를 텍스트로 표시 (class, score) */}
      {status === "ready" && (
        <div className="mb-4 min-h-[4rem] rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800/50">
          <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            현재 감지된 객체 (class, score)
          </p>
          {detections.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              감지 중…
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {detections.map((obj, i) => (
                <li
                  key={`${obj.class}-${i}`}
                  className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                >
                  {obj.class} {(obj.score * 100).toFixed(0)}%
                </li>
              ))}
            </ul>
          )}
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