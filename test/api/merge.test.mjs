// POST /v1/pdf/merge  (multipart PDFs -> merged PDF, Content-Disposition: attachment; filename=merged.pdf;)
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { HAVE_PDFINFO, dataFile, isPdf, makePdf, parseErrorBody, pdfInfo, postMultipart, request } from "./helpers.mjs";

const SINGLE = dataFile("single-page.pdf"); // 1 page, A4
const MULTI = dataFile("multi-page.pdf"); // 6 pages, A4

function assertMergedPdf({ status, headers, body }) {
    assert.equal(status, 200, `expected 200, got ${status}: ${body.toString("utf8").slice(0, 300)}`);
    assert.match(headers.get("content-type") ?? "", /^application\/pdf\b/);
    // legacy sends exactly: attachment; filename=merged.pdf;
    assert.match(headers.get("content-disposition") ?? "", /^attachment;\s*filename="?merged\.pdf"?;?$/);
    assert.ok(isPdf(body), "body starts with %PDF-");
    return pdfInfo(body);
}

describe("POST /v1/pdf/merge - happy path", () => {
    test("single-page + multi-page -> 7 pages, attachment merged.pdf", async () => {
        const r = await postMultipart("/v1/pdf/merge", [
            { name: "file1", file: SINGLE },
            { name: "file2", file: MULTI },
        ]);
        assert.equal(assertMergedPdf(r).pages, 7);
    });

    test("trailing slash /v1/pdf/merge/ behaves the same", async () => {
        const r = await postMultipart("/v1/pdf/merge/", [
            { name: "file1", file: MULTI },
            { name: "file2", file: SINGLE },
        ]);
        assert.equal(assertMergedPdf(r).pages, 7);
    });

    test("three files, same field name repeated -> page count is the sum (1+6+2)", async () => {
        const r = await postMultipart("/v1/pdf/merge", [
            { name: "files", file: SINGLE },
            { name: "files", file: MULTI },
            { name: "files", file: makePdf({ width: 300, height: 200, pages: 2 }), filename: "gen.pdf" },
        ]);
        assert.equal(assertMergedPdf(r).pages, 9);
    });

    // needs pdfinfo: the JS fallback reports the first MediaBox in file order, not page 1
    test("upload order is preserved (first page comes from the first file)", { skip: !HAVE_PDFINFO && "pdfinfo not available" }, async () => {
        const land = makePdf({ width: 842, height: 595, pages: 2 });
        const r1 = await postMultipart("/v1/pdf/merge", [
            { name: "a", file: land, filename: "land.pdf" },
            { name: "b", file: SINGLE },
        ]);
        const i1 = assertMergedPdf(r1);
        assert.equal(i1.pages, 3);
        assert.ok(Math.abs(i1.width - 842) < 1 && Math.abs(i1.height - 595) < 1,
            `page 1 should be the 842x595 landscape page, got ${i1.width}x${i1.height}`);

        const r2 = await postMultipart("/v1/pdf/merge", [
            { name: "a", file: SINGLE },
            { name: "b", file: land, filename: "land.pdf" },
        ]);
        const i2 = assertMergedPdf(r2);
        assert.equal(i2.pages, 3);
        assert.ok(Math.abs(i2.width - 594.96) < 2 && Math.abs(i2.height - 841.92) < 2,
            `page 1 should be the A4 portrait page, got ${i2.width}x${i2.height}`);
    });

    // LEGACY QUIRK (contract as deployed): README says "At least 2 files are required" and
    // MergeHandler intends to throw "Please upload at least 2 files to merge.", but the check
    // is `files.len < 2` (undefined < 2 === false), so it never fires. A single file is
    // accepted and returned as a 1-page "merged" PDF with HTTP 200. Asserted as-is, because
    // existing clients may rely on it; changing it is an API change.
    test("a single file is accepted: 200, 1-page merged.pdf (legacy quirk)", async () => {
        const r = await postMultipart("/v1/pdf/merge", [{ name: "file1", file: SINGLE }]);
        assert.equal(assertMergedPdf(r).pages, 1);
    });
});

describe("POST /v1/pdf/merge - errors (HTTP 500 + {error})", () => {
    test("no file uploaded -> 'No files given'", async () => {
        const r = await postMultipart("/v1/pdf/merge", [{ name: "options", value: "{}" }]);
        assert.equal(r.status, 500);
        assert.deepEqual(parseErrorBody(r.body), { error: "No files given" });
    });

    test("POST without any body -> 'No files given' (trailing slash)", async () => {
        const r = await request("/v1/pdf/merge/", { method: "POST" });
        assert.equal(r.status, 500);
        assert.deepEqual(parseErrorBody(r.body), { error: "No files given" });
    });

    // legacy message is pdftk's raw stderr incl. the internal /tmp/upload_* paths - shape only
    test("non-PDF among the uploads -> 500 with an error message", async () => {
        const r = await postMultipart("/v1/pdf/merge", [
            { name: "a", file: dataFile("file.html") },
            { name: "b", file: SINGLE },
        ]);
        assert.equal(r.status, 500);
        const err = parseErrorBody(r.body);
        assert.equal(typeof err.error, "string");
        assert.ok(err.error.length > 0);
    });
});
