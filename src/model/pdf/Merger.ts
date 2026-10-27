import {readFile} from "node:fs/promises";
import {Readable} from "node:stream";
import {PDFDocument} from "pdf-lib";
import IMerger from "./IMerger";

export default class Merger implements IMerger {

    public async merge(pdfs: string[]): Promise<Readable> {
        if (pdfs.length === 0) {
            throw new Error("No files were submitted for merging.");
        }

        // A single file is returned unchanged (byte for byte), as the former pdf-merge library did.
        if (pdfs.length === 1) {
            return Readable.from([await readFile(pdfs[0])]);
        }

        const merged = await PDFDocument.create();
        for (const path of pdfs) {
            const doc = await this.load(path);
            const pages = await merged.copyPages(doc, doc.getPageIndices());
            pages.forEach((page) => merged.addPage(page));
        }

        return Readable.from([Buffer.from(await merged.save())]);
    }

    private async load(path: string): Promise<PDFDocument> {
        try {
            return await PDFDocument.load(await readFile(path));
        } catch (e) {
            throw new Error(`Failed to merge pdf files: ${(e as Error).message}`, {cause: e});
        }
    }

}
