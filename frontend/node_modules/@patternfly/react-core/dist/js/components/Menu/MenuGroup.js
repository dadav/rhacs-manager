"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuGroup = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const menu_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Menu/menu"));
const react_styles_1 = require("@patternfly/react-styles");
const MenuGroupBase = (_a) => {
    var { children, className = '', label, titleId, innerRef, labelHeadingLevel: HeadingLevel = 'h1' } = _a, props = tslib_1.__rest(_a, ["children", "className", "label", "titleId", "innerRef", "labelHeadingLevel"]);
    const Wrapper = typeof label === 'function' ? label : HeadingLevel;
    const hasLabel = label !== undefined && label !== null && label !== '';
    return ((0, jsx_runtime_1.jsx)("section", Object.assign({}, props, { className: (0, react_styles_1.css)(menu_1.default.menuGroup, className), ref: innerRef, children: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [hasLabel && ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: ['function', 'string'].includes(typeof label) ? ((0, jsx_runtime_1.jsx)(Wrapper, { className: (0, react_styles_1.css)(menu_1.default.menuGroupTitle), id: titleId, children: label })) : (label) })), children] }) })));
};
exports.MenuGroup = (0, react_1.forwardRef)((props, ref) => ((0, jsx_runtime_1.jsx)(MenuGroupBase, Object.assign({}, props, { innerRef: ref }))));
exports.MenuGroup.displayName = 'MenuGroup';
//# sourceMappingURL=MenuGroup.js.map