import { Vector2d, Color } from './modules/types';
import { random } from './modules/utils';
import { Point, Spring } from './modules/point';
import { Poor2DRenderer } from './modules/renderer';
import { SVGCommand, SVGPathData } from 'svg-pathdata';
import { PathPoint, MovableElement, BezierPathPoint, ArcPathPoint, SmoothBezierPathPoint, QuadraticCurvePathPoint, Mapper } from './modules/mapping';


const viscosity_factor = 0.000001;
const mapper = new Mapper();


class Application {
    renderer: any;
    points: Array<Point> = Array<Point>();
    springs: Array<Spring> = new Array<Spring>();
    movable: Array<MovableElement> = new Array<MovableElement>();

    setupRenderer() {
        // find Canvas and initialize either 2D or WebGL Renderer
        var canvas = <HTMLCanvasElement>document.getElementById('mycanvas');
        this.renderer = new Poor2DRenderer(canvas);
        
        // connect resize event
        window.addEventListener('resize', () => {
            this.renderer.resize(window.innerWidth, window.innerHeight, this.renderer.D);
        }, false);
    }

    simulatePhysics() {
        let dt = 0.1;

        for (let point of this.points) {
            point.force = new Vector2d(0, 9.81);
        }

        for (let s of this.springs) {
            let force = s.force();
            let p1 = s.points[0];
            let p2 = s.points[1];
            p1.force = p1.force.subtract(force);
            p2.force = p2.force.add(force);
        }

        for (let point of this.points) {
            point.move(dt);
        }

        /*for (let point of this.points) {
            //let drag = point.velocity.multiply(point.radius*Math.PI*(-6)*viscosity_factor);
            point.accelerate(f.add(new Vector2d(0, 9.81)));


            //for (let point2 of this.points) {
            //    if (point.checkCollision(point2))
            //        point.bounceFrom(point2);
            //}

            //if (point.exitingX(this.renderer.W)) point.bounceX();
            //if (point.exitingY(this.renderer.H)) point.bounceY();
        }*/
    }

    constructor() {
        // setup renderer
        this.setupRenderer();

        let paths = [].slice.call(document.querySelectorAll("svg path.movable"));
        for (let svg of paths) {
            let movable_element = new MovableElement(svg);
            this.movable.push(movable_element);
            let path = new SVGPathData(svg.getAttribute("d"));
            let previous_point: Point;
            for (let command of path.commands) {
                let delta_vector: Vector2d = new Vector2d(0,0);
                let unsupported: boolean = false;
                let noop: boolean = false;

                switch(command.type) {
                    case SVGPathData.MOVE_TO:
                    case SVGPathData.LINE_TO:
                    case SVGPathData.CURVE_TO:
                    case SVGPathData.SMOOTH_CURVE_TO:
                    case SVGPathData.QUAD_TO:
                    case SVGPathData.ARC:
                        delta_vector = new Vector2d(command.x, command.y);
                        break;
                    case SVGPathData.HORIZ_LINE_TO:
                        delta_vector = new Vector2d(command.x, 0);
                        break;
                    case SVGPathData.VERT_LINE_TO:
                        delta_vector = new Vector2d(0, command.y);
                        break;
                    case SVGPathData.CLOSE_PATH:
                        noop = true;
                        break;
                    default:
                        console.log(command.type + " is unsupported:");
                        console.log(command);
                        unsupported = true;
                        continue;
                }

                let p = new Point(new Vector2d(0,0), 0, new Vector2d(0,0));
                if (!noop) {
                    let position = delta_vector;
                    if (command.relative && previous_point)
                        position = previous_point.position.add(delta_vector);
                    p.position = position;
                    this.points.push(p);

                    if (previous_point) {
                        this.springs.push(new Spring(previous_point, p));
                    } else p.fixed = true;
                    movable_element.last_point = p;
                }
                movable_element.points.push(mapper.convertToPathPoint(command, p, previous_point));
                previous_point = movable_element.last_point;
            }
            if (svg.classList.contains("fixed-end"))
                movable_element.fixLast();
        }

        /*for (let p of this.points) {
            for (let p1 of this.points) {
                if (p != p1) {
                    this.springs.push(new Spring(p1, p));
                }
            }
        }*/

        // start event loop
        var loop = () =>
        {
            // call renderer
            this.renderer.render(this.points, this.springs);
            this.simulatePhysics();

            for (let m of this.movable)
                m.update();

            // continue loop
            requestAnimationFrame(loop);
        };
        loop();
    }
}

var app = new Application();