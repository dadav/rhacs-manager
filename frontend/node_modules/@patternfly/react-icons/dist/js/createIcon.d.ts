/// <reference types="react" />
export interface SVGPathObject {
    path: string;
    className?: string;
}
export interface IconDefinition {
    name?: string;
    width: number;
    height: number;
    svgPath: string | SVGPathObject[];
    xOffset?: number;
    yOffset?: number;
    svgClassName?: string;
}
export interface SVGIconProps extends Omit<React.HTMLProps<SVGElement>, 'ref'> {
    title?: string;
    className?: string;
}
/**
 * Factory to create Icon class components for consumers
 */
export declare function createIcon({ name, xOffset, yOffset, width, height, svgPath, svgClassName }: IconDefinition): React.ComponentClass<SVGIconProps>;
//# sourceMappingURL=createIcon.d.ts.map