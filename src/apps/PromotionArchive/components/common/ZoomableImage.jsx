import React, { useState, memo } from 'react';

const ZoomableImage = memo(({ src, alt }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  
  const handleMouseMove = (e) => {
    if (isZoomed) {
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const x = ((clientX - left) / width) * 100;
        const y = ((clientY - top) / height) * 100;
        setPosition({ x, y });
    }
  };

  const handleClick = () => {
    setIsZoomed(prev => !prev);
  };

  return (
    <div 
      className={`w-full h-full flex items-center justify-center overflow-hidden relative ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove} 
      onMouseLeave={() => setIsZoomed(false)} 
    >
      <img 
        src={src} 
        alt={alt} 
        className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-200 ease-out will-change-transform"
        style={{
            transformOrigin: `${position.x}% ${position.y}%`,
            transform: isZoomed ? 'scale(2.5)' : 'scale(1)' 
        }}
      />
      {!isZoomed && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 text-white/70 text-[10px] px-2 py-1 rounded-full backdrop-blur-sm pointer-events-none">
              Click to Zoom
          </div>
      )}
    </div>
  );
});

export default ZoomableImage;