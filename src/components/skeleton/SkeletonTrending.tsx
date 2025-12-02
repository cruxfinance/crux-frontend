export default function SkeletonTrending() {
  return (
    <div>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "4px 8px",
            borderRadius: "4px",
            marginBottom: "4px",
          }}
        >
          {/* index number */}
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: "#666",
              flexShrink: 0,
            }}
          ></div>

          {/* avatar */}
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              backgroundColor: "#666",
              flexShrink: 0,
            }}
          ></div>

          {/* single line name placeholder */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                width: "80%",
                height: 12,
                backgroundColor: "#666",
                borderRadius: 2,
              }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
}
