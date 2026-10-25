import { createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token");
  if (!token || token.length > 128) return new Response("Unauthorized", { status: 401 });
  const order = await prisma.order.findUnique({
    where: { id },
    select: { trackingTokenHash: true },
  });
  const presentedHash = createHash("sha256").update(token).digest();
  const expectedHash = order ? Buffer.from(order.trackingTokenHash, "hex") : Buffer.alloc(32);
  if (!order || !timingSafeEqual(presentedHash, expectedHash)) return new Response("Not found", { status: 404 });

  const encoder = new TextEncoder();
  let interval: ReturnType<typeof setInterval>;
  const stream = new ReadableStream({
    start(controller) {
      const sendStatus = async () => {
        try {
          const current = await prisma.order.findUnique({
            where: { id },
            select: { status: true, updatedAt: true },
          });
          if (!current) {
            controller.close();
            clearInterval(interval);
            return;
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(current)}\n\n`));
          if (current.status === "SERVED" || current.status === "CANCELLED") {
            controller.close();
            clearInterval(interval);
          }
        } catch (error) {
          console.error("Order status stream failed", error);
          controller.error(error);
          clearInterval(interval);
        }
      };
      void sendStatus();
      interval = setInterval(() => void sendStatus(), 2500);
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try { controller.close(); } catch { /* The client may already have disconnected. */ }
      }, { once: true });
    },
    cancel() {
      clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
