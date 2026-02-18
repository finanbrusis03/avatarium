export function applyPattern(ctx: CanvasRenderingContext2D, pattern: string, _width: number, _height: number, color: string) {
    if (pattern === 'dots') {
        const dotSize = 2;
        const spacing = 6;
        const canvas = document.createElement('canvas');
        canvas.width = spacing;
        canvas.height = spacing;
        const pCtx = canvas.getContext('2d')!;

        pCtx.fillStyle = color;
        pCtx.beginPath();
        pCtx.arc(spacing / 2, spacing / 2, dotSize / 2, 0, Math.PI * 2);
        pCtx.fill();

        const pat = ctx.createPattern(canvas, 'repeat');
        if (pat) ctx.fillStyle = pat;
    } else if (pattern === 'stripes') {
        const spacing = 8;
        const canvas = document.createElement('canvas');
        canvas.width = spacing;
        canvas.height = spacing;
        const pCtx = canvas.getContext('2d')!;

        pCtx.strokeStyle = color;
        pCtx.lineWidth = 2;
        pCtx.beginPath();
        pCtx.moveTo(0, 0);
        pCtx.lineTo(spacing, spacing);
        pCtx.stroke();

        const pat = ctx.createPattern(canvas, 'repeat');
        if (pat) ctx.fillStyle = pat;
    }
}
