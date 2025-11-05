/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

interface AgeSliderProps {
    value: number;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    min: number;
    max: number;
    estimatedAge: number;
    disabled?: boolean;
}

const AgeSlider: React.FC<AgeSliderProps> = ({ value, onChange, min, max, estimatedAge, disabled = false }) => {
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - estimatedAge;
    const targetYear = birthYear + value;

    const progress = ((value - min) / (max - min)) * 100;
    const sliderBackground = `linear-gradient(to right, #fbbF24 ${progress}%, #404040 ${progress}%)`;

    return (
        <div className="w-full flex flex-col items-center gap-4 px-4">
            <div className="w-full flex justify-between items-baseline font-permanent-marker">
                 <div className="text-left">
                    <span className="text-3xl text-yellow-400">{value}</span>
                    <span className="text-lg text-neutral-400 ml-1"> years old</span>
                </div>
                 <div className="text-right">
                     <span className="text-3xl text-neutral-100">{targetYear}</span>
                     <span className="text-lg text-neutral-400 ml-1"> year</span>
                 </div>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={onChange}
                disabled={disabled}
                className="w-full h-3 bg-neutral-700 rounded-lg appearance-none cursor-pointer range-lg disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: sliderBackground }}
                aria-label="Age slider"
            />
        </div>
    );
};

export default AgeSlider;