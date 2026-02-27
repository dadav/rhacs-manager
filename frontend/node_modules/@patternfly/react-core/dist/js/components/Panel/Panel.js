"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Panel = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const panel_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Panel/panel"));
const react_styles_1 = require("@patternfly/react-styles");
const PanelBase = (_a) => {
    var { className, children, variant, isScrollable, innerRef } = _a, props = tslib_1.__rest(_a, ["className", "children", "variant", "isScrollable", "innerRef"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(panel_1.default.panel, variant && panel_1.default.modifiers[variant], isScrollable && panel_1.default.modifiers.scrollable, className), ref: innerRef }, props, { children: children })));
};
exports.Panel = (0, react_1.forwardRef)((props, ref) => (0, jsx_runtime_1.jsx)(PanelBase, Object.assign({ innerRef: ref }, props)));
exports.Panel.displayName = 'Panel';
//# sourceMappingURL=Panel.js.map