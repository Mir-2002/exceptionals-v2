import React, { useEffect, useRef } from "react";
import SimonAndMarceline from "../../assets/simon_and_marceline.png";
import checkSound from "../../assets/remember_you.mp3"; // Add your sound file to assets

const Checkbox = ({
  label,
  name,
  checked = false,
  onChange,
  className = "",
  error = "",
  ...props
}) => {
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      if (checked) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      } else {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [checked]);

  return (
    <div className={`flex flex-col items-start gap-y-2 ${className}`}>
      <div className="flex items-center gap-x-2">
        <input
          id={name}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="w-4 h-4 accent-blue-600"
          {...props}
        />
        {label && (
          <label htmlFor={name} className="text-sm">
            {label}
          </label>
        )}
        {error && <span className="text-xs text-red-500 ml-2">{error}</span>}
      </div>
      {checked && (
        <img
          src={SimonAndMarceline}
          alt="Checked"
          className="w-[150px] h-auto mt-2 object-contain"
          style={{ display: "block" }}
        />
      )}
      {/* Hidden audio element */}
      <audio ref={audioRef} src={checkSound} />
    </div>
  );
};

export default Checkbox;
