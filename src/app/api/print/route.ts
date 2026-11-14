import { NextResponse } from "next/server";
import net from "net";

export const dynamic = "force-dynamic";

// POST /api/print - Send ESC/POS payload to Network/LAN Thermal Printer
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      base64Buffer,
      ipAddress = "192.168.1.100",
      port = 9100,
      timeoutMs = 4000,
      isKickDrawer = false,
    } = body;

    if (!base64Buffer && !isKickDrawer) {
      return NextResponse.json({ error: "Missing print buffer" }, { status: 400 });
    }

    // Convert base64 buffer to raw binary
    const binaryData = base64Buffer
      ? Buffer.from(base64Buffer, "base64")
      : Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]); // ESC p 0 25 250 kick drawer

    // Send over raw TCP socket to Thermal Receipt Printer
    const result = await new Promise<{ success: boolean; message: string }>((resolve, reject) => {
      const client = new net.Socket();
      client.setTimeout(timeoutMs);

      client.connect(port, ipAddress, () => {
        client.write(binaryData, () => {
          client.end();
          resolve({
            success: true,
            message: `Sent ${binaryData.length} bytes to printer at ${ipAddress}:${port}`,
          });
        });
      });

      client.on("timeout", () => {
        client.destroy();
        reject(new Error(`Connection to printer at ${ipAddress}:${port} timed out (${timeoutMs}ms)`));
      });

      client.on("error", (err) => {
        client.destroy();
        reject(err);
      });
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Printer communication failed";
    console.error("[Printer TCP Error]:", errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        hint: "Check that printer IP is reachable on local network and port 9100 is open",
      },
      { status: 502 }
    );
  }
}

