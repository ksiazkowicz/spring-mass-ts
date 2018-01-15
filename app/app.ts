import { Vector2d, Color } from './modules/types';
import { random } from './modules/utils';
import { Point, Spring } from './modules/point';
import { Poor2DRenderer } from './modules/renderer';
import { SVGCommand, SVGPathData } from 'svg-pathdata';


const viscosity_factor = 0.000001;

class PathPoint {
    point: Point;
    rel_point: Point;
    relative: boolean;
    command_type: typeof SVGPathData.MOVE_TO;

    constructor(point: Point, rel_point: Point, relative: boolean, command_type: any) {
        this.point = point;
        this.rel_point = rel_point;
        this.relative = relative;
        this.command_type = command_type;
    }
    position(): Vector2d {
        if (this.relative)
            return this.point.position.subtract(this.rel_point.position);
        return this.point.position;
    }

    command(): SVGCommand {
        let position = this.position();
        return {relative: this.relative, type: this.command_type, x: position.x, y: position.y};
    }
}

class ClosePathPoint extends PathPoint {
    command(): SVGCommand {
        return {relative: false, type: SVGPathData.CLOSE_PATH}
    }
}

class BezierPathPoint extends PathPoint {
    control_begin: Vector2d;
    control_end: Vector2d;

    constructor(point: Point, rel_point: Point, relative: boolean, c_begin: Vector2d, c_end: Vector2d) {
        // constructor takes point which is the END of path of course
        super(point, rel_point, relative, undefined);
        this.control_begin = c_begin;
        this.control_end = c_end;
    }

    command(): SVGCommand {
        let end_position = this.position();
        return {
            relative: this.relative,
            type: SVGPathData.CURVE_TO,
            x: end_position.x,
            y: end_position.y,
            x1: this.control_begin.x,
            y1: this.control_begin.y,
            x2: this.control_end.x,
            y2: this.control_end.y,
        }
    }
}

class SmoothBezierPathPoint extends BezierPathPoint {
    constructor(point: Point, rel_point: Point, relative: boolean, c_begin: Vector2d) {
        super(point, rel_point, relative, c_begin, undefined);
    }

    command(): SVGCommand {
        let end_position = this.position();
        return {
            relative: this.relative,
            type: SVGPathData.SMOOTH_CURVE_TO,
            x: end_position.x,
            y: end_position.y,
            x2: this.control_begin.x,
            y2: this.control_begin.y,
        }
    }
}

class QuadraticCurvePathPoint extends SmoothBezierPathPoint {
    command(): SVGCommand {
        let end_position = this.position();
        return {
            relative: this.relative,
            type: SVGPathData.QUAD_TO,
            x: end_position.x,
            y: end_position.y,
            x1: this.control_begin.x,
            y1: this.control_begin.y,
        }
    }
}

class ArcPathPoint extends PathPoint {
    r: Vector2d;
    xRot: number;
    sweepFlag: 0 | 1;
    lArcFlag: 0 | 1;
    c: Vector2d;
    phi: Vector2d;

    command(): SVGCommand {
        let position = this.position();
        return {
            relative: this.relative, 
            type: SVGPathData.ARC, 
            x: position.x, 
            y: position.y,
            rX: this.r.x,
            rY: this.r.y,
            cX: this.c.x,
            cY: this.c.y,
            xRot: this.xRot,
            sweepFlag: this.sweepFlag,
            lArcFlag: this.lArcFlag,
            phi1: this.phi.x,
            phi2: this.phi.y,
        };

    }
}


class MovableElement {
    points: Array<PathPoint> = new Array<PathPoint>();
    element: SVGElement;
    original_d: string;

    constructor(element: SVGElement) {
        this.element = element;
        this.original_d = element.getAttribute("d");
    }

    update() {
        let commandArray = new Array<SVGCommand>();
        for (let p of this.points) {
            commandArray.push(p.command());
        }

        let path = new SVGPathData(commandArray);
        this.element.setAttribute("d", path.encode());
    }
}

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
            point.move(dt);
            let drag = point.velocity.multiply(point.radius*Math.PI*(-6)*viscosity_factor);
            let f = new Vector2d(0,0);

            for (let s of this.springs) {
                if (s.points.indexOf(point) == 0) {
                    f = f.add(s.force());
                }
                if (s.points.indexOf(point) == 1) {
                    f = f.subtract(s.force());
                }
            }
            point.accelerate(new Vector2d(0, 9.81).add(f)); //.multiply(0.99).add(drag));

            for (let point2 of this.points) {
                if (point.checkCollision(point2))
                    point.bounceFrom(point2);
            }
        }
    }

    constructor() {
        // setup renderer
        this.setupRenderer();

        let movable = [].slice.call(document.querySelectorAll("svg path.movable"));
        for (let m of movable) {
            let movable_element = new MovableElement(m);
            this.movable.push(movable_element);
            let path = new SVGPathData(m.getAttribute("d"));
            let previous_point: Point;
            let last = path.commands[path.commands.length-1];
            for (let command of path.commands) {
                let delta_vector: Vector2d = new Vector2d(0,0);
                let unsupported: boolean = false;
                let noop: boolean = false;
                let path_point: PathPoint;
                let p = new Point(new Vector2d(0,0), 0, new Vector2d(0,0));

                if (command == last && m.classList.contains("fixed-end"))
                    p.fixed = true;

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
                        break;
                }

                switch (command.type) {
                    case SVGPathData.CURVE_TO:
                        let control_start = new Vector2d(command.x1, command.y1);
                        let control_end = new Vector2d(command.x2, command.y2);
                        path_point = new BezierPathPoint(p, previous_point, command.relative, control_start, control_end);
                        break;
                    case SVGPathData.SMOOTH_CURVE_TO:
                        path_point = new SmoothBezierPathPoint(p, previous_point, command.relative, new Vector2d(command.x2, command.y2));
                        break;
                    case SVGPathData.QUAD_TO:
                        path_point = new QuadraticCurvePathPoint(p, previous_point, command.relative, new Vector2d(command.x1, command.y1));
                        break;
                    case SVGPathData.ARC:
                        let arc = new ArcPathPoint(p, previous_point, command.relative, undefined);
                        arc.c = new Vector2d(command.cX, command.cY);
                        arc.phi = new Vector2d(command.phi1, command.phi2);
                        arc.lArcFlag = command.lArcFlag;
                        arc.sweepFlag = command.sweepFlag;
                        arc.xRot = command.xRot;
                        arc.r = new Vector2d(command.rX, command.rY);
                        path_point = arc;
                        break;
                    case SVGPathData.CLOSE_PATH:
                        path_point = new ClosePathPoint(p, undefined, false, undefined);
                    default:
                        path_point = new PathPoint(p, previous_point, command.relative, command.type);
                        break;
                }

                if (noop)  {
                    movable_element.points.push(path_point);
                }

                if (unsupported || noop)
                    continue;

                let position = delta_vector;
                if (command.relative && previous_point) {
                    position = previous_point.position.add(delta_vector);
                }
                p.position = position;

                p.setColor(0,0,0);
                this.points.push(p);
                movable_element.points.push(path_point);

                if (previous_point) {
                    this.springs.push(new Spring(previous_point, p));
                } else {
                    p.fixed = true;
                }
                previous_point = p;
            }
        }

        // start event loop
        var loop = () =>
        {
            // call renderer
            this.renderer.render(this.points, this.springs);
            this.simulatePhysics();

            for (let m of this.movable) {
                m.update();
            }

            // continue loop
            requestAnimationFrame(loop);
        };
        loop();
    }
}

var app = new Application();