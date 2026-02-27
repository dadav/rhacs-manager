"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageSidebarBody = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const page_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Page/page"));
const react_styles_1 = require("@patternfly/react-styles");
const PageSidebarBody = (_a) => {
    var { children, className, usePageInsets, isFilled, isContextSelector } = _a, props = tslib_1.__rest(_a, ["children", "className", "usePageInsets", "isFilled", "isContextSelector"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(page_1.default.pageSidebarBody, usePageInsets && page_1.default.modifiers.pageInsets, isFilled === false && page_1.default.modifiers.noFill, isFilled === true && page_1.default.modifiers.fill, isContextSelector === true && page_1.default.modifiers.contextSelector, className) }, props, { children: children })));
};
exports.PageSidebarBody = PageSidebarBody;
exports.PageSidebarBody.displayName = 'PageSidebarBody';
//# sourceMappingURL=PageSidebarBody.js.map