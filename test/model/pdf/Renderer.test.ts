import {assert} from "chai";
import {PDFDocument} from "pdf-lib";
import Renderer from "../../../src/model/pdf/Renderer";
import {findChromium, readFixture, streamToBuffer} from "../../helpers";

describe("Renderer", function() {

    const chromium = findChromium();

    before(function() {
        if (chromium === null) {
            this.skip(); // no Chromium available, set PUPPETEER_EXECUTABLE_PATH
        }
    });

    it("render should generate an A4 pdf by default", async () => {
        const renderer = new Renderer(chromium!);

        const pdf = await streamToBuffer(await renderer.renderFromFile(readFixture("file.html").toString(), {}));

        assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
        const page = (await PDFDocument.load(pdf)).getPage(0);
        assert.approximately(page.getWidth(), 595, 2);
        assert.approximately(page.getHeight(), 842, 2);
    });

    it("render should merge custom options over the defaults", async () => {
        const renderer = new Renderer(chromium!);

        const pdf = await streamToBuffer(await renderer.renderFromFile("<p>ahoj</p>", {format: "A5", landscape: true}));

        const page = (await PDFDocument.load(pdf)).getPage(0);
        assert.approximately(page.getWidth(), 595, 2);
        assert.approximately(page.getHeight(), 420, 2);
    });

    it("render should fail on an unknown paper format", async () => {
        const renderer = new Renderer(chromium!);

        try {
            await renderer.renderFromFile("<p>x</p>", {format: "XX"});
            assert.fail("render should throw");
        } catch (e) {
            assert.match((e as Error).message, /Unknown paper format/);
        }
    });

});
