/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion } from 'framer-motion';

interface VideoPlayerModalProps {
    videoUrl: string;
    onClose: () => void;
}

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ videoUrl, onClose }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={onClose} // Close on backdrop click
        >
            <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 20 }}
                transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                className="relative bg-neutral-900 rounded-lg shadow-2xl w-full max-w-2xl aspect-video overflow-hidden border border-white/10"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the video player itself
            >
                <video
                    src={videoUrl}
                    className="w-full h-full"
                    controls
                    autoPlay
                    loop
                    playsInline
                />
                 <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-white bg-black/50 rounded-full p-2 hover:bg-black/80 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    aria-label="Close video player"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </motion.div>
        </motion.div>
    );
};

export default VideoPlayerModal;