import { Vector2d, Color } from './types';
import { Point } from './point';
import { SVGCommand, SVGPathData } from 'svg-pathdata';


export class MovableElement {
    points: Array<PathPoint> = new Array<PathPoint>();
    element: SVGElement;
    original_d: string;
    last_point: Point;

    constructor(element: SVGElement) {
        this.element = element;
        this.original_d = element.getAttribute("d");
    }

    fixLast() {
        this.last_point.fixed = true;
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


export class PathPoint {
    point: Point;
    rel_point: Point;
    relative: boolean;
    command_type: any;

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
        if (this.command_type == SVGPathData.CLOSE_PATH)
            return {relative: false, type: this.command_type};
        return {relative: this.relative, type: this.command_type, x: position.x, y: position.y};
    }
}

export class BezierPathPoint extends PathPoint {
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

export class SmoothBezierPathPoint extends BezierPathPoint {
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

export class QuadraticCurvePathPoint extends SmoothBezierPathPoint {
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

export class ArcPathPoint extends PathPoint {
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


export class Mapper {
    constructor() {

    }
    convertToPathPoint(command: SVGCommand, p: Point, previous_point: Point): PathPoint {
        let path_point: PathPoint;
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
            default:
                path_point = new PathPoint(p, previous_point, command.relative, command.type);
                break;
        }
        return path_point;
    }
}