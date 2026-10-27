export const port: number = parseInt(process.env.PORT ?? "", 10) || 8081;

// Chromium binary used by puppeteer-core. The Docker image ships Debian's "chromium" package.
export const chromiumPath: string = process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium";
