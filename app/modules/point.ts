import { Vector2d, Color } from './types';

export class Spring {
    points: Array<Point> = new Array<Point>();
    initial_length: number = 0;
    ks: number = 50;
    kd: number = 1;

    constraint(): Vector2d {
        let a = this.points[0]; let b = this.points[1];
        let difference = a.position.subtract(b.position);
        let current_length = difference.length();
        let max_length = 0.1*this.initial_length;

        if (Math.abs(current_length - this.initial_length) > (this.initial_length + max_length)) {
            //a.force.(b.position.subtract(a.position).multiply(max_length));
            //b.accelerate(a.position.subtract(b.position).multiply(max_length));

            return new Vector2d(0,0);
        } else return new Vector2d(0,0);
    }

    force(): Vector2d {
        let a = this.points[0]; let b = this.points[1];
        let difference = a.position.subtract(b.position);
        let current_length = difference.length();

        if (current_length != 0) {
            let f = ((current_length - this.initial_length) * this.ks);

            // add damping
            let velocity_delta = a.velocity.subtract(b.velocity);
            let v1v2r1r2 = new Vector2d(velocity_delta.x * difference.x, velocity_delta.y * difference.y);
            f += (v1v2r1r2.x + v1v2r1r2.y) * this.kd / current_length;
            
            return difference.divide(current_length).multiply(f);
        } else {
            return new Vector2d(0,0);
        }
    }

    constructor(a: Point, b: Point) {
        // initialize points
        this.points.push(a);
        this.points.push(b);

        // set initial length
        this.initial_length = a.position.subtract(b.position).length();
    }
}

export class Point {
    position: Vector2d;
    velocity: Vector2d;
    force: Vector2d;
    radius: number;
    m: number;
    color: Color = new Color(0,0,0);
    fixed: boolean = false;

    constructor (position: Vector2d, radius: number, velocity: Vector2d) {
        this.position = position;
        this.m = 1;
        this.radius = radius;
        this.velocity = velocity;
        this.force = new Vector2d(0, 0);
    }

    setColor(r: number, g: number, b: number): void {
        this.color = new Color(r, g, b);
    }

    exitingX(W: number): boolean {
        let result = this.position.x <= this.radius || this.position.x >= W - this.radius;
        if (result) this.position.x = this.position.x <= this.radius ? this.radius : W - this.radius;
        return result;
    }

    exitingY(H: number): boolean {
        let result = this.position.y <= this.radius || this.position.y >= H - this.radius;
        if (result) this.position.y = this.position.y <= this.radius ? this.radius : H - this.radius;
        return result;
    }

    bounceX(): void {
        this.velocity.x = -this.velocity.x;
    }
    bounceY(): void {
        this.velocity.y = -this.velocity.y;
    }

    move(dt: number): void {
        let acceleration = this.force.divide(this.m);
        this.force = new Vector2d(0, 0);
        if (!this.fixed) {
            this.velocity = this.velocity.add(acceleration.multiply(dt));
            this.position = this.position.add(this.velocity.multiply(dt));
        } else {
            this.velocity = new Vector2d(0, 0);
        }

        /*if (!this.fixed) {
            let old_acceleration = this.acceleration;
            this.position = this.position.add(this.velocity.multiply(dt).add(this.acceleration.multiply(0.5*Math.pow(dt, 2))));
            this.acceleration = this.force.divide(this.m);
            this.velocity = this.velocity.add(old_acceleration.add(this.acceleration).multiply(0.5*dt));
        } else {
            this.velocity = new Vector2d(0,0);
        }
        //this.velocity = new Vector2d(0,0);
        //this.acceleration = new Vector2d(0,0);
        this.force = new Vector2d(0, 0);*/
    }
    checkCollision(point: Point): boolean {
        if (point == this) return false;
        return this.position.subtract(point.position).length() < (this.radius + point.radius);
    }

    bounceFrom(point: Point) {
        // based on https://stackoverflow.com/questions/345838/ball-to-ball-collision-detection-and-handling
        // get the mtd
        let delta: Vector2d = this.position.subtract(point.position);
        let d = delta.length();

        // minimum translation distance to push balls apart after intersecting
        let mtd: Vector2d = delta.multiply(((this.radius + point.radius)-d)/d)

        // resolve intersection --
        // inverse mass quantities
        let im1: number = 1 / this.m;
        let im2: number = 1 / point.m;

        // push-pull them apart based off their mass
        if (!this.fixed)
            this.position = this.position.add(mtd.multiply(im1 / (im1 + im2)));
        if (!point.fixed)
            point.position = point.position.subtract(mtd.multiply(im2 / (im1 + im2)));

        // impact speed
        let v: Vector2d = this.velocity.subtract(point.velocity);
        let vn: number = v.dot(mtd.normalize());

        // sphere intersecting but moving away from each other already
        if (vn > 0.0) return;

        // collision impulse
        let i: number = (-(1.0 + 0.8) * vn) / (im1 + im2);
        let impulse: Vector2d = mtd.normalize().multiply(i);

        // change in momentum
        this.velocity = this.velocity.add(impulse.multiply(im1));
        point.velocity = point.velocity.subtract(impulse.multiply(im2));
    }
}