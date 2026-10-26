export class Sand {
    seed;
    size = 64;
    cells = new Uint16Array(4096);
    count = 1024;
    paused = false;
    rng = 1;
    tick = 0;
    debt = 0;
    constructor(seed = 12026) {
        this.seed = seed;
        this.reset();
    }
    reset() {
        this.cells.fill(0);
        this.rng = this.seed;
        this.tick = 0;
        this.debt = 0;
        for (let i = 0; i < this.count; i++)
            this.cells[(Math.floor(i / 64) + 5) * 64 + i % 64] = i + 1;
    }
    random() { this.rng ^= this.rng << 13; this.rng ^= this.rng >>> 17; this.rng ^= this.rng << 5; return (this.rng >>> 0) / 4294967296; }
    advance(dt, g) {
        if (this.paused || !Number.isFinite(dt) || !Number.isFinite(g.x) || !Number.isFinite(g.y) || dt <= 0)
            return;
        const strength = Math.min(1.5, Math.hypot(g.x, g.y));
        if (strength < 0.035) {
            this.debt = 0;
            return;
        }
        this.debt += Math.min(dt, 0.05) * strength * 55;
        while (this.debt >= 1) {
            this.step(g);
            this.debt--;
        }
    }
    step(g) {
        this.tick++;
        // Enumerate occupied cells once, downstream first. Each grain moves at most one cell.
        const order = [];
        for (let i = 0; i < 4096; i++)
            if (this.cells[i])
                order.push(i);
        order.sort((a, b) => ((b % 64 - a % 64) * g.x + (Math.floor(b / 64) - Math.floor(a / 64)) * g.y) || ((this.tick % 2 ? 1 : -1) * (b - a)));
        const axisX = Math.abs(g.x) > Math.abs(g.y);
        const primary = axisX ? { x: Math.sign(g.x), y: 0 } : { x: 0, y: Math.sign(g.y) };
        for (const cell of order) {
            const id = this.cells[cell];
            if (!id)
                continue;
            const x = cell % 64, y = Math.floor(cell / 64);
            const minor = axisX ? g.y : g.x, major = axisX ? g.x : g.y;
            const side = this.random() < 0.5 ? 1 : -1;
            const diagonal = { x: axisX ? primary.x : Math.sign(minor), y: axisX ? Math.sign(minor) : primary.y };
            const candidates = [primary];
            if (minor && this.random() < Math.abs(minor / major))
                candidates.unshift(diagonal);
            candidates.push(axisX ? { x: primary.x, y: side } : { x: side, y: primary.y }, axisX ? { x: primary.x, y: -side } : { x: -side, y: primary.y });
            for (const d of candidates) {
                if (d.x * g.x + d.y * g.y <= 0)
                    continue;
                const nx = x + d.x, ny = y + d.y;
                if (nx < 0 || nx >= 64 || ny < 0 || ny >= 64)
                    continue;
                const target = ny * 64 + nx;
                if (this.cells[target] === 0) {
                    this.cells[target] = id;
                    this.cells[cell] = 0;
                    break;
                }
            }
        }
    }
}
/** W3C orientation angles to in-plane gravity, then rotate to screen coordinates. */
export function orientationGravity(beta, gamma, angle) {
    const b = beta * Math.PI / 180, c = gamma * Math.PI / 180, a = angle * Math.PI / 180;
    const x = Math.cos(b) * Math.sin(c), y = Math.sin(b);
    return { x: x * Math.cos(a) + y * Math.sin(a), y: -x * Math.sin(a) + y * Math.cos(a) };
}
