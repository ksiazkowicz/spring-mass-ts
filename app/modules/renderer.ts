import { Point, Spring } from "./point";


export class BaseRenderer {
    /**
     * Base class for all renderers. Keeps common logic.
     */
    canvas: HTMLCanvasElement;
    W: number = window.innerWidth;
    H: number = window.innerHeight;
    D: number = 60;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    resize(W: number, H: number, D: number) {
        this.W = W;
        this.H = H;
        this.D = D;
        this.setupRenderer();
        this.initCamera();
    }

    setupRenderer() {
        console.log("Dummy setupRenderer() called");
    }

    initCamera() {
        console.log("Dummy initCamera() called");
    }

    render(points: Array<Point>, springs: Array<Spring>): void {
        console.log("Dummy render function called");
    }
}

export class Poor2DRenderer extends BaseRenderer {
    /**
     *  Basic, HTML Canvas renderer (2D)
     */
    context: CanvasRenderingContext2D;

    setupRenderer() {
        this.canvas.width = this.W;
        this.canvas.height = this.H;
        this.context = this.canvas.getContext("2d");
    }

    initCamera() {}

    constructor(canvas: HTMLCanvasElement) {
        super(canvas);
        this.setupRenderer();
        this.initCamera();
    }

    draw(point: Point): void {
        this.context.fillStyle = point.color.getRGB();
        this.context.beginPath();
        this.context.arc(this.W-point.position.x,this.H-point.position.y,point.radius,0,2*Math.PI);
        this.context.fill();
    }

    render(points: Array<Point>, springs: Array<Spring>): void {
        this.context.clearRect(0, 0, this.W, this.H);

        for (let spring of springs) {
            this.context.beginPath();
            this.context.strokeStyle = "rgba(0,0,0,0.5);";
            this.context.moveTo(this.W-spring.points[0].position.x, this.H-spring.points[0].position.y);
            this.context.lineTo(this.W-spring.points[1].position.x, this.H-spring.points[1].position.y);
            this.context.stroke();
        }

        for (let point of points) {
            this.draw(point);
        }
    }
}