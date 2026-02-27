"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIcon = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
let currentId = 0;
/**
 * Factory to create Icon class components for consumers
 */
function createIcon({ name, xOffset = 0, yOffset = 0, width, height, svgPath, svgClassName }) {
    var _a;
    return _a = class SVGIcon extends react_1.Component {
            constructor() {
                super(...arguments);
                this.id = `icon-title-${currentId++}`;
            }
            render() {
                const _b = this.props, { title, className: propsClassName } = _b, props = tslib_1.__rest(_b, ["title", "className"]);
                const hasTitle = Boolean(title);
                const viewBox = [xOffset, yOffset, width, height].join(' ');
                const classNames = ['pf-v6-svg'];
                if (svgClassName) {
                    classNames.push(svgClassName);
                }
                if (propsClassName) {
                    classNames.push(propsClassName);
                }
                return ((0, jsx_runtime_1.jsxs)("svg", Object.assign({ className: classNames.join(' '), viewBox: viewBox, fill: "currentColor", "aria-labelledby": hasTitle ? this.id : null, "aria-hidden": hasTitle ? null : true, role: "img", width: "1em", height: "1em" }, props, { children: [hasTitle && (0, jsx_runtime_1.jsx)("title", { id: this.id, children: title }), Array.isArray(svgPath) ? (svgPath.map((pathObject, index) => ((0, jsx_runtime_1.jsx)("path", { className: pathObject.className, d: pathObject.path }, `${pathObject.path}-${index}`)))) : ((0, jsx_runtime_1.jsx)("path", { d: svgPath }))] })));
            }
        },
        _a.displayName = name,
        _a;
}
exports.createIcon = createIcon;
//# sourceMappingURL=createIcon.js.map