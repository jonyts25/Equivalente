import { NextResponse } from "next/server";

const JSON_UTF8 = "application/json; charset=utf-8";

/** JSON response with explicit UTF-8 charset (Node/Next already encode strings as UTF-8). */
export function jsonUtf8<T>(data: T, init?: ResponseInit): NextResponse<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", JSON_UTF8);
  return NextResponse.json(data, { ...init, headers });
}

export const JSON_UTF8_CONTENT_TYPE = JSON_UTF8;
