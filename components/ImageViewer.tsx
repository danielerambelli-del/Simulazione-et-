/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageViewerProps {
    imageUrl: string | null;
    isLoading: boolean;
    altText: string;
}

const LoadingSpinner = () => (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
        <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

const ImageViewer: React.FC<ImageViewerProps> = ({ imageUrl, isLoading, altText }) => {
    return (
        <div className="relative w-full max-w-lg aspect-square rounded-lg shadow-2xl overflow-hidden bg-neutral-900 flex items-center justify-center">
            <AnimatePresence>
                {isLoading && (
                     <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                     >
                        <LoadingSpinner />
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence mode="wait">
                 {imageUrl && (
                    <motion.img
                        key={imageUrl} // This makes framer-motion treat image changes as new elements
                        src={imageUrl}
                        alt={altText}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.4, ease: 'easeInOut' }}
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default ImageViewer;
