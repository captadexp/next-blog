import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export function GET(request: NextRequest): void {
    const url = new URL(request.url);
    redirect(`${url.pathname}/dashboard`);
}
