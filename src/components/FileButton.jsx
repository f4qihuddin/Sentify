import { useRef } from "react";

function FileButton({
  logo,
  label,
  accept,
  onFileSelect,
  className = "",
  disabled = false,
  ariaLabel,
}) {
  const fileInputRef = useRef(null);

  function handleButtonClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (file) {
      onFileSelect?.(file);
    }

    event.target.value = "";
  }

  return (
    <>
      <button
        type="button"
        className={`action-button ${className}`}
        onClick={handleButtonClick}
        disabled={disabled}
        aria-label={ariaLabel}
      >
        <img src={logo} alt="" />
        {label}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        hidden
        onChange={handleFileChange}
      />
    </>
  );
}

export default FileButton;
