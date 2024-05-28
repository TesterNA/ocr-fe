import LensCore, { LensResult, LensError, Segment, BoundingBox } from './core.js';

export { LensResult, LensError, Segment, BoundingBox };

export default class Lens extends LensCore {
    constructor(config = {}) {
        if (typeof config !== 'object') {
            console.warn('Lens constructor expects an object, got', typeof config);
            config = {};
        }
        super(config);
    }

    // async scanByFile(path) {
    //     const file = await readFile(path);
    //
    //     return this.scanByBuffer(file);
    // }

    async scanByBuffer(buffer, dimensions) {
        let uint8Array = Uint8Array.from(buffer);

        return this.scanByData(uint8Array, 'image/png', [dimensions.width, dimensions.height]);
    }

    // async scanByURL(url) {
    //     const response = await fetch(url);
    //     const buffer = await response.arrayBuffer();
    //
    //     return this.scanByBuffer(Buffer.from(buffer));
    // }
}
