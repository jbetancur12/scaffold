
interface FabricationLayoutPreviewProps {
    rollWidth: number; // In linear mode, this is the "Material Total Length"
    pieceWidth: number; // In linear mode, ignored or thickness
    pieceLength: number; // In linear mode, this is the "Cut Length"
    orientation: 'normal' | 'rotated';
    calculationType?: 'area' | 'linear';
    result?: {
        piecesPerWidth: number;
        rowsPerMeter: number;
    };
}

export default function FabricationLayoutPreview({
    rollWidth,
    pieceWidth,
    pieceLength,
    orientation,
    calculationType = 'area',
    result
}: FabricationLayoutPreviewProps) {
    if (rollWidth <= 0 || pieceLength <= 0) return null;

    if (calculationType === 'linear') {
        const materialLen = rollWidth;
        const cutLen = pieceLength;
        const pieces = Math.floor(materialLen / cutLen);
        const waste = materialLen - (pieces * cutLen);

        // Linear ViewBox: 0 0 MaterialLength 30 (fixed height)
        const barHeight = 20;

        return (
            <div className="w-full mt-2 bg-slate-100 border border-slate-300 rounded overflow-hidden p-2">
                <svg viewBox={`0 -10 ${materialLen} ${barHeight + 20}`} className="w-full h-auto block" preserveAspectRatio="none">
                    {/* Background helps see the full length */}
                    <rect x="0" y="0" width={materialLen} height={barHeight} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />

                    {/* Cuts */}
                    {Array.from({ length: pieces }).map((_, i) => (
                        <g key={i}>
                            <rect
                                x={i * cutLen}
                                y="0"
                                width={cutLen}
                                height={barHeight}
                                fill="#818cf8"
                                stroke="white"
                                strokeWidth="0.5"
                            />
                            {/* Label for first few pieces if they fit */}
                            {(i < 3 || pieces < 5) && (
                                <text
                                    x={(i * cutLen) + (cutLen / 2)}
                                    y={barHeight / 2}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fill="white"
                                    fontSize={Math.min(cutLen / 3, 8)}
                                    fontWeight="bold"
                                >
                                    {cutLen}
                                </text>
                            )}
                        </g>
                    ))}

                    {/* Waste */}
                    {waste > 0 && (
                        <rect
                            x={pieces * cutLen}
                            y="0"
                            width={waste}
                            height={barHeight}
                            fill="#fecaca"
                            opacity="0.8"
                        />
                    )}

                    {/* Labels */}
                    <text x={materialLen / 2} y={-2} textAnchor="middle" fontSize="6" fill="#475569">
                        Largo Total: {materialLen} {waste > 0 ? `(Sobran ${waste.toFixed(2)})` : ''}
                    </text>
                </svg>
            </div>
        );
    }

    // Default AREA logic
    if (pieceWidth <= 0) return null;

    // Use passed result or calculate on the fly
    const res = result || (() => {
        const pW = orientation === 'rotated' ? pieceLength : pieceWidth;
        const pL = orientation === 'rotated' ? pieceWidth : pieceLength;
        const piecesPerWidth = Math.floor(rollWidth / pW);
        const rowsPerMeter = Math.floor(100 / pL);
        return { piecesPerWidth, rowsPerMeter };
    })();

    const renderWidth = pieceWidth;
    const renderLength = pieceLength;

    // ViewBox matches the physical dimensions: 0 0 RollWidth 100cm (1 meter representative sample)
    const viewHeight = Math.max(100, renderLength * 1.1);

    // Text size relative to width, clamped
    const fontSize = Math.max(2, Math.min(rollWidth / 25, 5));

    return (
        <div className="w-full mt-2 bg-slate-100 border border-slate-300 rounded overflow-hidden">
            <svg viewBox={`0 -${fontSize * 4} ${rollWidth} ${viewHeight + (fontSize * 4)}`} className="w-full h-auto block" preserveAspectRatio="xMidYMin meet">
                {/* Background / Fabric */}
                <rect x="0" y="0" width={rollWidth} height={viewHeight} fill="#e2e8f0" />

                {/* Grid Pattern */}
                <defs>
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="gray" strokeWidth="0.5" strokeOpacity="0.1" />
                    </pattern>
                </defs>
                <rect width={rollWidth} height={viewHeight} fill="url(#grid)" />

                {/* Axis Labels */}
                <text x={rollWidth / 2} y={-fontSize} textAnchor="middle" fill="#64748b" fontSize={fontSize} fontWeight="bold">
                    Ancho Rollo: {rollWidth}cm (Eje X)
                </text>
                <line x1="0" y1={-fontSize / 2} x2={rollWidth} y2={-fontSize / 2} stroke="#64748b" strokeWidth={0.5} />

                <text x={2} y={fontSize * 2} fill="#64748b" fontSize={fontSize * 0.8} style={{ writingMode: 'vertical-rl' }}>
                    Avance / Largo (Eje Y) &darr;
                </text>

                {/* Pieces */}
                {Array.from({ length: res.rowsPerMeter }).map((_, rowIndex) => (
                    Array.from({ length: res.piecesPerWidth }).map((_, colIndex) => {
                        const isFirst = rowIndex === 0 && colIndex === 0;
                        return (
                            <g key={`${rowIndex}-${colIndex}`}>
                                <rect
                                    x={colIndex * renderWidth}
                                    y={rowIndex * renderLength}
                                    width={renderWidth}
                                    height={renderLength}
                                    fill="#818cf8" // Indigo-400
                                    stroke="#fff"
                                    strokeWidth="0.5"
                                    fillOpacity="0.8"
                                />
                                {isFirst && (
                                    <text
                                        x={(colIndex * renderWidth) + (renderWidth / 2)}
                                        y={(rowIndex * renderLength) + (renderLength / 2)}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fill="white"
                                        fontSize={Math.min(renderWidth, renderLength) / 4}
                                        fontWeight="bold"
                                    >
                                        {renderWidth}x{renderLength}
                                    </text>
                                )}
                            </g>
                        );
                    })
                ))}

                {/* Waste highlighting (right side) */}
                <rect
                    x={res.piecesPerWidth * renderWidth}
                    y="0"
                    width={rollWidth - (res.piecesPerWidth * renderWidth)}
                    height={viewHeight}
                    fill="#fecaca" // Red-200
                    fillOpacity="0.5"
                />
            </svg>
        </div>
    );
}
