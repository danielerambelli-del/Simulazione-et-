/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { estimatePersonAge, generateAgeImage } from './services/geminiService';
import { createVideoFromImages } from './lib/videoUtils';
import PolaroidCard from './components/PolaroidCard';
import ImageViewer from './components/ImageViewer';
import AgeSlider from './components/AgeSlider';
import Footer from './components/Footer';
import VideoPlayerModal from './components/VideoPlayerModal';

type AppState = 'idle' | 'estimating' | 'interactive' | 'error';

const primaryButtonClasses = "font-permanent-marker text-xl text-center text-black bg-yellow-400 py-3 px-8 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:-rotate-2 hover:bg-yellow-300 shadow-[2px_2px_0px_2px_rgba(0,0,0,0.2)]";
const secondaryButtonClasses = "font-permanent-marker text-xl text-center text-white bg-white/10 backdrop-blur-sm border-2 border-white/80 py-3 px-8 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:rotate-2 hover:bg-white hover:text-black";

// A simple debounce hook
const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};


function App() {
    const [appState, setAppState] = useState<AppState>('idle');
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [displayImage, setDisplayImage] = useState<string | null>(null);
    const [estimatedAge, setEstimatedAge] = useState<number | null>(null);
    const [targetAge, setTargetAge] = useState<number>(0);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [isVideoGenerating, setIsVideoGenerating] = useState<boolean>(false);
    const [videoGenerationMessage, setVideoGenerationMessage] = useState<string>('');
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [showVideoModal, setShowVideoModal] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    
    const debouncedTargetAge = useDebounce(targetAge, 500);

    const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = async () => {
                const imageDataUrl = reader.result as string;
                setUploadedImage(imageDataUrl);
                setDisplayImage(imageDataUrl);
                setAppState('estimating');
                setErrorMessage('');
                try {
                    const age = await estimatePersonAge(imageDataUrl);
                    setEstimatedAge(age);
                    setTargetAge(age);
                    setAppState('interactive');
                } catch (err) {
                    const message = err instanceof Error ? err.message : "An unknown error occurred.";
                    console.error("Failed to estimate age:", err);
                    setErrorMessage(`Could not estimate age: ${message}. Please try a different photo.`);
                    setAppState('error');
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const generateNewAgeImage = useCallback(async (newAge: number) => {
        if (!uploadedImage || !estimatedAge || newAge === estimatedAge) {
            setDisplayImage(uploadedImage); // Revert to original if slider is at estimated age
            return;
        };
        
        setIsGenerating(true);
        setErrorMessage('');
        
        try {
            const currentYear = new Date().getFullYear();
            const birthYear = currentYear - estimatedAge;
            const targetYear = birthYear + newAge;

            const prompt = `Reimagine the person in the original photo at the age of ${newAge}. The photo should look like it was taken in the year ${targetYear}, with era-appropriate clothing, hairstyle, background, and photo quality (e.g., black and white for early years, film grain for mid-century, digital for modern times). Preserve the person's core identity. The output must be a photorealistic image.`;
            
            const resultUrl = await generateAgeImage(uploadedImage, prompt);
            setDisplayImage(resultUrl);
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            console.error(`Failed to generate image for age ${newAge}:`, err);
            setErrorMessage(`Failed to generate image. ${message}`);
            // Don't change app state, just show error message.
        } finally {
            setIsGenerating(false);
        }
    }, [uploadedImage, estimatedAge]);

    useEffect(() => {
        if (appState === 'interactive' && debouncedTargetAge !== estimatedAge) {
            generateNewAgeImage(debouncedTargetAge);
        } else if (appState === 'interactive' && debouncedTargetAge === estimatedAge) {
            setDisplayImage(uploadedImage); // Ensure original image is shown when at estimated age
        }
    }, [debouncedTargetAge, appState, estimatedAge, generateNewAgeImage, uploadedImage]);


    const handleReset = () => {
        setAppState('idle');
        setUploadedImage(null);
        setDisplayImage(null);
        setEstimatedAge(null);
        setTargetAge(0);
        setIsGenerating(false);
        setIsVideoGenerating(false);
        setVideoGenerationMessage('');
        setGeneratedVideoUrl(null);
        setShowVideoModal(false);
        setErrorMessage('');
    };

    const handleDownload = () => {
        if (displayImage) {
            const link = document.createElement('a');
            link.href = displayImage;
            const ageString = targetAge === estimatedAge ? 'original' : `age-${targetAge}`;
            link.download = `age-voyager-${ageString}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleCreateVideo = async () => {
        if (!uploadedImage || !estimatedAge) return;
    
        setIsVideoGenerating(true);
        setErrorMessage('');
        setGeneratedVideoUrl(null);
    
        const generatedFrames: { age: number; url: string }[] = [];
        // Generate 20 frames for a smooth video, from age 1 to 100
        const agesToGenerate = Array.from({length: 20}, (_, i) => Math.round(1 + i * (99 / 19)));
        
        try {
            const currentYear = new Date().getFullYear();
            const birthYear = currentYear - estimatedAge;
    
            for (let i = 0; i < agesToGenerate.length; i++) {
                const age = agesToGenerate[i];
                
                setVideoGenerationMessage(`Generating frame ${i + 1}/${agesToGenerate.length} (age ${age})...`);
                
                let frameUrl: string;
                // Use the original uploaded image if the target age is the same as the estimated age
                if (age === estimatedAge) {
                    frameUrl = uploadedImage;
                } else {
                    const targetYear = birthYear + age;
                    const prompt = `Reimagine the person in the original photo at the age of ${age}. The photo should look like it was taken in the year ${targetYear}, with era-appropriate clothing, hairstyle, background, and photo quality. Preserve the person's core identity. The output must be a photorealistic image.`;
                    frameUrl = await generateAgeImage(uploadedImage, prompt);
                }
                generatedFrames.push({ age, url: frameUrl });
            }
    
            // Sort frames by age to ensure correct order
            generatedFrames.sort((a, b) => a.age - b.age);
            const imageUrls = generatedFrames.map(frame => frame.url);
    
            setVideoGenerationMessage("Compiling frames into video...");
    
            const videoUrl = await createVideoFromImages(
                imageUrls,
                500, // 500ms per frame
                (message) => setVideoGenerationMessage(message)
            );
    
            setGeneratedVideoUrl(videoUrl);
            setShowVideoModal(true);
    
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            console.error("Failed to generate video:", err);
            setErrorMessage(`Failed to create video. ${message}`);
        } finally {
            setIsVideoGenerating(false);
            setVideoGenerationMessage('');
        }
    };

    const handleCloseModal = () => {
        setShowVideoModal(false);
        // We don't null out generatedVideoUrl here so it can be reopened if needed,
        // but it will be cleared on reset.
    }


    const renderContent = () => {
        const isBusy = isGenerating || isVideoGenerating;
        switch(appState) {
            case 'idle':
                return (
                    <motion.div
                         initial={{ opacity: 0, scale: 0.8 }}
                         animate={{ opacity: 1, scale: 1 }}
                         transition={{ duration: 0.8, type: 'spring' }}
                         className="flex flex-col items-center"
                    >
                        <label htmlFor="file-upload" className="cursor-pointer group transform hover:scale-105 transition-transform duration-300">
                             <PolaroidCard 
                                 caption="Click to begin"
                                 status="done"
                             />
                        </label>
                        <input id="file-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} />
                        <p className="mt-8 font-permanent-marker text-neutral-500 text-center max-w-xs text-lg">
                            Upload a clear photo of a person to start your journey through time.
                        </p>
                    </motion.div>
                );
            case 'estimating':
                return (
                    <div className="flex flex-col items-center text-center gap-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <ImageViewer imageUrl={displayImage} isLoading={true} altText="Uploaded photo" />
                        </motion.div>
                        <p className="font-permanent-marker text-2xl animate-pulse">Calibrating time machine...</p>
                        <p className="text-neutral-400">Estimating age to anchor the timeline.</p>
                    </div>
                );
            case 'interactive':
                return (
                     <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-6">
                        <ImageViewer imageUrl={displayImage} isLoading={isGenerating} altText={`Person at age ${targetAge}`} />
                        {estimatedAge && (
                             <AgeSlider 
                                value={targetAge}
                                onChange={(e) => setTargetAge(parseInt(e.target.value, 10))}
                                min={1}
                                max={100}
                                estimatedAge={estimatedAge}
                                disabled={isBusy}
                            />
                        )}
                        <div className="flex items-center gap-4 mt-2">
                             <button onClick={handleReset} className={secondaryButtonClasses} disabled={isBusy}>
                                Start Over
                            </button>
                            <button onClick={handleDownload} disabled={isBusy} className={`${primaryButtonClasses} disabled:opacity-50 disabled:cursor-not-allowed`}>
                                Download Image
                            </button>
                        </div>
                         <div className="mt-4 w-full px-4 max-w-xs">
                            <button 
                                onClick={handleCreateVideo} 
                                disabled={isBusy} 
                                className={`${primaryButtonClasses} disabled:opacity-50 disabled:cursor-not-allowed w-full`}
                            >
                                {isVideoGenerating ? videoGenerationMessage : 'Create Evolution Video'}
                            </button>
                        </div>
                         {errorMessage && <p className="text-red-400 mt-4 text-center">{errorMessage}</p>}
                     </div>
                );
            case 'error':
                 return (
                    <div className="flex flex-col items-center gap-6 text-center">
                        <p className="text-red-400 max-w-md">{errorMessage}</p>
                         <button onClick={handleReset} className={primaryButtonClasses}>
                            Try Again
                        </button>
                    </div>
                 );
        }
    };

    return (
        <main className="bg-black text-neutral-200 min-h-screen w-full flex flex-col items-center justify-center p-4 pb-24 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.05]"></div>
            
             <AnimatePresence>
                {showVideoModal && generatedVideoUrl && (
                    <VideoPlayerModal 
                        videoUrl={generatedVideoUrl}
                        onClose={handleCloseModal}
                    />
                )}
            </AnimatePresence>

            <div className="z-10 flex flex-col items-center justify-center w-full h-full flex-1">
                <div className="text-center mb-10">
                    <h1 className="text-6xl md:text-8xl font-caveat font-bold text-neutral-100">Age Voyager</h1>
                    <p className="font-permanent-marker text-neutral-300 mt-2 text-xl tracking-wide">See yourself at any age from 1 to 100.</p>
                </div>
                
                <AnimatePresence mode="wait">
                    <motion.div
                        key={appState}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="w-full flex justify-center"
                    >
                        {renderContent()}
                    </motion.div>
                </AnimatePresence>
            </div>
            <Footer />
        </main>
    );
}

export default App;