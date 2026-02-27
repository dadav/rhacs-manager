"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BreadcrumbItem = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const angle_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-right-icon'));
const breadcrumb_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Breadcrumb/breadcrumb"));
const react_styles_1 = require("@patternfly/react-styles");
const BreadcrumbItem = (_a) => {
    var { children = null, className: classNameProp = '', to = undefined, isActive = false, isDropdown = false, showDivider, target = undefined, component = 'a', render = undefined } = _a, props = tslib_1.__rest(_a, ["children", "className", "to", "isActive", "isDropdown", "showDivider", "target", "component", "render"]);
    const Component = component;
    const ariaCurrent = isActive ? 'page' : undefined;
    const className = (0, react_styles_1.css)(breadcrumb_1.default.breadcrumbLink, isActive && breadcrumb_1.default.modifiers.current);
    return ((0, jsx_runtime_1.jsxs)("li", Object.assign({}, props, { className: (0, react_styles_1.css)(breadcrumb_1.default.breadcrumbItem, classNameProp), children: [showDivider && ((0, jsx_runtime_1.jsx)("span", { className: breadcrumb_1.default.breadcrumbItemDivider, children: (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, {}) })), component === 'button' && ((0, jsx_runtime_1.jsx)("button", { className: className, "aria-current": ariaCurrent, type: "button", children: children })), isDropdown && (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(breadcrumb_1.default.breadcrumbDropdown), children: children }), render && render({ className, ariaCurrent }), to && !render && ((0, jsx_runtime_1.jsx)(Component, { href: to, target: target, className: className, "aria-current": ariaCurrent, children: children })), !to && component !== 'button' && !isDropdown && children] })));
};
exports.BreadcrumbItem = BreadcrumbItem;
exports.BreadcrumbItem.displayName = 'BreadcrumbItem';
//# sourceMappingURL=BreadcrumbItem.js.map