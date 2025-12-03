import { useMemo, memo } from "react";

import ICONS from "../assets/icons"

const FloatingIcons = () => {
    // const icons = [doctor, health, doctor, health, doctor, stethoscope, health, stethoscope, stethoscope, doctor, health, doctor, stethoscope, health, stethoscope]; // Add more icons as needed 
  
    const randomized = useMemo(() => {
    return ICONS.map(() => ({
      top: Math.random() * 90,
      left: Math.random() * 90,
      duration: 3 + Math.random() * 5, // 3–8 seconds
      delay: Math.random() * 3,        // 0–3 seconds
      size: 30 + Math.random() * 30    // 30–60px
    }));
  }, [ICONS]);


  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-1">
      {ICONS.map((src, i) => {
        const cfg = randomized[i];

        return (
          <img
            key={i}
            src={src}
            alt=""
            className="absolute animate-float"
            style={{
              top: `${cfg.top}%`,
              left: `${cfg.left}%`,
              width: `${cfg.size}px`,
              height: `${cfg.size}px`,
              animationDuration: `${cfg.duration}s`,
              animationDelay: `${cfg.delay}s`,
              opacity: 0.2,
            }}
          />
        );
      })}
    </div>
  );
}

export default memo(FloatingIcons);