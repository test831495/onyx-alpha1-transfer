import React from "react";
import "../styles/OverflowIndicator.css";

interface OverflowIndicatorProps {
  overflowCount: number;
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}

export const OverflowIndicator: React.FC<OverflowIndicatorProps> = ({
  overflowCount,
  currentPage,
  totalPages,
  onPrevious,
  onNext,
}) => {
  if (overflowCount === 0 || totalPages <= 1) {
    return null;
  }

  return (
    <div className="overflow-indicator" role="status" aria-live="polite">
      <div className="overflow-indicator__content">
        <span className="overflow-indicator__label">+{overflowCount} more app{overflowCount !== 1 ? 's' : ''}</span>
        <span className="overflow-indicator__pagination" aria-label={`Page ${currentPage + 1} of ${totalPages}`}>
          {currentPage + 1} / {totalPages}
        </span>
      </div>
      <div className="overflow-indicator__controls">
        <button
          className="overflow-indicator__button overflow-indicator__button--prev"
          onClick={onPrevious}
          disabled={currentPage === 0}
          aria-label="Previous page of overflow apps"
        >
          ← Prev
        </button>
        <button
          className="overflow-indicator__button overflow-indicator__button--next"
          onClick={onNext}
          disabled={currentPage >= totalPages - 1}
          aria-label="Next page of overflow apps"
        >
          Next →
        </button>
      </div>
    </div>
  );
};
