import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
let currentId = 0;
/**
 * Factory to create Icon class components for consumers
 */
export function createIcon({ name, xOffset = 0, yOffset = 0, width, height, svgPath, svgClassName }) {
    var _a;
    return _a = class SVGIcon extends Component {
            constructor() {
                super(...arguments);
                this.id = `icon-title-${currentId++}`;
            }
            render() {
                const _b = this.props, { title, className: propsClassName } = _b, props = __rest(_b, ["title", "className"]);
                const hasTitle = Boolean(title);
                const viewBox = [xOffset, yOffset, width, height].join(' ');
                const classNames = ['pf-v6-svg'];
                if (svgClassName) {
                    classNames.push(svgClassName);
                }
                if (propsClassName) {
                    classNames.push(propsClassName);
                }
                return (_jsxs("svg", Object.assign({ className: classNames.join(' '), viewBox: viewBox, fill: "currentColor", "aria-labelledby": hasTitle ? this.id : null, "aria-hidden": hasTitle ? null : true, role: "img", width: "1em", height: "1em" }, props, { children: [hasTitle && _jsx("title", { id: this.id, children: title }), Array.isArray(svgPath) ? (svgPath.map((pathObject, index) => (_jsx("path", { className: pathObject.className, d: pathObject.path }, `${pathObject.path}-${index}`)))) : (_jsx("path", { d: svgPath }))] })));
            }
        },
        _a.displayName = name,
        _a;
}
//# sourceMappingURL=createIcon.js.map