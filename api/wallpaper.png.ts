import { ImageResponse } from "@vercel/og";
import React from "react";

export const config = {
  runtime: "edge"
};

const h = React.createElement;

const TOTAL_WEEKS = 12;
const REVIEW_WEEKS = 1;
const DAYS_PER_WEEK = 7;
const TOTAL_DAYS = TOTAL_WEEKS * DAYS_PER_WEEK;
const TOTAL_ROWS = TOTAL_WEEKS + REVIEW_WEEKS;

const MODEL_SIZE: Record<string, { width: number; height: number }> = {
  "iphone-12": { width: 1170, height: 2532 },
  "iphone-13": { width: 1170, height: 2532 },
  "iphone-14": { width: 1170, height: 2532 },
  "iphone-15": { width: 1179, height: 2556 },
  "iphone-16": { width: 1179, height: 2556 },
  "iphone-17": { width: 1179, height: 2556 }
};

function toISO(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonday(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, n: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function fmt(date: Date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function dotColor(iso: string, todayISO: string) {
  if (iso < todayISO) return "#f4f4f4";
  if (iso === todayISO) return "#ff7f39";
  return "#3d4046";
}

export default function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const startParam = searchParams.get("start") || "";
  const titleParam = (searchParams.get("title") || "").trim();
  const modelParam = searchParams.get("model") || "iphone-15";
  const model = MODEL_SIZE[modelParam] ? modelParam : "iphone-15";
  const size = MODEL_SIZE[model];

  const startISO = /^\d{4}-\d{2}-\d{2}$/.test(startParam)
    ? startParam
    : toISO(getMonday(new Date()));

  const start = new Date(`${startISO}T00:00:00`);
  const end = addDays(start, TOTAL_DAYS - 1);
  const todayISO = toISO(new Date());

  const elapsed = Math.min(
    TOTAL_DAYS,
    Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000) + 1)
  );
  const left = TOTAL_DAYS - elapsed;
  const percent = Math.round((elapsed / TOTAL_DAYS) * 100);
  const title = titleParam || `${start.getFullYear()} · 12 Week Season`;

  const rows = Array.from({ length: TOTAL_ROWS }).map((_, rowIndex) => {
    const isReview = rowIndex === TOTAL_WEEKS;

    const dots = Array.from({ length: DAYS_PER_WEEK }).map((__, colIndex) => {
      const date = addDays(start, rowIndex * DAYS_PER_WEEK + colIndex);
      const iso = toISO(date);
      return h("div", {
        key: `d-${rowIndex}-${colIndex}`,
        style: {
          width: 26,
          height: 26,
          borderRadius: 9999,
          background: dotColor(iso, todayISO),
          display: "flex"
        }
      });
    });

    const label = h(
      "div",
      {
        style: {
          width: 56,
          textAlign: "right",
          color: isReview ? "#7ee089" : "#6f747d",
          fontSize: 22,
          letterSpacing: 0.4,
          display: "flex"
        }
      },
      isReview ? "R" : `W${rowIndex + 1}`
    );

    const dotLine = h(
      "div",
      { style: { display: "flex", gap: 20 } },
      ...dots
    );

    return h(
      "div",
      {
        key: `r-${rowIndex}`,
        style: {
          display: "flex",
          alignItems: "center",
          gap: 20,
          opacity: isReview ? 0.82 : 1,
          marginTop: isReview ? 8 : 0,
          paddingTop: isReview ? 8 : 0,
          borderTop: isReview ? "1px dashed rgba(126,224,137,0.35)" : "none"
        }
      },
      label,
      dotLine
    );
  });

  const app = h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        background: "#0f1013",
        color: "#fafafa",
        fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
      }
    },
    h("div", { style: { height: size.height * 0.42 } }),
    h(
      "div",
      { style: { fontSize: 54, color: "#d8dde5", marginBottom: 14, display: "flex" } },
      title
    ),
    h(
      "div",
      { style: { fontSize: 32, color: "#8a8f98", marginBottom: 30, display: "flex" } },
      `${fmt(start)} - ${fmt(end)}`
    ),
    h("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, ...rows),
    h(
      "div",
      { style: { marginTop: 42, color: "#ff8a47", fontSize: 44, display: "flex" } },
      `${left}d left · ${percent}%`
    )
  );

  return new ImageResponse(app, {
    width: size.width,
    height: size.height
  });
}
