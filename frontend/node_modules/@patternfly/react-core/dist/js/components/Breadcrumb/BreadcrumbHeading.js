"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BreadcrumbHeading = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const angle_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-right-icon'));
const breadcrumb_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Breadcrumb/breadcrumb"));
const react_styles_1 = require("@patternfly/react-styles");
const BreadcrumbHeading = (_a) => {
    var { children = null, className = '', to = undefined, target = undefined, component = 'a', showDivider } = _a, props = tslib_1.__rest(_a, ["children", "className", "to", "target", "component", "showDivider"]);
    const Component = component;
    return ((0, jsx_runtime_1.jsxs)("li", Object.assign({}, props, { className: (0, react_styles_1.css)(breadcrumb_1.default.breadcrumbItem, className), children: [showDivider && ((0, jsx_runtime_1.jsx)("span", { className: breadcrumb_1.default.breadcrumbItemDivider, children: (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, {}) })), (0, jsx_runtime_1.jsxs)("h1", { className: breadcrumb_1.default.breadcrumbHeading, children: [!to && component === 'button' && ((0, jsx_runtime_1.jsx)("button", { className: (0, react_styles_1.css)(breadcrumb_1.default.breadcrumbLink, breadcrumb_1.default.modifiers.current), "aria-current": true, type: "button", children: children })), to && ((0, jsx_runtime_1.jsx)(Component, { href: to, target: target, className: (0, react_styles_1.css)(breadcrumb_1.default.breadcrumbLink, breadcrumb_1.default.modifiers.current), "aria-current": "page", children: children })), !to && component !== 'button' && (0, jsx_runtime_1.jsx)(react_1.Fragment, { children: children })] })] })));
};
exports.BreadcrumbHeading = BreadcrumbHeading;
exports.BreadcrumbHeading.displayName = 'BreadcrumbHeading';
//# sourceMappingURL=BreadcrumbHeading.js.map