"use client";
import React, { useEffect, useRef, useCallback } from "react";

export const DraggableWindow: React.FC<{
  title: string;
  children: React.ReactNode;
  randoTranslate?: boolean;
  style?: React.CSSProperties;
}> = ({ title, children, randoTranslate = true, style = {} }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const titleBarRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (randoTranslate) {
      const randomX = Math.floor(Math.random() * 151) - 75; // -75 to 75
      const randomY = Math.floor(Math.random() * 151) - 75; // -75 to 75
      positionRef.current = { x: randomX, y: randomY };
      if (elementRef.current) {
        elementRef.current.style.transform = `translate(${randomX}px, ${randomY}px)`;
      }
    }
  }, [randoTranslate]);

  useEffect(() => {
    if (randoTranslate) {
      const intervalId = setInterval(() => {
        if (elementRef.current) {
          elementRef.current.style.zIndex = String(Math.floor(Math.random() * 9000) + 9000);
        }
      }, 3000);
      return () => clearInterval(intervalId);
    }
  }, [randoTranslate]);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    startPosRef.current = { x: clientX - positionRef.current.x, y: clientY - positionRef.current.y };
    if (titleBarRef.current) {
      titleBarRef.current.style.cursor = "grabbing";
    }
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;
    const newX = clientX - startPosRef.current.x;
    const newY = clientY - startPosRef.current.y;
    positionRef.current = { x: newX, y: newY };
    if (elementRef.current) {
      elementRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
    }
  }, []);

  const handleEnd = useCallback(() => {
    isDraggingRef.current = false;
    if (titleBarRef.current) {
      titleBarRef.current.style.cursor = "grab";
    }
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === titleBarRef.current || titleBarRef.current?.contains(e.target as Node)) {
        handleStart(e.clientX, e.clientY);
      }
    },
    [handleStart]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    },
    [handleMove]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.target === titleBarRef.current || titleBarRef.current?.contains(e.target as Node)) {
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY);
      }
    },
    [handleStart]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    },
    [handleMove]
  );

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [handleMouseMove, handleTouchMove, handleEnd]);

  return (
    <div
      ref={elementRef}
      className="window"
      style={{
        userSelect: "none",
        width: "fit-content",
        ...style,
      }}
    >
      <div
        ref={titleBarRef}
        className="title-bar"
        style={{
          cursor: "grab",
          touchAction: "none",
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="title-bar-text">{title}</div>
      </div>
      <div className="window-body" style={{ touchAction: "auto" }}>
        {children}
      </div>
    </div>
  );
};