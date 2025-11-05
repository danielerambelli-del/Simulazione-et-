/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * Creates a video from a sequence of image data URLs using the Canvas and MediaRecorder APIs.
 * @param imageUrls An array of image data URLs.
 * @param frameDurationMs The duration each frame should be displayed in milliseconds.
 * @param onProgress A callback function to report progress messages.
 * @returns A promise that resolves with a local URL (blob URL) for the generated video.
 */
export async function createVideoFromImages(
    imageUrls: string[],
    frameDurationMs: number,
    onProgress: (message: string) => void
): Promise<string> {
    if (!imageUrls || imageUrls.length === 0) {
        throw new Error("Image URLs array cannot be empty.");
    }

    onProgress("Initializing video encoder...");

    const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(new Error(`Failed to load image: ${src.substring(0, 50)}...`));
            img.src = src;
        });
    };

    const firstImage = await loadImage(imageUrls[0]);
    const { width, height } = firstImage;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error("Could not create canvas context.");
    }

    const stream = canvas.captureStream(30);
    const mimeType = 'video/webm; codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
        throw new Error(`${mimeType} is not supported on this browser.`);
    }
    const recorder = new MediaRecorder(stream, { mimeType });

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            chunks.push(e.data);
        }
    };

    const recorderStopped = new Promise<string>((resolve, reject) => {
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            resolve(URL.createObjectURL(blob));
        };
        recorder.onerror = (e) => {
            reject(new Error(`MediaRecorder error: ${e}`));
        };
    });

    recorder.start();

    for (let i = 0; i < imageUrls.length; i++) {
        onProgress(`Encoding frame ${i + 1} of ${imageUrls.length}...`);
        const image = i === 0 ? firstImage : await loadImage(imageUrls[i]);
        ctx.drawImage(image, 0, 0, width, height);
        await new Promise(resolve => setTimeout(resolve, frameDurationMs));
    }
    
    onProgress("Finalizing video...");
    recorder.stop();

    return recorderStopped;
}