import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";

const authMiddleware = auth.middleware({
  loginUrl: "/auth/sign-in",
});

export default function proxy(request: NextRequest) {
  // Server Actions enforce their own session checks in the action/API layer.
  if (request.headers.has("Next-Action")) {
    return NextResponse.next();
  }

  return authMiddleware(request);
}

export const config = {
  matcher: ["/"],
};
