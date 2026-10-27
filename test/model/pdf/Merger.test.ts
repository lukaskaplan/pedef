import {assert} from "chai";
import {PDFDocument} from "pdf-lib";
import Merger from "../../../src/model/pdf/Merger";
import {fixture, readFixture, streamToBuffer} from "../../helpers";

describe("Merger", () => {

    it("merge should concat multiple files together", async () => {
        const merger = new Merger();

        const pdfStream = await merger.merge([fixture("single-page.pdf"), fixture("multi-page.pdf")]);
        const pdf = await streamToBuffer(pdfStream);

        assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
        const doc = await PDFDocument.load(pdf);
        assert.equal(doc.getPageCount(), 7);
    });

    it("merge of a single file returns it unchanged", async () => {
        const merger = new Merger();

        const out = await streamToBuffer(await merger.merge([fixture("multi-page.pdf")]));

        assert.isTrue(out.equals(readFixture("multi-page.pdf")));
    });

    it("merge fails on a file that is not a pdf", async () => {
        const notPdf = fixture("not-a-pdf.txt");
        const merger = new Merger();

        try {
            await merger.merge([fixture("single-page.pdf"), notPdf]);
            assert.fail("merge should throw");
        } catch (e) {
            assert.match((e as Error).message, /^Failed to merge pdf files/);
        }
    });

});
