import React from "react";

export function FeedSkeleton({ n = 4 }) {
  return (
    <div className="skel-feed" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div className="skel-card" key={i}>
          <div className="skel-row">
            <i className="skel av" />
            <div className="grow">
              <i className="skel line w40" />
              <i className="skel line w24" />
            </div>
          </div>
          <i className="skel line w90" />
          <i className="skel line w70" />
          <i className="skel thumb" />
        </div>
      ))}
    </div>
  );
}

export function CellSkeleton() {
  return (
    <div className="skel-cells" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div className="skel-cell" key={i}>
          <i className="skel icon" />
          <i className="skel line w60" />
        </div>
      ))}
    </div>
  );
}

export function RowSkeleton({ n = 6 }) {
  return (
    <div className="skel-rows" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div className="skel-msg" key={i}>
          <i className="skel av" />
          <div className="grow">
            <i className="skel line w50" />
            <i className="skel line w80" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SoftSkeleton() {
  return (
    <div className="skel-rows" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <div className="skel-soft" key={i}>
          <i className="skel icon" />
          <div className="grow">
            <i className="skel line w40" />
            <i className="skel line w80" />
            <i className="skel line w30" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BootSkeleton() {
  return (
    <div className="boot-skel" aria-busy="true">
      <i className="skel logo" />
      <i className="skel line w40" />
      <i className="skel line w24" />
    </div>
  );
}
