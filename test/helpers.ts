import {existsSync, readFileSync} from "node:fs";
import {resolve} from "node:path";

// compiled tests live in dist/test/..., the fixtures in <repo>/data
export const dataDir = resolve(__dirname, "../../data");

export function fixture(name: string): string {
    return resolve(dataDir, name);
}

export async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
    }

    return Buffer.concat(chunks);
}

/**
 * Width and height from the IHDR chunk of a png
 */
export function pngSize(png: Buffer): {width: number, height: number} {
    if (png.subarray(1, 4).toString("ascii") !== "PNG") {
        throw new Error("not a png");
    }

    return {width: png.readUInt32BE(16), height: png.readUInt32BE(20)};
}

/**
 * Finds a Chromium/Chrome binary to run the renderer tests with (PUPPETEER_EXECUTABLE_PATH wins)
 */
export function findChromium(): string | null {
    const candidates = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/usr/bin/google-chrome",
    ];

    return candidates.find((c): c is string => !!c && existsSync(c)) ?? null;
}

export function readFixture(name: string): Buffer {
    return readFileSync(fixture(name));
}
